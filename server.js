/**
 *    server.js file
 *    Path: ~/FleetAPI_Dev/server.js
 */

import express from "express";
import axios from "axios";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import dotenv from "dotenv";
import { spawn } from "child_process";
import path from "path";

import authRouter from "./routes/authRouter.js";
import vehicleCommand from "./routes/vehicleCommand.js";
import vehicleRouter from "./routes/vehicleRouter.js";
import telemetryRouter from "./routes/telemetry.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

// // Generate and serve the public key
app.get("/test", (req, res) => {
  res.json({ message: "Welcome to the Fleet API" });
});

//routers
app.use("/auth", authRouter);
app.use("/api/telemetry", telemetryRouter);
app.use("/api/vehicles", vehicleRouter);
app.use("/api/vehicle", vehicleCommand);

/**
 *   Development Server
 */

//Launch Tesla VCP subprocess
const vcpPath = path.join(
  process.cwd(),
  "./vehicle-command/cmd/tesla-http-proxy/tesla-http-proxy"
);
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

const vcpProcess = spawn(vcpPath, vcpArgs, { stdio: ["pipe", "pipe", "pipe"] });

vcpProcess.stdout.on("data", (data) => {
  console.log(`[VCP stdout]: ${data}`);
});

vcpProcess.stderr.on("data", (data) => {
  console.error(`[VCP stderr]: ${data}`);
});

vcpProcess.on("error", (err) => {
  console.error("Failed to start VCP subprocess:", err);
});

vcpProcess.on("close", (code) => {
  console.log(`VCP subprocess exited with code ${code}`);
});

// Start server
const server = app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

process.on("SIGTERM", () => {
  console.log("Closing server...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
/**
 *
 *    End of Development Server
 */

/**
 *   Start Production Server
 */
// let vcpProcess;
// let restartCount = 0;
// const MAX_RESTARTS = 5; // avoid infinite restarts

// function launchVCP() {
//   const vcpPath = path.resolve(
//     process.cwd(),
//     "./vehicle-command/cmd/tesla-http-proxy/tesla-http-proxy"
//   );
//   const vcpArgs = [
//     "-port",
//     "4443",
//     "-cert",
//     path.resolve(
//       process.cwd(),
//       "./vehicle-command/cmd/tesla-http-proxy/cert.pem"
//     ),
//     "-tls-key",
//     path.resolve(
//       process.cwd(),
//       "./vehicle-command/cmd/tesla-http-proxy/key.pem"
//     ),
//     "-key-file",
//     path.resolve(process.cwd(), "./services/keys/private-key.pem"),
//     "-disable-session-cache",
//     "-verbose",
//   ];

//   vcpProcess = spawn(vcpPath, vcpArgs, { stdio: ["pipe", "pipe", "pipe"] });

//   vcpProcess.stdout.on("data", (data) => {
//     console.log(`[VCP stdout]: ${data}`);
//   });

//   vcpProcess.stderr.on("data", (data) => {
//     console.error(`[VCP stderr]: ${data}`);
//   });

//   vcpProcess.on("error", (err) => {
//     console.error("Failed to start VCP subprocess:", err);
//   });

//   vcpProcess.on("exit", (code, signal) => {
//     console.warn(`VCP exited with code ${code}, signal ${signal}`);
//     if (restartCount < MAX_RESTARTS) {
//       console.log("Attempting to restart VCP...");
//       restartCount += 1;
//       setTimeout(launchVCP, 3000); // Restart after 3 sec delay
//     } else {
//       console.error("Maximum VCP restarts exceeded.");
//     }
//   });
// }

// const server = app.listen(process.env.PORT, () => {
//   console.log(`Server running on port ${process.env.PORT}`);
//   launchVCP(); // Start your VCP subprocess clearly here.
// });

// function shutdownServer() {
//   console.log("Closing server...");
//   server.close(() => {
//     console.log("Server closed.");
//     if (vcpProcess) {
//       vcpProcess.kill();
//       console.log("VCP subprocess killed.");
//     }
//     process.exit(0);
//   });
// }

// process.on("SIGTERM", shutdownServer);
// process.on("SIGINT", shutdownServer);
// process.on("uncaughtException", (err) => {
//   console.error("Uncaught Exception:", err);
//   shutdownServer();
// });

/**
 *  End of production server
 */
