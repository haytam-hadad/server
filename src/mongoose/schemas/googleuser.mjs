import mongoose from "mongoose";

const GoogleuserSchema = new mongoose.Schema({
    usergoogleId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, trim: true },
    displayname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    isGoogleUser: { type: Boolean, default: true },                              
    picture: { type: String },                                 
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }, 
    bio: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    gender: { type: String, default: "" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    birthdate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },    
}, { timestamps: true });

export const Googleuser = mongoose.model("Googleuser", GoogleuserSchema);
  