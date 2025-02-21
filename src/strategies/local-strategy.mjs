import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { User } from "../mongoose/schemas/user.mjs";
import { comparePassword } from "../utils/helpers.mjs";
import "./passport-config.mjs";

passport.use(
    new LocalStrategy(async(username, password, done)=>{
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
);

export default passport;