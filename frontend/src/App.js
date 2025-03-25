import React, { useState } from 'react';

function App() {
  const [sku, setSku] = useState('');
  const [logMessages, setLogMessages] = useState('');

  const syncSku = async () => {
    setLogMessages(''); // Clear previous logs
    try {
      const response = await fetch('/sync/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus: sku.trim().split(/\s+/) })
      });
      
      // Create a reader to process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          setLogMessages(prev => prev + chunk);
        }
      }
    } catch (error) {
      setLogMessages('An error occurred.');
      console.error(error);
    }
  };

  // Split the combined log string into individual lines
  const logLines = logMessages.split(/\r?\n/).filter(line => line.trim() !== '');

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      margin: '0 auto',
      maxWidth: '600px',
      padding: '20px'
    }}>
      <h1 style={{
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        Shopify-HubSpot Sync
      </h1>

      {/* SKU input field */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
        <input
          style={{
            padding: '8px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          type="text"
          placeholder="Enter SKU(s) separated by space"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
      </div>

      {/* Sync button (black) */}
      <button
        style={{
          padding: '8px 16px',
          fontSize: '16px',
          backgroundColor: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
        onClick={syncSku}
      >
        Sync SKU
      </button>

      {/* Scrollable log area with each line in a “card” */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px',
        height: '400px',
        overflowY: 'auto',
        backgroundColor: '#f9f9f9'
      }}>
        {logLines.map((line, index) => (
          <div key={index} style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 3px rgba(0,0,0,0.1)',
            fontSize: '14px'
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
