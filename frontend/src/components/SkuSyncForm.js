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
    <div className="mb-3">
      <div className="form-group">
        <input
          type="text"
          className="form-control"
          placeholder="Enter SKU(s) separated by space"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
      </div>
      <CustomButton onClick={handleSyncSku} className="mt-2">
        Sync SKU
      </CustomButton>
    </div>
  );
}

export default SkuSyncForm;
