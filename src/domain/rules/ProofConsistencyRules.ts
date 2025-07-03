import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Node } from '../entities/Node.js';
import type { Statement } from '../entities/Statement.js';
import type { AtomicArgumentId, NodeId, StatementId } from '../shared/value-objects.js';

export class ConsistencyError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message);
    this.name = 'ConsistencyError';
    this.cause = cause;
  }
}

export class TreeConsistencyError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message);
    this.name = 'TreeConsistencyError';
    this.cause = cause;
  }
}

export function validateStatementUsage(
  statements: Map<StatementId, Statement>,
  argumentsMap: Map<AtomicArgumentId, AtomicArgument>,
): Result<void, ConsistencyError> {
  try {
    for (const [statementId, statement] of statements) {
      let actualUsageCount = 0;

      for (const argument of argumentsMap.values()) {
        const premiseSetId = argument.getPremiseSetRef();
        const conclusionSetId = argument.getConclusionSetRef();

        if (premiseSetId) {
          actualUsageCount++;
        }
        if (conclusionSetId) {
          actualUsageCount++;
        }
      }

      if (statement.getUsageCount() !== actualUsageCount) {
        return err(
          new ConsistencyError('Statement usage count mismatch', {
            statementId: statementId.getValue(),
            expectedUsage: actualUsageCount,
            actualUsage: statement.getUsageCount(),
          }),
        );
      }

      if (statement.getUsageCount() === 0 && argumentsMap.size > 0) {
        return err(
          new ConsistencyError('Orphaned statement detected', {
            statementId: statementId.getValue(),
            content: statement.getContent(),
          }),
        );
      }
    }

    return ok(undefined);
  } catch (error) {
    return err(new ConsistencyError('Statement usage validation failed', {}, error as Error));
  }
}

export function validateArgumentConnections(
  argumentsMap: Map<AtomicArgumentId, AtomicArgument>,
): Result<void, ConsistencyError> {
  try {
    const connectionGraph = new Map<AtomicArgumentId, AtomicArgumentId[]>();

    for (const [argumentId, argument] of argumentsMap) {
      connectionGraph.set(argumentId, []);

      for (const [otherArgumentId, otherArgument] of argumentsMap) {
        if (argumentId.equals(otherArgumentId)) {
          continue;
        }

        if (argument.canConnectTo(otherArgument)) {
          connectionGraph.get(argumentId)?.push(otherArgumentId);
        }
      }
    }

    const cycleDetection = detectArgumentCycles(connectionGraph);
    if (cycleDetection.hasCycles) {
      return err(
        new ConsistencyError('Argument connections contain cycles', {
          cycles: cycleDetection.cycles.map((cycle) => cycle.map((id) => id.getValue())),
        }),
      );
    }

    for (const argument of argumentsMap.values()) {
      const premiseSetId = argument.getPremiseSetRef();
      const conclusionSetId = argument.getConclusionSetRef();

      if (premiseSetId && conclusionSetId && premiseSetId.equals(conclusionSetId)) {
        return err(
          new ConsistencyError('Argument has same premise and conclusion set', {
            argumentId: argument.getId().getValue(),
            setId: premiseSetId.getValue(),
          }),
        );
      }
    }

    return ok(undefined);
  } catch (error) {
    return err(new ConsistencyError('Argument connection validation failed', {}, error as Error));
  }
}

