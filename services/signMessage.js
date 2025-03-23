import  crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { webcrypto } from 'crypto';
globalThis.crypto = webcrypto;

// Load private and public keys
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const privateKeyPath = path.join(__dirname, './keys/private-key.pem');
const publicKeyPath = path.join(__dirname, './keys/public-key.pem');

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
// Message to sign
const message = "Test message to verify key pair";

// Sign the message with the private key
function signMessage(message, privateKey) {
  const signer = crypto.createSign('SHA256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, 'base64'); // Signature in base64 format
}

// Verify the signature with the public key
function verifySignature(message, signature, publicKey) {
  const verifier = crypto.createVerify('SHA256');
  verifier.update(message);
  verifier.end();
  return verifier.verify(publicKey, signature, 'base64'); // Returns true or false
}

// Test the signing and verification process
const signature = signMessage(message, privateKey);
console.log("Signature:", signature);

const isVerified = verifySignature(message, signature, publicKey);
console.log("Keys Match:", isVerified);
