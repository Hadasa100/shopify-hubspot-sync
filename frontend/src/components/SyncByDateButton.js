import React, { useState } from 'react';
import { syncByDateRange } from '../services/syncService';
import CustomButton from './CustomButton';

function SyncByDateButton({ setLogMessages }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSyncByDates = async () => {
    setLogMessages(''); // Clear previous logs
    if (!startDate || !endDate) {
      setLogMessages('Please provide both start and end dates.');
      return;
    }
    await syncByDateRange({ startDate, endDate }, setLogMessages);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label>
          Start Date:{' '}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>
          End Date:{' '}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      <CustomButton onClick={handleSyncByDates}>
        Sync Products by Date
      </CustomButton>
    </div>
  );
}

export default SyncByDateButton;
