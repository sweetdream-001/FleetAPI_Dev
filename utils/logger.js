import fs from "fs";
import path from "path";
import { createLogger, format, transports } from "winston";

const LOG_DIR = path.join(process.cwd(), "logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

const logger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    // Console logging
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    // File logging - general
    new transports.File({
      filename: path.join(LOG_DIR, "app.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File logging - errors
    new transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

export default {
  info: async (message, metadata = {}) => {
    logger.info(message, metadata);
  },
  error: async (message, metadata = {}) => {
    logger.error(message, metadata);
  },
  warn: async (message, metadata = {}) => {
    logger.warn(message, metadata);
  },
};
