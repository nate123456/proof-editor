import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument';
import { ProcessingError } from '../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { AtomicArgumentId } from '../shared/value-objects/index.js';

export interface TreeConnectionMap {
  getCentralArgumentId(): AtomicArgumentId;
  getParents(): readonly AtomicArgument[];
  getChildren(): readonly AtomicArgument[];
}

export interface TreeArgumentStructure {
  getAllArguments(): readonly AtomicArgumentId[];
  getArgumentCount(): number;
}

export interface TreePathCompleteArgument {
  getAllArguments(): readonly AtomicArgumentId[];
  getAllPaths(): readonly AtomicArgumentId[][];
}

export class TreeTraversalService {
  async findDirectConnections(
    argumentId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<Result<TreeConnectionMap, ProcessingError>> {
    const argumentResult = await atomicArgumentRepo.findById(argumentId);
    if (argumentResult.isErr()) {
      return err(new ProcessingError('Argument not found'));
    }

    const argument = argumentResult.value;
    const parents = await this.findParentArguments(argument, atomicArgumentRepo);
    const children = await this.findChildArguments(argument, atomicArgumentRepo);

    const connectionMap = new TreeConnectionMapImpl(argumentId, parents, children);
    return ok(connectionMap);
  }

  async findArgumentTree(
    startArgumentId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<Result<TreeArgumentStructure, ProcessingError>> {
    const visited = new Set<string>();
    const treeArguments = new Set<AtomicArgumentId>();

    await this.traverseConnectedArguments(
      startArgumentId,
      visited,
      treeArguments,
      atomicArgumentRepo,
    );

    const structure = new TreeArgumentStructureImpl(Array.from(treeArguments));
    return ok(structure);
  }

  async findPathCompleteArgument(
    startId: AtomicArgumentId,
    endId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<Result<TreePathCompleteArgument, ProcessingError>> {
    const paths = await this.findAllPaths(startId, endId, atomicArgumentRepo);
    if (paths.length === 0) {
      return err(new ProcessingError('No path exists between arguments'));
    }

    const allArgumentsInPaths = new Set<AtomicArgumentId>();
    for (const path of paths) {
      path.forEach((argId) => allArgumentsInPaths.add(argId));
    }

    const pathCompleteArgument = new TreePathCompleteArgumentImpl(
      Array.from(allArgumentsInPaths),
      paths,
    );
    return ok(pathCompleteArgument);
  }

  private async findParentArguments(
    argument: AtomicArgument,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<AtomicArgument[]> {
    const allArgumentsResult = await atomicArgumentRepo.findAll();
    if (allArgumentsResult.isErr()) {
      return [];
    }

    const allArguments = allArgumentsResult.value;
    const parentArguments: AtomicArgument[] = [];

    for (const otherArg of allArguments) {
      if (otherArg.getId().equals(argument.getId())) continue;

      const connections = otherArg.findConnectionsTo(argument);
      if (connections.length > 0) {
        parentArguments.push(otherArg);
      }
    }

    return parentArguments;
  }

  private async findChildArguments(
    argument: AtomicArgument,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<AtomicArgument[]> {
    const allArgumentsResult = await atomicArgumentRepo.findAll();
    if (allArgumentsResult.isErr()) {
      return [];
    }

    const allArguments = allArgumentsResult.value;
    const childArguments: AtomicArgument[] = [];

    for (const otherArg of allArguments) {
      if (otherArg.getId().equals(argument.getId())) continue;

      const connections = argument.findConnectionsTo(otherArg);
      if (connections.length > 0) {
        childArguments.push(otherArg);
      }
    }

    return childArguments;
  }

  private async traverseConnectedArguments(
    currentId: AtomicArgumentId,
    visited: Set<string>,
    result: Set<AtomicArgumentId>,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<void> {
    const idString = currentId.getValue();
    if (visited.has(idString)) return;

    visited.add(idString);
    result.add(currentId);

    const connectionsResult = await this.findDirectConnections(currentId, atomicArgumentRepo);
    if (connectionsResult.isErr()) return;

    const connections = connectionsResult.value;

    for (const parent of connections.getParents()) {
      await this.traverseConnectedArguments(parent.getId(), visited, result, atomicArgumentRepo);
    }

    for (const child of connections.getChildren()) {
      await this.traverseConnectedArguments(child.getId(), visited, result, atomicArgumentRepo);
    }
  }

  private async findAllPaths(
    startId: AtomicArgumentId,
    endId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<AtomicArgumentId[][]> {
    const paths: AtomicArgumentId[][] = [];
    const currentPath: AtomicArgumentId[] = [];
    const visited = new Set<string>();

    await this.depthFirstSearch(startId, endId, currentPath, visited, paths, atomicArgumentRepo);
    return paths;
  }

  private async depthFirstSearch(
    currentId: AtomicArgumentId,
    targetId: AtomicArgumentId,
    currentPath: AtomicArgumentId[],
    visited: Set<string>,
    allPaths: AtomicArgumentId[][],
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<void> {
    const idString = currentId.getValue();
    if (visited.has(idString)) return;

    visited.add(idString);
    currentPath.push(currentId);

    if (currentId.equals(targetId)) {
      allPaths.push([...currentPath]);
    } else {
      const connectionsResult = await this.findDirectConnections(currentId, atomicArgumentRepo);
      if (connectionsResult.isOk()) {
        const connections = connectionsResult.value;
        for (const child of connections.getChildren()) {
          await this.depthFirstSearch(
            child.getId(),
            targetId,
            currentPath,
            visited,
            allPaths,
            atomicArgumentRepo,
          );
        }
      }
    }

    currentPath.pop();
    visited.delete(idString);
  }
}

class TreeConnectionMapImpl implements TreeConnectionMap {
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

class TreeArgumentStructureImpl implements TreeArgumentStructure {
  constructor(private readonly argumentIds: AtomicArgumentId[]) {}

  getAllArguments(): readonly AtomicArgumentId[] {
    return this.argumentIds;
  }

  getArgumentCount(): number {
    return this.argumentIds.length;
  }
}

class TreePathCompleteArgumentImpl implements TreePathCompleteArgument {
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
