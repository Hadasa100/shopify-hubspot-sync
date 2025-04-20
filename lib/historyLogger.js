import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('logs');
const LOG_PATH = path.join(LOG_DIR, 'sync-history.json');

export function saveSyncResult({ type, timestamp = new Date().toISOString(), successes, failures }) {
  const entry = {
    type,
    timestamp,
    total: successes.length + failures.length,
    successCount: successes.length,
    failureCount: failures.length,
    successes,
    failures,
  };

  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  let data = [];
  if (fs.existsSync(LOG_PATH)) {
    data = JSON.parse(fs.readFileSync(LOG_PATH));
  }

  data.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2));
}

export function getSyncHistory() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH));
}
