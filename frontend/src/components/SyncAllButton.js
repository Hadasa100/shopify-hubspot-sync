// src/components/SyncAllButton.js
import React from 'react';
import { syncAll } from '../services/syncService';

function SyncAllButton({ setLogMessages, setIsLoading, onSyncFinish, controllerRef, setProgress, eventSourceRef }) {
  const handleSyncAll = async () => {
    setLogMessages([]);
    setProgress?.(null);

    const controller = new AbortController();
    if (controllerRef) controllerRef.current = controller;

    const evtSource = syncAll(setLogMessages, controller.signal, setProgress, setIsLoading);
    if (eventSourceRef) eventSourceRef.current = evtSource;

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
