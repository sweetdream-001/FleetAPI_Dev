import { SignJWT } from 'jose/jwt/sign';
import  crypto from 'crypto';
import { webcrypto } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
globalThis.crypto = webcrypto;

// Load private and public keys
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateJWSToken(vin, host, command) {
  // 1. Load private key
  const privateKeyPath = path.join(__dirname, './keys/private-key.pem');
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  // 2. Create JWS header
  const header = {
    alg: 'ES256', // ECDSA using P-256 and SHA-256
    typ: 'JWT'
  };
  
  // 3. Create payload (configuration)
  const payload = {
    vins: [vin],
    config: {
      host, // Your Fleet Telemetry server domain (e.g., "your-domain.com")
      port: 443,
      command // Fields to stream (e.g., ["vehicle_speed", "battery_level"])
    },
    exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
  };

  // 4. Sign the token
  const ecPrivateKey = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    type: 'sec1' // Required for EC private keys
  });

  const jwt = await new SignJWT(payload)
    .setProtectedHeader(header)
    .sign(ecPrivateKey);

  return jwt;
}