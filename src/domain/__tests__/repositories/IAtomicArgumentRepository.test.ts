/**
 * Comprehensive test suite for IAtomicArgumentRepository interface
 *
 * Tests mock implementations of the AtomicArgument repository to ensure:
 * - All interface methods are properly implemented
 * - Error scenarios are properly handled
 * - Edge cases are covered
 * - Repository operations maintain domain invariants
 */

import { err, ok, type Result } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument';
import { OrderedSet } from '../../entities/OrderedSet';
import { Statement } from '../../entities/Statement';
import { RepositoryError } from '../../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository';
import { type AtomicArgumentId, type OrderedSetId } from '../../shared/value-objects';
import {
  atomicArgumentIdFactory,
  orderedSetIdFactory,
  statementContentFactory,
} from '../factories';

// Mock implementation of IAtomicArgumentRepository for testing
class MockAtomicArgumentRepository implements IAtomicArgumentRepository {
  private atomicArgs = new Map<string, AtomicArgument>();
  private orderedSetIndex = new Map<string, Set<AtomicArgument>>();

  save(argument: AtomicArgument): Promise<Result<void, RepositoryError>> {
    try {
      // Simulate validation
      if (!argument?.getId()) {
        return err(new RepositoryError('Invalid atomic argument provided'));
      }

      const id = argument.getId().value;

      // Check for valid references
      const premiseRef = argument.getPremiseSetRef();
      const conclusionRef = argument.getConclusionSetRef();

      if (!premiseRef || !conclusionRef) {
        return err(
          new RepositoryError('Atomic argument must have valid premise and conclusion references')
        );
      }

      this.atomicArgs.set(id, argument);

      // Update ordered set indexes
      this.updateOrderedSetIndex(premiseRef.getId(), argument);
      this.updateOrderedSetIndex(conclusionRef.getId(), argument);

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to save atomic argument', error as Error));
    }
  }

  findById(id: AtomicArgumentId): Promise<AtomicArgument | null> {
    const argument = this.atomicArgs.get(id.value);
    return Promise.resolve(argument ?? null);
  }

  findAll(): Promise<AtomicArgument[]> {
    return Promise.resolve(Array.from(this.atomicArgs.values()));
  }

  findByOrderedSetReference(orderedSetId: OrderedSetId): Promise<AtomicArgument[]> {
    const argumentsSet = this.orderedSetIndex.get(orderedSetId.value);
    return Promise.resolve(argumentsSet ? Array.from(argumentsSet) : []);
  }

  delete(id: AtomicArgumentId): Promise<Result<void, RepositoryError>> {
    try {
      const argument = this.atomicArgs.get(id.value);
      if (!argument) {
        return err(new RepositoryError('Atomic argument not found'));
      }

      // Remove from indexes
      const premiseRef = argument.getPremiseSetRef();
      const conclusionRef = argument.getConclusionSetRef();

      this.removeFromOrderedSetIndex(premiseRef.getId(), argument);
      this.removeFromOrderedSetIndex(conclusionRef.getId(), argument);

      this.atomicArgs.delete(id.value);

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to delete atomic argument', error as Error));
    }
  }

  // Test helper methods
  clear(): void {
    this.atomicArgs.clear();
    this.orderedSetIndex.clear();
  }

  size(): number {
    return this.atomicArgs.size;
  }

  private updateOrderedSetIndex(orderedSetId: OrderedSetId, argument: AtomicArgument): void {
    const key = orderedSetId.value;
    if (!this.orderedSetIndex.has(key)) {
      this.orderedSetIndex.set(key, new Set());
    }
    this.orderedSetIndex.get(key)!.add(argument);
  }

  private removeFromOrderedSetIndex(orderedSetId: OrderedSetId, argument: AtomicArgument): void {
    const key = orderedSetId.value;
    const argumentsSet = this.orderedSetIndex.get(key);
    if (argumentsSet) {
      argumentsSet.delete(argument);
      if (argumentsSet.size === 0) {
        this.orderedSetIndex.delete(key);
      }
    }
  }
}

