import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server);

// app.use(cors({
//   origin: ['https://world-news-alpha.vercel.app', 'https://*.vercel.app'],
//   methods: ['GET', 'POST', 'PUT'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(cors({ origin: '*' }));


// WebSocket setup
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Your API routes
app.get('/api/news-articles/top-news/:category/:language', async (req, res) => {
  const { category, language } = req.params;
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

// Your search route
app.get('/api/news-articles/search/:searchvalue/:language', async (req, res) => {
  const { searchvalue, language } = req.params;
  const apiKey = process.env.NEWS_API_KEY;

  const apiUrl = `${process.env.API_URL}/everything?qInTitle=${encodeURIComponent(searchvalue)}&language=${language}&sortBy=publishedAt&apiKey=${apiKey}`;

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
