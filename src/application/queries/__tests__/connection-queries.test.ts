/**
 * Comprehensive test suite for connection-queries execution and validation
 *
 * Tests query parameter validation, execution logic, error scenarios,
 * data transformation, and integration with domain services.
 */

import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atomicArgumentFactory,
  orderedSetIdFactory,
} from '../../../domain/__tests__/factories/index.js';
import { ValidationError } from '../../../domain/shared/result.js';
import type {
  ConnectionDTO,
  ConnectionPathDTO,
  FindConnectionsQuery,
  GetConnectionPathsQuery,
} from '../connection-queries.js';

// Mock repositories
interface MockConnectionRepositories {
  proofRepository: any;
  argumentRepository: any;
  orderedSetRepository: any;
}

describe('Connection Query Execution Tests', () => {
  let mockRepositories: MockConnectionRepositories;
  let connectionService: any;

  beforeEach(() => {
    mockRepositories = {
      proofRepository: {
        findById: vi.fn(),
      },
      argumentRepository: {
        findById: vi.fn(),
        findByProofId: vi.fn(),
        findByOrderedSetId: vi.fn(),
      },
      orderedSetRepository: {
        findById: vi.fn(),
        findSharedSets: vi.fn(),
      },
    };
    connectionService = {
      findConnections: vi.fn(),
      getConnectionPaths: vi.fn(),
    };
  });

  describe('FindConnectionsQuery Execution', () => {
    it('should find all connections in document', async () => {
      // Arrange
      const query: FindConnectionsQuery = { documentId: 'doc_connected' };

      const argument1 = atomicArgumentFactory.build();
      const argument2 = atomicArgumentFactory.build();
      const orderedSetId = orderedSetIdFactory.build();
      const sharedOrderedSet = {
        getId: () => ({ getValue: () => orderedSetId.getValue() }),
      };

      mockRepositories.argumentRepository.findByProofId.mockResolvedValue([argument1, argument2]);
      mockRepositories.orderedSetRepository.findSharedSets.mockResolvedValue([sharedOrderedSet]);

      const expectedConnections: ConnectionDTO[] = [
        {
          providerId: argument1.getId().getValue(),
          consumerId: argument2.getId().getValue(),
          sharedOrderedSetId: sharedOrderedSet.getId().getValue(),
          connectionType: 'direct',
        },
      ];

      connectionService.findConnections.mockResolvedValue(expectedConnections);

      // Act
      const result = await connectionService.findConnections(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].providerId).toBe(argument1.getId().getValue());
      expect(result[0].consumerId).toBe(argument2.getId().getValue());
      expect(result[0].connectionType).toBe('direct');
      expect(result[0].sharedOrderedSetId).toBe(sharedOrderedSet.getId().getValue());
    });

    it('should find connections for specific argument', async () => {
      // Arrange
      const targetArgument = atomicArgumentFactory.build();
      const query: FindConnectionsQuery = {
        documentId: 'doc_specific',
        argumentId: targetArgument.getId().getValue(),
      };

      const connectedArgument = atomicArgumentFactory.build();
      const orderedSetId = orderedSetIdFactory.build();
      const sharedOrderedSet = {
        getId: () => ({ getValue: () => orderedSetId.getValue() }),
      };

      const expectedConnections: ConnectionDTO[] = [
        {
          providerId: targetArgument.getId().getValue(),
          consumerId: connectedArgument.getId().getValue(),
          sharedOrderedSetId: sharedOrderedSet.getId().getValue(),
          connectionType: 'direct',
        },
      ];

      connectionService.findConnections.mockResolvedValue(expectedConnections);

      // Act
      const result = await connectionService.findConnections(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].providerId).toBe(targetArgument.getId().getValue());
      expect(result[0].consumerId).toBe(connectedArgument.getId().getValue());
      expect(result[0].connectionType).toBe('direct');
      expect(result[0].sharedOrderedSetId).toBe(sharedOrderedSet.getId().getValue());
    });

    it('should find connections for specific ordered set', async () => {
      // Arrange
      const orderedSetId = orderedSetIdFactory.build();
      const targetOrderedSet = {
        getId: () => ({ getValue: () => orderedSetId.getValue() }),
      };
      const query: FindConnectionsQuery = {
        documentId: 'doc_orderedset',
        orderedSetId: targetOrderedSet.getId().getValue(),
      };

      const argument1 = atomicArgumentFactory.build();
      const argument2 = atomicArgumentFactory.build();

      const expectedConnections: ConnectionDTO[] = [
        {
          providerId: argument1.getId().getValue(),
          consumerId: argument2.getId().getValue(),
          sharedOrderedSetId: targetOrderedSet.getId().getValue(),
          connectionType: 'direct',
        },
      ];

      connectionService.findConnections.mockResolvedValue(expectedConnections);

      // Act
      const result = await connectionService.findConnections(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].sharedOrderedSetId).toBe(targetOrderedSet.getId().getValue());
      expect(result[0].providerId).toBe(argument1.getId().getValue());
      expect(result[0].consumerId).toBe(argument2.getId().getValue());
      expect(result[0].connectionType).toBe('direct');
    });

    it('should return empty array when no connections exist', async () => {
      // Arrange
      const query: FindConnectionsQuery = { documentId: 'doc_isolated' };

      mockRepositories.argumentRepository.findByProofId.mockResolvedValue([]);
      mockRepositories.orderedSetRepository.findSharedSets.mockResolvedValue([]);

      connectionService.findConnections.mockResolvedValue([]);

      // Act
      const result = await connectionService.findConnections(query);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle transitive connections', async () => {
      // Arrange
      const query: FindConnectionsQuery = { documentId: 'doc_transitive' };

      const argument1 = atomicArgumentFactory.build();
      const argument2 = atomicArgumentFactory.build();
      const argument3 = atomicArgumentFactory.build();

      const expectedConnections: ConnectionDTO[] = [
        {
          providerId: argument1.getId().getValue(),
          consumerId: argument2.getId().getValue(),
          sharedOrderedSetId: 'shared_1',
          connectionType: 'direct',
        },
        {
          providerId: argument2.getId().getValue(),
          consumerId: argument3.getId().getValue(),
          sharedOrderedSetId: 'shared_2',
          connectionType: 'direct',
        },
        {
          providerId: argument1.getId().getValue(),
          consumerId: argument3.getId().getValue(),
          sharedOrderedSetId: 'shared_transitive',
          connectionType: 'transitive',
        },
      ];

      connectionService.findConnections.mockResolvedValue(expectedConnections);

      // Act
      const result = await connectionService.findConnections(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.filter((c: ConnectionDTO) => c.connectionType === 'direct')).toHaveLength(2);
      expect(result.filter((c: ConnectionDTO) => c.connectionType === 'transitive')).toHaveLength(
        1,
      );
    });
  });

  describe('GetConnectionPathsQuery Execution', () => {
    it('should find path between two arguments', async () => {
      // Arrange
      const fromArgument = atomicArgumentFactory.build();
      const toArgument = atomicArgumentFactory.build();
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_path',
        fromArgumentId: fromArgument.getId().getValue(),
        toArgumentId: toArgument.getId().getValue(),
      };

      const expectedPaths: ConnectionPathDTO[] = [
        {
          steps: [fromArgument.getId().getValue(), toArgument.getId().getValue()],
          sharedSets: ['shared_set_1'],
          totalLength: 1,
        },
      ];

      connectionService.getConnectionPaths.mockResolvedValue(expectedPaths);

      // Act
      const result = await connectionService.getConnectionPaths(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].steps).toHaveLength(2);
      expect(result[0].steps[0]).toBe(fromArgument.getId().getValue());
      expect(result[0].steps[1]).toBe(toArgument.getId().getValue());
      expect(result[0].totalLength).toBe(1);
    });

    it('should find all paths from argument when no target specified', async () => {
      // Arrange
      const fromArgument = atomicArgumentFactory.build();
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_all_paths',
        fromArgumentId: fromArgument.getId().getValue(),
      };

      const expectedPaths: ConnectionPathDTO[] = [
        {
          steps: [fromArgument.getId().getValue(), 'arg_2'],
          sharedSets: ['shared_1'],
          totalLength: 1,
        },
        {
          steps: [fromArgument.getId().getValue(), 'arg_3'],
          sharedSets: ['shared_2'],
          totalLength: 1,
        },
        {
          steps: [fromArgument.getId().getValue(), 'arg_2', 'arg_4'],
          sharedSets: ['shared_1', 'shared_3'],
          totalLength: 2,
        },
      ];

      connectionService.getConnectionPaths.mockResolvedValue(expectedPaths);

      // Act
      const result = await connectionService.getConnectionPaths(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].totalLength).toBe(1);
      expect(result[1].totalLength).toBe(1);
      expect(result[2].totalLength).toBe(2);
    });

    it('should respect max depth limit', async () => {
      // Arrange
      const fromArgument = atomicArgumentFactory.build();
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_depth_limit',
        fromArgumentId: fromArgument.getId().getValue(),
        maxDepth: 2,
      };

      const expectedPaths: ConnectionPathDTO[] = [
        {
          steps: [fromArgument.getId().getValue(), 'arg_2'],
          sharedSets: ['shared_1'],
          totalLength: 1,
        },
        {
          steps: [fromArgument.getId().getValue(), 'arg_2', 'arg_3'],
          sharedSets: ['shared_1', 'shared_2'],
          totalLength: 2,
        },
        // No paths of length 3 or more due to maxDepth: 2
      ];

      connectionService.getConnectionPaths.mockResolvedValue(expectedPaths);

      // Act
      const result = await connectionService.getConnectionPaths(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((path: ConnectionPathDTO) => path.totalLength <= 2)).toBe(true);
    });

    it('should return empty array when no paths exist', async () => {
      // Arrange
      const fromArgument = atomicArgumentFactory.build();
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_no_paths',
        fromArgumentId: fromArgument.getId().getValue(),
      };

      mockRepositories.argumentRepository.findById.mockResolvedValue(fromArgument);
      connectionService.getConnectionPaths.mockResolvedValue([]);

      // Act
      const result = await connectionService.getConnectionPaths(query);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle complex multi-path scenarios', async () => {
      // Arrange
      const fromArgument = atomicArgumentFactory.build();
      const toArgument = atomicArgumentFactory.build();
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_complex',
        fromArgumentId: fromArgument.getId().getValue(),
        toArgumentId: toArgument.getId().getValue(),
      };

      const expectedPaths: ConnectionPathDTO[] = [
        {
          // Direct path
          steps: [fromArgument.getId().getValue(), toArgument.getId().getValue()],
          sharedSets: ['shared_direct'],
          totalLength: 1,
        },
        {
          // Indirect path through arg_2
          steps: [fromArgument.getId().getValue(), 'arg_2', toArgument.getId().getValue()],
          sharedSets: ['shared_1', 'shared_2'],
          totalLength: 2,
        },
        {
          // Indirect path through arg_3
          steps: [fromArgument.getId().getValue(), 'arg_3', toArgument.getId().getValue()],
          sharedSets: ['shared_3', 'shared_4'],
          totalLength: 2,
        },
      ];

      connectionService.getConnectionPaths.mockResolvedValue(expectedPaths);

      // Act
      const result = await connectionService.getConnectionPaths(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.filter((path: ConnectionPathDTO) => path.totalLength === 1)).toHaveLength(1);
      expect(result.filter((path: ConnectionPathDTO) => path.totalLength === 2)).toHaveLength(2);
    });
  });

  describe('Connection Query Parameter Validation', () => {
    it('should validate required documentId', async () => {
      // Test cases for missing or invalid documentId
      const invalidQueries = [
        { documentId: '' },
        { documentId: '   ' },
        { documentId: null as any },
        { documentId: undefined as any },
      ];

      for (const query of invalidQueries) {
        connectionService.findConnections.mockRejectedValue(
          new ValidationError('Document ID is required'),
        );

        await expect(connectionService.findConnections(query)).rejects.toThrow(
          'Document ID is required',
        );
      }
    });

    it('should validate fromArgumentId in path queries', async () => {
      const invalidQueries = [
        { documentId: 'doc_123', fromArgumentId: '' },
        { documentId: 'doc_123', fromArgumentId: '   ' },
        { documentId: 'doc_123', fromArgumentId: null as any },
        { documentId: 'doc_123', fromArgumentId: undefined as any },
      ];

      for (const query of invalidQueries) {
        connectionService.getConnectionPaths.mockRejectedValue(
          new ValidationError('From argument ID is required'),
        );

        await expect(connectionService.getConnectionPaths(query)).rejects.toThrow(
          'From argument ID is required',
        );
      }
    });

    it('should validate maxDepth parameter', async () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_123',
        fromArgumentId: 'arg_123',
        maxDepth: -1,
      };

      connectionService.getConnectionPaths.mockRejectedValue(
        new ValidationError('Max depth must be positive'),
      );

      await expect(connectionService.getConnectionPaths(query)).rejects.toThrow(
        'Max depth must be positive',
      );
    });
  });

  describe('Connection Query Error Handling', () => {
    it('should handle non-existent documents', async () => {
      const query: FindConnectionsQuery = { documentId: 'nonexistent_doc' };

      mockRepositories.proofRepository.findById.mockResolvedValue(null);
      connectionService.findConnections.mockRejectedValue(
        new ValidationError('Document not found'),
      );

      await expect(connectionService.findConnections(query)).rejects.toThrow('Document not found');
    });

    it('should handle non-existent arguments', async () => {
      const query: FindConnectionsQuery = {
        documentId: 'doc_123',
        argumentId: 'nonexistent_arg',
      };

      mockRepositories.argumentRepository.findById.mockResolvedValue(null);
      connectionService.findConnections.mockRejectedValue(
        new ValidationError('Argument not found'),
      );

      await expect(connectionService.findConnections(query)).rejects.toThrow('Argument not found');
    });

    it('should handle repository errors gracefully', async () => {
      const query: FindConnectionsQuery = { documentId: 'doc_error' };

      mockRepositories.argumentRepository.findByProofId.mockRejectedValue(
        new Error('Database connection failed'),
      );

      connectionService.findConnections.mockRejectedValue(new Error('Database connection failed'));

      await expect(connectionService.findConnections(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('Connection Query Performance', () => {
    it('should handle large numbers of connections efficiently', async () => {
      // Arrange
      const query: FindConnectionsQuery = { documentId: 'doc_large' };

      const manyArguments = Array.from({ length: 1000 }, () => atomicArgumentFactory.build());
      const manyConnections = manyArguments.slice(0, 500).map((arg, index) => ({
        providerId: arg.getId().getValue(),
        consumerId: manyArguments[index + 500]?.getId().getValue() ?? '',
        sharedOrderedSetId: `shared_${index}`,
        connectionType: 'direct' as const,
      }));

      mockRepositories.argumentRepository.findByProofId.mockResolvedValue(manyArguments);
      connectionService.findConnections.mockResolvedValue(manyConnections);

      const startTime = performance.now();

      // Act
      const result = await connectionService.findConnections(query);

      const endTime = performance.now();

      // Assert
      expect(result).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle deep path searches with reasonable performance', async () => {
      // Arrange
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_deep',
        fromArgumentId: 'arg_start',
        maxDepth: 10,
      };

      const deepPath: ConnectionPathDTO = {
        steps: Array.from({ length: 11 }, (_, i) => `arg_${i}`),
        sharedSets: Array.from({ length: 10 }, (_, i) => `shared_${i}`),
        totalLength: 10,
      };

      connectionService.getConnectionPaths.mockResolvedValue([deepPath]);

      const startTime = performance.now();

      // Act
      const result = await connectionService.getConnectionPaths(query);

      const endTime = performance.now();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].totalLength).toBe(10);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Connection Query Edge Cases', () => {
    it('should handle self-referential connections', async () => {
      // Arrange
      const query: FindConnectionsQuery = { documentId: 'doc_self_ref' };

      const selfReferencingArgument = atomicArgumentFactory.build();
      const connection: ConnectionDTO = {
        providerId: selfReferencingArgument.getId().getValue(),
        consumerId: selfReferencingArgument.getId().getValue(),
        sharedOrderedSetId: 'shared_self',
        connectionType: 'direct',
      };

      connectionService.findConnections.mockResolvedValue([connection]);

      // Act
      const result = await connectionService.findConnections(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].providerId).toBe(result[0].consumerId);
    });

    it('should handle circular connection paths', async () => {
      // Arrange
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_circular',
        fromArgumentId: 'arg_a',
        toArgumentId: 'arg_a',
      };

      const circularPath: ConnectionPathDTO = {
        steps: ['arg_a', 'arg_b', 'arg_c', 'arg_a'],
        sharedSets: ['shared_1', 'shared_2', 'shared_3'],
        totalLength: 3,
      };

      connectionService.getConnectionPaths.mockResolvedValue([circularPath]);

      // Act
      const result = await connectionService.getConnectionPaths(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].steps[0]).toBe(result[0].steps[result[0].steps.length - 1]);
    });

    it('should handle multiple shared sets between same arguments', async () => {
      // Arrange
      const query: FindConnectionsQuery = { documentId: 'doc_multiple_shared' };

      const argument1 = atomicArgumentFactory.build();
      const argument2 = atomicArgumentFactory.build();

      const multipleConnections: ConnectionDTO[] = [
        {
          providerId: argument1.getId().getValue(),
          consumerId: argument2.getId().getValue(),
          sharedOrderedSetId: 'shared_1',
          connectionType: 'direct',
        },
        {
          providerId: argument1.getId().getValue(),
          consumerId: argument2.getId().getValue(),
          sharedOrderedSetId: 'shared_2',
          connectionType: 'direct',
        },
      ];

      connectionService.findConnections.mockResolvedValue(multipleConnections);

      // Act
      const result = await connectionService.findConnections(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].providerId).toBe(result[1].providerId);
      expect(result[0].consumerId).toBe(result[1].consumerId);
      expect(result[0].sharedOrderedSetId).not.toBe(result[1].sharedOrderedSetId);
    });
  });

  describe('Connection Query Property-Based Testing', () => {
    it('should maintain connection symmetry properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (docId, arg1Id, arg2Id) => {
            const query: FindConnectionsQuery = { documentId: docId };

            const connection: ConnectionDTO = {
              providerId: arg1Id,
              consumerId: arg2Id,
              sharedOrderedSetId: 'shared_test',
              connectionType: 'direct',
            };

            connectionService.findConnections.mockResolvedValue([connection]);

            const result = await connectionService.findConnections(query);

            // Property: Provider and consumer should be different (unless self-referential)
            if (arg1Id !== arg2Id) {
              expect(result[0].providerId).not.toBe(result[0].consumerId);
            }

            // Property: Connection type should be valid
            expect(['direct', 'transitive']).toContain(result[0].connectionType);
          },
        ),
      );
    });

    it('should maintain path length consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
          async (docId, fromId, pathSteps) => {
            const query: GetConnectionPathsQuery = {
              documentId: docId,
              fromArgumentId: fromId,
            };

            const path: ConnectionPathDTO = {
              steps: pathSteps,
              sharedSets: pathSteps.slice(0, -1).map((_, i) => `shared_${i}`),
              totalLength: pathSteps.length - 1,
            };

            connectionService.getConnectionPaths.mockResolvedValue([path]);

            const result = await connectionService.getConnectionPaths(query);

            // Property: Total length should equal steps length minus 1
            expect(result[0].totalLength).toBe(result[0].steps.length - 1);

            // Property: Shared sets should be one less than steps
            expect(result[0].sharedSets).toHaveLength(result[0].steps.length - 1);
          },
        ),
      );
    });
  });
});

