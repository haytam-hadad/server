import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { User } from "../mongoose/schemas/user.mjs";
import { comparePassword } from "../utils/helpers.mjs";
import "./passport-config.mjs";

// User local strategy
passport.use(
  "user-local",
  new LocalStrategy({ usernameField: "username", passwordField: "password" }, async (username, password, done) => {
    try {
      const findUser = await User.findOne({
        $or: [{ username }, { email: username }],
        role: "user" 
      });

      if (!findUser) throw new Error("User not found or not a normal user");
      if (!comparePassword(password, findUser.password)) throw new Error("Invalid password");

      return done(null, findUser);
    } catch (error) {
      return done(null, false, { message: error.message });
    }
  })
);


// Admin local strategy
passport.use(
  "admin-local",
  new LocalStrategy({ usernameField: "username", passwordField: "password" }, async (username, password, done) => {
    try {
      const findAdmin = await User.findOne({
        $or: [{ username }, { email: username }],
        role: "admin" 
      });

      if (!findAdmin) throw new Error("Admin not found or not an admin");
      if (!comparePassword(password, findAdmin.password)) throw new Error("Invalid password");

      return done(null, findAdmin);
    } catch (error) {
      return done(null, false, { message: error.message });
    }
  })
);

export default passport;
