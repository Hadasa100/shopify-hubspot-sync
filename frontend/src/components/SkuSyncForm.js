// src/components/SkuSyncForm.js
import React, { useState } from 'react';
import { syncSku } from '../services/syncService';

function SkuSyncForm({ setLogMessages, setIsLoading, onSyncFinish }) {
  const [sku, setSku] = useState('');

  const handleSyncSku = async () => {
    setLogMessages('');
    setIsLoading(true);

    // Run the sync
    await syncSku(sku, setLogMessages);

    setIsLoading(false);
    onSyncFinish?.(); // Call this callback if provided
  };

  return (
    <div className="mb-4">
      <input
        type="text"
        className="form-control mb-4"
        placeholder="Enter SKU(s) separated by space"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      />
      <button onClick={handleSyncSku} className="glow-btn w-full">
        Sync SKU
      </button>
    </div>
  );
}

export default SkuSyncForm;
