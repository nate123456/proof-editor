import { AtomicArgumentEntity } from '../entities/AtomicArgumentEntity';
import { TreeEntity } from '../entities/TreeEntity';
import { AtomicArgumentId, NodeId, TreeId } from '../shared/value-objects.js';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { ITreeRepository } from '../repositories/ITreeRepository';
import { ConnectionResolutionService } from './ConnectionResolutionService';
import type { Result } from '../shared/result.js';
import { StructureError } from '../errors/DomainErrors';

export class CyclePreventionService {
  constructor(
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
    private readonly treeRepo: ITreeRepository,
    private readonly connectionService: ConnectionResolutionService
  ) {}

  async validateLogicalCyclePrevention(
    parentArgumentId: AtomicArgumentId,
    childArgumentId: AtomicArgumentId
  ): Promise<Result<CycleValidationResult, StructureError>> {
    const parentArgument = await this.atomicArgumentRepo.findById(parentArgumentId);
    const childArgument = await this.atomicArgumentRepo.findById(childArgumentId);

    if (!parentArgument || !childArgument) {
      return {
        success: false,
        error: new StructureError('One or both arguments not found')
      };
    }

    const safetyValidation = parentArgument.validateConnectionSafety(childArgument);
    if (!safetyValidation.success) {
      const result = new CycleValidationResult(
        true,
        [parentArgumentId, childArgumentId],
        safetyValidation.error.message
      );
      return { success: true, data: result };
    }

    const wouldCreateDirectCycle = parentArgument.wouldCreateDirectCycle(childArgument);
    const result = new CycleValidationResult(
      wouldCreateDirectCycle,
      wouldCreateDirectCycle ? [parentArgumentId, childArgumentId] : [],
      wouldCreateDirectCycle ? 'Direct cycle detected' : undefined
    );

    return { success: true, data: result };
  }

  async validateTreeCyclePrevention(
    treeId: TreeId,
    parentNodeId: NodeId,
    childNodeId: NodeId
  ): Promise<Result<TreeCycleValidationResult, StructureError>> {
    const tree = await this.treeRepo.findById(treeId);
    if (!tree) {
      return {
        success: false,
        error: new StructureError('Tree not found')
      };
    }

    const wouldCreateCycle = tree.wouldCreateCycle(childNodeId, parentNodeId);
    const ancestorPath = wouldCreateCycle 
      ? this.traceAncestorPath(tree, parentNodeId, childNodeId)
      : [];

    const result = new TreeCycleValidationResult(
      wouldCreateCycle,
      ancestorPath,
      wouldCreateCycle ? 'Child node found in parent\'s ancestor chain' : undefined
    );

    return { success: true, data: result };
  }

  async detectCyclesInArgumentTree(
    startArgumentId: AtomicArgumentId
  ): Promise<Result<ArgumentTreeCycleReport, StructureError>> {
    const treeResult = await this.connectionService.findArgumentTree(startArgumentId);
    if (!treeResult.success) {
      return {
        success: false,
        error: new StructureError('Failed to analyze argument tree', treeResult.error)
      };
    }

    const cycles: ArgumentCycle[] = [];
    const allArguments = treeResult.data.getAllArguments();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const argumentId of allArguments) {
      if (!visited.has(argumentId.getValue())) {
        const cycleDetected = await this.depthFirstCycleDetection(
          argumentId,
          visited,
          recursionStack,
          []
        );

        if (cycleDetected) {
          cycles.push(cycleDetected);
        }
      }
    }

