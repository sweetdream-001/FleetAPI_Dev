/**
 *  authRouter.js
 *  Path: ~/FleetAPI_Dev/routes/
 */
dotenv.config();
import express from "express";
import axios from "axios";
import db from "../database/db.js";

import dotenv from "dotenv";

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ message: "authRouter works!" });
});

// Authorization Endpoint
router.get("/", (req, res) => {
  const authUrl = `${process.env.TESLA_AUTH_URL}?&client_id=${process.env.TESLA_CLIENT_ID}&locale=en-US&prompt=login&redirect_uri=${process.env.TESLA_REDIRECT_URI}&response_type=code&scope=openid%20vehicle_device_data%20vehicle_cmds%20offline_access&state=${process.env.STATE}`;
  res.redirect(authUrl);
});

// Authorization Endpoint
router.get("/pairKey", (req, res) => {
  const keyUrl = `https://tesla.com/_ak/${process.env.DOMAIN}`;
  res.redirect(keyUrl);
});

// Callback handler
router.get("/callback", async (req, res) => {
  try {
    const { code } = req.query;

    // Exchange code for tokens
    const response = await axios.post(`${process.env.TESLA_TOKEN_URL}`, {
      grant_type: "authorization_code",
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      code,
      redirect_uri: process.env.TESLA_REDIRECT_URI,
    });

    // Decode and store tokens

    const { access_token, refresh_token, expires_in } = response.data;
    const decoded = jwt.decode(access_token);
    const userId = decoded.sub;

    // Store access token in memory
    accessTokenStore[userId] = {
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    };

    // Store refresh token in database
    await db.saveRefreshToken(
      userId,
      refresh_token,
      new Date(Date.now() + expires_in * 1000)
    );

    // Set refresh token in secure cookie
    res.cookie("refreshToken", refresh_token, {
      httpOnly: false, // Prevent JavaScript access
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // Protect against CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie("access_token", access_token, {
      httpOnly: false, // Prevent JavaScript access
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // Protect against CSRF attacks
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });
    // res.send('Authentication successful! You can close this window.');
    // In the callback handler, after successful authentication
    // res.sendFile(path.join(__dirname, 'public', 'vehicles.html'));
    // Redirect to the vehicles page
    res.redirect("/index.html");
  } catch (error) {
    console.error("Auth error:", error.response.data);
    res.status(500).send("Authentication failed");
  }
});

// Token Refresh Endpoint
router.post("/auth/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).send("Refresh token missing");
    }

    const response = await axios.post(`${process.env.TESLA_TOKEN_URL}`, {
      grant_type: "refresh_token",
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const decoded = jwt.decode(access_token);
    const userId = decoded.sub;

    // Update access token in memory
    accessTokenStore[userId] = {
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    };

    // Update refresh token in database
    await db.updateRefreshToken(
      userId,
      refresh_token,
      new Date(Date.now() + expires_in * 1000)
    );

    // Set new refresh token in secure cookie
    res.cookie("refreshToken", refresh_token, {
      httpOnly: false, // Prevent JavaScript access
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // Protect against CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie("access_token", access_token, {
      httpOnly: false, // Prevent JavaScript access
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // Protect against CSRF attacks
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({ access_token });
  } catch (error) {
    console.error("Refresh error:", error.response.data);
    res.status(401).send("Token refresh failed");
  }
});

// Logout Endpoint
router.post("/auth/logout", (req, res) => {
  res.clearCookie("refreshToken"); // Remove the cookie
  res.clearCookie("access_token"); // Remove the cookie
  res.status(200).send("Logged out successfully");
});
export default router;
