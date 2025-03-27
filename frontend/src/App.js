// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import HomePage from './pages/HomePage';
import SkuSyncPage from './pages/SkuSyncPage';
import SyncDatesPage from './pages/SyncDatesPage';
import SyncAllPage from './pages/SyncAllPage';

function App() {
  return (
    <Router>
      <div className="container mt-5">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sync-sku" element={<SkuSyncPage />} />
          <Route path="/sync-dates" element={<SyncDatesPage />} />
          <Route path="/sync-all" element={<SyncAllPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
