// index.js
import dotenv from 'dotenv';
import express from 'express';
import webhookRoutes from './routes/webhook.js';

dotenv.config();
const app = express();

// Middleware to parse JSON for all requests
app.use(express.json());

// Mount webhook routes for product operations
app.use('/webhooks', webhookRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Shopify-HubSpot sync server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
