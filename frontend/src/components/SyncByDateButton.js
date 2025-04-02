import React, { useState } from 'react';
import { syncByDateRange } from '../services/syncService';

function SyncByDateButton({ setLogMessages, setIsLoading, onSyncFinish }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSyncByDates = async () => {
    // אתחול הודעות לוג כמערך
    setLogMessages([]);
    if (!startDate || !endDate) {
      setLogMessages(['Please provide both start and end dates.']);
      return;
    }

    setIsLoading(true);

    try {
      const result = await syncByDateRange({ startDate, endDate }, setLogMessages);
      // אם השרת הודיע שהתהליך כבר רץ, לא ממשיכים הלאה
      if (!result.busy) {
        onSyncFinish?.();
      }
    } catch (error) {
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm mb-1">Start Date:</label>
          <input
            type="date"
            className="form-control w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date:</label>
          <input
            type="date"
            className="form-control w-full"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <button onClick={handleSyncByDates} className="glow-btn w-full">
        Sync Products by Date
      </button>
    </div>
  );
}

export default SyncByDateButton;
