import passport from "passport";
import { User } from "../mongoose/schemas/user.mjs";
import { Googleuser } from "../mongoose/schemas/googleuser.mjs";

passport.serializeUser((user, done) => {
    done(null, { id: user._id, type: user.isGoogleUser ? "google" : "local" });
});

passport.deserializeUser(async (obj, done) => {
    console.log("Inside deserializeUser, received:", obj);
    try {
        let findUser;
        if (obj.type === "google") {
            findUser = await Googleuser.findById(obj.id);
        } else {
            findUser = await User.findById(obj.id);
        }
        if (!findUser) throw new Error("User not found");
        done(null, findUser);
    } catch (error) {
        console.error("Error in deserializeUser:", error);
        done(error, null);
    }
});

export default passport;