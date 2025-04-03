import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LogArea from './LogArea';

function SyncResultPanel({ isLoading, hasSynced, progress, logMessages, children }) {
  const [showModal, setShowModal] = useState(false);
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

  const parsedResults = filteredLogs.reduce(
    (acc, line) => {
      const skuMatch = line.match(/SKU: ([^\s)]+)/i);
      if (!skuMatch) return acc;
      const sku = skuMatch[1];
      const status = /❌|could not|failed|error/i.test(line)
        ? '❌ Failed'
        : /✅|created|updated|complete/i.test(line)
        ? '✅ Success'
        : 'ℹ️ Info';
      acc.push({ sku, status, line });
      return acc;
    },
    []
  );

  return (
    <div className="space-y-6">
      {progress && (
        <div className="text-center text-sm text-white/80">
          <div className="w-full bg-white/10 rounded-full h-2 mb-1">
            <div
              className="bg-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <div className="text-white/70 font-mono tracking-wide">
            {progress.current} / {progress.total} synced
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-pink-300 tracking-wider uppercase">Live Sync Logs</h3>
        {filteredLogs.length > 0 && (
          <button
            onClick={handleExport}
            className="text-xs font-medium bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded shadow-md transition"
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

      {hasSynced && parsedResults.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 glow-btn bg-pink-500 hover:bg-pink-600"
          >
            View Sync Summary
          </button>
        </div>
      )}

      {hasSynced && (
        <div className="text-center">
          {children || <Link to="/" className="glow-btn">Back to Home</Link>}
        </div>
      )}

      {/* Summary Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-start bg-black/80 p-8 overflow-auto">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-6xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-pink-200 text-lg font-semibold">Sync Summary</h4>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-pink-400 text-sm">✖ Close</button>
            </div>
            <table className="w-full table-auto border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/70">
                  <th className="px-2 py-1">SKU</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Message</th>
                </tr>
              </thead>
              <tbody>
                {parsedResults.map(({ sku, status, line }, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-2 py-1 whitespace-nowrap text-white/90 font-mono">{sku}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className={status.includes('Failed') ? 'text-red-400' : 'text-green-400'}>{status}</span>
                    </td>
                    <td className="px-2 py-1 text-white/80 max-w-[500px] overflow-hidden truncate">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SyncResultPanel;
