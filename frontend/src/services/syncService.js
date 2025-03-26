// src/services/syncService.js
export const syncSku = async (sku, setLogMessages) => {
    try {
      const response = await fetch('/sync/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus: sku.trim().split(/\s+/) }),
      });
  
      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          setLogMessages((prev) => prev + chunk);
        }
      }
    } catch (error) {
      setLogMessages('An error occurred.');
      console.error(error);
    }
  };
  
  export const syncAll = async (setLogMessages) => {
    try {
      const response = await fetch('/sync/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
  
      // Process the streaming response like syncSku
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          setLogMessages((prev) => prev + chunk);
        }
      }
    } catch (error) {
      setLogMessages('An error occurred while syncing all products.');
      console.error(error);
    }
  };
  
  export const syncByDateRange = async ({ startDate, endDate }, setLogMessages) => {
    try {
      const response = await fetch('/sync/dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (response.ok) {
        const data = await response.json();
        setLogMessages(data.message || 'Sync completed successfully.');
      } else {
        const errorData = await response.json();
        setLogMessages(errorData.error || 'An error occurred during sync.');
      }
    } catch (error) {
      setLogMessages('An error occurred while syncing: ' + error.message);
    }
  }
  