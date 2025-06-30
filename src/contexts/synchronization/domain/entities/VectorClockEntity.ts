import type { Result } from '../../../../domain/shared/result';
import { DeviceId } from '../value-objects/DeviceId';

export class VectorClockEntity {
  private constructor(
    private readonly clockMap: Map<string, number>
  ) {}

  static create(initialDeviceId?: DeviceId): Result<VectorClockEntity, Error> {
    const clockMap = new Map<string, number>();
    
    if (initialDeviceId) {
      clockMap.set(initialDeviceId.getValue(), 0);
    }

    return {
      success: true,
      data: new VectorClockEntity(clockMap)
    };
  }

  static fromMap(clockMap: Map<string, number>): Result<VectorClockEntity, Error> {
    for (const [deviceId, timestamp] of clockMap) {
      if (timestamp < 0) {
        return { success: false, error: new Error(`Invalid timestamp for device ${deviceId}`) };
      }
    }

    return {
      success: true,
      data: new VectorClockEntity(new Map(clockMap))
    };
  }

  incrementForDevice(deviceId: DeviceId): Result<VectorClockEntity, Error> {
    const newClockMap = new Map(this.clockMap);
    const deviceIdValue = deviceId.getValue();
    const currentTimestamp = newClockMap.get(deviceIdValue) || 0;
    newClockMap.set(deviceIdValue, currentTimestamp + 1);

    return VectorClockEntity.fromMap(newClockMap);
  }

  mergeWith(otherClock: VectorClockEntity): Result<VectorClockEntity, Error> {
    const newClockMap = new Map(this.clockMap);

    for (const [deviceId, timestamp] of otherClock.clockMap) {
      const currentTimestamp = newClockMap.get(deviceId) || 0;
      newClockMap.set(deviceId, Math.max(currentTimestamp, timestamp));
    }

    return VectorClockEntity.fromMap(newClockMap);
  }

  happensAfter(otherClock: VectorClockEntity): boolean {
    let hasGreaterTimestamp = false;

    for (const [deviceId, timestamp] of this.clockMap) {
      const otherTimestamp = otherClock.clockMap.get(deviceId) || 0;
      
      if (timestamp < otherTimestamp) {
        return false;
      }
      
      if (timestamp > otherTimestamp) {
        hasGreaterTimestamp = true;
      }
    }

    for (const [deviceId, timestamp] of otherClock.clockMap) {
      if (!this.clockMap.has(deviceId) && timestamp > 0) {
        return false;
      }
    }

    return hasGreaterTimestamp;
  }

  happensBefore(otherClock: VectorClockEntity): boolean {
    return otherClock.happensAfter(this);
  }

  isConcurrentWith(otherClock: VectorClockEntity): boolean {
    return !this.happensAfter(otherClock) && !this.happensBefore(otherClock);
  }

  equals(otherClock: VectorClockEntity): boolean {
    if (this.clockMap.size !== otherClock.clockMap.size) {
      return false;
    }

    for (const [deviceId, timestamp] of this.clockMap) {
      if (otherClock.clockMap.get(deviceId) !== timestamp) {
        return false;
      }
    }

    return true;
  }

  getTimestampForDevice(deviceId: DeviceId): number {
    return this.clockMap.get(deviceId.getValue()) || 0;
  }

  getAllDeviceIds(): DeviceId[] {
    const deviceIds: DeviceId[] = [];
    
    for (const deviceIdValue of this.clockMap.keys()) {
      const deviceIdResult = DeviceId.create(deviceIdValue);
      if (deviceIdResult.success) {
        deviceIds.push(deviceIdResult.data);
      }
    }

    return deviceIds;
  }

  getClockState(): Map<string, number> {
    return new Map(this.clockMap);
  }

  toCompactString(): string {
    const entries = Array.from(this.clockMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([deviceId, timestamp]) => `${deviceId}:${timestamp}`)
      .join(',');
    
    return `{${entries}}`;
  }
}