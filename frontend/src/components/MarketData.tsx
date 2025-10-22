import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceData {
  asset: string;
  price: number;
  change: number;
  history: { time: string; price: number }[];
}

export default function MarketData() {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/analytics/prices');
        if (!response.ok) throw new Error('Failed to fetch prices');
        const data = await response.json();
        // Transform backend data to PriceData[]
        const newPriceData: PriceData[] = Object.entries(data.prices).map(([asset, info]: any) => ({
          asset,
          price: info.price,
          change: info.change || 0,
          history: info.history || [],
        }));
        setPriceData(newPriceData);
      } catch (err: any) {
        setError(err.message || 'Error fetching prices');
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  if (loading) return <div className="text-white">Loading market data...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {priceData.map((data) => (
        <div key={data.asset} className="bg-slate-800 rounded-xl p-6 shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white">{data.asset}</h3>
            <span className={data.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {data.change >= 0 ? <TrendingUp /> : <TrendingDown />} {data.change.toFixed(2)}%
            </span>
          </div>
          <div className="text-2xl font-mono text-white mb-2">${data.price.toLocaleString()}</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.history}>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
