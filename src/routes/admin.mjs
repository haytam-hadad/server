import { Router } from "express";
import { Report } from "../mongoose/schemas/report.mjs";
import { Article } from "../mongoose/schemas/article.mjs";
import { User } from "../mongoose/schemas/user.mjs";
import { Googleuser } from "../mongoose/schemas/googleuser.mjs";
import mongoose from "mongoose";
import { requireAuth , requireAdmin } from "../middleware/auth.mjs";

const router = Router();

// ==================== OVERVIEW =============================

router.get("/api/admin/overview", async (req, res) => {
  try {
    // Fetch general statistics in parallel
    const [totalArticles, totalUsersRegular, totalUsersGoogle, totalViews, totalComments, totalLikes, totalDislikes, articlesByMonth] = await Promise.all([
      Article.countDocuments({ deleted: false }), // Total articles
      mongoose.model('User').countDocuments(), // Total regular users
      mongoose.model('Googleuser').countDocuments(), // Total Google users
      Article.aggregate([{ $group: { _id: null, totalViews: { $sum: "$views" } } }]), // Total views
      Article.aggregate([{ $unwind: "$comments" }, { $count: "totalComments" }]), // Total comments
      Article.aggregate([{ $group: { _id: null, totalLikes: { $sum: "$upvote" } } }]), // Total likes
      Article.aggregate([{ $group: { _id: null, totalDislikes: { $sum: "$downvote" } } }]), // Total dislikes
      Article.aggregate([
        { 
          $match: { 
            deleted: false, 
            publishedAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } 
          } 
        },
        { $project: { year: { $year: "$publishedAt" }, month: { $month: "$publishedAt" } } },
        { $group: { _id: { year: "$year", month: "$month" }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ])
    ]);

    // Correctly sum regular and Google users
    const totalUsers = totalUsersRegular + totalUsersGoogle;

    // Fill missing months (if no articles were posted in some months)
    const currentYear = new Date().getFullYear();
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const monthData = articlesByMonth.find(item => item._id.month === month);
      monthlyData.push({
        month,
        count: monthData ? monthData.count : 0
      });
    }

    // Send the response
    res.json({
      totalArticles,
      totalUsers,
      totalViews: totalViews[0]?.totalViews || 0,
      totalComments: totalComments[0]?.totalComments || 0,
      totalLikes: totalLikes[0]?.totalLikes || 0,
      totalDislikes: totalDislikes[0]?.totalDislikes || 0,
      articlesByMonth: monthlyData
    });
  } catch (error) {
    console.error("Error fetching site overview data:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ==================== ARTICLE MANAGEMENT ====================

// Get all articles (admin only)
router.get('/api/admin/articles/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const articles = await Article.find({ deleted: false })
      .sort({ createdAt: -1 });

    return res.status(200).json({ articles });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Search articles with filters (admin only)
router.get('/api/admin/articles/search', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, category, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = { deleted: false };
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { authorusername: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const articles = await Article.find(query)
      .sort(sort);

    return res.status(200).json({ articles });
  } catch (error) {
    console.error('Error searching articles:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get articles by category (admin only)
router.get('/api/admin/articles/category/:category', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    
    const articles = await Article.find({ 
      category, 
      deleted: false 
    }).sort({ createdAt: -1 });

    return res.status(200).json({ articles });
  } catch (error) {
    console.error('Error fetching articles by category:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get articles by status (admin only)
router.get('/api/admin/articles/status/:status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.params;
    
    if (!['on-going', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const articles = await Article.find({ 
      status, 
      deleted: false 
    }).sort({ createdAt: -1 });

    return res.status(200).json({ articles });
  } catch (error) {
    console.error('Error fetching articles by status:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Approve an article (admin only)
router.patch('/api/admin/articles/:articleId/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    if (article.deleted) {
      return res.status(400).json({ message: 'Cannot approve a deleted article.' });
    }

    // Update article status
    article.status = 'approved';
    await article.save();

    return res.status(200).json({
      message: 'Article approved successfully.',
      article
    });
  } catch (error) {
    console.error('Error approving article:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Reject an article (admin only)
router.patch('/api/admin/articles/:articleId/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { reason } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    if (article.deleted) {
      return res.status(400).json({ message: 'Cannot reject a deleted article.' });
    }

    // Update article status
    article.status = 'rejected';
    await article.save();

    return res.status(200).json({
      message: 'Article rejected successfully.',
      article
    });
  } catch (error) {
    console.error('Error rejecting article:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Delete a single article (admin only)
router.delete('/api/admin/articles/:articleId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const article = await Article.findById(articleId);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    // Soft delete the article
    article.deleted = true;
    await article.save();

    return res.status(200).json({
      message: 'Article deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Bulk delete articles (admin only)
router.post('/api/admin/articles/bulk-delete', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleIds } = req.body;
    
    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ message: 'No article IDs provided for deletion.' });
    }

    // Validate all IDs
    const invalidIds = articleIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid article ID format found in the request.',
        invalidIds
      });
    }

    // Soft delete all articles
    const updateResult = await Article.updateMany(
      { _id: { $in: articleIds } },
      { $set: { deleted: true } }
    );

    return res.status(200).json({
      message: `${updateResult.modifiedCount} articles deleted successfully.`,
      deletedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk deleting articles:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Bulk approve articles (admin only)
router.post('/api/admin/articles/bulk-approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleIds } = req.body;
    
    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ message: 'No article IDs provided for approval.' });
    }

    // Validate all IDs
    const invalidIds = articleIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid article ID format found in the request.',
        invalidIds
      });
    }

    // Approve all non-deleted articles
    const updateResult = await Article.updateMany(
      { _id: { $in: articleIds }, deleted: false },
      { $set: { status: 'approved' } }
    );

    return res.status(200).json({
      message: `${updateResult.modifiedCount} articles approved successfully.`,
      approvedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk approving articles:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Bulk reject articles (admin only)
router.post('/api/admin/articles/bulk-reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleIds, reason } = req.body;
    
    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ message: 'No article IDs provided for rejection.' });
    }

    // Validate all IDs
    const invalidIds = articleIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid article ID format found in the request.',
        invalidIds
      });
    }

    // Reject all non-deleted articles
    const updateResult = await Article.updateMany(
      { _id: { $in: articleIds }, deleted: false },
      { $set: { status: 'rejected' } }
    );

    return res.status(200).json({
      message: `${updateResult.modifiedCount} articles rejected successfully.`,
      rejectedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk rejecting articles:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get article statistics (admin only)
router.get('/api/admin/articles/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await Article.aggregate([
      {
        $match: { deleted: false }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format
    const result = {
      'on-going': 0,
      'approved': 0,
      'rejected': 0,
      total: 0
    };

    stats.forEach(item => {
      result[item._id] = item.count;
      result.total += item.count;
    });

    // Get category distribution
    const categoryStats = await Article.aggregate([
      {
        $match: { deleted: false }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    result.categories = categoryStats;

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching article statistics:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ==================== CATEGORY MANAGEMENT ====================

router.get('/api/admin/news/categories', async (req, res) => {
  try {
    
    const topCategories = await Article.aggregate([
      { $match: { deleted: { $ne: true } } }, // Ignore deleted articles
      { $group: { 
          _id: "$category", 
          totalArticles: { $sum: 1 } // Count how many articles belong to each category
      }},
      { $sort: { totalArticles: -1 } }
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

// ==================== REPORT MANAGEMENT ====================

// Get all reports (admin only)
router.get('/api/admin/reports/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reportedBy', 'username displayname profilePicture')
      .populate({
        path: 'articleId',
        select: 'title authorusername'
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Search reports with filters (admin only)
router.get('/api/admin/reports/search', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, articleId, reportedBy, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (articleId && mongoose.Types.ObjectId.isValid(articleId)) query.articleId = articleId;
    if (reportedBy && mongoose.Types.ObjectId.isValid(reportedBy)) query.reportedBy = reportedBy;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const reports = await Report.find(query)
      .populate('reportedBy', 'username displayname profilePicture')
      .populate({
        path: 'articleId',
        select: 'title authorusername'
      })
      .sort(sort);

    return res.status(200).json({ reports });
  } catch (error) {
    console.error('Error searching reports:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get all reports for an article (admin only)
router.get('/api/admin/reports/article/:articleId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const reports = await Report.find({ articleId })
      .populate('reportedBy', 'username displayname profilePicture')
      .sort({ createdAt: -1 });

    return res.status(200).json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}); 

// Get reports by status (admin only)
router.get('/api/admin/reports/status/:status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.params;
    
    if (!['pending', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const reports = await Report.find({ status })
      .populate('reportedBy', 'username displayname profilePicture')
      .populate({
        path: 'articleId',
        select: 'title authorusername'
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ reports });
  } catch (error) {
    console.error('Error fetching reports by status:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Update report status (admin only)
router.patch('/api/admin/reports/:reportId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID format.' });
    }

    // Validate status
    if (!status || !['pending', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Update report
    report.status = status;
    if (adminNotes) {
      report.adminNotes = adminNotes;
    }
    
    // If status is changing from pending, add reviewer info
    if (report.status === 'pending' && status !== 'pending') {
      report.reviewedBy = req.user._id;
      report.reviewedAt = new Date();
    }

    await report.save();

    return res.status(200).json({
      message: 'Report updated successfully.',
      report
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Delete a report (admin only)
router.delete('/api/admin/reports/:reportId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID format.' });
    }

    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    await Report.findByIdAndDelete(reportId);

    return res.status(200).json({
      message: 'Report deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Bulk delete reports (admin only)
router.post('/api/admin/reports/bulk-delete', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reportIds } = req.body;
    
    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ message: 'No report IDs provided for deletion.' });
    }

    // Validate all IDs
    const invalidIds = reportIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid report ID format found in the request.',
        invalidIds
      });
    }

    // Delete reports
    const deleteResult = await Report.deleteMany({ _id: { $in: reportIds } });

    return res.status(200).json({
      message: `${deleteResult.deletedCount} reports deleted successfully.`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting reports:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get report counts by status (admin only)
router.get('/api/admin/reports/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const counts = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format
    const result = {
      pending: 0,
      resolved: 0,
      rejected: 0,
      total: 0
    };

    counts.forEach(item => {
      result[item._id] = item.count;
      result.total += item.count;
    });

    // Get reason distribution
    const reasonStats = await Report.aggregate([
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    result.reasons = reasonStats;

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching report statistics:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ==================== COMMENT MANAGEMENT ====================

// Get all comments for an article (admin only)
router.get('/api/admin/articles/:articleId/comments', requireAuth, requireAdmin, async (req, res) => {
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

// Delete a comment from an article (admin only)
router.delete('/api/admin/articles/:articleId/comments/:commentId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleId, commentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(articleId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid ID format.' });
    }

    const article = await Article.findById(articleId);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    // Find the comment index
    const commentIndex = article.comments.findIndex(comment => comment._id.toString() === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    // Remove the comment
    article.comments.splice(commentIndex, 1);
    await article.save();

    return res.status(200).json({
      message: 'Comment deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Bulk delete comments (admin only)
router.post('/api/admin/articles/:articleId/comments/bulk-delete', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { commentIds } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({ message: 'No comment IDs provided for deletion.' });
    }

    const article = await Article.findById(articleId);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    // Filter out comments to keep
    const originalCount = article.comments.length;
    article.comments = article.comments.filter(comment => 
      !commentIds.includes(comment._id.toString())
    );
    
    const deletedCount = originalCount - article.comments.length;
    
    await article.save();

    return res.status(200).json({
      message: `${deletedCount} comments deleted successfully.`,
      deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting comments:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ==================== USER MANAGEMENT ====================

// Get all users (admin only)
router.get('/api/admin/users/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -resetOtp -resetOtpExpires')
      .sort({ createdAt: -1 });

    const googleusers = await Googleuser.find()
      .select('-password -resetOtp -resetOtpExpires')
      .sort({ createdAt: -1 });
    return res.status(200).json({ 
      users,
      googleusers 
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Search users with filters (admin only)
router.get('/api/admin/users/search', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, isActive, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-password -resetOtp -resetOtpExpires')
      .sort(sort);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get users by role (admin only)
router.get('/api/admin/users/role/:role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role value.' });
    }

    const users = await User.find({ role })
      .select('-password -resetOtp -resetOtpExpires')
      .sort({ createdAt: -1 });

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Delete a user (admin only)
router.delete('/api/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent deleting another admin
    if (user.role === 'admin' && req.user.role === 'admin') {
      return res.status(403).json({ message: 'Admin cannot delete another admin account.' });
    }

    // Hard delete the user
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      message: 'User deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Bulk delete users (admin only)
router.post('/api/admin/users/bulk-delete', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No user IDs provided for deletion.' });
    }

    // Validate all IDs
    const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid user ID format found in the request.',
        invalidIds
      });
    }

    // Prevent admin from deleting themselves
    if (userIds.includes(req.user._id.toString())) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    // Find admin users in the list
    const adminUsers = await User.find({ 
      _id: { $in: userIds },
      role: 'admin'
    });

    // If current user is admin and trying to delete other admins, prevent it
    if (req.user.role === 'admin' && adminUsers.length > 0) {
      return res.status(403).json({ 
        message: 'Admin cannot delete other admin accounts.',
        adminUserIds: adminUsers.map(admin => admin._id)
      });
    }

    // Delete users (excluding admins if current user is admin)
    let deleteQuery = { _id: { $in: userIds } };
    if (req.user.role === 'admin') {
      deleteQuery.role = { $ne: 'admin' };
    }

    const deleteResult = await User.deleteMany(deleteQuery);

    return res.status(200).json({
      message: `${deleteResult.deletedCount} users deleted successfully.`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting users:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Ban/unban a user (admin only)
router.patch('/api/admin/users/:userId/ban', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, reason } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Prevent admin from banning themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot ban your own account.' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent banning another admin
    if (user.role === 'admin' && req.user.role === 'admin') {
      return res.status(403).json({ message: 'Admin cannot ban another admin account.' });
    }

    // Update user active status
    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      message: isActive ? 'User unbanned successfully.' : 'User banned successfully.',
      user: {
        _id: user._id,
        username: user.username,
        displayname: user.displayname,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error updating user ban status:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Make a user admin (super admin only)
router.patch('/api/admin/users/:userId/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Validate role
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role value.' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update user role
    user.role = role;
    await user.save();

    return res.status(200).json({
      message: `User role updated to ${role} successfully.`,
      user: {
        _id: user._id,
        username: user.username,
        displayname: user.displayname,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get user statistics (admin only)
router.get('/api/admin/users/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get user counts by role
    const roleCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get active/inactive counts
    const activityCounts = await User.aggregate([
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format the results
    const result = {
      total: await User.countDocuments(),
      roles: {},
      activity: {
        active: 0,
        inactive: 0
      }
    };

    roleCounts.forEach(item => {
      result.roles[item._id] = item.count;
    });

    activityCounts.forEach(item => {
      if (item._id === true) {
        result.activity.active = item.count;
      } else {
        result.activity.inactive = item.count;
      }
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;