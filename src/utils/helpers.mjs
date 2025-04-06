import mongoose from "mongoose";
import { Article } from "../mongoose/schemas/article.mjs";
import bcrypt from "bcrypt";

const saltRounds = 10;
export const hashPassword = (password) => {
    const salt = bcrypt.genSaltSync(saltRounds);
    console.log(salt);
    return bcrypt.hashSync(password, salt);
}

export const comparePassword = (plain,hashed) =>{
    return bcrypt.compareSync(plain,hashed);
}

export async function calculateAndUpdateRating(article) {
  try {
    // If article is an ID, fetch the article
    if (typeof article === 'string' || article instanceof mongoose.Types.ObjectId) {
      article = await Article.findById(article);
      if (!article) {
        console.error('Article not found for rating calculation:', article);
        return null;
      }
    }

    // For new articles with no interactions, return exactly 50%
    if (article.upvote === 0 && article.downvote === 0 && article.views <= 1) {
      await Article.findByIdAndUpdate(article._id, { 
        rating: 50,
        lastRatingUpdate: new Date()
      });
      return 50;
    }

    // Adjusted Weights
    const W_l = 0.6,  // More importance to likes
          W_d = 0.2,  // Less penalty for dislikes
          W_v = 0.1,  // Reduced importance to views to emphasize user interactions
          W_s = 0.1;  // Reduced weight for sources to emphasize user interactions

    // Base rating starts at 50%
    let baseRating = 50;
    
    // Calculate positive contribution (upvotes, views, sources)
    const positiveContribution = 
      (W_l * article.upvote) + 
      (W_v * Math.log(article.views + 1)) +
      (W_s * (article.sources?.length > 0 ? 1 : 0));
    
    // Calculate negative contribution (downvotes)
    const negativeContribution = (W_d * article.downvote);
    
    // Calculate net contribution
    const netContribution = positiveContribution - negativeContribution;
    
    // Define scaling factor to control how quickly rating changes
    const scalingFactor = 0.5;
    
    // Calculate final rating: base rating + scaled contribution
    // This ensures rating starts at 50% and changes based on interactions
    let ratingPercentage = baseRating + (netContribution * scalingFactor);
    
    // Ensure rating stays between 0-100%
    ratingPercentage = Math.max(0, Math.min(100, ratingPercentage));

    // Update the article's rating in the database
    await Article.findByIdAndUpdate(article._id, { 
      rating: ratingPercentage,
      lastRatingUpdate: new Date()
    });

    return ratingPercentage;
  } catch (error) {
    console.error('Error calculating article rating:', error);
    return null;
  }
}


