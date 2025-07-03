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
import { type StatementId } from '../../shared/value-objects';
import { statementContentFactory, statementIdFactory } from '../factories';

// Mock implementation of IStatementRepository for testing
class MockStatementRepository implements IStatementRepository {
  private statements = new Map<string, Statement>();
  private contentIndex = new Map<string, Statement>();

  save(statement: Statement): Promise<Result<void, RepositoryError>> {
    try {
      // Simulate validation
      if (!statement?.getId()) {
        return err(new RepositoryError('Invalid statement provided'));
      }

      const id = statement.getId().value;
      const content = statement.getContent();

      // Check for duplicate content if it's a new statement
      const existingByContent = this.contentIndex.get(content);
      if (existingByContent && existingByContent.getId().value !== id) {
        return err(new RepositoryError('Statement with this content already exists'));
      }

      this.statements.set(id, statement);
      this.contentIndex.set(content, statement);

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to save statement', error as Error));
    }
  }

  findById(id: StatementId): Promise<Statement | null> {
    const statement = this.statements.get(id.value);
    return Promise.resolve(statement ?? null);
  }

  findByContent(content: string): Promise<Statement | null> {
    const statement = this.contentIndex.get(content);
    return Promise.resolve(statement ?? null);
  }

  findAll(): Promise<Statement[]> {
    return Promise.resolve(Array.from(this.statements.values()));
  }

