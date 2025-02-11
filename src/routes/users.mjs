import { Router } from "express";
import {query,validationResult,body,matchedData, checkSchema} from 'express-validator';
import { User } from "../mongoose/schemas/user.mjs";
import { createUserValidationSchema , updateUserValidationSchema} from "../utils/validationSchemas.mjs";
import { hashPassword } from "../utils/helpers.mjs";

const router = Router();

router.get(
    '/api/users',
    query("filter")
        .optional()  // Makes the "filter" parameter optional
        .isString()
        .withMessage("filter must be a string")
        .isLength({ min: 3, max: 10 })
        .withMessage("filter must be between 3 and 10 characters"),
    async (request, response) => {
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).send(result.array());
        }

        const { filter, value } = request.query;

        try {
            let users;
            if (filter && value) {
                // Use dynamic filtering based on query params
                users = await User.find({ [filter]: new RegExp(value, "i") }); // "i" for case-insensitive
            } else {
                // Fetch all users
                users = await User.find({});
            }

            return response.status(200).json(users);
        } catch (error) {
            console.error(error);
            return response.status(500).send({ error: "something wrong happened , please try again :)" });
        }
    }
);

router.post('/api/signup', checkSchema(createUserValidationSchema),async (request,response)=>{
    const result = validationResult(request);
    if(!result.isEmpty())return response.status(400).send(result.array());
    const data = matchedData(request);
    console.log(data);
    data.password = hashPassword(data.password);
    console.log(data);
    const newUser = new User(data);
    try {
        const savedUser = await newUser.save();
        return response.status(201).send(savedUser);
    } catch (error) {
        console.log(error);
        return response.sendStatus(400);
    }
});

router.get('/api/userprofile', (request, response) => {
    if (request.user) {
        const { id, username, email } = request.user;
      return response.status(200).json({ id, username, email }); 
    } else {
      return response.status(401).send({ message: "unAuthentificated User" });
    }
});

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