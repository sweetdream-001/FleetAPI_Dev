/**
 *    jwsGenerator.js
 *    ~/FleetAPI_Dev/services/
 */
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

export async function generateJWSToken(token, fields) {
  // 1. Load private key
  const privateKeyPath = path.join(__dirname, "./keys/private-key.pem");
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");

  const caPath = path.join(__dirname, "./keys/tls-cert.pem");
  const ca = fs.readFileSync(caPath, "utf8");

  const host = process.env.DOMAIN;
  const decoded = jwt.decode(token);

  // 2. Create JWS header
  const header = {
    alg: "ES256", // ECDSA using P-256 and SHA-256
    typ: "JWT",
    kid: "qDssh3aSWG2ONXM7K31VWEUEnA4",
  };

  // 3. Create payload (configuration)
  const payload = {
    port: 443,
    ca: ca,
    hostname: host,
    fields: fields,
    iss: "aHR0cHM6Ly9hdXRoLnRlc2xhLmNvbS9vYXV0aDIvdjMvbnRz",
    sub: decoded.sub,
    aud: "com.tesla.fleet.TelemetryClient",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
    jti: uuidv4(),
  };

  const jwtToken = jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    header: header,
  });

  return jwtToken;
}
