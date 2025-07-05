import type { DomainEvent, DomainEventHandler } from '../../domain/events/base-event.js';
import type { OrderedSetBecameShared } from '../../domain/events/proof-document-events.js';

/**
 * Tracks connections between atomic arguments via shared OrderedSets.
 * This is a read model that gets updated by domain events.
 */
export class ConnectionTracker implements DomainEventHandler<OrderedSetBecameShared> {
  private sharedSets = new Map<string, Set<string>>();

  /**
   * Handle OrderedSetBecameShared events to track connections
   */
  handle(event: OrderedSetBecameShared): void {
    const connections = new Set<string>();
    for (const usage of event.eventData.usages) {
      const [argumentId] = usage.split(':');
      if (argumentId) {
        connections.add(argumentId);
      }
    }
    this.sharedSets.set(event.eventData.orderedSetId, connections);
  }

  /**
   * Type guard to determine if this handler can process the event
   */
  canHandle(event: DomainEvent): event is OrderedSetBecameShared {
    return event.eventType === 'OrderedSetBecameShared';
  }

  /**
   * Get all argument IDs that share a specific OrderedSet
   */
  getSharedConnections(orderedSetId: string): string[] {
    return Array.from(this.sharedSets.get(orderedSetId) || []);
  }

  /**
   * Get all shared OrderedSet IDs
   */
  getAllSharedOrderedSets(): string[] {
    return Array.from(this.sharedSets.keys());
  }

  /**
   * Check if a specific OrderedSet is shared between arguments
   */
  isOrderedSetShared(orderedSetId: string): boolean {
    const connections = this.sharedSets.get(orderedSetId);
    return connections ? connections.size > 1 : false;
  }

  /**
   * Get connection graph data for visualization
   */
  getConnectionGraph(): Array<{
    orderedSetId: string;
    connectedArguments: string[];
    connectionCount: number;
  }> {
    const graph: Array<{
      orderedSetId: string;
      connectedArguments: string[];
      connectionCount: number;
    }> = [];

    for (const [orderedSetId, connections] of this.sharedSets.entries()) {
      graph.push({
        orderedSetId,
        connectedArguments: Array.from(connections),
        connectionCount: connections.size,
      });
    }

    return graph;
  }

  /**
   * Find all arguments that are connected to a specific argument
   */
  findConnectedArguments(argumentId: string): Array<{
    argumentId: string;
    viaOrderedSetId: string;
  }> {
    const connected: Array<{
      argumentId: string;
      viaOrderedSetId: string;
    }> = [];

    for (const [orderedSetId, connections] of this.sharedSets.entries()) {
      if (connections.has(argumentId)) {
        for (const connectedArg of connections) {
          if (connectedArg !== argumentId) {
            connected.push({
              argumentId: connectedArg,
              viaOrderedSetId: orderedSetId,
            });
          }
        }
      }
    }

    return connected;
  }

  /**
   * Clear all tracked connections (useful for testing)
   */
  clear(): void {
    this.sharedSets.clear();
  }

  /**
   * Get summary statistics about connections
   */
  getConnectionStats(): {
    totalSharedSets: number;
    totalConnectedArguments: number;
    averageConnectionsPerSet: number;
    maxConnectionsInSingleSet: number;
  } {
    const totalSharedSets = this.sharedSets.size;
    let totalConnectedArguments = 0;
    let maxConnectionsInSingleSet = 0;

    const uniqueArguments = new Set<string>();

    for (const connections of this.sharedSets.values()) {
      totalConnectedArguments += connections.size;
      maxConnectionsInSingleSet = Math.max(maxConnectionsInSingleSet, connections.size);

      for (const arg of connections) {
        uniqueArguments.add(arg);
      }
    }

    return {
      totalSharedSets,
      totalConnectedArguments: uniqueArguments.size,
      averageConnectionsPerSet: totalSharedSets > 0 ? totalConnectedArguments / totalSharedSets : 0,
      maxConnectionsInSingleSet,
    };
  }
}
