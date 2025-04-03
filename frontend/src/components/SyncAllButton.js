// src/components/SyncAllButton.js
import React from 'react';
import { syncAll } from '../services/syncService';

function SyncAllButton({ setLogMessages, setIsLoading, onSyncFinish, controllerRef, setProgress }) {
  const handleSyncAll = async () => {
    setLogMessages([]);
    setIsLoading(true);
    setProgress?.(null); // reset progress

    const controller = new AbortController();
    if (controllerRef) controllerRef.current = controller;

    await syncAll(setLogMessages, controller.signal, setProgress);

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
