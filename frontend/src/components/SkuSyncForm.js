// src/components/SkuSyncForm.js
import React, { useState } from 'react';
import { syncSku } from '../services/syncService';
import CustomButton from './CustomButton';

function SkuSyncForm({ setLogMessages }) {
  const [sku, setSku] = useState('');

  const handleSyncSku = async () => {
    setLogMessages(''); // Clear previous logs
    await syncSku(sku, setLogMessages);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
      <input
        style={{
          padding: '8px',
          fontSize: '16px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
        type="text"
        placeholder="Enter SKU(s) separated by space"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      />
      <CustomButton onClick={handleSyncSku}>Sync SKU</CustomButton>
    </div>
  );
}

export default SkuSyncForm;
