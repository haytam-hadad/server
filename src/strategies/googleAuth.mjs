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
      scope: ["profile", "email"] // Explicitly define scopes
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value; // Ensure email exists
        if (!email) throw new Error("Email not available from Google profile");

        // Check if user already exists by Google ID (more reliable than email)
        let user = await Googleuser.findOne({ usergoogleId: profile.id });

        // If not found by Google ID, try finding by email as fallback
        if (!user) {
          user = await Googleuser.findOne({ email });
        }

        if (!user) {
          // Get name parts from profile
          let givenName = (profile.name?.givenName || profile.given_name || "").trim();
          let familyName = (profile.name?.familyName || profile.family_name || "").trim();
          
          // Remove all spaces from each part separately
          givenName = givenName.replace(/\s+/g, "");
          familyName = familyName.replace(/\s+/g, "");
          
          // Create username with no spaces and dot between first and last name
          const formattedUsername = `${givenName}.${familyName}`.toLowerCase();
          
          // Create new user with Google profile data
          user = new Googleuser({
            // Required fields
            usergoogleId: profile.id,
            username: formattedUsername,
            displayname: profile.displayName || profile.name,
            email,
            isGoogleUser: true,
            
            // Profile information
            picture: profile.photos?.[0]?.value || "",
            emailVerified: profile._json?.email_verified || false,
            
            // Optional fields - using defaults from schema
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
          user.picture = profile.photos?.[0]?.value || user.picture;
          user.emailVerified = profile._json?.email_verified || user.emailVerified;
          user.displayname = profile.displayName || user.displayname;
          
          // Only update if user was found by Google ID but email changed
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

