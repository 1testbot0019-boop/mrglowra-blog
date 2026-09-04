const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
fs.ensureDirSync(postsDir);

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const topics = [
  'how to clean and maintain bathroom surfaces safely',
  'simple daily habits for a cleaner home',
  'how to choose the right floor cleaner for your home',
  'common toilet cleaning mistakes to avoid',
  'how to keep floors fresh in Indian homes'
];

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function generatePost(topic) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const prompt = `Create an original, genuinely useful 700-900 word blog article for Mr Glowra, an Indian home-cleaning brand. Topic: ${topic}. Write for Indian homeowners. Give practical, safe cleaning advice. Do not invent laboratory results, certifications, government approvals, medical claims, or unsupported statistics. Mention Mr Glowra products naturally only where relevant. Use a clear title, a short description, and article content. Return ONLY valid JSON with keys: title, description, category, content.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'You are a careful SEO content writer. Never fabricate evidence or product claims.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('No article returned by AI');

  const article = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(article.title);
  const filename = path.join(postsDir, `${date}-${slug}.json`);

  await fs.writeJson(filename, { ...article, slug, date }, { spaces: 2 });
  console.log(`Created ${filename}`);
}

(async () => {
  const topic = topics[new Date().getUTCDate() % topics.length];
  await generatePost(topic);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
