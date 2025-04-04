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

// const caPath = path.join(__dirname, "./certs/fullchain.pem");
const caPath = path.join(__dirname, "../services/keys/mainCA.pem");

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

    console.log("@@@@@@@@@@@@@@", response.data);
    res.json(response.data);
  } catch (error) {
    console.log(error);
  }
});
//error
router.get("/configureErrors/:vin", async (req, res) => {
  const vin = req.params.vin;
  const accessToken = req.cookies.access_token;

  try {
    const response = await axios.get(
      `${process.env.BASE_URL}/api/1/vehicles/${vin}/fleet_telemetry_errors`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log("-----------------", response.data);
    res.json(response.data);
  } catch (error) {
    console.log(error);
  }
});

router.delete("/configureDelete/:vin", async (req, res) => {
  const vin = req.params.vin;
  const accessToken = req.cookies.access_token;

  try {
    const response = await axios.delete(
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

export default router;
