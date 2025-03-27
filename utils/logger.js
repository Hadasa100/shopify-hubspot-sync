export default function logger(res = '', message, showFrontend = false) {
  if (showFrontend && res && !res.writableEnded) {
    try {
      res.write(message + '\n');
    } catch (err) {
      console.warn('⚠️ Failed to write to response:', err.message);
    }
  }

  const time = new Date().toISOString();
  console.log(`[${time}] ${message}`);
}
