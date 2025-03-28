import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  articleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'article', 
    required: true 
  },
  reportedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  reason: { 
    type: String, 
    enum: [
      'inappropriate_content', 
      'spam', 
      'misinformation', 
      'hate_speech', 
      'violence', 
      'copyright', 
      'other'
    ], 
    required: true 
  },
  description: { 
    type: String, 
    default: "" 
  },
  status: { 
    type: String, 
    enum: ['pending', 'resolved', 'rejected'], 
    default: 'pending' 
  } 
}, { timestamps: true });


reportSchema.index({ articleId: 1, reportedBy: 1 }, { unique: true });

export const Report = mongoose.model("Report", reportSchema);