const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const postsDir = path.join(__dirname, 'posts');
const SITE_URL = (process.env.SITE_URL || 'https://blog.mrglowra.com').replace(/\/$/, '');
const BRAND_URL = 'https://www.mrglowra.com';
const BRAND_NAME = 'Mr Glowra Pvt Ltd';
const GSC_VERIFICATION = '8KSWD37kd_UVKg_swub9f1yb6C5YTNA4K2m_o_0bWxA';
const ADSENSE_CLIENT = process.env.ADSENSE_CLIENT || '';
const AD_SLOT_TOP = process.env.AD_SLOT_TOP || '';
const AD_SLOT_MID = process.env.AD_SLOT_MID || '';
const AD_SLOT_SIDEBAR = process.env.AD_SLOT_SIDEBAR || '';
const AD_SLOT_BOTTOM = process.env.AD_SLOT_BOTTOM || '';

fs.ensureDirSync(postsDir);

function escapeHtml(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#039;'); }
function slugify(value = '') { return String(value).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
function stripMarkup(value = '') { return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
function postUrl(slug) { return `${SITE_URL}/blog/${encodeURIComponent(slug)}`; }

async function getPosts() {
  const files = (await fs.readdir(postsDir)).filter(file => file.endsWith('.json'));
  const posts = [];
  for (const file of files) {
    try { const data = await fs.readJson(path.join(postsDir, file)); posts.push({ ...data, slug: data.slug || slugify(data.title || file.replace(/\.json$/, '')), date: data.date || new Date().toISOString().slice(0, 10) }); }
    catch { console.warn(`Skipping invalid post: ${file}`); }
  }
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function adUnit(slot, className = '') {
  if (!ADSENSE_CLIENT || !slot) return '';
  return `<div class="ad-zone ${escapeHtml(className)}" aria-label="Advertisement"><ins class="adsbygoogle" style="display:block" data-ad-client="${escapeHtml(ADSENSE_CLIENT)}" data-ad-slot="${escapeHtml(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;
}

function buildArticleContent(rawContent = '') {
  const lines = String(rawContent).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  let html = '';
  let sectionIndex = 0;
  let paragraphBuffer = [];
  const toc = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    html += `<p>${escapeHtml(paragraphBuffer.join(' '))}</p>`;
    paragraphBuffer = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^[•*-]\s+(.+)$/);
    const heading = line.match(/^(How |Why |What |When |Where |Can |Should |Step \d+|Final |Conclusion|Tips|Common |Frequently Asked|FAQs|Things to |A simple |Daily |Weekly |Before |After |How often)/i);
    if (bullet) {
      flushParagraph();
      html += `<ul><li>${escapeHtml(bullet[1])}</li></ul>`;
    } else if (heading && line.length <= 110) {
      flushParagraph();
      sectionIndex += 1;
      const id = `section-${sectionIndex}`;
      toc.push({ id, title: line });
      html += `<h2 id="${id}">${escapeHtml(line)}</h2>`;
    } else {
      paragraphBuffer.push(line);
    }
  }
  flushParagraph();
  return { html, toc };
}

function layout({ title, description, canonical, content, type = 'website', schema = null }) {
  const safeDescription = stripMarkup(description).slice(0, 160);
  const jsonLd = schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : '';
  const adsenseScript = ADSENSE_CLIENT ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}" crossorigin="anonymous"></script>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(safeDescription)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${escapeHtml(canonical)}"><meta name="google-site-verification" content="${GSC_VERIFICATION}"><meta property="og:type" content="${escapeHtml(type)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(safeDescription)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:site_name" content="Mr Glowra"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(safeDescription)}"><link rel="alternate" type="application/rss+xml" title="Mr Glowra Journal RSS" href="${SITE_URL}/feed.xml"><style>
:root{--ink:#17201b;--muted:#66736a;--line:#e5ebe7;--brand:#176b3a;--brand-dark:#0f512b;--soft:#f4f8f5;--surface:#fff;--ad:#f7f9f8;--max:1240px}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--surface)}a{color:inherit;text-decoration:none}.nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}.nav-inner{max-width:var(--max);margin:auto;padding:15px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}.logo{font-weight:900;font-size:1.18rem;letter-spacing:-.03em;color:var(--brand)}.nav a{font-size:.92rem;color:#435048;margin-left:18px}.nav a:hover{color:var(--brand)}.wrap{max-width:var(--max);margin:auto;padding:36px 24px 80px}.breadcrumbs{max-width:1180px;margin:0 auto 28px;color:var(--muted);font-size:.84rem}.breadcrumbs a{color:var(--brand);font-weight:700}.post-layout{display:grid;grid-template-columns:minmax(0,760px) 300px;gap:44px;align-items:start;max-width:1120px;margin:0 auto}.article{min-width:0}.article-header{margin-bottom:30px}.eyebrow{color:var(--brand);font-weight:800;text-transform:uppercase;letter-spacing:.12em;font-size:.76rem}.article h1{font-size:clamp(2.35rem,5vw,4.15rem);line-height:1.05;letter-spacing:-.055em;margin:14px 0 18px}.dek{max-width:720px;color:var(--muted);font-size:1.13rem;line-height:1.7;margin:0 0 18px}.post-meta{display:flex;flex-wrap:wrap;gap:8px 14px;color:var(--muted);font-size:.88rem}.post-meta strong{color:var(--ink)}.hero-image{width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#edf5ef,#f8faf8);border:1px solid var(--line);border-radius:20px;overflow:hidden;margin:28px 0}.hero-image img{display:block;width:100%;height:100%;object-fit:cover}.article-content{color:#344039;font-size:1.105rem;line-height:1.82}.article-content p{margin:0 0 22px}.article-content h2{font-size:clamp(1.65rem,3vw,2.15rem);line-height:1.25;letter-spacing:-.025em;color:var(--ink);margin:48px 0 16px}.article-content ul{margin:8px 0 24px;padding-left:24px}.article-content li{margin:8px 0}.toc{background:var(--soft);border:1px solid #dfe9e2;border-radius:16px;padding:20px 22px;margin:28px 0 36px}.toc-title{font-weight:900;margin-bottom:10px}.toc ol{margin:0;padding-left:20px}.toc li{margin:7px 0;color:#435048}.toc a{color:var(--brand);font-weight:700}.ad-zone{width:100%;min-height:120px;margin:34px 0;padding:10px 0;display:flex;align-items:center;justify-content:center;background:var(--ad);border-radius:10px;overflow:hidden}.ad-zone::before{content:'Advertisement';font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#89938d;position:absolute;opacity:.8}.ad-zone:has(.adsbygoogle)::before{position:relative;display:none}.sidebar{position:sticky;top:92px}.sidebar .ad-zone{min-height:280px;margin:0 0 24px}.sidebar-card{border:1px solid var(--line);border-radius:16px;padding:20px;background:#fff;margin-bottom:20px}.sidebar-card h2{font-size:1.05rem;margin:0 0 12px}.sidebar-card a{display:block;padding:11px 0;border-top:1px solid var(--line);font-size:.92rem;line-height:1.45}.author-box{margin-top:54px;padding:24px;border:1px solid var(--line);border-radius:18px;background:var(--soft)}.author-box h2{font-size:1.2rem;margin:0 0 8px}.author-box p{margin:6px 0;color:#536057;line-height:1.65}.related{margin-top:48px;padding-top:32px;border-top:1px solid var(--line)}.related-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.related-card{padding:18px;border:1px solid var(--line);border-radius:16px;transition:transform .2s ease,box-shadow .2s ease}.related-card:hover{transform:translateY(-2px);box-shadow:0 10px 25px rgba(20,50,30,.07)}.related-card h3{margin:8px 0;font-size:1rem;line-height:1.4}.tag{display:inline-block;background:var(--soft);color:var(--brand);border-radius:999px;padding:6px 10px;font-size:.72rem;font-weight:800}.date{color:var(--muted);font-size:.84rem}.cta{margin-top:42px;padding:28px;border-radius:20px;background:var(--soft)}.cta p{color:#536057;line-height:1.65}.btn{display:inline-block;margin-top:10px;padding:12px 18px;border-radius:999px;background:var(--brand);color:#fff;font-weight:800}.btn:hover{background:var(--brand-dark)}.home-hero{background:linear-gradient(135deg,#f2f8f3,#fff);border-bottom:1px solid var(--line)}.home-hero-inner{max-width:var(--max);margin:auto;padding:72px 24px 64px}.home-hero h1{font-size:clamp(2.5rem,6vw,4.5rem);line-height:1.02;letter-spacing:-.055em;max-width:850px;margin:14px 0 18px}.home-hero p{max-width:680px;color:var(--muted);font-size:1.08rem;line-height:1.7}.grid{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.card{border:1px solid var(--line);border-radius:20px;overflow:hidden;background:#fff;transition:transform .2s ease,box-shadow .2s ease}.card:hover{transform:translateY(-3px);box-shadow:0 14px 35px rgba(20,50,30,.08)}.card-body{padding:24px}.card h2{font-size:1.25rem;line-height:1.25;margin:14px 0 10px}.excerpt{color:#59645d;line-height:1.65}footer{border-top:1px solid var(--line);padding:28px 22px;color:var(--muted);text-align:center;font-size:.9rem}footer a{color:var(--brand);font-weight:700}@media(max-width:980px){.post-layout{grid-template-columns:minmax(0,1fr);max-width:800px}.sidebar{position:static;display:grid;grid-template-columns:1fr 1fr;gap:18px}.sidebar .ad-zone{margin:0;min-height:250px}.sidebar-card{margin:0}}@media(max-width:800px){.grid{grid-template-columns:1fr}.nav-inner{padding:13px 16px}.nav a{margin-left:10px}.wrap{padding:24px 18px 60px}.breadcrumbs{margin-bottom:20px}.article h1{font-size:clamp(2.05rem,10vw,3rem);line-height:1.08}.dek{font-size:1.02rem}.article-content{font-size:1.05rem;line-height:1.78}.article-content h2{margin-top:38px}.hero-image{border-radius:14px;margin:22px 0}.ad-zone{min-height:100px;margin:30px 0}.sidebar{display:block}.sidebar .ad-zone{min-height:220px;margin:0 0 18px}.related-grid{grid-template-columns:1fr}.home-hero-inner{padding:52px 18px}.author-box{margin-top:42px}}
@media(prefers-color-scheme:dark){:root{--ink:#edf4ef;--muted:#aab8af;--line:#29362f;--brand:#67c58b;--brand-dark:#8bdaa7;--soft:#18221d;--surface:#0f1512;--ad:#151d18}body{background:var(--surface)}.nav{background:rgba(15,21,18,.96)}.nav a{color:#bdc9c1}.card,.sidebar-card,.related-card{background:#121a16}.article-content{color:#d0dbd4}.article h1,.article-content h2{color:var(--ink)}.home-hero{background:linear-gradient(135deg,#14231a,#0f1512)}.breadcrumbs{color:var(--muted)}}
</style>${adsenseScript}${jsonLd}</head><body><nav class="nav"><div class="nav-inner"><a class="logo" href="${SITE_URL}/">Mr Glowra Journal</a><div><a href="${SITE_URL}/">Blog</a><a href="${BRAND_URL}">Mr Glowra</a></div></div></nav>${content}<footer>© ${new Date().getFullYear()} ${BRAND_NAME} · <a href="${BRAND_URL}">Power That Shines!</a></footer></body></html>`;
}

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'mrglowra-blog' }));
app.get('/posts', async (req, res) => { try { res.json(await getPosts()); } catch { res.status(500).json({ error: 'Failed to read posts' }); } });
app.get('/feed.xml', async (req, res) => { const posts = await getPosts(); const items = posts.slice(0,20).map(post => `<item><title>${escapeHtml(post.title)}</title><link>${escapeHtml(postUrl(post.slug))}</link><guid>${escapeHtml(postUrl(post.slug))}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${escapeHtml(post.description || stripMarkup(post.content).slice(0,300))}</description></item>`).join(''); res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Mr Glowra Journal</title><link>${SITE_URL}/</link><description>Cleaning tips, home-care advice and product knowledge from Mr Glowra.</description>${items}</channel></rss>`); });
app.get('/sitemap.xml', async (req,res) => { const posts=await getPosts(); const urls=[`<url><loc>${SITE_URL}/</loc></url>`,...posts.map(post=>`<url><loc>${escapeHtml(postUrl(post.slug))}</loc><lastmod>${escapeHtml(post.date)}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`),`<url><loc>${SITE_URL}/feed.xml</loc></url>`]; res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`); });
app.get('/robots.txt',(req,res)=>res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /posts\nSitemap: ${SITE_URL}/sitemap.xml\n`));

app.get('/blog/:slug',async(req,res)=>{
  const posts=await getPosts();
  const post=posts.find(item=>item.slug===req.params.slug);
  if(!post)return res.status(404).send(layout({title:'Article Not Found | Mr Glowra',description:'The requested article could not be found.',canonical:`${SITE_URL}/blog/${escapeHtml(req.params.slug)}`,content:'<main class="wrap"><div class="article"><h1>Article not found</h1><p>Return to the <a href="/">Mr Glowra Journal</a>.</p></div></main>'}));

  const description=post.description||stripMarkup(post.content).slice(0,155);
  const related=posts.filter(item=>item.slug!==post.slug&&item.category===post.category).slice(0,3);
  const fallbackRelated=related.length?related:posts.filter(item=>item.slug!==post.slug).slice(0,3);
  const relatedHtml=fallbackRelated.length?`<section class="related"><h2>More from the journal</h2><div class="related-grid">${fallbackRelated.map(item=>`<a class="related-card" href="${postUrl(item.slug)}"><span class="tag">${escapeHtml(item.category||'Cleaning Tips')}</span><h3>${escapeHtml(item.title)}</h3><span class="date">${escapeHtml(item.date)}</span></a>`).join('')}</div></section>`:'';
  const parsed=buildArticleContent(post.content||'');
  const tocHtml=parsed.toc.length>=3?`<nav class="toc" aria-label="Table of contents"><div class="toc-title">On this page</div><ol>${parsed.toc.map(item=>`<li><a href="#${item.id}">${escapeHtml(item.title)}</a></li>`).join('')}</ol></nav>`:'';
  const authorName=post.author||'Mr Glowra Editorial Team';
  const authorBio=post.author_bio||'The Mr Glowra editorial team publishes practical home-cleaning and care information with a focus on clear, responsible guidance.';
  const schema={'@context':'https://schema.org','@type':'Article',headline:post.title,description,datePublished:post.date,dateModified:post.updated_at||post.date,keywords:Array.isArray(post.keywords)?post.keywords.join(', '):undefined,author:{'@type':'Person',name:authorName},publisher:{'@type':'Organization',name:BRAND_NAME,url:BRAND_URL},mainEntityOfPage:{'@type':'WebPage','@id':postUrl(post.slug)}};

  const content=`<main class="wrap"><div class="breadcrumbs"><a href="${SITE_URL}/">Home</a> <span aria-hidden="true">›</span> <a href="${SITE_URL}/">Journal</a> <span aria-hidden="true">›</span> <span>${escapeHtml(post.category||'Cleaning Tips')}</span></div><div class="post-layout"><article class="article"><header class="article-header"><span class="eyebrow">${escapeHtml(post.category||'Mr Glowra Journal')}</span><h1>${escapeHtml(post.title)}</h1><p class="dek">${escapeHtml(description)}</p><div class="post-meta"><span>By <strong>${escapeHtml(authorName)}</strong></span><span>Published ${escapeHtml(post.date)}</span>${post.updated_at?`<span>Updated ${escapeHtml(post.updated_at)}</span>`:''}</div></header>${post.image?`<figure class="hero-image"><img src="${escapeHtml(post.image)}" width="1200" height="675" alt="${escapeHtml(post.image_alt||post.title)}" fetchpriority="high"></figure>`:''}${adUnit(AD_SLOT_TOP,'ad-top')}${tocHtml}<div class="article-content">${parsed.html}</div>${adUnit(AD_SLOT_MID,'ad-mid')}<section class="author-box"><h2>About the author</h2><p><strong>${escapeHtml(authorName)}</strong></p><p>${escapeHtml(authorBio)}</p></section>${relatedHtml}${adUnit(AD_SLOT_BOTTOM,'ad-bottom')}<div class="cta"><strong>Explore Mr Glowra</strong><p>Learn more about our cleaning products and the Mr Glowra brand.</p><a class="btn" href="${BRAND_URL}">Visit Mr Glowra</a></div></article><aside class="sidebar" aria-label="Sidebar"><div>${adUnit(AD_SLOT_SIDEBAR,'ad-sidebar')}</div>${fallbackRelated.length?`<div class="sidebar-card"><h2>Recommended reading</h2>${fallbackRelated.slice(0,3).map(item=>`<a href="${postUrl(item.slug)}">${escapeHtml(item.title)}</a>`).join('')}</div>`:''}</aside></div></main>`;
  res.send(layout({title:`${post.title} | Mr Glowra`,description,canonical:postUrl(post.slug),content,type:'article',schema}));
});

app.get('/',async(req,res)=>{try{const posts=await getPosts();const cards=posts.map(post=>`<article class="card"><div class="card-body"><span class="tag">${escapeHtml(post.category||'Cleaning Tips')}</span><h2><a href="${postUrl(post.slug)}">${escapeHtml(post.title)}</a></h2><div class="date">${escapeHtml(post.date)}</div><p class="excerpt">${escapeHtml(post.description||stripMarkup(post.content).slice(0,150))}</p><a class="btn" href="${postUrl(post.slug)}">Read article</a></div></article>`).join('');const schema={'@context':'https://schema.org','@type':'Blog','name':'Mr Glowra Journal','url':SITE_URL,'description':'Cleaning tips, home-care advice and product knowledge from Mr Glowra.','publisher':{'@type':'Organization','name':BRAND_NAME,'url':BRAND_URL}};const content=`<header class="home-hero"><div class="home-hero-inner"><div class="eyebrow">Mr Glowra Journal</div><h1>Smarter cleaning. Better living.</h1><p>Practical cleaning tips, product knowledge and useful home-care ideas from Mr Glowra — Made in Uttarakhand.</p></div></header><main class="wrap">${adUnit(AD_SLOT_TOP,'ad-home-top')}<div class="grid">${cards||'<p>No articles published yet.</p>'}</div></main>`;res.send(layout({title:'Mr Glowra Blog | Cleaning Tips & Home Care',description:'Cleaning tips, home-care advice and product knowledge from Mr Glowra.',canonical:SITE_URL,content,schema}));}catch{res.status(500).send('Failed to load blog.');}});

const PORT=process.env.PORT||3000;app.listen(PORT,'0.0.0.0',()=>console.log(`Mr Glowra Blog running on port ${PORT}`));
