import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendChartProps {
  data: any[];
}

export function TrendChart({ data }: TrendChartProps) {
  const [metric, setMetric] = useState<'trials' | 'conversions' | 'mrr'>('mrr');

  const formatYAxis = (tickItem: any) => {
    if (metric === 'mrr') {
      return `$${(tickItem / 1000).toFixed(0)}k`;
    }
    return tickItem.toLocaleString();
  };

  const formatter = (value: number) => {
    if (metric === 'mrr') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  }

  return (
    <div className="card p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Monthly Performance Trends</h3>
        <select className="select-input" style={{ width: 'auto' }} value={metric} onChange={e => setMetric(e.target.value as any)}>
          <option value="mrr">MRR</option>
          <option value="conversions">Conversions</option>
          <option value="trials">Trials</option>
        </select>
      </div>
      
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorFta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-fta)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--chart-fta)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-mta)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--chart-mta)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-new)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--chart-new)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="monthStr" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} dy={10} />
            <YAxis tickFormatter={formatYAxis} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
            <Tooltip formatter={(value: number) => [formatter(value), ""]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area type="monotone" name="FTA" dataKey={`fta_${metric}`} stroke="var(--chart-fta)" strokeWidth={2} fillOpacity={1} fill="url(#colorFta)" />
            <Area type="monotone" name="MTA" dataKey={`mta_${metric}`} stroke="var(--chart-mta)" strokeWidth={2} fillOpacity={1} fill="url(#colorMta)" />
            <Area type="monotone" name="New MTA" dataKey={`new_mta_${metric}`} stroke="var(--chart-new)" strokeWidth={2} fillOpacity={1} fill="url(#colorNew)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
