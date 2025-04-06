import axios from "axios";
import cron from "node-cron";
import db from "../database/db.js";
import logger from "../utils/logger.js";
import vehicleService from "../services/vehicleService.js"; // Assuming you have a vehicleService to fetch vehicle data

class VehicleStatusPoller {
  constructor() {
    this.activePollers = new Map(); // Store polling tasks for each VIN
    this.vehicleStates = new Map(); // Track vehicle states
  }

  async checkVehicleState(vin) {
    try {
      const userId = await db.getConfig("active_user_id");
      const tokens = await db.getTokens(userId);
      const response = await axios.get(
        `${process.env.BASE_URL}/api/1/vehicles/${vin}/vehicle_data`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );
      // Check if the vehicle is awake or driving
      return (
        response.data.response.drive_state.active_route_latitude !==
          undefined &&
        response.data.response.drive_state.active_route_longitude !== null
      );
    } catch (error) {
      console.error(`Error checking vehicle state for ${vin}:`, error.message);
      return false;
    }
  }

  async pollVehicleStatus(vin) {
    try {
      const userId = await db.getConfig("active_user_id");
      const tokens = await db.getTokens(userId);
      const response = await axios.get(
        `${process.env.BASE_URL}/api/1/vehicles/${vin}/vehicle_data`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      const latitude =
        response.data.response.drive_state.active_route_latitude ?? 0;
      const longitude =
        response.data.response.drive_state.active_route_longitude ?? 0;
      const speed = response.data.response.drive_state.speed ?? 0;
      const battery = response.data.response.charge_state.battery_level ?? 0;
      const odometer = response.data.response.vehicle_state.odometer ?? 0;

      await db.saveVehicleStatus(
        vin,
        latitude,
        longitude,
        battery,
        speed,
        odometer
      );
      await logger.info("Vehicle status updated", {
        vin,
        lat: latitude,
        lon: longitude,
        battery: battery,
        speed: speed,
        odometer: odometer,
      });
      console.log(`Status updated for ${vin}`);
    } catch (error) {
      console.error(`Error polling status for ${vin}:`, error.message);
      await logger.error("Failed to poll vehicle status", {
        vin,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  async updatePollingInterval(vin) {
    const isAwake = await this.checkVehicleState(vin);
    const currentState = this.vehicleStates.get(vin);

    if (currentState?.isAwake !== isAwake || !this.activePollers.has(vin)) {
      // Stop existing polling if any
      if (this.activePollers.has(vin)) {
        this.activePollers.get(vin).stop();
      }

      // Set new polling interval based on state
      const interval = isAwake ? "*/1 * * * *" : "*/1 * * * *"; // 1 min or 10 min

      const task = cron.schedule(interval, () => this.pollVehicleStatus(vin));
      this.activePollers.set(vin, task);
      this.vehicleStates.set(vin, { isAwake, lastChecked: new Date() });

      console.log(
        `${vin}: Updated polling to ${isAwake ? "60s" : "600s"} intervals`
      );
    }
  }

  async startPolling() {
    try {
      // Get all vehicles from database

      const userId = await db.getConfig("active_user_id");
      const tokens = await db.getTokens(userId);

      const vehicles = await vehicleService.fetchVehicleData(
        tokens.accessToken
      );
      // Update signing status for each vehicle
      for (const vehicle of vehicles) {
        try {
          const res = await vehicleService.updateVehicleSigningStatus(
            vehicle.vin,
            tokens.accessToken
          );
          if (res.shouldSign) {
            await this.updatePollingInterval(vehicle.vin);
          }
        } catch (error) {
          console.error(
            `Error processing vehicle ${vehicle.vin}:`,
            error.message
          );
          await logger.error("Failed to update vehicle signing status", {
            vin: vehicle.vin,
            error: error.message,
            stack: error.stack,
          });
        }
      }

      // Check vehicle states every 5 minutes
      cron.schedule("*/5 * * * *", async () => {
        for (const vehicle of vehicles) {
          try {
            const res = await vehicleService.updateVehicleSigningStatus(
              vehicle.vin,
              tokens.accessToken
            );
            if (res.shouldSign) {
              await this.updatePollingInterval(vehicle.vin);
            }
          } catch (error) {
            console.error(
              `Error processing vehicle ${vehicle.vin}:`,
              error.message
            );
            await logger.error("Failed to update vehicle signing status", {
              vin: vehicle.vin,
              error: error.message,
              stack: error.stack,
            });
          }
        }
      });
    } catch (error) {
      console.error("Error starting vehicle polling:", error);
    }
  }

  stopPolling() {
    for (const [vin, task] of this.activePollers) {
      task.stop();
      console.log(`Stopped polling for ${vin}`);
    }
    this.activePollers.clear();
    this.vehicleStates.clear();
  }
}

export default new VehicleStatusPoller();
