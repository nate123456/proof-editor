/**
 * Comprehensive test suite for IOrderedSetRepository interface
 *
 * Tests mock implementations of the OrderedSet repository to ensure:
 * - All interface methods are properly implemented
 * - Error scenarios are properly handled
 * - Edge cases are covered
 * - Repository operations maintain domain invariants
 */

import { err, ok, type Result } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderedSet } from '../../entities/OrderedSet';
import { Statement } from '../../entities/Statement';
import { RepositoryError } from '../../errors/DomainErrors';
import type { IOrderedSetRepository } from '../../repositories/IOrderedSetRepository';
import type { QueryOptions } from '../../shared/repository-types';
import { OrderedSetId, type StatementId } from '../../shared/value-objects';
import { orderedSetIdFactory, statementContentFactory } from '../factories';

// Mock implementation of IOrderedSetRepository for testing
class MockOrderedSetRepository implements IOrderedSetRepository {
  private readonly orderedSets = new Map<string, OrderedSet>();

  async save(orderedSet: OrderedSet): Promise<Result<void, RepositoryError>> {
    try {
      // Simulate validation
      if (!orderedSet?.getId()) {
        return err(new RepositoryError('Invalid ordered set provided'));
      }

      const id = orderedSet.getId().getValue();

      // Check for circular references (simplified check)
      const statementIds = orderedSet.getStatementIds();
      if (statementIds.length === 0) {
        return err(new RepositoryError('Cannot save empty ordered set'));
      }

      this.orderedSets.set(id, orderedSet);

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to save ordered set', error as Error));
    }
  }

  async findById(id: OrderedSetId): Promise<OrderedSet | null> {
    const orderedSet = this.orderedSets.get(id.getValue());
    return Promise.resolve(orderedSet ?? null);
  }

  async findAll(): Promise<OrderedSet[]> {
    return Promise.resolve(Array.from(this.orderedSets.values()));
  }

  async delete(id: OrderedSetId): Promise<Result<void, RepositoryError>> {
    try {
      const orderedSet = this.orderedSets.get(id.getValue());
      if (!orderedSet) {
        return err(new RepositoryError('Ordered set not found'));
      }

      // In a real implementation, would check if ordered set is referenced
      // For testing, we'll simulate this check
      if (this.isReferenced(id)) {
        return err(new RepositoryError('Cannot delete ordered set that is referenced'));
      }

      this.orderedSets.delete(id.getValue());

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to delete ordered set', error as Error));
    }
  }

  // Test helper methods
  clear(): void {
    this.orderedSets.clear();
  }

  size(): number {
    return this.orderedSets.size;
  }

  // Simulate reference checking
  private isReferenced(id: OrderedSetId): boolean {
    // In tests, we'll mark some IDs as "referenced"
    return id.getValue().includes('referenced');
  }

  // New business query methods - placeholder implementations for testing
  async findOrderedSetsBySize(size: number, _options?: QueryOptions): Promise<OrderedSet[]> {
    const allSets = Array.from(this.orderedSets.values());
    const results: OrderedSet[] = [];
    for (const set of allSets) {
      if (set.getStatementIds().length === size) {
        results.push(set);
      }
    }
    return results;
  }

  async findOrderedSetsContaining(
    statementId: StatementId,
    _options?: QueryOptions,
  ): Promise<OrderedSet[]> {
    const allSets = Array.from(this.orderedSets.values());
    const results: OrderedSet[] = [];
    for (const set of allSets) {
      if (set.getStatementIds().some((id) => id.equals(statementId))) {
        results.push(set);
      }
    }
    return results;
  }

  async findSharedOrderedSets(
    _minSharedCount?: number,
    _options?: QueryOptions,
  ): Promise<OrderedSet[]> {
    return [];
  }

  async findOrderedSetsByPattern(
    _pattern: string[],
    _exactMatch?: boolean,
    _options?: QueryOptions,
  ): Promise<OrderedSet[]> {
    return [];
  }

  async findUnusedOrderedSets(_options?: QueryOptions): Promise<OrderedSet[]> {
    return [];
  }

  async findOrderedSetsByReferenceCount(
    _minReferences: number,
    _options?: QueryOptions,
  ): Promise<OrderedSet[]> {
    return [];
  }

  async findSimilarOrderedSets(
    _orderedSetId: OrderedSetId,
    _similarityThreshold?: number,
    _options?: QueryOptions,
  ): Promise<OrderedSet[]> {
    return [];
  }

