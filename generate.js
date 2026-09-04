const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
fs.ensureDirSync(postsDir);

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const usTopics = [
  'How to Clean Tile Floors Without Leaving Streaks',
  'Best Way to Clean Porcelain Tile Floors',
  'How to Clean Ceramic Tile Floors',
  'How to Clean Vinyl Floors',
  'How to Clean Laminate Floors',
  'How Often Should You Mop Your Floors',
  'Why Does My Floor Look Dirty After Mopping',
  'How to Remove Sticky Residue From Floors',
  'How to Clean Floors Without Damaging Them',
  'Floor Cleaning Mistakes That Can Damage Your Floors',
  'How to Clean a Toilet Properly',
  'How to Remove Hard Water Stains From a Toilet',
  'How to Remove Toilet Bowl Rings',
  'How to Clean Under the Toilet Rim',
  'How Often Should You Clean Your Toilet',
  'How to Keep a Toilet Clean Longer',
  'Bathroom Cleaning Checklist',
  'How to Remove Soap Scum From Bathroom Floors',
  'How to Clean a Bathroom Floor',
  'Common Toilet Cleaning Mistakes',
  'Weekly House Cleaning Checklist',
  'Daily Cleaning Routine for a Clean Home',
  'How Often Should You Clean Your House',
  'Deep Cleaning Checklist for Your Home',
  'Things People Forget to Clean at Home',
  'How to Clean Your Home Faster',
  'Room-by-Room Cleaning Checklist',
  'Simple Weekend Cleaning Routine',
  'How to Keep Your House Clean With Less Effort',
  'Cleaning Habits That Make Your Home Easier to Maintain',
  'How to Remove Hard Water Stains',
  'How to Remove Soap Scum',
  'How to Remove Mineral Deposits From Bathroom Surfaces',
  'How to Remove Floor Stains',
  'How to Get Rid of Bathroom Odor',
  'Why Does My Bathroom Smell After Cleaning',
  'How to Prevent Toilet Stains',
  'How to Prevent Floor Streaks',
  'How to Clean a Dirty Bathroom',
  'How to Make Your Bathroom Easier to Clean'
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

  const prompt = `Create one original, genuinely useful 900-1200 word blog article for Mr Glowra, a home-cleaning brand. Topic: ${topic}. Audience: United States homeowners and renters. Market: US. Write in natural US English.

SEO requirements: create a natural search-friendly title; write a compelling 140-160 character meta description; use the main search intent naturally; answer the query directly; use descriptive H2-style headings; include practical steps, common mistakes, safety notes, and a short FAQ when useful; avoid keyword stuffing. Use US terminology such as bathroom, toilet, mop, flooring, hard-water stains, and household cleaning where appropriate.

US localization: Do not write this as an Indian article. Do not use Indian-specific references, rupees, Indian household assumptions, or claims about US availability unless verified. Do not claim Mr Glowra is sold in the US. Keep the article useful even if the reader never buys anything.

Trust and safety: never invent laboratory results, certifications, government approvals, medical claims, customer reviews, prices, statistics, or product availability. Never tell readers to mix cleaning chemicals. If discussing acidic toilet cleaners, bleach, ammonia, disinfectants, or other chemicals, clearly warn against mixing products and advise following the product label and basic ventilation/PPE precautions. Do not make unsupported claims about killing germs. Mention Mr Glowra only when genuinely relevant and naturally, without turning the article into an advertisement.

Writing style: sound like a knowledgeable human writer, not a template. Vary sentence length, use practical examples, and avoid repetitive introductions. Avoid phrases such as “In today's fast-paced digital world”, “In the landscape of”, “Furthermore”, “Moreover”, “In conclusion”, “Delve”, “Tapestry”, “Beacon”, “Testament”, and “It is important to remember/note that”. Where a personal experience or brand-specific fact would strengthen the article but cannot safely be invented, use a short bracketed placeholder such as [Add your personal experience here]. Do not invent credentials or experiences.

Do not repeat or closely imitate these existing titles: ${titles.join(' | ') || 'none'}.

Return ONLY valid JSON with exactly these keys: title, description, category, keywords, content. Keywords must be an array of 5-8 concise search phrases. Content must be plain text with useful headings separated by blank lines; do not use Markdown symbols, HTML, fake citations, or invented sources.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.72,
      messages: [
        { role: 'system', content: 'You are a careful US-focused SEO editor for a trustworthy home-cleaning brand. Accuracy, usefulness, safety, and natural human writing are more important than hype.' },
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
  if (!slug) slug = `mr-glowra-us-cleaning-guide-${date}`;
  let filename = path.join(postsDir, `${date}-${slug}.json`);
  if (await fs.pathExists(filename)) filename = path.join(postsDir, `${date}-${slug}-${Date.now()}.json`);

  const post = {
    title: String(article.title).trim(),
    description: String(article.description).trim().slice(0, 160),
    category: String(article.category || 'US Cleaning Guides').trim(),
    keywords: Array.isArray(article.keywords) ? article.keywords.map(String).map(x => x.trim()).filter(Boolean).slice(0, 8) : [],
    content: String(article.content).trim(),
    slug,
    date,
    market: 'US',
    image: '/generated-image.svg',
    imageAlt: `${String(article.title).trim()} - US home cleaning guide`
  };

  await fs.writeJson(filename, post, { spaces: 2 });
  console.log(`Created ${filename}`);
}

(async () => {
  const titles = await existingTitles();
  const normalizedExisting = new Set(titles.map(title => slugify(title)));
  const topic = usTopics.find(candidate => !normalizedExisting.has(slugify(candidate)));
  if (!topic) throw new Error('All planned US SEO topics have already been published. Add new topics before generating another article.');
  console.log(`Selected unused US topic: ${topic}`);
  await generatePost(topic, titles);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
