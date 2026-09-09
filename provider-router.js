const originalFetch = global.fetch;

const PROVIDERS = [
  {
    name: 'Claude',
    key: 'ANTHROPIC_API_KEY',
    modelEnv: 'CLAUDE_MODEL',
    defaultModel: 'claude-sonnet-5',
  },
  {
    name: 'DeepSeek',
    key: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-v4-flash',
  },
  {
    name: 'Gemini',
    key: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-3.8-flash',
  },
];

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function callClaude(input) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { skipped: true };

  const body = JSON.parse(input.body || '{}');
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = messages.filter(m => m.role === 'system').map(m => String(m.content || '')).join('\n');
  const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
  }));

  const r = await originalFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
      max_tokens: 12000,
      temperature: body.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages: userMessages.length ? userMessages : [{ role: 'user', content: 'Continue.' }],
    }),
  });

  if (!r.ok) return { ok: false, status: r.status, text: await r.text() };
  const d = await r.json();
  const text = (d.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim();
  if (!text) return { ok: false, status: 502, text: 'Claude returned no text content' };
  return { ok: true, text };
}

async function callOpenAICompatible(baseUrl, key, model, input) {
  if (!key) return { skipped: true };
  const body = JSON.parse(input.body || '{}');
  const payload = {
    ...body,
    model,
  };
  delete payload.stream;

  const r = await originalFetch(baseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return { ok: false, status: r.status, text: await r.text() };
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content?.trim();
  if (!text) return { ok: false, status: 502, text: 'Provider returned no text content' };
  return { ok: true, text };
}

async function routedFetch(input, init) {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.includes('generativelanguage.googleapis.com/v1beta/openai/chat/completions')) {
    return originalFetch(input, init);
  }

  const request = new Request(input, init);
  const body = await request.text();
  const routedInput = { body };

  console.log('AI provider order: Claude -> DeepSeek -> Gemini');

  const attempts = [
    async () => callClaude(routedInput),
    async () => callOpenAICompatible(
      'https://api.deepseek.com/chat/completions',
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      routedInput
    ),
    async () => callOpenAICompatible(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      routedInput
    ),
  ];

  let lastError = 'No AI provider is configured';
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result.skipped) continue;
      if (result.ok) {
        console.log('AI provider succeeded');
        return jsonResponse(200, {
          choices: [{ message: { role: 'assistant', content: result.text } }],
        });
      }
      lastError = `${result.status}: ${result.text}`;
      console.warn(`AI provider failed; trying next provider: ${lastError}`);
    } catch (e) {
      lastError = e?.stack || String(e);
      console.warn(`AI provider exception; trying next provider: ${lastError}`);
    }
  }

  return jsonResponse(503, {
    error: { message: `All AI providers failed. Last error: ${lastError}` },
  });
}

global.fetch = routedFetch;
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'provider-router';
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

require('./generate.js');
