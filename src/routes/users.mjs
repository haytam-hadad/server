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
        const { username, email } = request.body;
        
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).send(result.array());
        }
        
        const data = matchedData(request);

        const updateFields = {};

        if (data.username) updateFields.username = data.username;
        if (data.email) updateFields.email = data.email;

        try {
            const updatedUser = await User.findByIdAndUpdate(
                request.user.id, 
                updateFields,
                { new: true }  // Return the updated document
            );

            if (!updatedUser) {
                return response.status(404).send({ message: 'User not found' });
            }
            return response.status(200).send({ message: 'User Information Updated!' });
        } catch (error) {
            console.error(error);
            return response.status(500).send({ message: 'Error updating user information' });
        }
    } else {
        return response.status(401).send({ message: 'Unauthenticated User' });
    }
});

export default router;