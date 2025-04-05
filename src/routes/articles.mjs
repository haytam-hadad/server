import { Router } from "express";
import { Article } from "../mongoose/schemas/article.mjs";
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { createArticleValidationSchema } from "../utils/validationSchemas.mjs";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.mjs";
import { calculateAndUpdateRating } from "../utils/helpers.mjs";

const router = Router();

//Fetch latest news (sorted by publishedAt) - MODIFIED to only show approved articles
router.get('/api/news/latest', async (req, res) => {
  try {
    const latestNews = await Article.find({ 
      deleted: { $ne: true },
      status: 'approved' // Only show approved articles
    })
      .populate('authorId', 'username displayname profilePicture') 
      .populate('authorIdGoogle', 'username displayname profilePicture') 
      .sort({ publishedAt: -1 })
      .limit(10);
    if (latestNews.length === 0) {
      return res.status(404).json({ message: 'No latest news available.' });
    }
    
    // Clean up the populated data:
    // Remove the unpopulated field from each article
    latestNews.forEach((article) => {
      if (article.authorIdGoogle) {
        article.authorId = null; 
      } else if (article.authorId) {
        article.authorIdGoogle = null;
      }
    });

    // Update ratings for all articles
    await Promise.all(latestNews.map(async (article) => {
      // Only update if rating is old or missing
      if (!article.lastRatingUpdate || 
          new Date() - new Date(article.lastRatingUpdate) > 3600000) { // 1 hour
        await calculateAndUpdateRating(article);
      }
    }));
    res.json(latestNews);
  } catch (err) {
    console.error('Error fetching latest news:', err);
    res.status(500).json({ error: 'Error fetching latest news.' });
  }
});

// This route specifically needs to show ongoing articles, so we keep it as is
router.get('/api/articles/ongoing', requireAuth, async (req, res) => {
  try {
    // Get the authenticated user's ID from the session
    const userId = req.user._id;
    const isGoogleUser = req.user.isGoogleUser;
    // Find all articles where the author is the current user and status is "ongoing"
    let ongoingArticles;
    if(isGoogleUser){
      ongoingArticles = await Article.find({
        authorIdGoogle: userId,
        status: 'on-going' 
      }).sort({ updatedAt: -1 }); 
    }else{
      ongoingArticles = await Article.find({
        authorId: userId,
        status: 'on-going' 
      }).sort({ updatedAt: -1 }); 
    }
    
    return res.status(200).json({
      success: true,
      count: ongoingArticles.length,
      data: ongoingArticles
    });
  } catch (error) {
    console.error('Error fetching ongoing articles:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching ongoing articles',
      error: error.message
    });
  }
});

// Fetch articles by category - MODIFIED to only show approved articles
router.get('/api/news/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const articles = await Article.find({
      category,
      deleted: { $ne: true },
      status: 'approved' // Only show approved articles
    })
    .populate('authorId', 'username displayname profilePicture')
    .populate('authorIdGoogle', 'username displayname profilePicture')
    .sort({ publishedAt: -1 });

    if (articles.length === 0) {
      return res.status(404).json({ message: `No articles found for category: ${category}` });
    }

    // Clean up the populated data:
    // Remove the unpopulated field from each article
    articles.forEach((article) => {
      if (article.authorIdGoogle) {
        article.authorId = null; 
      } else if (article.authorId) {
        article.authorIdGoogle = null;
      }
    });

    // Update ratings for all articles
    await Promise.all(articles.map(async (article) => {
      // Only update if rating is old or missing
      if (!article.lastRatingUpdate || 
          new Date() - new Date(article.lastRatingUpdate) > 3600000) { // 1 hour
        await calculateAndUpdateRating(article);
      }
    }));

    // Return the articles with populated user info
    res.json(articles);
  } catch (err) {
    console.error('Error fetching articles by category:', err);
    res.status(500).json({ error: 'Error fetching articles by category.' });
  }
});

