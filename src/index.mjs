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
import "./strategies/passport-config.mjs";
import cors from "cors";
import "./strategies/googleAuth.mjs";


dotenv.config();
const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));



const mongoUrl = process.env.ATLAS_URI;
const secretpwd = process.env.SESSION_SECRET;

mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch((err) => console.log("Failed to connect:", err));


app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: secretpwd,
  saveUninitialized: false,
  resave: false,
  cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true, 
      secure: false,  // ✅ Secure cookies in production
      sameSite: "lax"
  },
  store: MongoStore.create({
      client: mongoose.connection.getClient(),
  }),        
}));


app.use(passport.initialize());
app.use(passport.session());

app.use(routes);


app.post("/api/auth",passport.authenticate("local"),(request,response)=>{
    return response.status(200).send(request.user);
});

//starting the server :

const PORT = process.env.PORT || 5000;
const useremail = process.env.EMAIL_USER;
const userpassword = process.env.EMAIL_PASS;


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// "/api" : means the base route

app.get('/', (request, response) => {
  request.session.visited = true;
  console.log(request.session.id);
  console.log(request.user);
});

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

app.post('/api/auth/logout', (req, res) => {
  if (!req.user) return res.sendStatus(401);

  req.logout((err) => {
      if (err) return res.sendStatus(500);

      req.session.destroy((err) => { 
          if (err) return res.status(500).json({ message: "Failed to log out" });

          res.clearCookie("connect.sid", { path: "/" }); // Ensure cookie is removed
          res.status(200).json({ message: "Logged out successfully" });
      });
  });
});



app.post('/api/forgotpwd', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account with that email address exists." });
    }

    // Generate a random OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

    // Save OTP and expiration time (e.g., 10 minutes)
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    await user.save();

    // Configure nodemailer transport (adjust for your email service)
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // or another service
      auth: {
        user: useremail,
        pass: userpassword
      },
      tls: {
        rejectUnauthorized: false, // Allows self-signed certificates
      }
    });

    // Send the OTP via email
    const mailOptions = {
      to: user.email,
      from: useremail,
      subject: 'Password Reset OTP',
      text: `You are receiving this because you (or someone else) have requested a reset of the password for your account.\n\n
      Your OTP is: ${otp}\n\n
      This OTP will expire in 10 minutes.\n\n
      If you did not request this, please ignore this email.`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'An OTP has been sent to your email.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Example: POST /api/reset-password
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
  passport.authenticate("google", { scope: ["profile", "email"] }),(request,response)=>{
  return response.status(200).send(request.user);
});

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL || 'http://localhost:3000/login' }),
  (req, res) => {
    if (!req.user) {
      res.redirect('http://localhost:3000/login');
    }
    // Redirect to frontend with session or token handling
    res.redirect('http://localhost:3000/');
  }
);
  