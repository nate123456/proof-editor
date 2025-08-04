/**
 * Comprehensive test suite for IStatementRepository interface
 *
 * Tests mock implementations of the Statement repository to ensure:
 * - All interface methods are properly implemented
 * - Error scenarios are properly handled
 * - Edge cases are covered
 * - Repository operations maintain domain invariants
 */

import { err, ok, type Result } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Statement } from '../../entities/Statement';
import { RepositoryError } from '../../errors/DomainErrors';
import type { IStatementRepository } from '../../repositories/IStatementRepository';
import type {
  LogicalStructureType,
  PatternSearchOptions,
  QueryOptions,
  UsageMetrics,
} from '../../shared/repository-types';
import type { StatementId } from '../../shared/value-objects';
import { statementContentFactory, statementIdFactory } from './factories';

// Mock implementation of IStatementRepository for testing
class MockStatementRepository implements IStatementRepository {
  private readonly statements = new Map<string, Statement>();
  private readonly contentIndex = new Map<string, Statement>();

  async save(statement: Statement): Promise<Result<void, RepositoryError>> {
    try {
      // Simulate validation
      if (!statement?.getId()) {
        return err(new RepositoryError('Invalid statement provided'));
      }

      const id = statement.getId().getValue();
      const content = statement.getContent();

      // Check for duplicate content if it's a new statement
      const existingByContent = this.contentIndex.get(content);
      if (existingByContent && existingByContent.getId().getValue() !== id) {
        return err(new RepositoryError('Statement with this content already exists'));
      }

      this.statements.set(id, statement);
      this.contentIndex.set(content, statement);

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to save statement', error as Error));
    }
  }

  async findById(id: StatementId): Promise<Statement | null> {
    const statement = this.statements.get(id.getValue());
    return Promise.resolve(statement ?? null);
  }

  async findByContent(content: string): Promise<Statement | null> {
    const statement = this.contentIndex.get(content);
    return Promise.resolve(statement ?? null);
  }

  async findAll(): Promise<Statement[]> {
    return Promise.resolve(Array.from(this.statements.values()));
  }

  async delete(id: StatementId): Promise<Result<void, RepositoryError>> {
    try {
      const statement = this.statements.get(id.getValue());
      if (!statement) {
        return err(new RepositoryError('Statement not found'));
      }

      // Check if statement is being used
      if (statement.getUsageCount() > 0) {
        return err(new RepositoryError('Cannot delete statement that is in use'));
      }

      this.statements.delete(id.getValue());
      this.contentIndex.delete(statement.getContent());

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to delete statement', error as Error));
    }
  }

  async findStatementsByPattern(
    pattern: RegExp,
    options?: PatternSearchOptions,
  ): Promise<Statement[]> {
    const allStatements = Array.from(this.statements.values());
    const matches = allStatements.filter((statement) => pattern.test(statement.getContent()));

    return this.applyQueryOptions(matches, options);
  }

  async findFrequentlyUsedStatements(options?: QueryOptions): Promise<Statement[]> {
    const allStatements = Array.from(this.statements.values());
    const sortedByUsage = allStatements.sort((a, b) => b.getUsageCount() - a.getUsageCount());

    return this.applyQueryOptions(sortedByUsage, options);
  }

  async findByLogicalStructure(
    structureType: LogicalStructureType,
    options?: QueryOptions,
  ): Promise<Statement[]> {
    const allStatements = Array.from(this.statements.values());
    const matches = allStatements.filter((statement) =>
      this.matchesLogicalStructure(statement, structureType),
    );

    return this.applyQueryOptions(matches, options);
  }

  async findStatementsByUsageCount(minUsage: number, options?: QueryOptions): Promise<Statement[]> {
    const allStatements = Array.from(this.statements.values());
    const matches = allStatements.filter((statement) => statement.getUsageCount() >= minUsage);

    return this.applyQueryOptions(matches, options);
  }

