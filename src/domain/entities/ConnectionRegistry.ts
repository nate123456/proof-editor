import { err, ok, type Result } from '../shared/result.js';
import { AtomicArgumentId, type OrderedSetId } from '../shared/value-objects.js';

/**
 * ConnectionRegistry tracks HOW arguments connect through shared OrderedSets.
 * This is about logical connections, NOT visual tree positioning.
 *
 * Key insight: Connections exist when AtomicArguments share the same OrderedSet object reference.
 * This registry provides efficient lookup and path-finding capabilities.
 */
export class ConnectionRegistry {
  private connections: Map<string, Connection[]> = new Map();

  /**
   * Register a connection between two AtomicArguments via a shared OrderedSet.
   *
   * @param fromArgumentId - The argument providing output
   * @param toArgumentId - The argument consuming input
   * @param viaOrderedSetId - The shared OrderedSet that creates the connection
   * @param connectionType - Whether the shared set is used as premise or conclusion
   */
  registerConnection(
    fromArgumentId: AtomicArgumentId,
    toArgumentId: AtomicArgumentId,
    viaOrderedSetId: OrderedSetId,
    connectionType: 'provides' | 'consumes',
  ): void {
    const key = fromArgumentId.getValue();
    if (!this.connections.has(key)) {
      this.connections.set(key, []);
    }

    const connectionList = this.connections.get(key);
    if (connectionList) {
      connectionList.push({
        from: fromArgumentId,
        to: toArgumentId,
        via: viaOrderedSetId,
        type: connectionType,
      });
    }
  }

  /**
   * Find all connections originating from a specific argument.
   */
  findConnectionsFrom(argumentId: AtomicArgumentId): Connection[] {
    return this.connections.get(argumentId.getValue()) || [];
  }

  /**
   * Find all connections leading to a specific argument.
   */
  findConnectionsTo(argumentId: AtomicArgumentId): Connection[] {
    const connections: Connection[] = [];
    const targetId = argumentId.getValue();

    for (const connectionList of Array.from(this.connections.values())) {
      for (const connection of connectionList) {
        if (connection.to.getValue() === targetId) {
          connections.push(connection);
        }
      }
    }

    return connections;
  }

  /**
   * Check if two arguments are directly connected via shared OrderedSet.
   */
  areDirectlyConnected(arg1Id: AtomicArgumentId, arg2Id: AtomicArgumentId): boolean {
    const connectionsFrom1 = this.findConnectionsFrom(arg1Id);
    const connectionsFrom2 = this.findConnectionsFrom(arg2Id);

    const arg2IdValue = arg2Id.getValue();
    const arg1IdValue = arg1Id.getValue();

    return (
      connectionsFrom1.some((conn) => conn.to.getValue() === arg2IdValue) ||
      connectionsFrom2.some((conn) => conn.to.getValue() === arg1IdValue)
    );
  }

  /**
   * Check if an argument has any connections.
   */
  hasConnections(argumentId: AtomicArgumentId): boolean {
    return (
      this.findConnectionsFrom(argumentId).length > 0 ||
      this.findConnectionsTo(argumentId).length > 0
    );
  }

  /**
   * Remove all connections involving a specific argument.
   * Used when an argument is deleted.
   */
  removeConnectionsFor(argumentId: AtomicArgumentId): void {
    const argIdValue = argumentId.getValue();

    // Remove connections from this argument
    this.connections.delete(argIdValue);

    // Remove connections to this argument
    for (const [key, connectionList] of Array.from(this.connections.entries())) {
      const filtered = connectionList.filter((conn) => conn.to.getValue() !== argIdValue);
      if (filtered.length === 0) {
        this.connections.delete(key);
      } else {
        this.connections.set(key, filtered);
      }
    }
  }

  /**
   * Get all arguments that are connected (directly or indirectly) to the given argument.
   * This represents a connected component in graph theory terms.
   */
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

      // Add all connected arguments
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

  /**
   * Clear all connections. Used for testing or reset scenarios.
   */
  clear(): void {
    this.connections.clear();
  }

  /**
   * Get total number of registered connections.
   */
  getConnectionCount(): number {
    let count = 0;
    for (const connectionList of Array.from(this.connections.values())) {
      count += connectionList.length;
    }
    return count;
  }
}

export interface Connection {
  from: AtomicArgumentId;
  to: AtomicArgumentId;
  via: OrderedSetId;
  type: 'provides' | 'consumes';
}

export interface ConnectionPath {
  steps: AtomicArgumentId[];
  sharedSets: OrderedSetId[];
}
