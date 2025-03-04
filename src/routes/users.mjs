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


// for private profile  :require the user to be authentificated , only the user can see his profile
router.get("/api/user/profile", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findById(req.user.id).select("-password -__v");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error("Error fetching private profile:", err);
        res.status(500).json({ message: "Something went wrong" });
    }
});

//for public profile : everyone can see the profile
router.get("/api/users/:username", async (req, res) => {
    try {
        const { username } = req.params;
        
        // Find user but exclude sensitive fields
        const user = await User.findOne({ username }).select(
            "-password -resetOtp -resetOtpExpires -__v -role -isActive -updatedAt"
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ message: "Something went wrong" });
    }
});



router.post('/api/userprofile/changeinformation', checkSchema(updateUserValidationSchema), async (request, response) => {
    if (!request.user) {
        return response.status(401).send({ message: 'Unauthenticated User' });
    }

    const result = validationResult(request);
    if (!result.isEmpty()) {
        return response.status(400).send(result.array());
    }

    const data = matchedData(request);
    const updateFields = {};

    if (data.username) {
        // Check if username is taken
        const existingUser = await User.findOne({ username: data.username });
        if (existingUser && existingUser._id.toString() !== request.user.id) {
            return response.status(400).json({ message: "Username is already taken" });
        }
        updateFields.username = data.username;
    }

    if (data.email) {
        // Check if email is taken
        const existingUser = await User.findOne({ email: data.email });
        if (existingUser && existingUser._id.toString() !== request.user.id) {
            return response.status(400).json({ message: "Email is already in use" });
        }
        updateFields.email = data.email;
    }

    if (data.password) {
        updateFields.password = hashPassword(data.password);
    }

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
});


export default router;