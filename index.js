import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { query } from './db.js'; 

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

// Route to fetch articles
app.get('/api/articles/:category?', async (req, res) => {
  const { category } = req.params;

  try {
    // Base query to get all articles
    let queryText = `SELECT title , description , author , source_name , url , media_type , EXTRACT( HOUR FROM AGE(NOW() ,published_at)) AS timeAgo  , category FROM articles `;
    const params = [];


    if (checkCategory(category)) {
      
      params.push(category);
      if (category === 'all') {
        queryText += ' ORDER BY published_at DESC';
        const result = await query(queryText);
        res.json(result);
        console.log(result);
      }else{
        queryText += ' WHERE category = $1  ORDER BY published_at DESC';
        const result = await query(queryText, params);
        res.json(result);
        console.log(result);
      }

    }else {
      throw new Error('Invalid category');
    }

  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: `Server error. Please try again later. ${err}`, });
  }
});



app.get('/api/search/:q?', async (req, res) => {
  const { q } = req.params;
  let queryText = `SELECT title , description , author , source_name , url , media_type , EXTRACT( HOUR FROM AGE(NOW() ,published_at)) AS timeAgo  , category FROM articles WHERE title ILIKE $1
                      UNION
                    SELECT title , description , author , source_name , url , media_type , EXTRACT( HOUR FROM AGE(NOW() ,published_at)) AS timeAgo  , category FROM articles WHERE description ILIKE $1
                      UNION
                    SELECT title , description , author , source_name , url , media_type , EXTRACT( HOUR FROM AGE(NOW() ,published_at)) AS timeAgo  , category FROM articles WHERE source_name ILIKE $1;
                    `;
  const params = [`%${q}%`];                  
  try {
    const result = await query(queryText, params);
    console.log(result);
    res.json(result);

  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: `Server error. Please try again later. ${err}`, });
  }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



// app.get('/api/news-articles/top-news/:category/:language', async (req, res) => {
//   const { category, language } = req.params;
//   const apiKey = process.env.NEWS_API_KEY;
//   const apiUrl = `${process.env.API_URL}/top-headlines?country=us&category=${category}&language=${language}&apiKey=${apiKey}`;
  
//   try {
//     const response = await fetch(apiUrl);
//     const data = await response.json();
//     res.json(data);
//   } catch (error) {
//     console.error("Error fetching articles:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
//   console.log(res);
// });




// app.get('/api/news-articles/search/:searchvalue/:language', async (req, res) => {
//   const { searchvalue, language } = req.params;
//   const apiKey = process.env.NEWS_API_KEY;

//   const apiUrl = `${process.env.API_URL}/everything?qInTitle=${encodeURIComponent(searchvalue)}&language=${language}&sortBy=publishedAt&apiKey=${apiKey}`;
  
//   try {
//     const response = await fetch(apiUrl);
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     const data = await response.json();
//     res.json(data);
//   } catch (error) {
//     console.error("Error fetching articles:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
//   console.log(res);
// });


