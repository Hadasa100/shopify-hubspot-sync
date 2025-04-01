// src/components/SkuSyncForm.js
import React, { useState } from 'react';
import { syncSku } from '../services/syncService';

function SkuSyncForm({ setLogMessages, setIsLoading, onSyncFinish }) {
  const [sku, setSku] = useState('');

  const handleSyncSku = async () => {
    setLogMessages([]);
    setIsLoading(true);

    await syncSku(sku, setLogMessages);

    setIsLoading(false);
    onSyncFinish?.();
  };

  return (
    <div className="mb-4">
      <textarea
        rows="4"
        type="text"
        className="form-control mb-4 w-full"
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
