import pkg from 'pg';
const { Pool } = pkg;

// Create a new pool instance with database configuration
const pool = new Pool({
  user: 'postgres',       // Your PostgreSQL username
  host: 'localhost',      // Database server host
  database: 'pfe',        // Name of your database
  password: '4321',       // Your PostgreSQL password
  port: 5432,             // Default PostgreSQL port
});

// Function to execute queries with parameters
export const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result.rows; // Return only the rows for convenience
  } catch (err) {
    console.error('Query error:', err.message); // Log query error
    throw err; // Rethrow the error for further handling
  }
};
