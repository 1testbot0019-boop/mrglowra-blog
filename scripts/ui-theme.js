const response = require('express/lib/response');
const originalSend = response.send;
response.send = function send(body) {
  if (typeof body === 'string' && /<html[\s>]/i.test(body)) {
    if (!body.includes('/editorial.css')) body = body.replace('</head>', '<link rel="stylesheet" href="/editorial.css"></head>');
    if (!body.includes('/editorial.js')) body = body.replace('</body>', '<script src="/editorial.js" defer></script></body>');
  }
  return originalSend.call(this, body);
};
