const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');

// Ensure posts folder exists
fs.ensureDirSync(postsDir);

function generatePost(index) {
  const now = new Date();
  const title = `Mr Glowra Toilet Cleaner Tip #${index} - ${now.toDateString()}`;
  const content = `This is an automatically generated blog post number ${index}. Learn to clean toilets efficiently using Mr Glowra toilet cleaner. Follow our daily tips for sparkling clean toilets.`;
  const date = now.toISOString().split('T')[0];
  const filename = path.join(postsDir, `post-${Date.now()}-${index}.json`);

  fs.writeJsonSync(filename, { title, content, date }, { spaces: 2 });
}

// Generate 5 posts
for (let i = 1; i <= 5; i++) generatePost(i);

console.log('5 new posts generated!');
