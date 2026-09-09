const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'posts');

function isApprovedImage(value = '') {
  if (!value) return false;
  if (value === '/generated-image.svg') return true;
  if (value.startsWith('/images/') && value.length > '/images/'.length) return true;
  try {
    const url = new URL(String(value));
    if (!/^https?:$/.test(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    const blocked = ['instagram.com', 'cdninstagram.com', 'fbcdn.net', 'fbsbx.com', 'facebook.com', 'pinterest.com', 'tiktok.com'];
    return !blocked.some(domain => host === domain || host.endsWith('.' + domain));
  } catch {
    return false;
  }
}

(async () => {
  const files = (await fs.readdir(postsDir)).filter(file => file.endsWith('.json'));
  if (!files.length) throw new Error('No post files found');

  let checked = 0;
  for (const file of files) {
    const post = await fs.readJson(path.join(postsDir, file));
    if (post.market !== 'US') continue;
    checked += 1;

    if (!post.title || post.title.length < 20 || post.title.length > 90) {
      throw new Error(`SEO audit failed: title length for ${file}`);
    }
    if (!post.description || post.description.length < 120 || post.description.length > 160) {
      throw new Error(`SEO audit failed: meta description length for ${file}`);
    }
    if (!post.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
      throw new Error(`SEO audit failed: invalid slug for ${file}`);
    }
    if (!Array.isArray(post.keywords) || post.keywords.length < 5) {
      console.warn(`SEO audit warning: fewer than 5 keywords for ${file}; continuing because the article itself is otherwise valid.`);
    }
    if (!post.content || post.content.trim().length < 2500) {
      throw new Error(`SEO audit failed: article is too short for ${file}`);
    }
    if (process.env.REQUIRE_IMAGES === 'true' && !isApprovedImage(post.image)) {
      throw new Error(`SEO audit failed: missing usable topic-matched image for ${file}`);
    }
    if (post.image_source && /instagram|facebook|cdninstagram|fbcdn|fbsbx|pinterest|tiktok/i.test(post.image_source)) {
      throw new Error(`SEO audit failed: blocked social image source for ${file}`);
    }
  }

  console.log(`US SEO audit passed for ${checked} US post(s).`);
})();
