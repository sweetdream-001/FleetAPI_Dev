import express from 'express';
import axios from 'axios';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import telemetryRouter from './routes/telemetry.js';
import db from './database/db.js';
import vehicleService from './services/vehicleService.js';
import checkToken from './middleware/checkTokenMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.static('public'));
app.use(express.json()); 
app.use(cookieParser());

// Temporary storage for access tokens (use database in production)
const accessTokenStore = {};

// // Generate and serve the public key
// const keys = generateKeyPair();
app.get('/test', (req, res) => {  
  res.json({ message: 'Welcome to the Fleet API' });
});
// Authorization Endpoint
app.get('/auth', (req, res) => {
  const authUrl = `${process.env.TESLA_AUTH_URL}?&client_id=${process.env.TESLA_CLIENT_ID}&locale=en-US&prompt=login&redirect_uri=${process.env.TESLA_REDIRECT_URI}&response_type=code&scope=openid%20vehicle_device_data%20vehicle_cmds%20offline_access&state=${process.env.STATE}`;
  res.redirect(authUrl);
});

// Authorization Endpoint
app.get('/pairKey', (req, res) => {
  const keyUrl = `https://tesla.com/_ak/${process.env.DOMAIN}`;
  res.redirect(keyUrl);
});

// Callback handler
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    // Exchange code for tokens
    const response = await axios.post(`${process.env.TESLA_TOKEN_URL}`, {
      grant_type: 'authorization_code',
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      code,
      redirect_uri: process.env.TESLA_REDIRECT_URI
    });

    // Decode and store tokens
    const { access_token, refresh_token, expires_in } = response.data;
    const decoded = jwt.decode(access_token);
    const userId = decoded.sub;

    // Store access token in memory
    accessTokenStore[userId] = {
      access_token,
      expires_at: Date.now() + (expires_in * 1000)
    };

    // Store refresh token in database
    await db.saveRefreshToken(userId, refresh_token, new Date(Date.now() + (expires_in * 1000)));

    // Set refresh token in secure cookie
    res.cookie('refreshToken', refresh_token, {
      httpOnly: false, // Prevent JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Protect against CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('access_token', access_token, {
      httpOnly: false, // Prevent JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Protect against CSRF attacks
      maxAge:  8 * 60 * 60 * 1000, // 8 hours
    });
    // res.send('Authentication successful! You can close this window.');
    // In the callback handler, after successful authentication
    // res.sendFile(path.join(__dirname, 'public', 'vehicles.html'));
    // Redirect to the vehicles page
    res.redirect('/index.html');
  } catch (error) {
    console.error('Auth error:', error.response.data);
    res.status(500).send('Authentication failed');
  }
});

// Token Refresh Endpoint
app.post('/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).send('Refresh token missing');
    }

    const response = await axios.post(`${process.env.TESLA_TOKEN_URL}`, {
      grant_type: 'refresh_token',
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      refresh_token: refreshToken
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const decoded = jwt.decode(access_token);
    const userId = decoded.sub;

    // Update access token in memory
    accessTokenStore[userId] = {
      access_token,
      expires_at: Date.now() + (expires_in * 1000)
    };
    
        // Update refresh token in database
    await db.updateRefreshToken(userId, refresh_token, new Date(Date.now() + (expires_in * 1000)));

    // Set new refresh token in secure cookie
    res.cookie('refreshToken', refresh_token, {
      httpOnly: false, // Prevent JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Protect against CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('access_token', access_token, {
      httpOnly: false, // Prevent JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Protect against CSRF attacks
      maxAge:  8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({ access_token });
  } catch (error) {
    console.error('Refresh error:', error.response.data);
    res.status(401).send('Token refresh failed');
  }
});


// Logout Endpoint
app.post('/auth/logout', (req, res) => {
  res.clearCookie('refreshToken'); // Remove the cookie
  res.clearCookie('access_token'); // Remove the cookie
  res.status(200).send('Logged out successfully');
});

//GET vehicles
app.get('/api/vehicles', async (req, res) => {
  try {
    const accessToken = req.cookies.access_token;
    const vehicles = await vehicleService.fetchVehicleData(accessToken);

    // Update signing status for each vehicle
    for (const vehicle of vehicles) {
      await vehicleService.updateVehicleSigningStatus(vehicle.vin, accessToken);
    }

    
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Error fetching vehicle information' });
  }
}); 

app.use('/api/telemetry', telemetryRouter);
// Serve the vehicles page
// 
app.get('/api/fleetstatus', async (req, res) => {
  try {
    const accessToken = req.cookies.access_token;
    const vehicles = await vehicleService.fetchVehicleData(accessToken);

    for (const vehicle of vehicles) {
      await vehicleService.updateVehicleSigningStatus(vehicle.vin, accessToken);
      const fleetStatus = await vehicleService.fetchFleetStatus(vehicle.vin, accessToken);
      vehicle.fleet_status = fleetStatus;
    }

    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Error fetching vehicle information' });
  }
});


// Start server
const server = app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Closing server...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});