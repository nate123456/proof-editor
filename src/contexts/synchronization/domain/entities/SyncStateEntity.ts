import type { Result } from '../../../../domain/shared/result';
import { DeviceId } from '../value-objects/DeviceId';
import { VectorClockEntity } from './VectorClockEntity';

export type SyncStatus = 
  | 'SYNCED'
  | 'SYNCING' 
  | 'CONFLICT_PENDING'
  | 'OFFLINE'
  | 'ERROR';

export interface PeerSyncState {
  readonly deviceId: DeviceId;
  readonly lastSyncedClock: VectorClockEntity;
  readonly lastContactAt: Date;
  readonly status: SyncStatus;
  readonly pendingOperationCount: number;
}

export class SyncStateEntity {
  private constructor(
    private readonly localDeviceId: DeviceId,
    private readonly localVectorClock: VectorClockEntity,
    private readonly status: SyncStatus,
    private readonly peerStates: Map<string, PeerSyncState>,
    private readonly lastSyncAt: Date,
    private readonly conflictCount: number,
    private readonly pendingOperationCount: number,
    private readonly errorMessage?: string
  ) {}

  static create(
    localDeviceId: DeviceId,
    initialClock?: VectorClockEntity
  ): Result<SyncStateEntity, Error> {
    let vectorClock: VectorClockEntity;
    if (initialClock) {
      vectorClock = initialClock;
    } else {
      const clockResult = VectorClockEntity.create(localDeviceId);
      if (!clockResult.success) {
        return clockResult;
      }
      vectorClock = clockResult.data;
    }

    return {
      success: true,
      data: new SyncStateEntity(
        localDeviceId,
        vectorClock,
        'SYNCED',
        new Map(),
        new Date(),
        0,
        0
      )
    };
  }

  getLocalDeviceId(): DeviceId {
    return this.localDeviceId;
  }

  getLocalVectorClock(): VectorClockEntity {
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

  getPeerStates(): ReadonlyArray<PeerSyncState> {
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
    return Array.from(this.peerStates.values())
      .filter(peer => peer.status !== 'OFFLINE')
      .length;
  }

  getOutOfSyncPeers(): PeerSyncState[] {
    return Array.from(this.peerStates.values())
      .filter(peer => !this.isPeerSynced(peer));
  }

  private isPeerSynced(peer: PeerSyncState): boolean {
    return peer.status === 'SYNCED' && 
           peer.pendingOperationCount === 0 &&
           !peer.lastSyncedClock.isConcurrentWith(this.localVectorClock);
  }

  updateLocalClock(newClock: VectorClockEntity): Result<SyncStateEntity, Error> {
    return {
      success: true,
      data: new SyncStateEntity(
        this.localDeviceId,
        newClock,
        this.status,
        this.peerStates,
        this.lastSyncAt,
        this.conflictCount,
        this.pendingOperationCount,
        this.errorMessage
      )
    };
  }

  updateStatus(newStatus: SyncStatus, errorMessage?: string): Result<SyncStateEntity, Error> {
    return {
      success: true,
      data: new SyncStateEntity(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        this.lastSyncAt,
        this.conflictCount,
        this.pendingOperationCount,
        errorMessage
      )
    };
  }

  updatePeerState(peerState: PeerSyncState): Result<SyncStateEntity, Error> {
    const newPeerStates = new Map(this.peerStates);
    newPeerStates.set(peerState.deviceId.getValue(), peerState);

    return {
      success: true,
      data: new SyncStateEntity(
        this.localDeviceId,
        this.localVectorClock,
        this.status,
        newPeerStates,
        this.lastSyncAt,
        this.conflictCount,
        this.pendingOperationCount,
        this.errorMessage
      )
    };
  }

  removePeer(deviceId: DeviceId): Result<SyncStateEntity, Error> {
    const newPeerStates = new Map(this.peerStates);
    newPeerStates.delete(deviceId.getValue());

    return {
      success: true,
      data: new SyncStateEntity(
        this.localDeviceId,
        this.localVectorClock,
        this.status,
        newPeerStates,
        this.lastSyncAt,
        this.conflictCount,
        this.pendingOperationCount,
        this.errorMessage
      )
    };
  }

  incrementConflictCount(): Result<SyncStateEntity, Error> {
    const newStatus = this.conflictCount === 0 ? 'CONFLICT_PENDING' : this.status;

    return {
      success: true,
      data: new SyncStateEntity(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        this.lastSyncAt,
        this.conflictCount + 1,
        this.pendingOperationCount,
        this.errorMessage
      )
    };
  }

  decrementConflictCount(): Result<SyncStateEntity, Error> {
    if (this.conflictCount === 0) {
      return { success: false, error: new Error('Cannot decrement conflict count below zero') };
    }

    const newConflictCount = this.conflictCount - 1;
    const newStatus = newConflictCount === 0 && this.pendingOperationCount === 0 ? 'SYNCED' : this.status;

    return {
      success: true,
      data: new SyncStateEntity(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        this.lastSyncAt,
        newConflictCount,
        this.pendingOperationCount,
        this.errorMessage
      )
    };
  }

  updatePendingOperationCount(count: number): Result<SyncStateEntity, Error> {
    if (count < 0) {
      return { success: false, error: new Error('Pending operation count cannot be negative') };
    }

    const newStatus = count === 0 && this.conflictCount === 0 ? 'SYNCED' : 
                     count > 0 ? 'SYNCING' : this.status;

    return {
      success: true,
      data: new SyncStateEntity(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        this.lastSyncAt,
        this.conflictCount,
        count,
        this.errorMessage
      )
    };
  }

  markSyncCompleted(): Result<SyncStateEntity, Error> {
    const newStatus = this.conflictCount === 0 ? 'SYNCED' : 'CONFLICT_PENDING';

    return {
      success: true,
      data: new SyncStateEntity(
        this.localDeviceId,
        this.localVectorClock,
        newStatus,
        this.peerStates,
        new Date(),
        this.conflictCount,
        0,
        undefined
      )
    };
  }
}