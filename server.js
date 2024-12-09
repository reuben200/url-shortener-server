import express from 'express';
import { nanoid } from 'nanoid';
import bodyParser from 'body-parser';
import pkg from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const { Pool } = pkg;

const app = express();
const pool = new Pool({
  connectionString: process.env.DB_URL,
});

const BASE_URL = 'http://jclip.com';

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })); // Adjust origin as needed
app.use(bodyParser.json());

// Helper function to validate URLs
const isValidUrl = (url) => {
  const regex = /^(https?:\/\/)?([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})(\/\S*)?$/;
  return regex.test(url);
};

// Shorten URL
app.post('/shorten', async (req, res) => {
  const { longUrl } = req.body;

   // Check if the URL is provided
   if (!longUrl) {
    return res.status(400).json({ error: 'The URL field is required.' });
  }

  // Validate URL format
  if (!isValidUrl(longUrl)) {
    return res.status(400).json({ error: 'Invalid URL format. Please provide a valid URL.' });
  }

  const shortUrl = nanoid(7); // Generate a unique identifier
  const shortenedUrl = `${BASE_URL}/${shortUrl}`;

  try {
    await pool.query('INSERT INTO urls (original_url, short_url) VALUES ($1, $2)', [longUrl, shortUrl]);
    res.status(201).json({ shortUrl: shortenedUrl });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Redirect to long URL
app.get('/redirect/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  try {
    const result = await pool.query('SELECT original_url FROM urls WHERE short_url = $1', [shortUrl]);
    if (result.rows.length > 0) {
      res.redirect(result.rows[0].original_url);
    } else {
      res.status(404).json({ error: 'URL not found' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Test database connection before starting server
(async () => {
  try {
    await pool.connect();
    console.log('Database connected successfully');

    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1); // Exit process with failure code
  }
})();
