import express from "express";
import routes from "./routes/index.mjs";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import mongoose from "mongoose";
import "./strategies/local-strategy.mjs";
import { userarray } from "./utils/constants.mjs";
import MongoStore from "connect-mongo";

const app = express();

mongoose.connect("mongodb+srv://haytamhadad:9gnNMG5WgxSIMSg8@cluster0.i1r9j.mongodb.net/pfe", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch((err) => console.log("Failed to connect:", err));


app.use(express.json());
app.use(cookieParser());
app.use(
    session({
        secret: 'Swordart12',
        saveUninitialized: false,
        resave: false,
        cookie: {
            maxAge: 60000 * 60,
        },
        store: MongoStore.create({
            client: mongoose.connection.getClient()
        })
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(routes);


app.post("/api/auth",passport.authenticate("local"),(request,response)=>{
    return response.status(200).send(request.user);
});

//starting the server :

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// "/api" : means the base route

app.get('/', (request, response) => {
    console.log(request.session.id);
    request.session.visited = true;
    response.cookie("hello","world",{ maxAge: 600000000000});
    response.status(201).send({msg: "hello!"});
});


app.get('/api/auth/status',(request,response)=>{
    console.log("inside the /auth/status endpoint ");
    console.log(request.user);
    console.log(request.session);
    return request.user ? response.send(request.user) : response.sendStatus(401);
});

app.post('/api/auth/logout',(request,response)=>{
    if(!request.user) return response.sendStatus(401);
    request.logOut((err) => {
        if(err) return response.sendStatus(400);
        response.sendStatus(200);
    });
});
