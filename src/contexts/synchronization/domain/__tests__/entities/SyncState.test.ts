/**
 * Tests for SyncState entity
 *
 * Focuses on:
 * - SyncState creation and initialization
 * - Peer state management and tracking
 * - Status transitions and state updates
 * - Conflict counting and pending operations
 * - Synchronization status determination
 * - Error handling and edge cases
 * - High coverage for synchronization state logic
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type PeerSyncState, SyncState, type SyncStatus } from '../../entities/SyncState';
import { VectorClock } from '../../entities/VectorClock';
import { DeviceId } from '../../value-objects/DeviceId';

// Mock VectorClock factory
const createMockVectorClock = (clocks: Record<string, number> = {}): VectorClock => {
  return {
    increment: vi.fn(),
    merge: vi.fn(),
    isEqual: vi.fn(() => false),
    isConcurrent: vi.fn(() => false),
    isConcurrentWith: vi.fn(() => false),
    happensBefore: vi.fn(() => false),
    happensAfter: vi.fn(() => false),
    equals: vi.fn(() => false),
    getTime: vi.fn((deviceId: string) => clocks[deviceId] ?? 0),
    getTimestampForDevice: vi.fn((deviceId: DeviceId) => clocks[deviceId.getValue()] ?? 0),
    getAllClocks: vi.fn(() => clocks),
    getAllDeviceIds: vi.fn(() =>
      Object.keys(clocks).map(id => {
        const deviceIdResult = DeviceId.create(id);
        if (deviceIdResult.isErr()) {
          throw new Error(`Failed to create DeviceId: ${id}`);
        }
        return deviceIdResult.value;
      })
    ),
    getClockState: vi.fn(() => new Map(Object.entries(clocks))),
    toCompactString: vi.fn(
      () =>
        `{${Object.entries(clocks)
          .map(([k, v]) => `${k}:${v}`)
          .join(',')}}`
    ),
    toJSON: vi.fn(() => ({ clocks })),
  } as unknown as VectorClock;
};

const createTestDeviceId = (deviceId: string): DeviceId => {
  const result = DeviceId.create(deviceId);
  if (result.isErr()) {
    throw new Error(`Failed to create DeviceId: ${deviceId}`);
  }
  return result.value;
};

const createTestPeerState = (
  deviceId: string,
  status: SyncStatus = 'SYNCED',
  pendingCount = 0
): PeerSyncState => {
  return {
    deviceId: createTestDeviceId(deviceId),
    lastSyncedClock: createMockVectorClock({ [deviceId]: 1 }),
    lastContactAt: new Date(),
    status,
    pendingOperationCount: pendingCount,
  };
};

describe('SyncState', () => {
  describe('create', () => {
    it('should create SyncState with default clock', () => {
      const deviceId = createTestDeviceId('device-1');
      const result = SyncState.create(deviceId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const syncState = result.value;
        expect(syncState.getLocalDeviceId()).toBe(deviceId);
        expect(syncState.getStatus()).toBe('SYNCED');
        expect(syncState.getConflictCount()).toBe(0);
        expect(syncState.getPendingOperationCount()).toBe(0);
        expect(syncState.getLastSyncAt()).toBeInstanceOf(Date);
        expect(syncState.getPeerStates()).toHaveLength(0);
        expect(syncState.getErrorMessage()).toBeUndefined();
      }
    });

    it('should create SyncState with provided initial clock', () => {
      const deviceId = createTestDeviceId('device-1');
      const initialClock = createMockVectorClock({ 'device-1': 5 });

      const result = SyncState.create(deviceId, initialClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const syncState = result.value;
        expect(syncState.getLocalVectorClock()).toBe(initialClock);
        expect(syncState.getLocalDeviceId()).toBe(deviceId);
      }
    });

    it('should fail when VectorClock creation fails', () => {
      const deviceId = createTestDeviceId('device-1');

      // Mock VectorClock.create to return an error
      const originalCreate = VectorClock.create;
      vi.spyOn(VectorClock, 'create').mockReturnValue({
        isErr: () => true,
        error: new Error('VectorClock creation failed'),
      } as any);

      const result = SyncState.create(deviceId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('VectorClock creation failed');
      }

      // Restore original method
      VectorClock.create = originalCreate;
    });
  });

  describe('getters', () => {
    let syncState: SyncState;
    let deviceId: DeviceId;
    let vectorClock: VectorClock;

    beforeEach(() => {
      deviceId = createTestDeviceId('local-device');
      vectorClock = createMockVectorClock({ 'local-device': 3 });
      const result = SyncState.create(deviceId, vectorClock);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should return local device ID', () => {
      expect(syncState.getLocalDeviceId()).toBe(deviceId);
    });

    it('should return local vector clock', () => {
      expect(syncState.getLocalVectorClock()).toBe(vectorClock);
    });

    it('should return initial status as SYNCED', () => {
      expect(syncState.getStatus()).toBe('SYNCED');
    });

    it('should return last sync timestamp', () => {
      const lastSync = syncState.getLastSyncAt();
      expect(lastSync).toBeInstanceOf(Date);
      expect(lastSync.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return initial conflict count as zero', () => {
      expect(syncState.getConflictCount()).toBe(0);
    });

    it('should return initial pending operation count as zero', () => {
      expect(syncState.getPendingOperationCount()).toBe(0);
    });

    it('should return undefined error message initially', () => {
      expect(syncState.getErrorMessage()).toBeUndefined();
    });

    it('should return empty peer states initially', () => {
      const peerStates = syncState.getPeerStates();
      expect(Array.isArray(peerStates)).toBe(true);
      expect(peerStates).toHaveLength(0);
    });
  });

  describe('status checks', () => {
    let syncState: SyncState;

    beforeEach(() => {
      const deviceId = createTestDeviceId('test-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should identify fully synced state', () => {
      expect(syncState.isSynced()).toBe(true);
      expect(syncState.hasConflicts()).toBe(false);
      expect(syncState.isOffline()).toBe(false);
      expect(syncState.hasErrors()).toBe(false);
    });

    it('should identify state with conflicts', () => {
      const withConflicts = syncState.incrementConflictCount();
      expect(withConflicts.isOk()).toBe(true);

      if (withConflicts.isOk()) {
        const conflictState = withConflicts.value;
        expect(conflictState.isSynced()).toBe(false);
        expect(conflictState.hasConflicts()).toBe(true);
        expect(conflictState.getStatus()).toBe('CONFLICT_PENDING');
      }
    });

    it('should identify offline state', () => {
      const offline = syncState.updateStatus('OFFLINE');
      expect(offline.isOk()).toBe(true);

      if (offline.isOk()) {
        const offlineState = offline.value;
        expect(offlineState.isOffline()).toBe(true);
        expect(offlineState.isSynced()).toBe(false);
      }
    });

    it('should identify error state', () => {
      const errorState = syncState.updateStatus('ERROR', 'Connection failed');
      expect(errorState.isOk()).toBe(true);

      if (errorState.isOk()) {
        const errState = errorState.value;
        expect(errState.hasErrors()).toBe(true);
        expect(errState.getErrorMessage()).toBe('Connection failed');
      }
    });

    it('should identify syncing state with pending operations', () => {
      const syncing = syncState.updatePendingOperationCount(5);
      expect(syncing.isOk()).toBe(true);

      if (syncing.isOk()) {
        const syncingState = syncing.value;
        expect(syncingState.isSynced()).toBe(false);
        expect(syncingState.getStatus()).toBe('SYNCING');
        expect(syncingState.getPendingOperationCount()).toBe(5);
      }
    });
  });

  describe('peer state management', () => {
    let syncState: SyncState;

    beforeEach(() => {
      const deviceId = createTestDeviceId('local-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should add peer state', () => {
      const peerState = createTestPeerState('peer-1', 'SYNCED');
      const updated = syncState.updatePeerState(peerState);

      expect(updated.isOk()).toBe(true);
      if (updated.isOk()) {
        const updatedState = updated.value;
        const peers = updatedState.getPeerStates();
        expect(peers).toHaveLength(1);
        expect(peers[0].deviceId.getValue()).toBe('peer-1');
      }
    });

    it('should update existing peer state', () => {
      const peerState1 = createTestPeerState('peer-1', 'SYNCED');
      const peerState2 = createTestPeerState('peer-1', 'SYNCING', 3);

      const withPeer = syncState.updatePeerState(peerState1);
      expect(withPeer.isOk()).toBe(true);

      if (withPeer.isOk()) {
        const updated = withPeer.value.updatePeerState(peerState2);
        expect(updated.isOk()).toBe(true);

        if (updated.isOk()) {
          const updatedState = updated.value;
          const peers = updatedState.getPeerStates();
          expect(peers).toHaveLength(1);
          expect(peers[0].status).toBe('SYNCING');
          expect(peers[0].pendingOperationCount).toBe(3);
        }
      }
    });

    it('should retrieve specific peer state', () => {
      const peerState = createTestPeerState('peer-alpha', 'SYNCED');
      const deviceId = createTestDeviceId('peer-alpha');

      const updated = syncState.updatePeerState(peerState);
      expect(updated.isOk()).toBe(true);

      if (updated.isOk()) {
        const updatedState = updated.value;
        const retrievedPeer = updatedState.getPeerState(deviceId);
        expect(retrievedPeer).toBeDefined();
        expect(retrievedPeer?.deviceId.getValue()).toBe('peer-alpha');
      }
    });

    it('should return undefined for non-existent peer', () => {
      const nonExistentDevice = createTestDeviceId('non-existent');
      const retrievedPeer = syncState.getPeerState(nonExistentDevice);
      expect(retrievedPeer).toBeUndefined();
    });

    it('should remove peer state', () => {
      const peerState = createTestPeerState('peer-to-remove', 'SYNCED');
      const deviceId = createTestDeviceId('peer-to-remove');

      const withPeer = syncState.updatePeerState(peerState);
      expect(withPeer.isOk()).toBe(true);

      if (withPeer.isOk()) {
        const removed = withPeer.value.removePeer(deviceId);
        expect(removed.isOk()).toBe(true);

        if (removed.isOk()) {
          const removedState = removed.value;
          expect(removedState.getPeerStates()).toHaveLength(0);
          expect(removedState.getPeerState(deviceId)).toBeUndefined();
        }
      }
    });

    it('should handle removing non-existent peer gracefully', () => {
      const nonExistentDevice = createTestDeviceId('non-existent');
      const removed = syncState.removePeer(nonExistentDevice);

      expect(removed.isOk()).toBe(true);
      if (removed.isOk()) {
        expect(removed.value.getPeerStates()).toHaveLength(0);
      }
    });
  });

  describe('peer analysis methods', () => {
    let syncState: SyncState;
    let localDeviceId: DeviceId;
    let localClock: VectorClock;

    beforeEach(() => {
      localDeviceId = createTestDeviceId('local-device');
      localClock = createMockVectorClock({ 'local-device': 5 });
      const result = SyncState.create(localDeviceId, localClock);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should count active peers correctly', () => {
      const peer1 = createTestPeerState('peer-1', 'SYNCED');
      const peer2 = createTestPeerState('peer-2', 'SYNCING');
      const peer3 = createTestPeerState('peer-3', 'OFFLINE');

      let updated = syncState.updatePeerState(peer1);
      if (updated.isOk()) {
        updated = updated.value.updatePeerState(peer2);
        if (updated.isOk()) {
          updated = updated.value.updatePeerState(peer3);
          if (updated.isOk()) {
            expect(updated.value.getActivePeerCount()).toBe(2); // peer-1 and peer-2 are active
          }
        }
      }
    });

    it('should identify out-of-sync peers', () => {
      const syncedPeer = createTestPeerState('synced-peer', 'SYNCED', 0);
      const outOfSyncPeer = createTestPeerState('out-of-sync-peer', 'SYNCING', 3);

      // Mock the clock comparison for out-of-sync detection
      vi.mocked(syncedPeer.lastSyncedClock.isConcurrentWith).mockReturnValue(false);
      vi.mocked(outOfSyncPeer.lastSyncedClock.isConcurrentWith).mockReturnValue(true);

      let updated = syncState.updatePeerState(syncedPeer);
      if (updated.isOk()) {
        updated = updated.value.updatePeerState(outOfSyncPeer);
        if (updated.isOk()) {
          const outOfSyncPeers = updated.value.getOutOfSyncPeers();
          expect(outOfSyncPeers).toHaveLength(1);
          expect(outOfSyncPeers[0].deviceId.getValue()).toBe('out-of-sync-peer');
        }
      }
    });

    it('should handle empty peer list in analysis methods', () => {
      expect(syncState.getActivePeerCount()).toBe(0);
      expect(syncState.getOutOfSyncPeers()).toHaveLength(0);
    });
  });

  describe('clock updates', () => {
    let syncState: SyncState;
    let deviceId: DeviceId;

    beforeEach(() => {
      deviceId = createTestDeviceId('test-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should update local vector clock', () => {
      const newClock = createMockVectorClock({ 'test-device': 10 });
      const updated = syncState.updateLocalClock(newClock);

      expect(updated.isOk()).toBe(true);
      if (updated.isOk()) {
        const updatedState = updated.value;
        expect(updatedState.getLocalVectorClock()).toBe(newClock);
        expect(updatedState.getLocalDeviceId()).toBe(deviceId); // Should preserve other properties
      }
    });

    it('should preserve other state when updating clock', () => {
      // Set up state with conflicts and pending operations
      const withConflicts = syncState.incrementConflictCount();
      expect(withConflicts.isOk()).toBe(true);

      if (withConflicts.isOk()) {
        const withPending = withConflicts.value.updatePendingOperationCount(3);
        expect(withPending.isOk()).toBe(true);

        if (withPending.isOk()) {
          const newClock = createMockVectorClock({ 'test-device': 15 });
          const updated = withPending.value.updateLocalClock(newClock);

          expect(updated.isOk()).toBe(true);
          if (updated.isOk()) {
            const updatedState = updated.value;
            expect(updatedState.getLocalVectorClock()).toBe(newClock);
            expect(updatedState.getConflictCount()).toBe(1); // Preserved
            expect(updatedState.getPendingOperationCount()).toBe(3); // Preserved
          }
        }
      }
    });
  });

  describe('status updates', () => {
    let syncState: SyncState;

    beforeEach(() => {
      const deviceId = createTestDeviceId('test-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should update status without error message', () => {
      const updated = syncState.updateStatus('SYNCING');

      expect(updated.isOk()).toBe(true);
      if (updated.isOk()) {
        const updatedState = updated.value;
        expect(updatedState.getStatus()).toBe('SYNCING');
        expect(updatedState.getErrorMessage()).toBeUndefined();
      }
    });

    it('should update status with error message', () => {
      const errorMessage = 'Network connection failed';
      const updated = syncState.updateStatus('ERROR', errorMessage);

      expect(updated.isOk()).toBe(true);
      if (updated.isOk()) {
        const updatedState = updated.value;
        expect(updatedState.getStatus()).toBe('ERROR');
        expect(updatedState.getErrorMessage()).toBe(errorMessage);
      }
    });

    it('should clear error message when updating to non-error status', () => {
      const withError = syncState.updateStatus('ERROR', 'Some error');
      expect(withError.isOk()).toBe(true);

      if (withError.isOk()) {
        const cleared = withError.value.updateStatus('SYNCED');
        expect(cleared.isOk()).toBe(true);

        if (cleared.isOk()) {
          expect(cleared.value.getStatus()).toBe('SYNCED');
          expect(cleared.value.getErrorMessage()).toBeUndefined();
        }
      }
    });
  });

  describe('conflict count management', () => {
    let syncState: SyncState;

    beforeEach(() => {
      const deviceId = createTestDeviceId('test-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should increment conflict count and update status', () => {
      const incremented = syncState.incrementConflictCount();

      expect(incremented.isOk()).toBe(true);
      if (incremented.isOk()) {
        const updatedState = incremented.value;
        expect(updatedState.getConflictCount()).toBe(1);
        expect(updatedState.getStatus()).toBe('CONFLICT_PENDING');
        expect(updatedState.hasConflicts()).toBe(true);
      }
    });

    it('should increment multiple times', () => {
      let current = syncState;
      for (let i = 1; i <= 3; i++) {
        const incremented = current.incrementConflictCount();
        expect(incremented.isOk()).toBe(true);
        if (incremented.isOk()) {
          current = incremented.value;
          expect(current.getConflictCount()).toBe(i);
        }
      }
    });

    it('should decrement conflict count', () => {
      const incremented = syncState.incrementConflictCount();
      expect(incremented.isOk()).toBe(true);

      if (incremented.isOk()) {
        const decremented = incremented.value.decrementConflictCount();
        expect(decremented.isOk()).toBe(true);

        if (decremented.isOk()) {
          const updatedState = decremented.value;
          expect(updatedState.getConflictCount()).toBe(0);
          expect(updatedState.getStatus()).toBe('SYNCED'); // Should revert to SYNCED when no conflicts
        }
      }
    });

    it('should fail to decrement below zero', () => {
      const decremented = syncState.decrementConflictCount();

      expect(decremented.isErr()).toBe(true);
      if (decremented.isErr()) {
        expect(decremented.error.message).toBe('Cannot decrement conflict count below zero');
      }
    });

    it('should maintain CONFLICT_PENDING status when conflicts remain', () => {
      let current = syncState.incrementConflictCount();
      if (current.isOk()) {
        current = current.value.incrementConflictCount();
        if (current.isOk()) {
          const decremented = current.value.decrementConflictCount();
          expect(decremented.isOk()).toBe(true);

          if (decremented.isOk()) {
            const updatedState = decremented.value;
            expect(updatedState.getConflictCount()).toBe(1);
            expect(updatedState.getStatus()).toBe('CONFLICT_PENDING'); // Still has conflicts
          }
        }
      }
    });
  });

  describe('pending operation count management', () => {
    let syncState: SyncState;

    beforeEach(() => {
      const deviceId = createTestDeviceId('test-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should update pending operation count and status', () => {
      const updated = syncState.updatePendingOperationCount(5);

      expect(updated.isOk()).toBe(true);
      if (updated.isOk()) {
        const updatedState = updated.value;
        expect(updatedState.getPendingOperationCount()).toBe(5);
        expect(updatedState.getStatus()).toBe('SYNCING');
        expect(updatedState.isSynced()).toBe(false);
      }
    });

    it('should return to SYNCED when pending count reaches zero', () => {
      const withPending = syncState.updatePendingOperationCount(3);
      expect(withPending.isOk()).toBe(true);

      if (withPending.isOk()) {
        const cleared = withPending.value.updatePendingOperationCount(0);
        expect(cleared.isOk()).toBe(true);

        if (cleared.isOk()) {
          const clearedState = cleared.value;
          expect(clearedState.getPendingOperationCount()).toBe(0);
          expect(clearedState.getStatus()).toBe('SYNCED');
          expect(clearedState.isSynced()).toBe(true);
        }
      }
    });

    it('should fail with negative pending count', () => {
      const updated = syncState.updatePendingOperationCount(-1);

      expect(updated.isErr()).toBe(true);
      if (updated.isErr()) {
        expect(updated.error.message).toBe('Pending operation count cannot be negative');
      }
    });

    it('should maintain CONFLICT_PENDING status when conflicts exist', () => {
      const withConflicts = syncState.incrementConflictCount();
      expect(withConflicts.isOk()).toBe(true);

      if (withConflicts.isOk()) {
        const withPending = withConflicts.value.updatePendingOperationCount(0);
        expect(withPending.isOk()).toBe(true);

        if (withPending.isOk()) {
          const updatedState = withPending.value;
          expect(updatedState.getStatus()).toBe('CONFLICT_PENDING'); // Conflicts take precedence
          expect(updatedState.isSynced()).toBe(false);
        }
      }
    });
  });

  describe('sync completion', () => {
    let syncState: SyncState;

    beforeEach(() => {
      const deviceId = createTestDeviceId('test-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should mark sync as completed without conflicts', () => {
      const withPending = syncState.updatePendingOperationCount(5);
      expect(withPending.isOk()).toBe(true);

      if (withPending.isOk()) {
        const completed = withPending.value.markSyncCompleted();
        expect(completed.isOk()).toBe(true);

        if (completed.isOk()) {
          const completedState = completed.value;
          expect(completedState.getStatus()).toBe('SYNCED');
          expect(completedState.getPendingOperationCount()).toBe(0);
          expect(completedState.getErrorMessage()).toBeUndefined();
          expect(completedState.getLastSyncAt().getTime()).toBeGreaterThan(
            syncState.getLastSyncAt().getTime()
          );
        }
      }
    });

    it('should mark sync as completed with remaining conflicts', () => {
      const withConflictsAndPending = syncState
        .incrementConflictCount()
        .andThen(state => state.updatePendingOperationCount(3));

      expect(withConflictsAndPending.isOk()).toBe(true);

      if (withConflictsAndPending.isOk()) {
        const completed = withConflictsAndPending.value.markSyncCompleted();
        expect(completed.isOk()).toBe(true);

        if (completed.isOk()) {
          const completedState = completed.value;
          expect(completedState.getStatus()).toBe('CONFLICT_PENDING'); // Conflicts remain
          expect(completedState.getPendingOperationCount()).toBe(0);
          expect(completedState.getConflictCount()).toBe(1);
        }
      }
    });

    it('should update last sync timestamp on completion', () => {
      const beforeCompletion = Date.now();
      const completed = syncState.markSyncCompleted();
      const afterCompletion = Date.now();

      expect(completed.isOk()).toBe(true);
      if (completed.isOk()) {
        const completedState = completed.value;
        const syncTime = completedState.getLastSyncAt().getTime();
        expect(syncTime).toBeGreaterThanOrEqual(beforeCompletion);
        // Allow for small timing differences due to timestamp advancement logic
        expect(syncTime).toBeLessThanOrEqual(afterCompletion + 1);
      }
    });
  });

  describe('immutability and state preservation', () => {
    let syncState: SyncState;

    beforeEach(() => {
      const deviceId = createTestDeviceId('test-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should preserve original state when creating updates', () => {
      const originalStatus = syncState.getStatus();
      const originalConflicts = syncState.getConflictCount();

      const updated = syncState.updateStatus('SYNCING');
      expect(updated.isOk()).toBe(true);

      // Original should be unchanged
      expect(syncState.getStatus()).toBe(originalStatus);
      expect(syncState.getConflictCount()).toBe(originalConflicts);

      if (updated.isOk()) {
        // New instance should have updates
        expect(updated.value.getStatus()).toBe('SYNCING');
        expect(updated.value).not.toBe(syncState);
      }
    });

    it('should maintain separate peer state maps', () => {
      const peerState = createTestPeerState('peer-1', 'SYNCED');
      const updated = syncState.updatePeerState(peerState);

      expect(updated.isOk()).toBe(true);
      expect(syncState.getPeerStates()).toHaveLength(0); // Original unchanged

      if (updated.isOk()) {
        expect(updated.value.getPeerStates()).toHaveLength(1); // New instance updated
      }
    });

    it('should create new instances for all update operations', () => {
      const operations = [
        () => syncState.updateStatus('SYNCING'),
        () => syncState.incrementConflictCount(),
        () => syncState.updatePendingOperationCount(5),
        () => syncState.updateLocalClock(createMockVectorClock({ 'test-device': 10 })),
        () => syncState.markSyncCompleted(),
      ];

      operations.forEach(operation => {
        const result = operation();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).not.toBe(syncState);
        }
      });
    });
  });

  describe('edge cases and error conditions', () => {
    let syncState: SyncState;

    beforeEach(() => {
      const deviceId = createTestDeviceId('test-device');
      const result = SyncState.create(deviceId);
      if (result.isOk()) {
        syncState = result.value;
      }
    });

    it('should handle large conflict counts', () => {
      let current = syncState;
      const largeCount = 1000;

      for (let i = 0; i < largeCount; i++) {
        const incremented = current.incrementConflictCount();
        expect(incremented.isOk()).toBe(true);
        if (incremented.isOk()) {
          current = incremented.value;
        }
      }

      expect(current.getConflictCount()).toBe(largeCount);
      expect(current.hasConflicts()).toBe(true);
    });

    it('should handle large pending operation counts', () => {
      const largeCount = 50000;
      const updated = syncState.updatePendingOperationCount(largeCount);

      expect(updated.isOk()).toBe(true);
      if (updated.isOk()) {
        expect(updated.value.getPendingOperationCount()).toBe(largeCount);
        expect(updated.value.getStatus()).toBe('SYNCING');
      }
    });

    it('should handle many peer states', () => {
      let current = syncState;
      const peerCount = 100;

      for (let i = 0; i < peerCount; i++) {
        const peerState = createTestPeerState(`peer-${i}`, 'SYNCED');
        const updated = current.updatePeerState(peerState);
        expect(updated.isOk()).toBe(true);
        if (updated.isOk()) {
          current = updated.value;
        }
      }

      expect(current.getPeerStates()).toHaveLength(peerCount);
      expect(current.getActivePeerCount()).toBe(peerCount);
    });

    it('should handle status transitions through all states', () => {
      const statuses: SyncStatus[] = ['SYNCED', 'SYNCING', 'CONFLICT_PENDING', 'OFFLINE', 'ERROR'];

      let current = syncState;
      for (const status of statuses) {
        const updated = current.updateStatus(status, status === 'ERROR' ? 'Test error' : undefined);
        expect(updated.isOk()).toBe(true);
        if (updated.isOk()) {
          current = updated.value;
          expect(current.getStatus()).toBe(status);
        }
      }
    });
  });
});
