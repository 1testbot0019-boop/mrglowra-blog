const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const IMAGE_DIR = path.join(ROOT, 'public', 'images');
const API = 'https://pixabay.com/api/';
const PER_POST = 3;

fs.mkdirSync(IMAGE_DIR, { recursive: true });

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Strong, topic-specific queries prevent Pixabay from returning the same generic
// cleaning photograph for unrelated articles.
const QUERY_RULES = [
  [/hard water.*glass|glass.*shower/i, 'glass shower door hard water stains'],
  [/grease.*kitchen cabinet|kitchen cabinet.*grease/i, 'greasy kitchen cabinets cleaning'],
  [/grout.*tile|tile.*grout/i, 'tile grout cleaning'],
  [/oil stains?.*concrete|concrete.*oil stains?/i, 'concrete driveway oil stain cleaning'],
  [/microwave/i, 'microwave oven cleaning kitchen'],
  [/red wine.*carpet|carpet.*red wine/i, 'red wine stain carpet cleaning'],
  [/baseboards?/i, 'dirty baseboards wall cleaning'],
  [/soap scum.*bathtub|bathtub.*soap scum/i, 'bathtub soap scum cleaning'],
  [/window tracks?|sliding door tracks?/i, 'window sliding door track cleaning'],
  [/glass stovetop|glass cooktop/i, 'glass stovetop cleaning'],
  [/pantry.*organization|organize.*pantry/i, 'small kitchen pantry organization'],
  [/under the kitchen sink|under.*sink/i, 'under kitchen sink organization'],
  [/closet.*declutter|declutter.*closet/i, 'closet organization decluttering'],
  [/apartment storage|small apartment/i, 'small apartment storage organization'],
  [/bathroom.*counter space|counter space.*bathroom/i, 'small bathroom organization storage'],
  [/entryway.*drop zone|entryway/i, 'entryway organization drop zone'],
  [/cleaning supplies.*organize|organize.*cleaning supplies/i, 'cleaning supplies storage organization'],
  [/refrigerator.*organize|organize.*refrigerator/i, 'refrigerator organization food storage'],
  [/garage.*organize|organize.*garage/i, 'garage organization storage'],
  [/30-day.*declutter|decluttering plan/i, 'home decluttering organization'],
  [/all-purpose cleaner|all purpose cleaner/i, 'DIY all purpose cleaner'],
  [/non-toxic bathroom|non toxic bathroom/i, 'DIY non toxic bathroom cleaner'],
  [/pet stain.*carpet|carpet.*pet stain/i, 'pet stain carpet cleaning'],
  [/single-use plastic/i, 'reusable low waste cleaning supplies'],
  [/microplastic.*cleaning tools/i, 'eco friendly cleaning tools'],
  [/castile soap/i, 'castile soap cleaning home'],
  [/DIY glass cleaner|glass cleaner.*DIY/i, 'DIY glass cleaner'],
  [/musty room/i, 'freshen musty room home'],
  [/old towels.*cleaning|cleaning.*old towels/i, 'reusable cleaning cloth towels'],
  [/eco-friendly cleaning product|eco friendly cleaning/i, 'eco friendly cleaning products'],
  [/air fryer/i, 'air fryer cleaning kitchen'],
  [/dishwasher filter/i, 'dishwasher filter cleaning'],
  [/coffee maker|coffee machine.*descale/i, 'coffee maker descaling cleaning'],
  [/spray arm.*dishwasher|dishwasher.*spray arm/i, 'dishwasher spray arm cleaning'],
  [/front-load washer|front load washer/i, 'front load washing machine cleaning'],
  [/refrigerator inside|clean a refrigerator/i, 'refrigerator interior cleaning'],
  [/stainless steel appliances?|stainless steel.*appliance/i, 'stainless steel appliance cleaning'],
  [/vacuum cleaner.*filters?|clean.*vacuum/i, 'vacuum cleaner filter cleaning'],
  [/bathroom exhaust fan|exhaust fan/i, 'bathroom exhaust fan cleaning'],
  [/oven.*finish|clean.*oven/i, 'oven cleaning kitchen'],
  [/dog smell.*couch|couch.*dog smell/i, 'dog smell couch upholstery cleaning'],
  [/drain odors?|drain.*odor/i, 'kitchen bathroom drain odor'],
  [/why does my house smell|house smell.*causes/i, 'home odor causes cleaning'],
  [/washing machine.*musty|musty.*washing machine/i, 'washing machine musty odor cleaning'],
  [/moldy smells?.*bathroom|bathroom.*moldy smell/i, 'bathroom mold mildew cleaning'],
  [/garbage disposal odors?|garbage disposal.*odor/i, 'garbage disposal cleaning odor'],
  [/dust.*HVAC|HVAC.*dust|air vents?/i, 'HVAC air vent register cleaning'],
  [/basement.*musty|musty.*basement/i, 'basement moisture musty smell'],
  [/pet-friendly home|pet friendly home/i, 'pet friendly home cleaning'],
  [/secret places.*clean|places.*clean.*often/i, 'home deep cleaning hidden places']
];

function queryFor(post) {
  const title = String(post.title || '');
  const rule = QUERY_RULES.find(([pattern]) => pattern.test(title));
  return rule ? rule[1] : `${title} home care`;
}

