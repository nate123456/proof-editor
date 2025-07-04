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
import type { ComplexityLevel, QueryOptions } from '../../shared/repository-types';
import type { AtomicArgumentId, OrderedSetId, StatementId } from '../../shared/value-objects';
import {
  atomicArgumentIdFactory,
  orderedSetIdFactory,
  statementContentFactory,
} from '../factories';

// Mock implementation of IAtomicArgumentRepository for testing
class MockAtomicArgumentRepository implements IAtomicArgumentRepository {
  private readonly atomicArgs = new Map<string, AtomicArgument>();
  private readonly orderedSetIndex = new Map<string, Set<AtomicArgument>>();

  async save(argument: AtomicArgument): Promise<Result<void, RepositoryError>> {
    try {
      // Simulate validation
      if (!argument?.getId()) {
        return err(new RepositoryError('Invalid atomic argument provided'));
      }

      const id = argument.getId().getValue();

      // Check for valid references
      const premiseRef = argument.getPremiseSet();
      const conclusionRef = argument.getConclusionSet();

      if (!premiseRef || !conclusionRef) {
        return err(
          new RepositoryError('Atomic argument must have valid premise and conclusion references'),
        );
      }

      this.atomicArgs.set(id, argument);

      // Update ordered set indexes
      this.updateOrderedSetIndex(premiseRef, argument);
      this.updateOrderedSetIndex(conclusionRef, argument);

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to save atomic argument', error as Error));
    }
  }

  async findById(id: AtomicArgumentId): Promise<AtomicArgument | null> {
    const argument = this.atomicArgs.get(id.getValue());
    return Promise.resolve(argument ?? null);
  }

  async findAll(): Promise<AtomicArgument[]> {
    return Promise.resolve(Array.from(this.atomicArgs.values()));
  }

  async findByOrderedSetReference(orderedSetId: OrderedSetId): Promise<AtomicArgument[]> {
    const argumentsSet = this.orderedSetIndex.get(orderedSetId.getValue());
    return Promise.resolve(argumentsSet ? Array.from(argumentsSet) : []);
  }

  async delete(id: AtomicArgumentId): Promise<Result<void, RepositoryError>> {
    try {
      const argument = this.atomicArgs.get(id.getValue());
      if (!argument) {
        return err(new RepositoryError('Atomic argument not found'));
      }

      // Remove from indexes
      const premiseRef = argument.getPremiseSet();
      const conclusionRef = argument.getConclusionSet();

      if (premiseRef) {
        this.removeFromOrderedSetIndex(premiseRef, argument);
      }
      if (conclusionRef) {
        this.removeFromOrderedSetIndex(conclusionRef, argument);
      }

      this.atomicArgs.delete(id.getValue());

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
    const key = orderedSetId.getValue();
    if (!this.orderedSetIndex.has(key)) {
      this.orderedSetIndex.set(key, new Set());
    }
    this.orderedSetIndex.get(key)?.add(argument);
  }

  private removeFromOrderedSetIndex(orderedSetId: OrderedSetId, argument: AtomicArgument): void {
    const key = orderedSetId.getValue();
    const argumentsSet = this.orderedSetIndex.get(key);
    if (argumentsSet) {
      argumentsSet.delete(argument);
      if (argumentsSet.size === 0) {
        this.orderedSetIndex.delete(key);
      }
    }
  }

  // New business query methods - placeholder implementations for testing
  async findArgumentsByPremiseCount(
    _count: number,
    _options?: QueryOptions,
  ): Promise<AtomicArgument[]> {
    const _allArgs = Array.from(this.atomicArgs.values());
    // Note: This implementation would require access to the actual OrderedSet, not just the ID
    // For now, returning empty array as placeholder
    return [];
  }

  async findArgumentsUsingStatement(
    _statementId: StatementId,
    _options?: QueryOptions,
  ): Promise<AtomicArgument[]> {
    const _allArgs = Array.from(this.atomicArgs.values());
    // Note: This implementation would require access to the actual OrderedSet, not just the ID
    // For now, returning empty array as placeholder
    return [];
  }

  async findArgumentsByComplexity(
    _complexity: ComplexityLevel,
    _options?: QueryOptions,
  ): Promise<AtomicArgument[]> {
    return [];
  }

  async findArgumentsWithConclusion(
    _conclusion: string,
    _options?: QueryOptions,
  ): Promise<AtomicArgument[]> {
    return [];
  }

  async findArgumentChains(
    _startArgumentId: AtomicArgumentId,
    _maxDepth?: number,
  ): Promise<AtomicArgument[]> {
    return [];
  }

  async findCircularDependencies(): Promise<AtomicArgument[][]> {
    return [];
  }

  async findArgumentsByValidationStatus(
    _isValid: boolean,
    _options?: QueryOptions,
  ): Promise<AtomicArgument[]> {
    return [];
  }

  async findMostReferencedArguments(_options?: QueryOptions): Promise<AtomicArgument[]> {
    return [];
  }

  async findOrphanedArguments(_options?: QueryOptions): Promise<AtomicArgument[]> {
    return [];
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
    const premiseStatements = Array.from({ length: 2 }, () => {
      const result = Statement.create(statementContentFactory.build());
      if (!result.isOk()) throw new Error('Statement creation failed');
      return result.value;
    });
    const conclusionStatements = Array.from({ length: 1 }, () => {
      const result = Statement.create(statementContentFactory.build());
      if (!result.isOk()) throw new Error('Statement creation failed');
      return result.value;
    });

    const premiseSetResult = OrderedSet.create(premiseStatements.map((s) => s.getId()));
    if (!premiseSetResult.isOk()) throw new Error('OrderedSet creation failed');
    const premiseSet = premiseSetResult.value;

    const conclusionSetResult = OrderedSet.create(conclusionStatements.map((s) => s.getId()));
    if (!conclusionSetResult.isOk()) throw new Error('OrderedSet creation failed');
    const conclusionSet = conclusionSetResult.value;

    const atomicArgResult = AtomicArgument.create(premiseSet.getId(), conclusionSet.getId());
    if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');
    if (!atomicArgResult.isOk()) throw new Error('Creation failed');

    return atomicArgResult.value;
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

      const premiseRef = argument.getPremiseSet();
      const conclusionRef = argument.getConclusionSet();
      if (!premiseRef || !conclusionRef) return;

      const byPremise = await repository.findByOrderedSetReference(premiseRef);
      const byConclusion = await repository.findByOrderedSetReference(conclusionRef);

      expect(byPremise).toHaveLength(1);
      expect(byPremise[0]?.getId().equals(argument.getId())).toBe(true);
      expect(byConclusion).toHaveLength(1);
      expect(byConclusion[0]?.getId().equals(argument.getId())).toBe(true);
    });

