import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
// Remove the PostgreSQL import
// import { query } from './db.js'; 

dotenv.config();
const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

function checkCategory(category) {
  const allowedCategories = ['all','entertainment', 'health', 'science', 'sports', 'technology' , 'business'];
  return allowedCategories.includes(category);
}

// Remove any other PostgreSQL related code