    const report = new ArgumentTreeCycleReport(startArgumentId, cycles);
    return { success: true, data: report };
  }

  async preventCircularReasoning(
    argumentChain: AtomicArgumentId[]
  ): Promise<Result<CircularReasoningValidationResult, StructureError>> {
    if (argumentChain.length < 2) {
      const result = new CircularReasoningValidationResult(false, [], undefined);
      return { success: true, data: result };
    }

    const uniqueArguments = new Set(argumentChain.map(id => id.getValue()));
    if (uniqueArguments.size !== argumentChain.length) {
      const duplicateId = this.findFirstDuplicate(argumentChain);
      const result = new CircularReasoningValidationResult(
        true,
        argumentChain,
        `Circular reasoning detected: argument ${duplicateId?.getValue()} appears multiple times`
      );
      return { success: true, data: result };
    }

    for (let i = 0; i < argumentChain.length - 1; i++) {
      const currentId = argumentChain[i];
      const nextId = argumentChain[i + 1];

      const pathResult = await this.connectionService.findPathCompleteArgument(nextId, currentId);
      if (pathResult.success) {
        const result = new CircularReasoningValidationResult(
          true,
          argumentChain,
          `Circular path exists from ${nextId.getValue()} back to ${currentId.getValue()}`
        );
        return { success: true, data: result };
      }
    }

    const result = new CircularReasoningValidationResult(false, [], undefined);
    return { success: true, data: result };
  }

  async validateConnectionSafety(
    sourceArgumentId: AtomicArgumentId,
    targetArgumentId: AtomicArgumentId
  ): Promise<Result<ConnectionSafetyResult, StructureError>> {
    const logicalCycleResult = await this.validateLogicalCyclePrevention(
      sourceArgumentId,
      targetArgumentId
    );
    if (!logicalCycleResult.success) return logicalCycleResult;

    const circularReasoningResult = await this.preventCircularReasoning([
      sourceArgumentId,
      targetArgumentId
    ]);
    if (!circularReasoningResult.success) return circularReasoningResult;

    const isSafe = !logicalCycleResult.data.wouldCreateCycle && 
                   !circularReasoningResult.data.isCircular;

    const result = new ConnectionSafetyResult(
      isSafe,
      logicalCycleResult.data,
      circularReasoningResult.data
    );

    return { success: true, data: result };
  }

  private async detectLogicalCycle(
    parentId: AtomicArgumentId,
    childId: AtomicArgumentId
  ): Promise<{ wouldCreateCycle: boolean; cyclePath: AtomicArgumentId[]; reason?: string }> {
    const pathResult = await this.connectionService.findPathCompleteArgument(childId, parentId);
    
    if (pathResult.success) {
      const paths = pathResult.data.getAllPaths();
      if (paths.length > 0) {
        return {
          wouldCreateCycle: true,
          cyclePath: [...paths[0], parentId],
          reason: 'Connection would create logical cycle'
        };
      }
    }

    return { wouldCreateCycle: false, cyclePath: [] };
  }

  private detectTreeCycle(tree: TreeEntity, parentId: NodeId, childId: NodeId): boolean {
    let currentId: NodeId | null = parentId;
    const visited = new Set<string>();

    while (currentId !== null) {
      const currentIdString = currentId.getValue();
      
      if (visited.has(currentIdString)) {
        return true;
      }
      
      if (currentId.equals(childId)) {
        return true;
      }

      visited.add(currentIdString);
      const node = tree.getNode(currentId);
      currentId = node?.getParentId() || null;
    }

    return false;
  }

  private traceAncestorPath(tree: TreeEntity, parentId: NodeId, childId: NodeId): NodeId[] {
    const path: NodeId[] = [];
    let currentId: NodeId | null = parentId;

    while (currentId !== null && !currentId.equals(childId)) {
      path.push(currentId);
      const node = tree.getNode(currentId);
      currentId = node?.getParentId() || null;
    }

    if (currentId?.equals(childId)) {
      path.push(childId);
    }

    return path;
  }

  private async depthFirstCycleDetection(
    currentId: AtomicArgumentId,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: AtomicArgumentId[]
  ): Promise<ArgumentCycle | null> {
    const idString = currentId.getValue();
    visited.add(idString);
    recursionStack.add(idString);
    currentPath.push(currentId);

    const connectionsResult = await this.connectionService.findDirectConnections(currentId);
    if (connectionsResult.success) {
      const connections = connectionsResult.data;
      
      for (const child of connections.getChildren()) {
        const childIdString = child.getId().getValue();
        
        if (recursionStack.has(childIdString)) {
          const cycleStart = currentPath.findIndex(id => id.equals(child.getId()));
          const cyclePath = currentPath.slice(cycleStart);
          return new ArgumentCycle(cyclePath);
        }
        
        if (!visited.has(childIdString)) {
          const cycle = await this.depthFirstCycleDetection(
            child.getId(),
            visited,
            recursionStack,
            currentPath
          );
          if (cycle) return cycle;
        }
      }
    }

    recursionStack.delete(idString);
    currentPath.pop();
    return null;
  }

  private findFirstDuplicate(argumentChain: AtomicArgumentId[]): AtomicArgumentId | null {
    const seen = new Set<string>();
    
    for (const argument of argumentChain) {
      const idString = argument.getValue();
      if (seen.has(idString)) {
        return argument;
      }
      seen.add(idString);
    }
    
    return null;
  }
}

export class CycleValidationResult {
  constructor(
    public readonly wouldCreateCycle: boolean,
    public readonly cyclePath: AtomicArgumentId[],
    public readonly reason?: string
  ) {}
}

export class TreeCycleValidationResult {
  constructor(
    public readonly wouldCreateCycle: boolean,
    public readonly ancestorPath: NodeId[],
    public readonly reason?: string
  ) {}
}

export class ArgumentTreeCycleReport {
  constructor(
    public readonly rootArgumentId: AtomicArgumentId,
    public readonly cycles: ArgumentCycle[]
  ) {}

  hasCycles(): boolean { return this.cycles.length > 0; }
}

export class ArgumentCycle {
  constructor(public readonly cyclePath: AtomicArgumentId[]) {}
}

export class CircularReasoningValidationResult {
  constructor(
    public readonly isCircular: boolean,
    public readonly argumentChain: AtomicArgumentId[],
    public readonly reason?: string
  ) {}
}

export class ConnectionSafetyResult {
  constructor(
    public readonly isSafe: boolean,
    public readonly logicalCycleResult: CycleValidationResult,
    public readonly circularReasoningResult: CircularReasoningValidationResult
  ) {}
}