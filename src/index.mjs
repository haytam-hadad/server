import express from "express";
import routes from "./routes/index.mjs";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import mongoose from "mongoose";
import { hashPassword, comparePassword } from "./utils/helpers.mjs";
import "./strategies/local-strategy.mjs";
import MongoStore from "connect-mongo";
import dotenv from 'dotenv';
import nodemailer from "nodemailer";
import { User } from "./mongoose/schemas/user.mjs";
import { Googleuser } from "./mongoose/schemas/googleuser.mjs";
import userPassport from './strategies/passport-config.mjs';
import adminPassport from './strategies/passport-admin.mjs';
import cors from "cors";
import "./strategies/googleAuth.mjs";

dotenv.config();
const app = express();

// Simplified CORS configuration that works for development
app.use(cors({
  origin: true, // This allows all origins in development
  credentials: true
}));

const mongoUrl = process.env.ATLAS_URI;
const secretpwd = process.env.SESSION_SECRET;

mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch((err) => console.log("Failed to connect:", err));

// Create MongoDB stores for sessions
const userSessionStore = MongoStore.create({ 
  client: mongoose.connection.getClient(),
  collectionName: 'userSessions'
});

const adminSessionStore = MongoStore.create({ 
  client: mongoose.connection.getClient(),
  collectionName: 'adminSessions'
});

// Create separate session configurations with different store collections
const userSession = session({
  name: 'user.sid',
  secret: secretpwd,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000, httpOnly: true, secure: false, sameSite: 'lax' },
  store: userSessionStore
});

const adminSession = session({
  name: 'admin.sid',
  secret: secretpwd,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000, httpOnly: true, secure: false, sameSite: 'lax' },
  store: adminSessionStore
});

app.use(express.json());
app.use(cookieParser());

// Apply the appropriate session middleware based on the route
app.use((req, res, next) => {
  if (req.path.startsWith("/api/admin")) {
    adminSession(req, res, () => {
      adminPassport.initialize()(req, res, () => {
        adminPassport.session()(req, res, next);
      });
    });
  } else {
    userSession(req, res, () => {
      userPassport.initialize()(req, res, () => {
        userPassport.session()(req, res, next);
      });
    });
  }
});

app.use(routes);

// Authentication routes
app.post("/api/auth", userPassport.authenticate("user-local"), (req, res) => {
  return res.status(200).send(req.user);
});

app.post("/api/admin/auth", adminPassport.authenticate("admin-local"), (req, res) => {
  return res.status(200).send(req.user);
});

// Starting the server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Auth status endpoints
app.get("/api/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

app.get('/api/auth/status',(request,response)=>{
    console.log("inside the /auth/status endpoint ");
    console.log(request.user);
    console.log(request.session);
    return request.user ? response.send(request.user) : response.sendStatus(401);
});

app.get('/api/admin/auth/status',(request,response)=>{
  console.log("inside the /admin/auth/status endpoint ");
  console.log(request.user);
  console.log(request.session);
  return request.user ? response.send(request.user) : response.sendStatus(401);
});

// User logout route - completely isolated from admin sessions
app.post('/api/auth/logout', (req, res) => {
  console.log("User logout route called");
  
  // Check if there's a user session
  if (!req.user) {
    console.log("No user authenticated");
    return res.sendStatus(401);
  }

  // Log session info for debugging
  console.log("User session ID:", req.sessionID);
  
  // First, log the user out of Passport
  req.logout(err => {
    if (err) {
      console.error("Error during logout:", err);
      return res.sendStatus(500);
    }
    
    // Then destroy the session
    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to log out" });
      }
      
      // Clear the user cookie
      res.clearCookie("user.sid", { 
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      
      console.log("User logged out successfully");
      res.status(200).json({ message: "User logged out successfully" });
    });
  });
});

// Admin logout route - completely isolated from user sessions
app.post('/api/admin/auth/logout', (req, res) => {
  console.log("Admin logout route called");
  
  // Check if there's an admin session
  if (!req.user) {
    console.log("No admin authenticated");
    return res.sendStatus(401);
  }

  // Log session info for debugging
  console.log("Admin session ID:", req.sessionID);
  
  // First, log the admin out of Passport
  req.logout(err => {
    if (err) {
      console.error("Error during admin logout:", err);
      return res.sendStatus(500);
    }
    
    // Then destroy the session
    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying admin session:", err);
        return res.status(500).json({ message: "Failed to log out admin" });
      }
      
      // Clear the admin cookie
      res.clearCookie("admin.sid", { 
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      
      console.log("Admin logged out successfully");
      res.status(200).json({ message: "Admin logged out successfully" });
    });
  });
});

// Password reset routes (unchanged)
app.post('/api/forgotpwd', async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account with that email address exists." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    await user.save();

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false,
      }
    });

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset OTP',
      html: `
        <div style="
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          text-align: center;
          max-width: 400px;
          margin: 0 auto;
        ">
          <h2 style="color: #4CAF50; margin-bottom: 10px;">Password Reset Request</h2>
          <p style="font-size: 16px; color: #555;">
            You've requested to reset your password. Use the following OTP to proceed:
          </p>
          <div style="
            background-color: #4CAF50;
            color: #fff;
            font-size: 24px;
            font-weight: bold;
            padding: 10px 20px;
            border-radius: 4px;
            margin: 20px 0;
            display: inline-block;
          ">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #888;">
            This OTP will expire in <b>10 minutes</b>.
          </p>
          <p style="font-size: 12px; color: #999;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `
    };    
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'An OTP has been sent to your email.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/api/resetpwd', async (req, res) => {
    const { email, otp, newPassword } = req.body;
  
    try {
      // Find user by email and check if the OTP is valid and not expired
      const user = await User.findOne({
        email,
        resetOtp: otp,
        resetOtpExpires: { $gt: Date.now() } // Check if OTP has expired
      });
  
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }
  
      // Hash the new password
      user.password = hashPassword(newPassword);
  
      // Clear the OTP and expiration fields
      user.resetOtp = undefined;
      user.resetOtpExpires = undefined;
  
      await user.save();
  
      // Send the new password back to the user (send via email or show it directly in the response)
      return res.status(200).json({ message: 'Your password has been reset successfully.'});
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/api/auth/google",
  userPassport.authenticate("google", { scope: ["profile", "email"] }),(request,response)=>{
  return response.status(200).send(request.user);
});

app.get('/api/auth/google/callback',
  userPassport.authenticate('google', { failureRedirect: process.env.CLIENT_URL || 'http://localhost:3000/login' }),
  (req, res) => {
    if (!req.user) {
      res.redirect('http://localhost:3000/login');
    }
    // Redirect to frontend with session or token handling
    res.redirect('http://localhost:3000/');
  }
);

