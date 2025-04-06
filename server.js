/**
 * Tesla Fleet API Server
 *
 * Main application server that handles Tesla vehicle communication,
 * authentication, and real-time vehicle status polling.
 *
 * @author Your Name
 * @version 1.0.0
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { spawn } from "child_process";
import path from "path";

// Route imports
import authRouter from "./routes/authRouter.js";
import vehicleCommand from "./routes/vehicleCommand.js";
import vehicleRouter from "./routes/vehicleRouter.js";
import telemetryRouter from "./routes/telemetry.js";
import vehicleStatusRouter from "./routes/vehicleStatusRouter.js";

// Service imports
import vehicleStatusPoller from "./services/vehicleStatusPoller.js";

// Load environment variables
dotenv.config();

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

// Middleware Configuration
app.use(cors()); // Enable CORS for all routes
app.use(express.static("public")); // Serve static files
app.use(express.json()); // Parse JSON payloads
app.use(cookieParser()); // Parse cookies

/**
 * Health check endpoint
 * @route GET /test
 * @returns {object} Status message
 */
app.get("/test", (req, res) => {
  res.json({ message: "Welcome to the Fleet API" });
});

// API Routes Configuration
app.use("/auth", authRouter); // Authentication routes
app.use("/api/telemetry", telemetryRouter); // Vehicle telemetry endpoints
app.use("/api/vehicles", vehicleRouter); // Vehicle management
app.use("/api/vehicle", vehicleCommand); // Vehicle commands
app.use("/api/poller", vehicleStatusRouter); // Status polling control

/**
 * Tesla Vehicle Command Proxy (VCP) Configuration
 * Handles secure communication with Tesla vehicles
 */
const vcpPath = path.join(
  process.cwd(),
  "./vehicle-command/cmd/tesla-http-proxy/tesla-http-proxy"
);

// VCP launch arguments
const vcpArgs = [
  "-port",
  "4443",
  "-cert",
  path.join(process.cwd(), "./vehicle-command/cmd/tesla-http-proxy/cert.pem"),
  "-tls-key",
  path.join(process.cwd(), "./vehicle-command/cmd/tesla-http-proxy/key.pem"),
  "-key-file",
  path.join(process.cwd(), "./services/keys/private-key.pem"),
  "-disable-session-cache",
  "-verbose",
];

/**
 * Spawn VCP subprocess and handle its lifecycle
 * @type {ChildProcess}
 */
const vcpProcess = spawn(vcpPath, vcpArgs, { stdio: ["pipe", "pipe", "pipe"] });

// VCP Process Event Handlers
vcpProcess.stdout.on("data", (data) => console.log(`[VCP stdout]: ${data}`));
vcpProcess.stderr.on("data", (data) => console.error(`[VCP stderr]: ${data}`));
vcpProcess.on("error", (err) =>
  console.error("Failed to start VCP subprocess:", err)
);
vcpProcess.on("close", (code) =>
  console.log(`VCP subprocess exited with code ${code}`)
);

/**
 * Protobuf Data Handler
 * Processes incoming vehicle telemetry data
 * @route POST /vcp
 */
app.post(
  "/vcp/",
  express.raw({ type: "application/x-protobuf" }),
  async (req, res) => {
    console.log("📡 Streaming data received:", req);
    res.sendStatus(200);
  }
);

/**
 * Server Initialization
 * Starts the Express server and vehicle status polling
 */
const server = app.listen(process.env.PORT, async () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
  await vehicleStatusPoller.startPolling();
});

/**
 * Graceful Shutdown Handler
 * Ensures clean shutdown of server and background services
 */
process.on("SIGTERM", () => {
  console.log("📥 Closing server...");
  server.close(() => {
    console.log("✅ Server closed.");
    vehicleStatusPoller.stopPolling();
    process.exit(0);
  });
});
