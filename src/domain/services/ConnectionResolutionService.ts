import { AtomicArgumentEntity } from '../entities/AtomicArgumentEntity';
import { AtomicArgumentId, OrderedSetId } from '../shared/value-objects.js';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { IOrderedSetRepository } from '../repositories/IOrderedSetRepository';
import type { Result } from '../shared/result.js';
import { ProcessingError } from '../errors/DomainErrors';

export class ConnectionResolutionService {
  constructor(
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
    private readonly orderedSetRepo: IOrderedSetRepository
  ) {}

  async findDirectConnections(
    argumentId: AtomicArgumentId
  ): Promise<Result<ConnectionMap, ProcessingError>> {
    const argument = await this.atomicArgumentRepo.findById(argumentId);
    if (!argument) {
      return {
        success: false,
        error: new ProcessingError('Argument not found')
      };
    }

    const parents = await this.findParentArguments(argument);
    const children = await this.findChildArguments(argument);

    const connectionMap = new ConnectionMap(argumentId, parents, children);
    return { success: true, data: connectionMap };
  }

  async findArgumentTree(
    startArgumentId: AtomicArgumentId
  ): Promise<Result<ArgumentTreeStructure, ProcessingError>> {
    const visited = new Set<string>();
    const treeArguments = new Set<AtomicArgumentId>();

    await this.traverseConnectedArguments(startArgumentId, visited, treeArguments);

    const structure = new ArgumentTreeStructure(Array.from(treeArguments));
    return { success: true, data: structure };
  }

  async findPathCompleteArgument(
    startId: AtomicArgumentId,
    endId: AtomicArgumentId
  ): Promise<Result<PathCompleteArgument, ProcessingError>> {
    const paths = await this.findAllPaths(startId, endId);
    if (paths.length === 0) {
      return {
        success: false,
        error: new ProcessingError('No path exists between arguments')
      };
    }

    const allArgumentsInPaths = new Set<AtomicArgumentId>();
    for (const path of paths) {
      path.forEach(argId => allArgumentsInPaths.add(argId));
    }

    const pathCompleteArgument = new PathCompleteArgument(
      Array.from(allArgumentsInPaths),
      paths
    );

    return { success: true, data: pathCompleteArgument };
  }

  async discoverSharedReferences(
    orderedSetId: OrderedSetId
  ): Promise<Result<OrderedSetReference[], ProcessingError>> {
    const argumentsUsingSet = await this.atomicArgumentRepo.findByOrderedSetReference(orderedSetId);
    
    const references: OrderedSetReference[] = [];
    
    for (const argument of argumentsUsingSet) {
      const premiseRef = argument.getPremiseSetRef();
      const conclusionRef = argument.getConclusionSetRef();
      
      if (premiseRef?.equals(orderedSetId)) {
        references.push(new OrderedSetReference(argument.getId(), 'premise', orderedSetId));
      }
      
      if (conclusionRef?.equals(orderedSetId)) {
        references.push(new OrderedSetReference(argument.getId(), 'conclusion', orderedSetId));
      }
    }

    return { success: true, data: references };
  }

  async validateConnectionIntegrity(
    argumentId: AtomicArgumentId
  ): Promise<Result<ConnectionIntegrityReport, ProcessingError>> {
    const argument = await this.atomicArgumentRepo.findById(argumentId);
    if (!argument) {
      return {
        success: false,
        error: new ProcessingError('Argument not found')
      };
    }

    const issues: ConnectionIntegrityIssue[] = [];

    const premiseSetRef = argument.getPremiseSetRef();
    if (premiseSetRef) {
      const premiseSet = await this.orderedSetRepo.findById(premiseSetRef);
      if (!premiseSet) {
        issues.push(new ConnectionIntegrityIssue(
          'missing_premise_set',
          `Premise set ${premiseSetRef.getValue()} not found`
        ));
      }
    }

    const conclusionSetRef = argument.getConclusionSetRef();
    if (conclusionSetRef) {
      const conclusionSet = await this.orderedSetRepo.findById(conclusionSetRef);
      if (!conclusionSet) {
        issues.push(new ConnectionIntegrityIssue(
          'missing_conclusion_set',
          `Conclusion set ${conclusionSetRef.getValue()} not found`
        ));
      }
    }

    const report = new ConnectionIntegrityReport(argumentId, issues);
    return { success: true, data: report };
  }

