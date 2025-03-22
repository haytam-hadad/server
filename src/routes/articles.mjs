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
    console.log(articles);

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
    
    const article = await Article.findByIdAndUpdate(
      articleId,
      { $inc: { views: 1 } },
      { new: true }
    )

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
      views: article.views,
      upvote: article.upvote,
      downvote: article.downvote
    });
  } catch (error) {
    console.error('Error getting like status:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/api/news/:articleId/comments', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    const newComment = {
      text,
      author: req.user._id, 
      createdAt: new Date(),
      updatedAt: new Date()
    };

    article.comments.push(newComment);
    await article.save();

    const populatedArticle = await Article.findById(articleId)
      .populate({
        path: 'comments.author',
        select: 'username displayname profilePicture'
      });
    
    const addedComment = populatedArticle.comments[populatedArticle.comments.length - 1];

    return res.status(201).json({
      message: 'Comment added successfully',
      comment: addedComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.get('/api/news/:articleId/comments', async (req, res) => {
  try {
    const { articleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId)
      .select('comments')
      .populate({
        path: 'comments.author',
        select: 'username displayname profilePicture'
      });

    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    const articlecomments = article.comments;
    return res.status(200).json({
      comments: articlecomments,
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

//for future use :

/* router.delete('/api/news/:articleId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { articleId, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(articleId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid ID format.' });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    // Find the comment
    const comment = article.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    // Check if user is authorized to delete (either comment author or admin)
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment.' });
    }
    article.comments.pull({ _id: commentId });
    await article.save();

    return res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}); */

export default router;

