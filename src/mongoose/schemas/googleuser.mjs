import mongoose from "mongoose";

const GoogleuserSchema = new mongoose.Schema({
    usergoogleId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    isGoogleUser: { type: Boolean, default: true },                              
    picture: { type: String },                                 
    emailVerified: { type: Boolean, default: false }        
}, { timestamps: true });

export const Googleuser = mongoose.model("Googleuser", GoogleuserSchema);
  