// src/components/LogArea.js
import React, { useEffect, useRef } from 'react';

function LogArea({ logMessages }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logMessages]);

  const handleExport = () => {
    const rows = [['SKU', 'Status', 'Message']];

    logMessages.forEach((line) => {
      const skuMatch = line.match(/SKU: ([^\s)]+)/i);
      if (!skuMatch) return; // skip lines with no SKU

      const sku = skuMatch[1];
      const status =
        /❌|could not|failed|error/i.test(line) ? 'Failed' :
        /✅|created|updated|complete/i.test(line) ? 'Success' : '';

      const cleanLine = line.replace(/[✓✔❌✖❎📦📋]/g, '').trim();
      rows.push([sku, status, cleanLine]);
    });

    const csvContent = rows
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'log-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/5 rounded-md p-4 max-h-[400px] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-pink-400">Live Sync Logs</h3>
        {logMessages.length > 0 && (
          <button
            onClick={handleExport}
            className="text-xs text-white bg-pink-500 hover:bg-pink-600 py-1 px-3 rounded transition"
          >
            Export CSV
          </button>
        )}
      </div>
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