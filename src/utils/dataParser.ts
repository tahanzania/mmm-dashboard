import Papa from 'papaparse';
import type { RawMMMDataRow, NormalizedDataRow, ModelType } from './types';

function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  const num = parseFloat(val.toString().replace(/[$,]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function parseCSVData(file: File): Promise<NormalizedDataRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawMMMDataRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<RawMMMDataRow>) => {
        const normalizedData: NormalizedDataRow[] = [];
        
        results.data.forEach((row: any) => {
          const getVal = (key: string) => {
             const exact = row[key];
             if (exact !== undefined) return exact;
             const found = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
             return found ? row[found] : '';
          };
          
          const monthStr = getVal('month') || '1970-01-01';
          const channel_l1 = getVal('channel_l1') || 'Unknown';
          const channel_l2 = getVal('channel_l2') || 'Unknown';
          const channel_l3 = getVal('channel_l3') || 'Unknown';

          const pushModel = (model: ModelType, tRaw: string, cRaw: string, mRaw: string) => {
            const trials = parseNumber(getVal(tRaw));
            const conversions = parseNumber(getVal(cRaw));
            const mrr = parseNumber(getVal(mRaw));
            
            // Exclude rows where all three are zero (meaning they were null in the raw CSV)
            if (trials === 0 && conversions === 0 && mrr === 0) return;

            normalizedData.push({
               monthStr, channel_l1, channel_l2, channel_l3,
               model, trials, conversions, mrr
            });
          };

          pushModel('fta', 'fta_trials', 'fta_conversions', 'fta_mrr');
          // Support both "mta_*" and "old_mta_*" column naming conventions
          if (getVal('old_mta_trials') !== '' || getVal('old_mta_conversions') !== '' || getVal('old_mta_mrr') !== '') {
            pushModel('mta', 'old_mta_trials', 'old_mta_conversions', 'old_mta_mrr');
          } else {
            pushModel('mta', 'mta_trials', 'mta_conversions', 'mta_mrr');
          }
          pushModel('new_mta', 'new_mta_trials', 'new_mta_conversions', 'new_mta_mrr');
        });
        
        resolve(normalizedData);
      },
      error: (error: Error) => reject(error),
    });
  });
}
