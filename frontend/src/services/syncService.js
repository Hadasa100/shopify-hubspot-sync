// src/services/syncService.js

export const syncSku = async (sku, setLogMessages, setProgress, setIsLoading) => {
  try {
    setIsLoading?.(true);
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

        for (const line of lines) {
          const match = line.match(/Progress:\s*(\d+)\s*\/\s*(\d+)/i);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            setProgress?.({ current, total });
          }
          setLogMessages((prev) => [...prev, line]);
        }
      }
    }
  } catch (error) {
    setLogMessages(['❌ An error occurred.']);
    console.error(error);
  } finally {
    setIsLoading?.(false);
  }
};

export const syncAll = (setLogMessages, signal, setProgress, setIsLoading) => {
  setIsLoading?.(true);
  const evtSource = new EventSource('/sync/all');

  evtSource.onopen = () => {
    console.log('[SSE] Connection opened to /sync/all');
  };

  evtSource.onmessage = (event) => {
    if (event.data.startsWith('FINAL:')) {
      const finalData = JSON.parse(event.data.substring(6));
      const finalLine = `📦 Final: ${finalData.message || 'Completed.'}`;
      setLogMessages((prev) => [...prev, finalLine]);
      evtSource.close();
      setIsLoading?.(false);
      return;
    }

    const lines = event.data.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const match = line.match(/Progress:\s*(\d+)\s*\/\s*(\d+)/i);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        setProgress?.({ current, total });
      }
      setLogMessages((prev) => [...prev, line]);
    }
  };

  evtSource.onerror = (error) => {
    console.error('[SSE] Error during syncAll:', error);
    setLogMessages((prev) => [...prev, '❌ An error occurred during syncAll.']);
    evtSource.close();
    setIsLoading?.(false);
  };

  return evtSource;
};

export const syncByDateRange = ({ startDate, endDate }, setLogMessages, setProgress, setIsLoading) => {
  setIsLoading?.(true);
  const url = `/sync/dates?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const evtSource = new EventSource(url);

  evtSource.onmessage = (event) => {
    if (event.data.startsWith('FINAL:')) {
      const finalData = JSON.parse(event.data.substring(6));
      const finalLine = `📦 Final: ${finalData.message || 'Completed.'}`;
      setLogMessages((prev) => [...prev, finalLine]);
      evtSource.close();
      setIsLoading?.(false);
    } else {
      const lines = event.data.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const match = line.match(/Progress:\s*(\d+)\s*\/\s*(\d+)/i);
        if (match) {
          const current = parseInt(match[1]);
          const total = parseInt(match[2]);
          setProgress?.({ current, total });
        }
        setLogMessages((prev) => [...prev, line]);
      }
    }
  };

  evtSource.onerror = (error) => {
    console.error('[SSE] Error during syncByDateRange:', error);
    setLogMessages((prev) => [...prev, '❌ An error occurred during syncByDateRange.']);
    evtSource.close();
    setIsLoading?.(false);
  };
};
