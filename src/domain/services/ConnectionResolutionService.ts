import type { AtomicArgument } from '../entities/AtomicArgument';
import { ProcessingError } from '../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { IOrderedSetRepository } from '../repositories/IOrderedSetRepository';
import { err, ok, type Result } from '../shared/result.js';
import type { AtomicArgumentId, OrderedSetId } from '../shared/value-objects.js';

/**
 * Basic connection resolution service for argument-level operations.
 * For tree-specific connection resolution, use TreeEntity methods directly.
 *
 * @deprecated Many methods have been moved to TreeEntity. This service provides
 * minimal compatibility wrappers for existing code during migration.
 */
export class ConnectionResolutionService {
  constructor(
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
    private readonly orderedSetRepo: IOrderedSetRepository,
  ) {}

  /**
   * Basic argument connection lookup (non-tree-specific).
   * For tree-aware connection resolution, use TreeEntity.findDirectConnections().
   */
  async findBasicConnections(
    argumentId: AtomicArgumentId,
  ): Promise<Result<ConnectionMap, ProcessingError>> {
    const argument = await this.atomicArgumentRepo.findById(argumentId);
    if (!argument) {
      return err(new ProcessingError('Argument not found'));
    }

    const parents = await this.findParentArguments(argument);
    const children = await this.findChildArguments(argument);

    const connectionMap = new ConnectionMap(argumentId, parents, children);
    return ok(connectionMap);
  }

  /**
   * @deprecated This method has been moved to TreeEntity. This is a compatibility wrapper.
   */
  async findDirectConnections(
    argumentId: AtomicArgumentId,
  ): Promise<Result<ConnectionMap, ProcessingError>> {
    return this.findBasicConnections(argumentId);
  }

  /**
   * @deprecated This method has been moved to TreeEntity. This returns minimal structure.
   */
  findArgumentTree(argumentId: AtomicArgumentId): Result<ArgumentTreeStructure, ProcessingError> {
    // Simplified implementation for compatibility
    const structure = new ArgumentTreeStructure([argumentId]);
    return ok(structure);
  }

  /**
   * @deprecated This method has been moved to TreeEntity. This returns empty result.
   */
  findPathCompleteArgument(
    startId: AtomicArgumentId,
    endId: AtomicArgumentId,
  ): Result<PathCompleteArgument, ProcessingError> {
    // Simplified implementation for compatibility
    const pathComplete = new PathCompleteArgument([startId, endId], [[startId, endId]]);
    return ok(pathComplete);
  }

  private async findParentArguments(argument: AtomicArgument): Promise<AtomicArgument[]> {
    const premiseSetRef = argument.getPremiseSetRef();
    if (!premiseSetRef) return [];

    const allArguments = await this.atomicArgumentRepo.findAll();
    return allArguments.filter(
      (arg) =>
        arg.getConclusionSetRef()?.equals(premiseSetRef) && !arg.getId().equals(argument.getId()),
    );
  }

  private async findChildArguments(argument: AtomicArgument): Promise<AtomicArgument[]> {
    const conclusionSetRef = argument.getConclusionSetRef();
    if (!conclusionSetRef) return [];

    const allArguments = await this.atomicArgumentRepo.findAll();
    return allArguments.filter(
      (arg) =>
        arg.getPremiseSetRef()?.equals(conclusionSetRef) && !arg.getId().equals(argument.getId()),
    );
  }
}

export class ConnectionMap {
  constructor(
    private readonly centralArgumentId: AtomicArgumentId,
    private readonly parents: AtomicArgument[],
    private readonly children: AtomicArgument[],
  ) {}

  getCentralArgumentId(): AtomicArgumentId {
    return this.centralArgumentId;
  }
  getParents(): readonly AtomicArgument[] {
    return this.parents;
  }
  getChildren(): readonly AtomicArgument[] {
    return this.children;
  }
}

export class ArgumentTreeStructure {
  constructor(private readonly argumentIds: AtomicArgumentId[]) {}

  getAllArguments(): readonly AtomicArgumentId[] {
    return this.argumentIds;
  }
  getArgumentCount(): number {
    return this.argumentIds.length;
  }
}

export class PathCompleteArgument {
  constructor(
    private readonly argumentIds: AtomicArgumentId[],
    private readonly paths: AtomicArgumentId[][],
  ) {}

  getAllArguments(): readonly AtomicArgumentId[] {
    return this.argumentIds;
  }
  getAllPaths(): readonly AtomicArgumentId[][] {
    return this.paths;
  }
}

export class OrderedSetReference {
  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly referenceType: 'premise' | 'conclusion',
    public readonly orderedSetId: OrderedSetId,
  ) {}
}

export class ConnectionIntegrityReport {
  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly issues: ConnectionIntegrityIssue[],
  ) {}

  hasIssues(): boolean {
    return this.issues.length > 0;
  }
}

export class ConnectionIntegrityIssue {
  constructor(
    public readonly type: string,
    public readonly description: string,
  ) {}
}
