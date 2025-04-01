// utils/logger.js
export default function logger(res = '', message, showFrontend = false) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;

  // Always log to server console
  console.log(logLine);

  // Optionally write to client response
  if (showFrontend && res && !res.writableEnded) {
    try {
      res.write(`${message}\n`);
    } catch (err) {
      console.warn(`⚠️ Failed to write to response: ${err.message}`);
    }
  }
}

// Optional: middleware-style wrapper for usage in routes
export function createLogger(res) {
  return (message, showFrontend = false) => logger(res, message, showFrontend);
}
