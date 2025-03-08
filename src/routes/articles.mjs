import { Router } from "express";
import { Article } from "../mongoose/schemas/article.mjs";
import {validationResult,matchedData, checkSchema} from 'express-validator';
import { createArticleValidationSchema } from "../utils/validationSchemas.mjs";
import mongoose from "mongoose";

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

    console.log("Fetching articles for username:", username);

    const articles = await Article.find({ 
      authorusername: { $regex: new RegExp(`^${username}$`, 'i') } 
    });

    console.log("Articles found:", articles.length);

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
    console.log("Search query received:", query);
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    // Update the search fields to match your schema
    const articles = await Article.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { authorusername: { $regex: query, $options: 'i' } }, // Changed from author to authorusername
        { authordisplayname: { $regex: query, $options: 'i' } }, // Added authordisplayname
        { content: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } } // Added category search
      ]
    });

    console.log(`Found ${articles.length} articles for query "${query}"`);

    // Return empty array instead of 404 for no results
    return res.status(200).json(articles);
  } catch (err) {
    console.error('Error searching for articles:', err);
    return res.status(500).json({ error: 'Error searching for articles.' });
  }
});


router.get('/api/news/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }
    res.json(article);
  } catch (error) {
    console.error('Error fetching article by ID:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});



router.post('/api/news/newpost', checkSchema(createArticleValidationSchema), async (request, response) => {
  // Validate request data
  const result = validationResult(request);
  if (!result.isEmpty()) {
    return response.status(400).json({ errors: result.array() });
  }

  if (!request.user) {
    return response.status(401).json({ message: "Unauthorized" });
  }

  console.log("Incoming request body:", request.body);

  // Extract validated data
  const data = matchedData(request);

  // Fix: Assign username properly
  data.authorusername = request.user.username; 
  data.authordisplayname = request.user.displayname; // Ensure display name is stored too

  console.log("Processed article data:", data);

  try {
    const newArticle = new Article(data);
    const savedArticle = await newArticle.save();

    return response.status(201).json({
      message: "Article created successfully",
      articleId: savedArticle._id
    });
  } catch (error) {
    console.error("Error saving article:", error);
    return response.status(500).json({ message: "Something went wrong. Please try again." });
  }
});



export default router;
