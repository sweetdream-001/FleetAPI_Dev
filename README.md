# Tesla Fleet API Service

## Overview

Enterprise-grade API service for Tesla vehicle fleet management, providing real-time telemetry tracking, secure command execution, and automated status monitoring using Node.js and MySQL.

## Tech Stack

- **Runtime**: Node.js
- **Database**: MySQL 8.0
- **Authentication**: OAuth2 with Tesla API
- **Background Jobs**: node-cron
- **Logging**: Winston + MySQL

## Project Structure

```
FleetAPI_Dev/
├── database/
│   ├── db.js              # Database operations & schemas
│   └── init.js            # Database initialization
├── middleware/
│   └── checkTokenMiddleware.js  # Token validation & refresh
├── routes/
│   ├── authRouter.js      # Tesla OAuth flow
│   ├── vehicleCommand.js  # Vehicle control endpoints
│   ├── vehicleRouter.js   # Vehicle management
│   └── telemetry.js       # Telemetry data handling
├── services/
│   └── vehicleStatusPoller.js  # Automated status polling
├── utils/
│   └── logger.js          # Centralized logging
└── server.js              # Application entry point
```

## Quick Start

### Prerequisites

- Node.js >= 16.x
- MySQL 8.0
- Tesla Developer Account
- Linux/Unix environment

### Installation

1. Clone and install dependencies:

```bash
git clone <repository-url>
cd FleetAPI_Dev
npm install
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Initialize database:

```bash
mysql -u root -p
CREATE DATABASE tesla_fleet;
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'StrongPass123!';
GRANT ALL PRIVILEGES ON tesla_fleet.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
exit;

# Install dependencies if needed
npm install mysql2 dotenv

# Initialize tables
node database/init.js
```

## Configuration

Required environment variables:

```ini
# Server Configuration
PORT=3000
NODE_ENV=development

# Tesla API
BASE_URL=https://fleet-api.prd.na.vn.cloud.tesla.com
TESLA_AUTH_URL=https://auth.tesla.com/oauth2/v3/authorize
TESLA_TOKEN_URL=https://auth.tesla.com/oauth2/v3/token
TESLA_CLIENT_ID=your_client_id
TESLA_CLIENT_SECRET=your_client_secret
TESLA_REDIRECT_URI=https://your-domain.com/auth/callback

# Database
DB_HOST=localhost
DB_NAME=tesla_fleet
DB_USER=app_user
DB_PASSWORD=StrongPass123!
```

## Database Schema

### Tokens Table

```sql
CREATE TABLE tokens (
    user_id VARCHAR(255) PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Vehicle Status Table

```sql
CREATE TABLE vehicle_status (
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
```

## API Endpoints

### Authentication

- `GET /auth/login` - Initiate Tesla OAuth
- `GET /auth/callback` - OAuth callback handler

### Vehicle Operations

- `GET /api/vehicles` - List registered vehicles
- `GET /api/vehicle/:vin/status` - Get real-time status
- `POST /api/vehicle/:vin/command` - Execute vehicle command

### Telemetry

- `GET /api/telemetry/:vin` - Current telemetry data
- `GET /api/telemetry/:vin/history` - Historical data

## Development

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Monitoring

```bash
# View logs
tail -f logs/app.log

# Check database status
mysql -u app_user -p'StrongPass123!' tesla_fleet -e "
SELECT 'tokens' as table_name, COUNT(*) as count FROM tokens
UNION ALL
SELECT 'vehicle_status', COUNT(*) FROM vehicle_status;"
```

### Database Management

```bash
# Reset tables (caution: deletes all data)
mysql -u app_user -p'StrongPass123!' tesla_fleet -e "
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE tokens;
TRUNCATE TABLE vehicle_status;
SET FOREIGN_KEY_CHECKS = 1;"
```

## Logging

- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Database logs: `logs` table

## Security Notes

- All tokens are stored encrypted at rest
- HTTPS required in production
- Rate limiting implemented for API endpoints
- Automatic token refresh mechanism

## Production Deployment

1. Set NODE_ENV=production
2. Configure secure cookie settings
3. Set up proper SSL certificates
4. Configure proper MySQL credentials
5. Set up monitoring and alerting

## Contributing

1. Branch naming: `feature/description` or `fix/description`
2. Follow ESLint configuration
3. Include tests for new features
4. Update documentation

## License

MIT License - see LICENSE file for details

## Author

Your Name
Version 1.0.0
