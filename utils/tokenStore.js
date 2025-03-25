/**
 * tokenStore.js file
 * Path: ~/FleetAPI_Dev/utils/
 */

const accessTokenStore = {};

function getToken(userId) {
  return accessTokenStore[userId];
}

function setToken(userId, accessToken, expiresInSeconds) {
  accessTokenStore[userId] = {
    access_token: accessToken,
    expires_at: Date.now() + expiresInSeconds * 1000,
  };
}

function isTokenExpired(userId) {
  const token = accessTokenStore[userId];
  if (!token) return true;
  return token.expires_at < Date.now();
}

export default {
  getToken,
  setToken,
  isTokenExpired,
};
