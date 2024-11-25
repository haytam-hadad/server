CREATE TABLE articles (
    id SERIAL PRIMARY KEY,                           -- Unique identifier for each article
    title VARCHAR(255) NOT NULL,                    -- Article title
    description TEXT,                               -- Article description
    author VARCHAR(100),                            -- Author name (optional)
    source_name VARCHAR(100),                       -- Source of the article
    url TEXT NOT NULL,                              -- URL of the article
    url_to_image TEXT,                              -- URL to the article's image
    published_at TIMESTAMP NOT NULL DEFAULT NOW(),  -- Date and time of publication
    category VARCHAR(50) NOT NULL                  -- Article category (e.g., 'general', 'sports')
);

INSERT INTO articles (title, description, author, source_name, url, url_to_image, published_at, category)
VALUES
('Tech News Today', 
 'Latest updates in technology.', 
 'John Doe', 
 'TechSource', 
 'https://techsource.com/articles/tech-news-today', 
 'https://cdn.pixabay.com/photo/2016/11/18/16/15/code-1839406_960_720.jpg', 
 '2024-11-25 08:00:00', 
 'technology'),

('Sports Update', 
 'Latest football match results.', 
 'Jane Smith', 
 'SportsDaily', 
 'https://sportsdaily.com/articles/sports-update', 
 'https://cdn.pixabay.com/photo/2016/07/06/15/30/football-1502636_960_720.jpg', 
 '2024-11-25 09:00:00', 
 'sports'),

('Health Tips', 
 'Top 10 tips for a healthy lifestyle.', 
 'Dr. Alice', 
 'HealthMag', 
 'https://healthmag.com/articles/health-tips', 
 'https://cdn.pixabay.com/photo/2017/08/02/01/01/dumbbell-2561426_960_720.jpg', 
 '2024-11-25 10:00:00', 
 'health');

INSERT INTO articles (title, description, author, source_name, url, url_to_image, published_at, category)
VALUES
('Business Growth Strategies', 
 'How to scale your business in 2024.', 
 'Michael Johnson', 
 'BizTimes', 
 'https://biztimes.com/articles/business-growth-strategies', 
 'https://cdn.pixabay.com/photo/2016/10/20/18/35/analytics-1757261_960_720.jpg', 
 '2024-11-25 08:30:00', 
 'business'),

('Entertainment Weekly', 
 'Upcoming movies to watch this holiday season.', 
 'Emma Watson', 
 'MovieBuzz', 
 'https://moviebuzz.com/articles/entertainment-weekly', 
 'https://cdn.pixabay.com/photo/2015/03/01/09/23/movie-654937_960_720.jpg', 
 '2024-11-25 09:15:00', 
 'entertainment'),

('Science Innovations', 
 'Breakthrough in renewable energy technology.', 
 'Dr. Carl Newton', 
 'SciWorld', 
 'https://sciworld.com/articles/science-innovations', 
 'https://cdn.pixabay.com/photo/2016/11/18/20/16/power-1837601_960_720.jpg', 
 '2024-11-25 11:00:00', 
 'science'),

('Breaking News: Market Crash', 
 'Global stocks plummet due to unforeseen events.', 
 'Sarah Connor', 
 'GlobalFinance', 
 'https://globalfinance.com/articles/breaking-news-market-crash', 
 'https://cdn.pixabay.com/photo/2016/01/22/14/32/stock-1153099_960_720.jpg', 
 '2024-11-25 12:00:00', 
 'general'),

('Healthy Living Guide', 
 'The benefits of mindfulness meditation.', 
 'Sophia Miller', 
 'WellnessDaily', 
 'https://wellnessdaily.com/articles/healthy-living-guide', 
 'https://cdn.pixabay.com/photo/2017/08/06/07/00/people-2592247_960_720.jpg', 
 '2024-11-25 13:45:00', 
 'health'),

('Football World Cup 2024', 
 'A detailed review of the opening match.', 
 'Tom Hardy', 
 'SportsNow', 
 'https://sportsnow.com/articles/football-world-cup-2024', 
 'https://cdn.pixabay.com/photo/2014/09/26/00/33/soccer-players-461451_960_720.jpg', 
 '2024-11-25 14:30:00', 
 'sports'),

('AI Trends 2024', 
 'How artificial intelligence is shaping the future.', 
 'Elon Ray', 
 'TechVision', 
 'https://techvision.com/articles/ai-trends-2024', 
 'https://cdn.pixabay.com/photo/2017/12/10/14/47/robot-3010309_960_720.jpg', 
 '2024-11-25 15:00:00', 
 'technology'),

('Celebrity News', 
 'Shocking revelations from the latest award show.', 
 'Lily Adams', 
 'StarGossip', 
 'https://stargossip.com/articles/celebrity-news', 
 'https://cdn.pixabay.com/photo/2015/03/26/10/59/camera-691332_960_720.jpg', 
 '2024-11-25 16:15:00', 
 'entertainment'),

('Space Exploration Update', 
 'NASA unveils plans for Mars colonization.', 
 'Neil Armstrong Jr.', 
 'AstroNews', 
 'https://astronews.com/articles/space-exploration-update', 
 'https://cdn.pixabay.com/photo/2018/02/27/22/31/space-3187273_960_720.jpg', 
 '2024-11-25 17:00:00', 
 'science');


 SELERCT * FROM articles WHERE title LIKE '%$1%' ORDER BY published_at DESC
 union
 SELERCT * FROM articles WHERE description LIKE '%$1%' ORDER BY published_at DESC
 union
 SELERCT * FROM articles WHERE source_name LIKE '%$1%' ORDER BY published_at DESC
 union
 SELERCT * FROM articles WHERE url LIKE '%$1%' ORDER BY published_at DESC