  async findEmptyOrderedSets(_options?: QueryOptions): Promise<OrderedSet[]> {
    const allSets = Array.from(this.orderedSets.values());
    return allSets.filter((set) => set.getStatementIds().length === 0);
  }
}

describe('IOrderedSetRepository', () => {
  let repository: MockOrderedSetRepository;

  beforeEach(() => {
    repository = new MockOrderedSetRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save a valid ordered set successfully', async () => {
      const statements = Array.from({ length: 3 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));
      expect(orderedSetResult.isOk()).toBe(true);

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const orderedSet = orderedSetResult.value;
      const result = await repository.save(orderedSet);

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(1);
    });

    it('should update an existing ordered set', async () => {
      const statements = Array.from({ length: 2 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;

      // Save initially
      await repository.save(orderedSet);

      // Save again (simulating update)
      const updateResult = await repository.save(orderedSet);

      expect(updateResult.isOk()).toBe(true);
      expect(repository.size()).toBe(1);
    });

    it('should reject saving empty ordered set', async () => {
      const orderedSetResult = OrderedSet.create([]);
      expect(orderedSetResult.isOk()).toBe(true);

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const result = await repository.save(orderedSetResult.value);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('empty ordered set');
      }
    });

    it('should handle null ordered set gracefully', async () => {
      const result = await repository.save(null as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('Invalid ordered set');
      }
    });

    it('should handle save failures with proper error', async () => {
      // Create a repository that fails on save
      const failingRepo = new MockOrderedSetRepository();
      vi.spyOn(failingRepo as any, 'orderedSets', 'get').mockImplementation(() => {
        throw new Error('Storage failure');
      });

      const statements = [
        (() => {
          const result = Statement.create('test');
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        })(),
      ];
      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;
      const result = await failingRepo.save(orderedSet);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('Failed to save');
        expect(result.error.cause?.message).toContain('Storage failure');
      }
    });

    it('should save ordered sets with different sizes', async () => {
      const sizes = [1, 5, 10, 20];

      for (const size of sizes) {
        const statements = Array.from({ length: size }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });

        const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

        if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

        const orderedSet = orderedSetResult.value;
        const result = await repository.save(orderedSet);

        expect(result.isOk()).toBe(true);
      }

      expect(repository.size()).toBe(sizes.length);
    });
  });

  describe('findById', () => {
    it('should find existing ordered set by ID', async () => {
      const statements = Array.from({ length: 2 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;
      await repository.save(orderedSet);

      const found = await repository.findById(orderedSet.getId());

      expect(found).not.toBeNull();
      expect(found?.getId().equals(orderedSet.getId())).toBe(true);
      expect(found?.size()).toBe(orderedSet.size());
    });

    it('should return null for non-existent ID', async () => {
      const randomId = orderedSetIdFactory.build();
      const found = await repository.findById(randomId);

      expect(found).toBeNull();
    });

    it('should handle multiple ordered sets correctly', async () => {
      const orderedSets = Array.from({ length: 5 }, () => {
        const statements = Array.from({ length: 3 }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const result = OrderedSet.create(statements.map((s) => s.getId()));

        if (!result.isOk()) throw new Error('OrderedSet creation failed');

        return result.value;
      });

      for (const orderedSet of orderedSets) {
        await repository.save(orderedSet);
      }

      for (const orderedSet of orderedSets) {
        const found = await repository.findById(orderedSet.getId());
        expect(found).not.toBeNull();
        expect(found?.getId().equals(orderedSet.getId())).toBe(true);
      }
    });

    it('should preserve statement order', async () => {
      const statements = Array.from({ length: 5 }, (_, i) =>
        (() => {
          const result = Statement.create(`Statement ${i}`);
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        })(),
      );

      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;
      await repository.save(orderedSet);

      const found = await repository.findById(orderedSet.getId());
      expect(found).not.toBeNull();

      const originalIds = orderedSet.getStatementIds().map((id) => id.getValue());
      const foundIds = found?.getStatementIds().map((id) => id.getValue());

      expect(foundIds).toEqual(originalIds);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no ordered sets exist', async () => {
      const all = await repository.findAll();

      expect(all).toEqual([]);
      expect(all.length).toBe(0);
    });

    it('should return all saved ordered sets', async () => {
      const count = 10;
      const orderedSets = Array.from({ length: count }, () => {
        const statements = Array.from({ length: 2 }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const result = OrderedSet.create(statements.map((s) => s.getId()));

        if (!result.isOk()) throw new Error('OrderedSet creation failed');

        return result.value;
      });

      for (const orderedSet of orderedSets) {
        await repository.save(orderedSet);
      }

      const all = await repository.findAll();

      expect(all.length).toBe(count);

      const allIds = all.map((os) => os.getId().getValue()).sort();
      const expectedIds = orderedSets.map((os) => os.getId().getValue()).sort();
      expect(allIds).toEqual(expectedIds);
    });

    it('should return ordered sets with varying sizes', async () => {
      const configs = [{ size: 1 }, { size: 3 }, { size: 5 }, { size: 10 }];

      for (const config of configs) {
        const statements = Array.from({ length: config.size }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

        if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

        const orderedSet = orderedSetResult.value;
        await repository.save(orderedSet);
      }

      const all = await repository.findAll();
      expect(all.length).toBe(configs.length);

      const sizes = all.map((os) => os.size()).sort((a, b) => a - b);
      expect(sizes).toEqual([1, 3, 5, 10]);
    });
  });

  describe('delete', () => {
    it('should delete existing unreferenced ordered set', async () => {
      const statements = Array.from({ length: 2 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;
      await repository.save(orderedSet);

      const result = await repository.delete(orderedSet.getId());

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(0);

      const found = await repository.findById(orderedSet.getId());
      expect(found).toBeNull();
    });

    it('should reject deleting referenced ordered set', async () => {
      // Create an ordered set with "referenced" in its ID
      const idResult = OrderedSetId.fromString('referenced-12345');
      if (!idResult.isOk()) throw new Error('OrderedSetId creation failed');
      const id = idResult.value;
      const statements = Array.from({ length: 2 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      // Use Object.create to set a custom ID
      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));
      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const orderedSet = Object.create(orderedSetResult.value);
      orderedSet.getId = () => id;
      orderedSet.getStatementIds = orderedSetResult.value.getStatementIds.bind(
        orderedSetResult.value,
      );
      orderedSet.size = orderedSetResult.value.size.bind(orderedSetResult.value);

      await repository.save(orderedSet);

      const result = await repository.delete(id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('referenced');
      }
      expect(repository.size()).toBe(1);
    });

    it('should return error for non-existent ordered set', async () => {
      const randomId = orderedSetIdFactory.build();
      const result = await repository.delete(randomId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should handle delete failures with proper error', async () => {
      const statements = [
        (() => {
          const result = Statement.create('test');
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        })(),
      ];
      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;
      await repository.save(orderedSet);

      // Mock a failure during delete
      const failingRepo = new MockOrderedSetRepository();
      await failingRepo.save(orderedSet);

      vi.spyOn(failingRepo as any, 'orderedSets', 'get').mockImplementation(() => {
        throw new Error('Delete operation failed');
      });

      const result = await failingRepo.delete(orderedSet.getId());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.cause?.message).toContain('Delete operation failed');
      }
    });

    it('should delete multiple ordered sets independently', async () => {
      const orderedSets = Array.from({ length: 5 }, () => {
        const statements = Array.from({ length: 2 }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const result = OrderedSet.create(statements.map((s) => s.getId()));

        if (!result.isOk()) throw new Error('OrderedSet creation failed');

        return result.value;
      });

      for (const orderedSet of orderedSets) {
        await repository.save(orderedSet);
      }

      // Delete every other ordered set
      for (let i = 0; i < orderedSets.length; i += 2) {
        const setToDelete = orderedSets[i];
        if (setToDelete) {
          await repository.delete(setToDelete.getId());
        }
      }

      const remaining = await repository.findAll();
      expect(remaining.length).toBe(2);
    });
  });

  describe('Mock with vitest', () => {
    let mockRepository: IOrderedSetRepository;

    beforeEach(() => {
      mockRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
        findOrderedSetsBySize: vi.fn(),
        findOrderedSetsContaining: vi.fn(),
        findSharedOrderedSets: vi.fn(),
        findOrderedSetsByPattern: vi.fn(),
        findUnusedOrderedSets: vi.fn(),
        findOrderedSetsByReferenceCount: vi.fn(),
        findSimilarOrderedSets: vi.fn(),
        findEmptyOrderedSets: vi.fn(),
      };
    });

    it('should allow mocking specific scenarios', async () => {
      const statements = [
        (() => {
          const result = Statement.create('Test content');
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        })(),
      ];
      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;

      vi.mocked(mockRepository.save).mockImplementation(async (os) => {
        if (os === orderedSet) return Promise.resolve(ok(undefined));
        return Promise.resolve(err(new RepositoryError('Unknown ordered set')));
      });
      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        if (id.equals(orderedSet.getId())) return Promise.resolve(orderedSet);
        return Promise.resolve(null);
      });
      vi.mocked(mockRepository.findAll).mockResolvedValue([orderedSet]);
      vi.mocked(mockRepository.delete).mockImplementation(async (id) => {
        if (id.equals(orderedSet.getId()))
          return Promise.resolve(err(new RepositoryError('Cannot delete')));
        return Promise.resolve(ok(undefined));
      });

      const saveResult = await mockRepository.save(orderedSet);
      expect(saveResult.isOk()).toBe(true);

      const found = await mockRepository.findById(orderedSet.getId());
      expect(found).toBe(orderedSet);

      const all = await mockRepository.findAll();
      expect(all).toEqual([orderedSet]);

      const deleteResult = await mockRepository.delete(orderedSet.getId());
      expect(deleteResult.isErr()).toBe(true);
      if (deleteResult.isErr()) {
        expect(deleteResult.error.message).toBe('Cannot delete');
      }
    });

    it('should mock complex query scenarios', async () => {
      const orderedSets = Array.from({ length: 3 }, () => {
        const statements = Array.from({ length: 2 }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const result = OrderedSet.create(statements.map((s) => s.getId()));

        if (!result.isOk()) throw new Error('OrderedSet creation failed');

        return result.value;
      });

      vi.mocked(mockRepository.findAll).mockResolvedValue(orderedSets);

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        return Promise.resolve(orderedSets.find((os) => os.getId().equals(id)) ?? null);
      });

      const all = await mockRepository.findAll();
      expect(all.length).toBe(3);

      for (const os of orderedSets) {
        const found = await mockRepository.findById(os.getId());
        expect(found).toBe(os);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle ordered sets with duplicate statement IDs gracefully', async () => {
      const statement = (() => {
        const result = Statement.create('Duplicate test');
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      })();
      const statementId = statement.getId();

      // OrderedSet should handle duplicates internally
      const orderedSetResult = OrderedSet.create([statementId, statementId, statementId]);

      if (orderedSetResult.isOk()) {
        const orderedSet = orderedSetResult.value;
        const result = await repository.save(orderedSet);

        expect(result.isOk()).toBe(true);

        const found = await repository.findById(orderedSet.getId());
        expect(found).not.toBeNull();
        expect(found?.size()).toBe(1); // Should only have one unique statement
      }
    });

    it('should handle very large ordered sets', async () => {
      const largeSize = 100;
      const statements = Array.from({ length: largeSize }, (_, i) =>
        (() => {
          const result = Statement.create(`Statement ${i}`);
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        })(),
      );

      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;

      const saveResult = await repository.save(orderedSet);
      expect(saveResult.isOk()).toBe(true);

      const found = await repository.findById(orderedSet.getId());
      expect(found).not.toBeNull();
      expect(found?.size()).toBe(largeSize);
    });

    it('should maintain consistency under concurrent-like operations', async () => {
      const orderedSets = Array.from({ length: 20 }, (_, i) => {
        const statements = Array.from({ length: 3 }, (_, j) =>
          (() => {
            const result = Statement.create(`Statement ${i}-${j}`);
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
        );
        const result = OrderedSet.create(statements.map((s) => s.getId()));

        if (!result.isOk()) throw new Error('OrderedSet creation failed');

        return result.value;
      });

      // Simulate interleaved saves and deletes
      for (let i = 0; i < orderedSets.length; i++) {
        const currentSet = orderedSets[i];
        if (!currentSet) continue;
        await repository.save(currentSet);

        if (i > 0 && i % 3 === 0) {
          // Delete some previous ordered sets
          const prevSet = orderedSets[i - 1];
          if (prevSet) {
            await repository.delete(prevSet.getId());
          }
        }
      }

      const all = await repository.findAll();
      const remainingCount = orderedSets.length - Math.floor((orderedSets.length - 1) / 3);
      expect(all.length).toBeLessThanOrEqual(remainingCount);
    });

    it('should handle ordered sets with single statement', async () => {
      const statement = (() => {
        const result = Statement.create('Single statement');
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      })();
      const orderedSetResult = OrderedSet.create([statement.getId()]);

      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');

      const orderedSet = orderedSetResult.value;

      const saveResult = await repository.save(orderedSet);
      expect(saveResult.isOk()).toBe(true);

      const found = await repository.findById(orderedSet.getId());
      expect(found).not.toBeNull();
      expect(found?.size()).toBe(1);
      const statementIds = found?.getStatementIds();
      if (statementIds?.[0]) {
        expect(statementIds[0].equals(statement.getId())).toBe(true);
      } else {
        throw new Error('Statement IDs not found');
      }
    });
  });
});
