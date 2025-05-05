import { Client } from "@hubspot/api-client";
import dotenv from "dotenv";
dotenv.config();

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

const properties = [
  {
    "name": "loose__qty",
    "label": "Loose Quantity",
    "type": "number",
    "default": 0
  },
  {
    "name": "jewelry__center_stones_weight",
    "label": "Jewelry Center Stones Weight",
    "type": "number",
    "default": 0
  },
  {
    "name": "custom__hide_price",
    "label": "Custom Hide Price",
    "type": "bool",
    "default": false
  },
  {
    "name": "custom__center_stone_weight",
    "label": "Custom Center Stone Weight",
    "type": "number",
    "default": 0
  },
  {
    "name": "jewelry__stone_type",
    "label": "Jewelry Stone Type",
    "type": "string",
    "default": ""
  }
];

async function createProperties() {
  for (const prop of properties) {
    try {
      await hubspotClient.crm.properties.coreApi.create("products", {
        name: prop.name,
        label: prop.label,
        groupName: "productinformation",
        type: prop.type === "number" ? "number" : prop.type === "bool" ? "bool" : "string",
        fieldType: prop.type === "number" ? "number" : prop.type === "bool" ? "booleancheckbox" : "text",
        options: prop.type === "bool" ? [
          { label: "True", value: "true", displayOrder: 0 },
          { label: "False", value: "false", displayOrder: 1 }
        ] : undefined,
      });

      console.log(`✅ Created property: ${prop.name}`);
    } catch (error) {
      const err = error?.response?.body || error;
      if (err.category === "CONFLICT") {
        console.log(`⚠️ Already exists: ${prop.name}`);
      } else {
        console.error(`❌ Failed to create ${prop.name}:`, JSON.stringify(err));
      }
    }
  }
}

createProperties().catch(console.error);
