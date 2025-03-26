import React, { useState } from 'react';
import SkuSyncForm from './components/SkuSyncForm';
import SyncAllButton from './components/SyncAllButton';
import SyncByDateButton from './components/SyncByDateButton';
import LogArea from './components/LogArea';

function App() {
  const [logMessages, setLogMessages] = useState('');

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        margin: '0 auto',
        maxWidth: '600px',
        padding: '20px',
      }}
    >
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Shopify-HubSpot Sync
      </h1>
      <SkuSyncForm setLogMessages={setLogMessages} />
      <SyncAllButton setLogMessages={setLogMessages} />
      <SyncByDateButton setLogMessages={setLogMessages} />
      <LogArea logMessages={logMessages} />
    </div>
  );
}

export default App;
