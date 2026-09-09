// Editorial UI + homepage renderer. Loaded with Node -r before Express.
// It deliberately uses only Node built-ins and the existing post JSON files.
const fs = require('fs');
const path = require('path');
const response = require('express/lib/response');
const originalSend = response.send;

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const SITE_URL = (process.env.SITE_URL || 'https://blog.mrglowra.com').replace(/\/$/, '');
const ADSENSE_CLIENT = process.env.ADSENSE_CLIENT || '';
const NAV = ['Deep Cleaning','Home Organization','Green & DIY','Appliance Care','Odor & Maintenance'];
const FALLBACK = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=85';

function esc(v='') { return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function slug(v='') { return String(v).toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''); }
function strip(v='') { return String(v).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim(); }
function approvedImage(v='') {
  if (!v) return false;
  if (v.startsWith('/images/') || v.startsWith('images/')) return true;
  try { const h = new URL(v).hostname.toLowerCase(); return /(^|\.)images\.pexels\.com$|(^|\.)pexels\.com$|(^|\.)images\.unsplash\.com$|(^|\.)unsplash\.com$|(^|\.)cdn\.pixabay\.com$|(^|\.)pixabay\.com$|(^|\.)upload\.wikimedia\.org$/.test(h); } catch { return false; }
}
function imageFor(post) {
  const imgs = Array.isArray(post.images) ? post.images : [];
  const first = imgs.find(x => x && approvedImage(x.url));
  if (first) return first.url;
  if (approvedImage(post.image)) return post.image;
  return FALLBACK;
}
function loadPosts() {
  try {
    return fs.readdirSync(POSTS_DIR).filter(f=>f.endsWith('.json')).map(f=>{
      try { const d=JSON.parse(fs.readFileSync(path.join(POSTS_DIR,f),'utf8')); return {...d, slug:d.slug||slug(d.title||f.replace(/\.json$/,''))}; } catch { return null; }
    }).filter(Boolean).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  } catch { return []; }
}
function ad(slot='', cls='') {
  if (!ADSENSE_CLIENT) return `<div class="ad-zone ${esc(cls)}"><span>Advertisement</span></div>`;
  if (!slot) return `<div class="ad-zone ${esc(cls)}"><span>Advertisement</span></div>`;
  return `<div class="ad-zone ${esc(cls)}"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ADSENSE_CLIENT)}" data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}
function card(post, featured=false) {
  const title=post.title||'Cleaning guide';
  const url=`${SITE_URL}/blog/${encodeURIComponent(post.slug||slug(title))}`;
  const img=imageFor(post);
  const desc=strip(post.description||post.excerpt||post.content||'').slice(0,145);
  return `<article class="home-card${featured?' home-card-featured':''}"><a class="home-card-image" href="${esc(url)}"><img src="${esc(img)}" alt="${esc(title)}" loading="${featured?'eager':'lazy'}" onerror="this.onerror=null;this.src='${FALLBACK}'"></a><div class="home-card-body"><span class="home-card-category">${esc(post.category||'Cleaning & Home')}</span><h3><a href="${esc(url)}">${esc(title)}</a></h3>${desc?`<p>${esc(desc)}</p>`:''}<a class="read-link" href="${esc(url)}">Read article <span>→</span></a></div></article>`;
}
function homeMain(posts) {
  const featured=posts[0];
  const latest=posts.slice(1,7);
  const suggestions=posts.slice(7,13);
  const categories=NAV.map(c=>`<a href="${SITE_URL}/category/${encodeURIComponent(slug(c))}">${esc(c)}</a>`).join('');
  return `<main class="home-redesign">
    <section class="home-hero-new"><div class="home-hero-copy"><span class="home-kicker">CLEAN LIVING JOURNAL</span><h1>Smarter ways to clean, organize & care for your home.</h1><p>Practical, research-led home care guides for everyday life in the United States.</p><div class="home-category-row">${categories}</div></div></section>
    ${ad('', 'home-ad-top')}
    <section class="home-feature-wrap"><div class="home-section-label"><span>Featured guide</span><a href="${SITE_URL}/">Explore all</a></div>${featured?card(featured,true):''}</section>
    <div class="home-content-layout"><section class="home-latest"><div class="home-section-label"><span>Latest stories</span><span class="home-count">${Math.min(6,latest.length)} fresh reads</span></div><div class="home-card-grid">${latest.map(p=>card(p)).join('')}</div>${ad('', 'home-ad-mid')}<div class="home-section-label"><span>More useful guides</span></div><div class="home-card-grid compact">${posts.slice(7,10).map(p=>card(p)).join('')}</div></section>
      <aside class="home-sidebar"><div class="sidebar-heading">Recommended for you</div><div class="sidebar-list">${suggestions.map((p,i)=>{const u=`${SITE_URL}/blog/${encodeURIComponent(p.slug||slug(p.title||''))}`;return `<a class="suggestion" href="${esc(u)}"><span class="suggestion-num">${String(i+1).padStart(2,'0')}</span><img src="${esc(imageFor(p))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK}'"><span><strong>${esc(p.title||'Cleaning guide')}</strong><small>${esc(p.category||'Home care')}</small></span></a>`}).join('')}</div>${ad('', 'home-ad-sidebar')}<div class="sidebar-newsletter"><span>WEEKLY HOME NOTES</span><h3>Simple ideas for a cleaner, calmer home.</h3><p>New practical guides, no clutter.</p></div></aside>
    </div>
  </main>`;
}

const extraCss = `<style id="editorial-home-css">
.home-redesign{background:#fff;color:#17201b}.home-hero-new{background:linear-gradient(135deg,#f1f7f3 0%,#fff 70%);border-bottom:1px solid #e5ebe7}.home-hero-copy{max-width:1240px;margin:auto;padding:72px 28px 50px}.home-kicker{font-size:.72rem;font-weight:900;letter-spacing:.16em;color:#176b3a}.home-hero-copy h1{max-width:880px;font-size:clamp(2.6rem,6vw,5.2rem);line-height:.98;letter-spacing:-.06em;margin:16px 0 20px}.home-hero-copy p{max-width:650px;color:#66736a;font-size:1.12rem;line-height:1.7}.home-category-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:30px}.home-category-row a{border:1px solid #dce5df;border-radius:999px;padding:9px 13px;background:#fff;font-size:.78rem;font-weight:700}.home-ad-top{max-width:1180px;margin:18px auto 8px}.home-feature-wrap,.home-content-layout{max-width:1120px;margin:0 auto;padding:22px 24px}.home-section-label{display:flex;align-items:center;justify-content:space-between;margin:10px 0 18px;font-size:.75rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:#66736a}.home-section-label a{color:#176b3a;letter-spacing:0;text-transform:none}.home-count{font-weight:600;letter-spacing:0;text-transform:none}.home-card{border:1px solid #e3e9e5;border-radius:18px;overflow:hidden;background:#fff;transition:transform .2s ease,box-shadow .2s ease}.home-card:hover{transform:translateY(-3px);box-shadow:0 12px 35px rgba(23,32,27,.08)}.home-card-image{display:block;aspect-ratio:16/9;background:#eef3ef;overflow:hidden}.home-card-image img{width:100%;height:100%;object-fit:cover;display:block}.home-card-body{padding:20px}.home-card-category{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#176b3a}.home-card h3{font-size:1.2rem;line-height:1.25;letter-spacing:-.025em;margin:9px 0}.home-card h3 a:hover{color:#176b3a}.home-card p{color:#66736a;font-size:.9rem;line-height:1.6;margin:0 0 12px}.read-link{font-size:.82rem;font-weight:800;color:#176b3a}.home-card-featured{display:grid;grid-template-columns:1.35fr 1fr;min-height:390px}.home-card-featured .home-card-image{height:100%;aspect-ratio:auto}.home-card-featured .home-card-body{display:flex;flex-direction:column;justify-content:center;padding:38px}.home-card-featured h3{font-size:clamp(1.7rem,3vw,2.5rem);line-height:1.1}.home-card-featured p{font-size:1rem;max-width:470px}.home-content-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:42px;padding-top:26px}.home-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.home-card-grid.compact{grid-template-columns:repeat(3,minmax(0,1fr))}.home-sidebar{position:sticky;top:92px;align-self:start}.sidebar-heading{font-size:1rem;font-weight:900;margin:10px 0 16px}.sidebar-list{border-top:1px solid #e3e9e5}.suggestion{display:grid;grid-template-columns:24px 64px 1fr;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid #e3e9e5}.suggestion img{width:64px;height:54px;border-radius:9px;object-fit:cover;background:#eef3ef}.suggestion-num{font-size:.7rem;font-weight:900;color:#9aa69e}.suggestion strong{display:block;font-size:.82rem;line-height:1.3}.suggestion small{display:block;color:#7a867e;font-size:.68rem;margin-top:5px}.ad-zone{min-height:90px;margin:26px 0;background:#fafbfa;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#a2aaa5;font-size:.65rem;text-transform:uppercase;letter-spacing:.1em}.sidebar-newsletter{margin-top:24px;padding:22px;border-radius:16px;background:#f2f7f3;border:1px solid #dfe9e2}.sidebar-newsletter span{font-size:.65rem;font-weight:900;letter-spacing:.12em;color:#176b3a}.sidebar-newsletter h3{font-size:1.2rem;line-height:1.25;margin:10px 0}.sidebar-newsletter p{font-size:.82rem;color:#66736a;margin:0}@media(max-width:900px){.home-content-layout{grid-template-columns:1fr}.home-sidebar{position:static}.home-card-grid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}.home-card-featured{grid-template-columns:1fr}.home-card-featured .home-card-image{height:auto;aspect-ratio:16/9}}@media(max-width:620px){.home-hero-copy{padding:48px 18px 34px}.home-feature-wrap,.home-content-layout{padding-left:18px;padding-right:18px}.home-card-grid,.home-card-grid.compact{grid-template-columns:1fr}.home-card-featured .home-card-body{padding:24px}.home-category-row{gap:7px}.home-category-row a{font-size:.7rem;padding:8px 10px}}
</style>`;

response.send = function send(body) {
  if (typeof body === 'string' && /<html[\s>]/i.test(body)) {
    if (!body.includes('/editorial.css')) body = body.replace('</head>', '<link rel="stylesheet" href="/editorial.css"></head>');
    if (!body.includes('/editorial.js')) body = body.replace('</body>', '<script src="/editorial.js" defer></script></body>');
    body = body.replace(/<img\b(?![^>]*referrerpolicy=)/gi, '<img referrerpolicy="no-referrer"');
    body = body.replace(/Mr Glowra Journal/g, 'Clean Living Journal');
    body = body.replace(/Mr Glowra Pvt Ltd/g, 'Clean Living Journal');
    body = body.replace(/<meta property="og:site_name" content="Mr Glowra">/gi, '<meta property="og:site_name" content="Clean Living Journal">');
    if (!body.includes('editorial-home-css')) body = body.replace('</head>', extraCss + '</head>');
    const req = this.req;
    if (req && (req.path === '/' || req.path === '')) {
      const posts = loadPosts();
      if (posts.length) {
        const match = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (match) {
          const old = match[1];
          const nav = (old.match(/<nav[\s\S]*?<\/nav>/i)||[''])[0];
          const footer = (old.match(/<footer[\s\S]*?<\/footer>/i)||[''])[0];
          body = body.replace(match[0], `<body>${nav}${homeMain(posts)}${footer}</body>`);
        }
      }
    }
  }
  return originalSend.call(this, body);
};
