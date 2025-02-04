import passport from "passport";
import { Strategy } from "passport-local";
import { User } from "../mongoose/schemas/user.mjs";
import { comparePassword } from "../utils/helpers.mjs";

passport.serializeUser((user, done)=>{
    console.log("inside serialize user :");
    console.log(user);
    done(null, user.id);
});

passport.deserializeUser(async (id, done)=>{
    console.log("inside deserialize user :");
    console.log(`deserialized id: ${id}`);
    try {
        const findUser = await User.findById(id);
        if(!findUser)
            throw new Error("user not found");
        done(null,findUser);
    } catch (error) {
        done(error,null);
    }
});

export default passport.use(
    new Strategy(async(username, password, done)=>{
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        try {
            const findUser = await User.findOne({username});
            if(!findUser) throw new Error("user not found");
            if(!comparePassword(password,findUser.password)) throw new Error("bad credentials");
            done(null,findUser);
        } catch (error) {
            done(error,null);
        }
    })
)