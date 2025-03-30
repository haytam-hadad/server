import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { User } from "../mongoose/schemas/user.mjs";
import { Googleuser } from "../mongoose/schemas/googleuser.mjs";
import "./passport-config.mjs";

dotenv.config();

const genUsername = async (baseUsername) => {
  let username = baseUsername;
  let count = 1;

  while (
      await User.findOne({ username }) || 
      await Googleuser.findOne({ username })
  ) {
      username = `${baseUsername}${count}`;
      count++;
  }

  return username;
};


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
      scope: ["profile", "email"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value; 
        if (!email) throw new Error("Email not available from Google profile");

        let user = await Googleuser.findOne({ usergoogleId: profile.id });

        if (!user) {
          user = await Googleuser.findOne({ email });
        }

        if (!user) {
          
          let givenName = (profile.name?.givenName || profile.given_name || "").trim();
          let familyName = (profile.name?.familyName || profile.family_name || "").trim();

          givenName = givenName.replace(/\s+/g, "");
          familyName = familyName.replace(/\s+/g, "");
          
          const baseUsername = `${givenName}.${familyName}`.toLowerCase();
          const uniqueUsername = await genUsername(baseUsername); 

          user = new Googleuser({
            usergoogleId: profile.id,
            username: uniqueUsername, 
            displayname: profile.displayName || profile.name,
            email,
            isGoogleUser: true,
            profilePicture: profile.photos?.[0]?.value || "",
            emailVerified: profile._json?.email_verified || false,
            isActive: true,
            bio: "",
            phone: "",
            website: "",
            gender: "",
            country: "",
            city: "",
            zipCode: "",
          });

          await user.save();
        } else {
          // Update existing user with latest Google profile data
          user.profilePicture = profile.photos?.[0]?.value || user.profilePicture;
          user.emailVerified = profile._json?.email_verified || user.emailVerified;
          user.displayname = profile.displayName || user.displayname;

          // Only update email if different
          if (user.email !== email) {
            user.email = email;
          }

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        console.error("Google authentication error:", error);
        return done(error, null);
      }
    }
  )
);

export default passport;
