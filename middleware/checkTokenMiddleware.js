/**
 * Token Authentication Middleware
 *
 * Handles token validation, refresh, and persistence for Tesla Fleet API.
 * Implements OAuth2 token lifecycle management with automatic refresh capability.
 *
 * Features:
 * - Token validation and expiration checking
 * - Automatic token refresh using refresh tokens
 * - Token persistence in both memory and database
 * - Secure cookie management for client-side storage
 *
 * @module middleware/checkToken
 * @requires tokenStore
 * @requires database
 * @requires axios
 * @author Your Name
 * @version 1.0.0
 */

import tokenStore from "../utils/tokenStore.js";
import db from "../database/db.js";
import axios from "axios";

/**
 * Middleware to validate and refresh authentication tokens
 *
 * @async
 * @function checkToken
 * @param {Express.Request} req - Express request object
 * @param {Express.Response} res - Express response object
 * @param {Express.NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 * @throws {Error} When token validation or refresh fails
 */
async function checkToken(req, res, next) {
  try {
    // Extract tokens from cookies
    const accessToken = req.cookies.access_token;
    const refreshToken = req.cookies.refreshToken;

    // Validate token presence
    if (!accessToken || !refreshToken) {
      return res.status(401).json({ error: "Missing tokens" });
    }

    // Decode JWT token to extract user information
    const decoded = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64").toString()
    );
    const userId = decoded.sub;

    // Check if token is still valid
    if (!tokenStore.isTokenExpired(userId)) {
      req.userId = userId;
      req.accessToken = tokenStore.getToken(userId).access_token;
      return next();
    }

    // Token refresh flow
    const response = await axios.post(`${process.env.TESLA_TOKEN_URL}`, {
      grant_type: "refresh_token",
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Update tokens in memory and database
    tokenStore.setToken(userId, access_token, expires_in);
    await db.updateTokens(
      userId,
      access_token,
      refresh_token,
      new Date(Date.now() + expires_in * 1000)
    );

    // Set secure cookies with appropriate expiration
    res.cookie("access_token", access_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.cookie("refreshToken", refresh_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set request properties for downstream middleware
    req.userId = userId;
    req.accessToken = access_token;
    next();
  } catch (err) {
    console.error("Token refresh failed:", err.response?.data || err.message);
    return res.status(401).json({ error: "Token expired and refresh failed" });
  }
}

export default checkToken;
