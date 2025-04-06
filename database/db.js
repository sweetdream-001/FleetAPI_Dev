/**
 * Database Module for Tesla Fleet API
 *
 * Provides a comprehensive database interface for:
 * - Authentication token management
 * - Vehicle data persistence
 * - Real-time telemetry tracking
 * - Application configuration
 *
 * Uses MySQL for data storage with connection pooling for optimal performance.
 *
 * @module database
 * @author Your Name
 * @version 1.0.0
 * @license MIT
 */

import { createPool } from "mysql";
import { promisify } from "util";
import dotenv from "dotenv";

dotenv.config();

/**
 * MySQL connection pool configuration
 * Manages database connections with optimal resource utilization
 * @type {Pool}
 */
const pool = createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Promisify for async/await usage
pool.query = promisify(pool.query);

/**
 * Authentication token management schema
 * Stores OAuth tokens and their lifecycle information
 * @const {string}
 */
const createTokensTable = `
    CREATE TABLE IF NOT EXISTS tokens (
        user_id VARCHAR(255) PRIMARY KEY,
        access_token TEXT,
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

/**
 * Saves or updates authentication tokens for a user
 * @async
 * @param {string} userId - Unique identifier for the user
 * @param {string} accessToken - OAuth2 access token
 * @param {string} refreshToken - OAuth2 refresh token
 * @param {Date} expiresAt - Token expiration timestamp
 * @returns {Promise<void>}
 * @throws {Error} Database operation failure
 */
async function saveTokens(userId, accessToken, refreshToken, expiresAt) {
  await pool.query(
    "INSERT INTO tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), refresh_token = VALUES(refresh_token), expires_at = VALUES(expires_at)",
    [userId, accessToken, refreshToken, expiresAt]
  );
}

async function updateTokens(userId, accessToken, refreshToken, expiresAt) {
  await pool.query(
    "UPDATE tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?",
    [accessToken, refreshToken, expiresAt, userId]
  );
}

async function getTokens(userId) {
  try {
    const [result] = await pool.query(
      "SELECT access_token, refresh_token, expires_at FROM tokens WHERE user_id = ?",
      [userId]
    );
    return result
      ? {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          expiresAt: result.expires_at,
        }
      : null;
  } catch (error) {
    console.error("Error retrieving tokens:", error);
    throw error;
  }
}

/**
 * Vehicle registration schema
 * Stores basic vehicle information and signing preferences
 * @const {string}
 */
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

/**
 * Saves or updates vehicle information
 * @async
 * @param {string} vin - Vehicle Identification Number
 * @param {boolean} shouldSign - Vehicle signing preference
 * @param {string} version - Vehicle software version
 * @returns {Promise<void>}
 */
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

/**
 * Real-time vehicle telemetry schema
 * Tracks vehicle location, status, and performance metrics
 * @const {string}
 */
const createVehicleStatusTable = `
    CREATE TABLE IF NOT EXISTS vehicle_status (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        VIN VARCHAR(17) NOT NULL,
        lat DECIMAL(10, 8) NOT NULL,
        lon DECIMAL(11, 8) NOT NULL,
        battery TINYINT UNSIGNED NOT NULL,
        speed DECIMAL(5, 2) NOT NULL,
        odometer DECIMAL(10, 2) DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_vin (VIN),
        INDEX idx_timestamp (timestamp)
    );
`;

pool.query(createVehicleStatusTable, (err) => {
  if (err) {
    console.error("Error creating vehicle_status table:", err);
  } else {
    console.log("Vehicle_status table created or already exists.");
  }
});

/**
 * Records vehicle telemetry data
 * @async
 * @param {string} vin - Vehicle Identification Number
 * @param {number} lat - Latitude coordinate (decimal degrees)
 * @param {number} lon - Longitude coordinate (decimal degrees)
 * @param {number} battery - Battery level percentage (0-100)
 * @param {number} speed - Current speed in km/h
 * @param {number} odometer - Total distance traveled in km
 * @returns {Promise<void>}
 * @throws {Error} If database operation fails
 */
async function saveVehicleStatus(vin, lat, lon, battery, speed, odometer) {
  await pool.query(
    "INSERT INTO vehicle_status (VIN, lat, lon, battery, speed, odometer) VALUES (?, ?, ?, ?, ?, ?)",
    [vin, lat, lon, battery, speed, odometer]
  );
}

// Get latest vehicle status by VIN
async function getLatestVehicleStatus(vin) {
  const [rows] = await pool.query(
    "SELECT * FROM vehicle_status WHERE VIN = ? ORDER BY timestamp DESC LIMIT 1",
    [vin]
  );
  return rows[0];
}

/**
 * Application configuration schema
 * Stores global settings and runtime configuration
 * @const {string}
 */
const createConfigTable = `
    CREATE TABLE IF NOT EXISTS app_config (
        key_name VARCHAR(50) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
`;

pool.query(createConfigTable, (err) => {
  if (err) {
    console.error("Error creating config table:", err);
  } else {
    console.log("Config table created or already exists.");
  }
});

/**
 * Updates or creates a configuration entry
 * @async
 * @param {string} key - Configuration key identifier
 * @param {string} value - Configuration value
 * @returns {Promise<void>}
 * @throws {Error} If database operation fails
 */
async function setConfig(key, value) {
  await pool.query(
    "INSERT INTO app_config (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [key, value]
  );
}

async function getConfig(key) {
  const [rows] = await pool.query(
    "SELECT value FROM app_config WHERE key_name = ?",
    [key]
  );

  return rows?.value || null;
}

/**
 * Database interface exports
 * Provides a unified API for database operations
 * @exports database
 */
export default {
  pool,
  saveTokens,
  getTokens,
  updateTokens,
  saveVehicle,
  getVehicle,
  saveVehicleStatus,
  getLatestVehicleStatus,
  setConfig,
  getConfig,
};
