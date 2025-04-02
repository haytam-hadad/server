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

    // Adjusted Weights
    const W_l = 0.6,  // More importance to likes
          W_d = 0.2,  // Less penalty for dislikes
          W_v = 0.4,  // More importance to views
          W_s = 0.3;  // Keep weight for sources

    // Compute Raw Rating
    const rawRating = (
      (W_l * article.upvote) -
      (W_d * article.downvote) +
      (W_v * Math.log(article.views + 1)) +
      (W_s * (article.sources?.length > 0 ? 1 : 0))
    );

    // Define Min & Max Rating for Normalization
    const minRating = 0;   // Worst-case scenario (no likes, no views)
    const maxRating = 500; // Best-case scenario (high likes & views)

    // Normalize to 50-100%
    let ratingPercentage = 50 + ((rawRating - minRating) / (maxRating - minRating)) * 50;
    ratingPercentage = Math.max(50, Math.min(100, ratingPercentage));

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