  async findRelatedStatements(
    statementId: StatementId,
    options?: QueryOptions,
  ): Promise<Statement[]> {
    const allStatements = Array.from(this.statements.values());
    const targetStatement = this.statements.get(statementId.getValue());

    if (!targetStatement) return [];

    const related = allStatements.filter(
      (statement) =>
        !statement.getId().equals(statementId) &&
        this.areStatementsRelated(statement, targetStatement),
    );

    return this.applyQueryOptions(related, options);
  }

  async searchStatementsByKeywords(
    keywords: string[],
    options?: QueryOptions,
  ): Promise<Statement[]> {
    const allStatements = Array.from(this.statements.values());
    const matches = allStatements.filter((statement) =>
      keywords.some((keyword) =>
        statement.getContent().toLowerCase().includes(keyword.toLowerCase()),
      ),
    );

    return this.applyQueryOptions(matches, options);
  }

  async findStatementsInProof(proofId: string, options?: QueryOptions): Promise<Statement[]> {
    const allStatements = Array.from(this.statements.values());
    const matches = allStatements.filter((statement) =>
      statement.getContent().includes(`proof:${proofId}`),
    );

    return this.applyQueryOptions(matches, options);
  }

  async getStatementUsageMetrics(statementId: StatementId): Promise<UsageMetrics | null> {
    const statement = this.statements.get(statementId.getValue());

    if (!statement) return null;

    return {
      totalUsage: statement.getUsageCount(),
      recentUsage: Math.floor(statement.getUsageCount() / 2),
      lastUsedAt: new Date(),
    };
  }

  async findUnusedStatements(options?: QueryOptions): Promise<Statement[]> {
    const allStatements = Array.from(this.statements.values());
    const unused = allStatements.filter((statement) => statement.getUsageCount() === 0);

    return this.applyQueryOptions(unused, options);
  }

