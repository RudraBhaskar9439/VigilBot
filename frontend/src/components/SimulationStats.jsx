import React, { useEffect, useState } from 'react';

const POLL_INTERVAL = 2000; // ms

export default function SimulationStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const res = await fetch('/api/simulation/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        if (isMounted) {
          setStats(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <div className="p-4">Loading simulation stats...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!stats) return <div className="p-4">No stats available.</div>;

  return (
    <div className="bg-white rounded shadow p-4 mb-6">
      <h2 className="text-xl font-bold mb-2">Live Simulation Stats</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="font-semibold">Total Users:</span> {stats.total}
        </div>
        <div>
          <span className="font-semibold">Accuracy:</span> {stats.accuracy ? `${stats.accuracy.toFixed(2)}%` : 'N/A'}
        </div>
        <div>
          <span className="font-semibold">False Positives:</span> {stats.falsePositives}
        </div>
        <div>
          <span className="font-semibold">False Negatives:</span> {stats.falseNegatives}
        </div>
      </div>
      <h3 className="font-semibold mb-1">Category Breakdown:</h3>
      <ul className="mb-2">
        <li>Humans: {stats.humans}</li>
        <li>Good Bots: {stats.goodBots}</li>
        <li>Suspicious: {stats.suspicious}</li>
        <li>Bad Bots: {stats.badBots}</li>
      </ul>
      {stats.detectedBots && (
        <div>
          <h3 className="font-semibold mb-1">Bots Detected:</h3>
          <ul>
            <li>Total Flagged: {stats.detectedBots.total}</li>
            <li>Bad Bots (&gt;80): {stats.detectedBots.bad}</li>
            <li>Suspicious (40-79): {stats.detectedBots.suspicious}</li>
            <li>Good Bots (20-39): {stats.detectedBots.good}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
