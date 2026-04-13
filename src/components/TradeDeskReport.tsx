import { type ReactNode, useRef, useState, useMemo } from 'react';
import type { NormalizedDataRow } from '../utils/types';
import { FileDown, TrendingUp, TrendingDown, BarChart2, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Line, AreaChart, Area, ComposedChart, Cell
} from 'recharts';

// @ts-ignore
import html2pdf from 'html2pdf.js';

interface Props {
  data: NormalizedDataRow[];
}

/* ─────────────────────── helpers ─────────────────────── */
const fmt = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtN = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });


const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(mo) - 1]} ${y.slice(2)}`;
};

/* ─────────────────────── aggregation utils ─────────────────────── */
function aggregateByMonth(rows: NormalizedDataRow[], filter: (r: NormalizedDataRow) => boolean) {
  const map: Record<string, { month: string; fta_trials: number; fta_conversions: number; fta_mrr: number; new_mta_trials: number; new_mta_conversions: number; new_mta_mrr: number }> = {};
  rows.filter(filter).forEach(r => {
    const m = r.monthStr.substring(0, 7);
    if (!map[m]) map[m] = { month: m, fta_trials: 0, fta_conversions: 0, fta_mrr: 0, new_mta_trials: 0, new_mta_conversions: 0, new_mta_mrr: 0 };
    if (r.model === 'fta') {
      map[m].fta_trials += r.trials;
      map[m].fta_conversions += r.conversions;
      map[m].fta_mrr += r.mrr;
    } else if (r.model === 'new_mta') {
      map[m].new_mta_trials += r.trials;
      map[m].new_mta_conversions += r.conversions;
      map[m].new_mta_mrr += r.mrr;
    }
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

function aggregateL1ByMonth(rows: NormalizedDataRow[]) {
  const map: Record<string, Record<string, { new_mta_conv: number; new_mta_mrr: number; fta_conv: number; fta_mrr: number }>> = {};
  rows.forEach(r => {
    const m = r.monthStr.substring(0, 7);
    if (!map[m]) map[m] = {};
    if (!map[m][r.channel_l1]) map[m][r.channel_l1] = { new_mta_conv: 0, new_mta_mrr: 0, fta_conv: 0, fta_mrr: 0 };
    if (r.model === 'new_mta') {
      map[m][r.channel_l1].new_mta_conv += r.conversions;
      map[m][r.channel_l1].new_mta_mrr += r.mrr;
    } else if (r.model === 'fta') {
      map[m][r.channel_l1].fta_conv += r.conversions;
      map[m][r.channel_l1].fta_mrr += r.mrr;
    }
  });
  return map;
}

/* ─────────────── Component ─────────────── */
export function TradeDeskReport({ data }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const element = reportRef.current;
      const opt = {
        margin: [0.4, 0.4, 0.4, 0.4] as [number, number, number, number],
        filename: 'TradeDesk_MNTN_Programmatic_Report.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'landscape' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      await html2pdf().set(opt).from(element).save();
    } finally {
      setExporting(false);
    }
  };

  /* ──── Derived Data ──── */
  const tradeDeskData = useMemo(() => aggregateByMonth(data, r => r.channel_l2.toLowerCase() === 'the trade desk'), [data]);
  const mntnData = useMemo(() => aggregateByMonth(data, r => r.channel_l2.toLowerCase() === 'mntn'), [data]);
  const progData = useMemo(() => aggregateByMonth(data, r => r.channel_l1.toLowerCase() === 'programmatic'), [data]);

  // Delta = New MTA - FTA for Trade Desk
  const tradeDeskDelta = useMemo(() => tradeDeskData.map(d => ({
    month: d.month,
    label: monthLabel(d.month),
    fta_mrr: d.fta_mrr,
    new_mta_mrr: d.new_mta_mrr,
    delta_mrr: d.new_mta_mrr - d.fta_mrr,
    fta_conv: d.fta_conversions,
    new_mta_conv: d.new_mta_conversions,
    delta_conv: d.new_mta_conversions - d.fta_conversions,
    fta_trials: d.fta_trials,
    new_mta_trials: d.new_mta_trials,
    delta_trials: d.new_mta_trials - d.fta_trials,
  })), [tradeDeskData]);

  // Same for MNTN
  const mntnDelta = useMemo(() => mntnData.map(d => ({
    month: d.month,
    label: monthLabel(d.month),
    fta_mrr: d.fta_mrr,
    new_mta_mrr: d.new_mta_mrr,
    delta_mrr: d.new_mta_mrr - d.fta_mrr,
    fta_conv: d.fta_conversions,
    new_mta_conv: d.new_mta_conversions,
    delta_conv: d.new_mta_conversions - d.fta_conversions,
  })), [mntnData]);

  // Combined programmatic chart data
  const progChartData = useMemo(() => progData.map(d => ({
    month: d.month,
    label: monthLabel(d.month),
    fta_mrr: d.fta_mrr,
    new_mta_mrr: d.new_mta_mrr,
    delta_mrr: d.new_mta_mrr - d.fta_mrr,
    gap_pct: d.fta_mrr > 0 ? ((d.new_mta_mrr - d.fta_mrr) / d.fta_mrr * 100) : 0,
  })), [progData]);

  // Channel migration analysis: what gained New MTA share as Programmatic/Trade Desk lost
  const l1Monthly = useMemo(() => aggregateL1ByMonth(data), [data]);
  const months = useMemo(() => Object.keys(l1Monthly).sort(), [l1Monthly]);
  
  // Compute share shifts from earliest to latest quarter
  const migrationData = useMemo(() => {
    if (months.length < 2) return [];
    const recentMonths = months.slice(-3);
    const earlierMonths = months.slice(-6, -3);

    // aggregate periods
    const recent: Record<string, { conv: number; mrr: number }> = {};
    const earlier: Record<string, { conv: number; mrr: number }> = {};
    let recentTotal = { conv: 0, mrr: 0 };
    let earlierTotal = { conv: 0, mrr: 0 };

    for (const m of recentMonths) {
      for (const [ch, v] of Object.entries(l1Monthly[m] || {})) {
        if (!recent[ch]) recent[ch] = { conv: 0, mrr: 0 };
        recent[ch].conv += v.new_mta_conv;
        recent[ch].mrr += v.new_mta_mrr;
        recentTotal.conv += v.new_mta_conv;
        recentTotal.mrr += v.new_mta_mrr;
      }
    }
    for (const m of earlierMonths) {
      for (const [ch, v] of Object.entries(l1Monthly[m] || {})) {
        if (!earlier[ch]) earlier[ch] = { conv: 0, mrr: 0 };
        earlier[ch].conv += v.new_mta_conv;
        earlier[ch].mrr += v.new_mta_mrr;
        earlierTotal.conv += v.new_mta_conv;
        earlierTotal.mrr += v.new_mta_mrr;
      }
    }

    const channels = new Set([...Object.keys(recent), ...Object.keys(earlier)]);
    const result: Array<{
      channel: string;
      earlier_mrr: number; recent_mrr: number; delta_mrr: number;
      earlier_share: number; recent_share: number; share_shift: number;
      earlier_conv: number; recent_conv: number; delta_conv: number;
    }> = [];

    for (const ch of channels) {
      const e = earlier[ch] || { conv: 0, mrr: 0 };
      const r = recent[ch] || { conv: 0, mrr: 0 };
      result.push({
        channel: ch,
        earlier_mrr: e.mrr, recent_mrr: r.mrr, delta_mrr: r.mrr - e.mrr,
        earlier_share: earlierTotal.mrr > 0 ? (e.mrr / earlierTotal.mrr * 100) : 0,
        recent_share: recentTotal.mrr > 0 ? (r.mrr / recentTotal.mrr * 100) : 0,
        share_shift: (recentTotal.mrr > 0 ? (r.mrr / recentTotal.mrr * 100) : 0) - (earlierTotal.mrr > 0 ? (e.mrr / earlierTotal.mrr * 100) : 0),
        earlier_conv: e.conv, recent_conv: r.conv, delta_conv: r.conv - e.conv,
      });
    }
    result.sort((a, b) => b.share_shift - a.share_shift);
    return result;
  }, [l1Monthly, months]);

  // For the Programmatic sub-channel breakdown chart
  const progL2Data = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    data.filter(r => r.channel_l1.toLowerCase() === 'programmatic' && r.model === 'new_mta').forEach(r => {
      const m = r.monthStr.substring(0, 7);
      if (!map[m]) map[m] = {};
      if (!map[m][r.channel_l2]) map[m][r.channel_l2] = 0;
      map[m][r.channel_l2] += r.mrr;
    });
    const allL2s = new Set<string>();
    Object.values(map).forEach(mv => Object.keys(mv).forEach(k => allL2s.add(k)));
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([m, channels]) => {
      const row: Record<string, any> = { month: m, label: monthLabel(m) };
      allL2s.forEach(l2 => { row[l2] = channels[l2] || 0; });
      return row;
    });
  }, [data]);

  const progL2Keys = useMemo(() => {
    const keys = new Set<string>();
    progL2Data.forEach(d => Object.keys(d).forEach(k => { if (k !== 'month' && k !== 'label') keys.add(k); }));
    return Array.from(keys).sort();
  }, [progL2Data]);

  // Key Insight numbers
  const latestTD = tradeDeskDelta[tradeDeskDelta.length - 1];
  const latestMNTN = mntnDelta[mntnDelta.length - 1];
  const latestProg = progChartData[progChartData.length - 1];

  const l2Colors: Record<string, string> = {
    'mntn': '#ef4444',
    'the trade desk': '#3b82f6',
    'tubi': '#a855f7',
    '': '#94a3b8',
  };

  const CHART_COLORS = ['#3b82f6', '#ef4444', '#a855f7', '#94a3b8', '#f59e0b', '#10b981'];

  if (!data.length) return null;

  return (
    <div>
      {/* ── Export Button ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          className="btn"
          onClick={handleExportPDF}
          disabled={exporting}
          style={{
            fontSize: '0.875rem',
            padding: '0.625rem 1.5rem',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#fff',
            cursor: exporting ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            opacity: exporting ? 0.7 : 1,
          }}
        >
          <FileDown size={16} />
          {exporting ? 'Generating PDF…' : 'Export Report as PDF'}
        </button>
      </div>

      {/* ── Report Content (what gets exported) ── */}
      <div ref={reportRef} style={{ background: '#fff' }}>
        {/* ──────── HEADER ──────── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          padding: '2rem 2.5rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <BarChart2 size={28} strokeWidth={2.5} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
              Trade Desk & Programmatic Channel Analysis
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            New MTA vs FTA Delta Report · Month-over-Month · Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* ──────── EXECUTIVE SUMMARY CARDS ──────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Trade Desk Latest Delta */}
          <SummaryCard
            title="Trade Desk MRR Delta"
            subtitle="New MTA − FTA (Latest Month)"
            value={latestTD ? fmt(latestTD.delta_mrr) : '—'}
            icon={<TrendingDown size={18} />}
            accent="#ef4444"
          />
          <SummaryCard
            title="Trade Desk FTA MRR"
            subtitle="Latest Month"
            value={latestTD ? fmt(latestTD.fta_mrr) : '—'}
            icon={<TrendingUp size={18} />}
            accent="#3b82f6"
          />
          <SummaryCard
            title="MNTN MRR Delta"
            subtitle="New MTA − FTA (Latest)"
            value={latestMNTN ? fmt(latestMNTN.delta_mrr) : '—'}
            icon={latestMNTN && latestMNTN.delta_mrr > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            accent="#f59e0b"
          />
          <SummaryCard
            title="Programmatic MRR Gap"
            subtitle="New MTA vs FTA (Latest)"
            value={latestProg ? fmt(latestProg.delta_mrr) : '—'}
            icon={<AlertTriangle size={18} />}
            accent="#a855f7"
          />
        </div>

        {/* ──────── SECTION 1: TRADE DESK DEEP DIVE ──────── */}
        <SectionHeader number="1" title="The Trade Desk — New MTA vs FTA Delta (MoM)" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* MRR Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#475569' }}>MRR: FTA vs New MTA</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={tradeDeskDelta}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="fta_mrr" name="FTA MRR" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="new_mta_mrr" name="New MTA MRR" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                <Line dataKey="delta_mrr" name="Delta (New MTA − FTA)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Conversions Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#475569' }}>Conversions: FTA vs New MTA</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={tradeDeskDelta}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="fta_conv" name="FTA Conversions" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="new_mta_conv" name="New MTA Conversions" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                <Line dataKey="delta_conv" name="Delta" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trade Desk MoM Table */}
        <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Trade Desk Month-over-Month Detail</h3>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>FTA Trials</th>
                  <th style={{ textAlign: 'right' }}>New MTA Trials</th>
                  <th style={{ textAlign: 'right' }}>Δ Trials</th>
                  <th style={{ textAlign: 'right' }}>FTA Conv</th>
                  <th style={{ textAlign: 'right' }}>New MTA Conv</th>
                  <th style={{ textAlign: 'right' }}>Δ Conv</th>
                  <th style={{ textAlign: 'right' }}>FTA MRR</th>
                  <th style={{ textAlign: 'right' }}>New MTA MRR</th>
                  <th style={{ textAlign: 'right' }}>Δ MRR</th>
                </tr>
              </thead>
              <tbody>
                {tradeDeskDelta.map((d) => {
                  return (
                    <tr key={d.month}>
                      <td style={{ fontWeight: 600 }}>{d.label}</td>
                      <td style={{ textAlign: 'right' }}>{fmtN(d.fta_trials)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtN(d.new_mta_trials)}</td>
                      <td style={{ textAlign: 'right', color: d.delta_trials < 0 ? '#ef4444' : d.delta_trials > 0 ? '#22c55e' : '#64748b' }}>
                        {d.delta_trials > 0 ? '+' : ''}{fmtN(d.delta_trials)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmtN(d.fta_conv)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtN(d.new_mta_conv)}</td>
                      <td style={{ textAlign: 'right', color: d.delta_conv < 0 ? '#ef4444' : d.delta_conv > 0 ? '#22c55e' : '#64748b' }}>
                        {d.delta_conv > 0 ? '+' : ''}{fmtN(d.delta_conv)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmt(d.fta_mrr)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(d.new_mta_mrr)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: d.delta_mrr < 0 ? '#ef4444' : d.delta_mrr > 0 ? '#22c55e' : '#64748b' }}>
                        {d.delta_mrr > 0 ? '+' : ''}{fmt(d.delta_mrr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Insight Box for Trade Desk */}
        <InsightBox
          type="warning"
          title="Trade Desk Observation"
          lines={[
            `The Trade Desk shows a persistent and widening negative delta: New MTA attributes significantly less MRR than FTA across every month in the dataset.`,
            `Latest month delta: ${latestTD ? fmt(latestTD.delta_mrr) : '—'} MRR (New MTA: ${latestTD ? fmt(latestTD.new_mta_mrr) : '—'} vs FTA: ${latestTD ? fmt(latestTD.fta_mrr) : '—'}).`,
            `However, both FTA and New MTA show strong growth trajectories — FTA MRR grew from ${tradeDeskDelta.length > 0 ? fmt(tradeDeskDelta[0].fta_mrr) : '—'} to ${latestTD ? fmt(latestTD.fta_mrr) : '—'}, and New MTA MRR from ${tradeDeskDelta.length > 0 ? fmt(tradeDeskDelta[0].new_mta_mrr) : '—'} to ${latestTD ? fmt(latestTD.new_mta_mrr) : '—'}.`,
            `The gap ratio is narrowing: FTA captures ~3x the MRR as New MTA in early months, shrinking to ~${latestTD && latestTD.new_mta_mrr > 0 ? (latestTD.fta_mrr / latestTD.new_mta_mrr).toFixed(1) : '—'}x in the latest month. This suggests the New MTA model is increasingly recognizing Trade Desk's contribution.`,
          ]}
        />

        {/* ──────── SECTION 2: MNTN ──────── */}
        <SectionHeader number="2" title="MNTN — New MTA vs FTA Delta (MoM)" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#475569' }}>MNTN MRR: FTA vs New MTA</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={mntnDelta}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="fta_mrr" name="FTA MRR" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="new_mta_mrr" name="New MTA MRR" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                <Line dataKey="delta_mrr" name="Delta" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#475569' }}>MNTN Conversions: FTA vs New MTA</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={mntnDelta}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="fta_conv" name="FTA Conversions" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="new_mta_conv" name="New MTA Conversions" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                <Line dataKey="delta_conv" name="Delta" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MNTN Table */}
        <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>MNTN Month-over-Month Detail</h3>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>FTA Conv</th>
                  <th style={{ textAlign: 'right' }}>New MTA Conv</th>
                  <th style={{ textAlign: 'right' }}>Δ Conv</th>
                  <th style={{ textAlign: 'right' }}>FTA MRR</th>
                  <th style={{ textAlign: 'right' }}>New MTA MRR</th>
                  <th style={{ textAlign: 'right' }}>Δ MRR</th>
                </tr>
              </thead>
              <tbody>
                {mntnDelta.map(d => (
                  <tr key={d.month}>
                    <td style={{ fontWeight: 600 }}>{d.label}</td>
                    <td style={{ textAlign: 'right' }}>{fmtN(d.fta_conv)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtN(d.new_mta_conv)}</td>
                    <td style={{ textAlign: 'right', color: d.delta_conv < 0 ? '#ef4444' : d.delta_conv > 0 ? '#22c55e' : '#64748b' }}>
                      {d.delta_conv > 0 ? '+' : ''}{fmtN(d.delta_conv)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmt(d.fta_mrr)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(d.new_mta_mrr)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: d.delta_mrr < 0 ? '#ef4444' : d.delta_mrr > 0 ? '#22c55e' : '#64748b' }}>
                      {d.delta_mrr > 0 ? '+' : ''}{fmt(d.delta_mrr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <InsightBox
          type="critical"
          title="MNTN Observation"
          lines={[
            `MNTN displays an inverse pattern to Trade Desk: FTA MRR is collapsing while New MTA MRR declines more moderately.`,
            `FTA MRR plummeted from ${mntnDelta.length > 0 ? fmt(mntnDelta[0].fta_mrr) : '—'} → ${latestMNTN ? fmt(latestMNTN.fta_mrr) : '—'}, a dramatic decline.`,
            `Meanwhile, New MTA MRR declined from ${mntnDelta.length > 0 ? fmt(mntnDelta[0].new_mta_mrr) : '—'} → ${latestMNTN ? fmt(latestMNTN.new_mta_mrr) : '—'} — a significant but less severe drop.`,
            `The New MTA model now attributes MORE value to MNTN than FTA does in recent months, suggesting FTA was historically over-crediting MNTN, and the new model is correcting for actual multi-touch contribution.`,
            `Both models show MNTN losing volume — this may reflect budget reallocation away from MNTN or declining performance.`,
          ]}
        />

        {/* ──────── SECTION 3: PROGRAMMATIC OVERALL ──────── */}
        <SectionHeader number="3" title="Programmatic (L1) — Aggregate Performance" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#475569' }}>Programmatic MRR: FTA vs New MTA</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={progChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Area type="monotone" dataKey="fta_mrr" name="FTA MRR" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} />
                <Area type="monotone" dataKey="new_mta_mrr" name="New MTA MRR" stroke="#f59e0b" fill="#f59e0b20" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#475569' }}>Programmatic MRR Gap % (New MTA vs FTA)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={progChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                <Bar dataKey="gap_pct" name="MRR Gap %" radius={[4, 4, 0, 0]} barSize={24}>
                  {progChartData.map((d, i) => (
                    <Cell key={i} fill={d.gap_pct < 0 ? '#ef4444' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Programmatic Sub-channel Breakdown */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#475569' }}>
            Programmatic Sub-channels (L2) — New MTA MRR Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={progL2Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              {progL2Keys.map((key, i) => (
                <Bar key={key} dataKey={key} name={key || '(other)'} stackId="a" fill={l2Colors[key.toLowerCase()] || CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <InsightBox
          type="info"
          title="Programmatic Composition Shift"
          lines={[
            `Within Programmatic, a clear compositional shift is occurring: MNTN's share of New MTA MRR is declining while The Trade Desk's share is growing.`,
            `MNTN New MTA MRR: ${mntnDelta.length > 0 ? fmt(mntnDelta[0].new_mta_mrr) : '—'} (${mntnDelta[0]?.label}) → ${latestMNTN ? fmt(latestMNTN.new_mta_mrr) : '—'} (${latestMNTN?.label})`,
            `Trade Desk New MTA MRR: ${tradeDeskDelta.length > 0 ? fmt(tradeDeskDelta[0].new_mta_mrr) : '—'} (${tradeDeskDelta[0]?.label}) → ${latestTD ? fmt(latestTD.new_mta_mrr) : '—'} (${latestTD?.label})`,
            `Net effect: Programmatic L1 New MTA MRR is declining overall because MNTN's loss exceeds Trade Desk's gain.`,
          ]}
        />

        {/* ──────── SECTION 4: CHANNEL MIGRATION ANALYSIS ──────── */}
        <SectionHeader number="4" title="Where Did MRR / Conversions Move? — Channel Migration Analysis" />

        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
          Comparing the last 3 months ({months.slice(-3).map(monthLabel).join(', ')}) vs prior 3 months ({months.slice(-6, -3).map(monthLabel).join(', ')}), 
          measured by New MTA attribution share.
        </p>

        <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>L1 Channel</th>
                  <th style={{ textAlign: 'right' }}>Prior 3M MRR</th>
                  <th style={{ textAlign: 'right' }}>Recent 3M MRR</th>
                  <th style={{ textAlign: 'right' }}>Δ MRR</th>
                  <th style={{ textAlign: 'right' }}>Prior Share</th>
                  <th style={{ textAlign: 'right' }}>Recent Share</th>
                  <th style={{ textAlign: 'right' }}>Share Shift</th>
                  <th style={{ textAlign: 'right' }}>Prior 3M Conv</th>
                  <th style={{ textAlign: 'right' }}>Recent 3M Conv</th>
                  <th style={{ textAlign: 'right' }}>Δ Conv</th>
                </tr>
              </thead>
              <tbody>
                {migrationData.filter(d => d.channel).map(d => (
                  <tr key={d.channel} style={{ background: d.channel.toLowerCase() === 'programmatic' ? '#fff7ed' : undefined }}>
                    <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{d.channel}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(d.earlier_mrr)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(d.recent_mrr)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: d.delta_mrr < 0 ? '#ef4444' : d.delta_mrr > 0 ? '#22c55e' : '#64748b' }}>
                      {d.delta_mrr > 0 ? '+' : ''}{fmt(d.delta_mrr)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{d.earlier_share.toFixed(1)}%</td>
                    <td style={{ textAlign: 'right' }}>{d.recent_share.toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: d.share_shift < -0.5 ? '#ef4444' : d.share_shift > 0.5 ? '#22c55e' : '#64748b' }}>
                      {d.share_shift > 0 ? '+' : ''}{d.share_shift.toFixed(1)}pp
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtN(d.earlier_conv)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtN(d.recent_conv)}</td>
                    <td style={{ textAlign: 'right', color: d.delta_conv < 0 ? '#ef4444' : d.delta_conv > 0 ? '#22c55e' : '#64748b' }}>
                      {d.delta_conv > 0 ? '+' : ''}{fmtN(d.delta_conv)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gainers vs Losers Visual */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} /> Top Share Gainers (New MTA)
            </h3>
            {migrationData.filter(d => d.share_shift > 0.2 && d.channel).slice(0, 8).map(d => (
              <div key={d.channel} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem'
              }}>
                <span style={{ fontWeight: 500 }}>{d.channel}</span>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>+{d.share_shift.toFixed(1)}pp</span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{fmt(d.delta_mrr)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingDown size={16} /> Top Share Losers (New MTA)
            </h3>
            {migrationData.filter(d => d.share_shift < -0.2 && d.channel).slice(-8).reverse().map(d => (
              <div key={d.channel} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem'
              }}>
                <span style={{ fontWeight: 500 }}>{d.channel}</span>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>{d.share_shift.toFixed(1)}pp</span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{fmt(d.delta_mrr)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <InsightBox
          type="success"
          title="Channel Migration Summary"
          lines={[
            `Programmatic as a whole is losing New MTA share, driven primarily by MNTN's decline. The attribution the New MTA model removes from Programmatic/MNTN appears to be redistributed to:`,
            `• App Marketing (Paid) — largest absolute MRR gainer, reflecting growing investment in app install campaigns`,
            `• Social Media — steady share gains suggesting growing incremental value from paid social`,
            `• Direct/Unknown — rising share may indicate the New MTA model struggles to attribute some conversions that FTA was crediting to Programmatic`,
            `• Influencer & YouTube — moderate gains reflecting shifting brand awareness budgets`,
            `Meanwhile, SEM Branded + Organic Search remain dominant but with slowly declining New MTA share, consistent with expected erosion of branded search in favor of multi-touch channels.`,
          ]}
        />

        {/* ──────── SECTION 5: KEY CONCLUSIONS ──────── */}
        <SectionHeader number="5" title="Key Conclusions & Recommendations" />

        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 50%, #faf5ff 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '0.75rem',
          padding: '1.5rem 2rem',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e40af' }}>
                🔍 Findings
              </h4>
              <ul style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: '1.8', paddingLeft: '1rem' }}>
                <li><strong>Trade Desk:</strong> FTA significantly over-credits vs New MTA. The gap is narrowing but still large (~{latestTD && latestTD.new_mta_mrr > 0 ? (latestTD.fta_mrr / latestTD.new_mta_mrr).toFixed(1) : '—'}x ratio). Absolute volumes growing strongly in both models.</li>
                <li><strong>MNTN:</strong> Volumes declining in both models. FTA is collapsing faster than New MTA. Suggests budget or performance issues, not just model reattribution.</li>
                <li><strong>Programmatic Total:</strong> The overall New MTA MRR gap vs FTA is widening — the New MTA model redistributes ~{latestProg ? ((1 - latestProg.new_mta_mrr / latestProg.fta_mrr) * 100).toFixed(0) : '—'}% of FTA-credited MRR to other channels.</li>
                <li><strong>Migration:</strong> Attribution volume flows primarily to App Marketing Paid, Social Media, and Direct/Unknown channels.</li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: '#7c3aed' }}>
                💡 Recommendations
              </h4>
              <ul style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: '1.8', paddingLeft: '1rem' }}>
                <li>Investigate MNTN's declining performance — is this a budget decision or diminishing returns?</li>
                <li>Use New MTA as the primary decision model for budget allocation as it better captures multi-touch contribution.</li>
                <li>Continue Trade Desk investment — both models show growth; New MTA is catching up to recognizing its contribution.</li>
                <li>Audit "Direct/Unknown" channel — rising share may indicate attribution gaps that need investigation.</li>
                <li>Consider shifting some budget from MNTN toward App Marketing Paid and Social Media, which show strong incremental gains.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.75rem' }}>
          Report generated from MMM Dashboard · {new Date().toISOString().substring(0, 10)} · Data range: {months[0] && monthLabel(months[0])} – {months.length > 0 && monthLabel(months[months.length - 1])}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */

function SummaryCard({ title, subtitle, value, icon, accent }: {
  title: string; subtitle: string; value: string;
  icon: ReactNode; accent: string;
}) {
  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>{value}</div>
      <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{subtitle}</div>
    </div>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      margin: '2rem 0 1rem', paddingBottom: '0.75rem',
      borderBottom: '2px solid #e2e8f0',
    }}>
      <span style={{
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        color: '#fff', fontWeight: 800, fontSize: '0.8125rem',
        width: '2rem', height: '2rem', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {number}
      </span>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
    </div>
  );
}

function InsightBox({ type, title, lines }: { type: 'warning' | 'critical' | 'info' | 'success'; title: string; lines: string[] }) {
  const colors: Record<string, { bg: string; border: string; icon: string; title: string }> = {
    warning: { bg: '#fffbeb', border: '#fbbf24', icon: '⚠️', title: '#92400e' },
    critical: { bg: '#fef2f2', border: '#ef4444', icon: '🔴', title: '#991b1b' },
    info: { bg: '#eff6ff', border: '#3b82f6', icon: '📊', title: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#22c55e', icon: '✅', title: '#166534' },
  };
  const c = colors[type];
  return (
    <div style={{
      background: c.bg, borderLeft: `4px solid ${c.border}`,
      borderRadius: '0 0.5rem 0.5rem 0', padding: '1rem 1.5rem',
      marginBottom: '1.5rem',
    }}>
      <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: c.title, marginBottom: '0.5rem' }}>
        {c.icon} {title}
      </h4>
      <ul style={{ fontSize: '0.8rem', color: '#334155', lineHeight: '1.7', paddingLeft: '1rem', margin: 0 }}>
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    </div>
  );
}
