(()=>{
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const addReveal=()=>document.querySelectorAll('.card,.related-card,.sidebar-card,.author-box,.article-content h2').forEach((el,i)=>{el.style.animationDelay=(Math.min(i,10)*45)+'ms';if(!reduce)el.classList.add('clj-reveal')});
 async function hydratePostImages(){
  if(!document.querySelector('.card'))return;
  try{
   const response=await fetch('/posts',{headers:{Accept:'application/json'}});
   if(!response.ok)return;
   const posts=await response.json();
   const bySlug=new Map(posts.map(p=>[String(p.slug||''),p]));
   document.querySelectorAll('.card').forEach(card=>{
    const link=card.querySelector('a[href*="/blog/"]');
    if(!link)return;
    const match=link.getAttribute('href').match(/\/blog\/([^?#]+)/);
    if(!match)return;
    let slug='';
    try{slug=decodeURIComponent(match[1])}catch{slug=match[1]}
    const post=bySlug.get(slug);
    if(!post?.image||card.querySelector('.card-image'))return;
    const wrap=document.createElement('div');
    wrap.className='card-image';
    const img=document.createElement('img');
    img.src=post.image;
    img.alt=post.imageAlt||post.title||'Article image';
    img.loading='lazy';
    img.decoding='async';
    img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>wrap.classList.add('image-failed'),{once:true});
    wrap.appendChild(img);
    card.insertBefore(wrap,card.firstChild);
   });
  }catch(e){console.warn('Could not load article images',e)}
 }
 const style=document.createElement('style');
 style.textContent='.clj-reveal{opacity:0;transform:translateY(14px);animation:clj-reveal .65s cubic-bezier(.2,.8,.2,1) forwards}@keyframes clj-reveal{to{opacity:1;transform:none}}.card-image{width:100%;aspect-ratio:16/9;overflow:hidden;background:#eef2f0;border-bottom:1px solid var(--line)}.card-image img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .45s ease}.card:hover .card-image img{transform:scale(1.035)}.card-image.image-failed{display:none}';
 document.head.appendChild(style);
 addReveal();
 hydratePostImages();
})();
