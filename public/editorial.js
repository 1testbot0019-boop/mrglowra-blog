(()=>{
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 document.querySelectorAll('.card,.related-card,.sidebar-card,.author-box,.article-content h2').forEach((el,i)=>{el.style.animationDelay=(Math.min(i,10)*45)+'ms';if(!reduce)el.classList.add('clj-reveal')});
 const style=document.createElement('style');style.textContent='.clj-reveal{opacity:0;transform:translateY(14px);animation:clj-reveal .65s cubic-bezier(.2,.8,.2,1) forwards}@keyframes clj-reveal{to{opacity:1;transform:none}}';document.head.appendChild(style);
})();
