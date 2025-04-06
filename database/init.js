import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
dotenv.config();

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

async function initializeDatabase() {
  console.log("🔧 Initializing database...");

  try {
    // Create connection with multiple statement support
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    // Define all table creation queries
    const queries = `
            -- Tokens table for OAuth management
            CREATE TABLE IF NOT EXISTS tokens (
                user_id VARCHAR(255) PRIMARY KEY,
                access_token TEXT,
                refresh_token TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Vehicles registration table
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vin VARCHAR(255) NOT NULL UNIQUE,
                should_sign BOOLEAN DEFAULT FALSE,
                version VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Real-time vehicle status table
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

            -- Application configuration table
            CREATE TABLE IF NOT EXISTS app_config (
                key_name VARCHAR(50) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );

            -- System logs table
            CREATE TABLE IF NOT EXISTS logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                level ENUM('info', 'warn', 'error') NOT NULL,
                message TEXT NOT NULL,
                metadata JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_level_timestamp (level, timestamp)
            );
        `;

    // Execute table creation
    await connection.query(queries);
    console.log("✅ Database tables created successfully");

    // Close connection
    await connection.end();
    console.log("🔌 Database connection closed");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

// Run initialization if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default initializeDatabase;
