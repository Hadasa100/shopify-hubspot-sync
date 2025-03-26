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
    <CustomButton onClick={handleSyncAll}>Sync All Products</CustomButton>
  );
}

export default SyncAllButton;
