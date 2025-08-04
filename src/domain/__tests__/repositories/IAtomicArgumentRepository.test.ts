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
import type {
  AtomicArgumentId,
  PremiseCount,
  SearchDepth,
  StatementContent,
  StatementId,
  ValidationStatus,
} from '../../shared/value-objects';
import { AtomicArgumentId as AtomicArgumentIdClass } from '../../shared/value-objects/index.js';
import { statementContentFactory } from '../factories/index.js';

// Mock implementation of IAtomicArgumentRepository for testing
class MockAtomicArgumentRepository implements IAtomicArgumentRepository {
  private readonly atomicArgs = new Map<string, AtomicArgument>();

  async save(argument: AtomicArgument): Promise<Result<void, RepositoryError>> {
    try {
      // Simulate validation
      if (!argument?.getId()) {
        return err(new RepositoryError('Invalid atomic argument provided'));
      }

      const id = argument.getId().getValue();

      // Check for valid references
      const premises = argument.getPremises();
      const conclusions = argument.getConclusions();

      if (!premises || !conclusions) {
        return err(
          new RepositoryError('Atomic argument must have valid premise and conclusion references'),
        );
      }

      this.atomicArgs.set(id, argument);

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to save atomic argument', error as Error));
    }
  }

  async findById(id: AtomicArgumentId): Promise<Result<AtomicArgument, RepositoryError>> {
    const argument = this.atomicArgs.get(id.getValue());
    if (!argument) {
      return err(new RepositoryError('Atomic argument not found'));
    }
    return ok(argument);
  }

