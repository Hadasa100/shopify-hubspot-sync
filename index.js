import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import webhookRoutes from './routes/webhook.js';
import syncRoutes from './routes/sync.js';

// Create __dirname in ES module context:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

app.use(express.json());

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Routes
app.use('/webhooks', webhookRoutes);
app.use('/sync', syncRoutes);

// Health check
// Catch-all to serve React index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
