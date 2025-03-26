// src/App.js
import React, { useState } from 'react';
import SkuSyncForm from './components/SkuSyncForm';
import SyncAllButton from './components/SyncAllButton';
import SyncByDateButton from './components/SyncByDateButton';
import LogArea from './components/LogArea';
import 'bootstrap/dist/css/bootstrap.min.css';


function App() {
  const [logMessages, setLogMessages] = useState('');

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h1 className="text-center mb-4">Shopify-HubSpot Sync</h1>
          <div className="card p-4 mb-4">
            <SkuSyncForm setLogMessages={setLogMessages} />
            <SyncAllButton setLogMessages={setLogMessages} />
            <SyncByDateButton setLogMessages={setLogMessages} />
          </div>
          <LogArea logMessages={logMessages} />
        </div>
      </div>
    </div>
  );
}

export default App;
