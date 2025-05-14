// File: services/hubspotSyncService.js
import { hubspotClient } from '../lib/hubspot.js';
import { upsertProductMetafield, getProductSKU } from '../lib/shopify.js';
import { sendMetafieldChangeEmail } from '../lib/email.js';

/**
 * Handle HubSpot → Shopify property change, update metafield and notify.
 */
export async function syncProductPropertyChange({ objectId, propertyName, propertyValue }) {
  let hsProduct;
  try {
    hsProduct = await hubspotClient.crm.products.basicApi.getById(String(objectId), ['shopify_id']);
  } catch (err) {
    if (err.status === 404) {
      console.warn(`No HubSpot product ${objectId}, skipping.`);
      return;
    }
    throw err;
  }
  const shopifyGID = hsProduct.properties?.shopify_id;
  if (!shopifyGID) {
    console.warn(`Missing shopify_id, skipping.`);
    return;
  }
  const [namespace, key] = propertyName.split('__');
  if (!namespace || !key) {
    console.warn(`Invalid propertyName '${propertyName}', skipping.`);
    return;
  }
  try {
    await upsertProductMetafield(shopifyGID, namespace, key, propertyValue);
    console.log(`Updated ${namespace}__${key}='${propertyValue}' on ${shopifyGID}`);
    const sku = await getProductSKU(shopifyGID);
    // await sendMetafieldChangeEmail({ sku, key, value: propertyValue });
  } catch (err) {
    console.error('Error processing sync/email:', err);
  }
}