function slug(value) {
  return String(value || 'image').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

function imageSource(hit) {
  return hit.largeImageURL || hit.webformatURL || '';
}

async function downloadImage(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error('Pixabay result was not an image');
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length < 5000) throw new Error('Downloaded image is unexpectedly small');
  fs.writeFileSync(file, data);
}

async function pixabay(query, page = 1) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error('PIXABAY_API_KEY is not configured');
  const params = new URLSearchParams({
    key,
    q: query,
    image_type: 'photo',
    orientation: 'horizontal',
    safesearch: 'true',
    order: 'popular',
    per_page: '50',
    page: String(page)
  });
  const response = await fetch(`${API}?${params.toString()}`);
  if (!response.ok) throw new Error(`Pixabay ${response.status}`);
  return response.json();
}

async function chooseImages(post, globallyUsedIds, globallyUsedUrls) {
  const query = queryFor(post);
  const queries = [query, `${query} photo`, `${query} home`];
  const candidates = [];

  for (const q of queries) {
    try {
      const data = await pixabay(q);
      for (const hit of (data.hits || [])) {
        const source = imageSource(hit);
        if (!source || globallyUsedIds.has(hit.id) || globallyUsedUrls.has(source)) continue;
        candidates.push(hit);
      }
    } catch (error) {
      console.warn(`Pixabay query failed for "${q}": ${error.message}`);
    }
    await sleep(120);
  }

  // Prefer images whose Pixabay tags overlap the topic. This is an additional
  // relevance check after the topic-specific search query.
  const topicWords = new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3));
  const scored = candidates.map(hit => {
    const tags = String(hit.tags || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
    const overlap = tags.reduce((score, tag) => score + (topicWords.has(tag) ? 1 : 0), 0);
    return { hit, score: overlap };
  }).sort((a, b) => b.score - a.score || (a.hit.id || 0) - (b.hit.id || 0));

  const selected = [];
  const localIds = new Set();
  const localUrls = new Set();
  for (const { hit } of scored) {
    const source = imageSource(hit);
    if (!source || localIds.has(hit.id) || localUrls.has(source)) continue;
    selected.push(hit);
    localIds.add(hit.id);
    localUrls.add(source);
    if (selected.length >= PER_POST) break;
  }

  return selected;
}

async function run() {
  const files = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.json')).sort();
  const posts = [];
  for (const file of files) {
    try {
      const post = readJson(path.join(POSTS_DIR, file));
      if (post.title) posts.push({ file, post });
    } catch (error) {
      console.warn(`Skipping invalid post ${file}: ${error.message}`);
    }
  }

  // Start with all currently assigned image URLs/IDs banned. This guarantees a
  // refresh actually replaces the old repeated photographs rather than selecting
  // the same popular Pixabay results again.
  const globallyUsedIds = new Set();
  const globallyUsedUrls = new Set();
  for (const { post } of posts) {
    const existing = Array.isArray(post.images) ? post.images : [];
    for (const item of existing) {
      const match = String(item?.url || '').match(/-(\d+)\.jpg$/);
      if (match) globallyUsedIds.add(Number(match[1]));
      if (item?.url) globallyUsedUrls.add(item.url);
    }
    if (post.image) globallyUsedUrls.add(post.image);
  }

  let changed = 0;
  for (const { file, post } of posts) {
    try {
      const selected = await chooseImages(post, globallyUsedIds, globallyUsedUrls);
      if (!selected.length) {
        console.warn(`No fresh relevant Pixabay images found for ${file} (${queryFor(post)}).`);
        continue;
      }

      const base = slug(post.slug || post.title);
      const images = [];
      for (const hit of selected) {
        const source = imageSource(hit);
        const fileName = `${base}-${hit.id}.jpg`;
        const filePath = path.join(IMAGE_DIR, fileName);
        await downloadImage(source, filePath);
        const local = `/images/${fileName}`;
        images.push({
          url: local,
          source: 'Pixabay',
          source_url: hit.pageURL || 'https://pixabay.com/',
          credit: hit.user ? `Photo by ${hit.user} on Pixabay` : 'Pixabay photo',
          license: 'Pixabay Content License',
          license_url: 'https://pixabay.com/service/license-summary/'
        });
        globallyUsedIds.add(hit.id);
        globallyUsedUrls.add(source);
        globallyUsedUrls.add(local);
      }

      post.images = images;
      post.image = images[0].url;
      post.imageAlt = `${post.title} - topic-matched home care photo`;
      post.image_source = images[0].source;
      post.image_source_url = images[0].source_url;
      post.image_credit = images[0].credit;
      post.image_license = images[0].license;
      post.image_license_url = images[0].license_url;
      writeJson(path.join(POSTS_DIR, file), post);
      changed++;
      console.log(`REFRESHED ${file}: ${images.length} unique relevant Pixabay image(s) | ${queryFor(post)}`);
      await sleep(250);
    } catch (error) {
      console.warn(`Failed to refresh ${file}: ${error.message}`);
    }
  }

  console.log(`Completed image refresh: ${changed}/${posts.length} posts updated.`);
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
