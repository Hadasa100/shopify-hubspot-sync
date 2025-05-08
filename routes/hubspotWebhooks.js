// File: routes/hubspotWebhooks.js
import express from 'express';
import { syncProductPropertyChange } from '../services/hubspotSyncService.js';

const router = express.Router();

router.use(express.json());

router.get('/product/hubspot', (_req, res) => res.status(200).send('OK'));

router.post('/product/hubspot', (req, res) => {
  const entries = Array.isArray(req.body) ? req.body : [req.body];
  entries.forEach(e => {
    if (e.subscriptionType?.toLowerCase() === 'product.propertychange') {
      syncProductPropertyChange(e).catch(err => console.error(err));
    }
  });
  res.status(200).send('Processed');
});

export default router;
