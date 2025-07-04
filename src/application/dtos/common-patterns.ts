export interface PaginationParams {
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterParams<T> {
  where?: Partial<T>;
  include?: string[];
  exclude?: string[];
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// Field selection for GraphQL-style queries
export interface FieldSelection {
  fields?: string[];
  expand?: string[];
  depth?: number;
}
