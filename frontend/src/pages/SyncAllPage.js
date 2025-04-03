import React, { useState, useRef } from 'react';
import SyncAllButton from '../components/SyncAllButton';
import SyncResultPanel from '../components/SyncResultPanel';

function SyncAllPage() {
  const [logMessages, setLogMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [progress, setProgress] = useState(null);
  const controllerRef = useRef(null);

  const handleSyncFinish = () => {
    setHasSynced(true);
  };

  const handleAbort = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      setLogMessages((prev) => [...prev, '⛔ Sync cancelled by user.']);
      setIsLoading(false);
      setHasSynced(true);
    }
  };

  return (
    <div className="relative h-[700px] flex flex-col justify-center items-center bg-gradient-to-br from-[#0e0b0f] via-[#2c0a3a] to-[#000000] text-white overflow-hidden px-4">
      {/* Background glows */}
      <div className="absolute -top-20 -left-32 w-[600px] h-[600px] bg-fuchsia-500/20 rounded-full blur-[180px] z-0"></div>
      <div className="absolute -bottom-20 -right-32 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[160px] z-0"></div>

      {/* Card Container */}
      <div className="z-10 w-full max-w-xl bg-white/5 backdrop-blur-md rounded-lg p-8 shadow-lg">
        <h2 className="text-3xl font-semibold text-center mb-6 uppercase tracking-wide">Sync All Products</h2>

        {!hasSynced && !isLoading && (
          <SyncAllButton
            setLogMessages={setLogMessages}
            setIsLoading={setIsLoading}
            onSyncFinish={handleSyncFinish}
            controllerRef={controllerRef}
            setProgress={setProgress}
          />
        )}

        {(isLoading || hasSynced) && (
          <SyncResultPanel
            isLoading={isLoading}
            hasSynced={hasSynced}
            progress={progress}
            logMessages={logMessages}
          >
            {isLoading ? (
              <button onClick={handleAbort} className="glow-btn bg-red-600 hover:bg-red-700">
                ⛔ Cancel Sync
              </button>
            ) : null}
          </SyncResultPanel>
        )}
      </div>
    </div>
  );
}

export default SyncAllPage;
