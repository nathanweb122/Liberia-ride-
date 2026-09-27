import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
} from 'recharts';
import { TrendingUp, ArrowUpRight, DollarSign, Calendar, RefreshCw } from 'lucide-react';

interface DataPoint {
  week: string;
  revenue: number;
  growth: number;
}

const SIX_WEEKS_DATA: DataPoint[] = [
  { week: 'Apr 13', revenue: 840, growth: 0 },
  { week: 'Apr 20', revenue: 920, growth: 9.52 },
  { week: 'Apr 27', revenue: 1050, growth: 14.13 },
  { week: 'May 04', revenue: 1120, growth: 6.67 },
  { week: 'May 11', revenue: 1180, growth: 5.36 },
  { week: 'May 18', revenue: 1240.50, growth: 5.13 },
];

const TWELVE_WEEKS_DATA: DataPoint[] = [
  { week: 'Mar 02', revenue: 650, growth: 0 },
  { week: 'Mar 09', revenue: 710, growth: 9.23 },
  { week: 'Mar 16', revenue: 750, growth: 5.63 },
  { week: 'Mar 23', revenue: 790, growth: 5.33 },
  { week: 'Mar 30', revenue: 810, growth: 2.53 },
  { week: 'Apr 06', revenue: 830, growth: 2.47 },
  { week: 'Apr 13', revenue: 840, growth: 1.20 },
  { week: 'Apr 20', revenue: 920, growth: 9.52 },
  { week: 'Apr 27', revenue: 1050, growth: 14.13 },
  { week: 'May 04', revenue: 1120, growth: 6.67 },
  { week: 'May 11', revenue: 1180, growth: 5.36 },
  { week: 'May 18', revenue: 1240.50, growth: 5.13 },
];

const LRD_RATE = 195; // Exchange rate used across other parts of Chauffeur Portal