describe('IAtomicArgumentRepository', () => {
  let repository: MockAtomicArgumentRepository;

  beforeEach(() => {
    repository = new MockAtomicArgumentRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create test data
  const createTestArgument = () => {
    const premiseStatements = Array.from(
      { length: 2 },
      () => Statement.create(statementContentFactory.build()).value
    );
    const conclusionStatements = Array.from(
      { length: 1 },
      () => Statement.create(statementContentFactory.build()).value
    );

    const premiseSet = OrderedSet.create(premiseStatements.map(s => s.getId())).value;
    const conclusionSet = OrderedSet.create(conclusionStatements.map(s => s.getId())).value;

    return AtomicArgument.create(premiseSet, conclusionSet).value;
  };

  describe('save', () => {
    it('should save a valid atomic argument successfully', async () => {
      const argument = createTestArgument();
      const result = await repository.save(argument);

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(1);
    });

    it('should update an existing atomic argument', async () => {
      const argument = createTestArgument();

      // Save initially
      await repository.save(argument);

      // Save again (simulating update)
      const updateResult = await repository.save(argument);

      expect(updateResult.isOk()).toBe(true);
      expect(repository.size()).toBe(1);
    });

    it('should index by ordered set references', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const byPremise = await repository.findByOrderedSetReference(
        argument.getPremiseSetRef().getId()
      );
      const byConclusion = await repository.findByOrderedSetReference(
        argument.getConclusionSetRef().getId()
      );

      expect(byPremise).toHaveLength(1);
      expect(byPremise[0].getId().equals(argument.getId())).toBe(true);
      expect(byConclusion).toHaveLength(1);
      expect(byConclusion[0].getId().equals(argument.getId())).toBe(true);
    });

    it('should handle null argument gracefully', async () => {
      const result = await repository.save(null as any);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('Invalid atomic argument');
    });

    it('should handle save failures with proper error', async () => {
      const failingRepo = new MockAtomicArgumentRepository();
      vi.spyOn(failingRepo as any, 'atomicArgs', 'get').mockImplementation(() => {
        throw new Error('Storage failure');
      });

      const argument = createTestArgument();
      const result = await failingRepo.save(argument);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('Failed to save');
      expect(result.error.cause?.message).toContain('Storage failure');
    });

    it('should save multiple arguments with shared ordered sets', async () => {
      // Create shared ordered sets
      const sharedPremiseStatements = Array.from(
        { length: 2 },
        () => Statement.create(statementContentFactory.build()).value
      );
      const sharedPremiseSet = OrderedSet.create(sharedPremiseStatements.map(s => s.getId())).value;

      // Create multiple arguments using the shared premise set
      const atomicArgs = Array.from({ length: 3 }, () => {
        const conclusionStatements = Array.from(
          { length: 1 },
          () => Statement.create(statementContentFactory.build()).value
        );
        const conclusionSet = OrderedSet.create(conclusionStatements.map(s => s.getId())).value;
        return AtomicArgument.create(sharedPremiseSet, conclusionSet).value;
      });

      for (const arg of atomicArgs) {
        const result = await repository.save(arg);
        expect(result.isOk()).toBe(true);
      }

      // All arguments should be indexed under the shared premise set
      const bySharedPremise = await repository.findByOrderedSetReference(sharedPremiseSet.getId());
      expect(bySharedPremise).toHaveLength(3);
    });
  });

  describe('findById', () => {
    it('should find existing atomic argument by ID', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const found = await repository.findById(argument.getId());

      expect(found).not.toBeNull();
      expect(found?.getId().equals(argument.getId())).toBe(true);
      expect(found?.getPremiseSetRef().equals(argument.getPremiseSetRef())).toBe(true);
      expect(found?.getConclusionSetRef().equals(argument.getConclusionSetRef())).toBe(true);
    });

    it('should return null for non-existent ID', async () => {
      const randomId = atomicArgumentIdFactory.build();
      const found = await repository.findById(randomId);

      expect(found).toBeNull();
    });

    it('should handle multiple arguments correctly', async () => {
      const atomicArgs = Array.from({ length: 5 }, () => createTestArgument());

      for (const argument of atomicArgs) {
        await repository.save(argument);
      }

      for (const argument of atomicArgs) {
        const found = await repository.findById(argument.getId());
        expect(found).not.toBeNull();
        expect(found?.getId().equals(argument.getId())).toBe(true);
      }
    });
  });

  describe('findAll', () => {
    it('should return empty array when no arguments exist', async () => {
      const all = await repository.findAll();

      expect(all).toEqual([]);
      expect(all.length).toBe(0);
    });

    it('should return all saved atomic arguments', async () => {
      const count = 10;
      const atomicArgs = Array.from({ length: count }, () => createTestArgument());

      for (const argument of atomicArgs) {
        await repository.save(argument);
      }

      const all = await repository.findAll();

      expect(all.length).toBe(count);

      const allIds = all.map(a => a.getId().value).sort();
      const expectedIds = atomicArgs.map(a => a.getId().value).sort();
      expect(allIds).toEqual(expectedIds);
    });

    it('should include arguments with different premise/conclusion configurations', async () => {
      // Create arguments with various configurations
      const configs = [
        { premiseCount: 1, conclusionCount: 1 },
        { premiseCount: 2, conclusionCount: 1 },
        { premiseCount: 3, conclusionCount: 2 },
        { premiseCount: 1, conclusionCount: 3 },
      ];

      const atomicArgs = configs.map(config => {
        const premiseStatements = Array.from(
          { length: config.premiseCount },
          () => Statement.create(statementContentFactory.build()).value
        );
        const conclusionStatements = Array.from(
          { length: config.conclusionCount },
          () => Statement.create(statementContentFactory.build()).value
        );

        const premiseSet = OrderedSet.create(premiseStatements.map(s => s.getId())).value;
        const conclusionSet = OrderedSet.create(conclusionStatements.map(s => s.getId())).value;

        return AtomicArgument.create(premiseSet, conclusionSet).value;
      });

      for (const argument of atomicArgs) {
        await repository.save(argument);
      }

      const all = await repository.findAll();
      expect(all.length).toBe(configs.length);
    });
  });

  describe('findByOrderedSetReference', () => {
    it('should find arguments by premise set reference', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const found = await repository.findByOrderedSetReference(argument.getPremiseSetRef().getId());

      expect(found).toHaveLength(1);
      expect(found[0].getId().equals(argument.getId())).toBe(true);
    });

    it('should find arguments by conclusion set reference', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const found = await repository.findByOrderedSetReference(
        argument.getConclusionSetRef().getId()
      );

      expect(found).toHaveLength(1);
      expect(found[0].getId().equals(argument.getId())).toBe(true);
    });

    it('should return empty array for non-existent ordered set', async () => {
      const randomId = orderedSetIdFactory.build();
      const found = await repository.findByOrderedSetReference(randomId);

      expect(found).toEqual([]);
    });

    it('should find multiple arguments sharing the same ordered set', async () => {
      // Create a shared conclusion set
      const sharedConclusionStatements = [Statement.create('Shared conclusion').value];
      const sharedConclusionSet = OrderedSet.create(
        sharedConclusionStatements.map(s => s.getId())
      ).value;

      // Create multiple arguments with different premises but same conclusion
      const atomicArgs = Array.from({ length: 4 }, () => {
        const premiseStatements = Array.from(
          { length: 2 },
          () => Statement.create(statementContentFactory.build()).value
        );
        const premiseSet = OrderedSet.create(premiseStatements.map(s => s.getId())).value;

        return AtomicArgument.create(premiseSet, sharedConclusionSet).value;
      });

      for (const arg of atomicArgs) {
        await repository.save(arg);
      }

      const found = await repository.findByOrderedSetReference(sharedConclusionSet.getId());
      expect(found).toHaveLength(4);

      const foundIds = found.map(a => a.getId().value).sort();
      const expectedIds = atomicArgs.map(a => a.getId().value).sort();
      expect(foundIds).toEqual(expectedIds);
    });

    it('should handle chain of connected arguments', async () => {
      // Create a chain: A→B, B→C, C→D
      const statements = Array.from(
        { length: 4 },
        (_, i) => Statement.create(`Statement ${String.fromCharCode(65 + i)}`).value
      );

      const orderedSets = statements.map(s => OrderedSet.create([s.getId()]).value);

      const atomicArgs = [];
      for (let i = 0; i < orderedSets.length - 1; i++) {
        const arg = AtomicArgument.create(orderedSets[i], orderedSets[i + 1]).value;
        atomicArgs.push(arg);
        await repository.save(arg);
      }

      // Middle ordered sets should be referenced by two arguments
      const foundForB = await repository.findByOrderedSetReference(orderedSets[1].getId());
      expect(foundForB).toHaveLength(2); // A→B and B→C

      const foundForC = await repository.findByOrderedSetReference(orderedSets[2].getId());
      expect(foundForC).toHaveLength(2); // B→C and C→D
    });
  });

  describe('delete', () => {
    it('should delete existing atomic argument', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const result = await repository.delete(argument.getId());

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(0);

      const found = await repository.findById(argument.getId());
      expect(found).toBeNull();
    });

    it('should remove from ordered set indexes', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const premiseId = argument.getPremiseSetRef().getId();
      const conclusionId = argument.getConclusionSetRef().getId();

      await repository.delete(argument.getId());

      const byPremise = await repository.findByOrderedSetReference(premiseId);
      const byConclusion = await repository.findByOrderedSetReference(conclusionId);

      expect(byPremise).toHaveLength(0);
      expect(byConclusion).toHaveLength(0);
    });

    it('should return error for non-existent argument', async () => {
      const randomId = atomicArgumentIdFactory.build();
      const result = await repository.delete(randomId);

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('not found');
    });

    it('should handle delete failures with proper error', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const failingRepo = new MockAtomicArgumentRepository();
      await failingRepo.save(argument);

      vi.spyOn(failingRepo as any, 'atomicArgs', 'get').mockImplementation(() => {
        throw new Error('Delete operation failed');
      });

      const result = await failingRepo.delete(argument.getId());

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.cause?.message).toContain('Delete operation failed');
    });

    it('should handle selective deletion with shared ordered sets', async () => {
      // Create shared premise set
      const sharedPremiseStatements = Array.from(
        { length: 2 },
        () => Statement.create(statementContentFactory.build()).value
      );
      const sharedPremiseSet = OrderedSet.create(sharedPremiseStatements.map(s => s.getId())).value;

      // Create multiple arguments using the shared premise
      const atomicArgs = Array.from({ length: 3 }, () => {
        const conclusionStatements = [Statement.create(statementContentFactory.build()).value];
        const conclusionSet = OrderedSet.create(conclusionStatements.map(s => s.getId())).value;
        return AtomicArgument.create(sharedPremiseSet, conclusionSet).value;
      });

      for (const arg of atomicArgs) {
        await repository.save(arg);
      }

      // Delete one argument
      await repository.delete(atomicArgs[0].getId());

      // Others should still be found by the shared premise
      const remaining = await repository.findByOrderedSetReference(sharedPremiseSet.getId());
      expect(remaining).toHaveLength(2);
      expect(remaining.some(a => a.getId().equals(atomicArgs[0].getId()))).toBe(false);
    });
  });

  describe('Mock with vitest', () => {
    let mockRepository: IAtomicArgumentRepository;

    beforeEach(() => {
      mockRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        findByOrderedSetReference: vi.fn(),
        delete: vi.fn(),
      };
    });

    it('should allow mocking specific scenarios', async () => {
      const argument = createTestArgument();

      vi.mocked(mockRepository.save).mockImplementation(arg => {
        if (arg === argument) return Promise.resolve(ok(undefined));
        return Promise.resolve(err(new RepositoryError('Unknown argument')));
      });
      vi.mocked(mockRepository.findById).mockImplementation(id => {
        if (id.equals(argument.getId())) return Promise.resolve(argument);
        return Promise.resolve(null);
      });
      vi.mocked(mockRepository.findAll).mockResolvedValue([argument]);
      vi.mocked(mockRepository.findByOrderedSetReference).mockImplementation(id => {
        if (id.equals(argument.getPremiseSetRef().getId())) return Promise.resolve([argument]);
        return Promise.resolve([]);
      });
      vi.mocked(mockRepository.delete).mockImplementation(id => {
        if (id.equals(argument.getId()))
          return Promise.resolve(err(new RepositoryError('Cannot delete')));
        return Promise.resolve(ok(undefined));
      });

      const saveResult = await mockRepository.save(argument);
      expect(saveResult.isOk()).toBe(true);

      const found = await mockRepository.findById(argument.getId());
      expect(found).toBe(argument);

      const all = await mockRepository.findAll();
      expect(all).toEqual([argument]);

      const byPremise = await mockRepository.findByOrderedSetReference(
        argument.getPremiseSetRef().getId()
      );
      expect(byPremise).toEqual([argument]);

      const deleteResult = await mockRepository.delete(argument.getId());
      expect(deleteResult.isErr()).toBe(true);
      expect(deleteResult.error.message).toBe('Cannot delete');
    });

    it('should mock complex connection scenarios', async () => {
      const atomicArgs = Array.from({ length: 5 }, () => createTestArgument());

      vi.mocked(mockRepository.findAll).mockResolvedValue(atomicArgs);

      vi.mocked(mockRepository.findById).mockImplementation(id => {
        return Promise.resolve(atomicArgs.find(arg => arg.getId().equals(id)) ?? null);
      });

      // Mock ordered set queries
      const orderedSetId = atomicArgs[0].getPremiseSetRef().getId();
      vi.mocked(mockRepository.findByOrderedSetReference).mockImplementation(id => {
        if (id.equals(orderedSetId)) return Promise.resolve([atomicArgs[0], atomicArgs[1]]);
        return Promise.resolve([]);
      });

      const all = await mockRepository.findAll();
      expect(all.length).toBe(5);

      const byOrderedSet = await mockRepository.findByOrderedSetReference(orderedSetId);
      expect(byOrderedSet.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle arguments with same premise and conclusion sets', async () => {
      // Create a circular reference (same set as premise and conclusion)
      const statements = [Statement.create('Self-referential').value];
      const orderedSet = OrderedSet.create(statements.map(s => s.getId())).value;

      const argumentResult = AtomicArgument.create(orderedSet, orderedSet);

      if (argumentResult.isOk()) {
        const argument = argumentResult.value;
        const saveResult = await repository.save(argument);

        expect(saveResult.isOk()).toBe(true);

        const found = await repository.findByOrderedSetReference(orderedSet.getId());
        expect(found).toHaveLength(1);
        expect(found[0].getId().equals(argument.getId())).toBe(true);
      }
    });

    it('should handle very large ordered sets in arguments', async () => {
      const largeSize = 50;
      const premiseStatements = Array.from(
        { length: largeSize },
        (_, i) => Statement.create(`Premise ${i}`).value
      );
      const conclusionStatements = Array.from(
        { length: largeSize },
        (_, i) => Statement.create(`Conclusion ${i}`).value
      );

      const premiseSet = OrderedSet.create(premiseStatements.map(s => s.getId())).value;
      const conclusionSet = OrderedSet.create(conclusionStatements.map(s => s.getId())).value;

      const argument = AtomicArgument.create(premiseSet, conclusionSet).value;

      const saveResult = await repository.save(argument);
      expect(saveResult.isOk()).toBe(true);

      const found = await repository.findById(argument.getId());
      expect(found).not.toBeNull();
      expect(found!.getPremiseSetRef().size()).toBe(largeSize);
      expect(found!.getConclusionSetRef().size()).toBe(largeSize);
    });

    it('should maintain consistency under concurrent-like operations', async () => {
      const atomicArgs = Array.from({ length: 20 }, (_, _i) => createTestArgument());

      // Simulate interleaved saves and deletes
      for (let i = 0; i < atomicArgs.length; i++) {
        await repository.save(atomicArgs[i]);

        if (i > 0 && i % 3 === 0) {
          // Delete some previous arguments
          await repository.delete(atomicArgs[i - 1].getId());
        }
      }

      const all = await repository.findAll();
      const remainingCount = atomicArgs.length - Math.floor((atomicArgs.length - 1) / 3);
      expect(all.length).toBeLessThanOrEqual(remainingCount);
    });
  });
});
