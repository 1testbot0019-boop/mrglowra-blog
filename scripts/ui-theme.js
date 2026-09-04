const response = require('express/lib/response');
const originalSend = response.send;
response.send = function send(body) {
  if (typeof body === 'string' && /<html[\s>]/i.test(body)) {
    if (!body.includes('/editorial.css')) body = body.replace('</head>', '<link rel="stylesheet" href="/editorial.css"></head>');
    if (!body.includes('/editorial.js')) body = body.replace('</body>', '<script src="/editorial.js" defer></script></body>');
    body = body.replace(/<img\b(?![^>]*referrerpolicy=)/gi, '<img referrerpolicy="no-referrer"');
    body = body.replace(/Mr Glowra Journal/g, 'Clean Living Journal');
    body = body.replace(/Mr Glowra Pvt Ltd/g, 'Clean Living Journal');
    body = body.replace(/<a href="https:\/\/www\.mrglowra\.com">Mr Glowra<\/a>/gi, '');
    body = body.replace(/<a href="https:\/\/www\.mrglowra\.com">Power That Shines!<\/a>/gi, '');
    body = body.replace(/<meta property="og:site_name" content="Mr Glowra">/gi, '<meta property="og:site_name" content="Clean Living Journal">');
  }
  return originalSend.call(this, body);
};
