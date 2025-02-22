import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { Googleuser } from "../mongoose/schemas/googleuser.mjs";
import "./passport-config.mjs";
dotenv.config();

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
      {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "http://localhost:5000/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
          try {
              const email = profile.emails?.[0]?.value; // Ensure email exists
              if (!email) throw new Error("Email not available from Google profile");

              let user = await Googleuser.findOne({ email });

              if (!user) {
                  user = new Googleuser({
                      usergoogleId: profile.id,
                      username: profile.displayName,
                      email,
                      isGoogleUser: true,
                  });
                  console.log(profile);
                  await user.save();
              }

              return done(null, user);
          } catch (error) {
              return done(error, null);
          }
      }
  )
);

export default passport;