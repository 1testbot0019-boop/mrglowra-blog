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
  'how to keep floors fresh in Indian homes',
  'how to remove common kitchen and household stains safely',
  'how often should different areas of an Indian home be cleaned',
  'floor cleaning mistakes that can damage surfaces',
  'how to build a simple weekly home cleaning routine',
  'toilet cleaning routine for a fresher bathroom'
];

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function existingTitles() {
  const files = (await fs.readdir(postsDir)).filter(file => file.endsWith('.json'));
  const titles = [];
  for (const file of files) {
    try { const post = await fs.readJson(path.join(postsDir, file)); if (post.title) titles.push(post.title); } catch {}
  }
  return titles;
}

async function generatePost(topic, titles) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const prompt = `Create one original, genuinely useful 800-1000 word blog article for Mr Glowra, an Indian home-cleaning brand. Topic: ${topic}. Audience: Indian homeowners and families.\n\nSEO requirements: choose a natural search-friendly title; write a compelling 140-160 character description; use the main topic naturally; answer the reader's practical intent; use short sections and clear paragraphs; avoid keyword stuffing.\n\nQuality and safety: give practical, conservative cleaning advice. Never invent laboratory results, certifications, government approvals, medical claims, customer reviews, prices, or unsupported statistics. Never tell readers to mix cleaning chemicals. If discussing acidic toilet cleaners or other chemicals, emphasize following the product label and basic safety precautions. Mention Mr Glowra products naturally only where genuinely relevant and do not make unsupported performance claims.\n\nWriting style: sound like a knowledgeable human writer, not a template. Vary sentence length heavily, use natural transitions, occasional first-person experience where appropriate, and include specific practical examples. Avoid phrases such as “In today's fast-paced digital world”, “In the landscape of”, “Furthermore”, “Moreover”, “In conclusion”, “Delve”, “Tapestry”, “Beacon”, “Testament”, and “It is important to remember/note that”. Where a personal experience, observation, or brand-specific fact would strengthen the article but cannot be safely invented, insert a short bracketed placeholder such as [Add your personal experience here]. Do not invent credentials or personal experiences.\n\nDo not repeat or closely imitate these existing titles: ${titles.join(' | ') || 'none'}.\n\nReturn ONLY valid JSON with exactly these keys: title, description, category, keywords, content. Keywords must be an array of 5-8 concise search phrases. Content must be plain text with useful headings separated by blank lines; do not use Markdown symbols, HTML, or fake citations.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.72,
      messages: [
        { role: 'system', content: 'You are a careful SEO editor for a trustworthy Indian consumer brand. Accuracy, usefulness, and natural human writing are more important than hype.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('No article returned by AI');

  const article = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
  if (!article.title || !article.description || !article.content) throw new Error('Generated article is missing required fields');
  if (titles.some(title => title.toLowerCase().trim() === article.title.toLowerCase().trim())) throw new Error('Generated title duplicates an existing article');

  const date = new Date().toISOString().slice(0, 10);
  let slug = slugify(article.title);
  if (!slug) slug = `mr-glowra-cleaning-guide-${date}`;
  let filename = path.join(postsDir, `${date}-${slug}.json`);
  if (await fs.pathExists(filename)) filename = path.join(postsDir, `${date}-${slug}-${Date.now()}.json`);

  const post = {
    title: String(article.title).trim(),
    description: String(article.description).trim().slice(0, 160),
    category: String(article.category || 'Cleaning Tips').trim(),
    keywords: Array.isArray(article.keywords) ? article.keywords.map(String).map(x => x.trim()).filter(Boolean).slice(0, 8) : [],
    content: String(article.content).trim(),
    slug,
    date,
    image: `/generated-image/${slug}.svg`,
    imageAlt: `${String(article.title).trim()} - practical home cleaning guide`
  };

  await fs.writeJson(filename, post, { spaces: 2 });
  console.log(`Created ${filename}`);
}

(async () => {
  const titles = await existingTitles();
  const topic = topics[(new Date().getUTCDate() - 1) % topics.length];
  await generatePost(topic, titles);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
