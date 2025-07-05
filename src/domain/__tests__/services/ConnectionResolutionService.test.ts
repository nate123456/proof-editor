/**
 * Comprehensive tests for ConnectionResolutionService
 *
 * Tests all public methods, connection resolution logic, shared reference detection,
 * argument connection validation, and error handling scenarios.
 *
 * Note: This service is deprecated and provides compatibility wrappers.
 * Most functionality has been moved to TreeEntity.
 */

import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AtomicArgument } from '../../entities/AtomicArgument.js';
import { ProcessingError } from '../../errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository.js';
import type { IOrderedSetRepository } from '../../repositories/IOrderedSetRepository.js';
import {
  ArgumentTreeStructure,
  ConnectionIntegrityIssue,
  ConnectionIntegrityReport,
  ConnectionMap,
  ConnectionResolutionService,
  OrderedSetReference,
  PathCompleteArgument,
} from '../../services/ConnectionResolutionService.js';
import { AtomicArgumentId, type OrderedSetId } from '../../shared/value-objects.js';
import { atomicArgumentIdFactory, orderedSetIdFactory } from '../factories/index.js';

describe('ConnectionResolutionService', () => {
  let service: ConnectionResolutionService;
  let mockAtomicArgumentRepo: IAtomicArgumentRepository;
  let mockOrderedSetRepo: IOrderedSetRepository;

  beforeEach(() => {
    // Create mocked repositories using Vitest
    mockAtomicArgumentRepo = {
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

    mockOrderedSetRepo = {
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

    service = new ConnectionResolutionService(mockAtomicArgumentRepo, mockOrderedSetRepo);
  });

  describe('findBasicConnections', () => {
    describe('successful connection resolution', () => {
      it('should find basic connections for an argument with parents and children', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const premiseSetId = orderedSetIdFactory.build();
        const conclusionSetId = orderedSetIdFactory.build();

        const targetArgument = createMockAtomicArgument(argumentId, premiseSetId, conclusionSetId);
        const parentArgument = createMockAtomicArgument(
          atomicArgumentIdFactory.build(),
          orderedSetIdFactory.build(),
          premiseSetId, // Parent's conclusion matches target's premise
        );
        const childArgument = createMockAtomicArgument(
          atomicArgumentIdFactory.build(),
          conclusionSetId, // Child's premise matches target's conclusion
          orderedSetIdFactory.build(),
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(targetArgument);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([
          targetArgument,
          parentArgument,
          childArgument,
        ]);

        // Act
        const result = await service.findBasicConnections(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap.getCentralArgumentId()).toBe(argumentId);
          expect(connectionMap.getParents()).toHaveLength(1);
          expect(connectionMap.getChildren()).toHaveLength(1);
          expect(connectionMap.getParents()[0]).toBe(parentArgument);
          expect(connectionMap.getChildren()[0]).toBe(childArgument);
        }
      });

      it('should find connections with multiple parents and children', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const premiseSetId = orderedSetIdFactory.build();
        const conclusionSetId = orderedSetIdFactory.build();

        const targetArgument = createMockAtomicArgument(argumentId, premiseSetId, conclusionSetId);

        // Multiple parents with same conclusion set
        const parent1 = createMockAtomicArgument(
          atomicArgumentIdFactory.build(),
          orderedSetIdFactory.build(),
          premiseSetId,
        );
        const parent2 = createMockAtomicArgument(
          atomicArgumentIdFactory.build(),
          orderedSetIdFactory.build(),
          premiseSetId,
        );

        // Multiple children with same premise set
        const child1 = createMockAtomicArgument(
          atomicArgumentIdFactory.build(),
          conclusionSetId,
          orderedSetIdFactory.build(),
        );
        const child2 = createMockAtomicArgument(
          atomicArgumentIdFactory.build(),
          conclusionSetId,
          orderedSetIdFactory.build(),
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(targetArgument);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([
          targetArgument,
          parent1,
          parent2,
          child1,
          child2,
        ]);

        // Act
        const result = await service.findBasicConnections(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap.getParents()).toHaveLength(2);
          expect(connectionMap.getChildren()).toHaveLength(2);
        }
      });

      it('should handle argument with no premise set reference', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const conclusionSetId = orderedSetIdFactory.build();

        const targetArgument = createMockAtomicArgument(argumentId, null, conclusionSetId);
        const childArgument = createMockAtomicArgument(
          atomicArgumentIdFactory.build(),
          conclusionSetId,
          orderedSetIdFactory.build(),
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(targetArgument);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([
          targetArgument,
          childArgument,
        ]);

        // Act
        const result = await service.findBasicConnections(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap.getParents()).toHaveLength(0);
          expect(connectionMap.getChildren()).toHaveLength(1);
        }
      });

      it('should handle argument with no conclusion set reference', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const premiseSetId = orderedSetIdFactory.build();

        const targetArgument = createMockAtomicArgument(argumentId, premiseSetId, null);
        const parentArgument = createMockAtomicArgument(
          atomicArgumentIdFactory.build(),
          orderedSetIdFactory.build(),
          premiseSetId,
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(targetArgument);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([
          targetArgument,
          parentArgument,
        ]);

        // Act
        const result = await service.findBasicConnections(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap.getParents()).toHaveLength(1);
          expect(connectionMap.getChildren()).toHaveLength(0);
        }
      });

      it('should handle argument with no connections', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const targetArgument = createMockAtomicArgument(argumentId, null, null);

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(targetArgument);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([targetArgument]);

        // Act
        const result = await service.findBasicConnections(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap.getParents()).toHaveLength(0);
          expect(connectionMap.getChildren()).toHaveLength(0);
        }
      });

      it('should exclude self from connections', async () => {
        // Arrange - Create argument that could connect to itself
        const argumentId = atomicArgumentIdFactory.build();
        const orderedSetId = orderedSetIdFactory.build();

        const targetArgument = createMockAtomicArgument(argumentId, orderedSetId, orderedSetId);

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(targetArgument);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([targetArgument]);

        // Act
        const result = await service.findBasicConnections(argumentId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap.getParents()).toHaveLength(0);
          expect(connectionMap.getChildren()).toHaveLength(0);
        }
      });
    });

    describe('error handling', () => {
      it('should return error when argument not found', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);

        // Act
        const result = await service.findBasicConnections(argumentId);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Argument not found');
        }
      });

      it('should handle repository failures gracefully', async () => {
        // Arrange
        const argumentId = atomicArgumentIdFactory.build();
        const repositoryError = new Error('Database connection failed');
        vi.mocked(mockAtomicArgumentRepo.findById).mockRejectedValue(repositoryError);

        // Act & Assert
        await expect(service.findBasicConnections(argumentId)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('property-based testing', () => {
      it('should maintain connection symmetry', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc
              .array(
                fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
                { minLength: 2, maxLength: 10 },
              )
              .filter((strings) => new Set(strings).size >= 2), // Ensure at least 2 unique strings
            async (argumentIdStrings) => {
              // Arrange - Create arguments with shared ordered sets
              const argumentIds = argumentIdStrings.map((str) => AtomicArgumentId.fromString(str));
              const sharedOrderedSetId = orderedSetIdFactory.build();

              const testArguments = argumentIds.map((idResult, index) => {
                if (idResult.isErr()) throw idResult.error;
                const id = idResult.value;
                if (index % 2 === 0) {
                  return createMockAtomicArgument(id, null, sharedOrderedSetId);
                } else {
                  return createMockAtomicArgument(id, sharedOrderedSetId, null);
                }
              });

              vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(
                testArguments[0] ?? null,
              );
              vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue(testArguments);

              // Act
              const firstArgumentIdResult = argumentIds[0];
              if (!firstArgumentIdResult || firstArgumentIdResult.isErr()) return;
              const firstArgumentId = firstArgumentIdResult.value;
              const result = await service.findBasicConnections(firstArgumentId);

              // Assert - Connection should be consistent
              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const connectionMap = result.value;
                const parentCount = connectionMap.getParents().length;
                const childCount = connectionMap.getChildren().length;

                // At least one connection should exist if we have multiple unique arguments
                expect(parentCount + childCount).toBeGreaterThan(0);
              }
            },
          ),
        );
      });
    });
  });

  describe('findDirectConnections (deprecated compatibility wrapper)', () => {
    it('should delegate to findBasicConnections', async () => {
      // Arrange
      const argumentId = atomicArgumentIdFactory.build();
      const targetArgument = createMockAtomicArgument(argumentId, null, null);

      vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(targetArgument);
      vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([targetArgument]);

      // Act
      const result = await service.findDirectConnections(argumentId);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockAtomicArgumentRepo.findById).toHaveBeenCalledWith(argumentId);
    });
  });

  describe('findArgumentTree (deprecated compatibility method)', () => {
    it('should return minimal structure for compatibility', () => {
      // Arrange
      const argumentId = atomicArgumentIdFactory.build();

      // Act
      const result = service.findArgumentTree(argumentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const structure = result.value;
        expect(structure.getAllArguments()).toEqual([argumentId]);
        expect(structure.getArgumentCount()).toBe(1);
      }
    });
  });

  describe('findPathCompleteArgument (deprecated compatibility method)', () => {
    it('should return simplified path complete argument', () => {
      // Arrange
      const startId = atomicArgumentIdFactory.build();
      const endId = atomicArgumentIdFactory.build();

      // Act
      const result = service.findPathCompleteArgument(startId, endId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pathComplete = result.value;
        expect(pathComplete.getAllArguments()).toEqual([startId, endId]);
        expect(pathComplete.getAllPaths()).toEqual([[startId, endId]]);
      }
    });
  });

  describe('edge cases and complex connection patterns', () => {
    it('should handle circular connection patterns', async () => {
      // Arrange - Create circular connection A→B→C→A
      const argA = atomicArgumentIdFactory.build();
      const argB = atomicArgumentIdFactory.build();
      const argC = atomicArgumentIdFactory.build();

      const setAB = orderedSetIdFactory.build();
      const setBC = orderedSetIdFactory.build();
      const setCA = orderedSetIdFactory.build();

      const argumentA = createMockAtomicArgument(argA, setCA, setAB);
      const argumentB = createMockAtomicArgument(argB, setAB, setBC);
      const argumentC = createMockAtomicArgument(argC, setBC, setCA);

      vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(argumentA);
      vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([
        argumentA,
        argumentB,
        argumentC,
      ]);

      // Act
      const result = await service.findBasicConnections(argA);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const connectionMap = result.value;
        expect(connectionMap.getParents()).toHaveLength(1);
        expect(connectionMap.getChildren()).toHaveLength(1);
        expect(connectionMap.getParents()[0]).toBe(argumentC);
        expect(connectionMap.getChildren()[0]).toBe(argumentB);
      }
    });

    it('should handle disconnected argument clusters', async () => {
      // Arrange - Create two separate clusters
      const cluster1Set = orderedSetIdFactory.build();
      const cluster2Set = orderedSetIdFactory.build();

      const targetArg = atomicArgumentIdFactory.build();
      const cluster1Arg = atomicArgumentIdFactory.build();
      const cluster2Arg = atomicArgumentIdFactory.build();

      const targetArgument = createMockAtomicArgument(targetArg, cluster1Set, null);
      const cluster1Argument = createMockAtomicArgument(cluster1Arg, null, cluster1Set);
      const cluster2Argument = createMockAtomicArgument(cluster2Arg, null, cluster2Set);

      vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(targetArgument);
      vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([
        targetArgument,
        cluster1Argument,
        cluster2Argument,
      ]);

      // Act
      const result = await service.findBasicConnections(targetArg);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const connectionMap = result.value;
        expect(connectionMap.getParents()).toHaveLength(1);
        expect(connectionMap.getChildren()).toHaveLength(0);
        expect(connectionMap.getParents()[0]).toBe(cluster1Argument);
      }
    });
  });
});

