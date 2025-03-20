// // filepath: /home/ec2-user/FleetAPI_Dev/server.js
// require('dotenv').config();
// const express = require('express');
// const axios = require('axios');
// const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');
// const app = express();

// app.use(express.static('public'));
// app.use(express.json());
// app.use(cookieParser());

// // Database connection
// const pool = require('./database/db');

// // Store token in the database
// async function storeToken(userId, tokens) {
//   await pool.query(
//     'INSERT INTO tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token), expires_at = VALUES(expires_at)',
//     [userId, tokens.access_token, tokens.refresh_token, new Date(tokens.expires_at)]
//   );
// }

// // Authorization Endpoint
// app.get('/auth', (req, res) => {
//   const authUrl = `https://auth.tesla.com/oauth2/v3/authorize?&client_id=${process.env.TESLA_CLIENT_ID}&locale=en-US&prompt=login&redirect_uri=${process.env.TESLA_REDIRECT_URI}&response_type=code&scope=openid%20vehicle_device_data%20vehicle_cmds%20offline_access&state=${process.env.STATE}`;
//   res.redirect(authUrl);
// });

// // Callback handler
// app.get('/auth/callback', async (req, res) => {
//   try {
//     const { code } = req.query;

//     // Exchange code for tokens
//     const response = await axios.post('https://auth.tesla.com/oauth2/v3/token', {
//       grant_type: 'authorization_code',
//       client_id: process.env.TESLA_CLIENT_ID,
//       client_secret: process.env.TESLA_CLIENT_SECRET,
//       code,
//       redirect_uri: process.env.TESLA_REDIRECT_URI
//     });

//     // Decode and store tokens
//     const { access_token, refresh_token, expires_in } = response.data;
//     const decoded = jwt.decode(access_token);
//     const userId = decoded.sub;

//     await storeToken(userId, {
//       access_token,
//       refresh_token,
//       expires_at: Date.now() + (expires_in * 1000)
//     });

//     // Set refresh token in secure cookie
//     res.cookie('refreshToken', refresh_token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
//     });

//     res.send('Authentication successful! You can close this window.');
//   } catch (error) {
//     console.error('Auth error:', error.response.data);
//     res.status(500).send('Authentication failed');
//   }
// });

// // Token Refresh Endpoint
// app.post('/auth/refresh', async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;

//     if (!refreshToken) {
//       return res.status(401).send('Refresh token missing');
//     }

//     const response = await axios.post('https://auth.tesla.com/oauth2/v3/token', {
//       grant_type: 'refresh_token',
//       client_id: process.env.TESLA_CLIENT_ID,
//       client_secret: process.env.TESLA_CLIENT_SECRET,
//       refresh_token: refreshToken
//     });

//     const { access_token, expires_in } = response.data;

//     res.json({ access_token, expires_in });
//   } catch (error) {
//     console.error('Error refreshing token:', error.response.data);
//     res.status(401).send('Invalid refresh token');
//   }
// });

// // Logout Endpoint
// app.post('/auth/logout', (req, res) => {
//   res.clearCookie('refreshToken'); // Remove the cookie
//   res.status(200).send('Logged out successfully');
// });

// // Start server
// app.listen(process.env.PORT, () => {
//   console.log(`Server running on port ${process.env.PORT}`);
// });

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const { saveRefreshToken } = require('./database/db');

app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());

// Temporary storage for access tokens (use database in production)
let accessTokenStore = {};

// Authorization Endpoint
app.get('/auth', (req, res) => {
  const authUrl = `https://auth.tesla.com/oauth2/v3/authorize?&client_id=${process.env.TESLA_CLIENT_ID}&locale=en-US&prompt=login&redirect_uri=${process.env.TESLA_REDIRECT_URI}&response_type=code&scope=openid%20vehicle_device_data%20vehicle_cmds%20offline_access&state=${process.env.STATE}`;
  
  res.redirect(authUrl);
});

// Callback handler
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    // Exchange code for tokens
    const response = await axios.post('https://auth.tesla.com/oauth2/v3/token', {
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
    await saveRefreshToken(userId, refresh_token, new Date(Date.now() + (expires_in * 1000)));

    // Set refresh token in secure cookie
    res.cookie('refreshToken', refresh_token, {
      httpOnly: true, // Prevent JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Protect against CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.send('Authentication successful! You can close this window.');
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

    const response = await axios.post('https://auth.tesla.com/oauth2/v3/token', {
      grant_type: 'refresh_token',
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      refresh_token: refreshToken
    });

    const { access_token, expires_in } = response.data;
    const decoded = jwt.decode(access_token);
    const userId = decoded.sub;

    // Update access token in memory
    accessTokenStore[userId] = {
      access_token,
      expires_at: Date.now() + (expires_in * 1000)
    };

    res.json({ access_token });
  } catch (error) {
    console.error('Refresh error:', error.response.data);
    res.status(401).send('Token refresh failed');
  }
});

// Logout Endpoint
app.post('/auth/logout', (req, res) => {
  res.clearCookie('refreshToken'); // Remove the cookie
  res.status(200).send('Logged out successfully');
});

// Start server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});