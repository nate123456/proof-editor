import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AtomicArgument } from '../../entities/AtomicArgument.js';
import { ProcessingError } from '../../errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository.js';
import {
  ArgumentTreeStructure,
  type ConnectionMap,
  type ConnectionResolutionService,
  PathCompleteArgument,
} from '../../services/ConnectionResolutionService.js';
import {
  ArgumentDependencyAnalysis,
  BrokenLink,
  ChainIntegrityIssue,
  ChainIntegrityValidationResult,
  PathCompleteArgumentSet,
  PathCompletenessService,
  PathCompletenessValidationResult,
} from '../../services/PathCompletenessService.js';
import { atomicArgumentIdFactory } from '../factories/index.js';

describe('PathCompletenessService', () => {
  let service: PathCompletenessService;
  let mockAtomicArgumentRepo: IAtomicArgumentRepository;
  let mockConnectionService: ConnectionResolutionService;

  beforeEach(() => {
    // Create Vitest mocks
    mockAtomicArgumentRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    } as IAtomicArgumentRepository;

    mockConnectionService = {
      findDirectConnections: vi.fn(),
      findPathCompleteArgument: vi.fn(),
      findArgumentTree: vi.fn(),
    } as ConnectionResolutionService;

    // Set default mock implementations to avoid undefined errors
    vi.mocked(mockConnectionService.findPathCompleteArgument).mockReturnValue(
      err(new ProcessingError('No path found'))
    );

    service = new PathCompletenessService(mockAtomicArgumentRepo, mockConnectionService);
  });

  describe('validatePathCompleteness', () => {
    describe('successful validation cases', () => {
      it('should return complete result for empty argument set', async () => {
        const result = await service.validatePathCompleteness([]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isComplete).toBe(true);
          expect(validation.argumentSet).toEqual([]);
          expect(validation.missingArguments).toEqual([]);
        }
      });

      it('should validate path completeness for connected arguments', async () => {
        const argumentIds = [
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
        ];

        // Mock repository calls
        const mockArguments = argumentIds.map(
          id =>
            ({
              getId: () => id,
              isComplete: () => true,
            }) as AtomicArgument
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          const index = argumentIds.findIndex(argId => argId.equals(id));
          return Promise.resolve(index >= 0 ? mockArguments[index] : null);
        });

        // Mock connection service
        const mockConnectionMap = {
          getParents: () => [],
          getChildren: () => [],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        const result = await service.validatePathCompleteness(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.argumentSet).toEqual(argumentIds);
          expect(validation.missingArguments).toEqual([]);
        }
      });

      it('should detect missing intermediate arguments', async () => {
        const argumentIds = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];
        const missingId = atomicArgumentIdFactory.build();

        // Mock repository calls
        const mockArguments = argumentIds.map(
          id =>
            ({
              getId: () => id,
              isComplete: () => true,
            }) as AtomicArgument
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          const index = argumentIds.findIndex(argId => argId.equals(id));
          return Promise.resolve(index >= 0 ? mockArguments[index] : null);
        });

        // Mock connection service to return no direct connections
        const mockConnectionMap = {
          getParents: () => [],
          getChildren: () => [],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        // Mock path complete argument to return missing intermediate
        const mockPathComplete = new PathCompleteArgument([missingId], [[missingId]]);
        vi.mocked(mockConnectionService.findPathCompleteArgument).mockReturnValue(
          ok(mockPathComplete)
        );

        const result = await service.validatePathCompleteness(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isComplete).toBe(false);
          expect(validation.missingArguments).toContain(missingId);
        }
      });
    });
  });

  describe('ensurePathCompleteness', () => {
    describe('successful cases', () => {
      it('should return path complete argument set for connected arguments', async () => {
        const startId = atomicArgumentIdFactory.build();
        const endId = atomicArgumentIdFactory.build();
        const intermediateId = atomicArgumentIdFactory.build();

        const mockPathComplete = new PathCompleteArgument(
          [startId, intermediateId, endId],
          [[startId, intermediateId, endId]]
        );

        vi.mocked(mockConnectionService.findPathCompleteArgument).mockReturnValue(
          ok(mockPathComplete)
        );

        // Mock repository calls for validation
        const mockArguments = [startId, intermediateId, endId].map(
          id =>
            ({
              getId: () => id,
              isComplete: () => true,
            }) as AtomicArgument
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          const index = [startId, intermediateId, endId].findIndex(argId => argId.equals(id));
          return Promise.resolve(index >= 0 ? mockArguments[index] : null);
        });

        const result = await service.ensurePathCompleteness(startId, endId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pathSet = result.value;
          expect(pathSet.startArgument).toEqual(startId);
          expect(pathSet.endArgument).toEqual(endId);
          expect(pathSet.allRequiredArguments).toEqual([startId, intermediateId, endId]);
        }
      });
    });

    describe('error cases', () => {
      it('should fail when no path exists between arguments', async () => {
        const startId = atomicArgumentIdFactory.build();
        const endId = atomicArgumentIdFactory.build();

        const connectionError = new ProcessingError('No connection found');
        vi.mocked(mockConnectionService.findPathCompleteArgument).mockReturnValue(
          err(connectionError)
        );

        const result = await service.ensurePathCompleteness(startId, endId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('No path exists between arguments');
        }
      });

      it('should fail when intermediate argument is not found', async () => {
        const startId = atomicArgumentIdFactory.build();
        const endId = atomicArgumentIdFactory.build();
        const missingId = atomicArgumentIdFactory.build();

        const mockPathComplete = new PathCompleteArgument(
          [startId, missingId, endId],
          [[startId, missingId, endId]]
        );

        vi.mocked(mockConnectionService.findPathCompleteArgument).mockReturnValue(
          ok(mockPathComplete)
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          // Return null for the missing argument
          if (id.equals(missingId)) return Promise.resolve(null);
          return Promise.resolve({
            getId: () => id,
            isComplete: () => true,
          } as AtomicArgument);
        });

        const result = await service.ensurePathCompleteness(startId, endId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('not found');
        }
      });

      it('should fail when intermediate argument is incomplete', async () => {
        const startId = atomicArgumentIdFactory.build();
        const endId = atomicArgumentIdFactory.build();
        const incompleteId = atomicArgumentIdFactory.build();

        const mockPathComplete = new PathCompleteArgument(
          [startId, incompleteId, endId],
          [[startId, incompleteId, endId]]
        );

        vi.mocked(mockConnectionService.findPathCompleteArgument).mockReturnValue(
          ok(mockPathComplete)
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          if (id.equals(incompleteId)) {
            return Promise.resolve({
              getId: () => incompleteId,
              isComplete: () => false, // Incomplete argument
            } as AtomicArgument);
          }
          return Promise.resolve({
            getId: () => id,
            isComplete: () => true,
          } as AtomicArgument);
        });

        const result = await service.ensurePathCompleteness(startId, endId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('is incomplete');
        }
      });
    });
  });

  describe('findRequiredIntermediateArguments', () => {
    it('should find required intermediate arguments for partial set', async () => {
      const partialSet = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];
      const requiredId = atomicArgumentIdFactory.build();

      // Mock arguments with connections to create gaps
      const mockParentArg = {
        getId: () => partialSet[1],
      } as AtomicArgument;

      const mockConnectionMap = {
        getParents: () => [mockParentArg], // Create a connection to form gaps
        getChildren: () => [],
      } as ConnectionMap;

      vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
        ok(mockConnectionMap)
      );

      // Mock path complete argument to return required intermediate
      const mockPathComplete = new PathCompleteArgument([requiredId], [[requiredId]]);
      vi.mocked(mockConnectionService.findPathCompleteArgument).mockReturnValue(
        ok(mockPathComplete)
      );

      const result = await service.findRequiredIntermediateArguments(partialSet);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const intermediates = result.value;
        expect(intermediates.originalSet).toEqual(partialSet);
        expect(intermediates.requiredArguments).toContain(requiredId);
      }
    });

    it('should handle empty partial set', async () => {
      const result = await service.findRequiredIntermediateArguments([]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const intermediates = result.value;
        expect(intermediates.originalSet).toEqual([]);
        expect(intermediates.requiredArguments).toEqual([]);
        expect(intermediates.gaps).toEqual([]);
      }
    });
  });

  describe('validateArgumentChainIntegrity', () => {
    describe('successful validation cases', () => {
      it('should validate intact argument chain', async () => {
        const argumentIds = [
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
        ];

        // Mock arguments that can connect to each other
        const mockArguments = argumentIds.map(
          id =>
            ({
              getId: () => id,
              isComplete: () => true,
              canConnectTo: () => true,
            }) as AtomicArgument
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          const index = argumentIds.findIndex(argId => argId.equals(id));
          return Promise.resolve(index >= 0 ? mockArguments[index] : null);
        });

        const result = await service.validateArgumentChainIntegrity(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isIntact).toBe(true);
          expect(validation.integrityIssues).toEqual([]);
          expect(validation.brokenLinks).toEqual([]);
        }
      });

      it('should handle single argument chain', async () => {
        const singleId = atomicArgumentIdFactory.build();

        const result = await service.validateArgumentChainIntegrity([singleId]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isIntact).toBe(true);
          expect(validation.integrityIssues).toEqual([]);
          expect(validation.brokenLinks).toEqual([]);
        }
      });

      it('should handle empty argument chain', async () => {
        const result = await service.validateArgumentChainIntegrity([]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isIntact).toBe(true);
          expect(validation.integrityIssues).toEqual([]);
          expect(validation.brokenLinks).toEqual([]);
        }
      });
    });

    describe('error and broken link cases', () => {
      it('should detect broken links in argument chain', async () => {
        const argumentIds = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];

        // Mock arguments that cannot connect to each other
        const mockArguments = argumentIds.map(
          id =>
            ({
              getId: () => id,
              isComplete: () => true,
              canConnectTo: () => false, // Cannot connect
            }) as AtomicArgument
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          const index = argumentIds.findIndex(argId => argId.equals(id));
          return Promise.resolve(index >= 0 ? mockArguments[index] : null);
        });

        const result = await service.validateArgumentChainIntegrity(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isIntact).toBe(false);
          expect(validation.integrityIssues).toHaveLength(1);
          expect(validation.brokenLinks).toHaveLength(1);
          expect(validation.integrityIssues[0].type).toBe('broken_link');
          expect(validation.brokenLinks[0].reason).toBe('No shared ordered set reference');
        }
      });

      it('should detect missing argument as broken link', async () => {
        const argumentIds = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];

        // Mock repository to return null for second argument
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          if (id.equals(argumentIds[0])) {
            return Promise.resolve({
              getId: () => argumentIds[0],
              isComplete: () => true,
              canConnectTo: () => true,
            } as AtomicArgument);
          }
          return Promise.resolve(null);
        });

        const result = await service.validateArgumentChainIntegrity(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isIntact).toBe(false);
          expect(validation.integrityIssues).toHaveLength(1);
          expect(validation.brokenLinks).toHaveLength(1);
          expect(validation.brokenLinks[0].reason).toBe('One or both arguments not found');
        }
      });

      it('should fail when argument chain contains undefined values', async () => {
        const argumentIds = [
          atomicArgumentIdFactory.build(),
          undefined as any, // Invalid argument
        ];

        const result = await service.validateArgumentChainIntegrity(argumentIds);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Invalid argument chain');
        }
      });
    });
  });

  describe('computeMinimalPathCompleteSet', () => {
    describe('successful computation cases', () => {
      it('should return empty set for empty input', async () => {
        const result = await service.computeMinimalPathCompleteSet([]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const minimalSet = result.value;
          expect(minimalSet.minimalArguments).toEqual([]);
          expect(minimalSet.redundantArguments).toEqual([]);
        }
      });

      it('should compute minimal set for connected arguments', async () => {
        const argumentIds = [
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
        ];

        // Mock connection service to return connection graph
        const mockConnectionMap = {
          getParents: () => [],
          getChildren: () => [],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        const result = await service.computeMinimalPathCompleteSet(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const minimalSet = result.value;
          expect(minimalSet.minimalArguments).toBeDefined();
          expect(minimalSet.redundantArguments).toBeDefined();
          expect(
            minimalSet.minimalArguments.length + minimalSet.redundantArguments.length
          ).toBeLessThanOrEqual(argumentIds.length);
        }
      });

      it('should identify redundant arguments in over-specified set', async () => {
        const argumentIds = [
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
        ];

        // Mock connected arguments where some are redundant
        const mockConnectedArgs = argumentIds.slice(0, 2).map(
          id =>
            ({
              getId: () => id,
            }) as AtomicArgument
        );

        const mockConnectionMap = {
          getParents: () => [],
          getChildren: () => mockConnectedArgs,
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        const result = await service.computeMinimalPathCompleteSet(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const minimalSet = result.value;
          expect(minimalSet.minimalArguments.length).toBeLessThan(argumentIds.length);
          expect(minimalSet.redundantArguments.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('analyzeArgumentDependencies', () => {
    describe('successful analysis cases', () => {
      it('should analyze argument dependencies', async () => {
        const targetId = atomicArgumentIdFactory.build();
        const parentId = atomicArgumentIdFactory.build();
        const transitiveId = atomicArgumentIdFactory.build();

        // Mock direct dependencies
        const parentArg = {
          getId: () => parentId,
        } as AtomicArgument;

        const mockConnectionMap = {
          getParents: () => [parentArg],
          getChildren: () => [],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        // Mock transitive dependencies
        const mockTreeStructure = new ArgumentTreeStructure([targetId, parentId, transitiveId]);
        vi.mocked(mockConnectionService.findArgumentTree).mockReturnValue(ok(mockTreeStructure));

        const result = await service.analyzeArgumentDependencies(targetId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const analysis = result.value;
          expect(analysis.targetArgument).toEqual(targetId);
          expect(analysis.directDependencies).toContain(parentId);
          expect(analysis.transitiveDependencies).toContain(parentId);
          expect(analysis.transitiveDependencies).toContain(transitiveId);
          expect(analysis.dependencyLevels).toBeInstanceOf(Map);
        }
      });

      it('should handle argument with no dependencies', async () => {
        const isolatedId = atomicArgumentIdFactory.build();

        // Mock no dependencies
        const mockConnectionMap = {
          getParents: () => [],
          getChildren: () => [],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        const mockTreeStructure = new ArgumentTreeStructure([isolatedId]);
        vi.mocked(mockConnectionService.findArgumentTree).mockReturnValue(ok(mockTreeStructure));

        const result = await service.analyzeArgumentDependencies(isolatedId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const analysis = result.value;
          expect(analysis.targetArgument).toEqual(isolatedId);
          expect(analysis.directDependencies).toEqual([]);
          expect(analysis.transitiveDependencies).toEqual([]);
          expect(analysis.dependencyLevels.size).toBe(1);
        }
      });
    });

    describe('error cases', () => {
      it('should handle connection service failures gracefully', async () => {
        const targetId = atomicArgumentIdFactory.build();

        // Mock connection service failure
        const connectionError = new ProcessingError('Connection lookup failed');
        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          err(connectionError)
        );
        vi.mocked(mockConnectionService.findArgumentTree).mockReturnValue(err(connectionError));

        const result = await service.analyzeArgumentDependencies(targetId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const analysis = result.value;
          expect(analysis.targetArgument).toEqual(targetId);
          expect(analysis.directDependencies).toEqual([]);
          expect(analysis.transitiveDependencies).toEqual([]);
        }
      });
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    describe('circular dependency detection', () => {
      it('should handle circular dependencies in path analysis', async () => {
        const argA = atomicArgumentIdFactory.build();
        const argB = atomicArgumentIdFactory.build();

        // Create mock arguments that reference each other
        const mockArgA = {
          getId: () => argA,
          isComplete: () => true,
          canConnectTo: () => true,
        } as AtomicArgument;

        const mockArgB = {
          getId: () => argB,
          isComplete: () => true,
          canConnectTo: () => true,
        } as AtomicArgument;

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          if (id.equals(argA)) return Promise.resolve(mockArgA);
          if (id.equals(argB)) return Promise.resolve(mockArgB);
          return Promise.resolve(null);
        });

        // Mock circular connection
        const mockConnectionMap = {
          getParents: () => [mockArgB],
          getChildren: () => [mockArgA],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        const result = await service.validatePathCompleteness([argA, argB]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.argumentSet).toEqual([argA, argB]);
          // Should handle circular reference without infinite loop
        }
      });
    });

    describe('complex argument structures', () => {
      it('should handle diamond-shaped argument dependencies', async () => {
        const topId = atomicArgumentIdFactory.build();
        const leftId = atomicArgumentIdFactory.build();
        const rightId = atomicArgumentIdFactory.build();
        const bottomId = atomicArgumentIdFactory.build();

        const argumentIds = [topId, leftId, rightId, bottomId];

        // Mock arguments for diamond pattern
        const mockArguments = argumentIds.map(
          id =>
            ({
              getId: () => id,
              isComplete: () => true,
            }) as AtomicArgument
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          const index = argumentIds.findIndex(argId => argId.equals(id));
          return Promise.resolve(index >= 0 ? mockArguments[index] : null);
        });

        // Mock diamond connections
        const mockConnectionMap = {
          getParents: () => [],
          getChildren: () => [],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        const result = await service.validatePathCompleteness(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.argumentSet).toEqual(argumentIds);
          // Should handle diamond pattern correctly
        }
      });

      it('should handle very large argument sets efficiently', async () => {
        const largeArgumentSet = Array.from({ length: 100 }, () => atomicArgumentIdFactory.build());

        // Mock repository to return simple arguments
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id =>
          Promise.resolve({
            getId: () => id,
            isComplete: () => true,
          } as AtomicArgument)
        );

        // Mock connection service
        const mockConnectionMap = {
          getParents: () => [],
          getChildren: () => [],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        const startTime = Date.now();
        const result = await service.validatePathCompleteness(largeArgumentSet);
        const endTime = Date.now();

        expect(result.isOk()).toBe(true);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete in reasonable time
      });
    });

    describe('data structure integrity', () => {
      it('should preserve argument order in validation results', async () => {
        const orderedIds = [
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
        ];

        // Mock arguments
        const mockArguments = orderedIds.map(
          id =>
            ({
              getId: () => id,
              isComplete: () => true,
            }) as AtomicArgument
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(id => {
          const index = orderedIds.findIndex(argId => argId.equals(id));
          return Promise.resolve(index >= 0 ? mockArguments[index] : null);
        });

        const mockConnectionMap = {
          getParents: () => [],
          getChildren: () => [],
        } as ConnectionMap;

        vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
          ok(mockConnectionMap)
        );

        const result = await service.validatePathCompleteness(orderedIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.argumentSet).toEqual(orderedIds);
          // Order should be preserved
          for (let i = 0; i < orderedIds.length; i++) {
            expect(validation.argumentSet[i]).toEqual(orderedIds[i]);
          }
        }
      });
    });
  });

  describe('Result Classes', () => {
    describe('PathCompletenessValidationResult', () => {
      it('should create validation result with correct properties', () => {
        const argumentSet = [atomicArgumentIdFactory.build()];
        const missingArguments = [atomicArgumentIdFactory.build()];
        const result = new PathCompletenessValidationResult(false, argumentSet, missingArguments);

        expect(result.isComplete).toBe(false);
        expect(result.argumentSet).toEqual(argumentSet);
        expect(result.missingArguments).toEqual(missingArguments);
      });
    });

    describe('PathCompleteArgumentSet', () => {
      it('should create argument set with correct properties', () => {
        const startId = atomicArgumentIdFactory.build();
        const endId = atomicArgumentIdFactory.build();
        const allRequired = [startId, endId];
        const paths = [[startId, endId]];
        const result = new PathCompleteArgumentSet(startId, endId, allRequired, paths);

        expect(result.startArgument).toEqual(startId);
        expect(result.endArgument).toEqual(endId);
        expect(result.allRequiredArguments).toEqual(allRequired);
        expect(result.allPaths).toEqual(paths);
      });
    });

    describe('ChainIntegrityValidationResult', () => {
      it('should create integrity result with issues and broken links', () => {
        const issue = new ChainIntegrityIssue('broken_link', 'Connection failed', 1);
        const brokenLink = new BrokenLink(
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          'No shared reference'
        );
        const result = new ChainIntegrityValidationResult(false, [issue], [brokenLink]);

        expect(result.isIntact).toBe(false);
        expect(result.integrityIssues).toEqual([issue]);
        expect(result.brokenLinks).toEqual([brokenLink]);
      });
    });

    describe('ArgumentDependencyAnalysis', () => {
      it('should create dependency analysis with correct structure', () => {
        const targetId = atomicArgumentIdFactory.build();
        const directDeps = [atomicArgumentIdFactory.build()];
        const transitiveDeps = [atomicArgumentIdFactory.build()];
        const levels = new Map([[targetId, 0]]);
        const analysis = new ArgumentDependencyAnalysis(
          targetId,
          directDeps,
          transitiveDeps,
          levels
        );

        expect(analysis.targetArgument).toEqual(targetId);
        expect(analysis.directDependencies).toEqual(directDeps);
        expect(analysis.transitiveDependencies).toEqual(transitiveDeps);
        expect(analysis.dependencyLevels).toEqual(levels);
      });
    });
  });
});