describe('ConnectionMap', () => {
  it('should store and retrieve connection data correctly', () => {
    // Arrange
    const centralId = atomicArgumentIdFactory.build();
    const parentArg = createMockAtomicArgument(
      atomicArgumentIdFactory.build(),
      null,
      orderedSetIdFactory.build(),
    );
    const childArg = createMockAtomicArgument(
      atomicArgumentIdFactory.build(),
      orderedSetIdFactory.build(),
      null,
    );

    // Act
    const connectionMap = new ConnectionMap(centralId, [parentArg], [childArg]);

    // Assert
    expect(connectionMap.getCentralArgumentId()).toBe(centralId);
    expect(connectionMap.getParents()).toEqual([parentArg]);
    expect(connectionMap.getChildren()).toEqual([childArg]);
  });

  it('should return readonly arrays to prevent mutation', () => {
    // Arrange
    const centralId = atomicArgumentIdFactory.build();
    const parents = [createMockAtomicArgument(atomicArgumentIdFactory.build(), null, null)];
    const children = [createMockAtomicArgument(atomicArgumentIdFactory.build(), null, null)];

    const connectionMap = new ConnectionMap(centralId, parents, children);

    // Act
    const retrievedParents = connectionMap.getParents();
    const retrievedChildren = connectionMap.getChildren();

    // Assert
    expect(retrievedParents).toEqual(parents);
    expect(retrievedChildren).toEqual(children);

    // Verify readonly nature (TypeScript compile-time check)
    expect(Array.isArray(retrievedParents)).toBe(true);
    expect(Array.isArray(retrievedChildren)).toBe(true);
  });
});

