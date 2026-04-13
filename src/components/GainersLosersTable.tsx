import React, { useState, useMemo } from 'react';

interface GainersLosersTableProps {
  title: string;
  data: any[];
}

type MetricType = 'trials' | 'conversions' | 'mrr';
type CompareModel = 'mta_vs_fta' | 'new_mta_vs_fta' | 'new_mta_vs_mta';

export function GainersLosersTable({ title, data }: GainersLosersTableProps) {
  const [metric, setMetric] = useState<MetricType>('mrr');
  const [compareModel, setCompareModel] = useState<CompareModel>('new_mta_vs_fta');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const getModels = () => {
    if (compareModel === 'mta_vs_fta') return { base: 'fta', comp: 'mta', baseName: 'FTA', compName: 'MTA' };
    if (compareModel === 'new_mta_vs_fta') return { base: 'fta', comp: 'new_mta', baseName: 'FTA', compName: 'New MTA' };
    return { base: 'mta', comp: 'new_mta', baseName: 'MTA', compName: 'New MTA' };
  };

  const processedData = useMemo(() => {
    const { base, comp } = getModels();
    
    return data.map(row => {
      const baseVal = row[base][metric] || 0;
      const compVal = row[comp][metric] || 0;
      const absoluteDelta = compVal - baseVal;
      const pctDelta = baseVal !== 0 ? (absoluteDelta / baseVal) * 100 : (compVal > 0 ? 100 : 0);
      
      return {
        ...row,
        baseVal,
        compVal,
        absoluteDelta,
        pctDelta
      };
    }).sort((a, b) => {
      if (sortOrder === 'desc') return b.absoluteDelta - a.absoluteDelta;
      return a.absoluteDelta - b.absoluteDelta;
    });
  }, [data, metric, compareModel, sortOrder]);

  const formatVal = (val: number) => {
    if (metric === 'mrr') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
  };

  const { baseName, compName } = getModels();

  return (
    <div className="card p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h3 className="text-xl font-bold">{title}</h3>
           <p className="text-sm text-muted">Tracking shifts across {baseName} vs {compName}.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <select className="select-input" style={{ width: 'auto' }} value={metric} onChange={e => setMetric(e.target.value as any)}>
            <option value="mrr">MRR</option>
            <option value="conversions">Conversions</option>
            <option value="trials">Trials</option>
          </select>

          <select className="select-input" style={{ width: 'auto' }} value={compareModel} onChange={e => setCompareModel(e.target.value as any)}>
            <option value="mta_vs_fta">MTA vs FTA</option>
            <option value="new_mta_vs_fta">New MTA vs FTA</option>
            <option value="new_mta_vs_mta">New MTA vs MTA</option>
          </select>

          <select className="select-input" style={{ width: 'auto' }} value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}>
            <option value="desc">Top Gainers First</option>
            <option value="asc">Top Losers First</option>
          </select>
        </div>
      </div>

      <div className="table-container max-h-[600px] overflow-y-auto">
        <table>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th>Channel</th>
              <th className="text-right">{baseName} {metric.toUpperCase()}</th>
              <th className="text-right">{compName} {metric.toUpperCase()}</th>
              <th className="text-right">Abs. Delta</th>
              <th className="text-right">% Change</th>
            </tr>
          </thead>
          <tbody>
            {processedData.slice(0, 100).map((row, idx) => {
              const isPositive = row.absoluteDelta > 0;
              const isNegative = row.absoluteDelta < 0;
              const color = isPositive ? 'var(--chart-2)' : isNegative ? 'var(--chart-5)' : 'var(--muted-foreground)';

              return (
                <tr key={idx}>
                  <td className="font-medium">{row.name}</td>
                  <td className="text-right">{formatVal(row.baseVal)}</td>
                  <td className="text-right">{formatVal(row.compVal)}</td>
                  <td className="text-right font-medium" style={{ color }}>
                     {row.absoluteDelta > 0 ? '+' : ''}{formatVal(row.absoluteDelta)}
                  </td>
                  <td className="text-right" style={{ color }}>
                     {isFinite(row.pctDelta) ? `${row.pctDelta > 0 ? '+' : ''}${row.pctDelta.toFixed(1)}%` : 'N/A'}
                  </td>
                </tr>
              );
            })}
            {processedData.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted">No data available for the selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
        {processedData.length > 100 && <div className="text-center p-2 text-xs text-muted border-t border-[var(--border)]">Showing top 100 results...</div>}
      </div>
    </div>
  );
}
