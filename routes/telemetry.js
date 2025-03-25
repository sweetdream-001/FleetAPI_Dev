/**
 *  telemetry.js
 *  Path: ~/FleetAPI_Dev/routes/
 */
dotenv.config();
import express from "express";
import { generateJWSToken } from "../services/jwsGenerator.js";

import dotenv from "dotenv";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Telemetry route");
});

router.post("/configure", async (req, res) => {
  const { vin } = req.body;
  const accessToken = req.cookies.access_token;
  try {
    // 1. Generate JWS token
    const fields = {
      VehicleSpeed: { interval_seconds: 10 },
      Location: { interval_seconds: 10 },
      Odometer: { interval_seconds: 10 },
      BatteryLevel: { interval_seconds: 10 },
    };
    const jwsToken = await generateJWSToken(accessToken, fields);
    // 2. Prepare request body
    const body = {
      token: jwsToken,
      vins: [vin],
    };

    //3.send request to tesla's api
    const options = {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const response = await fetch(
      `${process.env.BASE_URL}/api/1/vehicles/fleet_telemetry_config_jws`,
      options
    );
    const data = await response.json();

    return res.json(data);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Configuration failed" });
  }
});

export default router;
