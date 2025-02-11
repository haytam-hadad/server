import { Router } from "express";
import { Article } from "../mongoose/schemas/article.mjs"; // Ensure the path to Article is correct

const router = Router();

//Fetch latest news (sorted by publishedAt)
router.get('/api/news/latest', async (req, res) => {
  try {
    const latestNews = await Article.find().sort({ publishedAt: -1 }).limit(10);
    if (latestNews.length === 0) {
      return res.status(404).json({ message: 'No latest news available.' });
    }
    res.json(latestNews);
  } catch (err) {
    console.error('Error fetching latest news:', err);
    res.status(500).json({ error: 'Error fetching latest news.' });
  }
});

// Fetch articles by category
router.get('/api/news/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const articles = await Article.find({ category });

    if (articles.length === 0) {
      return res.status(404).json({ message: `No articles found for category: ${category}` });
    }

    res.json(articles);
  } catch (err) {
    console.error('Error fetching articles by category:', err);
    res.status(500).json({ error: 'Error fetching articles by category.' });
  }
});

//Search articles by title or author
router.get('/api/news/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const articles = await Article.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } }
      ]
    });

    if (articles.length === 0) {
      return res.status(404).json({ message: `No articles found for query: "${query}".` });
    }

    res.json(articles);
  } catch (err) {
    console.error('Error searching for articles:', err);
    res.status(500).json({ error: 'Error searching for articles.' });
  }
});


//fetch article by Id
router.get('/api/news/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Something went Wrong' });
  }
});

export default router;