  delete(id: StatementId): Promise<Result<void, RepositoryError>> {
    try {
      const statement = this.statements.get(id.value);
      if (!statement) {
        return err(new RepositoryError('Statement not found'));
      }

      // Check if statement is being used
      if (statement.getUsageCount() > 0) {
        return err(new RepositoryError('Cannot delete statement that is in use'));
      }

      this.statements.delete(id.value);
      this.contentIndex.delete(statement.getContent());

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to delete statement', error as Error));
    }
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

      const statement = statementResult.value;
      const result = await repository.save(statement);

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(1);
    });

    it('should update an existing statement', async () => {
      const content = statementContentFactory.build();
      const statementResult = Statement.create(content);
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

      const statement1 = statement1Result.value;
      const statement2 = statement2Result.value;

      // Force different IDs
      expect(statement1.getId().value).not.toBe(statement2.getId().value);

      await repository.save(statement1);
      const result = await repository.save(statement2);

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('content already exists');
    });

    it('should handle null statement gracefully', async () => {
      const result = await repository.save(null as any);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('Invalid statement');
    });

    it('should handle save failures with proper error', async () => {
      // Create a repository that fails on save
      const failingRepo = new MockStatementRepository();
      vi.spyOn(failingRepo as any, 'statements', 'get').mockImplementation(() => {
        throw new Error('Storage failure');
      });

      const statement = Statement.create('test').value;
      const result = await failingRepo.save(statement);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('Failed to save');
      expect(result.error.cause?.message).toContain('Storage failure');
    });
  });

  describe('findById', () => {
    it('should find existing statement by ID', async () => {
      const statement = Statement.create(statementContentFactory.build()).value;
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
      const statements = Array.from(
        { length: 5 },
        () => Statement.create(statementContentFactory.build()).value
      );

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
      const statement = Statement.create(content).value;
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
      const statement = Statement.create(content).value;
      await repository.save(statement);

      const foundLowercase = await repository.findByContent(content.toLowerCase());
      const foundUppercase = await repository.findByContent(content.toUpperCase());

      expect(foundLowercase).toBeNull();
      expect(foundUppercase).toBeNull();
    });

    it('should handle content updates correctly', async () => {
      const content1 = 'Original content';
      const content2 = 'Updated content';

      const statement1 = Statement.create(content1).value;
      await repository.save(statement1);

      // Create new statement with updated content but treat it as an update scenario
      const statement2 = Statement.create(content2).value;
      await repository.save(statement2);

      const found1 = await repository.findByContent(content1);
      const found2 = await repository.findByContent(content2);

      expect(found1).not.toBeNull();
      expect(found2).not.toBeNull();
      expect(found1?.getId().value).not.toBe(found2?.getId().value);
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
      const statements = Array.from(
        { length: count },
        () => Statement.create(statementContentFactory.build()).value
      );

      for (const statement of statements) {
        await repository.save(statement);
      }

      const all = await repository.findAll();

      expect(all.length).toBe(count);

      const allIds = all.map(s => s.getId().value).sort();
      const expectedIds = statements.map(s => s.getId().value).sort();
      expect(allIds).toEqual(expectedIds);
    });

    it('should return statements in consistent order', async () => {
      const statements = Array.from(
        { length: 5 },
        () => Statement.create(statementContentFactory.build()).value
      );

      for (const statement of statements) {
        await repository.save(statement);
      }

      const all1 = await repository.findAll();
      const all2 = await repository.findAll();

      expect(all1.map(s => s.getId().value)).toEqual(all2.map(s => s.getId().value));
    });
  });

  describe('delete', () => {
    it('should delete existing statement with zero usage', async () => {
      const statement = Statement.create(statementContentFactory.build()).value;
      await repository.save(statement);

      const result = await repository.delete(statement.getId());

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(0);

      const found = await repository.findById(statement.getId());
      expect(found).toBeNull();
    });

    it('should reject deleting statement that is in use', async () => {
      const statement = Statement.create(statementContentFactory.build()).value;
      statement.incrementUsage();
      await repository.save(statement);

      const result = await repository.delete(statement.getId());

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('in use');
      expect(repository.size()).toBe(1);
    });

    it('should return error for non-existent statement', async () => {
      const randomId = statementIdFactory.build();
      const result = await repository.delete(randomId);

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('not found');
    });

    it('should remove from both ID and content indexes', async () => {
      const content = 'Test statement for deletion';
      const statement = Statement.create(content).value;
      await repository.save(statement);

      await repository.delete(statement.getId());

      const foundById = await repository.findById(statement.getId());
      const foundByContent = await repository.findByContent(content);

      expect(foundById).toBeNull();
      expect(foundByContent).toBeNull();
    });

    it('should handle delete failures with proper error', async () => {
      const statement = Statement.create('test').value;
      await repository.save(statement);

      // Mock a failure during delete
      const failingRepo = new MockStatementRepository();
      await failingRepo.save(statement);

      vi.spyOn(failingRepo as any, 'statements', 'get').mockImplementation(() => {
        throw new Error('Delete operation failed');
      });

      const result = await failingRepo.delete(statement.getId());

      expect(result.isErr()).toBe(true);
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
      };
    });

    it('should allow mocking specific scenarios', async () => {
      const statement = Statement.create('Test content').value;

      vi.mocked(mockRepository.save).mockImplementation(s => {
        if (s === statement) return Promise.resolve(ok(undefined));
        return Promise.resolve(err(new RepositoryError('Unknown statement')));
      });
      vi.mocked(mockRepository.findById).mockImplementation(id => {
        if (id.equals(statement.getId())) return Promise.resolve(statement);
        return Promise.resolve(null);
      });
      vi.mocked(mockRepository.findAll).mockResolvedValue([statement]);
      vi.mocked(mockRepository.findByContent).mockImplementation(content => {
        if (content === 'Test content') return Promise.resolve(statement);
        return Promise.resolve(null);
      });
      vi.mocked(mockRepository.delete).mockImplementation(id => {
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
      const statement = Statement.create(longContent).value;

      const saveResult = await repository.save(statement);
      expect(saveResult.isOk()).toBe(true);

      const found = await repository.findByContent(longContent);
      expect(found).not.toBeNull();
      expect(found?.getContent()).toBe(longContent);
    });

    it('should maintain consistency under concurrent-like operations', async () => {
      const statements = Array.from(
        { length: 20 },
        (_, i) => Statement.create(`Statement ${i}`).value
      );

      // Simulate interleaved saves and deletes
      for (let i = 0; i < statements.length; i++) {
        await repository.save(statements[i]);

        if (i > 0 && i % 3 === 0) {
          // Delete some previous statements
          await repository.delete(statements[i - 1].getId());
        }
      }

      const all = await repository.findAll();
      const remainingCount = statements.length - Math.floor(statements.length / 3);
      expect(all.length).toBeLessThanOrEqual(remainingCount);
    });
  });
});
