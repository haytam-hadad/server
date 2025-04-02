import { Router } from "express";
import {query,validationResult,body,matchedData, checkSchema} from 'express-validator';
import { User } from "../mongoose/schemas/user.mjs";
import { Googleuser } from "../mongoose/schemas/googleuser.mjs";
import { Article } from "../mongoose/schemas/article.mjs";
import { requireAuth } from "../middleware/auth.mjs";
import { createUserValidationSchema , updateUserValidationSchema} from "../utils/validationSchemas.mjs";
import { hashPassword } from "../utils/helpers.mjs";
import mongoose from "mongoose";

const router = Router();


// Search for users by username, displayname, or email
router.get("/api/users/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    console.log("User search query received:", query);
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    // Search in regular users
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { displayname: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('username displayname profilePicture bio email'); // Include email in selection

    // Search in Google users
    const googleUsers = await Googleuser.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { displayname: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('username displayname profilePicture bio email'); // Include email in selection

    // Format the results to have a consistent structure
    const formattedUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      displayname: user.displayname || user.username,
      email: user.email,
      profilePicture: user.profilePicture || "",
      bio: user.bio || "",
      isGoogleUser: false
    }));

    const formattedGoogleUsers = googleUsers.map(user => ({
      id: user._id,
      username: user.username,
      displayname: user.displayname || user.username,
      email: user.email,
      profilePicture: user.profilePicture || "",
      bio: user.bio || "",
      isGoogleUser: true
    }));

    // Combine the results
    const combinedResults = [...formattedUsers, ...formattedGoogleUsers];

    // Sort by username
    combinedResults.sort((a, b) => a.username.localeCompare(b.username));

    return res.status(200).json({
      users: combinedResults,
      count: combinedResults.length
    });
  } catch (error) {
    console.error("Error searching for users:", error);
    return res.status(500).json({ error: "Something went wrong, please try again." });
  }
});

router.post('/api/signup', checkSchema(createUserValidationSchema), async (request, response) => {
    console.log("Incoming request body:", request.body);
    const result = validationResult(request);
    if (!result.isEmpty()) {
        return response.status(400).json(result.array());
    }
    const data = matchedData(request);
    try {
        // Check if username or email is already taken
        const existingUser = await User.findOne(
            { $or: [{ username: data.username }, { email: data.email }] },
            "_id"
        );
        if (existingUser) {
            return response.status(400).json({ message: "Username or Email already exists!" });
        }
        data.password = hashPassword(data.password);
        const newUser = new User(data);
        const savedUser = await newUser.save();
        return response.status(201).json({
            message: "User registered successfully!",
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
            },
        });
    } catch (error) {
        console.error("Signup error:", error);
        if (error.code === 11000) {
            return response.status(400).json({ message: "Username or Email already exists!" });
        }
        return response.status(500).json({ message: "Something went wrong. Please try again." });
    }
});

router.get("/api/user/rating/:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    // Find articles with the given username and rating >= 75
    const articles = await Article.find({ 
      authorusername: username,
      deleted: { $ne: true },
      rating: { $gte: 75 }
    });

    if (articles.length === 0) {
      return res.status(404).json({ error: 'No articles found.' });
    }

    // Calculate badge based on number of articles
    let badge;
    const nbrart = articles.length;

    if (nbrart === 0) {
      badge = "Iron";
    } else if (nbrart === 10) {
      badge = "Bronze";
    } else if (nbrart === 30) {
      badge = "Silver";
    } else if (nbrart === 50) {
      badge = "Gold";
    } else if (nbrart >= 100) {
      badge = "Platinum";
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    user.badge = badge;
    await user.save();

    return res.status(200).json({ rating: user.rating, badge: user.badge });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});


