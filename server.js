
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

app.get('/api/news/top-headlines', async (req, res) => {
  const { category, language } = req.query;
  const apiKey = process.env.NEWS_API_KEY;
  const apiUrl = `${process.env.API_URL}/top-headlines?country=us&category=${category}&language=${language}&apiKey=${apiKey}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get('/api/news/search', async (req, res) => {
  const { search, language } = req.query;
  const apiKey = process.env.NEWS_API_KEY;

  const { q: searchQuery } = req.query;
  const apiUrl = `${process.env.API_URL}/everything?q=${encodeURIComponent(searchQuery)}&language=${language}&apiKey=${apiKey}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
