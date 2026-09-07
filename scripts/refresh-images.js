const fs=require('fs');
const path=require('path');
const postsDir=path.join(__dirname,'..','posts');
const UA='CleanLivingJournal/4.0';
const readJson=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const writeJson=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n','utf8');

// Match images to the actual article topic, not just the broad "home cleaning" category.
const STOP=new Set(['how','what','when','where','why','which','with','from','your','home','best','clean','cleaning','guide','ways','easy','step','steps','the','and','for','off','out','into','without','does','can','get','remove','tips','checklist','natural','common']);
function terms(title){return [...new Set(String(title||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!STOP.has(w)))];}
function phrase(title){return String(title||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function allowedImage(url){try{const h=new URL(url).hostname.toLowerCase();const blocked=['instagram.com','cdninstagram.com','fbcdn.net','fbsbx.com','facebook.com'];if(blocked.some(d=>h===d||h.endsWith('.'+d)))return false;return h==='images.pexels.com'||h.endsWith('.pexels.com')||h==='images.unsplash.com'||h.endsWith('.unsplash.com')||h==='cdn.pixabay.com'||h.endsWith('.pixabay.com')||h==='upload.wikimedia.org';}catch{return false;}}
function relevance(x,post){const t=terms(post.title);const p=phrase(post.title);const text=phrase(`${x.title||''} ${x.snippet||''} ${x.alt||''} ${x.source||''} ${x.link||''}`);const hits=t.filter(w=>text.includes(w));const exact=p.length>12&&text.includes(p);const coverage=t.length?hits.length/t.length:0;const blocked=/logo|icon|diagram|screenshot|poster|illustration|advertisement|product packaging|collage|vector|clipart|infographic|template|stock photo/i.test(text);if(blocked)return -100;let score=coverage*30+hits.length*5;if(exact)score+=50;if(/pexels|unsplash|pixabay/i.test(`${x.source||''} ${x.link||''}`))score+=3;return score;}
async function serp(post){const key=process.env.SERPAPI_KEY;if(!key)throw Error('SERPAPI_KEY is not configured');const t=terms(post.title);const queries=[`"${post.title}"`,t.slice(0,7).join(' ')].filter(Boolean);const all=[];for(const raw of queries){const q=encodeURIComponent(raw);const r=await fetch(`https://serpapi.com/search.json?engine=google_images&q=${q}&ijn=0&safe=active&api_key=${encodeURIComponent(key)}`,{headers:{'User-Agent':UA}});if(!r.ok)continue;const d=await r.json();for(const x of(d.images_results||[])){if(allowedImage(x.original))all.push(x);}}if(!all.length)return null;const unique=[];const seen=new Set();for(const x of all){if(!seen.has(x.original)){seen.add(x.original);unique.push(x);}}const ranked=unique.map(x=>({x,score:relevance(x,post)})).sort((a,b)=>b.score-a.score);const best=ranked[0];if(!best||best.score<22)return null;const x=best.x;return{url:x.original,source:x.source||'Free image source',source_url:x.link||'',credit:'',license:'Verify image license at source before publishing',license_url:x.link||''};}
async function commons(post){
  const querySets=[terms(post.title).slice(0,8).join(' '),'air vent cleaning','HVAC vent cleaning'];
  for(const queryText of querySets){
    if(!queryText)continue;
    const q=encodeURIComponent(queryText);
    const r=await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`,{headers:{'User-Agent':UA}});
    if(!r.ok)continue;
    const d=await r.json();
    const blocked=/logo|icon|diagram|map|screenshot|poster|symbol|chart|flag|vector|collage/i;
    const pages=Object.values(d.query?.pages||{}).map(p=>({p,score:relevance({title:p.title,snippet:p.title,source:'Wikimedia Commons'},post)})).filter(v=>v.score>=22&&!blocked.test(v.p.title||''));
    pages.sort((a,b)=>b.score-a.score);
    for(const candidate of pages){
      const p=candidate.p,i=p.imageinfo?.[0];
      if(!i?.thumburl||!allowedImage(i.thumburl)||!/^image\/(jpeg|png|webp)$/i.test(i.mime||''))continue;
      const m=i.extmetadata||{};
      const strip=v=>String(v||'').replace(/<[^>]+>/g,'').trim();
      const license=strip(m.LicenseShortName?.value||m.UsageTerms?.value);
      const licenseUrl=m.LicenseUrl?.value||'';
      return{url:i.thumburl||i.url,source:'Wikimedia Commons',source_url:i.descriptionurl||'',credit:strip(m.Artist?.value||m.Credit?.value),license:license||'Wikimedia Commons license',license_url:licenseUrl};
    }
  }
  return null;
}
(async()=>{const files=fs.readdirSync(postsDir).filter(f=>f.endsWith('.json'));let changed=0,skipped=0;for(const f of files){const file=path.join(postsDir,f);let post;try{post=readJson(file)}catch{continue}if(!post.title)continue;try{
    // Prefer Wikimedia Commons so the blog can use a clearly licensed public image.
    // Fall back to other approved image providers only when Commons has no relevant match.
    const im=await commons(post)||await serp(post);
    if(!im?.url){skipped++;console.warn(`No sufficiently relevant public/approved image found for ${f}; keeping existing image.`);continue;}
    Object.assign(post,{image:im.url,imageAlt:`${post.title} - relevant home cleaning photo`,image_source:im.source,image_source_url:im.source_url,image_credit:im.credit,image_license:im.license,image_license_url:im.license_url});writeJson(file,post);changed++;console.log(`Matched ${f} -> ${im.source}: ${im.url}`);
  }catch(e){skipped++;console.warn(`Skipped ${f}: ${e.message}`);}}console.log(`Relevant image refresh complete: ${changed} updated, ${skipped} kept/skipped.`);})();
