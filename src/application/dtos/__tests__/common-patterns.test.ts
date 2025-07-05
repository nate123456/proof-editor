/**
 * Comprehensive test suite for common-patterns.ts DTOs
 *
 * Tests data structure validation, type integrity, and boundary conditions
 * for application layer DTOs used for pagination, filtering, and field selection.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  FieldSelection,
  FilterParams,
  PaginatedResult,
  PaginationParams,
} from '../common-patterns.js';
import {
  createPaginatedResult,
  createPaginationParams,
  isFieldSelection,
  isFilterParams,
  isPaginatedResult,
  isPaginationParams,
  mergeFieldSelections,
  validatePaginationConsistency,
} from '../common-patterns.js';

describe('PaginationParams', () => {
  it('should handle valid pagination parameters', () => {
    const paginationParams: PaginationParams = {
      offset: 0,
      limit: 10,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    };

    expect(paginationParams.offset).toBe(0);
    expect(paginationParams.limit).toBe(10);
    expect(paginationParams.orderBy).toBe('createdAt');
    expect(paginationParams.orderDirection).toBe('desc');
  });

  it('should handle empty pagination parameters', () => {
    const paginationParams: PaginationParams = {};

    expect(paginationParams.offset).toBeUndefined();
    expect(paginationParams.limit).toBeUndefined();
    expect(paginationParams.orderBy).toBeUndefined();
    expect(paginationParams.orderDirection).toBeUndefined();
  });

  it('should handle partial pagination parameters', () => {
    const paginationParams: PaginationParams = {
      offset: 20,
      limit: 5,
    };

    expect(paginationParams.offset).toBe(20);
    expect(paginationParams.limit).toBe(5);
    expect(paginationParams.orderBy).toBeUndefined();
    expect(paginationParams.orderDirection).toBeUndefined();
  });

  it('should handle zero offset and limit', () => {
    const paginationParams: PaginationParams = {
      offset: 0,
      limit: 0,
    };

    expect(paginationParams.offset).toBe(0);
    expect(paginationParams.limit).toBe(0);
  });

  it('should handle large offset and limit values', () => {
    const paginationParams: PaginationParams = {
      offset: 1000000,
      limit: 100000,
    };

    expect(paginationParams.offset).toBe(1000000);
    expect(paginationParams.limit).toBe(100000);
  });

  it('should accept both ascending and descending order directions', () => {
    const ascParams: PaginationParams = {
      orderDirection: 'asc',
    };
    const descParams: PaginationParams = {
      orderDirection: 'desc',
    };

    expect(ascParams.orderDirection).toBe('asc');
    expect(descParams.orderDirection).toBe('desc');
  });

  it('should handle various orderBy field names', () => {
    const orderByFields = ['id', 'name', 'createdAt', 'modifiedAt', 'title', 'status'];

    orderByFields.forEach((field) => {
      const paginationParams: PaginationParams = {
        orderBy: field,
      };

      expect(paginationParams.orderBy).toBe(field);
    });
  });

  it('should handle special characters in orderBy field names', () => {
    const specialFields = ['user.name', 'metadata.tags', 'nested_field', 'field-name'];

    specialFields.forEach((field) => {
      const paginationParams: PaginationParams = {
        orderBy: field,
      };

      expect(paginationParams.orderBy).toBe(field);
    });
  });
});

describe('FilterParams', () => {
  it('should handle complete filter parameters', () => {
    interface TestEntity {
      id: string;
      name: string;
      status: 'active' | 'inactive';
    }

    const filterParams: FilterParams<TestEntity> = {
      where: { status: 'active' },
      include: ['metadata', 'relations'],
      exclude: ['internal'],
      search: 'test query',
    };

    expect(filterParams.where).toEqual({ status: 'active' });
    expect(filterParams.include).toEqual(['metadata', 'relations']);
    expect(filterParams.exclude).toEqual(['internal']);
    expect(filterParams.search).toBe('test query');
  });

  it('should handle empty filter parameters', () => {
    interface TestEntity {
      id: string;
    }

    const filterParams: FilterParams<TestEntity> = {};

    expect(filterParams.where).toBeUndefined();
    expect(filterParams.include).toBeUndefined();
    expect(filterParams.exclude).toBeUndefined();
    expect(filterParams.search).toBeUndefined();
  });

  it('should handle partial where conditions', () => {
    interface TestEntity {
      id: string;
      name: string;
      age: number;
      active: boolean;
    }

    const filterParams: FilterParams<TestEntity> = {
      where: {
        name: 'John',
        active: true,
      },
    };

    expect(filterParams.where).toEqual({ name: 'John', active: true });
  });

  it('should handle empty include and exclude arrays', () => {
    interface TestEntity {
      id: string;
    }

    const filterParams: FilterParams<TestEntity> = {
      include: [],
      exclude: [],
    };

    expect(filterParams.include).toEqual([]);
    expect(filterParams.exclude).toEqual([]);
  });

  it('should handle single item include and exclude arrays', () => {
    interface TestEntity {
      id: string;
    }

    const filterParams: FilterParams<TestEntity> = {
      include: ['metadata'],
      exclude: ['internal'],
    };

    expect(filterParams.include).toEqual(['metadata']);
    expect(filterParams.exclude).toEqual(['internal']);
  });

  it('should handle multiple include and exclude items', () => {
    interface TestEntity {
      id: string;
    }

    const filterParams: FilterParams<TestEntity> = {
      include: ['metadata', 'relations', 'computed'],
      exclude: ['internal', 'temp', 'cache'],
    };

    expect(filterParams.include).toHaveLength(3);
    expect(filterParams.exclude).toHaveLength(3);
    expect(filterParams.include).toContain('metadata');
    expect(filterParams.exclude).toContain('internal');
  });

  it('should handle empty search string', () => {
    interface TestEntity {
      id: string;
    }

    const filterParams: FilterParams<TestEntity> = {
      search: '',
    };

    expect(filterParams.search).toBe('');
  });

  it('should handle whitespace-only search string', () => {
    interface TestEntity {
      id: string;
    }

    const filterParams: FilterParams<TestEntity> = {
      search: '   ',
    };

    expect(filterParams.search).toBe('   ');
  });

  it('should handle search with special characters', () => {
    interface TestEntity {
      id: string;
    }

    const searchQueries = [
      'test@example.com',
      'user:admin',
      'tag:important',
      'name="John Doe"',
      'status!=inactive',
      'created_at>2023-01-01',
    ];

    searchQueries.forEach((query) => {
      const filterParams: FilterParams<TestEntity> = {
        search: query,
      };

      expect(filterParams.search).toBe(query);
    });
  });

  it('should handle complex where conditions with various types', () => {
    interface ComplexEntity {
      id: string;
      name: string;
      count: number;
      active: boolean;
      tags: string[];
      metadata?: Record<string, unknown>;
    }

    const filterParams: FilterParams<ComplexEntity> = {
      where: {
        name: 'Test Name',
        count: 42,
        active: true,
        tags: ['tag1', 'tag2'],
      },
    };

    expect(filterParams.where?.name).toBe('Test Name');
    expect(filterParams.where?.count).toBe(42);
    expect(filterParams.where?.active).toBe(true);
    expect(filterParams.where?.tags).toEqual(['tag1', 'tag2']);
  });
});

describe('PaginatedResult', () => {
  it('should handle paginated result with items', () => {
    interface TestItem {
      id: string;
      name: string;
    }

    const items: TestItem[] = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    const paginatedResult: PaginatedResult<TestItem> = {
      items,
      total: 100,
      offset: 0,
      limit: 10,
      hasMore: true,
    };

    expect(paginatedResult.items).toHaveLength(2);
    expect(paginatedResult.items[0]?.id).toBe('1');
    expect(paginatedResult.total).toBe(100);
    expect(paginatedResult.offset).toBe(0);
    expect(paginatedResult.limit).toBe(10);
    expect(paginatedResult.hasMore).toBe(true);
  });

  it('should handle empty paginated result', () => {
    interface TestItem {
      id: string;
    }

    const paginatedResult: PaginatedResult<TestItem> = {
      items: [],
      total: 0,
      offset: 0,
      limit: 10,
      hasMore: false,
    };

    expect(paginatedResult.items).toHaveLength(0);
    expect(paginatedResult.total).toBe(0);
    expect(paginatedResult.hasMore).toBe(false);
  });

  it('should handle last page scenario', () => {
    interface TestItem {
      id: string;
    }

    const items: TestItem[] = [{ id: '91' }, { id: '92' }, { id: '93' }];

    const paginatedResult: PaginatedResult<TestItem> = {
      items,
      total: 93,
      offset: 90,
      limit: 10,
      hasMore: false,
    };

    expect(paginatedResult.items).toHaveLength(3);
    expect(paginatedResult.total).toBe(93);
    expect(paginatedResult.offset).toBe(90);
    expect(paginatedResult.hasMore).toBe(false);
  });

  it('should handle single item result', () => {
    interface TestItem {
      id: string;
    }

    const paginatedResult: PaginatedResult<TestItem> = {
      items: [{ id: '1' }],
      total: 1,
      offset: 0,
      limit: 10,
      hasMore: false,
    };

    expect(paginatedResult.items).toHaveLength(1);
    expect(paginatedResult.total).toBe(1);
    expect(paginatedResult.hasMore).toBe(false);
  });

  it('should handle large dataset pagination', () => {
    interface TestItem {
      id: string;
    }

    const items: TestItem[] = Array.from({ length: 1000 }, (_, i) => ({ id: `${i + 1}` }));

    const paginatedResult: PaginatedResult<TestItem> = {
      items,
      total: 1000000,
      offset: 500000,
      limit: 1000,
      hasMore: true,
    };

    expect(paginatedResult.items).toHaveLength(1000);
    expect(paginatedResult.total).toBe(1000000);
    expect(paginatedResult.offset).toBe(500000);
    expect(paginatedResult.hasMore).toBe(true);
  });

  it('should handle consistency between items length and pagination info', () => {
    interface TestItem {
      id: string;
    }

    const items: TestItem[] = [{ id: '1' }, { id: '2' }, { id: '3' }];

    const paginatedResult: PaginatedResult<TestItem> = {
      items,
      total: 50,
      offset: 10,
      limit: 10,
      hasMore: true,
    };

    // Items length should be <= limit
    expect(paginatedResult.items.length).toBeLessThanOrEqual(paginatedResult.limit);

    // Total should be >= offset + items.length if hasMore is true
    if (paginatedResult.hasMore) {
      expect(paginatedResult.total).toBeGreaterThan(
        paginatedResult.offset + paginatedResult.items.length,
      );
    }
  });

  it('should handle edge case where items equal limit', () => {
    interface TestItem {
      id: string;
    }

    const items: TestItem[] = Array.from({ length: 5 }, (_, i) => ({ id: `${i + 1}` }));

    const paginatedResult: PaginatedResult<TestItem> = {
      items,
      total: 5,
      offset: 0,
      limit: 5,
      hasMore: false,
    };

    expect(paginatedResult.items).toHaveLength(5);
    expect(paginatedResult.items.length).toBe(paginatedResult.limit);
    expect(paginatedResult.hasMore).toBe(false);
  });
});

describe('FieldSelection', () => {
  it('should handle complete field selection', () => {
    const fieldSelection: FieldSelection = {
      fields: ['id', 'name', 'createdAt'],
      expand: ['metadata', 'relations'],
      depth: 3,
    };

    expect(fieldSelection.fields).toEqual(['id', 'name', 'createdAt']);
    expect(fieldSelection.expand).toEqual(['metadata', 'relations']);
    expect(fieldSelection.depth).toBe(3);
  });

  it('should handle empty field selection', () => {
    const fieldSelection: FieldSelection = {};

    expect(fieldSelection.fields).toBeUndefined();
    expect(fieldSelection.expand).toBeUndefined();
    expect(fieldSelection.depth).toBeUndefined();
  });

  it('should handle empty field arrays', () => {
    const fieldSelection: FieldSelection = {
      fields: [],
      expand: [],
    };

    expect(fieldSelection.fields).toEqual([]);
    expect(fieldSelection.expand).toEqual([]);
  });

  it('should handle single field selections', () => {
    const fieldSelection: FieldSelection = {
      fields: ['id'],
      expand: ['metadata'],
    };

    expect(fieldSelection.fields).toEqual(['id']);
    expect(fieldSelection.expand).toEqual(['metadata']);
  });

  it('should handle nested field selections', () => {
    const fieldSelection: FieldSelection = {
      fields: ['user.name', 'user.email', 'metadata.tags'],
      expand: ['user.profile', 'metadata.relations'],
    };

    expect(fieldSelection.fields).toContain('user.name');
    expect(fieldSelection.fields).toContain('metadata.tags');
    expect(fieldSelection.expand).toContain('user.profile');
    expect(fieldSelection.expand).toContain('metadata.relations');
  });

  it('should handle depth of zero', () => {
    const fieldSelection: FieldSelection = {
      depth: 0,
    };

    expect(fieldSelection.depth).toBe(0);
  });

  it('should handle negative depth', () => {
    const fieldSelection: FieldSelection = {
      depth: -1,
    };

    expect(fieldSelection.depth).toBe(-1);
  });

  it('should handle large depth values', () => {
    const fieldSelection: FieldSelection = {
      depth: 100,
    };

    expect(fieldSelection.depth).toBe(100);
  });

  it('should handle special characters in field names', () => {
    const fieldSelection: FieldSelection = {
      fields: ['user-name', 'created_at', 'metadata.nested-field'],
      expand: ['user-profile', 'metadata.nested-relations'],
    };

    expect(fieldSelection.fields).toContain('user-name');
    expect(fieldSelection.fields).toContain('created_at');
    expect(fieldSelection.expand).toContain('user-profile');
  });

  it('should handle large field lists', () => {
    const largeFieldList = Array.from({ length: 100 }, (_, i) => `field${i}`);
    const largeExpandList = Array.from({ length: 50 }, (_, i) => `expand${i}`);

    const fieldSelection: FieldSelection = {
      fields: largeFieldList,
      expand: largeExpandList,
    };

    expect(fieldSelection.fields).toHaveLength(100);
    expect(fieldSelection.expand).toHaveLength(50);
    expect(fieldSelection.fields).toContain('field0');
    expect(fieldSelection.fields).toContain('field99');
    expect(fieldSelection.expand).toContain('expand0');
    expect(fieldSelection.expand).toContain('expand49');
  });

  it('should handle duplicate fields', () => {
    const fieldSelection: FieldSelection = {
      fields: ['id', 'name', 'id', 'name'],
      expand: ['metadata', 'relations', 'metadata'],
    };

    expect(fieldSelection.fields).toHaveLength(4);
    expect(fieldSelection.expand).toHaveLength(3);
    expect(fieldSelection.fields?.filter((f) => f === 'id')).toHaveLength(2);
    expect(fieldSelection.expand?.filter((e) => e === 'metadata')).toHaveLength(2);
  });
});

describe('property-based testing', () => {
  it('should handle arbitrary valid pagination parameters', () => {
    fc.assert(
      fc.property(
        fc.record({
          offset: fc.option(fc.nat(), { nil: undefined }),
          limit: fc.option(fc.nat(), { nil: undefined }),
          orderBy: fc.option(fc.string(), { nil: undefined }),
          orderDirection: fc.option(fc.constantFrom('asc', 'desc'), { nil: undefined }),
        }),
        (params) => {
          const paginationParams: PaginationParams = {
            ...(params.offset !== undefined ? { offset: params.offset } : {}),
            ...(params.limit !== undefined ? { limit: params.limit } : {}),
            ...(params.orderBy !== undefined ? { orderBy: params.orderBy } : {}),
            ...(params.orderDirection !== undefined
              ? { orderDirection: params.orderDirection }
              : {}),
          };

          if (paginationParams.offset !== undefined) {
            expect(paginationParams.offset).toBeGreaterThanOrEqual(0);
          }
          if (paginationParams.limit !== undefined) {
            expect(paginationParams.limit).toBeGreaterThanOrEqual(0);
          }
          if (paginationParams.orderDirection !== undefined) {
            expect(['asc', 'desc']).toContain(paginationParams.orderDirection);
          }
        },
      ),
    );
  });

  it('should handle arbitrary paginated results', () => {
    fc.assert(
      fc.property(
        fc.record({
          items: fc.array(fc.record({ id: fc.string() })),
          total: fc.nat(),
          offset: fc.nat(),
          limit: fc.nat().filter((n) => n > 0),
          hasMore: fc.boolean(),
        }),
        (params) => {
          const paginatedResult: PaginatedResult<{ id: string }> = params;

          expect(paginatedResult.items).toBeInstanceOf(Array);
          expect(paginatedResult.total).toBeGreaterThanOrEqual(0);
          expect(paginatedResult.offset).toBeGreaterThanOrEqual(0);
          expect(paginatedResult.limit).toBeGreaterThan(0);
          expect(typeof paginatedResult.hasMore).toBe('boolean');
        },
      ),
    );
  });

  it('should handle arbitrary field selections', () => {
    fc.assert(
      fc.property(
        fc.record({
          fields: fc.option(fc.array(fc.string()), { nil: undefined }),
          expand: fc.option(fc.array(fc.string()), { nil: undefined }),
          depth: fc.option(fc.integer(), { nil: undefined }),
        }),
        (params) => {
          const fieldSelection: FieldSelection = {
            ...(params.fields !== undefined ? { fields: params.fields } : {}),
            ...(params.expand !== undefined ? { expand: params.expand } : {}),
            ...(params.depth !== undefined ? { depth: params.depth } : {}),
          };

          if (fieldSelection.fields !== undefined) {
            expect(fieldSelection.fields).toBeInstanceOf(Array);
            fieldSelection.fields.forEach((field) => {
              expect(typeof field).toBe('string');
            });
          }
          if (fieldSelection.expand !== undefined) {
            expect(fieldSelection.expand).toBeInstanceOf(Array);
            fieldSelection.expand.forEach((expand) => {
              expect(typeof expand).toBe('string');
            });
          }
          if (fieldSelection.depth !== undefined) {
            expect(typeof fieldSelection.depth).toBe('number');
          }
        },
      ),
    );
  });
});

describe('Utility Functions Coverage', () => {
  describe('isPaginationParams', () => {
    it('should return true for valid pagination parameters', () => {
      expect(isPaginationParams({})).toBe(true);
      expect(isPaginationParams({ offset: 0, limit: 10 })).toBe(true);
      expect(isPaginationParams({ orderBy: 'name', orderDirection: 'asc' })).toBe(true);
      expect(
        isPaginationParams({ offset: 0, limit: 10, orderBy: 'id', orderDirection: 'desc' }),
      ).toBe(true);
    });

    it('should return false for invalid pagination parameters', () => {
      expect(isPaginationParams(null)).toBe(false);
      expect(isPaginationParams(undefined)).toBe(false);
      expect(isPaginationParams('string')).toBe(false);
      expect(isPaginationParams(123)).toBe(false);
      expect(isPaginationParams({ offset: -1 })).toBe(false);
      expect(isPaginationParams({ limit: -1 })).toBe(false);
      expect(isPaginationParams({ orderBy: 123 })).toBe(false);
      expect(isPaginationParams({ orderDirection: 'invalid' })).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isPaginationParams({ offset: 0 })).toBe(true);
      expect(isPaginationParams({ limit: 0 })).toBe(true);
      expect(isPaginationParams({ orderBy: '' })).toBe(true);
      expect(isPaginationParams({ orderDirection: 'asc' })).toBe(true);
      expect(isPaginationParams({ orderDirection: 'desc' })).toBe(true);
    });
  });

  describe('isFilterParams', () => {
    it('should return true for valid filter parameters', () => {
      expect(isFilterParams({})).toBe(true);
      expect(isFilterParams({ where: { id: '1' } })).toBe(true);
      expect(isFilterParams({ include: ['metadata'] })).toBe(true);
      expect(isFilterParams({ exclude: ['internal'] })).toBe(true);
      expect(isFilterParams({ search: 'test' })).toBe(true);
    });

    it('should return false for invalid filter parameters', () => {
      expect(isFilterParams(null)).toBe(false);
      expect(isFilterParams(undefined)).toBe(false);
      expect(isFilterParams('string')).toBe(false);
      expect(isFilterParams({ where: 'invalid' })).toBe(false);
      expect(isFilterParams({ include: 'not-array' })).toBe(false);
      expect(isFilterParams({ exclude: 'not-array' })).toBe(false);
      expect(isFilterParams({ search: 123 })).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isFilterParams({ where: {} })).toBe(true);
      expect(isFilterParams({ include: [] })).toBe(true);
      expect(isFilterParams({ exclude: [] })).toBe(true);
      expect(isFilterParams({ search: '' })).toBe(true);
    });
  });

  describe('isPaginatedResult', () => {
    it('should return true for valid paginated results', () => {
      const validResult = {
        items: [],
        total: 0,
        offset: 0,
        limit: 10,
        hasMore: false,
      };
      expect(isPaginatedResult(validResult)).toBe(true);
    });

    it('should return false for invalid paginated results', () => {
      expect(isPaginatedResult(null)).toBe(false);
      expect(isPaginatedResult({})).toBe(false);
      expect(isPaginatedResult({ items: 'not-array' })).toBe(false);
      expect(isPaginatedResult({ items: [], total: -1 })).toBe(false);
      expect(isPaginatedResult({ items: [], total: 0, offset: -1 })).toBe(false);
      expect(isPaginatedResult({ items: [], total: 0, offset: 0, limit: -1 })).toBe(false);
      expect(
        isPaginatedResult({ items: [], total: 0, offset: 0, limit: 0, hasMore: 'not-boolean' }),
      ).toBe(false);
    });

    it('should validate all required fields', () => {
      const baseResult = {
        items: [{ id: '1' }],
        total: 1,
        offset: 0,
        limit: 10,
        hasMore: false,
      };

      expect(isPaginatedResult(baseResult)).toBe(true);
      expect(isPaginatedResult({ ...baseResult, items: undefined })).toBe(false);
      expect(isPaginatedResult({ ...baseResult, total: undefined })).toBe(false);
      expect(isPaginatedResult({ ...baseResult, offset: undefined })).toBe(false);
      expect(isPaginatedResult({ ...baseResult, limit: undefined })).toBe(false);
      expect(isPaginatedResult({ ...baseResult, hasMore: undefined })).toBe(false);
    });
  });

  describe('isFieldSelection', () => {
    it('should return true for valid field selections', () => {
      expect(isFieldSelection({})).toBe(true);
      expect(isFieldSelection({ fields: ['id', 'name'] })).toBe(true);
      expect(isFieldSelection({ expand: ['metadata'] })).toBe(true);
      expect(isFieldSelection({ depth: 2 })).toBe(true);
    });

    it('should return false for invalid field selections', () => {
      expect(isFieldSelection(null)).toBe(false);
      expect(isFieldSelection(undefined)).toBe(false);
      expect(isFieldSelection({ fields: 'not-array' })).toBe(false);
      expect(isFieldSelection({ fields: [123] })).toBe(false);
      expect(isFieldSelection({ expand: 'not-array' })).toBe(false);
      expect(isFieldSelection({ expand: [123] })).toBe(false);
      expect(isFieldSelection({ depth: 'not-number' })).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isFieldSelection({ fields: [] })).toBe(true);
      expect(isFieldSelection({ expand: [] })).toBe(true);
      expect(isFieldSelection({ depth: 0 })).toBe(true);
      expect(isFieldSelection({ depth: -1 })).toBe(true);
    });
  });

  describe('createPaginationParams', () => {
    it('should create valid pagination parameters', () => {
      const params = createPaginationParams();
      expect(params).toEqual({});
    });

    it('should include valid options', () => {
      const params = createPaginationParams({
        offset: 10,
        limit: 20,
        orderBy: 'name',
        orderDirection: 'desc',
      });
      expect(params).toEqual({
        offset: 10,
        limit: 20,
        orderBy: 'name',
        orderDirection: 'desc',
      });
    });

    it('should filter out invalid options', () => {
      const params = createPaginationParams({
        offset: -1,
        limit: -1,
        orderBy: '   ',
        orderDirection: 'asc',
      });
      expect(params).toEqual({
        orderDirection: 'asc',
      });
    });

    it('should handle edge cases', () => {
      const params = createPaginationParams({
        offset: 0,
        limit: 0,
        orderBy: '',
      });
      expect(params).toEqual({
        offset: 0,
        limit: 0,
      });
    });
  });

  describe('createPaginatedResult', () => {
    it('should create valid paginated result', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = createPaginatedResult(items, 10, 0, 5);
      expect(result).toEqual({
        items,
        total: 10,
        offset: 0,
        limit: 5,
        hasMore: true,
      });
    });

    it('should handle default parameters', () => {
      const items = [{ id: '1' }];
      const result = createPaginatedResult(items, 1);
      expect(result).toEqual({
        items,
        total: 1,
        offset: 0,
        limit: 10,
        hasMore: false,
      });
    });

    it('should calculate hasMore correctly', () => {
      const items = [{ id: '1' }, { id: '2' }];

      // Has more items
      let result = createPaginatedResult(items, 10, 0, 5);
      expect(result.hasMore).toBe(true);

      // No more items
      result = createPaginatedResult(items, 2, 0, 5);
      expect(result.hasMore).toBe(false);

      // Exact match
      result = createPaginatedResult(items, 2, 0, 2);
      expect(result.hasMore).toBe(false);
    });

    it('should throw errors for invalid parameters', () => {
      const items = [{ id: '1' }];
      expect(() => createPaginatedResult(items, -1)).toThrow('Total must be non-negative');
      expect(() => createPaginatedResult(items, 1, -1)).toThrow('Offset must be non-negative');
      expect(() => createPaginatedResult(items, 1, 0, 0)).toThrow('Limit must be positive');
      expect(() => createPaginatedResult(items, 1, 0, -1)).toThrow('Limit must be positive');
    });
  });

  describe('validatePaginationConsistency', () => {
    it('should return true for consistent pagination', () => {
      const validResult = {
        items: [{ id: '1' }, { id: '2' }],
        total: 10,
        offset: 0,
        limit: 5,
        hasMore: true,
      };
      expect(validatePaginationConsistency(validResult)).toBe(true);
    });

    it('should return false for inconsistent pagination', () => {
      // Too many items
      let result = {
        items: [{ id: '1' }, { id: '2' }, { id: '3' }],
        total: 10,
        offset: 0,
        limit: 2,
        hasMore: true,
      };
      expect(validatePaginationConsistency(result)).toBe(false);

      // Negative values
      result = {
        items: [],
        total: -1,
        offset: 0,
        limit: 10,
        hasMore: false,
      };
      expect(validatePaginationConsistency(result)).toBe(false);

      // Wrong hasMore calculation
      result = {
        items: [{ id: '1' }],
        total: 1,
        offset: 0,
        limit: 10,
        hasMore: true, // Should be false
      };
      expect(validatePaginationConsistency(result)).toBe(false);
    });
  });

  describe('mergeFieldSelections', () => {
    it('should merge empty selections', () => {
      const result = mergeFieldSelections();
      expect(result).toEqual({});
    });

    it('should merge single selection', () => {
      const selection = { fields: ['id', 'name'], depth: 2 };
      const result = mergeFieldSelections(selection);
      expect(result).toEqual(selection);
    });

    it('should merge multiple selections', () => {
      const selection1 = { fields: ['id', 'name'], depth: 2 };
      const selection2 = { fields: ['email'], expand: ['metadata'], depth: 3 };
      const result = mergeFieldSelections(selection1, selection2);

      expect(result.fields).toEqual(['id', 'name', 'email']);
      expect(result.expand).toEqual(['metadata']);
      expect(result.depth).toBe(3); // Max depth
    });

    it('should handle overlapping fields', () => {
      const selection1 = { fields: ['id', 'name'], expand: ['metadata'] };
      const selection2 = { fields: ['id', 'email'], expand: ['metadata', 'relations'] };
      const result = mergeFieldSelections(selection1, selection2);

      expect(result.fields).toEqual(['id', 'name', 'email']);
      expect(result.expand).toEqual(['metadata', 'relations']);
    });

    it('should handle undefined fields', () => {
      const selection1 = { fields: ['id'] };
      const selection2 = { expand: ['metadata'] };
      const result = mergeFieldSelections(selection1, selection2);

      expect(result.fields).toEqual(['id']);
      expect(result.expand).toEqual(['metadata']);
    });

    it('should calculate max depth correctly', () => {
      const selections = [{ depth: 1 }, { depth: 5 }, { depth: 2 }];
      const result = mergeFieldSelections(...selections);
      expect(result.depth).toBe(5);
    });
  });
});

describe('integration scenarios', () => {
  it('should handle complete pagination workflow', () => {
    interface TestItem {
      id: string;
      name: string;
      createdAt: string;
    }

    // First page request
    const _firstPageParams: PaginationParams = {
      offset: 0,
      limit: 10,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    };

    // Simulated first page response
    const firstPageResult: PaginatedResult<TestItem> = {
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
      })),
      total: 100,
      offset: 0,
      limit: 10,
      hasMore: true,
    };

    // Second page request
    const secondPageParams: PaginationParams = {
      offset: 10,
      limit: 10,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    };

    expect(firstPageResult.items).toHaveLength(10);
    expect(firstPageResult.hasMore).toBe(true);
    expect(secondPageParams.offset).toBe(firstPageResult.offset + firstPageResult.limit);
  });

  it('should handle filtering with pagination', () => {
    interface TestItem {
      id: string;
      name: string;
      status: 'active' | 'inactive';
    }

    const filterParams: FilterParams<TestItem> = {
      where: { status: 'active' },
      search: 'test',
    };

    const paginationParams: PaginationParams = {
      offset: 0,
      limit: 20,
      orderBy: 'name',
      orderDirection: 'asc',
    };

    const fieldSelection: FieldSelection = {
      fields: ['id', 'name', 'status'],
    };

    // Combined parameters would typically be used together
    expect(filterParams.where?.status).toBe('active');
    expect(paginationParams.limit).toBe(20);
    expect(fieldSelection.fields).toContain('status');
  });

  it('should handle complex field expansion scenarios', () => {
    const fieldSelection: FieldSelection = {
      fields: ['id', 'name', 'summary'],
      expand: ['metadata', 'relations.user', 'relations.tags'],
      depth: 2,
    };

    expect(fieldSelection.expand).toContain('metadata');
    expect(fieldSelection.expand).toContain('relations.user');
    expect(fieldSelection.depth).toBe(2);
  });
});
