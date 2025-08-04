import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectionRegistry } from '../../entities/ConnectionRegistry.js';
import { AtomicArgumentId, ConnectionType, StatementId } from '../../shared/value-objects/index.js';

describe('ConnectionRegistry', () => {
  let registry: ConnectionRegistry;
  let arg1Id: AtomicArgumentId;
  let arg2Id: AtomicArgumentId;
  let arg3Id: AtomicArgumentId;
  let statementId1: StatementId;
  let statementId2: StatementId;

  beforeEach(() => {
    registry = new ConnectionRegistry();
    arg1Id = AtomicArgumentId.generate();
    arg2Id = AtomicArgumentId.generate();
    arg3Id = AtomicArgumentId.generate();
    statementId1 = StatementId.generate();
    statementId2 = StatementId.generate();
  });

  describe('registerConnection', () => {
    it('should register a new connection successfully', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      const connections = registry.findConnectionsFrom(arg1Id);
      expect(connections).toHaveLength(1);
      expect(connections[0]?.from).toEqual(arg1Id);
      expect(connections[0]?.to).toEqual(arg2Id);
      expect(connections[0]?.via).toEqual(statementId1);
      expect(connections[0]?.type).toBe('provides');
    });

    it('should register multiple connections from same argument', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg1Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      const connections = registry.findConnectionsFrom(arg1Id);
      expect(connections).toHaveLength(2);

      const connection1 = connections.find((c) => c.to.getValue() === arg2Id.getValue());
      const connection2 = connections.find((c) => c.to.getValue() === arg3Id.getValue());

      expect(connection1).toBeDefined();
      expect(connection2).toBeDefined();
      expect(connection1?.type).toBe('provides');
      expect(connection2?.type).toBe(ConnectionType.CONSUMES);
    });

    it('should handle provides connection type', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      const connections = registry.findConnectionsFrom(arg1Id);
      expect(connections[0]?.type).toBe('provides');
    });

    it('should handle consumes connection type', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.CONSUMES);

      const connections = registry.findConnectionsFrom(arg1Id);
      expect(connections[0]?.type).toBe(ConnectionType.CONSUMES);
    });

    it('should create connection list for new argument', () => {
      expect(registry.findConnectionsFrom(arg1Id)).toHaveLength(0);

      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      expect(registry.findConnectionsFrom(arg1Id)).toHaveLength(1);
    });
  });

  describe('findConnectionsFrom', () => {
    it('should return empty array for argument with no outgoing connections', () => {
      const connections = registry.findConnectionsFrom(arg1Id);
      expect(connections).toEqual([]);
    });

    it('should return all connections from a specific argument', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg1Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      const connections = registry.findConnectionsFrom(arg1Id);
      expect(connections).toHaveLength(2);
    });

    it('should not return connections from other arguments', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      const connectionsFromArg1 = registry.findConnectionsFrom(arg1Id);
      expect(connectionsFromArg1).toHaveLength(1);
      expect(connectionsFromArg1[0]?.to).toEqual(arg2Id);
    });
  });

  describe('findConnectionsTo', () => {
    it('should return empty array for argument with no incoming connections', () => {
      const connections = registry.findConnectionsTo(arg1Id);
      expect(connections).toEqual([]);
    });

    it('should return all connections to a specific argument', () => {
      registry.registerConnection(arg1Id, arg3Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      const connections = registry.findConnectionsTo(arg3Id);
      expect(connections).toHaveLength(2);

      const fromArg1 = connections.find((c) => c.from.getValue() === arg1Id.getValue());
      const fromArg2 = connections.find((c) => c.from.getValue() === arg2Id.getValue());

      expect(fromArg1).toBeDefined();
      expect(fromArg2).toBeDefined();
    });

    it('should not return connections to other arguments', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg1Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      const connectionsToArg2 = registry.findConnectionsTo(arg2Id);
      expect(connectionsToArg2).toHaveLength(1);
      expect(connectionsToArg2[0]?.from).toEqual(arg1Id);
    });
  });

  describe('isDirectlyConnected', () => {
    it('should return true for directly connected arguments (forward direction)', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      expect(registry.isDirectlyConnected(arg1Id, arg2Id)).toBe(true);
    });

    it('should return true for directly connected arguments (reverse direction)', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      expect(registry.isDirectlyConnected(arg2Id, arg1Id)).toBe(true);
    });

    it('should return false for not connected arguments', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      expect(registry.isDirectlyConnected(arg1Id, arg3Id)).toBe(false);
      expect(registry.isDirectlyConnected(arg3Id, arg1Id)).toBe(false);
    });

    it('should return false for empty registry', () => {
      expect(registry.isDirectlyConnected(arg1Id, arg2Id)).toBe(false);
    });

    it('should handle bidirectional connections correctly', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg1Id, statementId2, ConnectionType.CONSUMES);

      expect(registry.isDirectlyConnected(arg1Id, arg2Id)).toBe(true);
      expect(registry.isDirectlyConnected(arg2Id, arg1Id)).toBe(true);
    });
  });

  describe('hasConnections', () => {
    it('should return false for argument with no connections', () => {
      expect(registry.hasConnections(arg1Id)).toBe(false);
    });

    it('should return true for argument with outgoing connections', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      expect(registry.hasConnections(arg1Id)).toBe(true);
    });

    it('should return true for argument with incoming connections', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      expect(registry.hasConnections(arg2Id)).toBe(true);
    });

    it('should return true for argument with both incoming and outgoing connections', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      expect(registry.hasConnections(arg2Id)).toBe(true);
    });
  });

  describe('removeConnectionsFor', () => {
    beforeEach(() => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);
      registry.registerConnection(arg1Id, arg3Id, statementId1, ConnectionType.PROVIDES);
    });

    it('should remove all outgoing connections for an argument', () => {
      registry.removeConnectionsFor(arg1Id);

      expect(registry.findConnectionsFrom(arg1Id)).toHaveLength(0);
    });

    it('should remove all incoming connections for an argument', () => {
      registry.removeConnectionsFor(arg3Id);

      expect(registry.findConnectionsTo(arg3Id)).toHaveLength(0);
    });

    it('should remove connections in both directions', () => {
      registry.removeConnectionsFor(arg2Id);

      expect(registry.findConnectionsFrom(arg2Id)).toHaveLength(0);
      expect(registry.findConnectionsTo(arg2Id)).toHaveLength(0);
    });

    it('should not affect connections not involving the argument', () => {
      registry.removeConnectionsFor(arg2Id);

      const connectionsFromArg1 = registry.findConnectionsFrom(arg1Id);
      expect(connectionsFromArg1).toHaveLength(1);
      expect(connectionsFromArg1[0]?.to).toEqual(arg3Id);
    });

    it('should clean up empty connection lists', () => {
      registry.removeConnectionsFor(arg2Id);
      registry.removeConnectionsFor(arg3Id);

      // After removing all connections from arg1, the key should still exist but with empty list
      const connectionsFromArg1 = registry.findConnectionsFrom(arg1Id);
      expect(connectionsFromArg1).toHaveLength(0);
    });

    it('should handle removing non-existent argument gracefully', () => {
      const nonExistentId = AtomicArgumentId.generate();

      expect(() => registry.removeConnectionsFor(nonExistentId)).not.toThrow();

      // Original connections should remain intact
      expect(registry.findConnectionsFrom(arg1Id)).toHaveLength(2);
      expect(registry.findConnectionsFrom(arg2Id)).toHaveLength(1);
    });
  });

  describe('getConnectedComponent', () => {
    it('should return single argument for isolated argument', () => {
      const result = registry.getConnectedComponent(arg1Id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.getValue()).toBe(arg1Id.getValue());
      }
    });

    it('should return connected component for connected arguments', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      const result = registry.getConnectedComponent(arg1Id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);

        const ids = result.value.map((id) => id.getValue());
        expect(ids).toContain(arg1Id.getValue());
        expect(ids).toContain(arg2Id.getValue());
        expect(ids).toContain(arg3Id.getValue());
      }
    });

    it('should handle cyclic connections without infinite loop', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);
      registry.registerConnection(arg3Id, arg1Id, statementId1, ConnectionType.PROVIDES);

      const result = registry.getConnectedComponent(arg1Id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
      }
    });

    it('should return same component regardless of starting argument', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      const componentFromArg1 = registry.getConnectedComponent(arg1Id);
      const componentFromArg2 = registry.getConnectedComponent(arg2Id);
      const componentFromArg3 = registry.getConnectedComponent(arg3Id);

      expect(componentFromArg1.isOk()).toBe(true);
      expect(componentFromArg2.isOk()).toBe(true);
      expect(componentFromArg3.isOk()).toBe(true);

      if (componentFromArg1.isOk() && componentFromArg2.isOk() && componentFromArg3.isOk()) {
        expect(componentFromArg1.value).toHaveLength(3);
        expect(componentFromArg2.value).toHaveLength(3);
        expect(componentFromArg3.value).toHaveLength(3);
      }
    });

    it('should handle bidirectional connections', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg1Id, statementId2, ConnectionType.CONSUMES);

      const result = registry.getConnectedComponent(arg1Id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should handle AtomicArgumentId.fromString errors', () => {
      // This test would require mocking AtomicArgumentId.fromString to return an error
      // For now, we test the happy path since AtomicArgumentId.fromString typically succeeds
      // with valid IDs that were previously generated

      const result = registry.getConnectedComponent(arg1Id);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all connections', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      registry.clear();

      expect(registry.findConnectionsFrom(arg1Id)).toHaveLength(0);
      expect(registry.findConnectionsFrom(arg2Id)).toHaveLength(0);
      expect(registry.findConnectionsTo(arg2Id)).toHaveLength(0);
      expect(registry.findConnectionsTo(arg3Id)).toHaveLength(0);
      expect(registry.getConnectionCount()).toBe(0);
    });

    it('should allow new connections after clear', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.clear();

      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      expect(registry.findConnectionsFrom(arg2Id)).toHaveLength(1);
      expect(registry.getConnectionCount()).toBe(1);
    });
  });

  describe('getConnectionCount', () => {
    it('should return zero for empty registry', () => {
      expect(registry.getConnectionCount()).toBe(0);
    });

    it('should return correct count for single connection', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);

      expect(registry.getConnectionCount()).toBe(1);
    });

    it('should return correct count for multiple connections', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);
      registry.registerConnection(arg1Id, arg3Id, statementId1, ConnectionType.PROVIDES);

      expect(registry.getConnectionCount()).toBe(3);
    });

    it('should update count correctly after removing connections', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      expect(registry.getConnectionCount()).toBe(2);

      registry.removeConnectionsFor(arg1Id);

      expect(registry.getConnectionCount()).toBe(1);
    });

    it('should return zero after clear', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);

      registry.clear();

      expect(registry.getConnectionCount()).toBe(0);
    });
  });

  describe('edge cases and integration', () => {
    it('should handle complex connection network', () => {
      // Create a diamond-shaped connection pattern
      const arg4Id = AtomicArgumentId.generate();
      const statementId3 = StatementId.generate();
      const statementId4 = StatementId.generate();

      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg1Id, arg3Id, statementId2, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg4Id, statementId3, ConnectionType.CONSUMES);
      registry.registerConnection(arg3Id, arg4Id, statementId4, ConnectionType.CONSUMES);

      const component = registry.getConnectedComponent(arg1Id);
      expect(component.isOk()).toBe(true);
      if (component.isOk()) {
        expect(component.value).toHaveLength(4);
      }

      expect(registry.isDirectlyConnected(arg1Id, arg2Id)).toBe(true);
      expect(registry.isDirectlyConnected(arg1Id, arg3Id)).toBe(true);
      expect(registry.isDirectlyConnected(arg2Id, arg4Id)).toBe(true);
      expect(registry.isDirectlyConnected(arg3Id, arg4Id)).toBe(true);
      expect(registry.isDirectlyConnected(arg1Id, arg4Id)).toBe(false);

      expect(registry.getConnectionCount()).toBe(4);
    });

    it('should handle same arguments with different ordered sets', () => {
      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg1Id, arg2Id, statementId2, ConnectionType.CONSUMES);

      const connections = registry.findConnectionsFrom(arg1Id);
      expect(connections).toHaveLength(2);
      expect(registry.getConnectionCount()).toBe(2);
    });

    it('should maintain connection integrity during partial removal', () => {
      const arg4Id = AtomicArgumentId.generate();

      registry.registerConnection(arg1Id, arg2Id, statementId1, ConnectionType.PROVIDES);
      registry.registerConnection(arg2Id, arg3Id, statementId2, ConnectionType.CONSUMES);
      registry.registerConnection(arg3Id, arg4Id, statementId1, ConnectionType.PROVIDES);

      // Remove middle argument
      registry.removeConnectionsFor(arg2Id);

      // Check that arg1 and arg3-arg4 connection remain
      expect(registry.findConnectionsFrom(arg1Id)).toHaveLength(0);
      expect(registry.findConnectionsFrom(arg3Id)).toHaveLength(1);
      expect(registry.findConnectionsTo(arg3Id)).toHaveLength(0);
      expect(registry.getConnectionCount()).toBe(1);
    });
  });
});
