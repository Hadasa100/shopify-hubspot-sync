// index.js
import dotenv from 'dotenv';
import express from 'express';
import webhookRoutes from './routes/webhook.js';
import syncRoutes from './routes/sync.js'; // <-- new

dotenv.config();
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Webhook routes (Shopify will call these)
app.use('/webhooks', webhookRoutes);

// Front-end sync routes (User can trigger manual sync)
app.use('/sync', syncRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Shopify-HubSpot sync server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
