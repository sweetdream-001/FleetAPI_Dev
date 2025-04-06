import express from "express";
import vehicleStatusPoller from "../services/vehicleStatusPoller.js";

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ message: "Vehicle Status Router works!" });
});

router.post("/start", (req, res) => {
  vehicleStatusPoller.startPolling();
  res.json({ message: "Vehicle status polling started" });
});

router.post("/stop", (req, res) => {
  vehicleStatusPoller.stopPolling();
  res.json({ message: "Vehicle status polling stopped" });
});

router.get("/status", (req, res) => {
  const status = Array.from(vehicleStatusPoller.vehicleStates.entries()).map(
    ([vin, state]) => ({
      vin,
      isAwake: state.isAwake,
      lastChecked: state.lastChecked,
      pollingInterval: state.isAwake ? "60s" : "600s",
    })
  );

  res.json({ status });
});

export default router;