  async findAll(): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok(Array.from(this.atomicArgs.values()));
  }

  async delete(id: AtomicArgumentId): Promise<Result<void, RepositoryError>> {
    try {
      const argument = this.atomicArgs.get(id.getValue());
      if (!argument) {
        return err(new RepositoryError('Atomic argument not found'));
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
  }

  size(): number {
    return this.atomicArgs.size;
  }

  // New business query methods - placeholder implementations for testing
  async findArgumentsByPremiseCount(
    count: PremiseCount,
    _options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    const allArgs = Array.from(this.atomicArgs.values());
    return ok(allArgs.filter((arg) => arg.getPremiseCount() === count.getValue()));
  }

  async findArgumentsUsingStatement(
    _statementId: StatementId,
    _options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async findArgumentsByComplexity(
    _complexity: ComplexityLevel,
    _options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async findArgumentsWithConclusion(
    _conclusion: StatementContent,
    _options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async findArgumentChains(
    _startArgumentId: AtomicArgumentId,
    _maxDepth?: SearchDepth,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async findCircularDependencies(): Promise<Result<AtomicArgument[][], RepositoryError>> {
    return ok([]);
  }

  async findArgumentsByValidationStatus(
    _status: ValidationStatus,
    _options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async findMostReferencedArguments(
    _options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async findOrphanedArguments(
    _options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async exists(id: AtomicArgumentId): Promise<Result<boolean, RepositoryError>> {
    return ok(this.atomicArgs.has(id.getValue()));
  }

  async findByStatementReference(
    _statementId: StatementId,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async findBySpecification(_spec: any): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async countBySpecification(_spec: any): Promise<Result<number, RepositoryError>> {
    return ok(0);
  }

  async existsBySpecification(_spec: any): Promise<Result<boolean, RepositoryError>> {
    return ok(false);
  }

  async findWithOptions(_options: any): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async findByDateRange(
    _start: Date,
    _end: Date,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return ok([]);
  }

  async count(): Promise<Result<number, RepositoryError>> {
    return ok(this.atomicArgs.size);
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
      const result = Statement.create(statementContentFactory.build().getValue());
      if (!result.isOk()) throw new Error('Statement creation failed');
      return result.value;
    });
    const conclusionStatements = Array.from({ length: 1 }, () => {
      const result = Statement.create(statementContentFactory.build().getValue());
      if (!result.isOk()) throw new Error('Statement creation failed');
      return result.value;
    });

    const atomicArgResult = AtomicArgument.create(premiseStatements, conclusionStatements);
    if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');

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
      const result = await repository.save(argument);
      expect(result.isOk()).toBe(true);

      // Verify the argument was saved
      const found = await repository.findById(argument.getId());
      expect(found.isOk()).toBe(true);
      if (found.isOk()) {
        expect(found.value.getId().equals(argument.getId())).toBe(true);
      }
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

    it('should save multiple arguments with shared premises', async () => {
      // Create shared premise statements
      const sharedPremiseStatements = Array.from({ length: 2 }, () => {
        const result = Statement.create(statementContentFactory.build().getValue());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      // Create multiple arguments using the shared premise statements
      const atomicArgs = Array.from({ length: 3 }, () => {
        const conclusionStatements = Array.from({ length: 1 }, () => {
          const result = Statement.create(statementContentFactory.build().getValue());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const atomicArgResult = AtomicArgument.create(
          sharedPremiseStatements,
          conclusionStatements,
        );
        if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');
        return atomicArgResult.value;
      });

      for (const arg of atomicArgs) {
        const result = await repository.save(arg);
        expect(result.isOk()).toBe(true);
      }

      // Verify all arguments were saved
      const allArgs = await repository.findAll();
      expect(allArgs.isOk()).toBe(true);
      if (allArgs.isOk()) {
        expect(allArgs.value).toHaveLength(3);
      }
    });
  });

  describe('findById', () => {
    it('should find existing atomic argument by ID', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      const found = await repository.findById(argument.getId());

      expect(found.isOk()).toBe(true);
      if (found.isOk()) {
        expect(found.value.getId().equals(argument.getId())).toBe(true);
        expect(found.value.getPremiseCount()).toBe(argument.getPremiseCount());
        expect(found.value.getConclusionCount()).toBe(argument.getConclusionCount());
      }
    });

    it('should return error for non-existent ID', async () => {
      const randomId = AtomicArgumentIdClass.generate();
      const found = await repository.findById(randomId);

      expect(found.isErr()).toBe(true);
      if (found.isErr()) {
        expect(found.error.message).toContain('not found');
      }
    });

    it('should handle multiple arguments correctly', async () => {
      const atomicArgs = Array.from({ length: 5 }, () => createTestArgument());

      for (const argument of atomicArgs) {
        await repository.save(argument);
      }

      for (const argument of atomicArgs) {
        const found = await repository.findById(argument.getId());
        expect(found.isOk()).toBe(true);
        if (found.isOk()) {
          expect(found.value.getId().equals(argument.getId())).toBe(true);
        }
      }
    });
  });

  describe('findAll', () => {
    it('should return empty array when no arguments exist', async () => {
      const all = await repository.findAll();

      expect(all.isOk()).toBe(true);
      if (all.isOk()) {
        expect(all.value).toEqual([]);
        expect(all.value.length).toBe(0);
      }
    });

    it('should return all saved atomic arguments', async () => {
      const count = 10;
      const atomicArgs = Array.from({ length: count }, () => createTestArgument());

      for (const argument of atomicArgs) {
        await repository.save(argument);
      }

      const all = await repository.findAll();

      expect(all.isOk()).toBe(true);
      if (all.isOk()) {
        expect(all.value.length).toBe(count);

        const allIds = all.value.map((a) => a.getId().getValue()).sort();
        const expectedIds = atomicArgs.map((a) => a.getId().getValue()).sort();
        expect(allIds).toEqual(expectedIds);
      }
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
          const result = Statement.create(statementContentFactory.build().getValue());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });
        const conclusionStatements = Array.from({ length: config.conclusionCount }, () => {
          const result = Statement.create(statementContentFactory.build().getValue());
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });

        const atomicArgResult = AtomicArgument.create(premiseStatements, conclusionStatements);
        if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');

        return atomicArgResult.value;
      });

      for (const argument of atomicArgs) {
        await repository.save(argument);
      }

      const all = await repository.findAll();
      expect(all.isOk()).toBe(true);
      if (all.isOk()) {
        expect(all.value.length).toBe(configs.length);
      }
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
      expect(found.isErr()).toBe(true);
    });

    it('should remove argument from repository', async () => {
      const argument = createTestArgument();
      await repository.save(argument);

      expect(repository.size()).toBe(1);

      const deleteResult = await repository.delete(argument.getId());
      expect(deleteResult.isOk()).toBe(true);

      expect(repository.size()).toBe(0);
    });

    it('should return error for non-existent argument', async () => {
      const randomId = AtomicArgumentIdClass.generate();
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
        const result = Statement.create(statementContentFactory.build().getValue());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });
      const sharedPremiseSetResult = OrderedSet.create(
        sharedPremiseStatements.map((s) => s.getId()),
      );
      if (!sharedPremiseSetResult.isOk()) throw new Error('OrderedSet creation failed');
      const _sharedPremiseSet = sharedPremiseSetResult.value;

      // Create multiple arguments using the shared premise statements
      const atomicArgs = Array.from({ length: 3 }, () => {
        const conclusionStatementResult = Statement.create(
          statementContentFactory.build().getValue(),
        );
        if (!conclusionStatementResult.isOk()) throw new Error('Statement creation failed');
        const conclusionStatements = [conclusionStatementResult.value];
        const atomicArgResult = AtomicArgument.create(
          sharedPremiseStatements,
          conclusionStatements,
        );
        if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');
        return atomicArgResult.value;
      });

      for (const arg of atomicArgs) {
        await repository.save(arg);
      }

      // Delete one argument
      const firstArg = atomicArgs[0];
      if (!firstArg) throw new Error('Missing first argument');
      await repository.delete(firstArg.getId());

      // Verify the remaining arguments
      const allArgs = await repository.findAll();
      expect(allArgs.isOk()).toBe(true);
      if (allArgs.isOk()) {
        expect(allArgs.value).toHaveLength(2);
        const firstArgId = firstArg.getId();
        expect(allArgs.value.some((a) => a.getId().equals(firstArgId))).toBe(false);
      }
    });
  });

  describe('Mock with vitest', () => {
    let mockRepository: IAtomicArgumentRepository;

    beforeEach(() => {
      mockRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        exists: vi.fn(),
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
        findByStatementReference: vi.fn(),
        findBySpecification: vi.fn(),
        countBySpecification: vi.fn(),
        existsBySpecification: vi.fn(),
        findWithOptions: vi.fn(),
        findByDateRange: vi.fn(),
        count: vi.fn(),
      };
    });

    it('should allow mocking specific scenarios', async () => {
      const argument = createTestArgument();

      vi.mocked(mockRepository.save).mockImplementation(async (arg) => {
        if (arg === argument) return Promise.resolve(ok(undefined));
        return Promise.resolve(err(new RepositoryError('Unknown argument')));
      });
      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        if (id.equals(argument.getId())) return Promise.resolve(ok(argument));
        return Promise.resolve(err(new RepositoryError('Not found')));
      });
      vi.mocked(mockRepository.findAll).mockResolvedValue(ok([argument]));
      vi.mocked(mockRepository.delete).mockImplementation(async (id) => {
        if (id.equals(argument.getId()))
          return Promise.resolve(err(new RepositoryError('Cannot delete')));
        return Promise.resolve(ok(undefined));
      });

      const saveResult = await mockRepository.save(argument);
      expect(saveResult.isOk()).toBe(true);

      const found = await mockRepository.findById(argument.getId());
      expect(found.isOk()).toBe(true);
      if (found.isOk()) {
        expect(found.value).toBe(argument);
      }

      const all = await mockRepository.findAll();
      expect(all.isOk()).toBe(true);
      if (all.isOk()) {
        expect(all.value).toEqual([argument]);
      }

      const deleteResult = await mockRepository.delete(argument.getId());
      expect(deleteResult.isErr()).toBe(true);
      if (!deleteResult.isErr()) throw new Error('Expected error');
      expect(deleteResult.error.message).toBe('Cannot delete');
    });

    it('should mock complex connection scenarios', async () => {
      const atomicArgs = Array.from({ length: 5 }, () => createTestArgument());

      vi.mocked(mockRepository.findAll).mockResolvedValue(ok(atomicArgs));

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        const found = atomicArgs.find((arg) => arg.getId().equals(id));
        if (found) {
          return Promise.resolve(ok(found));
        }
        return Promise.resolve(err(new RepositoryError('Not found')));
      });

      const all = await mockRepository.findAll();
      expect(all.isOk()).toBe(true);
      if (all.isOk()) {
        expect(all.value.length).toBe(5);
      }

      // Test finding by ID
      const firstArg = atomicArgs[0];
      if (!firstArg) throw new Error('Missing first argument');
      const found = await mockRepository.findById(firstArg.getId());
      expect(found.isOk()).toBe(true);
      if (found.isOk()) {
        expect(found.value).toBe(firstArg);
      }
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
      const _orderedSet = orderedSetResult.value;

      const argumentResult = AtomicArgument.create(statements, statements);

      expect(argumentResult.isOk()).toBe(true);
      if (argumentResult.isOk()) {
        const argument = argumentResult.value;
        const saveResult = await repository.save(argument);

        expect(saveResult.isOk()).toBe(true);

        const found = await repository.findById(argument.getId());
        expect(found.isOk()).toBe(true);
        if (found.isOk()) {
          expect(found.value.getId().equals(argument.getId())).toBe(true);
        }
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

      const argumentResult = AtomicArgument.create(premiseStatements, conclusionStatements);
      if (!argumentResult.isOk()) throw new Error('AtomicArgument creation failed');
      const argument = argumentResult.value;

      const saveResult = await repository.save(argument);
      expect(saveResult.isOk()).toBe(true);

      const found = await repository.findById(argument.getId());
      expect(found.isOk()).toBe(true);
      if (found.isOk()) {
        expect(found.value.getPremiseCount()).toBe(largeSize);
        expect(found.value.getConclusionCount()).toBe(largeSize);
      }
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
      expect(all.isOk()).toBe(true);
      if (all.isOk()) {
        expect(all.value.length).toBeLessThanOrEqual(remainingCount);
      }
    });
  });
});
