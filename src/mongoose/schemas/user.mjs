import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    displayname: { type: String, default: "", trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    subscribers: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId },
        userModel: { type: String, enum: ['User', 'Googleuser'], default: 'User' }
      }],
      subscriptions: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId },
        userModel: { type: String, enum: ['User', 'Googleuser'], default: 'User' }
      }],
    role: { type: String, enum: ["user", "admin"], default: "user" },  
    isActive: { type: Boolean, default: true }, 
    badge: { type: String, enum: ["Iron","Bronze", "Silver", "Gold", "Platinum"], default: "Iron" },
    bio: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    gender: { type: String, default: "" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    birthdate: { type: Date },
    profilePicture: { type: String, default: "" },
    profileBanner: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },
}, { timestamps: true });

export const User = mongoose.model("User",UserSchema);