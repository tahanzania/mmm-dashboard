import type { DashboardContextType } from '../hooks/useDashboardData';

interface FilterBarProps {
  filters: DashboardContextType['filters'];
  activeMonth: string; setActiveMonth: (val: string) => void;
  activeL1: string; setActiveL1: (val: string) => void;
  activeL2: string; setActiveL2: (val: string) => void;
  activeL3: string; setActiveL3: (val: string) => void;
  compareMode: DashboardContextType['compareMode']; setCompareMode: (val: DashboardContextType['compareMode']) => void;
  compareMonth: string; setCompareMonth: (val: string) => void;
  compareL1: string; setCompareL1: (val: string) => void;
}

export function FilterBar({ 
  filters, 
  activeMonth, setActiveMonth, 
  activeL1, setActiveL1, 
  activeL2, setActiveL2, 
  activeL3, setActiveL3,
  compareMode, setCompareMode,
  compareMonth, setCompareMonth,
  compareL1, setCompareL1
}: FilterBarProps) {
  return (
    <div className="card p-6 mb-8 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <label className="text-sm font-semibold mb-2 block">Month</label>
          <select className="select-input" value={activeMonth} onChange={e => setActiveMonth(e.target.value)}>
            {filters.months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-semibold mb-2 block">Channel L1</label>
          <select className="select-input" value={activeL1} onChange={e => setActiveL1(e.target.value)}>
            {filters.l1.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-semibold mb-2 block">Channel L2</label>
          <select className="select-input" value={activeL2} onChange={e => setActiveL2(e.target.value)}>
            {filters.l2.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-semibold mb-2 block">Channel L3</label>
          <select className="select-input" value={activeL3} onChange={e => setActiveL3(e.target.value)}>
            {filters.l3.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t pt-4">
         <div className="flex flex-col md:flex-row gap-6 items-end">
           <div className="flex-1">
             <label className="text-sm font-semibold mb-2 block text-primary">Compare Mode</label>
             <select className="select-input border-primary" value={compareMode} onChange={e => setCompareMode(e.target.value as any)}>
               <option value="None">None</option>
               <option value="MoM">Previous Month (MoM)</option>
               <option value="QoQ">Previous Quarter (QoQ)</option>
               <option value="YoY">Previous Year (YoY)</option>
               <option value="CustomDate">Custom Date</option>
               <option value="CustomChannel">Custom Channel L1</option>
             </select>
           </div>
           
           {compareMode === 'CustomDate' && (
             <div className="flex-1">
               <label className="text-sm font-semibold mb-2 block">Compare to Month</label>
               <select className="select-input" value={compareMonth} onChange={e => setCompareMonth(e.target.value)}>
                 {filters.months.map(m => (
                   <option key={m} value={m}>{m}</option>
                 ))}
               </select>
             </div>
           )}

           {compareMode === 'CustomChannel' && (
             <div className="flex-1">
               <label className="text-sm font-semibold mb-2 block">Compare to Channel L1</label>
               <select className="select-input" value={compareL1} onChange={e => setCompareL1(e.target.value)}>
                 {filters.l1.map(l => (
                   <option key={l} value={l}>{l}</option>
                 ))}
               </select>
             </div>
           )}
           <div className="flex-[2]"></div>
         </div>
         {['MoM', 'QoQ', 'YoY'].includes(compareMode) && activeMonth === 'All' && (
           <p className="text-xs mt-2" style={{color: 'var(--chart-3)'}}>Warning: Select a specific Month to use automated Offset comparisons.</p>
         )}
      </div>
    </div>
  );
}
