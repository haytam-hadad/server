import { Router } from "express";
import {query,validationResult,body,matchedData, checkSchema} from 'express-validator';
import { userarray } from "../utils/constants.mjs";
import { resolveIndexUserId } from "../utils/middlewares.mjs";
import { User } from "../mongoose/schemas/user.mjs";
import { createUserValidationSchema } from "../utils/validationSchemas.mjs";
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
            return response.status(500).send({ error: "Internal server error" });
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

router.get('/api/users/:id',resolveIndexUserId,(request,response)=>{
    const { finduserIndex } = request;
    const finduser = userarray[finduserIndex];
    if(!finduser) return response.sendStatus(404);
    return response.send(finduser);
});

router.put('/api/users/:id',resolveIndexUserId,(request,response)=>{
    const {body,finduserIndex} = request;
    userarray[finduserIndex] = { id:userarray[finduserIndex].id,...body};
    return response.sendStatus(200);
});

router.patch('/api/users/:id',resolveIndexUserId,(request,response)=>{
    const {body,finduserIndex} = request;
    userarray[finduserIndex] = { ...userarray[finduserIndex],...body};
    return response.sendStatus(200);
});

router.delete('/api/users/:id',resolveIndexUserId,(request,response)=>{
    const {finduserIndex} = request;
    userarray.splice(finduserIndex,1);
    return response.sendStatus(200);
});

export default router;