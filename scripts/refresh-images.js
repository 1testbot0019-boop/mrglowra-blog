const fs=require('fs');
const path=require('path');

const postsDir=path.join(__dirname,'..','posts');

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,data){fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n','utf8');}
function strip(v=''){return String(v).replace(/<[^>]+>/g,'').trim();}

async function findImage(post){
  const q=encodeURIComponent(`${post.title} home cleaning`);
  const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`;
  const r=await fetch(url,{headers:{'User-Agent':'CleanLivingJournal/1.0'}});
  if(!r.ok) throw new Error(`Commons ${r.status}`);
  const d=await r.json();
  const blocked=/logo|icon|diagram|map|screenshot|poster|symbol|chart|flag/i;
  const candidates=Object.values(d.query?.pages||{}).filter(p=>{
    const i=p.imageinfo?.[0];
    return i?.thumburl && /^image\/(jpeg|png|webp)$/i.test(i.mime||'') && !blocked.test(p.title||'');
  });
  if(!candidates.length)return null;
  const p=candidates[Math.floor(Math.random()*candidates.length)];
  const i=p.imageinfo[0];
  const m=i.extmetadata||{};
  return {
    url:i.thumburl||i.url,
    source:'Wikimedia Commons',
    source_url:i.descriptionurl||'',
    credit:strip(m.Artist?.value||m.Credit?.value||'').slice(0,180),
    license:strip(m.LicenseShortName?.value||m.UsageTerms?.value||'').slice(0,100),
    license_url:m.LicenseUrl?.value||''
  };
}

(async()=>{
  const files=fs.readdirSync(postsDir).filter(f=>f.endsWith('.json'));
  let changed=0;
  for(const f of files){
    const file=path.join(postsDir,f);
    let post;
    try{post=readJson(file);}catch{continue;}
    if(post.image && post.image!=='/generated-image.svg') continue;
    try{
      const im=await findImage(post);
      if(!im) continue;
      Object.assign(post,{image:im.url,imageAlt:`${post.title} - practical home cleaning guide`,image_source:im.source,image_source_url:im.source_url,image_credit:im.credit,image_license:im.license,image_license_url:im.license_url});
      writeJson(file,post);
      changed++;
      console.log(`Updated ${f}`);
    }catch(e){console.warn(`Skipped ${f}: ${e.message}`);}
  }
  console.log(`Updated ${changed} post images`);
})();
