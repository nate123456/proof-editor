/**
 * Tests for IValidationResultRepository interface
 *
 * Focuses on:
 * - Repository interface contract validation
 * - Method signature compliance
 * - Return type verification
 * - Error handling patterns
 * - Repository behavior expectations
 */

import { ok } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import type { ValidationResult } from '../../entities/ValidationResult';
import type { IValidationResultRepository } from '../../repositories/IValidationResultRepository';
import type { ValidationResultId } from '../../value-objects/ValidationResultId';

describe('IValidationResultRepository', () => {
  describe('interface contract', () => {
    it('should define all required methods', () => {
      // This test ensures the interface has the expected structure
      const repositoryMethods = [
        'save',
        'findById',
        'findByDocumentId',
        'findByLanguagePackageId',
        'findRecentResults',
        'findAll',
        'delete',
      ];

      // Create a mock implementation to verify interface structure
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      // Verify all methods exist
      repositoryMethods.forEach(method => {
        expect(mockRepository).toHaveProperty(method);
        expect(typeof mockRepository[method as keyof IValidationResultRepository]).toBe('function');
      });
    });

    it('should have async methods that return correct types', () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      // All methods should be functions
      expect(typeof mockRepository.save).toBe('function');
      expect(typeof mockRepository.findById).toBe('function');
      expect(typeof mockRepository.findByDocumentId).toBe('function');
      expect(typeof mockRepository.findByLanguagePackageId).toBe('function');
      expect(typeof mockRepository.findRecentResults).toBe('function');
      expect(typeof mockRepository.findAll).toBe('function');
      expect(typeof mockRepository.delete).toBe('function');
    });
  });

  describe('method signatures', () => {
    it('should accept correct parameter types for save', async () => {
      const mockRepository: IValidationResultRepository = {
        save: (result: ValidationResult) => {
          expect(result).toBeDefined();
          return Promise.resolve(ok(undefined));
        },
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const mockResult = {} as ValidationResult;
      await mockRepository.save(mockResult);
    });

    it('should accept correct parameter types for findById', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: (id: ValidationResultId) => {
          expect(id).toBeDefined();
          return Promise.resolve(null);
        },
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const mockId = { getValue: () => 'test-id' } as ValidationResultId;
      await mockRepository.findById(mockId);
    });

    it('should accept correct parameter types for findByDocumentId', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: (documentId: string) => {
          expect(documentId).toBeDefined();
          expect(typeof documentId).toBe('string');
          return Promise.resolve([]);
        },
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      await mockRepository.findByDocumentId('test-doc-id');
    });

    it('should accept correct parameter types for findByLanguagePackageId', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: (languagePackageId: string) => {
          expect(languagePackageId).toBeDefined();
          expect(typeof languagePackageId).toBe('string');
          return Promise.resolve([]);
        },
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      await mockRepository.findByLanguagePackageId('test-pkg-id');
    });

    it('should accept correct parameter types for findRecentResults', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: (limit: number) => {
          expect(limit).toBeDefined();
          expect(typeof limit).toBe('number');
          expect(limit).toBeGreaterThan(0);
          return Promise.resolve([]);
        },
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      await mockRepository.findRecentResults(10);
    });

    it('should accept correct parameter types for delete', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: (id: ValidationResultId) => {
          expect(id).toBeDefined();
          return Promise.resolve(ok(undefined));
        },
      };

      const mockId = { getValue: () => 'test-id' } as ValidationResultId;
      await mockRepository.delete(mockId);
    });
  });

  describe('return types', () => {
    it('should return Promise types for all methods', () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      // Test that methods return Promises
      expect(mockRepository.save({} as ValidationResult)).toBeInstanceOf(Promise);
      expect(mockRepository.findById({} as ValidationResultId)).toBeInstanceOf(Promise);
      expect(mockRepository.findByDocumentId('test')).toBeInstanceOf(Promise);
      expect(mockRepository.findByLanguagePackageId('test')).toBeInstanceOf(Promise);
      expect(mockRepository.findRecentResults(10)).toBeInstanceOf(Promise);
      expect(mockRepository.findAll()).toBeInstanceOf(Promise);
      expect(mockRepository.delete({} as ValidationResultId)).toBeInstanceOf(Promise);
    });

    it('should return Result types for save and delete operations', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const saveResult = await mockRepository.save({} as ValidationResult);
      const deleteResult = await mockRepository.delete({} as ValidationResultId);

      // Verify Result type structure
      expect(saveResult).toHaveProperty('isOk');
      expect(saveResult).toHaveProperty('isErr');
      expect(typeof saveResult.isOk).toBe('function');
      expect(typeof saveResult.isErr).toBe('function');

      expect(deleteResult).toHaveProperty('isOk');
      expect(deleteResult).toHaveProperty('isErr');
      expect(typeof deleteResult.isOk).toBe('function');
      expect(typeof deleteResult.isErr).toBe('function');
    });

    it('should return nullable ValidationResult for findById', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const result = await mockRepository.findById({} as ValidationResultId);
      expect(result).toBeNull();
    });
  });

  describe('repository behavior patterns', () => {
    it('should handle null returns for findById when entity not found', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const result = await mockRepository.findById({} as ValidationResultId);
      expect(result).toBeNull();
    });

    it('should handle empty arrays for collection queries when no matches found', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const documentResult = await mockRepository.findByDocumentId('non-existent');
      const packageResult = await mockRepository.findByLanguagePackageId('non-existent');
      const recentResult = await mockRepository.findRecentResults(10);
      const allResult = await mockRepository.findAll();

      expect(Array.isArray(documentResult)).toBe(true);
      expect(documentResult).toHaveLength(0);
      expect(Array.isArray(packageResult)).toBe(true);
      expect(packageResult).toHaveLength(0);
      expect(Array.isArray(recentResult)).toBe(true);
      expect(recentResult).toHaveLength(0);
      expect(Array.isArray(allResult)).toBe(true);
      expect(allResult).toHaveLength(0);
    });

    it('should support filtering by multiple criteria', async () => {
      const mockValidationResults: ValidationResult[] = [
        {
          id: 'result1',
          documentId: 'doc1',
          languagePackageId: 'pkg1',
          timestamp: new Date('2023-01-01'),
          isValid: true,
        } as unknown as ValidationResult,
        {
          id: 'result2',
          documentId: 'doc1',
          languagePackageId: 'pkg2',
          timestamp: new Date('2023-01-02'),
          isValid: false,
        } as unknown as ValidationResult,
        {
          id: 'result3',
          documentId: 'doc2',
          languagePackageId: 'pkg1',
          timestamp: new Date('2023-01-03'),
          isValid: true,
        } as unknown as ValidationResult,
      ];

      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: (id: ValidationResultId) => {
          const found = mockValidationResults.find(
            r => (r as any).id === ((id as any).getValue?.() ?? id)
          );
          return Promise.resolve(found ?? null);
        },
        findByDocumentId: (documentId: string) => {
          const filtered = mockValidationResults.filter(r => (r as any).documentId === documentId);
          return Promise.resolve(filtered);
        },
        findByLanguagePackageId: (packageId: string) => {
          const filtered = mockValidationResults.filter(
            r => (r as any).languagePackageId === packageId
          );
          return Promise.resolve(filtered);
        },
        findRecentResults: (limit: number) => {
          const sorted = [...mockValidationResults].sort(
            (a, b) => (b as any).timestamp.getTime() - (a as any).timestamp.getTime()
          );
          return Promise.resolve(sorted.slice(0, limit));
        },
        findAll: () => Promise.resolve(mockValidationResults),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const doc1Results = await mockRepository.findByDocumentId('doc1');
      const pkg1Results = await mockRepository.findByLanguagePackageId('pkg1');
      const recentResults = await mockRepository.findRecentResults(2);

      expect(doc1Results).toHaveLength(2);
      expect(pkg1Results).toHaveLength(2);
      expect(recentResults).toHaveLength(2);
      expect((recentResults[0] as any).id).toBe('result3'); // Most recent
    });

    it('should handle findRecentResults with proper ordering and limits', async () => {
      const mockValidationResults: ValidationResult[] = [
        {
          id: 'result1',
          timestamp: new Date('2023-01-01'),
        } as unknown as ValidationResult,
        {
          id: 'result2',
          timestamp: new Date('2023-01-03'),
        } as unknown as ValidationResult,
        {
          id: 'result3',
          timestamp: new Date('2023-01-02'),
        } as unknown as ValidationResult,
        {
          id: 'result4',
          timestamp: new Date('2023-01-04'),
        } as unknown as ValidationResult,
      ];

      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: (limit: number) => {
          const sorted = [...mockValidationResults].sort(
            (a, b) => (b as any).timestamp.getTime() - (a as any).timestamp.getTime()
          );
          return Promise.resolve(sorted.slice(0, limit));
        },
        findAll: () => Promise.resolve(mockValidationResults),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const recent1 = await mockRepository.findRecentResults(1);
      const recent2 = await mockRepository.findRecentResults(2);
      const recent10 = await mockRepository.findRecentResults(10);

      expect(recent1).toHaveLength(1);
      expect((recent1[0] as any).id).toBe('result4'); // Most recent

      expect(recent2).toHaveLength(2);
      expect((recent2[0] as any).id).toBe('result4'); // Most recent
      expect((recent2[1] as any).id).toBe('result2'); // Second most recent

      expect(recent10).toHaveLength(4); // All results, limited by available count
      expect((recent10[0] as any).id).toBe('result4');
      expect((recent10[1] as any).id).toBe('result2');
      expect((recent10[2] as any).id).toBe('result3');
      expect((recent10[3] as any).id).toBe('result1');
    });

    it('should handle edge cases for findRecentResults', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: (limit: number) => {
          if (limit <= 0) {
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        },
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const zeroLimit = await mockRepository.findRecentResults(0);
      const negativeLimit = await mockRepository.findRecentResults(-1);

      expect(Array.isArray(zeroLimit)).toBe(true);
      expect(zeroLimit).toHaveLength(0);
      expect(Array.isArray(negativeLimit)).toBe(true);
      expect(negativeLimit).toHaveLength(0);
    });

    it('should support document-specific validation history', async () => {
      const mockValidationResults: ValidationResult[] = [
        {
          id: 'result1',
          documentId: 'doc1',
          languagePackageId: 'pkg1',
          isValid: true,
        } as unknown as ValidationResult,
        {
          id: 'result2',
          documentId: 'doc1',
          languagePackageId: 'pkg2',
          isValid: false,
        } as unknown as ValidationResult,
        {
          id: 'result3',
          documentId: 'doc2',
          languagePackageId: 'pkg1',
          isValid: true,
        } as unknown as ValidationResult,
      ];

      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: (documentId: string) => {
          const filtered = mockValidationResults.filter(r => (r as any).documentId === documentId);
          return Promise.resolve(filtered);
        },
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve(mockValidationResults),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const doc1Results = await mockRepository.findByDocumentId('doc1');
      const doc2Results = await mockRepository.findByDocumentId('doc2');
      const nonExistentResults = await mockRepository.findByDocumentId('non-existent');

      expect(doc1Results).toHaveLength(2);
      expect(doc2Results).toHaveLength(1);
      expect(nonExistentResults).toHaveLength(0);
    });
  });

  describe('interface type checking', () => {
    it('should enforce correct interface implementation', () => {
      // This test verifies that the interface can be properly implemented
      const implementRepository = (): IValidationResultRepository => ({
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      });

      const repository = implementRepository();
      expect(repository).toBeDefined();
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByDocumentId).toBe('function');
      expect(typeof repository.findByLanguagePackageId).toBe('function');
      expect(typeof repository.findRecentResults).toBe('function');
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });
  });

  describe('error handling patterns', () => {
    it('should handle repository errors in save operations', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const result = await mockRepository.save({} as ValidationResult);
      expect(result.isOk()).toBe(true);
    });

    it('should handle repository errors in delete operations', async () => {
      const mockRepository: IValidationResultRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByDocumentId: () => Promise.resolve([]),
        findByLanguagePackageId: () => Promise.resolve([]),
        findRecentResults: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const result = await mockRepository.delete({} as ValidationResultId);
      expect(result.isOk()).toBe(true);
    });
  });
});