//get top categories - MODIFIED to only consider approved articles
router.get('/api/news/topcategories/', async (req, res) => {
  try {
    
    const topCategories = await Article.aggregate([
      { $match: { 
          deleted: { $ne: true },
          status: 'approved' // Only consider approved articles
        } 
      },
      { $group: { 
          _id: "$category", 
          totalArticles: { $sum: 1 } // Count how many articles belong to each category
      }},
      { $sort: { totalArticles: -1 } }, // Sort by most articles first
      { $limit: 5 } // Get the top 5 categories (change as needed)
    ]);    

    if (topCategories.length === 0) {
      return res.status(404).json({ message: ` No categories found `});
    }
    res.json(topCategories);
  } catch (err) {
    console.error('Error fetching Top categories:', err);
    res.status(500).json({ error: 'Error fetching Top categories.' });
  }
});

// Get articles by username - MODIFIED to only show approved articles
router.get('/api/articles/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    console.log("Fetching articles for username:", username);

    const articles = await Article.find({ 
      authorusername: { $regex: new RegExp(`^${username}$`, 'i') }, 
      deleted: { $ne: true },
      status: 'approved' // Only show approved articles
    })
    .populate('authorId', 'username displayname profilePicture')
    .populate('authorIdGoogle', 'username displayname profilePicture')
    .sort({ publishedAt: -1 });

    console.log("Articles found:", articles.length);

    if (articles.length === 0) {
      return res.status(404).json({ message: `No articles found for username: ${username}` });
    }

    // Clean up the populated data:
    // Remove the unpopulated field from each article
    articles.forEach((article) => {
      if (article.authorIdGoogle) {
        article.authorId = null; 
      } else if (article.authorId) {
        article.authorIdGoogle = null;
      }
    });

    // Update ratings for all articles
    await Promise.all(articles.map(async (article) => {
      // Only update if rating is old or missing
      if (!article.lastRatingUpdate || 
          new Date() - new Date(article.lastRatingUpdate) > 3600000) { // 1 hour
        await calculateAndUpdateRating(article);
      }
    }));

    // Return the articles with populated user info
    res.status(200).json(articles);
  } catch (error) {
    console.error("Error fetching articles by username:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Get upvoted articles - MODIFIED to only show approved articles
router.get('/api/articles/upvoted/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    console.log("Fetching articles for username:", username);

    const articles = await Article.find({ 
      userUpvote: username,
      deleted: { $ne: true },
      status: 'approved' // Only show approved articles
    })
    .populate('authorId', 'username displayname profilePicture')
    .populate('authorIdGoogle', 'username displayname profilePicture')
    .sort({ publishedAt: -1 });

    console.log("Articles found:", articles.length);

    if (articles.length === 0) {
      return res.status(404).json({ message: `No articles found for username: ${username}` });
    }

    // Clean up the populated data:
    // Remove the unpopulated field from each article
    articles.forEach((article) => {
      if (article.authorIdGoogle) {
        article.authorId = null; 
      } else if (article.authorId) {
        article.authorIdGoogle = null;
      }
    });

    //Filter articles needing a rating update before executing DB updates
    const articlesNeedingUpdate = articles.filter(article => 
      !article.lastRatingUpdate || 
      new Date() - new Date(article.lastRatingUpdate) > 3600000 // Older than 1 hour
    );

    if (articlesNeedingUpdate.length > 0) {
      console.log(`Updating ratings for ${articlesNeedingUpdate.length} articles`);
      await Promise.all(articlesNeedingUpdate.map(article => calculateAndUpdateRating(article)));
    }

    res.status(200).json(articles);
  } catch (error) {
    console.error("Error fetching articles by username:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Search articles - MODIFIED to only show approved articles
router.get('/api/news/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    console.log("Search query received:", query);
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    // Update the search fields to match your schema
    const articles = await Article.find({
      $and: [
        { 
          deleted: { $ne: true },
          status: 'approved' // Only show approved articles
        },
        {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { authorusername: { $regex: query, $options: 'i' } },
            { authordisplayname: { $regex: query, $options: 'i' } },
            { content: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .populate('authorId', 'username displayname profilePicture')
    .populate('authorIdGoogle', 'username displayname profilePicture')
    .sort({ publishedAt: -1 });

    console.log(`Found ${articles.length} articles for query "${query}"`);

    // Clean up the populated data:
    // Remove the unpopulated field from each article
    articles.forEach((article) => {
      if (article.authorIdGoogle) {
        article.authorId = null; 
      } else if (article.authorId) {
        article.authorIdGoogle = null;
      }
    });

    // Update ratings for all articles
    await Promise.all(articles.map(async (article) => {
      // Only update if rating is old or missing
      if (!article.lastRatingUpdate || 
          new Date() - new Date(article.lastRatingUpdate) > 3600000) { // 1 hour
        await calculateAndUpdateRating(article);
      }
    }));

    // Return empty array instead of 404 for no results
    return res.status(200).json(articles);
  } catch (err) {
    console.error('Error searching for articles:', err);
    return res.status(500).json({ error: 'Error searching for articles.' });
  }
});

// Trending articles - Already has status: 'approved' filter, so no change needed
router.get('/api/news/trending', async (req, res) => {
  try {
    const trendingArticles = await Article.find({
      views: { $gt: 99 }, 
      deleted: { $ne: true },
      status: 'approved'     
    })
    .sort({ views: -1 })       
    .limit(15)
    .populate('authorId', 'username displayname profilePicture')
    .populate('authorIdGoogle', 'username displayname profilePicture');

    if (!trendingArticles.length) {
      return res.status(404).json({ message: "No trending articles found." });
    }

    // Clean up the populated data:
    // Remove the unpopulated field from each article
    trendingArticles.forEach((article) => {
      if (article.authorIdGoogle) {
        article.authorId = null; 
      } else if (article.authorId) {
        article.authorIdGoogle = null;
      }
    });

    // Update ratings for all trending articles
    // Always update ratings for trending articles since they're important
    await Promise.all(trendingArticles.map(article => calculateAndUpdateRating(article)));

    res.status(200).json({
      articles: trendingArticles,
    });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong while fetching trending articles.' });
  }
});

// Get article by ID - MODIFIED to only show approved articles
router.get('/api/news/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }
    
    const article = await Article.findOneAndUpdate(
      { 
        _id: articleId, 
        deleted: { $ne: true },
        status: 'approved' // Only show approved articles
      },
      { $inc: { views: 1 } },                     // Increment views
      { new: true }                               // Return the updated document
    )
    .populate('authorId', 'username displayname profilePicture')
    .populate('authorIdGoogle', 'username displayname profilePicture');

    if (!article) {
      return res.status(404).json({ message: 'Article not found, has been deleted, or is not approved.' });
    }
    
    // Clean up the populated data:
    // Remove the unpopulated field from each article
    if (article.authorIdGoogle) {
      article.authorId = null; 
    } else if (article.authorId) {
      article.authorIdGoogle = null;
    }
    
    // Always update rating when viewing a single article
    await calculateAndUpdateRating(article);
    
    // Return the article with populated user info
    res.json(article);
  } catch (error) {
    console.error('Error fetching article by ID:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get article rating - MODIFIED to only allow for approved articles
router.get("/api/post/rating/:articleId", async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.articleId,
      status: 'approved' // Only allow for approved articles
    });
    
    if (!article) return res.status(404).json({ message: "Article not found or not approved." });

    // Calculate and update the rating
    const ratingPercentage = await calculateAndUpdateRating(article);

    res.json({
      upvote: article.upvote,
      downvote: article.downvote,
      views: article.views,
      sources: article.sources.length,
      rating: ratingPercentage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching rating." });
  }
});

// Get subscribed articles - MODIFIED to only show approved articles
router.get('/api/post/subscribed', requireAuth, async (req, res) => {
  try {
    // Check if user has subscriptions
    if (!req.user || !req.user.subscriptions || req.user.subscriptions.length === 0) {
      return res.status(200).json({ articles: [], message: "You have no subscriptions." });
    }

    // Extract user IDs from subscriptions
    const subscribedUserIds = req.user.subscriptions.map(sub => sub.userId);
    
    // Find articles from subscribed users
    // Use both authorId and authorusername to ensure compatibility
    const articles = await Article.find({
      authorId: { $in: subscribedUserIds },
      deleted: { $ne: true },
      status: 'approved' // Only show approved articles
    })
    .populate('authorId', 'username displayname profilePicture')
    .populate('authorIdGoogle', 'username displayname profilePicture')
    .sort({ publishedAt: -1 });    

    // Clean up the populated data:
    // Remove the unpopulated field from each article
    articles.forEach((article) => {
      if (article.authorIdGoogle) {
        article.authorId = null; 
      } else if (article.authorId) {
        article.authorIdGoogle = null;
      }
    });

    // Update ratings for all articles
    await Promise.all(articles.map(async (article) => {
      // Only update if rating is old or missing
      if (!article.lastRatingUpdate || 
          new Date() - new Date(article.lastRatingUpdate) > 3600000) { // 1 hour
        await calculateAndUpdateRating(article);
      }
    }));

    res.status(200).json({ articles });
  } catch (error) {
    console.error('Error fetching subscribed articles:', error);
    res.status(500).json({ error: 'Something went wrong while fetching articles.' });
  }
});

// Delete article - No change needed as this is an action on a specific article
router.delete('/api/news/:articleId', requireAuth, async (req, res)=>{
  const { articleId } = req.params;
  try {
    const article = await Article.findById(articleId);
    if(!article){
      return res.status(404).json({ message: 'Article not found.'});
    }
    if(article.authorusername !== req.user.username){
      return res.status(403).json({ message: 'Not authorized to delete this article.' });
    }else{
      await Article.updateOne(
        { _id: articleId },
        { $set: { deleted: true } }
      );
      return res.status(200).json({ message: 'Article deleted successfully.'});
    }
  }catch(error){
    console.error('Error deleting article:', error);
    return res.status(500).json({ error: 'Something went wrong.'});
  }
});

// Create new article - No change needed as this creates a new article
router.post('/api/news/newpost', requireAuth, checkSchema(createArticleValidationSchema), async (request, response) => {
  const result = validationResult(request);
  if (!result.isEmpty()) {
    return response.status(400).json({ errors: result.array() });
  }

  try {
    const validatedData = matchedData(request);
    console.log("Validated data:", validatedData);
    
    // Get the profile picture based on user type (regular vs Google)
    const profilePicture = request.user.profilePicture;
    
    // Create article data object with validated data
    const articleData = {
      ...validatedData,
      status: validatedData.status || "on-going",
      rating: 0, 
      lastRatingUpdate: new Date(),
      authorusername: request.user.username, 
      sources: validatedData.sources || [],
    };

    if (request.user.isGoogleUser) {
      articleData.authorIdGoogle = request.user._id;
    } else {
      articleData.authorId = request.user._id;
    }

    console.log("Processed article data:", articleData);

    // Create and save the article
    const newArticle = new Article(articleData);
    const savedArticle = await newArticle.save();

    // Calculate initial rating
    await calculateAndUpdateRating(savedArticle);

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

// Upvote article - No change needed as this is an action on a specific article
router.post('/api/news/:articleId/upvote', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const username = req.user.username;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findOne({ _id: articleId, deleted: { $ne: true } });
    if (!article) {
      return res.status(404).json({ message: 'Article not found or has been deleted.' });
    }

    const alreadyUpvoted = article.userUpvote.includes(username);
    const alreadyDownvoted = article.userDownvote.includes(username);

    const update = {};

    if (alreadyUpvoted) {
      // Remove upvote
      update.$pull = { userUpvote: username };
      update.$inc = { upvote: -1 };
    } else {
      // If downvoted, remove the downvote
      if (alreadyDownvoted) {
        update.$pull = { ...update.$pull, userDownvote: username };
        update.$inc = { ...update.$inc, downvote: -1 };
      }
      // Add the upvote
      update.$push = { userUpvote: username };
      update.$inc = { ...update.$inc, upvote: 1 };
    }

    const updatedArticle = await Article.findByIdAndUpdate(articleId, update, { new: true });

    // Update the rating after changing upvotes
    const newRating = await calculateAndUpdateRating(updatedArticle);

    return res.status(200).json({
      message: alreadyUpvoted ? 'Like removed' : 'Article liked',
      upvote: updatedArticle.upvote,
      downvote: updatedArticle.downvote,
      userLiked: !alreadyUpvoted,
      userDisliked: false,
      rating: newRating // Include the updated rating
    });
  } catch (error) {
    console.error('Error liking article:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Downvote article - No change needed as this is an action on a specific article
router.post('/api/news/:articleId/downvote', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const username = req.user.username;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findOne({ _id: articleId, deleted: { $ne: true } });
    if (!article) {
      return res.status(404).json({ message: 'Article not found or has been deleted.' });
    }

    const alreadyDisliked = article.userDownvote.includes(username);
    const alreadyUpvoted = article.userUpvote.includes(username);

    const update = {};

    if (alreadyDisliked) {
      // Remove downvote
      update.$pull = { userDownvote: username };
      update.$inc = { downvote: -1 };
    } else {
      // If already upvoted, remove the upvote first
      if (alreadyUpvoted) {
        update.$pull = { ...update.$pull, userUpvote: username };
        update.$inc = { ...update.$inc, upvote: -1 };
      }
      // Add the downvote
      update.$push = { userDownvote: username };
      update.$inc = { ...update.$inc, downvote: 1 };
    }

    const updatedArticle = await Article.findByIdAndUpdate(articleId, update, { new: true });

    // Update the rating after changing downvotes
    const newRating = await calculateAndUpdateRating(updatedArticle);

    return res.status(200).json({
      message: alreadyDisliked ? 'Dislike removed' : 'Article disliked',
      upvote: updatedArticle.upvote,
      downvote: updatedArticle.downvote,
      userLiked: false,
      userDisliked: !alreadyDisliked,
      rating: newRating // Include the updated rating
    });
  } catch (error) {
    console.error('Error disliking article:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get like status - No change needed as this is an action on a specific article
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

    const userLiked = article.userUpvote.includes(username);
    const userDisliked = article.userDownvote.includes(username);

    return res.status(200).json({
      views: article.views,
      upvote: article.upvote,
      downvote: article.downvote,
      userLiked,
      userDisliked,
      rating: article.rating // Include the rating
    });
  } catch (error) {
    console.error('Error getting like status:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Add comment - No change needed as this is an action on a specific article
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

    const newComment = {
      text,
      author: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedArticle = await Article.findOneAndUpdate(
      { _id: articleId, deleted: { $ne: true } },
      { $push: { comments: newComment } },
      { new: true }
    ).populate({
      path: 'comments.author',
      select: 'username displayname profilePicture'
    });

    if (!updatedArticle) {
      return res.status(404).json({ message: 'Article not found or has been deleted.' });
    }

    const addedComment = updatedArticle.comments[updatedArticle.comments.length - 1];
    return res.status(201).json({
      message: 'Comment added successfully',
      comment: addedComment
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get comments - No change needed as this is an action on a specific article
router.get('/api/news/:articleId/comments', async (req, res) => {
  try {
    const { articleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId).select('comments');

    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    const sortedComments = article.comments.sort((a, b) => b.createdAt - a.createdAt);
  
    const authorIds = [...new Set(sortedComments.map(comment => comment.author.toString()))];
    
    // Fetch all regular users in one query
    const regularUsers = await mongoose.model('User').find({
      _id: { $in: authorIds }
    }).select('_id username displayname profilePicture').lean();
    
    // Fetch all Google users in one query
    const googleUsers = await mongoose.model('Googleuser').find({
      _id: { $in: authorIds }
    }).select('_id username displayname profilePicture').lean();
    
    // Create a map for quick lookup
    const userMap = {};
    
    // Add regular users to the map
    regularUsers.forEach(user => {
      userMap[user._id.toString()] = {
        _id: user._id,
        username: user.username,
        displayname: user.displayname || user.username,
        profilePicture: user.profilePicture || "" // Regular user profile picture
      };
    });
    
    // Add Google users to the map
    googleUsers.forEach(user => {
      userMap[user._id.toString()] = {
        _id: user._id,
        username: user.username,
        displayname: user.displayname || user.username,
        profilePicture: user.profilePicture || "" 
      };
    });
    
    // Populate comments with author information from the map
    const populatedComments = sortedComments.map(comment => {
      const authorId = comment.author.toString();
      const author = userMap[authorId] || {
        _id: comment.author,
        username: 'Unknown User',
        displayname: 'Unknown User',
        profilePicture: ""
      };
      
      return {
        _id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author
      };
    });

    return res.status(200).json({
      comments: populatedComments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Delete comment - No change needed as this is an action on a specific article
router.delete('/api/news/:articleId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { articleId, commentId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(articleId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid ID format.'
      });
    }

    // Find the article
    const article = await Article.findOne({
      _id: articleId,
      deleted: { $ne: true }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Article not found or has been deleted.'
      });
    }

    // Find the specific comment
    const comment = article.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Comment not found.'
      });
    }

    // Debug information to understand the data types
    console.log('Comment author:', comment.author);
    console.log('Comment author type:', typeof comment.author);
    console.log('User ID:', userId);
    console.log('User ID type:', typeof userId);
    
    // Convert both to strings for comparison
    const commentAuthorId = comment.author.toString();
    const currentUserId = userId.toString();
    
    console.log('Comment author as string:', commentAuthorId);
    console.log('User ID as string:', currentUserId);
    
    // Check authorization - only comment author or admin can delete
    const isCommentAuthor = commentAuthorId === currentUserId;
    
    console.log('Is comment author?', isCommentAuthor);
    console.log('Is admin?', isAdmin);

    if (!isCommentAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Not authorized to delete this comment.'
      });
    }

    article.comments.pull(commentId); 
    await article.save();

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Something went wrong.'
    });
  }
});

// Save/unsave an article - No change needed as this is an action on a specific article
router.post('/api/news/:articleId/save', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    // Check if the article exists and is not deleted
    const article = await Article.findOne({ 
      _id: articleId, 
      deleted: { $ne: true } 
    });

    if (!article) {
      return res.status(404).json({ message: 'Article not found or has been deleted.' });
    }

    // Check if the article is already saved by the user
    const isAlreadySaved = article.saved.some(
      item => item.userId.toString() === userId.toString()
    );

    if (isAlreadySaved) {
      // If already saved, remove it (unsave)
      await Article.updateOne(
        { _id: articleId },
        { $pull: { saved: { userId } } }
      );
      
      return res.status(200).json({ 
        saved: false, 
        message: 'Article removed from saved items.' 
      });
    } else {
      // If not saved, save it
      await Article.updateOne(
        { _id: articleId },
        { 
          $push: { 
            saved: { 
              userId,
              articleId,
              savedAt: new Date()
            } 
          } 
        }
      );
      
      return res.status(200).json({ 
        saved: true, 
        message: 'Article saved successfully.' 
      });
    }
  } catch (error) {
    console.error('Error saving/unsaving article:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get saved status for an article - No change needed as this is an action on a specific article
router.get('/api/news/:articleId/save-status', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findOne({ 
      _id: articleId,
      'saved.userId': userId
    });
    
    return res.status(200).json({
      saved: !!article
    });
  } catch (error) {
    console.error('Error checking save status:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get all saved articles for the current user - MODIFIED to only show approved articles
router.get('/api/news/saved/list', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all articles saved by this user
    const savedArticles = await Article.find({
      'saved.userId': userId,
      deleted: { $ne: true },
      status: 'approved' // Only show approved articles
    })
    .populate('authorId', 'username displayname profilePicture')
    .populate('authorIdGoogle', 'username displayname profilePicture')
    .sort({ publishedAt: -1 });
    
    if (savedArticles.length === 0) {
      return res.status(200).json({ 
        articles: [],
        message: 'No saved articles found.' 
      });
    }
    
    // Clean up the populated data:
    // Remove the unpopulated field from each article
    savedArticles.forEach((article) => {
      if (article.authorIdGoogle) {
        article.authorId = null; 
      } else if (article.authorId) {
        article.authorIdGoogle = null;
      }
    });
    
    await Promise.all(savedArticles.map(async (article) => {
      // Only update if rating is old or missing
      if (!article.lastRatingUpdate || 
          new Date() - new Date(article.lastRatingUpdate) > 3600000) { // 1 hour
        await calculateAndUpdateRating(article);
      }
    }));
    
    // Map the articles to include the savedAt date
    const articlesWithSavedDate = savedArticles.map(article => {
      const savedInfo = article.saved.find(item => item.userId.toString() === userId.toString());

      return {
        ...article.toObject(),
        savedAt: savedInfo.savedAt
      };
    });

    // Sort articles directly in MongoDB query instead of JavaScript
    articlesWithSavedDate.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    return res.status(200).json({ articles: articlesWithSavedDate });
  } catch (error) {
    console.error('Error fetching saved articles:', error);
    return res.status(500).json({ error: 'Something went wrong while fetching saved articles.' });
  }
});

export default router;

