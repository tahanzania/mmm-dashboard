import React, { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { FileUploader } from './FileUploader';
import { FilterBar } from './FilterBar';
import { ExecutiveSummary } from './ExecutiveSummary';
import { TrendChart } from './TrendChart';
import { RankingTable } from './RankingTable';
import { GainersLosersTable } from './GainersLosersTable';
import { TradeDeskReport } from './TradeDeskReport';
import { BarChart2 } from 'lucide-react';

export function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<'overview' | 'gainers' | 'tradedesk'>('overview');
  const { 
    data, setData, filters, 
    activeMonth, setActiveMonth, 
    activeL1, setActiveL1, 
    activeL2, setActiveL2, 
    activeL3, setActiveL3,
    compareMode, setCompareMode,
    compareMonth, setCompareMonth,
    compareL1, setCompareL1,
    aggregateMetrics, trendData, l1Data, l2Data, l3Data, hasData 
  } = useDashboardData();

  if (!hasData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
         <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <BarChart2 size={40} className="text-primary"/>
              Marketing Mix Insights
            </h1>
            <p className="text-lg text-muted">Production-grade reporting & analytics</p>
         </div>
         <FileUploader onDataLoaded={setData} />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <header className="mb-8 flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
        <div>
           <h1 className="text-2xl font-bold flex items-center gap-3">
             <BarChart2 size={28} className="text-primary"/>
             Marketing Insights Dashboard
           </h1>
           <p className="text-sm text-muted mt-1">Multi-touch attribution insights and performance tracking</p>
        </div>
        <div className="text-sm border px-3 py-1 rounded-full bg-muted text-muted-foreground">
          {data.length.toLocaleString()} rows loaded
        </div>
      </header>

      <FilterBar 
        filters={filters} 
        activeMonth={activeMonth} setActiveMonth={setActiveMonth}
        activeL1={activeL1} setActiveL1={setActiveL1}
        activeL2={activeL2} setActiveL2={setActiveL2}
        activeL3={activeL3} setActiveL3={setActiveL3}
        compareMode={compareMode} setCompareMode={setCompareMode}
        compareMonth={compareMonth} setCompareMonth={setCompareMonth}
        compareL1={compareL1} setCompareL1={setCompareL1}
      />

      <ExecutiveSummary metrics={aggregateMetrics} />
      
      <div className="flex gap-4 mb-6 border-b border-[var(--border)] overflow-x-auto">
        <button 
          className={`pb-3 px-1 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('overview')}
        >
          Performance Overview
        </button>
        <button 
          className={`pb-3 px-1 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'gainers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('gainers')}
        >
          Attribution Deltas (Gainers vs Losers)
        </button>
        <button 
          className={`pb-3 px-1 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'tradedesk' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('tradedesk')}
        >
          📊 Trade Desk &amp; Programmatic Report
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          <TrendChart data={trendData} />
          <RankingTable title="Channel L1 Performance" data={l1Data} />
          <RankingTable title="Channel L2 Performance" data={l2Data} />
          <RankingTable title="Channel L3 Performance" data={l3Data} />
        </>
      ) : activeTab === 'gainers' ? (
        <>
          <GainersLosersTable title="L1 Attribution Gainers & Losers" data={l1Data} />
          <GainersLosersTable title="L2 Attribution Gainers & Losers" data={l2Data} />
          <GainersLosersTable title="L3 Attribution Gainers & Losers" data={l3Data} />
        </>
      ) : (
        <TradeDeskReport data={data} />
      )}

    </div>
  );
}
