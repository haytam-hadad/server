import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },  
    isActive: { type: Boolean, default: true }, 
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },
}, { timestamps: true });

export const User = mongoose.model("User",UserSchema);