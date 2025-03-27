import React, { useState } from 'react';
import SyncAllButton from '../components/SyncAllButton';
import LogArea from '../components/LogArea';
import { Link } from 'react-router-dom';

function SyncAllPage() {
  const [logMessages, setLogMessages] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [abortController, setAbortController] = useState(null);

  const handleSyncFinish = () => {
    setHasSynced(true);
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
      setLogMessages('Sync cancelled by user.');
      setHasSynced(true);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#0e0b0f] via-[#2c0a3a] to-[#000000] text-white overflow-hidden px-4">
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
            setAbortController={setAbortController}
          />
        )}

        {(isLoading || hasSynced) && (
          <>
            <div className="min-h-[100px] bg-white/5 backdrop-blur-md rounded-md p-4">
              {isLoading && (
                <div className="flex justify-center mb-4">
                  <div className="w-6 h-6 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <LogArea logMessages={logMessages} />
            </div>

            <div className="text-center mt-6 flex flex-col sm:flex-row justify-center gap-4">
              {isLoading && (
                <button onClick={handleCancel} className="glow-btn bg-red-500 hover:bg-red-600 text-white">
                  Cancel Sync
                </button>
              )}
              {hasSynced && (
                <Link to="/" className="glow-btn">Back to Home</Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SyncAllPage;