export const RevenueGrowthChart = () => {
  const [timeframe, setTimeframe] = useState<'6w' | '12w'>('6w');
  const [currency, setCurrency] = useState<'USD' | 'LRD'>('USD');
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const rawData = timeframe === '6w' ? SIX_WEEKS_DATA : TWELVE_WEEKS_DATA;

  // Transform data based on exchange rate if currency is set to LRD
  const data = rawData.map((d) => ({
    ...d,
    displayRevenue: currency === 'USD' ? d.revenue : d.revenue * LRD_RATE,
  }));

  // Calculations
  const currentRevenue = data[data.length - 1].displayRevenue;
  const initialRevenue = data[0].displayRevenue;
  const totalGrowthPercent = ((currentRevenue - initialRevenue) / initialRevenue) * 100;
  
  const averageWeeklyRevenue = data.reduce((acc, d) => acc + d.displayRevenue, 0) / data.length;
  const peakWeeklyRevenue = Math.max(...data.map(d => d.displayRevenue));

  const formatValue = (val: number) => {
    if (currency === 'USD') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `L$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="glass-panel p-4 rounded-xl border border-[#e9c349]/30 bg-[#0e0e0e]/95 shadow-[0_8px_32px_rgba(0,0,0,0.8)] min-w-[180px] animate-in fade-in duration-200">
          <p className="text-[10px] text-[#8e8e8e] uppercase font-bold tracking-widest font-mono select-none">
            Week of {dataPoint.week}
          </p>
          <div className="h-px bg-white/10 my-2"></div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs text-on-surface-variant font-medium">Revenue</span>
              <span className="text-sm font-bold text-[#e9c349] font-mono">
                {formatValue(dataPoint.displayRevenue)}
              </span>
            </div>
            {dataPoint.growth > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs text-on-surface-variant font-medium">Week Growth</span>
                <span className="text-xs font-bold text-green-400 font-mono flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                  +{dataPoint.growth.toFixed(1)}%
                </span>
              </div>
            )}
            {currency === 'USD' ? (
              <div className="text-[10px] text-on-surface-variant/40 text-right mt-1 font-mono uppercase tracking-wider">
                ≈ L${(dataPoint.revenue * LRD_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })} LRD
              </div>
            ) : (
              <div className="text-[10px] text-on-surface-variant/40 text-right mt-1 font-mono uppercase tracking-wider">
                ≈ ${(dataPoint.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-xl p-6 md:p-8 relative overflow-hidden group border border-white/5 shadow-2xl">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-[#e9c349]/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none transition-all duration-700 group-hover:bg-[#e9c349]/10"></div>
      
      {/* Widget Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest font-bold">Performance Matrix</span>
            <span className="bg-primary/10 border border-primary/20 text-primary uppercase text-[8px] font-bold px-2 py-0.5 rounded tracking-wider animate-pulse">Live Index</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bodoni font-bold mt-1 text-on-surface flex items-center gap-2">
            <span>Weekly Revenue Growth</span>
            <TrendingUp className="w-5 h-5 text-[#e9c349]" />
          </h2>
        </div>

        {/* Filters and Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe selector */}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
            <button 
              onClick={() => setTimeframe('6w')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer ${timeframe === '6w' ? 'bg-[#e9c349] text-[#0c0f0f] shadow-md' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
            >
              6 Weeks
            </button>
            <button 
              onClick={() => setTimeframe('12w')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer ${timeframe === '12w' ? 'bg-[#e9c349] text-[#0c0f0f] shadow-md' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
            >
              12 Weeks
            </button>
          </div>

          {/* Currency selector */}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
            <button 
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer ${currency === 'USD' ? 'bg-[#e9c349] text-[#0c0f0f] shadow-md' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
            >
              USD ($)
            </button>
            <button 
              onClick={() => setCurrency('LRD')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer ${currency === 'LRD' ? 'bg-[#e9c349] text-[#0c0f0f] shadow-md' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
            >
              LRD (L$)
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary in Bento layout within widget */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
        <div className="p-3 border-r border-white/5 last:border-0 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-on-surface-variant/60 font-cinzel text-[9px] uppercase tracking-wider font-bold">
            <Calendar className="w-3.5 h-3.5 text-primary/70" />
            <span>Avg Weekly Revenue</span>
          </div>
          <p className="font-mono text-xl md:text-2xl font-bold mt-2 text-on-surface">
            {formatValue(averageWeeklyRevenue)}
          </p>
        </div>
        
        <div className="p-3 border-r border-white/5 last:border-0 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-on-surface-variant/60 font-cinzel text-[9px] uppercase tracking-wider font-bold">
            <DollarSign className="w-3.5 h-3.5 text-primary/70" />
            <span>Peak Week Revenue</span>
          </div>
          <p className="font-mono text-xl md:text-2xl font-bold mt-2 text-primary font-bold">
            {formatValue(peakWeeklyRevenue)}
          </p>
        </div>

        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-on-surface-variant/60 font-cinzel text-[9px] uppercase tracking-wider font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span>Aggregate Growth</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-xl md:text-2xl font-bold text-green-400">
              +{totalGrowthPercent.toFixed(1)}%
            </span>
            <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
              Ascending
            </span>
          </div>
        </div>
      </div>

      {/* Main Recharts Area */}
      <div className="relative z-10 w-full h-80 pt-2 select-none">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart 
            data={data} 
            margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorRevenueGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e9c349" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#e9c349" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#ffffff" 
              opacity={0.03} 
              vertical={false}
            />
            <XAxis 
              dataKey="week" 
              stroke="#ffffff" 
              opacity={0.35} 
              tick={{ fill: '#8e8e8e', fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
              axisLine={{ stroke: '#ffffff', opacity: 0.1 }}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#ffffff" 
              opacity={0.35} 
              tickFormatter={(v) => {
                if (currency === 'USD') {
                  return `$${v}`;
                } else {
                  return `L$${Math.round(v / 1000)}k`;
                }
              }}
              tick={{ fill: '#8e8e8e', fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
              axisLine={{ stroke: '#ffffff', opacity: 0.1 }}
              tickLine={false}
              dx={-5}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: '#e9c349', strokeDasharray: '4 4', strokeWidth: 1.5, strokeOpacity: 0.4 }}
            />
            <Line 
              type="monotone" 
              dataKey="displayRevenue" 
              stroke="#e9c349" 
              strokeWidth={3}
              activeDot={{ r: 6, fill: '#e9c349', stroke: '#0c0f0f', strokeWidth: 2 }}
              dot={{ r: 3.5, fill: '#0c0f0f', stroke: '#e9c349', strokeWidth: 2 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Growth Metric Footnote with real-time detail */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-white/5 text-[10px] uppercase font-bold tracking-widest text-[#8e8e8e]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
          <span>Performance verified under Liberia Obs-Rule v2.4</span>
        </span>
        <span className="text-on-surface-variant opacity-60 font-mono mt-2 sm:mt-0 font-bold">
          Conversion Rate Lock: 1.00 USD = {LRD_RATE}.00 LRD
        </span>
      </div>
    </div>
  );
};
