const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'posts');
const image = '/generated-image.svg';

(async () => {
  const files = (await fs.readdir(postsDir)).filter(file => file.endsWith('.json'));
  let changed = 0;

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    try {
      const post = await fs.readJson(filePath);
      if (!post.title || post.image) continue;
      post.image = image;
      post.imageAlt = `${post.title} - practical home cleaning guide`;
      await fs.writeJson(filePath, post, { spaces: 2 });
      changed += 1;
      console.log(`Added image to ${file}`);
    } catch (error) {
      console.warn(`Skipping ${file}: ${error.message}`);
    }
  }

  console.log(`Backfill complete. Updated ${changed} post(s).`);
})();
