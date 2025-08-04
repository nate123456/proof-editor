import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import { type AtomicArgumentId, ConnectionType } from '../shared/value-objects/index.js';

// Local type for connections returned by AtomicArgument.findConnectionsTo
interface LocalStatementConnection {
  statement: Statement;
  fromConclusionPosition: number;
}

export interface ArgumentConnection {
  type: ConnectionType;
  fromId: AtomicArgumentId;
  toId: AtomicArgumentId;
  connection: LocalStatementConnection;
}

export interface DocumentStats {
  statementCount: number;
  argumentCount: number;
  connectionCount: number;
}

export class ProofDocumentAnalysisService {
  findConnectionsForArgument(
    argumentId: AtomicArgumentId,
    atomicArguments: Map<AtomicArgumentId, AtomicArgument>,
  ): ArgumentConnection[] {
    const connections: ArgumentConnection[] = [];
    const argument = atomicArguments.get(argumentId);
    if (!argument) return connections;

    for (const other of atomicArguments.values()) {
      if (other.getId().equals(argumentId)) continue;

      const providesConnections = argument.findConnectionsTo(other);
      for (const conn of providesConnections) {
        connections.push({
          type: ConnectionType.PROVIDES,
          fromId: argumentId,
          toId: other.getId(),
          connection: conn,
        });
      }

      const consumesConnections = other.findConnectionsTo(argument);
      for (const conn of consumesConnections) {
        connections.push({
          type: ConnectionType.CONSUMES,
          fromId: other.getId(),
          toId: argumentId,
          connection: conn,
        });
      }
    }

    return connections;
  }

  findAllConnections(atomicArguments: Map<AtomicArgumentId, AtomicArgument>): ArgumentConnection[] {
    const connections: ArgumentConnection[] = [];
    const argumentArray = Array.from(atomicArguments.values());

    for (let i = 0; i < argumentArray.length; i++) {
      for (let j = i + 1; j < argumentArray.length; j++) {
        const arg1 = argumentArray[i];
        const arg2 = argumentArray[j];
        if (!arg1 || !arg2) continue;

        const connections1to2 = arg1.findConnectionsTo(arg2);
        for (const conn of connections1to2) {
          connections.push({
            type: ConnectionType.PROVIDES,
            fromId: arg1.getId(),
            toId: arg2.getId(),
            connection: conn,
          });
        }

        const connections2to1 = arg2.findConnectionsTo(arg1);
        for (const conn of connections2to1) {
          connections.push({
            type: ConnectionType.PROVIDES,
            fromId: arg2.getId(),
            toId: arg1.getId(),
            connection: conn,
          });
        }
      }
    }

    return connections;
  }

  getStats(
    statementsSize: number,
    atomicArguments: Map<AtomicArgumentId, AtomicArgument>,
  ): DocumentStats {
    const connections = this.findAllConnections(atomicArguments);
    return {
      statementCount: statementsSize,
      argumentCount: atomicArguments.size,
      connectionCount: connections.length,
    };
  }
}
