import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';
import { ValueObject } from '../shared/value-objects/common.js';
import type { ConnectionType } from '../shared/value-objects/enums.js';
import type { AtomicArgumentId, StatementId } from '../shared/value-objects/identifiers.js';

export interface Connection {
  from: AtomicArgumentId;
  to: AtomicArgumentId;
  via: StatementId;
  type: ConnectionType;
}

export class ConnectionCollection extends ValueObject<Map<string, Connection[]>> {
  private constructor(connections: Map<string, Connection[]>) {
    super(connections);
  }

  static create(
    connections: Map<string, Connection[]> = new Map(),
  ): Result<ConnectionCollection, ValidationError> {
    for (const [key, connectionList] of connections) {
      if (!key || key.trim().length === 0) {
        return err(new ValidationError('Connection key cannot be empty'));
      }

      if (!Array.isArray(connectionList)) {
        return err(new ValidationError('Connection value must be an array'));
      }

      for (const connection of connectionList) {
        if (!connection.from || !connection.to || !connection.via || !connection.type) {
          return err(
            new ValidationError('Connection must have from, to, via, and type properties'),
          );
        }
      }
    }

    return ok(new ConnectionCollection(new Map(connections)));
  }

  static empty(): ConnectionCollection {
    return new ConnectionCollection(new Map());
  }

  addConnection(
    fromArgumentId: AtomicArgumentId,
    connection: Connection,
  ): Result<ConnectionCollection, ValidationError> {
    const newConnections = new Map(this.value);
    const key = fromArgumentId.getValue();

    if (!newConnections.has(key)) {
      newConnections.set(key, []);
    }

    const connectionList = newConnections.get(key);
    if (!connectionList) {
      return err(new ValidationError('Connection list not found for key'));
    }
    const updatedList = [...connectionList, connection];
    newConnections.set(key, updatedList);

    return ConnectionCollection.create(newConnections);
  }

  getConnectionsFrom(argumentId: AtomicArgumentId): Connection[] {
    const connections = this.value.get(argumentId.getValue());
    return connections ? [...connections] : [];
  }

  getConnectionsTo(argumentId: AtomicArgumentId): Connection[] {
    const connections: Connection[] = [];
    const targetId = argumentId.getValue();

    for (const connectionList of this.value.values()) {
      for (const connection of connectionList) {
        if (connection.to.getValue() === targetId) {
          connections.push(connection);
        }
      }
    }

    return connections;
  }

  hasConnections(argumentId: AtomicArgumentId): boolean {
    return (
      this.getConnectionsFrom(argumentId).length > 0 || this.getConnectionsTo(argumentId).length > 0
    );
  }

  isDirectlyConnected(arg1Id: AtomicArgumentId, arg2Id: AtomicArgumentId): boolean {
    const connectionsFrom1 = this.getConnectionsFrom(arg1Id);
    const connectionsFrom2 = this.getConnectionsFrom(arg2Id);

    const arg2IdValue = arg2Id.getValue();
    const arg1IdValue = arg1Id.getValue();

    return (
      connectionsFrom1.some((conn) => conn.to.getValue() === arg2IdValue) ||
      connectionsFrom2.some((conn) => conn.to.getValue() === arg1IdValue)
    );
  }

  removeConnectionsFor(
    argumentId: AtomicArgumentId,
  ): Result<ConnectionCollection, ValidationError> {
    const newConnections = new Map(this.value);
    const argIdValue = argumentId.getValue();

    newConnections.delete(argIdValue);

    for (const [key, connectionList] of newConnections) {
      const filtered = connectionList.filter((conn) => conn.to.getValue() !== argIdValue);
      if (filtered.length === 0) {
        newConnections.delete(key);
      } else {
        newConnections.set(key, filtered);
      }
    }

    return ConnectionCollection.create(newConnections);
  }

  getTotalConnectionCount(): number {
    let count = 0;
    for (const connectionList of this.value.values()) {
      count += connectionList.length;
    }
    return count;
  }

  getAllConnections(): Connection[] {
    const allConnections: Connection[] = [];
    for (const connectionList of this.value.values()) {
      allConnections.push(...connectionList);
    }
    return allConnections;
  }

  clear(): ConnectionCollection {
    return ConnectionCollection.empty();
  }

  isEmpty(): boolean {
    return this.value.size === 0;
  }

  equals(other: ConnectionCollection): boolean {
    if (this.value.size !== other.value.size) {
      return false;
    }

    for (const [key, connections] of this.value) {
      const otherConnections = other.value.get(key);
      if (!otherConnections || connections.length !== otherConnections.length) {
        return false;
      }

      for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        const otherConn = otherConnections[i];
        if (
          !conn.from.equals(otherConn.from) ||
          !conn.to.equals(otherConn.to) ||
          !conn.via.equals(otherConn.via) ||
          conn.type !== otherConn.type
        ) {
          return false;
        }
      }
    }

    return true;
  }
}
