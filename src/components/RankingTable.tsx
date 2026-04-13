import { useState } from 'react';

interface RankingTableProps {
  title: string;
  data: any[];
}

export function RankingTable({ title, data }: RankingTableProps) {
  const [metric, setMetric] = useState<'trials' | 'conversions' | 'mrr'>('mrr');

  const formatVal = (val: number) => {
    if (metric === 'mrr') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
  }

  return (
    <div className="card p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">{title}</h3>
        <select className="select-input" style={{ width: 'auto' }} value={metric} onChange={e => setMetric(e.target.value as any)}>
          <option value="mrr">MRR</option>
          <option value="conversions">Conversions</option>
          <option value="trials">Trials</option>
        </select>
      </div>

      <div className="table-container max-h-[600px] overflow-y-auto">
        <table>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th>Channel</th>
              <th className="text-right">FTA {metric}</th>
              <th className="text-right">MTA {metric}</th>
              <th className="text-right">New MTA {metric}</th>
              <th className="text-right">Δ (New MTA vs FTA)</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 100).map((row, idx) => {
              const ftaVal = row.fta[metric] || 0;
              const newMtaVal = row.new_mta[metric] || 0;
              let pctDelta = 0;
              if (ftaVal !== 0) {
                pctDelta = ((newMtaVal - ftaVal) / ftaVal) * 100;
              } else if (newMtaVal > 0) {
                pctDelta = 100;
              }
              const deltaColor = pctDelta > 0 ? 'var(--chart-2)' : pctDelta < 0 ? 'var(--chart-5)' : 'var(--muted-foreground)';
              const deltaText = isFinite(pctDelta) ? `${pctDelta > 0 ? '+' : ''}${pctDelta.toFixed(1)}%` : 'N/A';

              return (
                <tr key={idx}>
                  <td className="font-medium">{row.name}</td>
                  <td className="text-right font-medium" style={{ color: 'var(--chart-fta)' }}>{formatVal(ftaVal)}</td>
                  <td className="text-right font-medium" style={{ color: 'var(--chart-mta)' }}>{formatVal(row.mta[metric] || 0)}</td>
                  <td className="text-right font-medium" style={{ color: 'var(--chart-new)' }}>{formatVal(newMtaVal)}</td>
                  <td className="text-right font-medium" style={{ color: deltaColor }}>{deltaText}</td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted">No data available for the selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
        {data.length > 100 && <div className="text-center p-2 text-xs text-muted border-t border-[var(--border)]">Showing top 100 results...</div>}
      </div>
    </div>
  );
}
