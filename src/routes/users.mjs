import { Router } from "express";
import {query,validationResult,body,matchedData, checkSchema} from 'express-validator';
import { User } from "../mongoose/schemas/user.mjs";
import { Googleuser } from "../mongoose/schemas/googleuser.mjs";
import { createUserValidationSchema , updateUserValidationSchema} from "../utils/validationSchemas.mjs";
import { hashPassword } from "../utils/helpers.mjs";

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
    }).select('username displayname picture bio email'); // Include email in selection

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
      profilePicture: user.picture || "",
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

        console.log("Fields to update:", updateFields);

        try {
            // Check if the user is a Google user
            const isGoogleUser = request.user.isGoogleUser;
            let updatedUser;
            
            if (isGoogleUser) {
                // Update in Googleuser collection
                updatedUser = await Googleuser.findByIdAndUpdate(
                    request.user.id, 
                    updateFields,
                    { new: true }  // Return the updated document
                );
            } else {
                // Update in User collection
                updatedUser = await User.findByIdAndUpdate(
                    request.user.id, 
                    updateFields,
                    { new: true }  // Return the updated document
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
                    email: updatedUser.email
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


export default router;