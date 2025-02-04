import pkg from 'pg';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import Article from './models/Article.js';

// Load environment variables from the .env file
dotenv.config();

// Destructure Pool from pg package
const { Pool } = pkg;

// Initialize the connection pool with the connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

function checkCategory(category) {
  const allowedCategories = ['all','entertainment', 'health', 'science', 'sports', 'technology' , 'business'];
  return allowedCategories.includes(category);
}

// Route to fetch articles
app.get('/api/articles/:category?', async (req, res) => {
  const { category } = req.params;

  try {
    let query = {};
    if (checkCategory(category) && category !== 'all') {
      query.category = category;
    }

    const articles = await Article.find(query).sort({ published_at: -1 });
    res.json(articles);
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: `Server error. Please try again later. ${err}`, });
  }
});

app.get('/api/search/:q?', async (req, res) => {
  const { q } = req.params;
  try {
    const articles = await Article.find({
      $or: [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { source_name: new RegExp(q, 'i') },
      ],
    });
    res.json(articles);
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: `Server error. Please try again later. ${err}`, });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Function to query the database
export const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result.rows; // Return only the rows for convenience
  } catch (err) {
    console.error('Query error:', err.message); // Log query error
    throw err; // Rethrow the error for further handling
  }
};
