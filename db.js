import pkg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

// Destructure Pool from pg package
const { Pool } = pkg;

// Initialize the connection pool with the connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // This is typically needed for cloud-hosted databases like Neon
  },
});

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
