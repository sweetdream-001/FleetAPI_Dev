/**
 *  vehicleCommand.js
 *  Path: ~/FleetAPI_Dev/routes/
 */

import express from "express";
import axios from "axios";
import https from "https";

import dotenv from "dotenv";
dotenv.config();
const router = express.Router();

//test router
router.get("/", (req, res) => {
  res.send("vehicleCommand route");
});

//GET vehicles
router.get("/vehicles", async (req, res) => {
  try {
    const accessToken = req.cookies.access_token;
    const vehicles = await vehicleService.fetchVehicleData(accessToken);

    // Update signing status for each vehicle
    for (const vehicle of vehicles) {
      await vehicleService.updateVehicleSigningStatus(vehicle.vin, accessToken);
    }

    res.json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ error: "Error fetching vehicle information" });
  }
});

//
router.post("/", async (req, res) => {
  const { vin, command, parameters } = req.body;
  const accessToken = req.cookies.access_token;

  try {
    const vcpResponse = await axios.post(
      `https://localhost:4443/api/1/vehicles/${vin}/command/${command}`,
      parameters,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Accept self-signed TLS cert (only dev!)
      }
    );
    res.json(vcpResponse.data);
  } catch (error) {
    console.error("VCP request error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

export default router;
