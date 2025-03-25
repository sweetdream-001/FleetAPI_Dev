/**
 *  vehicleCommand.js
 *  Path: ~/FleetAPI_Dev/routes/
 */
dotenv.config();
import express from "express";
import axios from "axios";
import https from "https";

import dotenv from "dotenv";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("vehicleCommand route");
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