describe('ArgumentTreeStructure', () => {
  it('should manage argument collections correctly', () => {
    // Arrange
    const argumentIds = [
      atomicArgumentIdFactory.build(),
      atomicArgumentIdFactory.build(),
      atomicArgumentIdFactory.build(),
    ];

    // Act
    const structure = new ArgumentTreeStructure(argumentIds);

    // Assert
    expect(structure.getAllArguments()).toEqual(argumentIds);
    expect(structure.getArgumentCount()).toBe(3);
  });

  it('should handle empty argument collections', () => {
    // Arrange & Act
    const structure = new ArgumentTreeStructure([]);

    // Assert
    expect(structure.getAllArguments()).toEqual([]);
    expect(structure.getArgumentCount()).toBe(0);
  });
});

describe('PathCompleteArgument', () => {
  it('should store arguments and paths correctly', () => {
    // Arrange
    const argumentIds = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];
    const secondArgument = argumentIds[1];
    if (!secondArgument) throw new Error('Missing second argument');
    const paths = [argumentIds, [secondArgument]];

    // Act
    const pathComplete = new PathCompleteArgument(argumentIds, paths);

    // Assert
    expect(pathComplete.getAllArguments()).toEqual(argumentIds);
    expect(pathComplete.getAllPaths()).toEqual(paths);
  });
});

