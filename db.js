import pkg from 'pg';
const { Pool } = pkg;


// const pool = new Pool({
//   user: 'postgres',     
//   host: 'localhost',    
//   database: 'pfe',     
//   password: '',      
//   port: 5432,          
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


export const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result.rows; // Return only the rows for convenience
  } catch (err) {
    console.error('Query error:', err.message); // Log query error
    throw err; // Rethrow the error for further handling
  }
};
