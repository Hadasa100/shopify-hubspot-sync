// src/components/LogArea.js
import React, { useEffect, useRef } from 'react';

function LogArea({ logMessages }) {
  const logEndRef = useRef(null);

  // Automatically scroll to the bottom when new logs come in
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logMessages]);

  return (
    <div className="bg-white/5 rounded-md p-4 max-h-[400px] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-2 text-pink-400">📋 Live Sync Logs</h3>
      <ul className="space-y-1 font-mono text-sm text-white/90">
        {logMessages.map((line, index) => (
          <li key={index} className="border-b border-white/10 pb-1">
            {line}
          </li>
        ))}
        <li ref={logEndRef}></li>
      </ul>
    </div>
  );
}

export default LogArea;