router.get("/api/userprofile",
    query("username").isString().trim().withMessage("Username must be a string"),
    async (req, res) => {
        try {
            const { username } = req.query;
            
            // First try to find in regular users
            let user = await User.findOne({ username }).select(
                "-password -resetOtp -resetOtpExpires -__v -role -isActive -updatedAt"
            );
            
            // If not found, try to find in Google users
            if (!user) {
                user = await Googleuser.findOne({ username }).select(
                    "-__v -isActive -updatedAt"
                );
                
                // If found in Google users, add displayname if it doesn't exist
                if (user && !user.displayname) {
                    user = user.toObject(); // Convert to plain object to add properties
                    user.displayname = user.username;
                }
            }
            
            console.log("user profile information");
            console.log(user);
            
            if (!user) return res.status(404).json({ message: "User not found" });
            res.status(200).json(user);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Something went wrong" });
        }
    }
);

router.get("/api/userprofile/overview", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch the user details excluding sensitive information
    let user = await User.findById(userId).select(
      "-password -resetOtp -resetOtpExpires -__v -role -isActive -updatedAt -bio -email"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Count the total articles authored by the user
    const totalArticles = await Article.countDocuments({ authorId: userId, deleted: false });

    // Aggregate total likes (upvotes) for the user's articles
    const totalLikes = await Article.aggregate([
      { $match: { authorId: userId, deleted: false } },
      { $group: { _id: null, totalLikes: { $sum: "$upvote" } } },
    ]);

    // Aggregate total views for the user's articles
    const totalViews = await Article.aggregate([
      { $match: { authorId: userId, deleted: false } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);

    // Find the most popular (most viewed) article
    const mostPopularArticle = await Article.findOne({ authorId: userId, status: "approved", deleted: false })
      .sort({ views: -1 })
      .select("title views");

    // Count the total comments made by the user
    const totalComments = await Article.aggregate([
      { $match: { authorId: userId, deleted: false } },
      { $unwind: "$comments" },
      { $match: { "comments.author": userId } },
      { $count: "totalComments" }
    ]);

    // Aggregate the number of articles published by month for the past year
    const articlesByMonth = await Article.aggregate([
      { $match: { authorId: userId, deleted: false, publishedAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } } },
      {
        $project: {
          year: { $year: "$publishedAt" },
          month: { $month: "$publishedAt" }
        }
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Fill in missing months with 0 count (for months with no articles)
    const currentYear = new Date().getFullYear();
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const monthData = articlesByMonth.find(item => item._id.month === month);
      monthlyData.push({
        month,
        count: monthData ? monthData.count : 0
      });
    }

    // Return the overview data along with the monthly articles data
    res.json({
      username: user.username,
      displayname: user.displayname,
      profilePicture: user.profilePicture,
      badge: user.badge,
      totalArticles,
      totalLikes: totalLikes[0]?.totalLikes || 0,
      totalViews: totalViews[0]?.totalViews || 0,
      mostPopularArticle,
      totalComments: totalComments[0]?.totalComments || 0,
      totalSubscribers: user.subscribers.length,
      totalSubscriptions: user.subscriptions.length,
      articlesByMonth: monthlyData
    });
  } catch (error) {
    console.error("Error fetching overview data:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Modified profile update route to handle both regular and Google users
router.post('/api/userprofile/changeinformation', checkSchema(updateUserValidationSchema), async (request, response) => {
  if (request.user) {
      console.log("Received profile update request:", request.body);
      
      const result = validationResult(request);
      if (!result.isEmpty()) {
          console.log("Validation errors:", result.array());
          return response.status(400).json({ errors: result.array() });
      }
      
      const data = matchedData(request);
      console.log("Validated data:", data);
      
      const updateFields = {};

      // Add all fields from the validated data to updateFields
      if (data.username) updateFields.username = data.username;
      if (data.displayname !== undefined) updateFields.displayname = data.displayname;
      if (data.email) updateFields.email = data.email;
      if (data.phone !== undefined) updateFields.phone = data.phone;
      if (data.website !== undefined) updateFields.website = data.website;
      if (data.bio !== undefined) updateFields.bio = data.bio;
      if (data.birthdate) updateFields.birthdate = data.birthdate;
      if (data.gender !== undefined) updateFields.gender = data.gender;
      if (data.country !== undefined) updateFields.country = data.country;
      if (data.city !== undefined) updateFields.city = data.city;
      if (data.zipCode !== undefined) updateFields.zipCode = data.zipCode;
      if (data.profilePicture) updateFields.profilePicture = data.profilePicture;
      if (data.profileBanner) updateFields.profileBanner = data.profileBanner;

      console.log("Fields to update:", updateFields);

      try {
          const isGoogleUser = request.user.isGoogleUser;
          let updatedUser;
          
          if (isGoogleUser) {
              updatedUser = await Googleuser.findByIdAndUpdate(
                  request.user.id, 
                  updateFields,
                  { new: true }
              );
          } else {
              updatedUser = await User.findByIdAndUpdate(
                  request.user.id, 
                  updateFields,
                  { new: true }
              );
          }

          if (!updatedUser) {
              console.log("User not found in database");
              return response.status(404).json({ message: 'User not found' });
          }

          console.log("User updated successfully:", updatedUser.username);
          return response.status(200).json({ 
              message: 'User Information Updated!',
              user: {
                  username: updatedUser.username,
                  displayname: updatedUser.displayname || updatedUser.username,
                  email: updatedUser.email,
                  profilePicture: updatedUser.profilePicture || "",
                  profileBanner: updatedUser.profileBanner || ""
              }
          });
      } catch (error) {
          console.error("Error updating user:", error);
          return response.status(500).json({ message: 'Error updating user information' });
      }
  } else {
      console.log("Unauthenticated user attempted to update profile");
      return response.status(401).json({ message: 'Unauthenticated User' });
  }
});


// Subscribe/Unsubscribe toggle endpoint
router.post('/api/users/:userId/subscribe', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const currentUserModel = req.user.isGoogleUser ? 'Googleuser' : 'User';

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Prevent subscribing to self
    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot subscribe to yourself.' });
    }

    // Identify if the target user is a `User` or `Googleuser`
    const targetUser = await User.findById(userId) || await Googleuser.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const targetUserModel = targetUser.isGoogleUser ? 'Googleuser' : 'User';

    // Check subscription status
    const alreadySubscribed = req.user.subscriptions?.find(
      sub => sub.userId?.toString() === userId && sub.userModel === targetUserModel
    );       

    if (alreadySubscribed) {
      // Unsubscribe
      if (currentUserModel === 'Googleuser') {
        await Googleuser.findByIdAndUpdate(currentUserId, {
          $pull: { subscriptions: { userId: new mongoose.Types.ObjectId(userId) } }
        });
      } else {
        await User.findByIdAndUpdate(currentUserId, {
          $pull: { subscriptions: { userId: new mongoose.Types.ObjectId(userId) } }
        });
      }

      if (targetUserModel === 'Googleuser') {
        await Googleuser.findByIdAndUpdate(userId, {
          $pull: { subscribers: { userId: new mongoose.Types.ObjectId(currentUserId) } }
        });
      } else {
        await User.findByIdAndUpdate(userId, {
          $pull: { subscribers: { userId: new mongoose.Types.ObjectId(currentUserId) } }
        });
      }
      return res.status(200).json({ 
        message: 'Successfully unsubscribed from user.',
        subscribed: false
      });
    } else {
      // Subscribe
      if (currentUserModel === 'Googleuser') {
          await Googleuser.findByIdAndUpdate(currentUserId, { 
              $addToSet: { subscriptions: { 
                  userId: new mongoose.Types.ObjectId(userId),
                  userModel: targetUserModel
              } }
          });
      } else {
          await User.findByIdAndUpdate(currentUserId, {
              $addToSet: { subscriptions: { 
                  userId: new mongoose.Types.ObjectId(userId),
                  userModel: targetUserModel
              } }
          });
      }
      // Check target user's model to update the correct collection
      if (targetUserModel === 'Googleuser') {
          await Googleuser.findByIdAndUpdate(userId, {
              $addToSet: { subscribers: { 
                  userId: new mongoose.Types.ObjectId(currentUserId),
                  userModel: currentUserModel
              } }
          });
      } else {
          await User.findByIdAndUpdate(userId, {
              $addToSet: { subscribers: { 
                  userId: new mongoose.Types.ObjectId(currentUserId),
                  userModel: currentUserModel
              } }
          });
      }
      return res.status(200).json({ 
          message: 'Successfully subscribed to user.',
          subscribed: true
      });
    }
  } catch (error) {
    console.error('Error toggling subscription:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});  

// Check subscription status - FIXED
router.get('/api/users/:userId/subscription-status', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const currentUserModel = req.user.isGoogleUser ? 'Googleuser' : 'User';

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Find the current user in the appropriate model
    let currentUser;
    if (currentUserModel === 'Googleuser') {
      currentUser = await Googleuser.findById(currentUserId);
    } else {
      currentUser = await User.findById(currentUserId);
    }

    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found.' });
    }

    // Check if the current user is subscribed by looking for the target userId in subscriptions
    const isSubscribed = currentUser.subscriptions.some(
      sub => sub.userId.toString() === userId
    );

    return res.status(200).json({ 
      subscribed: isSubscribed
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});


router.get('/api/users/:username/subscribers', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    // First check if user exists in User model
    let user = await User.findOne({ username });
    let userModel = 'User';
    
    // If not found, check Googleuser model
    if (!user) {
      user = await Googleuser.findOne({ username });
      userModel = 'Googleuser';
      
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
    }

    // Get all subscriber details
    const populatedSubscribers = [];
    
    for (const subscriber of user.subscribers) {
      let subscriberUser;
      
      // Check which model the subscriber belongs to
      if (subscriber.userModel === 'Googleuser') {
        subscriberUser = await Googleuser.findById(subscriber.userId)
          .select('_id username displayname profilePicture');
          
        if (subscriberUser) {
          populatedSubscribers.push({
            _id: subscriberUser._id,
            userId: subscriberUser._id, // Include userId as requested
            username: subscriberUser.username,
            displayname: subscriberUser.displayname || subscriberUser.username,
            profilePicture: subscriberUser.profilePicture || ""
          });
        }
      } else {
        subscriberUser = await User.findById(subscriber.userId)
          .select('_id username displayname profilePicture');
          
        if (subscriberUser) {
          populatedSubscribers.push({
            _id: subscriberUser._id,
            userId: subscriberUser._id, // Include userId as requested
            username: subscriberUser.username,
            displayname: subscriberUser.displayname || subscriberUser.username,
            profilePicture: subscriberUser.profilePicture || ""
          });
        }
      }
    }

    return res.status(200).json({
      subscribers: populatedSubscribers,
      total: populatedSubscribers.length
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get user's subscriptions by username
router.get('/api/users/:username/subscriptions', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    // First check if user exists in User model
    let user = await User.findOne({ username });
    let userModel = 'User';
    
    // If not found, check Googleuser model
    if (!user) {
      user = await Googleuser.findOne({ username });
      userModel = 'Googleuser';
      
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
    }

    // Get all subscription details
    const populatedSubscriptions = [];
    
    for (const subscription of user.subscriptions) {
      let subscriptionUser;
      
      // Check which model the subscription belongs to
      if (subscription.userModel === 'Googleuser') {
        subscriptionUser = await Googleuser.findById(subscription.userId)
          .select('_id username displayname profilePicture');
          
        if (subscriptionUser) {
          populatedSubscriptions.push({
            _id: subscriptionUser._id,
            userId: subscriptionUser._id, // Include userId as requested
            username: subscriptionUser.username,
            displayname: subscriptionUser.displayname || subscriptionUser.username,
            profilePicture: subscriptionUser.profilePicture || ""
          });
        }
      } else {
        subscriptionUser = await User.findById(subscription.userId)
          .select('_id username displayname profilePicture');
          
        if (subscriptionUser) {
          populatedSubscriptions.push({
            _id: subscriptionUser._id,
            userId: subscriptionUser._id, // Include userId as requested
            username: subscriptionUser.username,
            displayname: subscriptionUser.displayname || subscriptionUser.username,
            profilePicture: subscriptionUser.profilePicture || ""
          });
        }
      }
    }

    return res.status(200).json({
      subscriptions: populatedSubscriptions,
      total: populatedSubscriptions.length
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;

