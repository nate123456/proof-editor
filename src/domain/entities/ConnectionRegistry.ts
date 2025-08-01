import { err, ok, type Result } from 'neverthrow';
import {
  AtomicArgumentId,
  type ConnectionType,
  type StatementId,
} from '../shared/value-objects/index.js';
import { type Connection, ConnectionCollection } from '../value-objects/ConnectionCollection.js';

export class ConnectionRegistry {
  private connections: ConnectionCollection = ConnectionCollection.empty();

  registerConnection(
    fromArgumentId: AtomicArgumentId,
    toArgumentId: AtomicArgumentId,
    viaStatementId: StatementId,
    connectionType: ConnectionType,
  ): Result<void, Error> {
    const connection: Connection = {
      from: fromArgumentId,
      to: toArgumentId,
      via: viaStatementId,
      type: connectionType,
    };

    const result = this.connections.addConnection(fromArgumentId, connection);
    if (result.isErr()) {
      return err(result.error);
    }

    this.connections = result.value;
    return ok(undefined);
  }

  findConnectionsFrom(argumentId: AtomicArgumentId): Connection[] {
    return this.connections.getConnectionsFrom(argumentId);
  }

  findConnectionsTo(argumentId: AtomicArgumentId): Connection[] {
    return this.connections.getConnectionsTo(argumentId);
  }

  isDirectlyConnected(arg1Id: AtomicArgumentId, arg2Id: AtomicArgumentId): boolean {
    return this.connections.isDirectlyConnected(arg1Id, arg2Id);
  }

  hasConnections(argumentId: AtomicArgumentId): boolean {
    return this.connections.hasConnections(argumentId);
  }

  removeConnectionsFor(argumentId: AtomicArgumentId): Result<void, Error> {
    const result = this.connections.removeConnectionsFor(argumentId);
    if (result.isErr()) {
      return err(result.error);
    }

    this.connections = result.value;
    return ok(undefined);
  }

  getConnectedComponent(argumentId: AtomicArgumentId): Result<AtomicArgumentId[], Error> {
    const component = new Set<string>();
    const toVisit = [argumentId];

    while (toVisit.length > 0) {
      const current = toVisit.pop();
      if (!current) continue;
      const currentIdValue = current.getValue();

      if (component.has(currentIdValue)) {
        continue;
      }

      component.add(currentIdValue);

      const connectionsFrom = this.findConnectionsFrom(current);
      const connectionsTo = this.findConnectionsTo(current);

      for (const conn of connectionsFrom) {
        if (!component.has(conn.to.getValue())) {
          toVisit.push(conn.to);
        }
      }

      for (const conn of connectionsTo) {
        if (!component.has(conn.from.getValue())) {
          toVisit.push(conn.from);
        }
      }
    }

    const results: AtomicArgumentId[] = [];
    for (const id of Array.from(component)) {
      const result = AtomicArgumentId.fromString(id);
      if (result.isErr()) {
        return err(result.error);
      }
      results.push(result.value);
    }
    return ok(results);
  }

  clear(): void {
    this.connections = ConnectionCollection.empty();
  }

  getConnectionCount(): number {
    return this.connections.getTotalConnectionCount();
  }
}

export interface ConnectionPath {
  steps: AtomicArgumentId[];
  sharedStatements: StatementId[];
}
