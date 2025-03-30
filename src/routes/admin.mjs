import { Router } from "express";
import { Report } from "../mongoose/schemas/report.mjs";
import { Article } from "../mongoose/schemas/article.mjs";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.mjs";

const router = Router();


// Get all reports for an article (admin only)
router.get('/api/admin/reports/article/:articleId', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID format.' });
    }

    const reports = await Report.find({ articleId })
      .populate('reportedBy', 'username displayname profilePicture')
      .populate('reviewedBy', 'username displayname')
      .sort({ createdAt: -1 });

    return res.status(200).json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}); 

// Get all reports (admin only)
router.get('/api/admin/reports', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Get total count for pagination
    const totalReports = await Report.countDocuments(query);
    
    // Get reports with pagination
    const reports = await Report.find(query)
      .populate('reportedBy', 'username displayname profilePicture')
      .populate('reviewedBy', 'username displayname')
      .populate({
        path: 'articleId',
        select: 'title authorusername'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({ 
      reports,
      pagination: {
        total: totalReports,
        page: parseInt(page),
        pages: Math.ceil(totalReports / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Update report status (admin only)
router.patch('/api/admin/reports/:reportId', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID format.' });
    }

    // Validate status
    if (!status || !['pending', 'reviewed', 'resolved', 'rejected'].includes(status)) {
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

// Get report counts by status (admin only)
router.get('/api/admin/reports/counts', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }

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
      reviewed: 0,
      resolved: 0,
      rejected: 0,
      total: 0
    };

    counts.forEach(item => {
      result[item._id] = item.count;
      result.total += item.count;
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching report counts:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});


export default router;