//services/hubspotSyncService.js
import { hubspotClient } from '../lib/hubspot.js';
import { upsertProductMetafield, getProductSKU } from '../lib/shopify.js';
import { sendReservationChangeEmail } from '../lib/email.js';

// Static mapping of HubSpot owner IDs to names
const ownerMap = {
  '12587404': 'Ugo Malavard',
  '47973248': 'Mickael Flak',
  '62633652': 'Idan Ben Or',
  '78340884': 'Johanna Ouayoun',
  '78374135': 'Hadasa Schweitzer',
  '78651108': 'Sarig Yahav',
  '78784318': 'Jade',
  '79045755': 'Levi Hahn',
  '79045756': 'Rinat Perry',
  '79045757': 'Yossi Polnauer',
  '80019798': 'Gabi Rachamimov',
  '80049144': 'itzik@leibish.com',
};

function getOwnerName(ownerId) {
  return ownerMap[ownerId] || ownerId;
}

export async function syncProductPropertyChange({ objectId, propertyName, propertyValue }) {
  if (propertyName !== 'custom__reserved') return;

  // Fetch updated properties, incl. last modifier ID
  const props = [
    'shopify_id',
    'custom__reserved',
    'custom__reserved_by',
    'custom__reserved_for',
  ];
  const hsProduct = await hubspotClient.crm.products.basicApi.getById(String(objectId), props);
  const { properties } = hsProduct;
  const shopifyGID = properties.shopify_id;
  if (!shopifyGID) return;

  // Update Shopify metafield
  await upsertProductMetafield(shopifyGID, 'custom', 'reserved', propertyValue);

  // Prepare email data
  const isReserved = propertyValue === 'true';
  const reservedByName = getOwnerName(properties.custom__reserved_by);
  const reservedFor = properties.custom__reserved_for;
  const sku = await getProductSKU(shopifyGID);

  // Send reservation email when all fields are set
  if (isReserved && reservedByName && reservedFor) {
    await sendReservationChangeEmail({ sku, reservedBy: reservedByName, reservedFor, isReserved });
  }

  // Send release email when reserved=false
  if (!isReserved && properties.custom__reserved_by) {
    await sendReservationChangeEmail({ sku, reservedBy: reservedByName, reservedFor: '', isReserved });
  }
}