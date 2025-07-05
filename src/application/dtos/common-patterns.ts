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

// Type guards and utility functions for runtime validation
export function isPaginationParams(obj: unknown): obj is PaginationParams {
  if (typeof obj !== 'object' || obj === null) return false;
  const params = obj as Record<string, unknown>;

  if (params.offset !== undefined && (typeof params.offset !== 'number' || params.offset < 0)) {
    return false;
  }
  if (params.limit !== undefined && (typeof params.limit !== 'number' || params.limit < 0)) {
    return false;
  }
  if (params.orderBy !== undefined && typeof params.orderBy !== 'string') {
    return false;
  }
  if (
    params.orderDirection !== undefined &&
    params.orderDirection !== 'asc' &&
    params.orderDirection !== 'desc'
  ) {
    return false;
  }

  return true;
}

export function isFilterParams<T>(obj: unknown): obj is FilterParams<T> {
  if (typeof obj !== 'object' || obj === null) return false;
  const params = obj as Record<string, unknown>;

  if (params.where !== undefined && (typeof params.where !== 'object' || params.where === null)) {
    return false;
  }
  if (params.include !== undefined && !Array.isArray(params.include)) {
    return false;
  }
  if (params.exclude !== undefined && !Array.isArray(params.exclude)) {
    return false;
  }
  if (params.search !== undefined && typeof params.search !== 'string') {
    return false;
  }

  return true;
}

export function isPaginatedResult<T>(obj: unknown): obj is PaginatedResult<T> {
  if (typeof obj !== 'object' || obj === null) return false;
  const result = obj as Record<string, unknown>;

  return (
    Array.isArray(result.items) &&
    typeof result.total === 'number' &&
    result.total >= 0 &&
    typeof result.offset === 'number' &&
    result.offset >= 0 &&
    typeof result.limit === 'number' &&
    result.limit >= 0 &&
    typeof result.hasMore === 'boolean'
  );
}

export function isFieldSelection(obj: unknown): obj is FieldSelection {
  if (typeof obj !== 'object' || obj === null) return false;
  const selection = obj as Record<string, unknown>;

  if (
    selection.fields !== undefined &&
    (!Array.isArray(selection.fields) || !selection.fields.every((f) => typeof f === 'string'))
  ) {
    return false;
  }
  if (
    selection.expand !== undefined &&
    (!Array.isArray(selection.expand) || !selection.expand.every((e) => typeof e === 'string'))
  ) {
    return false;
  }
  if (selection.depth !== undefined && typeof selection.depth !== 'number') {
    return false;
  }

  return true;
}

// Utility functions for working with common patterns
export function createPaginationParams(
  options: {
    offset?: number;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  } = {},
): PaginationParams {
  const params: PaginationParams = {};

  if (options.offset !== undefined && options.offset >= 0) {
    params.offset = options.offset;
  }
  if (options.limit !== undefined && options.limit >= 0) {
    params.limit = options.limit;
  }
  if (options.orderBy !== undefined && options.orderBy.trim().length > 0) {
    params.orderBy = options.orderBy;
  }
  if (options.orderDirection !== undefined) {
    params.orderDirection = options.orderDirection;
  }

  return params;
}

export function createPaginatedResult<T>(
  items: T[],
  total: number,
  offset: number = 0,
  limit: number = 10,
): PaginatedResult<T> {
  if (total < 0) throw new Error('Total must be non-negative');
  if (offset < 0) throw new Error('Offset must be non-negative');
  if (limit <= 0) throw new Error('Limit must be positive');

  const hasMore = offset + items.length < total;

  return {
    items,
    total,
    offset,
    limit,
    hasMore,
  };
}

export function validatePaginationConsistency<T>(result: PaginatedResult<T>): boolean {
  if (result.items.length > result.limit) return false;
  if (result.offset < 0 || result.limit <= 0 || result.total < 0) return false;

  const expectedHasMore = result.offset + result.items.length < result.total;
  if (result.hasMore !== expectedHasMore) return false;

  return true;
}

export function mergeFieldSelections(...selections: FieldSelection[]): FieldSelection {
  const merged: FieldSelection = {};

  const allFields = new Set<string>();
  const allExpand = new Set<string>();
  let maxDepth: number | undefined;

  for (const selection of selections) {
    if (selection.fields) {
      selection.fields.forEach((field) => allFields.add(field));
    }
    if (selection.expand) {
      selection.expand.forEach((expand) => allExpand.add(expand));
    }
    if (selection.depth !== undefined) {
      maxDepth = maxDepth === undefined ? selection.depth : Math.max(maxDepth, selection.depth);
    }
  }

  if (allFields.size > 0) merged.fields = Array.from(allFields);
  if (allExpand.size > 0) merged.expand = Array.from(allExpand);
  if (maxDepth !== undefined) merged.depth = maxDepth;

  return merged;
}
