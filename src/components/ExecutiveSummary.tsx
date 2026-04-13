import React from 'react';
import type { AggregateMetrics } from '../utils/types';

interface ExecutiveSummaryProps {
  metrics: { 
    base: { fta: AggregateMetrics; mta: AggregateMetrics; new_mta: AggregateMetrics };
    compare: { fta: AggregateMetrics; mta: AggregateMetrics; new_mta: AggregateMetrics } | null;
  };
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}
function formatNumber(val: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
}

function DeltaBadge({ base, comp, isCurrency = false }: { base: number, comp: number, isCurrency?: boolean }) {
  if (comp === 0 && base === 0) return <span className="text-xs text-muted ml-2">0%</span>;
  if (comp === 0) return <span className="text-xs text-muted ml-2">N/A</span>;
  
  const pct = ((base - comp) / comp) * 100;
  const color = pct > 0 ? 'var(--chart-2)' : pct < 0 ? 'var(--chart-5)' : 'var(--muted-foreground)';
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '';
  return (
    <div className="flex flex-col items-end">
      <span className="text-xs font-medium ml-2" style={{ color }}>
         {arrow} {Math.abs(pct).toFixed(1)}%
      </span>
      <span className="text-[10px] text-muted">
         vs {isCurrency ? formatCurrency(comp) : formatNumber(comp)}
      </span>
    </div>
  );
}

function MetricCard({ title, base, comp, color }: { title: string, base: AggregateMetrics, comp: AggregateMetrics | null, color: string }) {
  const baseCvr = base.trials > 0 ? (base.conversions / base.trials * 100).toFixed(1) : '0.0';
  const baseMrrPerConv = base.conversions > 0 ? (base.mrr / base.conversions).toFixed(0) : '0';

  const compCvr = comp && comp.trials > 0 ? (comp.conversions / comp.trials * 100).toFixed(1) : '0.0';
  const compMrrPerConv = comp && comp.conversions > 0 ? (comp.mrr / comp.conversions).toFixed(0) : '0';

  return (
    <div className="card p-6 border-t-4" style={{ borderTopColor: color }}>
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-muted">Trials</span>
          <div className="flex items-center">
             <span className="font-semibold">{formatNumber(base.trials)}</span>
             {comp && <DeltaBadge base={base.trials} comp={comp.trials} />}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted">Conversions</span>
          <div className="flex items-center">
             <span className="font-semibold">{formatNumber(base.conversions)}</span>
             {comp && <DeltaBadge base={base.conversions} comp={comp.conversions} />}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted">MRR</span>
          <div className="flex items-center">
             <span className="font-bold text-lg" style={{ color }}>{formatCurrency(base.mrr)}</span>
             {comp && <DeltaBadge base={base.mrr} comp={comp.mrr} isCurrency />}
          </div>
        </div>
        <hr className="border-t my-2" />
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted">Conversion Rate</span>
          <div className="flex items-center">
            <span>{baseCvr}%</span>
            {comp && <span className="text-xs text-muted ml-2">vs {compCvr}%</span>}
          </div>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted">MRR / Conv</span>
          <div className="flex items-center">
             <span>${baseMrrPerConv}</span>
             {comp && <span className="text-xs text-muted ml-2">vs ${compMrrPerConv}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExecutiveSummary({ metrics }: ExecutiveSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <MetricCard title="First Touch (FTA)" base={metrics.base.fta} comp={metrics.compare?.fta || null} color="var(--chart-fta)" />
      <MetricCard title="Multi-Touch (MTA)" base={metrics.base.mta} comp={metrics.compare?.mta || null} color="var(--chart-mta)" />
      <MetricCard title="New MTA" base={metrics.base.new_mta} comp={metrics.compare?.new_mta || null} color="var(--chart-new)" />
    </div>
  );
}
