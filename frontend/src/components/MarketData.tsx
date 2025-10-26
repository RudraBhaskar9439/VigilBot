import { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RefreshCw, Activity, BarChart3, LineChart as LineChartIcon } from 'lucide-react';

interface PriceData {
  asset: string;
  price: number;
  change: number;
  confidence: number;
  history: { time: string; price: number }[];
}

// Map Pyth price IDs to readable asset names
const ASSET_NAMES: Record<string, string> = {
  'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43': 'BTC',
  'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace': 'ETH',
  'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d': 'SOL',
};

type ChartType = 'line' | 'area' | 'bar';

export default function MarketData() {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [priceHistory, setPriceHistory] = useState<Record<string, { time: string; price: number }[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>('area');

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setError(null);
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/analytics/prices`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch prices');
        const data = await response.json();
        
        // Update price history for charts with timestamp
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
        });
        
        setPriceHistory(prevHistory => {
          const newHistory = { ...prevHistory };

          // Transform Pyth data to display format
          const transformed: PriceData[] = Object.entries(data.prices).map(([priceId, priceInfo]: [string, any]) => {
            const asset = ASSET_NAMES[priceId] || priceId.slice(0, 6);
            
            // Initialize history array if needed
            if (!newHistory[asset]) {
              newHistory[asset] = [];
            }
            
            // Add new price point at the end (right side)
            newHistory[asset] = [...newHistory[asset], { time: timeString, price: priceInfo.price }];
            
            // Keep only last 30 data points for smooth scrolling
            if (newHistory[asset].length > 30) {
              newHistory[asset] = newHistory[asset].slice(-30);
            }
            
            // Calculate price change
            const history = newHistory[asset];
            const change = history.length > 1 
              ? ((priceInfo.price - history[0].price) / history[0].price) * 100 
              : 0;

            return {
              asset,
              price: priceInfo.price,
              change,
              confidence: priceInfo.confidence,
              history: [...history],
            };
          });

          setPriceData(transformed);
          return newHistory;
        });
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error fetching prices');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchPrices();
    
    // Auto-refresh every 3 seconds for smoother updates
    const interval = setInterval(fetchPrices, 3000);
    
    return () => clearInterval(interval);
  }, []); // Empty dependency array to avoid recreating interval

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mr-2" />
      <span className="text-white">Loading live prices from Pyth Network...</span>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
      <p className="text-red-400">Error: {error}</p>
      <p className="text-sm text-slate-400 mt-2">Make sure backend is running on port 3000</p>
    </div>
  );

  const renderChart = (data: PriceData) => {
    const chartProps = {
      data: data.history,
      margin: { top: 5, right: 5, left: 5, bottom: 5 }
    };

    const tooltipStyle = {
      contentStyle: {
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
      },
      labelStyle: { color: '#94a3b8' }
    };

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...chartProps}>
              <defs>
                <linearGradient id={`gradient-${data.asset}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={10}
                interval="preserveStartEnd"
                tickFormatter={(value) => value.split(':').slice(1).join(':')}
              />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} />
              <Tooltip {...tooltipStyle} />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#06b6d4" 
                strokeWidth={2}
                fill={`url(#gradient-${data.asset})`}
                animationDuration={800}
                animationEasing="ease-in-out"
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={10}
                interval="preserveStartEnd"
                tickFormatter={(value) => value.split(':').slice(1).join(':')}
              />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} />
              <Tooltip {...tooltipStyle} />
              <Bar 
                dataKey="price" 
                fill="#06b6d4"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationEasing="ease-in-out"
                isAnimationActive={true}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={10}
                interval="preserveStartEnd"
                tickFormatter={(value) => value.split(':').slice(1).join(':')}
              />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} />
              <Tooltip {...tooltipStyle} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#06b6d4" 
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                animationDuration={800}
                animationEasing="ease-in-out"
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Chart Type Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div>
            <p className="text-sm font-medium text-white">Live Market Data</p>
            <p className="text-xs text-slate-400">Pyth Network • Updates every 5s</p>
          </div>
        </div>
        
        {/* Chart Type Selector */}
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              chartType === 'line' 
                ? 'bg-cyan-500 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              chartType === 'area' 
                ? 'bg-cyan-500 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            Area
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              chartType === 'bar' 
                ? 'bg-cyan-500 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Bar
          </button>
        </div>
      </div>
      
      {/* Price Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {priceData.map((data) => (
          <div key={data.asset} className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl overflow-hidden shadow-xl hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all">
            {/* Card Header */}
            <div className="p-6 pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-bold text-white">{data.asset}/USD</h3>
              </div>
              
              <div>
                <div className="text-4xl font-mono font-bold text-white mb-1">
                  ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Confidence: ±${data.confidence.toFixed(2)}</span>
                  <span>•</span>
                  <span>{data.history.length} data points</span>
                </div>
              </div>
            </div>
            
            {/* Chart */}
            <div className="p-4 bg-slate-950/30">
              <div className="h-48">
                {renderChart(data)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
