import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Node } from '../entities/Node.js';
import type { Statement } from '../entities/Statement.js';
import type { AtomicArgumentId, NodeId, StatementId } from '../shared/value-objects/index.js';

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
  hasNodes = false,
): Result<void, ConsistencyError> {
  try {
    // Count total statement references in arguments
    let totalStatementReferences = 0;
    for (const argument of Array.from(argumentsMap.values())) {
      totalStatementReferences += argument.getPremiseCount();
      totalStatementReferences += argument.getConclusionCount();
    }

    // Calculate total usage across all statements
    let totalStatementUsage = 0;
    for (const statement of Array.from(statements.values())) {
      totalStatementUsage += statement.getUsageCount();
    }

    // If there are statement references, the total usage should match
    if (totalStatementReferences !== totalStatementUsage) {
      return err(
        new ConsistencyError('Statement usage count mismatch', {
          expectedTotalUsage: totalStatementReferences,
          actualTotalUsage: totalStatementUsage,
        }),
      );
    }

    // Check for orphaned statements - statements with 0 usage when there are arguments in system
    // When nodes are present, statement usage validation is more relaxed
    for (const [statementId, statement] of Array.from(statements.entries())) {
      if (statement.getUsageCount() === 0 && argumentsMap.size > 0 && !hasNodes) {
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

    for (const [argumentId, argument] of Array.from(argumentsMap.entries())) {
      connectionGraph.set(argumentId, []);

      for (const [otherArgumentId, otherArgument] of Array.from(argumentsMap.entries())) {
        if (argumentId.equals(otherArgumentId)) {
          continue;
        }

        // Check if this argument can connect to the other
        const connections = argument.findConnectionsTo(otherArgument);
        if (connections.length > 0) {
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

    for (const argument of Array.from(argumentsMap.values())) {
      const premises = argument.getPremises();
      const conclusions = argument.getConclusions();

      // Check if any premise is also a conclusion in the same argument
      const hasSamePremiseAndConclusion = premises.some((premise) =>
        conclusions.some((conclusion) => premise.getId().equals(conclusion.getId())),
      );

      if (hasSamePremiseAndConclusion) {
        return err(
          new ConsistencyError('Argument has statement that is both premise and conclusion', {
            argumentId: argument.getId().getValue(),
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

    for (const [nodeId, node] of Array.from(nodes.entries())) {
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

    for (const [nodeId, node] of Array.from(nodes.entries())) {
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
  const statementValidation = validateStatementUsage(statements, argumentsMap, !!nodes);
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

  for (const [nodeId] of Array.from(connectionGraph.entries())) {
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

  for (const [nodeId] of Array.from(parentChildMap.entries())) {
    if (!visited.has(nodeId)) {
      detectCycleFromNode(nodeId, [nodeId]);
    }
  }

  return {
    hasCycles: cycles.length > 0,
    cycles,
  };
}