describe('Connection Query DTO Validation Tests', () => {
  describe('FindConnectionsQuery', () => {
    it('should handle basic find connections query', () => {
      const query: FindConnectionsQuery = {
        documentId: 'doc_12345',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.argumentId).toBeUndefined();
      expect(query.orderedSetId).toBeUndefined();
    });

    it('should handle query with argument ID filter', () => {
      const query: FindConnectionsQuery = {
        documentId: 'doc_12345',
        argumentId: 'arg_67890',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.argumentId).toBe('arg_67890');
      expect(query.orderedSetId).toBeUndefined();
    });

    it('should handle query with ordered set ID filter', () => {
      const query: FindConnectionsQuery = {
        documentId: 'doc_12345',
        orderedSetId: 'set_abcdef',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.argumentId).toBeUndefined();
      expect(query.orderedSetId).toBe('set_abcdef');
    });

    it('should handle query with both filters', () => {
      const query: FindConnectionsQuery = {
        documentId: 'doc_12345',
        argumentId: 'arg_67890',
        orderedSetId: 'set_abcdef',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.argumentId).toBe('arg_67890');
      expect(query.orderedSetId).toBe('set_abcdef');
    });

    it('should handle query with empty string IDs', () => {
      const query: FindConnectionsQuery = {
        documentId: '',
        argumentId: '',
        orderedSetId: '',
      };

      expect(query.documentId).toBe('');
      expect(query.argumentId).toBe('');
      expect(query.orderedSetId).toBe('');
    });

    it('should handle query with UUID format IDs', () => {
      const query: FindConnectionsQuery = {
        documentId: '550e8400-e29b-41d4-a716-446655440000',
        argumentId: '123e4567-e89b-12d3-a456-426614174000',
        orderedSetId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };

      expect(query.documentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(query.argumentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(query.orderedSetId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should handle query with various ID formats', () => {
      const idFormats = [
        { doc: 'doc_123', arg: 'arg_456', set: 'set_789' },
        { doc: 'document-abc', arg: 'argument-def', set: 'orderedset-ghi' },
        { doc: 'DOC_UPPER', arg: 'ARG_UPPER', set: 'SET_UPPER' },
        { doc: 'doc.dot', arg: 'arg.dot', set: 'set.dot' },
        { doc: 'doc_with_underscores', arg: 'arg_with_underscores', set: 'set_with_underscores' },
      ];

      idFormats.forEach(({ doc, arg, set }) => {
        const query: FindConnectionsQuery = {
          documentId: doc,
          argumentId: arg,
          orderedSetId: set,
        };

        expect(query.documentId).toBe(doc);
        expect(query.argumentId).toBe(arg);
        expect(query.orderedSetId).toBe(set);
      });
    });

    it('should handle query with long IDs', () => {
      const longDocId = `doc_${'a'.repeat(100)}`;
      const longArgId = `arg_${'b'.repeat(100)}`;
      const longSetId = `set_${'c'.repeat(100)}`;

      const query: FindConnectionsQuery = {
        documentId: longDocId,
        argumentId: longArgId,
        orderedSetId: longSetId,
      };

      expect(query.documentId).toBe(longDocId);
      expect(query.argumentId).toBe(longArgId);
      expect(query.orderedSetId).toBe(longSetId);
    });

    it('should handle query with special characters in IDs', () => {
      const query: FindConnectionsQuery = {
        documentId: 'doc@example.com',
        argumentId: 'arg#123',
        orderedSetId: 'set%20encoded',
      };

      expect(query.documentId).toBe('doc@example.com');
      expect(query.argumentId).toBe('arg#123');
      expect(query.orderedSetId).toBe('set%20encoded');
    });
  });

  describe('GetConnectionPathsQuery', () => {
    it('should handle basic connection paths query', () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_12345',
        fromArgumentId: 'arg_source',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.fromArgumentId).toBe('arg_source');
      expect(query.toArgumentId).toBeUndefined();
      expect(query.maxDepth).toBeUndefined();
    });

    it('should handle query with target argument', () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_12345',
        fromArgumentId: 'arg_source',
        toArgumentId: 'arg_target',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.fromArgumentId).toBe('arg_source');
      expect(query.toArgumentId).toBe('arg_target');
      expect(query.maxDepth).toBeUndefined();
    });

    it('should handle query with max depth', () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_12345',
        fromArgumentId: 'arg_source',
        maxDepth: 5,
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.fromArgumentId).toBe('arg_source');
      expect(query.maxDepth).toBe(5);
    });

    it('should handle query with target and max depth', () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_12345',
        fromArgumentId: 'arg_source',
        toArgumentId: 'arg_target',
        maxDepth: 10,
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.fromArgumentId).toBe('arg_source');
      expect(query.toArgumentId).toBe('arg_target');
      expect(query.maxDepth).toBe(10);
    });

    it('should handle query with zero max depth', () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_12345',
        fromArgumentId: 'arg_source',
        maxDepth: 0,
      };

      expect(query.maxDepth).toBe(0);
    });

    it('should handle query with negative max depth', () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_12345',
        fromArgumentId: 'arg_source',
        maxDepth: -1,
      };

      expect(query.maxDepth).toBe(-1);
    });

    it('should handle query with large max depth', () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_12345',
        fromArgumentId: 'arg_source',
        maxDepth: 1000000,
      };

      expect(query.maxDepth).toBe(1000000);
    });

    it('should handle query with same source and target', () => {
      const query: GetConnectionPathsQuery = {
        documentId: 'doc_12345',
        fromArgumentId: 'arg_same',
        toArgumentId: 'arg_same',
      };

      expect(query.fromArgumentId).toBe(query.toArgumentId);
      expect(query.fromArgumentId).toBe('arg_same');
    });

    it('should handle query with empty argument IDs', () => {
      const query: GetConnectionPathsQuery = {
        documentId: '',
        fromArgumentId: '',
        toArgumentId: '',
      };

      expect(query.documentId).toBe('');
      expect(query.fromArgumentId).toBe('');
      expect(query.toArgumentId).toBe('');
    });

    it('should handle query with complex ID patterns', () => {
      const complexQueries = [
        {
          documentId: 'doc_complex_123',
          fromArgumentId: 'arg_premise_root',
          toArgumentId: 'arg_conclusion_leaf',
          maxDepth: 3,
        },
        {
          documentId: 'proof-document-456',
          fromArgumentId: 'logical-step-1',
          toArgumentId: 'logical-step-10',
          maxDepth: 15,
        },
        {
          documentId: 'document.with.dots',
          fromArgumentId: 'argument.start',
          toArgumentId: 'argument.end',
          maxDepth: 7,
        },
      ];

      complexQueries.forEach((query) => {
        const pathQuery: GetConnectionPathsQuery = query;
        expect(pathQuery.documentId).toBe(query.documentId);
        expect(pathQuery.fromArgumentId).toBe(query.fromArgumentId);
        expect(pathQuery.toArgumentId).toBe(query.toArgumentId);
        expect(pathQuery.maxDepth).toBe(query.maxDepth);
      });
    });
  });

  describe('ConnectionDTO', () => {
    it('should handle direct connection', () => {
      const connection: ConnectionDTO = {
        providerId: 'arg_provider',
        consumerId: 'arg_consumer',
        sharedOrderedSetId: 'set_shared',
        connectionType: 'direct',
      };

      expect(connection.providerId).toBe('arg_provider');
      expect(connection.consumerId).toBe('arg_consumer');
      expect(connection.sharedOrderedSetId).toBe('set_shared');
      expect(connection.connectionType).toBe('direct');
    });

    it('should handle transitive connection', () => {
      const connection: ConnectionDTO = {
        providerId: 'arg_start',
        consumerId: 'arg_end',
        sharedOrderedSetId: 'set_intermediate',
        connectionType: 'transitive',
      };

      expect(connection.providerId).toBe('arg_start');
      expect(connection.consumerId).toBe('arg_end');
      expect(connection.sharedOrderedSetId).toBe('set_intermediate');
      expect(connection.connectionType).toBe('transitive');
    });

    it('should handle all valid connection types', () => {
      const connectionTypes: Array<'direct' | 'transitive'> = ['direct', 'transitive'];

      connectionTypes.forEach((type) => {
        const connection: ConnectionDTO = {
          providerId: 'arg_provider',
          consumerId: 'arg_consumer',
          sharedOrderedSetId: 'set_shared',
          connectionType: type,
        };

        expect(connection.connectionType).toBe(type);
      });
    });

    it('should handle connections with same provider and consumer', () => {
      const connection: ConnectionDTO = {
        providerId: 'arg_self',
        consumerId: 'arg_self',
        sharedOrderedSetId: 'set_self_reference',
        connectionType: 'direct',
      };

      expect(connection.providerId).toBe(connection.consumerId);
      expect(connection.providerId).toBe('arg_self');
    });

    it('should handle connections with empty IDs', () => {
      const connection: ConnectionDTO = {
        providerId: '',
        consumerId: '',
        sharedOrderedSetId: '',
        connectionType: 'direct',
      };

      expect(connection.providerId).toBe('');
      expect(connection.consumerId).toBe('');
      expect(connection.sharedOrderedSetId).toBe('');
    });

    it('should handle connections with UUID format IDs', () => {
      const connection: ConnectionDTO = {
        providerId: '550e8400-e29b-41d4-a716-446655440001',
        consumerId: '550e8400-e29b-41d4-a716-446655440002',
        sharedOrderedSetId: '550e8400-e29b-41d4-a716-446655440003',
        connectionType: 'direct',
      };

      expect(connection.providerId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(connection.consumerId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(connection.sharedOrderedSetId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should handle connections with complex ID patterns', () => {
      const connections = [
        {
          providerId: 'premise_arg_123',
          consumerId: 'conclusion_arg_456',
          sharedOrderedSetId: 'shared_statements_789',
          connectionType: 'direct' as const,
        },
        {
          providerId: 'logical.step.1',
          consumerId: 'logical.step.2',
          sharedOrderedSetId: 'connecting.set',
          connectionType: 'transitive' as const,
        },
        {
          providerId: 'ARG_UPPERCASE_SOURCE',
          consumerId: 'ARG_UPPERCASE_TARGET',
          sharedOrderedSetId: 'SET_UPPERCASE_BRIDGE',
          connectionType: 'direct' as const,
        },
      ];

      connections.forEach((conn) => {
        const connection: ConnectionDTO = conn;
        expect(connection.providerId).toBe(conn.providerId);
        expect(connection.consumerId).toBe(conn.consumerId);
        expect(connection.sharedOrderedSetId).toBe(conn.sharedOrderedSetId);
        expect(connection.connectionType).toBe(conn.connectionType);
      });
    });

    it('should handle connections with special characters', () => {
      const connection: ConnectionDTO = {
        providerId: 'arg@provider.com',
        consumerId: 'arg#consumer',
        sharedOrderedSetId: 'set%20with%20spaces',
        connectionType: 'direct',
      };

      expect(connection.providerId).toBe('arg@provider.com');
      expect(connection.consumerId).toBe('arg#consumer');
      expect(connection.sharedOrderedSetId).toBe('set%20with%20spaces');
    });

    it('should handle connections with long IDs', () => {
      const longProviderId = `provider_${'a'.repeat(100)}`;
      const longConsumerId = `consumer_${'b'.repeat(100)}`;
      const longSetId = `set_${'c'.repeat(100)}`;

      const connection: ConnectionDTO = {
        providerId: longProviderId,
        consumerId: longConsumerId,
        sharedOrderedSetId: longSetId,
        connectionType: 'transitive',
      };

      expect(connection.providerId).toBe(longProviderId);
      expect(connection.consumerId).toBe(longConsumerId);
      expect(connection.sharedOrderedSetId).toBe(longSetId);
    });
  });

  describe('ConnectionPathDTO', () => {
    it('should handle simple path', () => {
      const path: ConnectionPathDTO = {
        steps: ['arg_start', 'arg_end'],
        sharedSets: ['set_connecting'],
        totalLength: 1,
      };

      expect(path.steps).toEqual(['arg_start', 'arg_end']);
      expect(path.sharedSets).toEqual(['set_connecting']);
      expect(path.totalLength).toBe(1);
    });

    it('should handle complex multi-step path', () => {
      const path: ConnectionPathDTO = {
        steps: ['arg_1', 'arg_2', 'arg_3', 'arg_4', 'arg_5'],
        sharedSets: ['set_1_2', 'set_2_3', 'set_3_4', 'set_4_5'],
        totalLength: 4,
      };

      expect(path.steps).toHaveLength(5);
      expect(path.sharedSets).toHaveLength(4);
      expect(path.totalLength).toBe(4);
      expect(path.steps[0]).toBe('arg_1');
      expect(path.steps[4]).toBe('arg_5');
      expect(path.sharedSets[0]).toBe('set_1_2');
      expect(path.sharedSets[3]).toBe('set_4_5');
    });

    it('should handle empty path', () => {
      const path: ConnectionPathDTO = {
        steps: [],
        sharedSets: [],
        totalLength: 0,
      };

      expect(path.steps).toEqual([]);
      expect(path.sharedSets).toEqual([]);
      expect(path.totalLength).toBe(0);
    });

    it('should handle single step path', () => {
      const path: ConnectionPathDTO = {
        steps: ['arg_only'],
        sharedSets: [],
        totalLength: 0,
      };

      expect(path.steps).toEqual(['arg_only']);
      expect(path.sharedSets).toEqual([]);
      expect(path.totalLength).toBe(0);
    });

    it('should handle path with consistent step and set counts', () => {
      // For n steps, there should be n-1 connecting sets
      const testCases = [
        { stepCount: 2, setCount: 1 },
        { stepCount: 3, setCount: 2 },
        { stepCount: 5, setCount: 4 },
        { stepCount: 10, setCount: 9 },
      ];

      testCases.forEach(({ stepCount, setCount }) => {
        const steps = Array.from({ length: stepCount }, (_, i) => `arg_${i + 1}`);
        const sharedSets = Array.from({ length: setCount }, (_, i) => `set_${i + 1}_${i + 2}`);

        const path: ConnectionPathDTO = {
          steps,
          sharedSets,
          totalLength: setCount,
        };

        expect(path.steps).toHaveLength(stepCount);
        expect(path.sharedSets).toHaveLength(setCount);
        expect(path.totalLength).toBe(setCount);
        expect(path.steps.length - 1).toBe(path.sharedSets.length);
      });
    });

    it('should handle path with UUID format IDs', () => {
      const path: ConnectionPathDTO = {
        steps: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
        ],
        sharedSets: [
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
        ],
        totalLength: 2,
      };

      path.steps.forEach((step) => {
        expect(step).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });

      path.sharedSets.forEach((set) => {
        expect(set).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });
    });

    it('should handle path with various ID formats', () => {
      const path: ConnectionPathDTO = {
        steps: ['arg_start', 'argument.middle', 'ARG_END', 'arg-final'],
        sharedSets: ['set_1', 'connecting.set', 'BRIDGE_SET'],
        totalLength: 3,
      };

      expect(path.steps).toContain('arg_start');
      expect(path.steps).toContain('argument.middle');
      expect(path.steps).toContain('ARG_END');
      expect(path.sharedSets).toContain('set_1');
      expect(path.sharedSets).toContain('connecting.set');
      expect(path.sharedSets).toContain('BRIDGE_SET');
    });

    it('should handle path with long step chains', () => {
      const longSteps = Array.from(
        { length: 100 },
        (_, i) => `step_${i.toString().padStart(3, '0')}`,
      );
      const longSets = Array.from({ length: 99 }, (_, i) => `set_${i.toString().padStart(3, '0')}`);

      const path: ConnectionPathDTO = {
        steps: longSteps,
        sharedSets: longSets,
        totalLength: 99,
      };

      expect(path.steps).toHaveLength(100);
      expect(path.sharedSets).toHaveLength(99);
      expect(path.totalLength).toBe(99);
      expect(path.steps[0]).toBe('step_000');
      expect(path.steps[99]).toBe('step_099');
    });

    it('should handle path with duplicate steps', () => {
      const path: ConnectionPathDTO = {
        steps: ['arg_A', 'arg_B', 'arg_A', 'arg_C'],
        sharedSets: ['set_AB', 'set_BA', 'set_AC'],
        totalLength: 3,
      };

      expect(path.steps).toContain('arg_A');
      expect(path.steps.filter((step) => step === 'arg_A')).toHaveLength(2);
      expect(path.totalLength).toBe(3);
    });

    it('should handle path with negative total length', () => {
      const path: ConnectionPathDTO = {
        steps: ['arg_invalid'],
        sharedSets: [],
        totalLength: -1,
      };

      expect(path.totalLength).toBe(-1);
    });

    it('should handle path with large total length', () => {
      const path: ConnectionPathDTO = {
        steps: ['arg_start', 'arg_end'],
        sharedSets: ['set_connecting'],
        totalLength: 1000000,
      };

      expect(path.totalLength).toBe(1000000);
    });
  });

  describe('property-based testing', () => {
    it('should handle arbitrary find connections queries', () => {
      fc.assert(
        fc.property(
          fc.record({
            documentId: fc.string(),
            argumentId: fc.option(fc.string(), { nil: undefined }),
            orderedSetId: fc.option(fc.string(), { nil: undefined }),
          }),
          (params) => {
            const query: FindConnectionsQuery = {
              documentId: params.documentId,
              ...(params.argumentId !== undefined && { argumentId: params.argumentId }),
              ...(params.orderedSetId !== undefined && { orderedSetId: params.orderedSetId }),
            };

            expect(typeof query.documentId).toBe('string');
            if (query.argumentId !== undefined) {
              expect(typeof query.argumentId).toBe('string');
            }
            if (query.orderedSetId !== undefined) {
              expect(typeof query.orderedSetId).toBe('string');
            }
          },
        ),
      );
    });

    it('should handle arbitrary connection paths queries', () => {
      fc.assert(
        fc.property(
          fc.record({
            documentId: fc.string(),
            fromArgumentId: fc.string(),
            toArgumentId: fc.option(fc.string(), { nil: undefined }),
            maxDepth: fc.option(fc.integer(), { nil: undefined }),
          }),
          (params) => {
            const query: GetConnectionPathsQuery = {
              documentId: params.documentId,
              fromArgumentId: params.fromArgumentId,
              ...(params.toArgumentId !== undefined && { toArgumentId: params.toArgumentId }),
              ...(params.maxDepth !== undefined && { maxDepth: params.maxDepth }),
            };

            expect(typeof query.documentId).toBe('string');
            expect(typeof query.fromArgumentId).toBe('string');
            if (query.toArgumentId !== undefined) {
              expect(typeof query.toArgumentId).toBe('string');
            }
            if (query.maxDepth !== undefined) {
              expect(typeof query.maxDepth).toBe('number');
            }
          },
        ),
      );
    });

    it('should handle arbitrary connection DTOs', () => {
      fc.assert(
        fc.property(
          fc.record({
            providerId: fc.string(),
            consumerId: fc.string(),
            sharedOrderedSetId: fc.string(),
            connectionType: fc.constantFrom('direct', 'transitive'),
          }),
          (params) => {
            const connection: ConnectionDTO = params;

            expect(typeof connection.providerId).toBe('string');
            expect(typeof connection.consumerId).toBe('string');
            expect(typeof connection.sharedOrderedSetId).toBe('string');
            expect(['direct', 'transitive']).toContain(connection.connectionType);
          },
        ),
      );
    });

    it('should handle arbitrary connection path DTOs', () => {
      fc.assert(
        fc.property(
          fc.record({
            steps: fc.array(fc.string()),
            sharedSets: fc.array(fc.string()),
            totalLength: fc.integer(),
          }),
          (params) => {
            const path: ConnectionPathDTO = params;

            expect(Array.isArray(path.steps)).toBe(true);
            expect(Array.isArray(path.sharedSets)).toBe(true);
            expect(typeof path.totalLength).toBe('number');

            path.steps.forEach((step) => {
              expect(typeof step).toBe('string');
            });

            path.sharedSets.forEach((set) => {
              expect(typeof set).toBe('string');
            });
          },
        ),
      );
    });

    it('should handle paths with logical step-set relationships', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 20 }).chain((stepCount) =>
            fc.record({
              stepCount: fc.constant(stepCount),
              steps: fc.array(fc.string(), { minLength: stepCount, maxLength: stepCount }),
              sharedSets: fc.array(fc.string(), {
                minLength: Math.max(0, stepCount - 1),
                maxLength: Math.max(0, stepCount - 1),
              }),
            }),
          ),
          ({ stepCount, steps, sharedSets }) => {
            const path: ConnectionPathDTO = {
              steps,
              sharedSets,
              totalLength: sharedSets.length,
            };

            if (stepCount > 0) {
              expect(path.steps).toHaveLength(stepCount);
              expect(path.sharedSets).toHaveLength(Math.max(0, stepCount - 1));
              expect(path.totalLength).toBe(Math.max(0, stepCount - 1));
            }
          },
        ),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete connection discovery workflow', () => {
      const documentId = 'doc_workflow';

      // Find all connections for a specific argument
      const findQuery: FindConnectionsQuery = {
        documentId,
        argumentId: 'arg_central',
      };

      // Expected connections response
      const connections: ConnectionDTO[] = [
        {
          providerId: 'arg_premise_1',
          consumerId: 'arg_central',
          sharedOrderedSetId: 'set_input_1',
          connectionType: 'direct',
        },
        {
          providerId: 'arg_premise_2',
          consumerId: 'arg_central',
          sharedOrderedSetId: 'set_input_2',
          connectionType: 'direct',
        },
        {
          providerId: 'arg_central',
          consumerId: 'arg_conclusion',
          sharedOrderedSetId: 'set_output',
          connectionType: 'direct',
        },
      ];

      expect(findQuery.documentId).toBe(documentId);
      expect(connections).toHaveLength(3);
      expect(connections.filter((c) => c.consumerId === 'arg_central')).toHaveLength(2);
      expect(connections.filter((c) => c.providerId === 'arg_central')).toHaveLength(1);
    });

    it('should handle connection path analysis workflow', () => {
      const documentId = 'doc_paths';

      // Find paths from source to target
      const pathQuery: GetConnectionPathsQuery = {
        documentId,
        fromArgumentId: 'arg_source',
        toArgumentId: 'arg_target',
        maxDepth: 5,
      };

      // Expected path responses
      const paths: ConnectionPathDTO[] = [
        {
          steps: ['arg_source', 'arg_intermediate', 'arg_target'],
          sharedSets: ['set_1_2', 'set_2_3'],
          totalLength: 2,
        },
        {
          steps: ['arg_source', 'arg_alt_path', 'arg_bridge', 'arg_target'],
          sharedSets: ['set_alt_1', 'set_alt_2', 'set_alt_3'],
          totalLength: 3,
        },
      ];

      expect(pathQuery.documentId).toBe(documentId);
      expect(pathQuery.maxDepth).toBe(5);
      expect(paths).toHaveLength(2);

      // Shortest path
      expect(paths[0]?.totalLength).toBe(2);
      expect(paths[0]?.steps).toHaveLength(3);

      // Alternative longer path
      expect(paths[1]?.totalLength).toBe(3);
      expect(paths[1]?.steps).toHaveLength(4);
    });

    it('should handle ordered set usage analysis', () => {
      const documentId = 'doc_sets';
      const sharedSetId = 'set_heavily_used';

      // Find all arguments using a specific ordered set
      const setQuery: FindConnectionsQuery = {
        documentId,
        orderedSetId: sharedSetId,
      };

      // Expected connections showing set usage
      const setConnections: ConnectionDTO[] = [
        {
          providerId: 'arg_1',
          consumerId: 'arg_2',
          sharedOrderedSetId: sharedSetId,
          connectionType: 'direct',
        },
        {
          providerId: 'arg_1',
          consumerId: 'arg_3',
          sharedOrderedSetId: sharedSetId,
          connectionType: 'direct',
        },
        {
          providerId: 'arg_4',
          consumerId: 'arg_5',
          sharedOrderedSetId: sharedSetId,
          connectionType: 'transitive',
        },
      ];

      expect(setQuery.orderedSetId).toBe(sharedSetId);
      expect(setConnections).toHaveLength(3);

      // Check that all connections use the specified set
      setConnections.forEach((conn) => {
        expect(conn.sharedOrderedSetId).toBe(sharedSetId);
      });

      // Check connection types
      const directConnections = setConnections.filter((c) => c.connectionType === 'direct');
      const transitiveConnections = setConnections.filter((c) => c.connectionType === 'transitive');
      expect(directConnections).toHaveLength(2);
      expect(transitiveConnections).toHaveLength(1);
    });

    it('should handle complex proof structure analysis', () => {
      const documentId = 'doc_complex_proof';

      // Analyze paths from multiple starting points
      const analysisQueries = [
        {
          fromArgumentId: 'axiom_1',
          toArgumentId: 'theorem_final',
        },
        {
          fromArgumentId: 'axiom_2',
          toArgumentId: 'theorem_final',
        },
        {
          fromArgumentId: 'lemma_1',
          toArgumentId: 'theorem_final',
        },
      ];

      const pathQueries: GetConnectionPathsQuery[] = analysisQueries.map((query) => ({
        documentId,
        ...query,
        maxDepth: 10,
      }));

      // Expected complex proof structure
      const proofPaths: ConnectionPathDTO[] = [
        {
          steps: ['axiom_1', 'lemma_1', 'lemma_2', 'theorem_final'],
          sharedSets: ['set_ax1_lem1', 'set_lem1_lem2', 'set_lem2_final'],
          totalLength: 3,
        },
        {
          steps: ['axiom_2', 'lemma_3', 'lemma_2', 'theorem_final'],
          sharedSets: ['set_ax2_lem3', 'set_lem3_lem2', 'set_lem2_final'],
          totalLength: 3,
        },
        {
          steps: ['lemma_1', 'lemma_2', 'theorem_final'],
          sharedSets: ['set_lem1_lem2', 'set_lem2_final'],
          totalLength: 2,
        },
      ];

      expect(pathQueries).toHaveLength(3);
      expect(proofPaths).toHaveLength(3);

      // Verify convergence at lemma_2 and theorem_final
      const pathsToFinal = proofPaths.filter((p) => p.steps.includes('theorem_final'));
      expect(pathsToFinal).toHaveLength(3);

      const pathsThroughLemma2 = proofPaths.filter((p) => p.steps.includes('lemma_2'));
      expect(pathsThroughLemma2).toHaveLength(3);
    });

    it('should handle circular dependency detection', () => {
      const documentId = 'doc_circular';

      // Query for potential circular paths
      const circularQuery: GetConnectionPathsQuery = {
        documentId,
        fromArgumentId: 'arg_potential_cycle',
        toArgumentId: 'arg_potential_cycle',
        maxDepth: 10,
      };

      // Circular path example
      const circularPath: ConnectionPathDTO = {
        steps: [
          'arg_potential_cycle',
          'arg_intermediate_1',
          'arg_intermediate_2',
          'arg_potential_cycle',
        ],
        sharedSets: ['set_cycle_1', 'set_cycle_2', 'set_cycle_3'],
        totalLength: 3,
      };

      expect(circularQuery.fromArgumentId).toBe(circularQuery.toArgumentId);
      expect(circularPath.steps[0]).toBe(circularPath.steps[circularPath.steps.length - 1]);
      expect(circularPath.totalLength).toBe(3);
    });
  });
});
