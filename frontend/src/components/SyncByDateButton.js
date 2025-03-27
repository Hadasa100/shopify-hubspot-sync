// src/components/SyncByDateButton.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncByDateRange } from '../services/syncService';
import CustomButton from './CustomButton';

function SyncByDateButton({ setLogMessages, setIsLoading }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const handleSyncByDates = async () => {
    setLogMessages('');
    if (!startDate || !endDate) {
      setLogMessages('Please provide both start and end dates.');
      return;
    }
    setIsLoading(true);

    // Navigate right away
    navigate('/logs');

    // Run sync
    await syncByDateRange({ startDate, endDate }, setLogMessages);

    // Stop spinner
    setIsLoading(false);
  };

  return (
    <div className="mb-4">
      <div className="form-row mb-2">
        <div className="col">
          <label>Start Date:</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="col">
          <label>End Date:</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <CustomButton onClick={handleSyncByDates}>
        Sync Products by Date
      </CustomButton>
    </div>
  );
}

export default SyncByDateButton;
