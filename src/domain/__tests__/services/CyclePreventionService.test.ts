import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AtomicArgument } from '../../entities/AtomicArgument.js';
import type { Tree } from '../../entities/Tree.js';
import { StructureError } from '../../errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository.js';
import type { ITreeRepository } from '../../repositories/ITreeRepository.js';
import type { ConnectionResolutionService } from '../../services/ConnectionResolutionService.js';
import {
  ArgumentCycle,
  ArgumentTreeCycleReport,
  CircularReasoningValidationResult,
  ConnectionSafetyResult,
  CyclePreventionService,
  CycleValidationResult,
  TreeCycleValidationResult,
} from '../../services/CyclePreventionService.js';
import { atomicArgumentIdFactory, nodeIdFactory, treeIdFactory } from '../factories/index.js';

describe('CyclePreventionService', () => {
  let service: CyclePreventionService;
  let mockAtomicArgumentRepo: IAtomicArgumentRepository;
  let mockTreeRepo: ITreeRepository;
  let mockConnectionService: ConnectionResolutionService;

  beforeEach(() => {
    // Create mocks with Vitest
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
    } as IAtomicArgumentRepository;

    mockTreeRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByDocument: vi.fn(),
      delete: vi.fn(),
    } as ITreeRepository;

    mockConnectionService = {
      atomicArgumentRepo: mockAtomicArgumentRepo,
      orderedSetRepo: {} as any,
      findBasicConnections: vi.fn(),
      findDirectConnections: vi.fn(),
      findPathCompleteArgument: vi.fn(),
      findArgumentTree: vi.fn(),
    } as unknown as ConnectionResolutionService;

    // Set default implementations
    vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);
    vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.save).mockResolvedValue(ok(undefined));
    vi.mocked(mockAtomicArgumentRepo.delete).mockResolvedValue(ok(undefined));
    vi.mocked(mockAtomicArgumentRepo.findByOrderedSetReference).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findArgumentsByPremiseCount).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findArgumentsUsingStatement).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findArgumentsByComplexity).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findArgumentsWithConclusion).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findArgumentChains).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findCircularDependencies).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findArgumentsByValidationStatus).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findMostReferencedArguments).mockResolvedValue([]);
    vi.mocked(mockAtomicArgumentRepo.findOrphanedArguments).mockResolvedValue([]);

    vi.mocked(mockTreeRepo.findById).mockResolvedValue(null);
    vi.mocked(mockTreeRepo.findByDocument).mockResolvedValue([]);
    vi.mocked(mockTreeRepo.save).mockResolvedValue(ok(undefined));
    vi.mocked(mockTreeRepo.delete).mockResolvedValue(ok(undefined));

    vi.mocked(mockConnectionService.findDirectConnections).mockResolvedValue(
      err(new StructureError('Not found')),
    );
    vi.mocked(mockConnectionService.findPathCompleteArgument).mockReturnValue(
      err(new StructureError('Not found')),
    );
    vi.mocked(mockConnectionService.findArgumentTree).mockReturnValue(
      err(new StructureError('Not found')),
    );
    vi.mocked(mockConnectionService.findBasicConnections).mockResolvedValue(
      err(new StructureError('Not found')),
    );

    service = new CyclePreventionService(
      mockAtomicArgumentRepo,
      mockTreeRepo,
      mockConnectionService,
    );
  });

  describe('validateLogicalCyclePrevention', () => {
    describe('successful validation cases', () => {
      it('should return no cycle when arguments are properly connected', async () => {
        const parentId = atomicArgumentIdFactory.build();
        const childId = atomicArgumentIdFactory.build();

        // Mock parent argument
        const mockParentArg = {
          getId: vi.fn().mockReturnValue(parentId),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn().mockReturnValue(ok(true)),
          wouldCreateDirectCycle: vi.fn().mockReturnValue(false),
        } as unknown as AtomicArgument;

        // Mock child argument
        const mockChildArg = {
          getId: vi.fn().mockReturnValue(childId),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;

        // Mock repository responses
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(parentId)) return mockParentArg;
          if (id.equals(childId)) return mockChildArg;
          return null;
        });

        const result = await service.validateLogicalCyclePrevention(parentId, childId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.wouldCreateCycle).toBe(false);
          expect(validation.cyclePath).toEqual([]);
          expect(validation.reason).toBeUndefined();
        }
      });

      it('should detect direct cycle when arguments would create circular reference', async () => {
        const parentId = atomicArgumentIdFactory.build();
        const childId = atomicArgumentIdFactory.build();

        // Mock parent argument that would create cycle
        const mockParentArg = {
          getId: vi.fn().mockReturnValue(parentId),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn().mockReturnValue(ok(true)),
          wouldCreateDirectCycle: vi.fn().mockReturnValue(true),
        } as unknown as AtomicArgument;

        // Mock child argument
        const mockChildArg = {
          getId: vi.fn().mockReturnValue(childId),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;

        // Mock repository responses
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(parentId)) return mockParentArg;
          if (id.equals(childId)) return mockChildArg;
          return null;
        });

        const result = await service.validateLogicalCyclePrevention(parentId, childId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.wouldCreateCycle).toBe(true);
          expect(validation.cyclePath).toEqual([parentId, childId]);
          expect(validation.reason).toBe('Direct cycle detected');
        }
      });

      it('should detect connection safety issues', async () => {
        const parentId = atomicArgumentIdFactory.build();
        const childId = atomicArgumentIdFactory.build();

        // Mock parent argument with connection safety issue
        const safetyError = new StructureError('Connection would create invalid reference');
        const mockParentArg = {
          getId: vi.fn().mockReturnValue(parentId),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn().mockReturnValue(err(safetyError)),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;

        // Mock child argument
        const mockChildArg = {
          getId: vi.fn().mockReturnValue(childId),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;

        // Mock repository responses
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(parentId)) return mockParentArg;
          if (id.equals(childId)) return mockChildArg;
          return null;
        });

        const result = await service.validateLogicalCyclePrevention(parentId, childId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.wouldCreateCycle).toBe(true);
          expect(validation.cyclePath).toEqual([parentId, childId]);
          expect(validation.reason).toBe('Connection would create invalid reference');
        }
      });
    });

    describe('error cases', () => {
      it('should fail when parent argument is not found', async () => {
        const parentId = atomicArgumentIdFactory.build();
        const childId = atomicArgumentIdFactory.build();

        // Mock repository to return null for parent
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(parentId)) return Promise.resolve(null);
          if (id.equals(childId)) return Promise.resolve({} as AtomicArgument);
          return Promise.resolve(null);
        });

        const result = await service.validateLogicalCyclePrevention(parentId, childId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(StructureError);
          expect(result.error.message).toBe('One or both arguments not found');
        }
      });

      it('should fail when child argument is not found', async () => {
        const parentId = atomicArgumentIdFactory.build();
        const childId = atomicArgumentIdFactory.build();

        // Mock repository to return null for child
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(parentId)) return Promise.resolve({} as AtomicArgument);
          if (id.equals(childId)) return Promise.resolve(null);
          return Promise.resolve(null);
        });

        const result = await service.validateLogicalCyclePrevention(parentId, childId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(StructureError);
          expect(result.error.message).toBe('One or both arguments not found');
        }
      });

      it('should fail when both arguments are not found', async () => {
        const parentId = atomicArgumentIdFactory.build();
        const childId = atomicArgumentIdFactory.build();

        // Mock repository to return null for both
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);

        const result = await service.validateLogicalCyclePrevention(parentId, childId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(StructureError);
          expect(result.error.message).toBe('One or both arguments not found');
        }
      });
    });
  });

  describe('validateTreeCyclePrevention', () => {
    describe('successful validation cases', () => {
      it('should return no cycle when tree connection is valid', async () => {
        const treeId = treeIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const childNodeId = nodeIdFactory.build();

        // Mock tree that would not create cycle
        const mockTree = {
          wouldCreateCycle: vi.fn().mockReturnValue(false),
        } as unknown as Tree;

        // Mock repository response
        vi.mocked(mockTreeRepo.findById).mockResolvedValue(mockTree);

        const result = await service.validateTreeCyclePrevention(treeId, parentNodeId, childNodeId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.wouldCreateCycle).toBe(false);
          expect(validation.ancestorPath).toEqual([]);
          expect(validation.reason).toBeUndefined();
        }
      });

      it('should detect cycle when child is in parent ancestor chain', async () => {
        const treeId = treeIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const childNodeId = nodeIdFactory.build();
        const grandparentNodeId = nodeIdFactory.build();

        // Mock tree that would create cycle
        const mockTree = {
          wouldCreateCycle: vi.fn().mockReturnValue(true),
          getNode: vi.fn(),
        } as unknown as Tree;

        // Mock ancestor path tracing
        const mockParentNode = {
          getParentId: vi.fn().mockReturnValue(grandparentNodeId),
        };

        const mockGrandparentNode = {
          getParentId: vi.fn().mockReturnValue(null),
        };

        vi.mocked(mockTree.getNode).mockImplementation((nodeId: any) => {
          if (nodeId.equals(parentNodeId)) return mockParentNode;
          if (nodeId.equals(grandparentNodeId)) return mockGrandparentNode;
          return null;
        });

        // Mock repository response
        vi.mocked(mockTreeRepo.findById).mockResolvedValue(mockTree);

        const result = await service.validateTreeCyclePrevention(treeId, parentNodeId, childNodeId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.wouldCreateCycle).toBe(true);
          expect(validation.ancestorPath.length).toBeGreaterThan(0);
          expect(validation.reason).toBe("Child node found in parent's ancestor chain");
        }
      });

      it('should trace complete ancestor path when cycle is detected', async () => {
        const treeId = treeIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const childNodeId = nodeIdFactory.build();
        const grandparentNodeId = nodeIdFactory.build();

        // Mock tree that would create cycle
        const mockTree = {
          getId: vi.fn(),
          wouldCreateCycle: vi.fn(),
          getNode: vi.fn(),
        } as unknown as Tree;
        vi.mocked(mockTree.wouldCreateCycle).mockReturnValue(true);

        // Mock complete ancestor chain
        const mockParentNode = {
          getParentId: vi.fn().mockReturnValue(grandparentNodeId),
        };

        const mockGrandparentNode = {
          getParentId: vi.fn().mockReturnValue(childNodeId), // Child is ancestor
        };

        const mockChildNode = {
          getParentId: vi.fn().mockReturnValue(null),
        };

        vi.mocked(mockTree.getNode).mockImplementation((nodeId: any) => {
          if (nodeId.equals(parentNodeId)) return mockParentNode;
          if (nodeId.equals(grandparentNodeId)) return mockGrandparentNode;
          if (nodeId.equals(childNodeId)) return mockChildNode;
          return null;
        });

        // Mock repository response
        vi.mocked(mockTreeRepo.findById).mockResolvedValue(mockTree);

        const result = await service.validateTreeCyclePrevention(treeId, parentNodeId, childNodeId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.wouldCreateCycle).toBe(true);
          expect(validation.ancestorPath).toEqual([parentNodeId, grandparentNodeId, childNodeId]);
          expect(validation.reason).toBe("Child node found in parent's ancestor chain");
        }
      });
    });

    describe('error cases', () => {
      it('should fail when tree is not found', async () => {
        const treeId = treeIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const childNodeId = nodeIdFactory.build();

        // Mock repository to return null
        vi.mocked(mockTreeRepo.findById).mockResolvedValue(null);

        const result = await service.validateTreeCyclePrevention(treeId, parentNodeId, childNodeId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(StructureError);
          expect(result.error.message).toBe('Tree not found');
        }
      });
    });
  });

  describe('detectCyclesInArgumentTree', () => {
    it('should return error indicating functionality moved to Tree', () => {
      const startArgumentId = atomicArgumentIdFactory.build();

      const result = service.detectCyclesInArgumentTree(startArgumentId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(StructureError);
        expect(result.error.message).toBe('Tree-level cycle detection has been moved to Tree');
      }
    });
  });

  describe('preventCircularReasoning', () => {
    describe('successful validation cases', () => {
      it('should return no circular reasoning for empty chain', () => {
        const result = service.preventCircularReasoning([]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(false);
          expect(validation.argumentChain).toEqual([]);
          expect(validation.reason).toBeUndefined();
        }
      });

      it('should return no circular reasoning for single argument', () => {
        const argumentId = atomicArgumentIdFactory.build();

        const result = service.preventCircularReasoning([argumentId]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(false);
          expect(validation.argumentChain).toEqual([]);
          expect(validation.reason).toBeUndefined();
        }
      });

      it('should return no circular reasoning for unique argument chain', () => {
        const argumentIds = [
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
        ];

        const result = service.preventCircularReasoning(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(false);
          expect(validation.argumentChain).toEqual([]);
          expect(validation.reason).toBeUndefined();
        }
      });

      it('should detect circular reasoning when argument appears multiple times', () => {
        const argumentA = atomicArgumentIdFactory.build();
        const argumentB = atomicArgumentIdFactory.build();
        const argumentChain = [argumentA, argumentB, argumentA]; // argumentA repeats

        const result = service.preventCircularReasoning(argumentChain);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(true);
          expect(validation.argumentChain).toEqual(argumentChain);
          expect(validation.reason).toContain(
            `Circular reasoning detected: argument ${argumentA.getValue()} appears multiple times`,
          );
        }
      });

      it('should detect circular reasoning with complex chain', () => {
        const argumentA = atomicArgumentIdFactory.build();
        const argumentB = atomicArgumentIdFactory.build();
        const argumentC = atomicArgumentIdFactory.build();
        const argumentChain = [argumentA, argumentB, argumentC, argumentB]; // argumentB repeats

        const result = service.preventCircularReasoning(argumentChain);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(true);
          expect(validation.argumentChain).toEqual(argumentChain);
          expect(validation.reason).toContain(
            `Circular reasoning detected: argument ${argumentB.getValue()} appears multiple times`,
          );
        }
      });

      it('should identify first duplicate in chain', () => {
        const argumentA = atomicArgumentIdFactory.build();
        const argumentB = atomicArgumentIdFactory.build();
        const argumentC = atomicArgumentIdFactory.build();
        const argumentChain = [argumentA, argumentB, argumentA, argumentC, argumentB]; // Multiple duplicates

        const result = service.preventCircularReasoning(argumentChain);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(true);
          expect(validation.reason).toContain(argumentA.getValue()); // First duplicate
        }
      });
    });

    describe('error cases', () => {
      it('should fail when argument chain contains null values', () => {
        const argumentA = atomicArgumentIdFactory.build();
        const argumentChain = [argumentA, null as any, argumentA];

        const result = service.preventCircularReasoning(argumentChain);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(StructureError);
          expect(result.error.message).toContain('Invalid argument chain');
        }
      });

      it('should fail when argument chain contains undefined values', () => {
        const argumentA = atomicArgumentIdFactory.build();
        const argumentChain = [argumentA, undefined as any];

        const result = service.preventCircularReasoning(argumentChain);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(StructureError);
          expect(result.error.message).toContain('Invalid argument chain');
        }
      });
    });
  });

  describe('validateConnectionSafety', () => {
    describe('successful validation cases', () => {
      it('should return safe connection when no cycles or circular reasoning detected', async () => {
        const sourceId = atomicArgumentIdFactory.build();
        const targetId = atomicArgumentIdFactory.build();

        // Mock arguments that are safe to connect
        const mockSourceArg = {
          getId: vi.fn(),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;
        vi.mocked(mockSourceArg.validateConnectionSafety).mockReturnValue(ok(true));
        vi.mocked(mockSourceArg.wouldCreateDirectCycle).mockReturnValue(false);

        const mockTargetArg = {
          getId: vi.fn(),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;

        // Mock repository responses
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(sourceId)) return mockSourceArg;
          if (id.equals(targetId)) return mockTargetArg;
          return null;
        });

        const result = await service.validateConnectionSafety(sourceId, targetId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const safetyResult = result.value;
          expect(safetyResult.isSafe).toBe(true);
          expect(safetyResult.logicalCycleResult.wouldCreateCycle).toBe(false);
          expect(safetyResult.circularReasoningResult.isCircular).toBe(false);
        }
      });

      it('should return unsafe connection when logical cycle detected', async () => {
        const sourceId = atomicArgumentIdFactory.build();
        const targetId = atomicArgumentIdFactory.build();

        // Mock arguments that would create logical cycle
        const mockSourceArg = {
          getId: vi.fn(),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;
        vi.mocked(mockSourceArg.validateConnectionSafety).mockReturnValue(ok(true));
        vi.mocked(mockSourceArg.wouldCreateDirectCycle).mockReturnValue(true);

        const mockTargetArg = {
          getId: vi.fn(),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;

        // Mock repository responses
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(sourceId)) return mockSourceArg;
          if (id.equals(targetId)) return mockTargetArg;
          return null;
        });

        const result = await service.validateConnectionSafety(sourceId, targetId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const safetyResult = result.value;
          expect(safetyResult.isSafe).toBe(false);
          expect(safetyResult.logicalCycleResult.wouldCreateCycle).toBe(true);
          expect(safetyResult.circularReasoningResult.isCircular).toBe(false);
        }
      });

      it('should return unsafe connection when circular reasoning detected', async () => {
        const sourceId = atomicArgumentIdFactory.build();
        const targetId = sourceId; // Same argument = circular reasoning

        // Mock argument that doesn't create logical cycle but creates circular reasoning
        const mockArg = {
          getId: vi.fn(),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;
        vi.mocked(mockArg.validateConnectionSafety).mockReturnValue(ok(true));
        vi.mocked(mockArg.wouldCreateDirectCycle).mockReturnValue(false);

        // Mock repository responses
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(sourceId)) return mockArg;
          return null;
        });

        const result = await service.validateConnectionSafety(sourceId, targetId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const safetyResult = result.value;
          expect(safetyResult.isSafe).toBe(false);
          expect(safetyResult.logicalCycleResult.wouldCreateCycle).toBe(false);
          expect(safetyResult.circularReasoningResult.isCircular).toBe(true);
        }
      });

      it('should return unsafe connection when both cycle types detected', async () => {
        const sourceId = atomicArgumentIdFactory.build();
        const targetId = sourceId; // Same argument = circular reasoning

        // Mock argument that creates both logical cycle and circular reasoning
        const mockArg = {
          getId: vi.fn(),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;
        vi.mocked(mockArg.validateConnectionSafety).mockReturnValue(ok(true));
        vi.mocked(mockArg.wouldCreateDirectCycle).mockReturnValue(true);

        // Mock repository responses
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(sourceId)) return mockArg;
          return null;
        });

        const result = await service.validateConnectionSafety(sourceId, targetId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const safetyResult = result.value;
          expect(safetyResult.isSafe).toBe(false);
          expect(safetyResult.logicalCycleResult.wouldCreateCycle).toBe(true);
          expect(safetyResult.circularReasoningResult.isCircular).toBe(true);
        }
      });
    });

    describe('error cases', () => {
      it('should propagate error from logical cycle validation', async () => {
        const sourceId = atomicArgumentIdFactory.build();
        const targetId = atomicArgumentIdFactory.build();

        // Mock repository to return null (arguments not found)
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);

        const result = await service.validateConnectionSafety(sourceId, targetId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(StructureError);
          expect(result.error.message).toBe('One or both arguments not found');
        }
      });
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    describe('complex cycle detection', () => {
      it('should handle deeply nested argument chains', () => {
        const argumentIds = Array.from({ length: 10 }, () => atomicArgumentIdFactory.build());
        const firstArgument = argumentIds[0];
        if (firstArgument) argumentIds.push(firstArgument); // Create cycle by adding first argument at end

        const result = service.preventCircularReasoning(argumentIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(true);
          expect(validation.reason).toContain(argumentIds[0]?.getValue());
        }
      });

      it('should handle multiple cycles in same chain', () => {
        const argumentA = atomicArgumentIdFactory.build();
        const argumentB = atomicArgumentIdFactory.build();
        const argumentC = atomicArgumentIdFactory.build();
        // Chain: A, B, A, C, B (two cycles: A-B-A and B-C-B)
        const argumentChain = [argumentA, argumentB, argumentA, argumentC, argumentB];

        const result = service.preventCircularReasoning(argumentChain);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(true);
          // Should detect first duplicate (argumentA)
          expect(validation.reason).toContain(argumentA.getValue());
        }
      });

      it('should handle large argument chains efficiently', () => {
        const argumentIds = Array.from({ length: 1000 }, () => atomicArgumentIdFactory.build());

        const startTime = Date.now();
        const result = service.preventCircularReasoning(argumentIds);
        const endTime = Date.now();

        expect(result.isOk()).toBe(true);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.isCircular).toBe(false);
        }
      });
    });

    describe('tree cycle detection edge cases', () => {
      it('should handle nodes with no parent', async () => {
        const treeId = treeIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const childNodeId = nodeIdFactory.build();

        // Mock tree and nodes
        const mockTree = {
          getId: vi.fn(),
          wouldCreateCycle: vi.fn(),
          getNode: vi.fn(),
        } as unknown as Tree;
        vi.mocked(mockTree.wouldCreateCycle).mockReturnValue(false);

        const mockParentNode = {
          getParentId: vi.fn().mockReturnValue(null), // Root node
        };

        vi.mocked(mockTree.getNode).mockImplementation((nodeId: any) => {
          if (nodeId.equals(parentNodeId)) return mockParentNode;
          return null;
        });

        vi.mocked(mockTreeRepo.findById).mockResolvedValue(mockTree);

        const result = await service.validateTreeCyclePrevention(treeId, parentNodeId, childNodeId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.wouldCreateCycle).toBe(false);
          expect(validation.ancestorPath).toEqual([]);
        }
      });

      it('should handle very deep tree hierarchies', async () => {
        const treeId = treeIdFactory.build();
        const leafNodeId = nodeIdFactory.build();
        const rootNodeId = nodeIdFactory.build();

        // Create deep chain of nodes
        const nodeIds = Array.from({ length: 50 }, () => nodeIdFactory.build());
        nodeIds.unshift(leafNodeId);
        nodeIds.push(rootNodeId);

        const mockTree = {
          getId: vi.fn(),
          wouldCreateCycle: vi.fn(),
          getNode: vi.fn(),
        } as unknown as Tree;
        vi.mocked(mockTree.wouldCreateCycle).mockReturnValue(false);

        // Mock nodes with parent-child relationships forming a deep chain
        vi.mocked(mockTree.getNode).mockImplementation((nodeId: any) => {
          const index = nodeIds.findIndex((id) => id.equals(nodeId));
          if (index === -1) return null;

          const mockNode = {
            getParentId: vi.fn(),
          };
          if (index === nodeIds.length - 1) {
            vi.mocked(mockNode.getParentId).mockReturnValue(null); // Root node
          } else {
            vi.mocked(mockNode.getParentId).mockReturnValue(nodeIds[index + 1]);
          }
          return mockNode;
        });

        vi.mocked(mockTreeRepo.findById).mockResolvedValue(mockTree);

        const result = await service.validateTreeCyclePrevention(treeId, leafNodeId, rootNodeId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validation = result.value;
          expect(validation.wouldCreateCycle).toBe(false);
        }
      });
    });

    describe('performance and memory tests', () => {
      it('should handle repeated validations without memory leaks', async () => {
        const sourceId = atomicArgumentIdFactory.build();
        const targetId = atomicArgumentIdFactory.build();

        // Mock safe arguments
        const mockSourceArg = {
          getId: vi.fn(),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;
        vi.mocked(mockSourceArg.validateConnectionSafety).mockReturnValue(ok(true));
        vi.mocked(mockSourceArg.wouldCreateDirectCycle).mockReturnValue(false);

        const mockTargetArg = {
          getId: vi.fn(),
          getPremiseSet: vi.fn(),
          getConclusionSet: vi.fn(),
          validateConnectionSafety: vi.fn(),
          wouldCreateDirectCycle: vi.fn(),
        } as unknown as AtomicArgument;

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id: any) => {
          if (id.equals(sourceId)) return mockSourceArg;
          if (id.equals(targetId)) return mockTargetArg;
          return null;
        });

        // Run many validations
        const promises = Array.from({ length: 100 }, async () =>
          service.validateConnectionSafety(sourceId, targetId),
        );

        const results = await Promise.all(promises);

        // All should succeed
        results.forEach((result) => {
          expect(result.isOk()).toBe(true);
        });
      });
    });
  });

  describe('Result Classes', () => {
    describe('CycleValidationResult', () => {
      it('should create validation result with correct properties', () => {
        const cyclePath = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];
        const result = new CycleValidationResult(true, cyclePath, 'Test cycle detected');

        expect(result.wouldCreateCycle).toBe(true);
        expect(result.cyclePath).toEqual(cyclePath);
        expect(result.reason).toBe('Test cycle detected');
      });

      it('should create validation result without reason', () => {
        const result = new CycleValidationResult(false, []);

        expect(result.wouldCreateCycle).toBe(false);
        expect(result.cyclePath).toEqual([]);
        expect(result.reason).toBeUndefined();
      });
    });

    describe('TreeCycleValidationResult', () => {
      it('should create tree cycle result with ancestor path', () => {
        const ancestorPath = [nodeIdFactory.build(), nodeIdFactory.build()];
        const result = new TreeCycleValidationResult(true, ancestorPath, 'Ancestor cycle');

        expect(result.wouldCreateCycle).toBe(true);
        expect(result.ancestorPath).toEqual(ancestorPath);
        expect(result.reason).toBe('Ancestor cycle');
      });
    });

    describe('ArgumentTreeCycleReport', () => {
      it('should create cycle report with cycles', () => {
        const rootId = atomicArgumentIdFactory.build();
        const cycle = new ArgumentCycle([atomicArgumentIdFactory.build()]);
        const report = new ArgumentTreeCycleReport(rootId, [cycle]);

        expect(report.rootArgumentId).toEqual(rootId);
        expect(report.cycles).toEqual([cycle]);
        expect(report.hasCycles()).toBe(true);
      });

      it('should report no cycles when empty', () => {
        const rootId = atomicArgumentIdFactory.build();
        const report = new ArgumentTreeCycleReport(rootId, []);

        expect(report.hasCycles()).toBe(false);
      });
    });

    describe('ArgumentCycle', () => {
      it('should create argument cycle with path', () => {
        const cyclePath = [
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
          atomicArgumentIdFactory.build(),
        ];
        const cycle = new ArgumentCycle(cyclePath);

        expect(cycle.cyclePath).toEqual(cyclePath);
      });
    });

    describe('CircularReasoningValidationResult', () => {
      it('should create circular reasoning result', () => {
        const argumentChain = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];
        const result = new CircularReasoningValidationResult(
          true,
          argumentChain,
          'Circular reasoning detected',
        );

        expect(result.isCircular).toBe(true);
        expect(result.argumentChain).toEqual(argumentChain);
        expect(result.reason).toBe('Circular reasoning detected');
      });
    });

    describe('ConnectionSafetyResult', () => {
      it('should create connection safety result', () => {
        const logicalCycleResult = new CycleValidationResult(false, []);
        const circularReasoningResult = new CircularReasoningValidationResult(false, []);
        const result = new ConnectionSafetyResult(
          true,
          logicalCycleResult,
          circularReasoningResult,
        );

        expect(result.isSafe).toBe(true);
        expect(result.logicalCycleResult).toEqual(logicalCycleResult);
        expect(result.circularReasoningResult).toEqual(circularReasoningResult);
      });

      it('should create unsafe connection safety result', () => {
        const logicalCycleResult = new CycleValidationResult(
          true,
          [atomicArgumentIdFactory.build()],
          'Cycle detected',
        );
        const circularReasoningResult = new CircularReasoningValidationResult(false, []);
        const result = new ConnectionSafetyResult(
          false,
          logicalCycleResult,
          circularReasoningResult,
        );

        expect(result.isSafe).toBe(false);
        expect(result.logicalCycleResult.wouldCreateCycle).toBe(true);
        expect(result.circularReasoningResult.isCircular).toBe(false);
      });
    });
  });
});
