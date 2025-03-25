/**
 *  checkTokenMiddleware.js
 *  Path: ~/FleetAPI_Dev/middleware
 */
import tokenStore from "../utils/tokenStore.js";
import db from "../database/db.js";
import axios from "axios";

async function checkToken(req, res, next) {
  try {
    const accessToken = req.cookies.access_token;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken || !refreshToken) {
      return res.status(401).json({ error: "Missing tokens" });
    }

    const decoded = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64").toString()
    );
    const userId = decoded.sub;

    if (!tokenStore.isTokenExpired(userId)) {
      req.userId = userId;
      req.accessToken = tokenStore.getToken(userId).access_token;
      return next();
    }

    // Token expired → try to refresh
    const response = await axios.post(`${process.env.TESLA_TOKEN_URL}`, {
      grant_type: "refresh_token",
      client_id: process.env.TESLA_CLIENT_ID,
      client_secret: process.env.TESLA_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Save token in store and db
    tokenStore.setToken(userId, access_token, expires_in);
    await db.updateRefreshToken(
      userId,
      refresh_token,
      new Date(Date.now() + expires_in * 1000)
    );

    // Update cookies
    res.cookie("access_token", access_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.cookie("refreshToken", refresh_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.userId = userId;
    req.accessToken = access_token;
    next();
  } catch (err) {
    console.error("Token refresh failed:", err.response?.data || err.message);
    return res.status(401).json({ error: "Token expired and refresh failed" });
  }
}

export default checkToken;
