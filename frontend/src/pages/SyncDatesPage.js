import React, { useState } from 'react';
import SyncByDateButton from '../components/SyncByDateButton';
import SyncResultPanel from '../components/SyncResultPanel';

function SyncDatesPage() {
  const [logMessages, setLogMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleSyncFinish = () => {
    setHasSynced(true);
  };

  return (
    <div className="relative min-h-[700px] flex flex-col justify-center items-center bg-gradient-to-br from-[#0e0b0f] via-[#2c0a3a] to-[#000000] text-white overflow-hidden px-4">
      {/* Background glows */}
      <div className="absolute -top-20 -left-32 w-[600px] h-[600px] bg-fuchsia-500/20 rounded-full blur-[180px] z-0"></div>
      <div className="absolute -bottom-20 -right-32 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[160px] z-0"></div>

      {/* Card Container */}
      <div className="z-10 w-full  bg-white/5 backdrop-blur-md rounded-lg p-8 shadow-lg">
        <h2 className="text-3xl font-semibold text-center mb-6 uppercase tracking-wide">Sync by Dates</h2>

        {!hasSynced && !isLoading && (
          <SyncByDateButton
            setLogMessages={setLogMessages}
            setIsLoading={setIsLoading}
            onSyncFinish={handleSyncFinish}
            setProgress={setProgress}
          />
        )}

        {(isLoading || hasSynced) && (
          <SyncResultPanel
            isLoading={isLoading}
            hasSynced={hasSynced}
            progress={progress}
            logMessages={logMessages}
          />
        )}
      </div>
    </div>
  );
}

export default SyncDatesPage;
