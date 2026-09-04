const fs=require('fs');
const path=require('path');
const postsDir=path.join(__dirname,'..','posts');
const UA='CleanLivingJournal/2.0';
const readJson=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const writeJson=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n','utf8');

function terms(title){return String(title||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!['how','what','with','from','your','home','best','clean','cleaning','guide','ways','easy'].includes(w));}

async function serp(post){
  const key=process.env.SERPAPI_KEY;
  if(!key) throw Error('SERPAPI_KEY is not configured');
  const q=encodeURIComponent(`${post.title} home cleaning photo`);
  const r=await fetch(`https://serpapi.com/search.json?engine=google_images&q=${q}&ijn=0&safe=active&api_key=${encodeURIComponent(key)}`,{headers:{'User-Agent':UA}});
  if(!r.ok) throw Error(`SerpAPI ${r.status}`);
  const d=await r.json();
  const blocked=/logo|icon|diagram|screenshot|poster|illustration|advertisement|product packaging|collage/i;
  const preferred=/pexels\.com|unsplash\.com|pixabay\.com/i;
  const t=terms(post.title);
  const results=(d.images_results||[]).filter(x=>/^https:\/\//.test(x.original||'')&&!blocked.test(`${x.title||''} ${x.source||''}`));
  if(!results.length)return null;
  const score=x=>{
    const text=`${x.title||''} ${x.snippet||''} ${x.source||''} ${x.link||''}`.toLowerCase();
    return t.reduce((n,w)=>n+(text.includes(w)?3:0),0)+(preferred.test(x.source||x.link||'')?2:0);
  };
  results.sort((a,b)=>score(b)-score(a));
  const x=results[0];
  return {url:x.original,source:x.source||'Google Images result',source_url:x.link||'',credit:'',license:'Verify image license at source before publishing',license_url:x.link||''};
}

async function commons(post){
  const q=encodeURIComponent(`${post.title} home cleaning`);
  const r=await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`,{headers:{'User-Agent':UA}});
  if(!r.ok)throw Error(`Commons ${r.status}`);
  const d=await r.json(),blocked=/logo|icon|diagram|map|screenshot|poster|symbol|chart|flag/i;
  const c=Object.values(d.query?.pages||{}).filter(p=>{const i=p.imageinfo?.[0];return i?.thumburl&&!blocked.test(p.title||'')&&/^image\/(jpeg|png|webp)$/i.test(i.mime||'');});
  if(!c.length)return null;
  const p=c[0],i=p.imageinfo[0],m=i.extmetadata||{};
  const strip=v=>String(v||'').replace(/<[^>]+>/g,'').trim();
  return {url:i.thumburl||i.url,source:'Wikimedia Commons',source_url:i.descriptionurl||'',credit:strip(m.Artist?.value||m.Credit?.value),license:strip(m.LicenseShortName?.value||m.UsageTerms?.value),license_url:m.LicenseUrl?.value||''};
}

(async()=>{
  const files=fs.readdirSync(postsDir).filter(f=>f.endsWith('.json')); let changed=0;
  for(const f of files){
    const file=path.join(postsDir,f); let post; try{post=readJson(file)}catch{continue}
    if(!post.title)continue;
    try{
      const im=await serp(post)||await commons(post); if(!im?.url)continue;
      Object.assign(post,{image:im.url,imageAlt:`${post.title} - relevant home cleaning photo`,image_source:im.source,image_source_url:im.source_url,image_credit:im.credit,image_license:im.license,image_license_url:im.license_url});
      writeJson(file,post); changed++; console.log(`Matched ${f} -> ${im.source}: ${im.url}`);
    }catch(e){console.warn(`Skipped ${f}: ${e.message}`)}
  }
  console.log(`Matched ${changed} post images to topics`);
})();
