const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'posts');

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
      throw new Error(`SEO audit failed: insufficient keywords for ${file}`);
    }
    if (!post.content || post.content.trim().length < 2500) {
      throw new Error(`SEO audit failed: article is too short for ${file}`);
    }
    if (post.image !== '/generated-image.svg') {
      throw new Error(`SEO audit failed: missing self-hosted image for ${file}`);
    }
  }

  console.log(`US SEO audit passed for ${checked} US post(s).`);
})();
