const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
fs.ensureDirSync(postsDir);

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const usTopics = [
  'How to Clean Soap Scum Off Glass Shower Doors',
  'DIY Natural Floor Cleaner Recipes for Common US Floor Types',
  'How to Remove Hard Water Stains From Shower Glass and Tile',
  'How to Clean a Smelly Kitchen Sink and Garbage Disposal',
  'How to Clean a Stainless Steel Sink Without Scratches',
  'How to Get Pet Hair Out of Carpet and Upholstery',
  'How to Deep Clean a Bathroom: A Step-by-Step Checklist',
  'How to Clean Greasy Kitchen Cabinets Without Damaging the Finish',
  'How to Remove Sticky Residue From Hardwood and Vinyl Floors',
  'How to Clean Dust From Air Vents and HVAC Registers'
];

function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
async function existingPosts() { const files=(await fs.readdir(postsDir)).filter(f=>f.endsWith('.json')); const posts=[]; for(const file of files){try{posts.push(await fs.readJson(path.join(postsDir,file)));}catch{}} return posts; }
async function topicMatchedImage(topic) {
  const key=process.env.SERPAPI_KEY;
  if(!key) return null;
  const q=encodeURIComponent(`${topic} home cleaning photo site:pexels.com OR site:unsplash.com OR site:pixabay.com`);
  const r=await fetch(`https://serpapi.com/search.json?engine=google_images&q=${q}&api_key=${encodeURIComponent(key)}`);
  if(!r.ok) return null;
  const d=await r.json();
  const allowed=/pexels\.com|unsplash\.com|pixabay\.com/i;
  const results=(d.images_results||[]).filter(x=>allowed.test(x.source||x.link||x.original||'') && /^https:\/\//.test(x.original||''));
  if(!results.length) return null;
  const x=results[0];
  return {url:x.original||x.thumbnail,source:x.source||'Stock image',source_url:x.link||'',credit:'',license:'See source terms',license_url:''};
}

async function generatePost(topic, titles) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const prompt=`Create one original, genuinely useful 1,200-1,600 word blog article for a US Home & Living publication. Topic: ${topic}. Audience: US homeowners and renters.

Start by solving the exact cleaning frustration behind the search. Build the article for featured snippets and practical use.

Required structure:
- H1: use the article title as the first line.
- H2 sections covering: quick answer, why the problem happens when relevant, Materials Needed, Step-by-Step Instructions, What NOT to Do, Safety and Material Warnings, Maintenance Tips, and FAQ.
- Use H3 subsections where they make a step clearer.
- Include concise numbered steps and bullets where useful.

US market gaps: naturally include at least 3 practical details generic articles often miss, choosing only relevant ones. Examples include Dawn dish soap, Bar Keepers Friend, hard-water conditions, garbage disposals, HVAC vent dust, apartment/rental constraints, water hardness, common US floor materials, and cleaning-product label guidance. Do not force irrelevant products into the article.

Safety: never suggest mixing bleach with ammonia, acids, vinegar, toilet cleaner, or other cleaners. Warn when vinegar can damage natural stone or certain finishes. Warn when abrasive powders can scratch delicate surfaces. Advise ventilation and following product labels.

The article must be neutral. NEVER mention Mr Glowra, Indian companies, or promotional brand messaging. Mention common US retail products only as examples when genuinely useful and never claim endorsement.

Writing style: natural, experienced US home editor. Short and long sentences mixed. No AI filler.

Do not repeat these existing titles: ${titles.join(' | ') || 'none'}.

Return ONLY valid JSON with exactly: title, description, category, keywords, content. Content must be plain text with the H1/H2/H3 headings explicitly written using Markdown #, ##, ### prefixes. No HTML and no fake citations.`; with exactly: title, description, category, keywords, content. Keywords: 5-8 concise search phrases. Content: plain text with headings separated by blank lines; no Markdown, HTML, fake citations, or invented sources.`;
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,temperature:.72,messages:[{role:'system',content:'You are a careful US SEO editor for a neutral home-cleaning publication. Accuracy, usefulness, safety and natural writing matter more than hype.'},{role:'user',content:prompt}]})});
  if(!response.ok)throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  const data=await response.json(),raw=data.choices?.[0]?.message?.content?.trim(); if(!raw)throw new Error('No article returned by AI');
  const article=JSON.parse(raw.replace(/^```json\s*/i,'').replace(/\s*```$/i,''));
  if(!article.title||!article.description||!article.content)throw new Error('Generated article is missing required fields');
  if(titles.some(t=>t.toLowerCase().trim()===article.title.toLowerCase().trim()))throw new Error('Generated title duplicates an existing article');
  const date=new Date().toISOString().slice(0,10); let slug=slugify(article.title)||`us-cleaning-guide-${date}`; let filename=path.join(postsDir,`${date}-${slug}.json`); if(await fs.pathExists(filename))filename=path.join(postsDir,`${date}-${slug}-${Date.now()}.json`);
  const image=await topicMatchedImage(article.title);
  const post={title:String(article.title).trim(),description:String(article.description).trim().slice(0,160),category:String(article.category||'US Cleaning Guides').trim(),keywords:Array.isArray(article.keywords)?article.keywords.map(String).map(x=>x.trim()).filter(Boolean).slice(0,8):[],content:String(article.content).trim(),slug,date,market:'US',image:image?.url||'',imageAlt:`${String(article.title).trim()} - home cleaning guide`,image_source:image?.source||'',image_source_url:image?.source_url||'',image_credit:image?.credit||'',image_license:image?.license||'',image_license_url:image?.license_url||''};
  await fs.writeJson(filename,post,{spaces:2}); console.log(`Created ${filename}`);
}
(async()=>{const posts=await existingPosts();const titles=posts.map(p=>p.title).filter(Boolean);const used=new Set(titles.map(slugify));const count=Math.max(1,Number(process.env.BLOG_BATCH_SIZE||1));const selected=usTopics.filter(x=>!used.has(slugify(x))).slice(0,count);if(!selected.length)throw new Error('All planned US SEO topics have already been published.');for(const topic of selected){console.log(`Selected unused US topic: ${topic}`);await generatePost(topic,titles);titles.push(topic);}})().catch(e=>{console.error(e);process.exit(1);});
