// src/components/LogArea.js
import React from 'react';

function LogArea({ logMessages }) {
  const logLines = logMessages.split(/\r?\n/).filter(line => line.trim() !== '');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px',
        height: '400px',
        overflowY: 'auto',
        backgroundColor: '#f9f9f9',
      }}
    >
      {logLines.map((line, index) => (
        <div
          key={index}
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 3px rgba(0,0,0,0.1)',
            fontSize: '14px',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export default LogArea;
