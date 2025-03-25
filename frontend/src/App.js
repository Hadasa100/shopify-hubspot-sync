import React, { useState } from 'react';

function App() {
  const [sku, setSku] = useState('');
  const [message, setMessage] = useState('');

  const syncSku = async () => {
    try {
      const response = await fetch('/sync/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus: sku })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || 'SKU sync complete.');
      } else {
        setMessage(data.error || 'An error occurred.');
      }
    } catch (error) {
      setMessage('An error occurred.');
      console.error(error);
    }
  };

  return (
    <div>
      <h1>Shopify-HubSpot Sync</h1>
      <input 
        type="text" 
        placeholder="Enter SKU" 
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      />
      <button onClick={syncSku}>Sync SKU</button>
      <p>{message}</p>
    </div>
  );
}

export default App;
