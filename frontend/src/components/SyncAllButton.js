// src/components/SyncAllButton.js
import React from 'react';
import { syncAll } from '../services/syncService';
import CustomButton from './CustomButton';

function SyncAllButton({ setLogMessages }) {
  const handleSyncAll = async () => {
    setLogMessages(''); // Clear previous logs
    await syncAll(setLogMessages);
  };

  return (
    <div className="mb-3">
      <CustomButton onClick={handleSyncAll}>
        Sync All Products
      </CustomButton>
    </div>
  );
}

export default SyncAllButton;
