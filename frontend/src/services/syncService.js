// src/services/syncService.js

export const syncSku = async (sku, setLogMessages) => {
  try {
    const response = await fetch('/sync/skus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: sku.trim().split(/\s+/) }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value);
        const lines = chunk.split(/\r?\n/).filter(Boolean);
        setLogMessages((prev) => [...prev, ...lines]);
      }
    }
  } catch (error) {
    setLogMessages(['❌ An error occurred.']);
    console.error(error);
  }
};

export const syncAll = async (setLogMessages, signal) => {
  try {
    const response = await fetch('/sync/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunk = decoder.decode(value || new Uint8Array());
      if (chunk) {
        const lines = chunk.split(/\r?\n/).filter(Boolean);
        setLogMessages((prev) => [...prev, ...lines]);
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      setLogMessages(['⛔ Sync cancelled by user.']);
    } else {
      setLogMessages(['❌ An error occurred while syncing all products.']);
      console.error(error);
    }
  }
};

export const syncByDateRange = ({ startDate, endDate }, setLogMessages) => {
  const url = `/sync/dates?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const evtSource = new EventSource(url);

  evtSource.onmessage = (event) => {
    if (event.data.startsWith('FINAL:')) {
      const finalData = JSON.parse(event.data.substring(6));
      const finalLine = `📦 Final: ${finalData.message || 'Completed.'}`;
      setLogMessages((prev) => [...prev, finalLine]);
      evtSource.close();
    } else {
      const lines = event.data.split(/\r?\n/).filter(Boolean);
      setLogMessages((prev) => [...prev, ...lines]);
    }
  };

  evtSource.onerror = (error) => {
    setLogMessages((prev) => [...prev, '❌ An error occurred during syncByDateRange.']);
    console.error(error);
    evtSource.close();
  };
};
