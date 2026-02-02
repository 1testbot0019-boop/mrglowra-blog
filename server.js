const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

const postsDir = path.join(__dirname, 'posts');

app.get('/posts', async (req, res) => {
  try {
    const files = await fs.readdir(postsDir);
    const posts = [];

    for (const file of files) {
      const data = await fs.readJson(path.join(postsDir, file));
      posts.push(data);
    }

    // Sort posts by date descending
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(posts);
  } catch (err) {
    res.status(500).send({ error: 'Failed to read posts' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Blog API running on port ${PORT}`));
