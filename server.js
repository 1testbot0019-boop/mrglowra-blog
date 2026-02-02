const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

const postsDir = path.join(__dirname, 'posts');

// JSON API route
app.get('/posts', async (req, res) => {
  try {
    const files = await fs.readdir(postsDir);
    const posts = [];

    for (const file of files) {
      const data = await fs.readJson(path.join(postsDir, file));
      posts.push(data);
    }

    // Sort by date descending
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(posts);
  } catch (err) {
    res.status(500).send({ error: 'Failed to read posts' });
  }
});

// Root route shows latest 5 posts in simple HTML
app.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(postsDir);
    const posts = [];

    for (const file of files) {
      const data = await fs.readJson(path.join(postsDir, file));
      posts.push(data);
    }

    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const latestPosts = posts.slice(0, 5); // show only 5 latest

    let html = `
      <html>
      <head>
        <title>Mr Glowra Blog</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 20px auto; padding: 0 15px; }
          h2 { color: #007bff; }
          p { font-size: 16px; line-height: 1.5; }
          .post { border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <h1>Mr Glowra Blog - Latest Posts</h1>
    `;

    latestPosts.forEach(post => {
      html += `
        <div class="post">
          <h2>${post.title}</h2>
          <p>${post.content}</p>
          <small>${post.date}</small>
        </div>
      `;
    });

    html += `</body></html>`;
    res.send(html);

  } catch (err) {
    res.status(500).send('Failed to load posts.');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Blog server running on port ${PORT}`));
