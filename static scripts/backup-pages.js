// backup-pages.mjs

// ES module imports
import dotenv from 'dotenv';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// allow __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// load .env
dotenv.config();

// Shopify credentials from env
const rawShop = process.env.SHOPIFY_SHOP || '';
const SHOP = rawShop.includes('.') 
  ? rawShop 
  : `${rawShop}.myshopify.com`;
               
const TOKEN       = process.env.SHOPIFY_ADMIN_API_TOKEN;        
const API_VERSION = '2023-10';                                  
const BASE_URL = `https://${SHOP}/admin/api/${API_VERSION}`;

async function backupPages() {
  let sinceId   = 0;
  const allPages = [];

  try {
    while (true) {
      // 1. Fetch a batch of pages
      const resp = await axios.get(`${BASE_URL}/pages.json`, {
        params: { limit: 250, since_id: sinceId },
        headers: { 'X-Shopify-Access-Token': TOKEN }
      });

      const pages = resp.data.pages;
      if (pages.length === 0) break;

      allPages.push(...pages);
      sinceId = pages[pages.length - 1].id;
    }

    // 2. Write backup to JSON file
    const filePath = path.join(__dirname, 'pages-backup.json');
    await fs.writeFile(filePath, JSON.stringify(allPages, null, 2), 'utf-8');

    console.log(`✅ Backup complete: ${allPages.length} pages saved to ${filePath}`);
  } catch (err) {
    console.error('❌ Backup error:', err.response?.data || err.message);
    process.exit(1);
  }
}

backupPages();
