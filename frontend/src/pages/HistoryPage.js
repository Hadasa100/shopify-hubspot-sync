import React, { useEffect, useState } from 'react';

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/sync/history')
      .then((res) => res.json())
      .then((data) => setHistory(data.reverse()))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-tso-br from-zinc-900 via-purple-900 to-black text-white p-8">
      <h2 className="text-3xl font-bold mb-6 text-center">📜 Sync History</h2>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-6 h-6 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : history.length === 0 ? (
        <p className="text-center text-white/70">No sync history found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-white/10 bg-white/5 rounded-md">
            <thead>
              <tr className="text-left text-white/70 bg-white/10">
                <th className="p-2">Date</th>
                <th className="p-2">Type</th>
                <th className="p-2">Success</th>
                <th className="p-2">Failure</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <tr key={i} className="border-t border-white/10 hover:bg-white/10 transition">
                  <td className="p-2">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="p-2 capitalize">{entry.type}</td>
                  <td className="p-2 text-green-400">{entry.successCount}</td>
                  <td className="p-2 text-red-400">{entry.failureCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
