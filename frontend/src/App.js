// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import HistoryPage from './pages/HistoryPage';

import HomePage from './pages/HomePage';
import SkuSyncPage from './pages/SkuSyncPage';
import SyncDatesPage from './pages/SyncDatesPage';
import SyncAllPage from './pages/SyncAllPage';

function App() {
  return (
    <Router>
      <div className="container mt-5">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/sync-sku" element={<PrivateRoute><SkuSyncPage /></PrivateRoute>} />
          <Route path="/sync-dates" element={<PrivateRoute><SyncDatesPage /></PrivateRoute>} />
          <Route path="/sync-all" element={<PrivateRoute><SyncAllPage /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
