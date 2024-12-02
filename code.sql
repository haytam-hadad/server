CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    author VARCHAR(100),
    source_name VARCHAR(100),
    url TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type BOOLEAN NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT NOW(),
    category VARCHAR(50) NOT NULL
);

INSERT INTO articles (
    title, description, author, source_name, url, media_url, media_type, category
) VALUES
    ('Breaking News: Major Event Unfolds', 'Details of the breaking news as they happen.', 'John Doe', 'News Daily', 'https://example.com/breaking-news', 'https://example.com/images/breaking-news.jpg', TRUE, 'World'),
    ('Exclusive Video Report: Tech Innovation', 'An in-depth video about the latest in tech.', 'Jane Smith', 'Tech Weekly', 'https://example.com/video-tech-innovation', 'https://example.com/videos/tech-innovation.mp4', FALSE, 'Technology'),
    ('New Study Highlights Climate Change', 'An image detailing the effects of climate change.', 'Alice Green', 'Environmental Post', 'https://example.com/climate-study', 'https://example.com/images/climate-change.jpg', TRUE, 'Science'),
    ('Sports Highlights: Championship Recap', 'A thrilling recap of last night’s championship game.', 'Mike Brown', 'Sports Network', 'https://example.com/championship-recap', 'https://example.com/videos/championship.mp4', FALSE, 'Sports'),
    ('Global Economic Outlook: What to Expect', 'A deep dive into the upcoming global economic trends.', 'Laura White', 'Business Insider', 'https://example.com/global-economic-outlook', 'https://example.com/images/economic-outlook.jpg', TRUE, 'Economy'),
    ('Artificial Intelligence in Healthcare', 'Exploring how AI is transforming healthcare.', 'Robert Black', 'Tech Today', 'https://example.com/ai-healthcare', 'https://example.com/videos/ai-healthcare.mp4', FALSE, 'Health');
