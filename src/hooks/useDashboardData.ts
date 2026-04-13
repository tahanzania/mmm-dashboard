import { useState, useMemo } from 'react';
import type { NormalizedDataRow, PivotedMetrics } from '../utils/types';

export type CompareMode = 'None' | 'MoM' | 'QoQ' | 'YoY' | 'CustomDate' | 'CustomChannel';

export function useDashboardData() {
  const [data, setData] = useState<NormalizedDataRow[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>('All');
  const [activeL1, setActiveL1] = useState<string>('All');
  const [activeL2, setActiveL2] = useState<string>('All');
  const [activeL3, setActiveL3] = useState<string>('All');

  // Comparison State
  const [compareMode, setCompareMode] = useState<CompareMode>('None');
  const [compareMonth, setCompareMonth] = useState<string>('All');
  const [compareL1, setCompareL1] = useState<string>('All');

  const filters = useMemo(() => {
    const months = Array.from(new Set(data.map(d => d.monthStr))).sort();
    const l1 = Array.from(new Set(data.map(d => d.channel_l1))).sort();
    const l2 = Array.from(new Set(data.map(d => d.channel_l2))).sort();
    const l3 = Array.from(new Set(data.map(d => d.channel_l3))).sort();
    return { months: ['All', ...months], l1: ['All', ...l1], l2: ['All', ...l2], l3: ['All', ...l3] };
  }, [data]);

  const getOffsetMonth = (baseMonth: string, mode: CompareMode) => {
    if (baseMonth === 'All') return 'All';
    try {
      const d = new Date(baseMonth);
      if (mode === 'MoM') d.setUTCMonth(d.getUTCMonth() - 1);
      if (mode === 'QoQ') d.setUTCMonth(d.getUTCMonth() - 3);
      if (mode === 'YoY') d.setUTCFullYear(d.getUTCFullYear() - 1);
      const mOffset = d.getUTCMonth() + 1;
      return `${d.getUTCFullYear()}-${mOffset.toString().padStart(2, '0')}-01`;
    } catch {
      return baseMonth;
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (activeMonth !== 'All' && d.monthStr !== activeMonth) return false;
      if (activeL1 !== 'All' && d.channel_l1 !== activeL1) return false;
      if (activeL2 !== 'All' && d.channel_l2 !== activeL2) return false;
      if (activeL3 !== 'All' && d.channel_l3 !== activeL3) return false;
      return true;
    });
  }, [data, activeMonth, activeL1, activeL2, activeL3]);

  const compareFilteredData = useMemo(() => {
    if (compareMode === 'None') return [];
    
    let targetMonth = activeMonth;
    let targetL1 = activeL1;
    
    if (compareMode === 'CustomDate') targetMonth = compareMonth;
    else if (compareMode === 'CustomChannel') targetL1 = compareL1;
    else if (['MoM', 'QoQ', 'YoY'].includes(compareMode)) targetMonth = getOffsetMonth(activeMonth, compareMode);

    return data.filter(d => {
      if (targetMonth !== 'All' && d.monthStr.substring(0, 10) !== targetMonth.substring(0, 10)) {
         const dStr = new Date(d.monthStr).toISOString().substring(0,10);
         const tStr = new Date(targetMonth).toISOString().substring(0,10);
         if (dStr !== tStr) return false;
      }
      if (targetL1 !== 'All' && d.channel_l1 !== targetL1) return false;
      if (activeL2 !== 'All' && d.channel_l2 !== activeL2) return false;
      if (activeL3 !== 'All' && d.channel_l3 !== activeL3) return false;
      return true;
    });
  }, [data, activeMonth, activeL1, activeL2, activeL3, compareMode, compareMonth, compareL1]);

  const pivotAggregates = (dataset: NormalizedDataRow[]): PivotedMetrics => {
    const res = {
      fta: { trials: 0, conversions: 0, mrr: 0 },
      mta: { trials: 0, conversions: 0, mrr: 0 },
      new_mta: { trials: 0, conversions: 0, mrr: 0 },
    };
    dataset.forEach(row => {
       res[row.model].trials += row.trials;
       res[row.model].conversions += row.conversions;
       res[row.model].mrr += row.mrr;
    });
    return res;
  };

  const aggregateMetrics = useMemo(() => {
    return {
      base: pivotAggregates(filteredData),
      compare: compareMode !== 'None' ? pivotAggregates(compareFilteredData) : null
    };
  }, [filteredData, compareFilteredData, compareMode]);

  // Group by month for trend chart
  const trendData = useMemo(() => {
    const grouped = filteredData.reduce((acc, row) => {
      const m = row.monthStr;
      if (!acc[m]) {
        acc[m] = {
           monthStr: m, 
           fta_trials: 0, fta_conversions: 0, fta_mrr: 0,
           mta_trials: 0, mta_conversions: 0, mta_mrr: 0,
           new_mta_trials: 0, new_mta_conversions: 0, new_mta_mrr: 0
        };
      }
      acc[m][`${row.model}_trials`] += row.trials;
      acc[m][`${row.model}_conversions`] += row.conversions;
      acc[m][`${row.model}_mrr`] += row.mrr;
      return acc;
    }, {} as Record<string, any>);
    return Object.values(grouped).sort((a,b) => a.monthStr.localeCompare(b.monthStr));
  }, [filteredData]);

  const computeTableData = (levelKey: 'channel_l1' | 'channel_l2' | 'channel_l3') => {
    const grouped = filteredData.reduce((acc, row) => {
       const key = row[levelKey];
       if (!acc[key]) {
         acc[key] = {
           name: key,
           fta: { trials: 0, conversions: 0, mrr: 0 },
           mta: { trials: 0, conversions: 0, mrr: 0 },
           new_mta: { trials: 0, conversions: 0, mrr: 0 },
         };
       }
       acc[key][row.model].trials += row.trials;
       acc[key][row.model].conversions += row.conversions;
       acc[key][row.model].mrr += row.mrr;
       
       return acc;
    }, {} as Record<string, any>);
    return Object.values(grouped).sort((a, b) => b.new_mta.mrr - a.new_mta.mrr);
  };

  const l1Data = useMemo(() => computeTableData('channel_l1'), [filteredData]);
  const l2Data = useMemo(() => computeTableData('channel_l2'), [filteredData]);
  const l3Data = useMemo(() => computeTableData('channel_l3'), [filteredData]);

  return {
    data, setData,
    filters,
    activeMonth, setActiveMonth,
    activeL1, setActiveL1,
    activeL2, setActiveL2,
    activeL3, setActiveL3,
    compareMode, setCompareMode,
    compareMonth, setCompareMonth,
    compareL1, setCompareL1,
    aggregateMetrics,
    trendData,
    l1Data,
    l2Data,
    l3Data,
    hasData: data.length > 0
  };
}

export type DashboardContextType = ReturnType<typeof useDashboardData>;
