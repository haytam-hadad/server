import { Router } from "express";
import { Article } from "../mongoose/schemas/article.mjs";
import {validationResult,matchedData, checkSchema} from 'express-validator';
import { createArticleValidationSchema } from "../utils/validationSchemas.mjs";

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

router.get('/api/articles/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const articles = await Article.find({ author: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (articles.length === 0) {
      return res.status(404).json({ message: `No articles found for username: ${username}` });
    }

    res.status(200).json(articles);
  } catch (error) {
    console.error("Error fetching articles by username:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});


// 🔍 Search articles by title, author, or content
router.get('/api/news/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const articles = await Article.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } } // Added content search
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


router.post('/api/news/newpost', checkSchema(createArticleValidationSchema), async (request, response) => {
  // First, validate the incoming request data
  const result = validationResult(request);
  if (!result.isEmpty()) {
    return response.status(400).send(result.array());
  }

  if (request.user) {
    console.log("Incoming request body:", request.body);

    // Extract the validated data
    const data = matchedData(request);
    data.author = request.user._id; 

    console.log(data); 

    
    const newArticle = new Article(data);
    try {
      const savedArticle = await newArticle.save();
      return response.status(201).send({
        message: "Article created successfully",
        articleId: savedArticle._id
      });
    } catch (error) {
      console.log(error);
      return response.status(500).send({ message: "Something went wrong. Please try again." });
    }
  } else {
    return response.status(401).send("Unauthorized");
  }
});


export default router;
