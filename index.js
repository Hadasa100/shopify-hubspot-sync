// index.js
require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./routes/webhook');

const app = express();
app.use(express.json());

// Webhook route
app.use('/webhooks', webhookRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('Shopify-HubSpot sync server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
