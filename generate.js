const fs = require('fs-extra');
const path = require('path');
const postsDir = path.join(__dirname, 'posts');
fs.ensureDirSync(postsDir);
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const fallbackModels = [model, 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'].filter((v, i, a) => v && a.indexOf(v) === i);
const usTopics = [
  'How to Clean a Microwave Without Harsh Chemicals',
  'How to Remove Coffee Stains From a Kitchen Countertop',
  'How to Clean a Glass Stovetop Without Scratches',
  'How to Clean a Dishwasher Filter and Remove Odors',
  'How to Remove Grease From a Range Hood Filter',
  'How to Clean Baseboards Without Damaging Painted Walls',
  'How to Clean Window Tracks and Sliding Door Tracks',
  'How to Remove Moldy Smells From a Bathroom Safely',
  'How to Clean a Washing Machine and Remove Musty Odors',
  'How to Clean Fabric Sofas Without Water Rings',
  'How to Remove Candle Wax From Hardwood Floors Safely',
  'How to Clean a Mattress and Reduce Everyday Odors',
  'How to Clean Blinds Without Bending or Breaking Them',
  'How to Remove Red Wine Stains From Carpet',
  'How to Clean Stainless Steel Appliances Without Streaks',
  'How to Clean a Shower Curtain and Liner',
  'How to Remove Rust Stains From Bathroom Fixtures',
  'How to Clean a Refrigerator Inside and Prevent Odors',
  'How to Clean Ceiling Fans Without Spreading Dust',
  'How to Clean an Oven Safely Without Damaging the Finish',
  'How to Clean a Coffee Maker and Remove Mineral Buildup',
  'How to Clean Grout Without Damaging Tile',
  'How to Remove Fingerprints From Painted Walls',
  'How to Clean a Front Door and Entryway Properly',
  'How to Clean a Vacuum Cleaner and Its Filters',
  'How to Clean Under Furniture Without Moving Everything',
  'How to Remove Scuff Marks From Painted Floors and Walls',
  'How to Clean a Bathroom Exhaust Fan Safely',
  'How to Clean Kitchen Backsplash Tile Without Streaks',
  'How to Remove Soap Residue From a Bathtub'
];
function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
async function existingPosts() { const files=(await fs.readdir(postsDir)).filter(f=>f.endsWith('.json')); const posts=[]; for(const file of files){try{posts.push(await fs.readJson(path.join(postsDir,file)));}catch{}} return posts; }
async function topicMatchedImage(topic) { const key=process.env.SERPAPI_KEY; if(!key)return null; const q=encodeURIComponent(`${topic} home cleaning photo site:pexels.com OR site:unsplash.com OR site:pixabay.com`); const r=await fetch(`https://serpapi.com/search.json?engine=google_images&q=${q}&api_key=${encodeURIComponent(key)}`); if(!r.ok)return null; const d=await r.json(); const allowed=/pexels\.com|unsplash\.com|pixabay\.com/i; const results=(d.images_results||[]).filter(x=>allowed.test(x.source||x.link||x.original||'')&&/^https:\/\//.test(x.original||'')); if(!results.length)return null; const x=results[0]; return {url:x.original||x.thumbnail,source:x.source||'Stock image',source_url:x.link||'',credit:'',license:'See source terms',license_url:x.link||''}; }
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function transientStatus(status){return [429,500,502,503,504].includes(status);}
async function requestGemini(prompt) {
  let lastError='';
  for (let modelIndex=0; modelIndex<fallbackModels.length; modelIndex++) {
    const currentModel=fallbackModels[modelIndex];
    for (let attempt=1; attempt<=2; attempt++) {
      const response=await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`,'x-goog-api-client':'mrglowra-blog/2.3'},body:JSON.stringify({model:currentModel,temperature:.72,messages:[{role:'system',content:'You are a careful US SEO editor for a neutral home-cleaning publication. Accuracy, usefulness, safety and natural writing matter more than hype.'},{role:'user',content:prompt}]})});
      if(response.ok){ const data=await response.json(); const raw=data.choices?.[0]?.message?.content?.trim(); if(!raw)throw new Error(`Gemini returned no article content using ${currentModel}`); console.log(`Gemini generation succeeded with ${currentModel} (attempt ${attempt}).`); return raw; }
      const body=await response.text(); lastError=`${response.status} ${body}`; console.warn(`Gemini ${currentModel} attempt ${attempt} failed: ${lastError}`); if(!transientStatus(response.status))throw new Error(`Gemini API error: ${lastError}`); if(attempt<2)await sleep(5000*attempt);
    }
    if(modelIndex<fallbackModels.length-1){ console.warn(`Falling back from ${currentModel} to ${fallbackModels[modelIndex+1]}.`); await sleep(3000); }
  }
  throw new Error(`Gemini API unavailable after retries and model fallbacks: ${lastError}`);
}
function normalizeKeywords(article, topic) { const raw=Array.isArray(article.keywords)?article.keywords.map(String).map(x=>x.trim()).filter(Boolean):[]; const title=String(article.title||topic).trim(); const derived=[title, topic, `how to ${topic.toLowerCase().replace(/^how to\s+/i,'')}`, 'home cleaning tips', 'cleaning guide']; return [...new Set([...raw,...derived].map(x=>x.trim()).filter(Boolean))].slice(0,8); }
async function generatePost(topic,titles) {
 if(!apiKey)throw new Error('GEMINI_API_KEY is not configured');
 const prompt=`Create one original, genuinely useful 1,800-2,100 word blog article for a US Home & Living publication. Topic: ${topic}. Audience: US homeowners and renters.\n\nStart by solving the exact cleaning frustration behind the search. Build the article for featured snippets and practical use.\n\nRequired structure:\n- H1: use the article title as the first line.\n- H2 sections covering: quick answer, why the problem happens when relevant, Materials Needed, Step-by-Step Instructions, What NOT to Do, Safety and Material Warnings, Maintenance Tips, and FAQ.\n- Use H3 subsections where they make a step clearer.\n- Include concise numbered steps and bullets where useful.\n\nSEO metadata: return at least 8 specific, natural search keyword phrases in the keywords array. Include the main topic, close variations, and useful long-tail phrases. Never return an empty or very short keyword list.\n\nUS market gaps: naturally include at least 3 practical details generic articles often miss, choosing only relevant ones. Examples include Dawn dish soap, Bar Keepers Friend, hard-water conditions, garbage disposals, HVAC vent dust, apartment/rental constraints, water hardness, common US floor materials, and cleaning-product label guidance. Do not force irrelevant products into the article.\n\nSafety: never suggest mixing bleach with ammonia, acids, vinegar, toilet cleaner, or other cleaners. Warn when vinegar can damage natural stone or certain finishes. Warn when abrasive powders can scratch delicate surfaces. Advise ventilation and following product labels.\n\nThe article must be neutral. NEVER mention Mr Glowra, Indian companies, or promotional brand messaging. Mention common US retail products only as examples when genuinely useful and never claim endorsement.\n\nWriting style: natural, experienced US home editor. Short and long sentences mixed. No AI filler.\n\nDo not repeat these existing titles: ${titles.join(' | ') || 'none'}.\n\nReturn ONLY valid JSON with exactly: title, description, category, keywords, content. Content must be plain text. Do NOT use Markdown heading markers such as #, ##, or ###. Do not use bold markers such as **. Use blank lines to separate headings and paragraphs. No HTML and no fake citations.`;
 const raw=await requestGemini(prompt); let article; try{article=JSON.parse(raw.replace(/^```json\s*/i,'').replace(/\s*```$/i,''));}catch(e){throw new Error(`Gemini returned invalid JSON: ${e.message}`);}
 if(!article.title||!article.description||!article.content)throw new Error('Generated article is missing required fields'); if(titles.some(t=>t.toLowerCase().trim()===article.title.toLowerCase().trim()))throw new Error('Generated title duplicates an existing article'); const date=new Date().toISOString().slice(0,10); let slug=slugify(article.title)||`us-cleaning-guide-${date}`; let filename=path.join(postsDir,`${date}-${slug}.json`); if(await fs.pathExists(filename))filename=path.join(postsDir,`${date}-${slug}-${Date.now()}.json`); const image=await topicMatchedImage(article.title); const cleanContent=String(article.content).replace(/^#{1,6}\s+/gm,'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*([^*\n]+)\*/g,'$1').replace(/\r/g,'').trim(); const keywords=normalizeKeywords(article,topic); const post={title:String(article.title).trim(),description:String(article.description).trim().slice(0,160),category:String(article.category||'US Cleaning Guides').trim(),keywords,content:cleanContent,slug,date,market:'US',image:image?.url||'',imageAlt:`${String(article.title).trim()} - relevant home cleaning photo`,image_source:image?.source||'',image_source_url:image?.source_url||'',image_credit:image?.credit||'',image_license:image?.license||'',image_license_url:image?.license_url||''}; await fs.writeJson(filename,post,{spaces:2}); console.log(`Created ${filename} with ${keywords.length} SEO keywords`);
}
(async()=>{const posts=await existingPosts();const titles=posts.map(p=>p.title).filter(Boolean);const used=new Set(titles.map(slugify));const count=Math.max(1,Number(process.env.BLOG_BATCH_SIZE||1));const selected=usTopics.filter(x=>!used.has(slugify(x))).slice(0,count);if(!selected.length)throw new Error('All planned US SEO topics have already been published.');let success=0;for(const topic of selected){console.log(`Selected unused US topic: ${topic}`);try{await generatePost(topic,titles);titles.push(topic);success++;}catch(e){console.error(`FAILED topic: ${topic}\n${e.stack||e}`);}}console.log(`Batch generation complete: ${success}/${selected.length} requested posts created.`);if(success===0)process.exit(1);})().catch(e=>{console.error(e);process.exit(1);});
