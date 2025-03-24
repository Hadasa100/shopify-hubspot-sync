import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;

const topics = ["products/create", "products/update"];
const webhookUrl = `https://shopify-hubspot-sync.onrender.com/product`;

async function registerWebhook(topic, address) {
  const res = await fetch(`https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/webhooks.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_TOKEN,
    },
    body: JSON.stringify({
      webhook: {
        topic,
        address,
        format: "json"
      }
    }),
  });

  const data = await res.json();
  console.log(`📬 Webhook for ${topic}:`, data);
}

async function registerAll() {
  for (const topic of topics) {
    await registerWebhook(topic, webhookUrl);
  }
}

registerAll().catch(console.error);
