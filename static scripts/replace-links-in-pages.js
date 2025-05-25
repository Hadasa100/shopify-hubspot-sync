// replace-links-in-pages.js

// Load environment variables from .env
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const SHOP  = process.env.SHOPIFY_SHOP ? `${process.env.SHOPIFY_SHOP}.myshopify.com` : '';
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;          // your Admin API token
const API_VERSION = '2023-10';                              // or whatever version you're on

// Base URL for all requests
const BASE_URL = `https://${SHOP}/admin/api/${API_VERSION}`;

async function updatePages() {
  let sinceId = 0;
  let totalUpdated = 0;

  try {
    while (true) {
      // 1. Fetch a batch of pages
      const resp = await axios.get(`${BASE_URL}/pages.json`, {
        params: { limit: 250, since_id: sinceId },
        headers: { 'X-Shopify-Access-Token': TOKEN }
      });

      const pages = resp.data.pages;
      if (!pages.length) break;

      for (const page of pages) {
        const { id, title, body_html } = page;

        if (body_html && body_html.includes('leibis.com')) {
          // 2. Replace all occurrences
          const newBody = body_html.replace(/leibis\.com/g, 'leibish.com');

          // 3. Update the page
          await axios.put(
            `${BASE_URL}/pages/${id}.json`,
            { page: { id, body_html: newBody } },
            { headers: { 'X-Shopify-Access-Token': TOKEN } }
          );

          console.log(`✅ Updated page ${id} (“${title}”)`);
          totalUpdated++;
        }
      }

      // 4. Advance pagination
      sinceId = pages[pages.length - 1].id;
    }

    console.log(`\n🎉 Done. Total pages updated: ${totalUpdated}`);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

updatePages();
