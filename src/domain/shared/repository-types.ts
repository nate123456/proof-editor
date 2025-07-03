export type LogicalStructureType =
  | 'conditional'
  | 'biconditional'
  | 'conjunction'
  | 'disjunction'
  | 'negation'
  | 'quantified';

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'expert';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UsageMetrics {
  totalUsage: number;
  recentUsage: number;
  lastUsedAt?: Date;
}

export interface PatternSearchOptions extends QueryOptions {
  caseSensitive?: boolean;
  wholeWords?: boolean;
}
