export interface RawMMMDataRow {
  month: string;
  channel_l1: string;
  channel_l2: string;
  channel_l3: string;
  fta_trials: string;
  fta_conversions: string;
  fta_mrr: string;
  mta_trials: string;
  mta_conversions: string;
  mta_mrr: string;
  new_mta_trials: string;
  new_mta_conversions: string;
  new_mta_mrr: string;
}

export type ModelType = 'fta' | 'mta' | 'new_mta';

export interface NormalizedDataRow {
  monthStr: string;
  channel_l1: string;
  channel_l2: string;
  channel_l3: string;
  model: ModelType;
  trials: number;
  conversions: number;
  mrr: number;
}

export interface AggregateMetrics {
  trials: number;
  conversions: number;
  mrr: number;
}

export interface PivotedMetrics {
  fta: AggregateMetrics;
  mta: AggregateMetrics;
  new_mta: AggregateMetrics;
}