    it('should handle null argument gracefully', async () => {
      const result = await repository.save(null as any);

      expect(result.isErr()).toBe(true);
      if (!result.isErr()) throw new Error('Expected error');
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
      if (!result.isErr()) throw new Error('Expected error');
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('Failed to save');
      expect(result.error.cause?.message).toContain('Storage failure');
    });

    it('should save multiple arguments with shared ordered sets', async () => {
      // Create shared ordered sets
      const sharedPremiseStatements = Array.from({ length: 2 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });
      const sharedPremiseSetResult = OrderedSet.create(
        sharedPremiseStatements.map((s) => s.getId()),
      );
      if (!sharedPremiseSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const sharedPremiseSet = sharedPremiseSetResult.value;

      // Create multiple arguments using the shared premise set
      const atomicArgs = Array.from({ length: 3 }, () => {
        const conclusionStatements = Array.from({ length: 1 }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const conclusionSetResult = OrderedSet.create(conclusionStatements.map((s) => s.getId()));
        if (!conclusionSetResult.isOk()) throw new Error('OrderedSet creation failed');
        const conclusionSet = conclusionSetResult.value;
        const atomicArgResult = AtomicArgument.create(
          sharedPremiseSet.getId(),
          conclusionSet.getId(),
        );
        if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');
        if (!atomicArgResult.isOk()) throw new Error('Creation failed');

        return atomicArgResult.value;
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
      const foundPremiseRef = found?.getPremiseSet();
      const argPremiseRef = argument.getPremiseSet();
      if (foundPremiseRef && argPremiseRef) {
        expect(foundPremiseRef.equals(argPremiseRef)).toBe(true);
      }
      const foundConclusionRef = found?.getConclusionSet();
      const argConclusionRef = argument.getConclusionSet();
      if (foundConclusionRef && argConclusionRef) {
        expect(foundConclusionRef.equals(argConclusionRef)).toBe(true);
      }
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

      const allIds = all.map((a) => a.getId().getValue()).sort();
      const expectedIds = atomicArgs.map((a) => a.getId().getValue()).sort();
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

      const atomicArgs = configs.map((config) => {
        const premiseStatements = Array.from({ length: config.premiseCount }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const conclusionStatements = Array.from({ length: config.conclusionCount }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });

        const premiseSetResult = OrderedSet.create(premiseStatements.map((s) => s.getId()));
        if (!premiseSetResult.isOk()) throw new Error('OrderedSet creation failed');
        const premiseSet = premiseSetResult.value;

        const conclusionSetResult = OrderedSet.create(conclusionStatements.map((s) => s.getId()));
        if (!conclusionSetResult.isOk()) throw new Error('OrderedSet creation failed');
        const conclusionSet = conclusionSetResult.value;

        const atomicArgResult = AtomicArgument.create(premiseSet.getId(), conclusionSet.getId());
        if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');
        if (!atomicArgResult.isOk()) throw new Error('Creation failed');

        return atomicArgResult.value;
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

      const premiseRef = argument.getPremiseSet();
      if (!premiseRef) throw new Error('Missing premise ref');
      const found = await repository.findByOrderedSetReference(premiseRef);

      expect(found).toHaveLength(1);
      const firstFound = found[0];
      if (firstFound) {
        expect(firstFound.getId().equals(argument.getId())).toBe(true);
      }
    });

    it('should find arguments by conclusion set reference', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const conclusionRef = argument.getConclusionSet();
      if (!conclusionRef) throw new Error('Missing conclusion ref');
      const found = await repository.findByOrderedSetReference(conclusionRef);

      expect(found).toHaveLength(1);
      const firstFound = found[0];
      if (firstFound) {
        expect(firstFound.getId().equals(argument.getId())).toBe(true);
      }
    });

    it('should return empty array for non-existent ordered set', async () => {
      const randomId = orderedSetIdFactory.build();
      const found = await repository.findByOrderedSetReference(randomId);

      expect(found).toEqual([]);
    });

    it('should find multiple arguments sharing the same ordered set', async () => {
      // Create a shared conclusion set
      const sharedConclusionStatementResult = Statement.create('Shared conclusion');
      if (!sharedConclusionStatementResult.isOk()) throw new Error('Statement creation failed');
      const sharedConclusionStatements = [sharedConclusionStatementResult.value];
      const sharedConclusionSetResult = OrderedSet.create(
        sharedConclusionStatements.map((s) => s.getId()),
      );
      if (!sharedConclusionSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const sharedConclusionSet = sharedConclusionSetResult.value;

      // Create multiple arguments with different premises but same conclusion
      const atomicArgs = Array.from({ length: 4 }, () => {
        const premiseStatements = Array.from({ length: 2 }, () => {
          const result = Statement.create(statementContentFactory.build());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const premiseSetResult = OrderedSet.create(premiseStatements.map((s) => s.getId()));
        if (!premiseSetResult.isOk()) throw new Error('OrderedSet creation failed');
        const premiseSet = premiseSetResult.value;

        const atomicArgResult = AtomicArgument.create(
          premiseSet.getId(),
          sharedConclusionSet.getId(),
        );
        if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');
        if (!atomicArgResult.isOk()) throw new Error('Creation failed');

        return atomicArgResult.value;
      });

      for (const arg of atomicArgs) {
        await repository.save(arg);
      }

      const found = await repository.findByOrderedSetReference(sharedConclusionSet.getId());
      expect(found).toHaveLength(4);

      const foundIds = found.map((a) => a.getId().getValue()).sort();
      const expectedIds = atomicArgs.map((a) => a.getId().getValue()).sort();
      expect(foundIds).toEqual(expectedIds);
    });

    it('should handle chain of connected arguments', async () => {
      // Create a chain: A→B, B→C, C→D
      const statements = Array.from({ length: 4 }, (_, i) => {
        const result = Statement.create(`Statement ${String.fromCharCode(65 + i)}`);
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      const orderedSets = statements.map((s) => {
        const result = OrderedSet.create([s.getId()]);
        if (!result.isOk()) throw new Error('OrderedSet creation failed');
        return result.value;
      });

      const atomicArgs = [];
      for (let i = 0; i < orderedSets.length - 1; i++) {
        const fromSet = orderedSets[i];
        const toSet = orderedSets[i + 1];
        if (!fromSet || !toSet) throw new Error('Missing ordered sets');
        const argResult = AtomicArgument.create(fromSet.getId(), toSet.getId());
        if (!argResult.isOk()) throw new Error('AtomicArgument creation failed');
        const arg = argResult.value;
        atomicArgs.push(arg);
        await repository.save(arg);
      }

      // Middle ordered sets should be referenced by two arguments
      const orderedSetB = orderedSets[1];
      if (!orderedSetB) throw new Error('Missing ordered set B');
      const foundForB = await repository.findByOrderedSetReference(orderedSetB.getId());
      expect(foundForB).toHaveLength(2); // A→B and B→C

      const orderedSetC = orderedSets[2];
      if (!orderedSetC) throw new Error('Missing ordered set C');
      const foundForC = await repository.findByOrderedSetReference(orderedSetC.getId());
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

      const premiseId = argument.getPremiseSet();
      const conclusionId = argument.getConclusionSet();

      await repository.delete(argument.getId());

      if (!premiseId || !conclusionId) throw new Error('Missing ordered set refs');
      const byPremise = await repository.findByOrderedSetReference(premiseId);
      const byConclusion = await repository.findByOrderedSetReference(conclusionId);

      expect(byPremise).toHaveLength(0);
      expect(byConclusion).toHaveLength(0);
    });

    it('should return error for non-existent argument', async () => {
      const randomId = atomicArgumentIdFactory.build();
      const result = await repository.delete(randomId);

      expect(result.isErr()).toBe(true);
      if (!result.isErr()) throw new Error('Expected error');
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
      if (!result.isErr()) throw new Error('Expected error');
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.cause?.message).toContain('Delete operation failed');
    });

    it('should handle selective deletion with shared ordered sets', async () => {
      // Create shared premise set
      const sharedPremiseStatements = Array.from({ length: 2 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });
      const sharedPremiseSetResult = OrderedSet.create(
        sharedPremiseStatements.map((s) => s.getId()),
      );
      if (!sharedPremiseSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const sharedPremiseSet = sharedPremiseSetResult.value;

      // Create multiple arguments using the shared premise
      const atomicArgs = Array.from({ length: 3 }, () => {
        const conclusionStatementResult = Statement.create(statementContentFactory.build());
        if (!conclusionStatementResult.isOk()) throw new Error('Statement creation failed');
        const conclusionStatements = [conclusionStatementResult.value];
        const conclusionSetResult = OrderedSet.create(conclusionStatements.map((s) => s.getId()));
        if (!conclusionSetResult.isOk()) throw new Error('OrderedSet creation failed');
        const conclusionSet = conclusionSetResult.value;
        const atomicArgResult = AtomicArgument.create(
          sharedPremiseSet.getId(),
          conclusionSet.getId(),
        );
        if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');
        if (!atomicArgResult.isOk()) throw new Error('Creation failed');

        return atomicArgResult.value;
      });

      for (const arg of atomicArgs) {
        await repository.save(arg);
      }

      // Delete one argument
      const firstArg = atomicArgs[0];
      if (!firstArg) throw new Error('Missing first argument');
      await repository.delete(firstArg.getId());

      // Others should still be found by the shared premise
      const remaining = await repository.findByOrderedSetReference(sharedPremiseSet.getId());
      expect(remaining).toHaveLength(2);
      const firstArgId = firstArg.getId();
      expect(remaining.some((a) => a.getId().equals(firstArgId))).toBe(false);
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
        findArgumentsByPremiseCount: vi.fn(),
        findArgumentsUsingStatement: vi.fn(),
        findArgumentsByComplexity: vi.fn(),
        findArgumentsWithConclusion: vi.fn(),
        findArgumentChains: vi.fn(),
        findCircularDependencies: vi.fn(),
        findArgumentsByValidationStatus: vi.fn(),
        findMostReferencedArguments: vi.fn(),
        findOrphanedArguments: vi.fn(),
      };
    });

    it('should allow mocking specific scenarios', async () => {
      const argument = createTestArgument();

      vi.mocked(mockRepository.save).mockImplementation(async (arg) => {
        if (arg === argument) return Promise.resolve(ok(undefined));
        return Promise.resolve(err(new RepositoryError('Unknown argument')));
      });
      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        if (id.equals(argument.getId())) return Promise.resolve(argument);
        return Promise.resolve(null);
      });
      vi.mocked(mockRepository.findAll).mockResolvedValue([argument]);
      vi.mocked(mockRepository.findByOrderedSetReference).mockImplementation(async (id) => {
        const argPremiseRef = argument.getPremiseSet();
        if (argPremiseRef && id.equals(argPremiseRef)) return Promise.resolve([argument]);
        return Promise.resolve([]);
      });
      vi.mocked(mockRepository.delete).mockImplementation(async (id) => {
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

      const argPremiseRef = argument.getPremiseSet();
      if (!argPremiseRef) throw new Error('Missing premise ref');
      const byPremise = await mockRepository.findByOrderedSetReference(argPremiseRef);
      expect(byPremise).toEqual([argument]);

      const deleteResult = await mockRepository.delete(argument.getId());
      expect(deleteResult.isErr()).toBe(true);
      if (!deleteResult.isErr()) throw new Error('Expected error');
      expect(deleteResult.error.message).toBe('Cannot delete');
    });

    it('should mock complex connection scenarios', async () => {
      const atomicArgs = Array.from({ length: 5 }, () => createTestArgument());

      vi.mocked(mockRepository.findAll).mockResolvedValue(atomicArgs);

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        return Promise.resolve(atomicArgs.find((arg) => arg.getId().equals(id)) ?? null);
      });

      // Mock ordered set queries
      const firstArg = atomicArgs[0];
      if (!firstArg) throw new Error('Missing first argument');
      const orderedSetId = firstArg.getPremiseSet();
      if (!orderedSetId) throw new Error('Missing ordered set id');
      vi.mocked(mockRepository.findByOrderedSetReference).mockImplementation(async (id) => {
        const arg0 = atomicArgs[0];
        const arg1 = atomicArgs[1];
        if (arg0 && arg1 && id.equals(orderedSetId)) return Promise.resolve([arg0, arg1]);
        return Promise.resolve([]);
      });

      const all = await mockRepository.findAll();
      expect(all.length).toBe(5);

      if (!orderedSetId) throw new Error('Missing ordered set id');
      const byOrderedSet = await mockRepository.findByOrderedSetReference(orderedSetId);
      expect(byOrderedSet.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle arguments with same premise and conclusion sets', async () => {
      // Create a circular reference (same set as premise and conclusion)
      const statementResult = Statement.create('Self-referential');
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statements = [statementResult.value];
      const orderedSetResult = OrderedSet.create(statements.map((s) => s.getId()));
      if (!orderedSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const orderedSet = orderedSetResult.value;

      const argumentResult = AtomicArgument.create(orderedSet.getId(), orderedSet.getId());

      if (argumentResult.isOk()) {
        const argument = argumentResult.value;
        const saveResult = await repository.save(argument);

        expect(saveResult.isOk()).toBe(true);

        const found = await repository.findByOrderedSetReference(orderedSet.getId());
        expect(found).toHaveLength(1);
        const firstFound = found[0];
        if (!firstFound) throw new Error('Missing first found');
        expect(firstFound.getId().equals(argument.getId())).toBe(true);
      }
    });

    it('should handle very large ordered sets in arguments', async () => {
      const largeSize = 50;
      const premiseStatements = Array.from({ length: largeSize }, (_, i) => {
        const result = Statement.create(`Premise ${i}`);
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });
      const conclusionStatements = Array.from({ length: largeSize }, (_, i) => {
        const result = Statement.create(`Conclusion ${i}`);
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      const premiseSetResult = OrderedSet.create(premiseStatements.map((s) => s.getId()));
      if (!premiseSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const premiseSet = premiseSetResult.value;

      const conclusionSetResult = OrderedSet.create(conclusionStatements.map((s) => s.getId()));
      if (!conclusionSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const conclusionSet = conclusionSetResult.value;

      const argumentResult = AtomicArgument.create(premiseSet.getId(), conclusionSet.getId());
      if (!argumentResult.isOk()) throw new Error('AtomicArgument creation failed');
      const argument = argumentResult.value;

      const saveResult = await repository.save(argument);
      expect(saveResult.isOk()).toBe(true);

      const found = await repository.findById(argument.getId());
      expect(found).not.toBeNull();
      // Cannot check size on OrderedSetId - would need access to the actual OrderedSet
      expect(found).not.toBeNull();
    });

    it('should maintain consistency under concurrent-like operations', async () => {
      const atomicArgs = Array.from({ length: 20 }, (_, _i) => createTestArgument());

      // Simulate interleaved saves and deletes
      for (let i = 0; i < atomicArgs.length; i++) {
        const currentArg = atomicArgs[i];
        if (!currentArg) continue;
        await repository.save(currentArg);

        if (i > 0 && i % 3 === 0) {
          // Delete some previous arguments
          const prevArg = atomicArgs[i - 1];
          if (prevArg) {
            await repository.delete(prevArg.getId());
          }
        }
      }

      const all = await repository.findAll();
      const remainingCount = atomicArgs.length - Math.floor((atomicArgs.length - 1) / 3);
      expect(all.length).toBeLessThanOrEqual(remainingCount);
    });
  });
});