  // Helper methods for mock implementation
  private applyQueryOptions<T>(items: T[], options?: QueryOptions): T[] {
    let result = [...items];

    if (options?.offset) {
      result = result.slice(options.offset);
    }

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  private matchesLogicalStructure(
    statement: Statement,
    structureType: LogicalStructureType,
  ): boolean {
    const content = statement.getContent().toLowerCase();

    switch (structureType) {
      case 'conditional':
        return content.includes('if') && content.includes('then');
      case 'biconditional':
        return content.includes('if and only if') || content.includes('iff');
      case 'conjunction':
        return content.includes(' and ');
      case 'disjunction':
        return content.includes(' or ');
      case 'negation':
        return content.includes('not ') || content.includes('no ');
      case 'quantified':
        return content.includes('all ') || content.includes('some ') || content.includes('every ');
      default:
        return false;
    }
  }

  private areStatementsRelated(statement1: Statement, statement2: Statement): boolean {
    const content1 = statement1.getContent().toLowerCase().split(' ');
    const content2 = statement2.getContent().toLowerCase().split(' ');

    const commonWords = content1.filter((word) => word.length > 3 && content2.includes(word));

    return commonWords.length >= 2;
  }

  // Test helper methods
  clear(): void {
    this.statements.clear();
    this.contentIndex.clear();
  }

  size(): number {
    return this.statements.size;
  }
}

describe('IStatementRepository', () => {
  let repository: MockStatementRepository;

  beforeEach(() => {
    repository = new MockStatementRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save a valid statement successfully', async () => {
      const statementResult = Statement.create(statementContentFactory.build());
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) throw new Error('Statement creation failed');

      const statement = statementResult.value;
      const result = await repository.save(statement);

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(1);
    });

    it('should update an existing statement', async () => {
      const content = statementContentFactory.build();
      const statementResult = Statement.create(content);
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;

      // Save initially
      await repository.save(statement);

      // Increment usage
      statement.incrementUsage();

      // Save again
      const updateResult = await repository.save(statement);

      expect(updateResult.isOk()).toBe(true);
      expect(repository.size()).toBe(1);

      const retrieved = await repository.findById(statement.getId());
      expect(retrieved?.getUsageCount()).toBe(1);
    });

    it('should reject saving duplicate content with different ID', async () => {
      const content = 'Socrates is mortal';

      const statement1Result = Statement.create(content);
      const statement2Result = Statement.create(content);
      if (!statement1Result.isOk() || !statement2Result.isOk())
        throw new Error('Statement creation failed');

      const statement1 = statement1Result.value;
      const statement2 = statement2Result.value;

      // Force different IDs
      expect(statement1.getId().getValue()).not.toBe(statement2.getId().getValue());

      await repository.save(statement1);
      const result = await repository.save(statement2);

      expect(result.isErr()).toBe(true);
      if (!result.isErr()) throw new Error('Expected error');
      expect(result.error.message).toContain('content already exists');
    });

    it('should handle null statement gracefully', async () => {
      const result = await repository.save(null as any);

      expect(result.isErr()).toBe(true);
      if (!result.isErr()) throw new Error('Expected error');
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('Invalid statement');
    });

    it('should handle save failures with proper error', async () => {
      // Create a repository that fails on save
      const failingRepo = new MockStatementRepository();
      vi.spyOn(failingRepo as any, 'statements', 'get').mockImplementation(() => {
        throw new Error('Storage failure');
      });

      const statementResult = Statement.create('test');
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;
      const result = await failingRepo.save(statement);

      expect(result.isErr()).toBe(true);
      if (!result.isErr()) throw new Error('Expected error');
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('Failed to save');
      expect(result.error.cause?.message).toContain('Storage failure');
    });
  });

  describe('findById', () => {
    it('should find existing statement by ID', async () => {
      const statementResult = Statement.create(statementContentFactory.build());
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;
      await repository.save(statement);

      const found = await repository.findById(statement.getId());

      expect(found).not.toBeNull();
      expect(found?.getId().equals(statement.getId())).toBe(true);
      expect(found?.getContent()).toBe(statement.getContent());
    });

    it('should return null for non-existent ID', async () => {
      const randomId = statementIdFactory.build();
      const found = await repository.findById(randomId);

      expect(found).toBeNull();
    });

    it('should handle multiple statements correctly', async () => {
      const statements = Array.from({ length: 5 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      for (const statement of statements) {
        await repository.save(statement);
      }

      for (const statement of statements) {
        const found = await repository.findById(statement.getId());
        expect(found).not.toBeNull();
        expect(found?.getId().equals(statement.getId())).toBe(true);
      }
    });
  });

  describe('findByContent', () => {
    it('should find statement by exact content match', async () => {
      const content = 'All humans are mortal';
      const statementResult = Statement.create(content);
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;
      await repository.save(statement);

      const found = await repository.findByContent(content);

      expect(found).not.toBeNull();
      expect(found?.getContent()).toBe(content);
      expect(found?.getId().equals(statement.getId())).toBe(true);
    });

    it('should return null for non-existent content', async () => {
      const found = await repository.findByContent('Non-existent content');

      expect(found).toBeNull();
    });

    it('should be case-sensitive', async () => {
      const content = 'Socrates is a philosopher';
      const statementResult = Statement.create(content);
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;
      await repository.save(statement);

      const foundLowercase = await repository.findByContent(content.toLowerCase());
      const foundUppercase = await repository.findByContent(content.toUpperCase());

      expect(foundLowercase).toBeNull();
      expect(foundUppercase).toBeNull();
    });

    it('should handle content updates correctly', async () => {
      const content1 = 'Original content';
      const content2 = 'Updated content';

      const statement1Result = Statement.create(content1);
      if (!statement1Result.isOk()) throw new Error('Statement creation failed');
      const statement1 = statement1Result.value;
      await repository.save(statement1);

      // Create new statement with updated content but treat it as an update scenario
      const statement2Result = Statement.create(content2);
      if (!statement2Result.isOk()) throw new Error('Statement creation failed');
      const statement2 = statement2Result.value;
      await repository.save(statement2);

      const found1 = await repository.findByContent(content1);
      const found2 = await repository.findByContent(content2);

      expect(found1).not.toBeNull();
      expect(found2).not.toBeNull();
      expect(found1?.getId().getValue()).not.toBe(found2?.getId().getValue());
    });
  });

  describe('findAll', () => {
    it('should return empty array when no statements exist', async () => {
      const all = await repository.findAll();

      expect(all).toEqual([]);
      expect(all.length).toBe(0);
    });

    it('should return all saved statements', async () => {
      const count = 10;
      const statements = Array.from({ length: count }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      for (const statement of statements) {
        await repository.save(statement);
      }

      const all = await repository.findAll();

      expect(all.length).toBe(count);

      const allIds = all.map((s) => s.getId().getValue()).sort();
      const expectedIds = statements.map((s) => s.getId().getValue()).sort();
      expect(allIds).toEqual(expectedIds);
    });

    it('should return statements in consistent order', async () => {
      const statements = Array.from({ length: 5 }, () => {
        const result = Statement.create(statementContentFactory.build());
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      for (const statement of statements) {
        await repository.save(statement);
      }

      const all1 = await repository.findAll();
      const all2 = await repository.findAll();

      expect(all1.map((s) => s.getId().getValue())).toEqual(all2.map((s) => s.getId().getValue()));
    });
  });

  describe('delete', () => {
    it('should delete existing statement with zero usage', async () => {
      const statementResult = Statement.create(statementContentFactory.build());
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;
      await repository.save(statement);

      const result = await repository.delete(statement.getId());

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(0);

      const found = await repository.findById(statement.getId());
      expect(found).toBeNull();
    });

    it('should reject deleting statement that is in use', async () => {
      const statementResult = Statement.create(statementContentFactory.build());
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;
      statement.incrementUsage();
      await repository.save(statement);

      const result = await repository.delete(statement.getId());

      expect(result.isErr()).toBe(true);
      if (!result.isErr()) throw new Error('Expected error');
      expect(result.error.message).toContain('in use');
      expect(repository.size()).toBe(1);
    });

    it('should return error for non-existent statement', async () => {
      const randomId = statementIdFactory.build();
      const result = await repository.delete(randomId);

      expect(result.isErr()).toBe(true);
      if (!result.isErr()) throw new Error('Expected error');
      expect(result.error.message).toContain('not found');
    });

    it('should remove from both ID and content indexes', async () => {
      const content = 'Test statement for deletion';
      const statementResult = Statement.create(content);
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;
      await repository.save(statement);

      await repository.delete(statement.getId());

      const foundById = await repository.findById(statement.getId());
      const foundByContent = await repository.findByContent(content);

      expect(foundById).toBeNull();
      expect(foundByContent).toBeNull();
    });

    it('should handle delete failures with proper error', async () => {
      const statementResult = Statement.create('test');
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;
      await repository.save(statement);

      // Mock a failure during delete
      const failingRepo = new MockStatementRepository();
      await failingRepo.save(statement);

      vi.spyOn(failingRepo as any, 'statements', 'get').mockImplementation(() => {
        throw new Error('Delete operation failed');
      });

      const result = await failingRepo.delete(statement.getId());

      expect(result.isErr()).toBe(true);
      if (!result.isErr()) throw new Error('Expected error');
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.cause?.message).toContain('Delete operation failed');
    });
  });

  describe('Mock with vitest', () => {
    let mockRepository: IStatementRepository;

    beforeEach(() => {
      mockRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        findByContent: vi.fn(),
        delete: vi.fn(),
        findStatementsByPattern: vi.fn(),
        findFrequentlyUsedStatements: vi.fn(),
        findByLogicalStructure: vi.fn(),
        findStatementsByUsageCount: vi.fn(),
        findRelatedStatements: vi.fn(),
        searchStatementsByKeywords: vi.fn(),
        findStatementsInProof: vi.fn(),
        getStatementUsageMetrics: vi.fn(),
        findUnusedStatements: vi.fn(),
      };
    });

    it('should allow mocking specific scenarios', async () => {
      const statementResult = Statement.create('Test content');
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;

      vi.mocked(mockRepository.save).mockImplementation(async (s) => {
        if (s === statement) return Promise.resolve(ok(undefined));
        return Promise.resolve(err(new RepositoryError('Unknown statement')));
      });
      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        if (id.equals(statement.getId())) return Promise.resolve(statement);
        return Promise.resolve(null);
      });
      vi.mocked(mockRepository.findAll).mockResolvedValue([statement]);
      vi.mocked(mockRepository.findByContent).mockImplementation(async (content) => {
        if (content === 'Test content') return Promise.resolve(statement);
        return Promise.resolve(null);
      });
      vi.mocked(mockRepository.delete).mockImplementation(async (id) => {
        if (id.equals(statement.getId()))
          return Promise.resolve(err(new RepositoryError('Cannot delete')));
        return Promise.resolve(ok(undefined));
      });

      const saveResult = await mockRepository.save(statement);
      expect(saveResult.isOk()).toBe(true);

      const found = await mockRepository.findById(statement.getId());
      expect(found).toBe(statement);

      const all = await mockRepository.findAll();
      expect(all).toEqual([statement]);

      const byContent = await mockRepository.findByContent('Test content');
      expect(byContent).toBe(statement);

      const deleteResult = await mockRepository.delete(statement.getId());
      expect(deleteResult.isErr()).toBe(true);
      if (!deleteResult.isErr()) throw new Error('Expected error');
      expect(deleteResult.error.message).toBe('Cannot delete');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string content lookup', async () => {
      const found = await repository.findByContent('');
      expect(found).toBeNull();
    });

    it('should handle whitespace-only content lookup', async () => {
      const found = await repository.findByContent('   \t\n   ');
      expect(found).toBeNull();
    });

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(5000);
      const statementResult = Statement.create(longContent);
      if (!statementResult.isOk()) throw new Error('Statement creation failed');
      const statement = statementResult.value;

      const saveResult = await repository.save(statement);
      expect(saveResult.isOk()).toBe(true);

      const found = await repository.findByContent(longContent);
      expect(found).not.toBeNull();
      expect(found?.getContent()).toBe(longContent);
    });

    it('should maintain consistency under concurrent-like operations', async () => {
      const statements = Array.from({ length: 20 }, (_, i) => {
        const result = Statement.create(`Statement ${i}`);
        if (!result.isOk()) throw new Error('Statement creation failed');
        return result.value;
      });

      // Simulate interleaved saves and deletes
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement) continue;
        await repository.save(statement);

        if (i > 0 && i % 3 === 0) {
          // Delete some previous statements
          const prevStatement = statements[i - 1];
          if (prevStatement) {
            await repository.delete(prevStatement.getId());
          }
        }
      }

      const all = await repository.findAll();
      const remainingCount = statements.length - Math.floor(statements.length / 3);
      expect(all.length).toBeLessThanOrEqual(remainingCount);
    });
  });

  describe('Business Query Methods', () => {
    describe('findStatementsByPattern', () => {
      it('should find statements matching regex pattern', async () => {
        const statements = [
          (() => {
            const result = Statement.create('All humans are mortal');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('Some animals are mortal');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('Plants need water');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
        ];

        for (const statement of statements) {
          await repository.save(statement);
        }

        const pattern = /mortal/;
        const matches = await repository.findStatementsByPattern(pattern);

        expect(matches.length).toBe(2);
        expect(matches.every((s) => s.getContent().includes('mortal'))).toBe(true);
      });

      it('should respect query options', async () => {
        const statements = Array.from({ length: 10 }, (_, i) => {
          const result = Statement.create(`Statement ${i} with test`);
          if (!result.isOk()) throw new Error('Statement creation failed');
          return result.value;
        });

        for (const statement of statements) {
          await repository.save(statement);
        }

        const pattern = /test/;
        const matches = await repository.findStatementsByPattern(pattern, { limit: 3 });

        expect(matches.length).toBe(3);
      });
    });

    describe('findFrequentlyUsedStatements', () => {
      it('should return statements sorted by usage count', async () => {
        const statement1Result = Statement.create('Low usage');
        const statement2Result = Statement.create('High usage');
        const statement3Result = Statement.create('Medium usage');
        if (!statement1Result.isOk() || !statement2Result.isOk() || !statement3Result.isOk()) {
          throw new Error('Statement creation failed');
        }
        const statement1 = statement1Result.value;
        const statement2 = statement2Result.value;
        const statement3 = statement3Result.value;

        statement1.incrementUsage();
        statement2.incrementUsage();
        statement2.incrementUsage();
        statement2.incrementUsage();
        statement3.incrementUsage();
        statement3.incrementUsage();

        await repository.save(statement1);
        await repository.save(statement2);
        await repository.save(statement3);

        const frequent = await repository.findFrequentlyUsedStatements();

        expect(frequent.length).toBe(3);
        const first = frequent[0];
        const second = frequent[1];
        const third = frequent[2];
        if (first) expect(first.getUsageCount()).toBe(3);
        if (second) expect(second.getUsageCount()).toBe(2);
        if (third) expect(third.getUsageCount()).toBe(1);
      });
    });

    describe('findByLogicalStructure', () => {
      it('should find conditional statements', async () => {
        const statements = [
          (() => {
            const result = Statement.create('If it rains then the ground is wet');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('The sky is blue');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('If all men are mortal then Socrates is mortal');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
        ];

        for (const statement of statements) {
          await repository.save(statement);
        }

        const conditionals = await repository.findByLogicalStructure('conditional');

        expect(conditionals.length).toBe(2);
        expect(
          conditionals.every(
            (s) =>
              s.getContent().toLowerCase().includes('if') &&
              s.getContent().toLowerCase().includes('then'),
          ),
        ).toBe(true);
      });

      it('should find quantified statements', async () => {
        const statements = [
          (() => {
            const result = Statement.create('All men are mortal');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('Some birds can fly');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('The cat is sleeping');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
        ];

        for (const statement of statements) {
          await repository.save(statement);
        }

        const quantified = await repository.findByLogicalStructure('quantified');

        expect(quantified.length).toBe(2);
      });
    });

    describe('findStatementsByUsageCount', () => {
      it('should find statements with minimum usage count', async () => {
        const statement1Result = Statement.create('Never used');
        const statement2Result = Statement.create('Used once');
        const statement3Result = Statement.create('Used multiple times');
        if (!statement1Result.isOk() || !statement2Result.isOk() || !statement3Result.isOk()) {
          throw new Error('Statement creation failed');
        }
        const statement1 = statement1Result.value;
        const statement2 = statement2Result.value;
        const statement3 = statement3Result.value;

        statement2.incrementUsage();
        statement3.incrementUsage();
        statement3.incrementUsage();
        statement3.incrementUsage();

        await repository.save(statement1);
        await repository.save(statement2);
        await repository.save(statement3);

        const frequentlyUsed = await repository.findStatementsByUsageCount(2);

        expect(frequentlyUsed.length).toBe(1);
        const firstFreq = frequentlyUsed[0];
        if (firstFreq) {
          expect(firstFreq.getContent()).toBe('Used multiple times');
        }
      });
    });

    describe('searchStatementsByKeywords', () => {
      it('should find statements containing any of the keywords', async () => {
        const statements = [
          (() => {
            const result = Statement.create('Socrates is a philosopher');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('All philosophers think deeply');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('Logic is important');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
          (() => {
            const result = Statement.create('Mathematics requires proof');
            if (!result.isOk()) throw new Error('Statement creation failed');
            return result.value;
          })(),
        ];

        for (const statement of statements) {
          await repository.save(statement);
        }

        const matches = await repository.searchStatementsByKeywords(['philosopher', 'logic']);

        expect(matches.length).toBe(3);
      });

      it('should be case insensitive', async () => {
        const statementResult = Statement.create('PHILOSOPHY is wisdom');
        if (!statementResult.isOk()) throw new Error('Statement creation failed');
        const statement = statementResult.value;
        await repository.save(statement);

        const matches = await repository.searchStatementsByKeywords(['philosophy']);

        expect(matches.length).toBe(1);
        const firstMatch = matches[0];
        if (firstMatch) {
          expect(firstMatch.getContent()).toBe('PHILOSOPHY is wisdom');
        }
      });
    });

    describe('getStatementUsageMetrics', () => {
      it('should return usage metrics for existing statement', async () => {
        const statementResult = Statement.create('Test statement');
        if (!statementResult.isOk()) throw new Error('Statement creation failed');
        const statement = statementResult.value;
        statement.incrementUsage();
        statement.incrementUsage();
        await repository.save(statement);

        const metrics = await repository.getStatementUsageMetrics(statement.getId());

        expect(metrics).not.toBeNull();
        expect(metrics?.totalUsage).toBe(2);
        expect(metrics?.recentUsage).toBe(1);
        expect(metrics?.lastUsedAt).toBeInstanceOf(Date);
      });

      it('should return null for non-existent statement', async () => {
        const randomId = statementIdFactory.build();
        const metrics = await repository.getStatementUsageMetrics(randomId);

        expect(metrics).toBeNull();
      });
    });

    describe('findUnusedStatements', () => {
      it('should find statements with zero usage', async () => {
        const statement1Result = Statement.create('Used statement');
        const statement2Result = Statement.create('Unused statement');
        if (!statement1Result.isOk() || !statement2Result.isOk()) {
          throw new Error('Statement creation failed');
        }
        const statement1 = statement1Result.value;
        const statement2 = statement2Result.value;

        statement1.incrementUsage();

        await repository.save(statement1);
        await repository.save(statement2);

        const unused = await repository.findUnusedStatements();

        expect(unused.length).toBe(1);
        const firstUnused = unused[0];
        if (firstUnused) {
          expect(firstUnused.getContent()).toBe('Unused statement');
        }
      });
    });

    describe('findRelatedStatements', () => {
      it('should find statements with common words', async () => {
        const targetStatementResult = Statement.create('Socrates is a Greek philosopher');
        const related1Result = Statement.create('Plato was also a Greek philosopher');
        const related2Result = Statement.create('Aristotle studied under Plato');
        const unrelatedResult = Statement.create('The weather is nice today');
        if (
          !targetStatementResult.isOk() ||
          !related1Result.isOk() ||
          !related2Result.isOk() ||
          !unrelatedResult.isOk()
        ) {
          throw new Error('Statement creation failed');
        }
        const targetStatement = targetStatementResult.value;
        const related1 = related1Result.value;
        const related2 = related2Result.value;
        const unrelated = unrelatedResult.value;

        await repository.save(targetStatement);
        await repository.save(related1);
        await repository.save(related2);
        await repository.save(unrelated);

        const related = await repository.findRelatedStatements(targetStatement.getId());

        expect(related.length).toBe(1);
        const firstRelated = related[0];
        if (firstRelated) {
          expect(firstRelated.getContent()).toBe('Plato was also a Greek philosopher');
        }
      });
    });
  });
});
