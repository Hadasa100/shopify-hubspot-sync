// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import SkuSyncForm from './components/SkuSyncForm';
import SyncAllButton from './components/SyncAllButton';
import SyncByDateButton from './components/SyncByDateButton';
import LogPage from './components/LogPage';

import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [logMessages, setLogMessages] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Router>
      <div className="container mt-5">
        <Routes>
          {/* Main Page */}
          <Route
            path="/"
            element={
              <>
                <h1 className="text-center mb-4">Shopify-HubSpot Sync</h1>
                <div className="card p-4 mb-4">
                  <SkuSyncForm
                    setLogMessages={setLogMessages}
                    setIsLoading={setIsLoading}
                  />
                  <SyncAllButton
                    setLogMessages={setLogMessages}
                    setIsLoading={setIsLoading}
                  />
                  <SyncByDateButton
                    setLogMessages={setLogMessages}
                    setIsLoading={setIsLoading}
                  />
                </div>
                <div className="text-center">
                  <Link to="/logs" className="btn btn-secondary">
                    View Logs
                  </Link>
                </div>
              </>
            }
          />
          {/* Logs Page */}
          <Route
            path="/logs"
            element={
              <LogPage
                logMessages={logMessages}
                isLoading={isLoading}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
