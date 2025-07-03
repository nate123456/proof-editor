import { err, ok, type Result } from 'neverthrow';

import { type DeviceId } from '../value-objects/DeviceId';
import { VectorClock } from './VectorClock';

export type SyncStatus = 'SYNCED' | 'SYNCING' | 'CONFLICT_PENDING' | 'OFFLINE' | 'ERROR';

export interface PeerSyncState {
  readonly deviceId: DeviceId;
  readonly lastSyncedClock: VectorClock;
  readonly lastContactAt: Date;
  readonly status: SyncStatus;
  readonly pendingOperationCount: number;
}

export class SyncState {
  private constructor(
    private readonly localDeviceId: DeviceId,
    private readonly localVectorClock: VectorClock,
    private readonly status: SyncStatus,
    private readonly peerStates: Map<string, PeerSyncState>,
    private readonly lastSyncAt: Date,
    private readonly conflictCount: number,
    private readonly pendingOperationCount: number,
    private readonly errorMessage?: string
  ) {}

  static create(localDeviceId: DeviceId, initialClock?: VectorClock): Result<SyncState, Error> {
    let vectorClock: VectorClock;
    if (initialClock) {
      vectorClock = initialClock;
    } else {
      const clockResult = VectorClock.create(localDeviceId);
      if (clockResult.isErr()) {
        return err(clockResult.error);
      }
      vectorClock = clockResult.value;
    }

    return ok(new SyncState(localDeviceId, vectorClock, 'SYNCED', new Map(), new Date(), 0, 0));
  }

  getLocalDeviceId(): DeviceId {
    return this.localDeviceId;
  }

  getLocalVectorClock(): VectorClock {
    return this.localVectorClock;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  getLastSyncAt(): Date {
    return this.lastSyncAt;
  }

  getConflictCount(): number {
    return this.conflictCount;
  }

  getPendingOperationCount(): number {
    return this.pendingOperationCount;
  }

  getErrorMessage(): string | undefined {
    return this.errorMessage;
  }

  getPeerStates(): readonly PeerSyncState[] {
    return Array.from(this.peerStates.values());
  }

  getPeerState(deviceId: DeviceId): PeerSyncState | undefined {
    return this.peerStates.get(deviceId.getValue());
  }

  isSynced(): boolean {
    return this.status === 'SYNCED' && this.conflictCount === 0 && this.pendingOperationCount === 0;
  }

  hasConflicts(): boolean {
    return this.conflictCount > 0;
  }

  isOffline(): boolean {
    return this.status === 'OFFLINE';
  }

  hasErrors(): boolean {
    return this.status === 'ERROR';
  }

  getActivePeerCount(): number {
    return Array.from(this.peerStates.values()).filter(peer => peer.status !== 'OFFLINE').length;
  }

  getOutOfSyncPeers(): PeerSyncState[] {
    return Array.from(this.peerStates.values()).filter(peer => !this.isPeerSynced(peer));
  }

  private isPeerSynced(peer: PeerSyncState): boolean {
    return (
      peer.status === 'SYNCED' &&
      peer.pendingOperationCount === 0 &&
      !peer.lastSyncedClock.isConcurrentWith(this.localVectorClock)
    );
  }

  updateLocalClock(newClock: VectorClock): Result<SyncState, Error> {
    return ok(
      new SyncState(
        this.localDeviceId,
        newClock,
        this.status,
        this.peerStates,
        this.lastSyncAt,
        this.conflictCount,
        this.pendingOperationCount,
        this.errorMessage
      )
    );
  }

  updateStatus(newStatus: SyncStatus, errorMessage?: string): Result<SyncState, Error> {
    return ok(
      new SyncState(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        this.lastSyncAt,
        this.conflictCount,
        this.pendingOperationCount,
        errorMessage
      )
    );
  }

  updatePeerState(peerState: PeerSyncState): Result<SyncState, Error> {
    const newPeerStates = new Map(this.peerStates);
    newPeerStates.set(peerState.deviceId.getValue(), peerState);

    return ok(
      new SyncState(
        this.localDeviceId,
        this.localVectorClock,
        this.status,
        newPeerStates,
        this.lastSyncAt,
        this.conflictCount,
        this.pendingOperationCount,
        this.errorMessage
      )
    );
  }

  removePeer(deviceId: DeviceId): Result<SyncState, Error> {
    const newPeerStates = new Map(this.peerStates);
    newPeerStates.delete(deviceId.getValue());

    return ok(
      new SyncState(
        this.localDeviceId,
        this.localVectorClock,
        this.status,
        newPeerStates,
        this.lastSyncAt,
        this.conflictCount,
        this.pendingOperationCount,
        this.errorMessage
      )
    );
  }

  incrementConflictCount(): Result<SyncState, Error> {
    const newStatus = this.conflictCount === 0 ? 'CONFLICT_PENDING' : this.status;

    return ok(
      new SyncState(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        this.lastSyncAt,
        this.conflictCount + 1,
        this.pendingOperationCount,
        this.errorMessage
      )
    );
  }

  decrementConflictCount(): Result<SyncState, Error> {
    if (this.conflictCount === 0) {
      return err(new Error('Cannot decrement conflict count below zero'));
    }

    const newConflictCount = this.conflictCount - 1;
    const newStatus =
      newConflictCount === 0 && this.pendingOperationCount === 0 ? 'SYNCED' : this.status;

    return ok(
      new SyncState(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        this.lastSyncAt,
        newConflictCount,
        this.pendingOperationCount,
        this.errorMessage
      )
    );
  }

  updatePendingOperationCount(count: number): Result<SyncState, Error> {
    if (count < 0) {
      return err(new Error('Pending operation count cannot be negative'));
    }

    const newStatus =
      count === 0 && this.conflictCount === 0 ? 'SYNCED' : count > 0 ? 'SYNCING' : this.status;

    return ok(
      new SyncState(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        this.lastSyncAt,
        this.conflictCount,
        count,
        this.errorMessage
      )
    );
  }

  markSyncCompleted(): Result<SyncState, Error> {
    const newStatus = this.conflictCount === 0 ? 'SYNCED' : 'CONFLICT_PENDING';

    // Create a new timestamp that is guaranteed to be different from the previous one
    const now = new Date();
    const completionTime =
      now.getTime() <= this.lastSyncAt.getTime() ? new Date(this.lastSyncAt.getTime() + 1) : now;

    return ok(
      new SyncState(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        completionTime,
        this.conflictCount,
        0,
        undefined
      )
    );
  }
}
