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
    .isString()
    .notEmpty()
    .withMessage("filter must not be empty")
    .isLength({min: 3 ,max: 10})
    .withMessage("filter must be between 3 and 10 characters"),
    (request,response)=>{
        console.log(request.session.id);
        request.sessionStore.get(request.session.id, (err,sessionData) =>{
            if(err){
                console.log(err);
                throw err;
            }
            console.log(sessionData);
        });
        const result = validationResult(request);
        console.log(result);
        const { 
            query: { filter , value },
        } = request;    
        if(filter && value)return response.send(userarray.filter((user)=> user[filter].includes(value)));
        return response.send(userarray);
    }
);

router.post('/api/users', checkSchema(createUserValidationSchema),async (request,response)=>{
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