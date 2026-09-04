const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
fs.ensureDirSync(postsDir);

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const usTopics = [
  'How to Clean Tile Floors Without Leaving Streaks','Best Way to Clean Porcelain Tile Floors','How to Clean Ceramic Tile Floors','How to Clean Vinyl Floors','How to Clean Laminate Floors','How Often Should You Mop Your Floors','Why Does My Floor Look Dirty After Mopping','How to Remove Sticky Residue From Floors','How to Clean Floors Without Damaging Them','Floor Cleaning Mistakes That Can Damage Your Floors','How to Clean a Toilet Properly','How to Remove Hard Water Stains From a Toilet','How to Remove Toilet Bowl Rings','How to Clean Under the Toilet Rim','How Often Should You Clean Your Toilet','How to Keep a Toilet Clean Longer','Bathroom Cleaning Checklist','How to Remove Soap Scum From Bathroom Floors','How to Clean a Bathroom Floor','Common Toilet Cleaning Mistakes','Weekly House Cleaning Checklist','Daily Cleaning Routine for a Clean Home','How Often Should You Clean Your House','Deep Cleaning Checklist for Your Home','Things People Forget to Clean at Home','How to Clean Your Home Faster','Room-by-Room Cleaning Checklist','Simple Weekend Cleaning Routine','How to Keep Your House Clean With Less Effort','Cleaning Habits That Make Your Home Easier to Maintain','How to Remove Hard Water Stains','How to Remove Soap Scum','How to Remove Mineral Deposits From Bathroom Surfaces','How to Remove Floor Stains','How to Get Rid of Bathroom Odor','Why Does My Bathroom Smell After Cleaning','How to Prevent Toilet Stains','How to Prevent Floor Streaks','How to Clean a Dirty Bathroom','How to Make Your Bathroom Easier to Clean'
];

function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
async function existingPosts() { const files=(await fs.readdir(postsDir)).filter(f=>f.endsWith('.json')); const posts=[]; for(const file of files){try{posts.push(await fs.readJson(path.join(postsDir,file)));}catch{}} return posts; }
async function commonsImage(topic) {
  try {
    const q=encodeURIComponent(`${topic} home cleaning`);
    const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`;
    const r=await fetch(url,{headers:{'User-Agent':'CleanLivingJournal/1.0'}}); if(!r.ok) return null;
    const data=await r.json(); const blocked=/logo|icon|diagram|map|screenshot|poster|symbol|chart|flag/i;
    const candidates=Object.values(data.query?.pages||{}).filter(p=>{const i=p.imageinfo?.[0];return i?.thumburl&&/^image\/(jpeg|png|webp)$/i.test(i.mime||'')&&!blocked.test(p.title||'');});
    if(!candidates.length)return null;
    const p=candidates[Math.floor(Math.random()*candidates.length)], i=p.imageinfo[0], m=i.extmetadata||{};
    return {url:i.thumburl||i.url,source:'Wikimedia Commons',source_url:i.descriptionurl||'',credit:String(m.Artist?.value||m.Credit?.value||'').replace(/<[^>]+>/g,'').trim().slice(0,180),license:String(m.LicenseShortName?.value||m.UsageTerms?.value||'').replace(/<[^>]+>/g,'').trim().slice(0,100),license_url:m.LicenseUrl?.value||''};
  } catch { return null; }
}

async function generatePost(topic, titles) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const prompt=`Create one original, genuinely useful 900-1200 word blog article for a US home-cleaning publication. Topic: ${topic}. Audience: United States homeowners and renters. Write in natural US English.

The article must stand alone as a neutral editorial guide. NEVER mention Mr Glowra, any brand, any Indian company, or any product promotion in the title, description, headings, or body. Do not write a sales pitch. Do not claim US availability of any product.

SEO: create a natural search-friendly title; 140-160 character meta description; answer search intent directly; descriptive H2 headings; practical steps; mistakes; safety notes; short FAQ when useful. Avoid keyword stuffing and repetitive AI-style phrasing. Use US terminology.

Trust and safety: never invent certifications, reviews, statistics, prices, lab results, approvals, credentials, or sources. Never mix cleaning chemicals. For acidic toilet cleaners, bleach, ammonia, disinfectants or other chemicals, clearly warn against mixing and advise following the product label and ventilation/PPE precautions. Do not make unsupported germ-killing claims.

Writing style: knowledgeable human editor. Vary sentence length. Avoid phrases such as “In today's fast-paced digital world”, “Furthermore”, “Moreover”, “In conclusion”, “Delve”, “Tapestry”, “Beacon”, “Testament”, and “It is important to remember/note that”.

Do not repeat these existing titles: ${titles.join(' | ') || 'none'}.

Return ONLY valid JSON with exactly: title, description, category, keywords, content. Keywords: 5-8 concise search phrases. Content: plain text with headings separated by blank lines; no Markdown, HTML, fake citations, or invented sources.`;
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,temperature:.72,messages:[{role:'system',content:'You are a careful US SEO editor for a neutral home-cleaning publication. Accuracy, usefulness, safety and natural writing matter more than hype.'},{role:'user',content:prompt}]})});
  if(!response.ok)throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  const data=await response.json(),raw=data.choices?.[0]?.message?.content?.trim(); if(!raw)throw new Error('No article returned by AI');
  const article=JSON.parse(raw.replace(/^```json\s*/i,'').replace(/\s*```$/i,''));
  if(!article.title||!article.description||!article.content)throw new Error('Generated article is missing required fields');
  if(titles.some(t=>t.toLowerCase().trim()===article.title.toLowerCase().trim()))throw new Error('Generated title duplicates an existing article');
  const date=new Date().toISOString().slice(0,10); let slug=slugify(article.title)||`us-cleaning-guide-${date}`; let filename=path.join(postsDir,`${date}-${slug}.json`); if(await fs.pathExists(filename))filename=path.join(postsDir,`${date}-${slug}-${Date.now()}.json`);
  const image=await commonsImage(article.title);
  const post={title:String(article.title).trim(),description:String(article.description).trim().slice(0,160),category:String(article.category||'US Cleaning Guides').trim(),keywords:Array.isArray(article.keywords)?article.keywords.map(String).map(x=>x.trim()).filter(Boolean).slice(0,8):[],content:String(article.content).trim(),slug,date,market:'US',image:image?.url||'/generated-image.svg',imageAlt:`${String(article.title).trim()} - home cleaning guide`,image_source:image?.source||'',image_source_url:image?.source_url||'',image_credit:image?.credit||'',image_license:image?.license||'',image_license_url:image?.license_url||''};
  await fs.writeJson(filename,post,{spaces:2}); console.log(`Created ${filename}`);
}
(async()=>{const posts=await existingPosts();const titles=posts.map(p=>p.title).filter(Boolean);const used=new Set(titles.map(slugify));const topic=usTopics.find(x=>!used.has(slugify(x)));if(!topic)throw new Error('All planned US SEO topics have already been published. Add new topics before generating another article.');console.log(`Selected unused US topic: ${topic}`);await generatePost(topic,titles);})().catch(e=>{console.error(e);process.exit(1);});