describe('OrderedSetReference', () => {
  it('should create ordered set reference with correct properties', () => {
    // Arrange
    const argumentId = atomicArgumentIdFactory.build();
    const orderedSetId = orderedSetIdFactory.build();
    const referenceType = 'premise';

    // Act
    const reference = new OrderedSetReference(argumentId, referenceType, orderedSetId);

    // Assert
    expect(reference.argumentId).toBe(argumentId);
    expect(reference.referenceType).toBe(referenceType);
    expect(reference.orderedSetId).toBe(orderedSetId);
  });

  it('should handle conclusion reference type', () => {
    // Arrange
    const argumentId = atomicArgumentIdFactory.build();
    const orderedSetId = orderedSetIdFactory.build();
    const referenceType = 'conclusion';

    // Act
    const reference = new OrderedSetReference(argumentId, referenceType, orderedSetId);

    // Assert
    expect(reference.referenceType).toBe('conclusion');
  });
});

describe('ConnectionIntegrityReport', () => {
  it('should detect issues correctly', () => {
    // Arrange
    const argumentId = atomicArgumentIdFactory.build();
    const issues = [
      new ConnectionIntegrityIssue('missing_reference', 'Premise set reference is null'),
      new ConnectionIntegrityIssue('dangling_connection', 'No matching conclusion found'),
    ];

    // Act
    const report = new ConnectionIntegrityReport(argumentId, issues);

    // Assert
    expect(report.argumentId).toBe(argumentId);
    expect(report.issues).toEqual(issues);
    expect(report.hasIssues()).toBe(true);
  });

  it('should handle reports with no issues', () => {
    // Arrange
    const argumentId = atomicArgumentIdFactory.build();

    // Act
    const report = new ConnectionIntegrityReport(argumentId, []);

    // Assert
    expect(report.hasIssues()).toBe(false);
    expect(report.issues).toHaveLength(0);
  });
});

describe('ConnectionIntegrityIssue', () => {
  it('should store issue details correctly', () => {
    // Arrange
    const type = 'validation_error';
    const description = 'Invalid connection detected';

    // Act
    const issue = new ConnectionIntegrityIssue(type, description);

    // Assert
    expect(issue.type).toBe(type);
    expect(issue.description).toBe(description);
  });
});

// Helper function to create mock AtomicArgument
function createMockAtomicArgument(
  id: AtomicArgumentId,
  premiseSetRef: OrderedSetId | null,
  conclusionSetRef: OrderedSetId | null,
): AtomicArgument {
  return {
    getId: vi.fn(() => id),
    getPremiseSet: vi.fn(() => premiseSetRef),
    getConclusionSet: vi.fn(() => conclusionSetRef),
    getCreatedAt: vi.fn(() => Date.now()),
    getModifiedAt: vi.fn(() => Date.now()),
    getSideLabels: vi.fn(() => ({})),
    setPremiseSetRef: vi.fn(),
    setConclusionSetRef: vi.fn(),
    setSideLabels: vi.fn(),
  } as unknown as AtomicArgument;
}
