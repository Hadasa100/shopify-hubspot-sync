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
  
  export const syncByDateRange = ({ startDate, endDate }, setLogMessages) => {
    const url = `/sync/dates?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const evtSource = new EventSource(url);
  
    evtSource.onmessage = (event) => {
      if (event.data.startsWith('FINAL:')) {
        const finalData = JSON.parse(event.data.substring(6));
        setLogMessages((prev) => prev + "\nFinal: " + (finalData.message || 'Completed.'));
        evtSource.close();
      } else {
        setLogMessages((prev) => prev + event.data + "\n");
      }
    };
  
    evtSource.onerror = (error) => {
      setLogMessages((prev) => prev + "\nAn error occurred during syncByDateRange.");
      console.error(error);
      evtSource.close();
    };
  };
  
  