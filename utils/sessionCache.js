const sessionCache = new Map();

function setSession(vin, token, expiresInSeconds = 900) {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  sessionCache.set(vin, { token, expiresAt });
}

function getSession(vin) {
  const entry = sessionCache.get(vin);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.token;
  }
  // Expired
  sessionCache.delete(vin);
  return null;
}

function clearSession(vin) {
  sessionCache.delete(vin);
}

export default {
  setSession,
  getSession,
  clearSession,
};
