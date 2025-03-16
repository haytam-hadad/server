import { Router } from "express";
import { Article } from "../mongoose/schemas/article.mjs";
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { createArticleValidationSchema } from "../utils/validationSchemas.mjs";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.mjs";

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

router.post('/api/news/newpost', requireAuth, checkSchema(createArticleValidationSchema), async (request, response) => {

  const result = validationResult(request);
  if (!result.isEmpty()) {
    return response.status(400).json({ errors: result.array() });
  }

  try {
    
    const validatedData = matchedData(request);
    console.log("Validated data:", validatedData);
    
    // Create article data object with validated data
    const articleData = {
      ...validatedData,
      authorusername: request.user.username,
      authordisplayname: request.user.displayname,
      status: validatedData.status || "on-going"
    };

    // Ensure sources is an array
    if (!articleData.sources) {
      articleData.sources = [];
    }

    console.log("Processed article data:", articleData);

    // Create and save the article
    const newArticle = new Article(articleData);
    const savedArticle = await newArticle.save();

    return response.status(201).json({
      message: "Article created successfully",
      articleId: savedArticle._id
    });
  } catch (error) {
    console.error("Error saving article:", error);
    return response.status(500).json({ 
      message: "Something went wrong. Please try again.",
      error: error.message
    });
  }
});

router.post('/api/news/:articleId/upvote', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const username = req.user.username;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }
    
    const alreadyUpvoted = article.userUpvote.includes(username);
    const alreadyDownvoted = article.userDownvote.includes(username);

    if (alreadyUpvoted) {
      // Remove the upvote
      article.userUpvote = article.userUpvote.filter(user => user !== username);
      article.upvote = Math.max(0, article.upvote - 1);
    } else {
      // If already disliked, remove the downvote first
      if (alreadyDownvoted) {
        article.userDownvote = article.userDownvote.filter(user => user !== username);
        article.downvote = Math.max(0, article.downvote - 1);
      }
      // Add the upvote
      article.userUpvote.push(username);
      article.upvote += 1;
    }

    await article.save();
    
    return res.status(200).json({ 
      message: alreadyUpvoted ? 'Like removed' : 'Article liked',
      upvote: article.upvote,
      downvote: article.downvote,
      userLiked: !alreadyUpvoted,
      userDisliked: false
    });
  } catch (error) {
    console.error('Error liking article:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});



router.post('/api/news/:articleId/downvote', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const username = req.user.username;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    const alreadyDisliked = article.userDownvote.includes(username);
    const alreadyUpvoted = article.userUpvote.includes(username);

    if (alreadyDisliked) {
      article.userDownvote = article.userDownvote.filter(user => user !== username);
      article.downvote = Math.max(0, article.downvote - 1);
    } else {
      if (alreadyUpvoted) {
        article.userUpvote = article.userUpvote.filter(user => user !== username);
        article.upvote = Math.max(0, article.upvote - 1);
      }
      
      article.userDownvote.push(username);
      article.downvote += 1;
    }

    await article.save();
    
    return res.status(200).json({ 
      message: alreadyDisliked ? 'Dislike removed' : 'Article disliked',
      upvote: article.upvote,
      downvote: article.downvote,
      userLiked: false,
      userDisliked: !alreadyDisliked
    });
  } catch (error) {
    console.error('Error disliking article:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});


router.get('/api/news/:articleId/like-status', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const username = req.user.username;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    return res.status(200).json({
      upvote: article.upvote,
      downvote: article.downvote
    });
  } catch (error) {
    console.error('Error getting like status:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});


export default router;

