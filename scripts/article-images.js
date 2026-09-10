// Inject topic-matched post photos INSIDE article content, not only in the header gallery.
const fs = require('fs');
const path = require('path');
const response = require('express/lib/response');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const FALLBACK = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=85';
const previousSend = response.send;

function esc(v='') {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
}
function slug(v='') {
  return String(v).toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
}
function approved(v='') {
  if (v.startsWith('/images/')) return true;
  try { return /(^|\.)cdn\.pixabay\.com$|(^|\.)pixabay\.com$|(^|\.)images\.pexels\.com$|(^|\.)pexels\.com$/.test(new URL(v).hostname.toLowerCase()); } catch { return false; }
}
function loadPost(targetSlug) {
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f=>f.endsWith('.json'));
    for (const file of files) {
      const d = JSON.parse(fs.readFileSync(path.join(POSTS_DIR,file),'utf8'));
      const s = d.slug || slug(d.title || file.replace(/\.json$/,''));
      if (s === targetSlug) return d;
    }
  } catch {}
  return null;
}
function postImages(post) {
  const list = Array.isArray(post?.images) ? post.images : [];
  const urls = [];
  for (const item of list) {
    const u = String(item?.url || '');
    if (approved(u) && !urls.includes(u)) urls.push(u);
  }
  if (approved(String(post?.image || '')) && !urls.includes(post.image)) urls.unshift(post.image);
  return urls.slice(0,5);
}
function insideGallery(post) {
  const imgs = postImages(post);
  if (imgs.length < 2) return '';
  const title = post.title || 'Article';
  return `<div class="article-inline-gallery" aria-label="Relevant photos for this guide">${imgs.slice(0,3).map((u,i)=>`<figure><img src="${esc(u)}" alt="${esc(title)} - relevant photo ${i+1}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK}'"><figcaption>${esc((post.images||[])[i]?.credit || 'Relevant article photo')}</figcaption></figure>`).join('')}</div>`;
}

response.send = function articleImagesSend(body) {
  if (typeof body === 'string' && /<html[\s>]/i.test(body)) {
    const req = this.req;
    const match = req && String(req.path || '').match(/^\/blog\/([^/?#]+)/i);
    if (match && !body.includes('article-inline-gallery')) {
      const targetSlug = decodeURIComponent(match[1]);
      const post = loadPost(targetSlug);
      const gallery = insideGallery(post);
      if (gallery) {
        // Put the relevant photos into the article body after the first two content blocks.
        const articleMatch = body.match(/(<div[^>]*class=[\"'][^\"']*article-content[^\"']*[\"'][^>]*>)([\s\S]*?)(<\/div>)/i);
        if (articleMatch) {
          let content = articleMatch[2];
          const blocks = content.match(/<p>[\s\S]*?<\/p>|<h2[\s\S]*?<\/h2>|<ul>[\s\S]*?<\/ul>/gi) || [];
          if (blocks.length >= 2) {
            const first = blocks.slice(0,2).join('');
            const rest = content.slice(first.length);
            content = first + gallery + rest;
            body = body.replace(articleMatch[0], articleMatch[1] + content + articleMatch[3]);
          } else {
            body = body.replace(articleMatch[0], articleMatch[1] + gallery + articleMatch[2] + articleMatch[3]);
          }
        }
      }
    }
  }
  return previousSend.call(this, body);
};

// Styling for photos inserted into the article body.
const previousHeader = response.send;
response.send = function styledArticleImages(body) {
  if (typeof body === 'string' && /<html[\s>]/i.test(body) && body.includes('article-inline-gallery') && !body.includes('article-inline-gallery-css')) {
    const css = `<style id="article-inline-gallery-css">.article-inline-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:34px 0 42px}.article-inline-gallery figure{margin:0;border:1px solid #e2e9e4;border-radius:16px;overflow:hidden;background:#f7faf8}.article-inline-gallery img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}.article-inline-gallery figcaption{padding:8px 10px;font-size:.7rem;color:#6d7971;line-height:1.35}.article-inline-gallery figure:first-child{grid-column:span 2}.article-inline-gallery figure:first-child img{aspect-ratio:16/9}@media(max-width:700px){.article-inline-gallery{grid-template-columns:1fr}.article-inline-gallery figure:first-child{grid-column:auto}}</style>`;
    body = body.replace('</head>', css + '</head>');
  }
  return previousHeader.call(this, body);
};
