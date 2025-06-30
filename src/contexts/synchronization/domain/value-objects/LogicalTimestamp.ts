import type { Result } from '../../../../domain/shared/result';
import { VectorClockEntity } from '../entities/VectorClockEntity';
import { DeviceId } from './DeviceId';

export class LogicalTimestamp {
  private constructor(
    private readonly deviceId: DeviceId,
    private readonly timestamp: number,
    private readonly vectorClockHash: string
  ) {}

  static create(deviceId: DeviceId, timestamp: number, vectorClock: VectorClockEntity): Result<LogicalTimestamp, Error> {
    if (timestamp < 0) {
      return { success: false, error: new Error('Timestamp cannot be negative') };
    }

    const vectorClockHash = LogicalTimestamp.hashVectorClock(vectorClock);

    return {
      success: true,
      data: new LogicalTimestamp(deviceId, timestamp, vectorClockHash)
    };
  }

  static fromVectorClock(vectorClock: VectorClockEntity): Result<LogicalTimestamp, Error> {
    const allDeviceIds = vectorClock.getAllDeviceIds();
    
    if (allDeviceIds.length === 0) {
      return { success: false, error: new Error('Vector clock must have at least one device') };
    }

    let maxTimestamp = -1;
    let primaryDeviceId = allDeviceIds[0];

    for (const deviceId of allDeviceIds) {
      const timestamp = vectorClock.getTimestampForDevice(deviceId);
      if (timestamp > maxTimestamp) {
        maxTimestamp = timestamp;
        primaryDeviceId = deviceId;
      }
    }

    return LogicalTimestamp.create(primaryDeviceId, maxTimestamp, vectorClock);
  }

  static now(deviceId: DeviceId): Result<LogicalTimestamp, Error> {
    const clockResult = VectorClockEntity.create(deviceId);
    if (!clockResult.success) {
      return clockResult;
    }

    const incrementedResult = clockResult.data.incrementForDevice(deviceId);
    if (!incrementedResult.success) {
      return incrementedResult;
    }

    return LogicalTimestamp.fromVectorClock(incrementedResult.data);
  }

  private static hashVectorClock(vectorClock: VectorClockEntity): string {
    return vectorClock.toCompactString();
  }

  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  getTimestamp(): number {
    return this.timestamp;
  }

  getVectorClockHash(): string {
    return this.vectorClockHash;
  }

  compareTo(other: LogicalTimestamp): number {
    if (this.timestamp !== other.timestamp) {
      return this.timestamp - other.timestamp;
    }

    if (this.vectorClockHash !== other.vectorClockHash) {
      return this.vectorClockHash.localeCompare(other.vectorClockHash);
    }

    return this.deviceId.getValue().localeCompare(other.deviceId.getValue());
  }

  equals(other: LogicalTimestamp): boolean {
    return this.timestamp === other.timestamp &&
           this.vectorClockHash === other.vectorClockHash &&
           this.deviceId.equals(other.deviceId);
  }

  isAfter(other: LogicalTimestamp): boolean {
    return this.compareTo(other) > 0;
  }

  isBefore(other: LogicalTimestamp): boolean {
    return this.compareTo(other) < 0;
  }

  isConcurrentWith(other: LogicalTimestamp): boolean {
    return this.timestamp === other.timestamp && 
           this.vectorClockHash !== other.vectorClockHash;
  }

  toString(): string {
    return `${this.deviceId.getShortId()}@${this.timestamp}`;
  }

  toCompactString(): string {
    return `${this.timestamp}:${this.vectorClockHash.substring(0, 8)}`;
  }

  getAge(): number {
    return Date.now() - (this.timestamp * 1000);
  }

  isExpired(maxAgeMs: number): boolean {
    return this.getAge() > maxAgeMs;
  }
}