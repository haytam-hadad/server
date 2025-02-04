import { Router } from "express";


const router = Router();


router.get("/api/products", (request,response)=>{
    console.log(request.headers.cookie);
    console.log(request.cookies);
    if(request.cookies.hello && request.cookies.hello=== "world")
        return response.send([{ id: 1, name: "product 1" ,price:10}]);
    return response.status(403).send({msg: "you have to provide the irght cookie"})
});

export default router;