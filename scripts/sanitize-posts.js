const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'posts');
let changed = 0;

for (const name of fs.readdirSync(postsDir).filter(f => f.endsWith('.json'))) {
  const file = path.join(postsDir, name);
  try {
    const post = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!post.content) continue;
    const before = post.content;
    post.content = String(post.content)
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/\r/g, '')
      .trim();
    if (post.content !== before) {
      fs.writeFileSync(file, JSON.stringify(post, null, 2) + '\n');
      changed++;
    }
  } catch (err) {
    console.warn(`Skipped ${name}: ${err.message}`);
  }
}

console.log(`Sanitized ${changed} blog posts`);