  private async findParentArguments(
    argument: AtomicArgumentEntity
  ): Promise<AtomicArgumentEntity[]> {
    const premiseSetRef = argument.getPremiseSetRef();
    if (!premiseSetRef) return [];

    const allArguments = await this.atomicArgumentRepo.findAll();
    return allArguments.filter(arg => 
      arg.getConclusionSetRef()?.equals(premiseSetRef) && 
      !arg.getId().equals(argument.getId())
    );
  }

  private async findChildArguments(
    argument: AtomicArgumentEntity
  ): Promise<AtomicArgumentEntity[]> {
    const conclusionSetRef = argument.getConclusionSetRef();
    if (!conclusionSetRef) return [];

    const allArguments = await this.atomicArgumentRepo.findAll();
    return allArguments.filter(arg => 
      arg.getPremiseSetRef()?.equals(conclusionSetRef) && 
      !arg.getId().equals(argument.getId())
    );
  }

  private async traverseConnectedArguments(
    currentId: AtomicArgumentId,
    visited: Set<string>,
    result: Set<AtomicArgumentId>
  ): Promise<void> {
    const idString = currentId.getValue();
    if (visited.has(idString)) return;

    visited.add(idString);
    result.add(currentId);

    const connectionsResult = await this.findDirectConnections(currentId);
    if (!connectionsResult.success) return;

    const connections = connectionsResult.data;
    
    for (const parent of connections.getParents()) {
      await this.traverseConnectedArguments(parent.getId(), visited, result);
    }

    for (const child of connections.getChildren()) {
      await this.traverseConnectedArguments(child.getId(), visited, result);
    }
  }

  private async findAllPaths(
    startId: AtomicArgumentId,
    endId: AtomicArgumentId
  ): Promise<AtomicArgumentId[][]> {
    const paths: AtomicArgumentId[][] = [];
    const currentPath: AtomicArgumentId[] = [];
    const visited = new Set<string>();

    await this.depthFirstSearch(startId, endId, currentPath, visited, paths);
    return paths;
  }

  private async depthFirstSearch(
    currentId: AtomicArgumentId,
    targetId: AtomicArgumentId,
    currentPath: AtomicArgumentId[],
    visited: Set<string>,
    allPaths: AtomicArgumentId[][]
  ): Promise<void> {
    const idString = currentId.getValue();
    if (visited.has(idString)) return;

    visited.add(idString);
    currentPath.push(currentId);

    if (currentId.equals(targetId)) {
      allPaths.push([...currentPath]);
    } else {
      const connectionsResult = await this.findDirectConnections(currentId);
      if (connectionsResult.success) {
        const connections = connectionsResult.data;
        for (const child of connections.getChildren()) {
          await this.depthFirstSearch(child.getId(), targetId, currentPath, visited, allPaths);
        }
      }
    }

    currentPath.pop();
    visited.delete(idString);
  }
}

export class ConnectionMap {
  constructor(
    private readonly centralArgumentId: AtomicArgumentId,
    private readonly parents: AtomicArgumentEntity[],
    private readonly children: AtomicArgumentEntity[]
  ) {}

  getCentralArgumentId(): AtomicArgumentId { return this.centralArgumentId; }
  getParents(): readonly AtomicArgumentEntity[] { return this.parents; }
  getChildren(): readonly AtomicArgumentEntity[] { return this.children; }
}

export class ArgumentTreeStructure {
  constructor(private readonly argumentIds: AtomicArgumentId[]) {}

  getAllArguments(): readonly AtomicArgumentId[] { return this.argumentIds; }
  getArgumentCount(): number { return this.argumentIds.length; }
}

export class PathCompleteArgument {
  constructor(
    private readonly argumentIds: AtomicArgumentId[],
    private readonly paths: AtomicArgumentId[][]
  ) {}

  getAllArguments(): readonly AtomicArgumentId[] { return this.argumentIds; }
  getAllPaths(): readonly AtomicArgumentId[][] { return this.paths; }
}

export class OrderedSetReference {
  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly referenceType: 'premise' | 'conclusion',
    public readonly orderedSetId: OrderedSetId
  ) {}
}

export class ConnectionIntegrityReport {
  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly issues: ConnectionIntegrityIssue[]
  ) {}

  hasIssues(): boolean { return this.issues.length > 0; }
}

export class ConnectionIntegrityIssue {
  constructor(
    public readonly type: string,
    public readonly description: string
  ) {}
}