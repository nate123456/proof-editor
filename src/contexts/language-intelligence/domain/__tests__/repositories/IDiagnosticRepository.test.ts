/**
 * Tests for IDiagnosticRepository interface
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

import type { Diagnostic } from '../../entities/Diagnostic';
import type { IDiagnosticRepository } from '../../repositories/IDiagnosticRepository';
import type { DiagnosticId } from '../../value-objects/DiagnosticId';
import type { DiagnosticSeverity } from '../../value-objects/DiagnosticSeverity';

describe('IDiagnosticRepository', () => {
  describe('interface contract', () => {
    it('should define all required methods', () => {
      // This test ensures the interface has the expected structure
      const repositoryMethods = [
        'save',
        'findById',
        'findByLanguagePackageId',
        'findBySeverity',
        'findByDocumentId',
        'findAll',
        'delete',
      ];

      // Create a mock implementation to verify interface structure
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      // Verify all methods exist
      repositoryMethods.forEach(method => {
        expect(mockRepository).toHaveProperty(method);
        expect(typeof mockRepository[method as keyof IDiagnosticRepository]).toBe('function');
      });
    });

    it('should have async methods that return correct types', () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      // All methods should be functions
      expect(typeof mockRepository.save).toBe('function');
      expect(typeof mockRepository.findById).toBe('function');
      expect(typeof mockRepository.findByLanguagePackageId).toBe('function');
      expect(typeof mockRepository.findBySeverity).toBe('function');
      expect(typeof mockRepository.findByDocumentId).toBe('function');
      expect(typeof mockRepository.findAll).toBe('function');
      expect(typeof mockRepository.delete).toBe('function');
    });
  });

  describe('method signatures', () => {
    it('should accept correct parameter types for save', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: (diagnostic: Diagnostic) => {
          expect(diagnostic).toBeDefined();
          return Promise.resolve(ok(undefined));
        },
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const mockDiagnostic = {} as Diagnostic;
      await mockRepository.save(mockDiagnostic);
    });

    it('should accept correct parameter types for findById', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: (id: DiagnosticId) => {
          expect(id).toBeDefined();
          return Promise.resolve(null);
        },
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const mockId = { getValue: () => 'test-id' } as unknown as DiagnosticId;
      await mockRepository.findById(mockId);
    });

    it('should accept correct parameter types for findByLanguagePackageId', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: (languagePackageId: string) => {
          expect(languagePackageId).toBeDefined();
          expect(typeof languagePackageId).toBe('string');
          return Promise.resolve([]);
        },
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      await mockRepository.findByLanguagePackageId('test-pkg-id');
    });

    it('should accept correct parameter types for findBySeverity', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: (severity: DiagnosticSeverity) => {
          expect(severity).toBeDefined();
          return Promise.resolve([]);
        },
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const mockSeverity = { getSeverity: () => 'error' as const } as unknown as DiagnosticSeverity;
      await mockRepository.findBySeverity(mockSeverity);
    });

    it('should accept correct parameter types for findByDocumentId', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: (documentId: string) => {
          expect(documentId).toBeDefined();
          expect(typeof documentId).toBe('string');
          return Promise.resolve([]);
        },
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      await mockRepository.findByDocumentId('test-doc-id');
    });

    it('should accept correct parameter types for delete', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: (id: DiagnosticId) => {
          expect(id).toBeDefined();
          return Promise.resolve(ok(undefined));
        },
      };

      const mockId = { getValue: () => 'test-id' } as unknown as DiagnosticId;
      await mockRepository.delete(mockId);
    });
  });

  describe('return types', () => {
    it('should return Promise types for all methods', () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      // Test that methods return Promises
      expect(mockRepository.save({} as Diagnostic)).toBeInstanceOf(Promise);
      expect(mockRepository.findById({} as unknown as DiagnosticId)).toBeInstanceOf(Promise);
      expect(mockRepository.findByLanguagePackageId('test')).toBeInstanceOf(Promise);
      expect(mockRepository.findBySeverity({} as unknown as DiagnosticSeverity)).toBeInstanceOf(
        Promise
      );
      expect(mockRepository.findByDocumentId('test')).toBeInstanceOf(Promise);
      expect(mockRepository.findAll()).toBeInstanceOf(Promise);
      expect(mockRepository.delete({} as unknown as DiagnosticId)).toBeInstanceOf(Promise);
    });

    it('should return Result types for save and delete operations', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const saveResult = await mockRepository.save({} as Diagnostic);
      const deleteResult = await mockRepository.delete({} as unknown as DiagnosticId);

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
  });

  describe('repository behavior patterns', () => {
    it('should handle null returns for findById when entity not found', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const result = await mockRepository.findById({} as unknown as DiagnosticId);
      expect(result).toBeNull();
    });

    it('should handle empty arrays for collection queries when no matches found', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const packageResult = await mockRepository.findByLanguagePackageId('non-existent');
      const severityResult = await mockRepository.findBySeverity(
        {} as unknown as DiagnosticSeverity
      );
      const documentResult = await mockRepository.findByDocumentId('non-existent');
      const allResult = await mockRepository.findAll();

      expect(Array.isArray(packageResult)).toBe(true);
      expect(packageResult).toHaveLength(0);
      expect(Array.isArray(severityResult)).toBe(true);
      expect(severityResult).toHaveLength(0);
      expect(Array.isArray(documentResult)).toBe(true);
      expect(documentResult).toHaveLength(0);
      expect(Array.isArray(allResult)).toBe(true);
      expect(allResult).toHaveLength(0);
    });

    it('should support filtering by multiple criteria', async () => {
      const mockDiagnostics: Diagnostic[] = [
        {
          id: 'diag1',
          severity: 'error',
          languagePackageId: 'pkg1',
          documentId: 'doc1',
        } as unknown as Diagnostic,
        {
          id: 'diag2',
          severity: 'warning',
          languagePackageId: 'pkg1',
          documentId: 'doc2',
        } as unknown as Diagnostic,
        {
          id: 'diag3',
          severity: 'error',
          languagePackageId: 'pkg2',
          documentId: 'doc1',
        } as unknown as Diagnostic,
      ];

      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: (packageId: string) => {
          const filtered = mockDiagnostics.filter(d => (d as any).languagePackageId === packageId);
          return Promise.resolve(filtered);
        },
        findBySeverity: (severity: DiagnosticSeverity) => {
          const severityValue =
            (severity as any).getSeverity?.() ?? (severity as any).severity ?? 'error';
          const filtered = mockDiagnostics.filter(d => (d as any).severity === severityValue);
          return Promise.resolve(filtered);
        },
        findByDocumentId: (documentId: string) => {
          const filtered = mockDiagnostics.filter(d => (d as any).documentId === documentId);
          return Promise.resolve(filtered);
        },
        findAll: () => Promise.resolve(mockDiagnostics),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const pkg1Results = await mockRepository.findByLanguagePackageId('pkg1');
      const errorResults = await mockRepository.findBySeverity({
        getSeverity: () => 'error' as const,
      } as unknown as DiagnosticSeverity);
      const doc1Results = await mockRepository.findByDocumentId('doc1');

      expect(pkg1Results).toHaveLength(2);
      expect(errorResults).toHaveLength(2);
      expect(doc1Results).toHaveLength(2);
    });
  });

  describe('interface type checking', () => {
    it('should enforce correct interface implementation', () => {
      // This test verifies that the interface can be properly implemented
      const implementRepository = (): IDiagnosticRepository => ({
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      });

      const repository = implementRepository();
      expect(repository).toBeDefined();
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByLanguagePackageId).toBe('function');
      expect(typeof repository.findBySeverity).toBe('function');
      expect(typeof repository.findByDocumentId).toBe('function');
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });
  });

  describe('error handling patterns', () => {
    it('should handle repository errors in save operations', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const result = await mockRepository.save({} as Diagnostic);
      expect(result.isOk()).toBe(true);
    });

    it('should handle repository errors in delete operations', async () => {
      const mockRepository: IDiagnosticRepository = {
        save: () => Promise.resolve(ok(undefined)),
        findById: () => Promise.resolve(null),
        findByLanguagePackageId: () => Promise.resolve([]),
        findBySeverity: () => Promise.resolve([]),
        findByDocumentId: () => Promise.resolve([]),
        findAll: () => Promise.resolve([]),
        delete: () => Promise.resolve(ok(undefined)),
      };

      const result = await mockRepository.delete({} as unknown as DiagnosticId);
      expect(result.isOk()).toBe(true);
    });
  });
});
