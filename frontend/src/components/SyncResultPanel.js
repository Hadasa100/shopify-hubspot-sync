import React from 'react';
import { Link } from 'react-router-dom';
import LogArea from './LogArea';

function SyncResultPanel({ isLoading, hasSynced, progress, logMessages, children }) {
  const filteredLogs = logMessages.filter((line) => !line.startsWith('📦 Progress:'));

  const handleExport = () => {
    const rows = [['SKU', 'Status', 'Message']];
    filteredLogs.forEach((line) => {
      const skuMatch = line.match(/SKU: ([^\s)]+)/i);
      if (!skuMatch) return;
      const sku = skuMatch[1];
      const status =
        /❌|could not|failed|error/i.test(line) ? 'Failed' :
        /✅|created|updated|complete/i.test(line) ? 'Success' : '';
      const cleanLine = line.replace(/[✓✔❌✖❎📦📋🔄🔎🔁✅]/g, '').trim();
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
    <>
      {progress && (
        <div className="text-center text-sm text-white/80 mb-4">
          <div className="w-full bg-white/10 rounded-full h-2 mb-1">
            <div
              className="bg-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <div>{progress.current} / {progress.total} synced</div>
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-pink-400">Live Sync Logs</h3>
        {filteredLogs.length > 0 && (
          <button
            onClick={handleExport}
            className="text-xs text-white bg-pink-500 hover:bg-pink-600 py-1 px-3 rounded transition"
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="min-h-[100px] bg-white/5 backdrop-blur-md rounded-md p-4">
        {isLoading && (
          <div className="flex justify-center mb-4">
            <div className="w-6 h-6 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <LogArea logMessages={filteredLogs} />
      </div>

      {hasSynced && (
        <div className="text-center mt-6">
          {children || <Link to="/" className="glow-btn">Back to Home</Link>}
        </div>
      )}
    </>
  );
}

export default SyncResultPanel;
