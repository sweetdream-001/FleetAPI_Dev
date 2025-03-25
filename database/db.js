/**
 *  db.js
 *  Path: ~/FleetAPI_Dev/database
 */
import { createPool } from "mysql";
import { promisify } from "util";
import dotenv from "dotenv";
dotenv.config();
// Create a connection pool
const pool = createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Promisify the query function for easier async/await usage
pool.query = promisify(pool.query);

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
    console.error("Error creating tokens table:", err);
  } else {
    console.log("Tokens table created or already exists.");
  }
});

// Function to save refresh token to the database
async function saveRefreshToken(userId, refreshToken, expiresAt) {
  await pool.query(
    "INSERT INTO tokens (user_id, refresh_token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token), expires_at = VALUES(expires_at)",
    [userId, refreshToken, expiresAt]
  );
}

// Function to update refresh token in the database
async function updateRefreshToken(userId, refreshToken, expiresAt) {
  await pool.query(
    "UPDATE tokens SET refresh_token = ?, expires_at = ? WHERE user_id = ?",
    [refreshToken, expiresAt, userId]
  );
}

// Function to retrieve refresh token from the database
async function getRefreshToken(userId) {
  try {
    const [result] = await pool.query(
      "SELECT refresh_token, expires_at FROM tokens WHERE user_id = ?",
      [userId]
    );
    return result
      ? { refreshToken: result.refresh_token, expiresAt: result.expires_at }
      : null;
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    throw error;
  }
}

//Vehicle

const createVehiclesTable = `
  CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vin VARCHAR(255) NOT NULL UNIQUE,
    should_sign BOOLEAN DEFAULT FALSE,
    version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(createVehiclesTable, (err) => {
  if (err) {
    console.error("Error creating vehicles table:", err);
  } else {
    console.log("Vehicles table created or already exists.");
  }
});

// Insert or update vehicle info
async function saveVehicle(vin, shouldSign, version) {
  await pool.query(
    "INSERT INTO vehicles (vin, should_sign, version) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE should_sign = VALUES(should_sign), version = VALUES(version)",
    [vin, shouldSign, version]
  );
}

// Get vehicle info by VIN
async function getVehicle(vin) {
  const [rows] = await pool.query("SELECT * FROM vehicles WHERE vin = ?", [
    vin,
  ]);
  return rows[0];
}

export default {
  pool,
  saveRefreshToken,
  getRefreshToken,
  updateRefreshToken,
  saveVehicle,
  getVehicle,
};
