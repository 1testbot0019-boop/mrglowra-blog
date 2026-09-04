const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const postsDir = path.join(__dirname, 'posts');
const SITE_URL = (process.env.SITE_URL || 'https://blog.mrglowra.com').replace(/\/$/, '');
const BRAND_URL = 'https://www.mrglowra.com';

fs.ensureDirSync(postsDir);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getPosts() {
  const files = (await fs.readdir(postsDir)).filter(file => file.endsWith('.json'));
  const posts = [];

  for (const file of files) {
    try {
      const data = await fs.readJson(path.join(postsDir, file));
      posts.push({
        ...data,
        slug: data.slug || slugify(data.title || file.replace(/\.json$/, '')),
        date: data.date || new Date().toISOString().slice(0, 10)
      });
    } catch (error) {
      console.warn(`Skipping invalid post: ${file}`);
    }
  }

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function layout({ title, description, canonical, content, type = 'website' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="Mr Glowra">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <style>
    :root { --ink:#17201b; --muted:#647067; --line:#e6ebe7; --brand:#176b3a; --soft:#f5f8f5; --white:#fff; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--ink); background:#fff; }
    a { color:inherit; text-decoration:none; }
    .nav { position:sticky; top:0; z-index:10; background:rgba(255,255,255,.94); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
    .nav-inner { max-width:1120px; margin:auto; padding:16px 22px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
    .logo { font-weight:900; font-size:1.2rem; letter-spacing:-.03em; color:var(--brand); }
    .nav a { font-size:.92rem; color:#435048; margin-left:18px; }
    .hero { background:linear-gradient(135deg,#f2f8f3,#fff); border-bottom:1px solid var(--line); }
    .hero-inner { max-width:1120px; margin:auto; padding:72px 22px 64px; }
    .eyebrow { color:var(--brand); font-weight:800; text-transform:uppercase; letter-spacing:.12em; font-size:.76rem; }
    h1 { font-size:clamp(2.3rem,6vw,4.5rem); line-height:1.02; letter-spacing:-.055em; max-width:850px; margin:14px 0 18px; }
    .hero p { max-width:680px; color:var(--muted); font-size:1.08rem; line-height:1.7; }
    .wrap { max-width:1120px; margin:auto; padding:44px 22px 80px; }
    .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px; }
    .card { border:1px solid var(--line); border-radius:20px; overflow:hidden; background:#fff; transition:transform .2s ease,box-shadow .2s ease; }
    .card:hover { transform:translateY(-3px); box-shadow:0 14px 35px rgba(20,50,30,.08); }
    .card-body { padding:24px; }
    .tag { display:inline-block; background:var(--soft); color:var(--brand); border-radius:999px; padding:6px 10px; font-size:.75rem; font-weight:800; }
    .card h2 { font-size:1.25rem; line-height:1.25; margin:14px 0 10px; }
    .date { color:var(--muted); font-size:.84rem; }
    .excerpt { color:#59645d; line-height:1.65; }
    .article { max-width:780px; margin:auto; }
    .article h1 { max-width:none; font-size:clamp(2.2rem,5vw,3.8rem); }
    .article-content { color:#37423b; font-size:1.08rem; line-height:1.85; white-space:pre-wrap; }
    .cta { margin-top:42px; padding:28px; border-radius:20px; background:var(--soft); }
    .btn { display:inline-block; margin-top:10px; padding:12px 18px; border-radius:999px; background:var(--brand); color:#fff; font-weight:800; }
    footer { border-top:1px solid var(--line); padding:28px 22px; color:var(--muted); text-align:center; font-size:.9rem; }
    @media(max-width:800px){ .grid{grid-template-columns:1fr;} .nav-inner{padding:14px 16px;} .nav a{margin-left:10px;} .hero-inner{padding:52px 18px;} .wrap{padding:32px 18px 60px;} }
  </style>
</head>
<body>
  <nav class="nav"><div class="nav-inner"><a class="logo" href="${SITE_URL}/">Mr Glowra</a><div><a href="${SITE_URL}/">Blog</a><a href="${BRAND_URL}">Main Website</a></div></div></nav>
  ${content}
  <footer>© ${new Date().getFullYear()} Mr Glowra Pvt Ltd · Power That Shines!</footer>
</body>
</html>`;
}

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'mrglowra-blog' }));

app.get('/posts', async (req, res) => {
  try { res.json(await getPosts()); }
  catch (error) { res.status(500).json({ error: 'Failed to read posts' }); }
});

app.get('/sitemap.xml', async (req, res) => {
  const posts = await getPosts();
  const urls = [
    `<url><loc>${SITE_URL}/</loc></url>`,
    ...posts.map(post => `<url><loc>${SITE_URL}/blog/${escapeHtml(post.slug)}</loc><lastmod>${escapeHtml(post.date)}</lastmod></url>`)
  ];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get('/blog/:slug', async (req, res) => {
  const posts = await getPosts();
  const post = posts.find(item => item.slug === req.params.slug);
  if (!post) return res.status(404).send(layout({ title:'Article Not Found | Mr Glowra', description:'The requested article could not be found.', canonical:`${SITE_URL}/blog/${req.params.slug}`, content:'<main class="wrap"><div class="article"><h1>Article not found</h1><p>Return to the <a href="/">Mr Glowra Blog</a>.</p></div></main>' }));

  const description = post.description || String(post.content || '').replace(/\s+/g, ' ').slice(0, 155);
  const schema = { '@context':'https://schema.org', '@type':'Article', headline:post.title, datePublished:post.date, dateModified:post.date, author:{'@type':'Organization',name:'Mr Glowra'}, publisher:{'@type':'Organization',name:'Mr Glowra Pvt Ltd'}, mainEntityOfPage:`${SITE_URL}/blog/${post.slug}` };
  const content = `<main class="wrap"><article class="article"><span class="eyebrow">Mr Glowra Journal</span><h1>${escapeHtml(post.title)}</h1><div class="date">${escapeHtml(post.date)}</div><div class="article-content">${escapeHtml(post.content || '')}</div><div class="cta"><strong>Discover Mr Glowra cleaning products</strong><p>Explore our cleaning range and learn more about the brand.</p><a class="btn" href="${BRAND_URL}">Visit Mr Glowra</a></div></article></main><script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  res.send(layout({ title:`${post.title} | Mr Glowra`, description, canonical:`${SITE_URL}/blog/${post.slug}`, content, type:'article' }));
});

app.get('/', async (req, res) => {
  try {
    const posts = await getPosts();
    const cards = posts.map(post => `<article class="card"><div class="card-body"><span class="tag">${escapeHtml(post.category || 'Cleaning Tips')}</span><h2><a href="${SITE_URL}/blog/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2><div class="date">${escapeHtml(post.date)}</div><p class="excerpt">${escapeHtml(post.description || String(post.content || '').replace(/\s+/g,' ').slice(0,150))}</p><a class="btn" href="${SITE_URL}/blog/${escapeHtml(post.slug)}">Read article</a></div></article>`).join('');
    const content = `<header class="hero"><div class="hero-inner"><div class="eyebrow">Mr Glowra Journal</div><h1>Smarter cleaning. Better living.</h1><p>Practical cleaning tips, product knowledge and useful home-care ideas from Mr Glowra — Made in Uttarakhand.</p></div></header><main class="wrap"><div class="grid">${cards || '<p>No articles published yet.</p>'}</div></main>`;
    res.send(layout({ title:'Mr Glowra Blog | Cleaning Tips & Home Care', description:'Cleaning tips, home-care advice and product knowledge from Mr Glowra.', canonical:SITE_URL, content }));
  } catch (error) { res.status(500).send('Failed to load blog.'); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mr Glowra Blog running on port ${PORT}`));
