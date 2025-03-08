import { Router } from "express";
import {query,validationResult,body,matchedData, checkSchema} from 'express-validator';
import { User } from "../mongoose/schemas/user.mjs";
import { createUserValidationSchema , updateUserValidationSchema} from "../utils/validationSchemas.mjs";
import { hashPassword } from "../utils/helpers.mjs";

const router = Router();

router.get(
    "/api/users",
    query("filter")
        .optional()
        .isString()
        .withMessage("Filter must be a string")
        .isLength({ min: 3, max: 10 })
        .withMessage("Filter must be between 3 and 10 characters"),
    query("value")
        .optional()
        .isString()
        .withMessage("Value must be a string")
        .notEmpty()
        .withMessage("Value cannot be empty"),
    async (request, response) => {
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json(result.array());
        }

        const { filter, value } = request.query;

        try {
            // If no filter or value is provided, return an empty array
            if (!filter || !value) {
                return response.status(200).json([]);
            }

            // Fetch users with role "user" and apply filter
            const users = await User.find({ 
                role: "user", 
                [filter]: new RegExp(value, "i") 
            });

            return response.status(200).json(users);
        } catch (error) {
            console.error(error);
            return response.status(500).json({ error: "Something went wrong, please try again :)" });
        }
    }
);


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
            const user = await User.findOne({ username }).select(
                "-password -resetOtp -resetOtpExpires -__v -role -isActive -updatedAt"
            );
            console.log("user profile informations");
            console.log(user);
            if (!user) return res.status(404).json({ message: "User not found" });
            res.status(200).json(user);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Something went wrong" });
        }
    }
);


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
            const updatedUser = await User.findByIdAndUpdate(
                request.user.id, 
                updateFields,
                { new: true }  // Return the updated document
            );

            if (!updatedUser) {
                console.log("User not found in database");
                return response.status(404).json({ message: 'User not found' });
            }
            
            console.log("User updated successfully:", updatedUser.username);
            return response.status(200).json({ 
                message: 'User Information Updated!',
                user: {
                    username: updatedUser.username,
                    displayname: updatedUser.displayname,
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