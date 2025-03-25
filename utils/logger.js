// utils/logger.js
export default function logger(res = '', message, showfrontend = false) {
  if (showfrontend) {
    res.write(message + '\n');
  }
  const time = new Date().toISOString();
  console.log(`[${time}] ${message}`);
}