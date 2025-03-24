// utils/logger.js
export default function logger(message) {
    const time = new Date().toISOString();
    console.log(`[${time}] ${message}`);
  }
  