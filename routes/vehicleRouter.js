/**
 *  vehicleRouter.js
 *  Path: ~/FleetAPI_Dev/routes/
 */

import express from "express";
import vehicleService from "../services/vehicleService.js";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();
//test router
// router.get("/", (req, res) => {
//   res.send("vehicleRouter works!");
// });

//GET vehicles
router.get("/", async (req, res) => {
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
router.get("/fleetstatus", async (req, res) => {
  try {
    const accessToken = req.cookies.access_token;
    const vehicles = await vehicleService.fetchVehicleData(accessToken);

    for (const vehicle of vehicles) {
      await vehicleService.updateVehicleSigningStatus(vehicle.vin, accessToken);
      const fleetStatus = await vehicleService.fetchFleetStatus(
        vehicle.vin,
        accessToken
      );
      vehicle.fleet_status = fleetStatus;
    }

    res.json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ error: "Error fetching vehicle information" });
  }
});
export default router;
