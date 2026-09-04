const fs=require('fs');
const path=require('path');
const postsDir=path.join(__dirname,'..','posts');
const UA='CleanLivingJournal/1.0';
const readJson=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const writeJson=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n','utf8');
const strip=v=>String(v||'').replace(/<[^>]+>/g,'').trim();

async function pexels(post){
  if(!process.env.PEXELS_API_KEY)return null;
  const q=encodeURIComponent(`${post.title} home cleaning`);
  const r=await fetch(`https://api.pexels.com/v1/search?query=${q}&per_page=20&orientation=landscape`,{headers:{Authorization:process.env.PEXELS_API_KEY,'User-Agent':UA}});
  if(!r.ok)throw Error(`Pexels ${r.status}`);
  const photos=(await r.json()).photos||[]; if(!photos.length)return null;
  const p=photos[Math.floor(Math.random()*photos.length)];
  return {url:p.src.large2x||p.src.large,source:'Pexels',source_url:p.url,credit:p.photographer,license:'Pexels License',license_url:'https://www.pexels.com/license/'};
}

async function unsplash(post){
  if(!process.env.UNSPLASH_ACCESS_KEY)return null;
  const q=encodeURIComponent(`${post.title} home cleaning`);
  const r=await fetch(`https://api.unsplash.com/search/photos?query=${q}&per_page=20&orientation=landscape`,{headers:{Authorization:`Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,'User-Agent':UA}});
  if(!r.ok)throw Error(`Unsplash ${r.status}`);
  const photos=(await r.json()).results||[]; if(!photos.length)return null;
  const p=photos[Math.floor(Math.random()*photos.length)];
  return {url:p.urls.regular,source:'Unsplash',source_url:p.links.html,credit:p.user.name,license:'Unsplash License',license_url:'https://unsplash.com/license'};
}

async function commons(post){
  const q=encodeURIComponent(`${post.title} home cleaning`);
  const r=await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`,{headers:{'User-Agent':UA}});
  if(!r.ok)throw Error(`Commons ${r.status}`);
  const d=await r.json(),blocked=/logo|icon|diagram|map|screenshot|poster|symbol|chart|flag/i;
  const c=Object.values(d.query?.pages||{}).filter(p=>{const i=p.imageinfo?.[0];return i?.thumburl&&!blocked.test(p.title||'')&&/^image\/(jpeg|png|webp)$/i.test(i.mime||'');});
  if(!c.length)return null;
  const p=c[Math.floor(Math.random()*c.length)],i=p.imageinfo[0],m=i.extmetadata||{};
  return {url:i.thumburl||i.url,source:'Wikimedia Commons',source_url:i.descriptionurl||'',credit:strip(m.Artist?.value||m.Credit?.value),license:strip(m.LicenseShortName?.value||m.UsageTerms?.value),license_url:m.LicenseUrl?.value||''};
}

(async()=>{
  const files=fs.readdirSync(postsDir).filter(f=>f.endsWith('.json')); let changed=0;
  for(const f of files){
    const file=path.join(postsDir,f); let post; try{post=readJson(file)}catch{continue}
    try{
      const im=await pexels(post)||await unsplash(post)||await commons(post); if(!im?.url)continue;
      Object.assign(post,{image:im.url,imageAlt:`${post.title} - practical home cleaning guide`,image_source:im.source,image_source_url:im.source_url,image_credit:im.credit,image_license:im.license,image_license_url:im.license_url});
      writeJson(file,post); changed++; console.log(`Updated ${f} -> ${im.source}`);
    }catch(e){console.warn(`Skipped ${f}: ${e.message}`)}
  }
  console.log(`Updated ${changed} post images`);
})();
