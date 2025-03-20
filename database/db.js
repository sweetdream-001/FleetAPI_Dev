const mysql = require('mysql');
const util = require('util');

// Create a connection pool
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Promisify the query function for easier async/await usage
pool.query = util.promisify(pool.query);

// Create the tokens table if it doesn't exist
const createTokensTable = `
  CREATE TABLE IF NOT EXISTS tokens (
    user_id VARCHAR(255) PRIMARY KEY,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(createTokensTable, (err, results) => {
  if (err) {
    console.error('Error creating tokens table:', err);
  } else {
    console.log('Tokens table created or already exists.');
  }
});

// Function to save refresh token to the database
async function saveRefreshToken(userId, refreshToken, expiresAt) {
  await pool.query(
    'INSERT INTO tokens (user_id, refresh_token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token), expires_at = VALUES(expires_at)',
    [userId, refreshToken, expiresAt]
  );
}

module.exports = {
  pool,
  saveRefreshToken
};