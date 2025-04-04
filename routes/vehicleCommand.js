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

//
router.post("/commands", async (req, res) => {
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

router.get("/status/:vin", async (req, res) => {
  const vin = req.params.vin;
  const accessToken = req.cookies.access_token;

  try {
    const vcpResponse = await axios.get(
      `https://localhost:4443/api/1/vehicles/${vin}/vehicle_data`,
      parameters,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Accept self-signed TLS cert (only dev!)
      }
    );
    console.log(
      "VCP response:@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",
      vcpResponse.data
    );
    res.json(vcpResponse.data);
  } catch (error) {
    console.error("VCP request error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});
export default router;
