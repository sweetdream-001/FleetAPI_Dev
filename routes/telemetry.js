/**
 *  telemetry.js
 *  Path: ~/FleetAPI_Dev/routes/
 */

import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Load private and public keys
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const caPath = path.join(__dirname, "../services/keys/tls-cert.pem");
const ca = fs.readFileSync(caPath, "utf8");

router.get("/", (req, res) => {
  res.send("Telemetry route");
});

// create method
router.get("/configureStatus/:vin", async (req, res) => {
  const vin = req.params.vin;
  const accessToken = req.cookies.access_token;

  try {
    const response = await axios.get(
      `${process.env.BASE_URL}/api/1/vehicles/${vin}/fleet_telemetry_config`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.log(error);
  }
});
router.post("/configureTelemetry", async (req, res) => {
  const { vin } = req.body;
  const accessToken = req.cookies.access_token;

  const telemetryConfig = {
    hostname: process.env.DOMAIN,
    port: 443,
    ca: ca,
    fields: {
      VehicleSpeed: { interval_seconds: 10 },
      Location: { interval_seconds: 10 },
      Odometer: { interval_seconds: 10 },
      BatteryLevel: { interval_seconds: 10 },
    },
  };

  try {
    const response = await axios.post(
      `https://localhost:4443/api/1/vehicles/fleet_telemetry_config`,
      {
        vins: [vin],
        config: telemetryConfig,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Dev only
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(
      "Error configuring telemetry via VCP:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Telemetry configuration failed" });
  }
});
router.post("/webhook", express.json(), async (req, res) => {
  console.log("📡 Incoming Telemetry:", req.body); // ✅ Key log
  res.status(200).send("OK");
});
//test streaming

// router.post("/webhook", express.json(), (req, res) => {
//   const vin = req.get("X-Tesla-Vin");
//   const signature = req.get("X-Tesla-Signature");
//   const timestamp = req.get("X-Tesla-Timestamp");
//   const rawBody = JSON.stringify(req.body);
//   const signedPayload = `${timestamp}.${rawBody}`;

//   // TODO: Verify signature with your public key
//   const publicKey = fs.readFileSync("../services/keys/public-key.pem");
//   const isValid = crypto.verify(
//     "sha256",
//     Buffer.from(signedPayload),
//     {
//       key: publicKey,
//       padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
//     },
//     Buffer.from(signature, "base64")
//   );

//   if (!isValid) {
//     console.error("Invalid signature. Rejecting request.");
//     return res.status(403).send("Unauthorized");
//   }

//   // Store data
//   // await db.saveTelemetryData({ vin, ...req.body });
//   console.log(
//     "######################################################################################"
//   );
//   console.log({ vin, ...req.body });
//   console.log(
//     "######################################################################################"
//   );

//   res.status(200).send("Telemetry received");
// });

/**
 * Don't delete this part.
 * This is Tesla Fleet Telemetry Config JWS method
 */

// router.post("/configure", async (req, res) => {
//   const { vin } = req.body;
//   const accessToken = req.cookies.access_token;
//   try {
//     // 1. Generate JWS token
//     const fields = {
//       VehicleSpeed: { interval_seconds: 10 },
//       Location: { interval_seconds: 10 },
//       Odometer: { interval_seconds: 10 },
//       BatteryLevel: { interval_seconds: 10 },
//     };
//     const jwsToken = await generateJWSToken(accessToken, fields);
//     // 2. Prepare request body
//     const body = {
//       token: jwsToken,
//       vins: [vin],
//     };

//     //3.send request to tesla's api
//     const options = {
//       method: "POST",
//       body: JSON.stringify(body),
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${accessToken}`,
//       },
//     };

//     const response = await fetch(
//       `${process.env.BASE_URL}/api/1/vehicles/fleet_telemetry_config_jws`,
//       options
//     );
//     const data = await response.json();

//     return res.json(data);
//   } catch (error) {
//     console.error("Error:", error.response?.data || error.message);
//     res.status(500).json({ error: "Configuration failed" });
//   }
// });

export default router;
