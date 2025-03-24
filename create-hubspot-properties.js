import { Client } from "@hubspot/api-client";
import dotenv from "dotenv";
dotenv.config();

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

const properties = [
  { name: "loose__qty", label: "Loose Quantity", type: "number" },
  { name: "loose__item_type", label: "Loose Item Type", type: "string" },
  { name: "loose__measurements", label: "Loose Measurements", type: "string" },
  { name: "diamond__intensity", label: "Diamond Intensity", type: "string" },
  { name: "custom__shipping_days", label: "Shipping Days", type: "number" },
  { name: "diamond__main_color", label: "Diamond Main Color", type: "string" },
  { name: "diamond__secondary_color", label: "Diamond Secondary Color", type: "string" },
  { name: "custom__certs_location", label: "Certs Location", type: "string" },
  { name: "custom__certificates", label: "Certificates", type: "string" },
  { name: "loose__shape", label: "Loose Shape", type: "string" },
//   { name: "diamond__chameleon", label: "Diamond Chameleon", type: "bool" }, // or "string" if you prefer
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
