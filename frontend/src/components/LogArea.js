// src/components/LogArea.js
import React from 'react';

function LogArea({ logMessages }) {
  const logLines = logMessages.split(/\r?\n/).filter(line => line.trim() !== '');
  
  return (
    <div className="card">
      <div className="card-header">
        Logs
      </div>
      <div className="card-body" style={{ height: '400px', overflowY: 'auto' }}>
        <ul className="list-group list-group-flush">
          {logLines.map((line, index) => (
            <li key={index} className="list-group-item">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default LogArea;
