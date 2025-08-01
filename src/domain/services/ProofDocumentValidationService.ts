import type { AtomicArgument } from '../entities/AtomicArgument.js';
import {
  type AtomicArgumentId,
  ConnectionInconsistencyDetails,
  ConnectionInconsistencyType,
  ConnectionType,
  CycleSeverity,
} from '../shared/value-objects/index.js';

export interface ArgumentConnection {
  type: ConnectionType;
  fromId: AtomicArgumentId;
  toId: AtomicArgumentId;
}

export interface ArgumentCycle {
  path: AtomicArgumentId[];
  severity: CycleSeverity;
}

export interface ConnectionInconsistency {
  type: ConnectionInconsistencyType;
  argumentId: AtomicArgumentId;
  details: ConnectionInconsistencyDetails;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  cycles: ArgumentCycle[];
  orphans: AtomicArgumentId[];
  inconsistencies: ConnectionInconsistency[];
}

export class ProofDocumentValidationService {
  validateConnections(
    atomicArguments: Map<AtomicArgumentId, AtomicArgument>,
    findConnectionsForArgument: (id: AtomicArgumentId) => ArgumentConnection[],
  ): ConnectionValidationResult {
    const cycles = this.detectCycles(atomicArguments, findConnectionsForArgument);
    const orphans = this.findOrphanedArguments(atomicArguments, findConnectionsForArgument);
    const inconsistencies = this.findInconsistentConnections(atomicArguments);

    return {
      isValid: cycles.length === 0 && inconsistencies.length === 0,
      cycles,
      orphans,
      inconsistencies,
    };
  }

  private detectCycles(
    atomicArguments: Map<AtomicArgumentId, AtomicArgument>,
    findConnectionsForArgument: (id: AtomicArgumentId) => ArgumentConnection[],
  ): ArgumentCycle[] {
    const cycles: ArgumentCycle[] = [];
    const visited = new Set<AtomicArgumentId>();
    const recursionStack = new Set<AtomicArgumentId>();

    for (const argument of Array.from(atomicArguments.values())) {
      if (!visited.has(argument.getId())) {
        this.detectCyclesHelper(
          argument.getId(),
          visited,
          recursionStack,
          [],
          cycles,
          findConnectionsForArgument,
        );
      }
    }

    return cycles;
  }

  private detectCyclesHelper(
    argumentId: AtomicArgumentId,
    visited: Set<AtomicArgumentId>,
    recursionStack: Set<AtomicArgumentId>,
    path: AtomicArgumentId[],
    cycles: ArgumentCycle[],
    findConnectionsForArgument: (id: AtomicArgumentId) => ArgumentConnection[],
  ): void {
    visited.add(argumentId);
    recursionStack.add(argumentId);
    path.push(argumentId);

    const connections = findConnectionsForArgument(argumentId);
    for (const connection of connections) {
      if (connection.type === ConnectionType.PROVIDES) {
        if (!visited.has(connection.toId)) {
          this.detectCyclesHelper(
            connection.toId,
            visited,
            recursionStack,
            path,
            cycles,
            findConnectionsForArgument,
          );
        } else if (recursionStack.has(connection.toId)) {
          const cycleStartIndex = path.findIndex((id) => id.equals(connection.toId));
          if (cycleStartIndex >= 0) {
            cycles.push({
              path: path.slice(cycleStartIndex),
              severity: CycleSeverity.MEDIUM,
            });
          }
        }
      }
    }

    path.pop();
    recursionStack.delete(argumentId);
  }

  private findOrphanedArguments(
    atomicArguments: Map<AtomicArgumentId, AtomicArgument>,
    findConnectionsForArgument: (id: AtomicArgumentId) => ArgumentConnection[],
  ): AtomicArgumentId[] {
    const orphans: AtomicArgumentId[] = [];
    for (const arg of Array.from(atomicArguments.values())) {
      const connections = findConnectionsForArgument(arg.getId());
      if (connections.length === 0 && !arg.isBootstrap()) {
        orphans.push(arg.getId());
      }
    }
    return orphans;
  }

  private findInconsistentConnections(
    atomicArguments: Map<AtomicArgumentId, AtomicArgument>,
  ): ConnectionInconsistency[] {
    const inconsistencies: ConnectionInconsistency[] = [];

    for (const arg of Array.from(atomicArguments.values())) {
      if (!arg.isBootstrap() && arg.getPremiseCount() === 0) {
        inconsistencies.push({
          type: ConnectionInconsistencyType.MISSING_PREMISE,
          argumentId: arg.getId(),
          details: ConnectionInconsistencyDetails.missingPremise(),
        });
      }

      if (arg.getConclusionCount() > 0) {
        let hasConsumer = false;
        for (const other of atomicArguments.values()) {
          if (!other.getId().equals(arg.getId()) && arg.findConnectionsTo(other).length > 0) {
            hasConsumer = true;
            break;
          }
        }
        if (!hasConsumer) {
          inconsistencies.push({
            type: ConnectionInconsistencyType.DANGLING_CONCLUSION,
            argumentId: arg.getId(),
            details: ConnectionInconsistencyDetails.danglingConclusion(),
          });
        }
      }
    }

    return inconsistencies;
  }
}
