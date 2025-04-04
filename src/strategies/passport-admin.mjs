import passport from "passport";
import { User } from "../mongoose/schemas/user.mjs";
import { Strategy as LocalStrategy } from "passport-local";
import { comparePassword } from "../utils/helpers.mjs";

passport.serializeUser((user, done) => {
    done(null, { id: user._id, role: "admin" });
});

passport.deserializeUser(async (obj, done) => {
    console.log("Inside admin deserializeUser, received:", obj);
    try {
        const admin = await User.findById(obj.id);
        if (!admin || admin.role !== "admin") return done(null, false);
        done(null, admin);
    } catch (err) {
        done(err);
    }
});

export default passport;

