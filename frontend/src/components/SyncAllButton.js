import React from 'react';
import { syncAll } from '../services/syncService';

function SyncAllButton({ setLogMessages, setIsLoading, onSyncFinish, setAbortController }) {
  const handleSyncAll = async () => {
    setLogMessages('');
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller); 
    await syncAll(setLogMessages, controller.signal); 

    setIsLoading(false);
    onSyncFinish?.();
  };

  return (
    <div className="mb-4">
      <button onClick={handleSyncAll} className="glow-btn w-full">
        Sync All Products
      </button>
    </div>
  );
}

export default SyncAllButton;
