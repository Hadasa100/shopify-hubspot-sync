// src/components/SyncAllButton.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { syncAll } from '../services/syncService';
import CustomButton from './CustomButton';

function SyncAllButton({ setLogMessages, setIsLoading }) {
  const navigate = useNavigate();

  const handleSyncAll = async () => {
    setLogMessages('');
    setIsLoading(true);

    // Immediately navigate to logs page
    navigate('/logs');

    // Perform the sync in the background
    await syncAll(setLogMessages);

    // Once the sync is done, turn off spinner
    setIsLoading(false);
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
