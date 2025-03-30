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

    // Define Weights
    const W_l = 0.5, W_d = 0.3, W_v = 0.2, W_s = 0.3;

    // Compute Raw Rating
    const rawRating = (
      (W_l * article.upvote) -
      (W_d * article.downvote) +
      (W_v * Math.log(article.views + 1)) +
      (W_s * (article.sources?.length > 0 ? 1 : 0))
    );

    // Define Min & Max Rating for Normalization
    const minRating = -100;  // If an article is heavily disliked
    const maxRating = 1000;  // If an article is highly liked & viewed

    // Normalize to 0-100%
    let ratingPercentage = ((rawRating - minRating) / (maxRating - minRating)) * 100;
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