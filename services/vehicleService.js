/**
 *    vehicleService.js
 *    Path: ~/FleetAPI_Dev/services
 *    Vehicle Service Module
 *    Handles all Tesla vehicle-related API interactions and data management
 *    @module vehicleService
 */
import axios from "axios";
import db from "../database/db.js";

/**
 * Fetches vehicle data from Tesla API
 * @param {string} accessToken - Tesla API access token
 * @returns {Promise<Object>} Vehicle data response
 * @throws {Error} When API request fails
 */
async function fetchVehicleData(accessToken) {
  try {
    const response = await axios.get(`${process.env.BASE_URL}/api/1/vehicles`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data.response;
  } catch (error) {
    console.error("Error fetching vehicle data:", error);
    throw error;
  }
}

/**
 * Fetches fleet status for specific vehicle
 * @param {string} vin - Vehicle identification number
 * @param {string} accessToken - Tesla API access token
 * @returns {Promise<Object>} Fleet status data
 * @throws {Error} When API request fails
 */
async function fetchFleetStatus(vin, accessToken) {
  try {
    const body = { vins: [vin] };
    const options = {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const response = await fetch(
      `${process.env.BASE_URL}/api/1/vehicles/fleet_status`,
      options
    );
    return response.json();
  } catch (error) {
    console.error("Error fetching fleet status:", error);
    throw error;
  }
}

/**
 * Updates vehicle signing status in database
 * @param {string} vin - Vehicle identification number
 * @param {string} accessToken - Tesla API access token
 * @returns {Promise<Object>} Updated vehicle status
 * @throws {Error} When update fails
 */
async function updateVehicleSigningStatus(vin, accessToken) {
  const fleetStatus = await fetchFleetStatus(vin, accessToken);
  const shouldSign =
    fleetStatus.response.vehicle_info[vin].vehicle_command_protocol_required ||
    false;
  const version = fleetStatus.response.vehicle_info[vin].firmware_version;
  const fleet_telemetry_version =
    fleetStatus.response.vehicle_info[vin].fleet_telemetry_version;

  await db.saveVehicle(vin, shouldSign, version);
  return { shouldSign, version };
}

/**
 * @exports vehicleService
 * @type {Object}
 * @property {Function} fetchVehicleData - Fetches vehicle data
 * @property {Function} fetchFleetStatus - Fetches fleet status
 * @property {Function} updateVehicleSigningStatus - Updates vehicle signing status
 */
export default {
  fetchVehicleData,
  fetchFleetStatus,
  updateVehicleSigningStatus,
};