export function validateTreeStructure(
  nodes: Map<NodeId, Node>,
): Result<void, TreeConsistencyError> {
  try {
    const parentChildMap = new Map<NodeId, NodeId[]>();
    const childParentMap = new Map<NodeId, NodeId>();

    for (const [nodeId, node] of nodes) {
      if (node.isRoot()) {
        continue;
      }

      const parentId = node.getParentNodeId();
      if (!parentId) {
        return err(
          new TreeConsistencyError('Non-root node without parent', {
            nodeId: nodeId.getValue(),
          }),
        );
      }

      if (!nodes.has(parentId)) {
        return err(
          new TreeConsistencyError('Node references non-existent parent', {
            nodeId: nodeId.getValue(),
            parentId: parentId.getValue(),
          }),
        );
      }

      if (!parentChildMap.has(parentId)) {
        parentChildMap.set(parentId, []);
      }
      parentChildMap.get(parentId)?.push(nodeId);
      childParentMap.set(nodeId, parentId);
    }

    const cycleDetection = detectTreeCycles(parentChildMap);
    if (cycleDetection.hasCycles) {
      return err(
        new TreeConsistencyError('Tree structure contains cycles', {
          cycles: cycleDetection.cycles.map((cycle) => cycle.map((id) => id.getValue())),
        }),
      );
    }

    for (const [nodeId, node] of nodes) {
      if (node.isChild()) {
        const position = node.getPremisePosition();
        if (position !== null && position < 0) {
          return err(
            new TreeConsistencyError('Invalid premise position', {
              nodeId: nodeId.getValue(),
              position,
            }),
          );
        }

        const parentId = node.getParentNodeId();
        if (parentId) {
          const siblings = parentChildMap.get(parentId) || [];
          const positionCount = siblings.filter((siblingId) => {
            const sibling = nodes.get(siblingId);
            return sibling?.getPremisePosition() === position;
          }).length;

          if (positionCount > 1) {
            return err(
              new TreeConsistencyError('Multiple nodes at same position', {
                parentId: parentId.getValue(),
                position,
                nodeCount: positionCount,
              }),
            );
          }
        }
      }
    }

    return ok(undefined);
  } catch (error) {
    return err(new TreeConsistencyError('Tree structure validation failed', {}, error as Error));
  }
}

export function validateAggregateConsistency(
  statements: Map<StatementId, Statement>,
  argumentsMap: Map<AtomicArgumentId, AtomicArgument>,
  nodes?: Map<NodeId, Node>,
): Result<void, ConsistencyError> {
  const statementValidation = validateStatementUsage(statements, argumentsMap);
  if (statementValidation.isErr()) {
    return err(statementValidation.error);
  }

  const argumentValidation = validateArgumentConnections(argumentsMap);
  if (argumentValidation.isErr()) {
    return err(argumentValidation.error);
  }

  if (nodes) {
    const treeValidation = validateTreeStructure(nodes);
    if (treeValidation.isErr()) {
      return err(
        new ConsistencyError(
          'Tree structure validation failed',
          { originalError: treeValidation.error.message },
          treeValidation.error,
        ),
      );
    }
  }

  return ok(undefined);
}

function detectArgumentCycles(connectionGraph: Map<AtomicArgumentId, AtomicArgumentId[]>): {
  hasCycles: boolean;
  cycles: AtomicArgumentId[][];
} {
  const visited = new Set<AtomicArgumentId>();
  const recursionStack = new Set<AtomicArgumentId>();
  const cycles: AtomicArgumentId[][] = [];

  const detectCycleFromNode = (nodeId: AtomicArgumentId, path: AtomicArgumentId[]): void => {
    if (recursionStack.has(nodeId)) {
      const cycleStartIndex = path.findIndex((id) => id.equals(nodeId));
      if (cycleStartIndex !== -1) {
        cycles.push(path.slice(cycleStartIndex));
      }
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const connections = connectionGraph.get(nodeId) || [];
    for (const connectedId of connections) {
      detectCycleFromNode(connectedId, [...path, connectedId]);
    }

    recursionStack.delete(nodeId);
  };

  for (const [nodeId] of connectionGraph) {
    if (!visited.has(nodeId)) {
      detectCycleFromNode(nodeId, [nodeId]);
    }
  }

  return {
    hasCycles: cycles.length > 0,
    cycles,
  };
}

function detectTreeCycles(parentChildMap: Map<NodeId, NodeId[]>): {
  hasCycles: boolean;
  cycles: NodeId[][];
} {
  const visited = new Set<NodeId>();
  const recursionStack = new Set<NodeId>();
  const cycles: NodeId[][] = [];

  const detectCycleFromNode = (nodeId: NodeId, path: NodeId[]): void => {
    if (recursionStack.has(nodeId)) {
      const cycleStartIndex = path.findIndex((id) => id.equals(nodeId));
      if (cycleStartIndex !== -1) {
        cycles.push(path.slice(cycleStartIndex));
      }
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const children = parentChildMap.get(nodeId) || [];
    for (const childId of children) {
      detectCycleFromNode(childId, [...path, childId]);
    }

    recursionStack.delete(nodeId);
  };

  for (const [nodeId] of parentChildMap) {
    if (!visited.has(nodeId)) {
      detectCycleFromNode(nodeId, [nodeId]);
    }
  }

  return {
    hasCycles: cycles.length > 0,
    cycles,
  };
}
