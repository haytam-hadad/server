import { userarray } from "./constants.mjs";
export const resolveIndexUserId = (request,response,next) =>{
    const {
        body,
        params:{id},
    } = request;
    const parsedID = parseInt(id)
    if(isNaN(parsedID)) return response.sendStatus(400);
    const finduserIndex = userarray.findIndex((user) => user.id === parsedID);
    if(finduserIndex === -1)return response.sendStatus(404);
    request.finduserIndex = finduserIndex;
    next();
};