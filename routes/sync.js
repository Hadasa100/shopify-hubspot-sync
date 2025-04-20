// routes/sync.js
import express from 'express';
import {
  getShopifyProductBySKU,
  getShopifyProducts,
  getShopifyProductsByDateRange,
} from '../lib/shopify.js';
import { sendSummaryEmail } from '../lib/email.js';
import { syncAllLimiter } from '../middleware/rateLimiter.js';
import {
  syncAllProducts,
  syncProductsByDateRange,
  syncBySkus,
} from '../services/productSyncService.js';

const router = express.Router();

router.post('/skus', async (req, res) => {
  try {
    const { skus } = req.body;
    if (!skus) {
      return res.status(400).json({ error: 'Please provide at least one SKU.' });
    }

    await syncBySkus(skus, res, getShopifyProductBySKU, sendSummaryEmail);
    res.end();
  } catch (error) {
    console.error('❌ Error syncing SKUs:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred while syncing SKUs.' });
    } else {
      res.write('data: ❌ An error occurred while syncing SKUs.\n\n');
      res.flush?.();
      res.end();
    }
  }
});

router.get('/all', syncAllLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('data: 🔄 Starting full sync...\n\n');
  res.flush?.();

  try {
    await syncAllProducts(res, getShopifyProducts, sendSummaryEmail);
  } catch (error) {
    res.write(`data: FINAL:${JSON.stringify({ error: `❌ Error syncing all products: ${error.message}` })}\n\n`);
    res.flush?.();
    res.end();
  }
});

router.get('/dates', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.write(`data: FINAL:${JSON.stringify({ error: '❌ Please provide both startDate and endDate in the format YYYY-MM-DD.' })}\n\n`);
    res.flush?.();
    return res.end();
  }

  res.write(`data: 🔄 Syncing products from ${startDate} to ${endDate}...\n\n`);
  res.flush?.();

  try {
    await syncProductsByDateRange(res, startDate, endDate, getShopifyProductsByDateRange, sendSummaryEmail);
  } catch (error) {
    res.write(`data: FINAL:${JSON.stringify({ error: `❌ Error syncing products by date range: ${error.message}` })}\n\n`);
    res.flush?.();
    res.end();
  }
});

router.get('/history', (req, res) => {
  res.json(getSyncHistory());
});

export default router;
