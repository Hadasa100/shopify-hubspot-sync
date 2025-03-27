// src/components/SkuSyncForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncSku } from '../services/syncService';
import CustomButton from './CustomButton';

function SkuSyncForm({ setLogMessages, setIsLoading }) {
  const [sku, setSku] = useState('');
  const navigate = useNavigate();

  const handleSyncSku = async () => {
    setLogMessages('');
    setIsLoading(true);

    // Navigate immediately
    navigate('/logs');

    // Run the sync
    await syncSku(sku, setLogMessages);

    // Stop spinner
    setIsLoading(false);
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
