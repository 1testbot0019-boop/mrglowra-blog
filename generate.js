require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const postsDir = path.join(__dirname, 'posts');
fs.ensureDirSync(postsDir);

// OpenAI setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function generatePost(index) {
  const prompt = `Write a short, unique blog post about toilet cleaning tips using Mr Glowra toilet cleaner. Keep it engaging and helpful.`;

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    max_tokens: 300
  });

  const content = response.data.choices[0].text.trim();
  const now = new Date();
  const title = `Mr Glowra Toilet Cleaner Tip #${index} - ${now.toDateString()}`;
  const date = now.toISOString().split('T')[0];
  const filename = path.join(postsDir, `post-${Date.now()}-${index}.json`);

  fs.writeJsonSync(filename, { title, content, date }, { spaces: 2 });
}

// Generate 5 posts
(async () => {
  for (let i = 1; i <= 5; i++) {
    await generatePost(i);
  }
  console.log('5 AI-generated posts created!');
})();
