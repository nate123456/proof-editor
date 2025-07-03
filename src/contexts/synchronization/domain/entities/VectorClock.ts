import { err, ok, type Result } from 'neverthrow';

import { DeviceId } from '../value-objects/DeviceId';

export class VectorClock {
  private constructor(private readonly clockMap: Map<string, number>) {}

  static create(initialDeviceId?: DeviceId): Result<VectorClock, Error> {
    const clockMap = new Map<string, number>();

    if (initialDeviceId) {
      clockMap.set(initialDeviceId.getValue(), 0);
    }

    return ok(new VectorClock(clockMap));
  }

  static fromMap(clockMap: Map<string, number>): Result<VectorClock, Error> {
    for (const [deviceId, timestamp] of Array.from(clockMap.entries())) {
      if (timestamp < 0) {
        return err(new Error(`Invalid timestamp for device ${deviceId}`));
      }
    }

    return ok(new VectorClock(new Map(clockMap)));
  }

  incrementForDevice(deviceId: DeviceId): Result<VectorClock, Error> {
    const newClockMap = new Map(this.clockMap);
    const deviceIdValue = deviceId.getValue();
    const currentTimestamp = newClockMap.get(deviceIdValue) ?? 0;
    newClockMap.set(deviceIdValue, currentTimestamp + 1);

    return VectorClock.fromMap(newClockMap);
  }

  mergeWith(otherClock: VectorClock): Result<VectorClock, Error> {
    const newClockMap = new Map(this.clockMap);

    for (const [deviceId, timestamp] of Array.from(otherClock.clockMap.entries())) {
      const currentTimestamp = newClockMap.get(deviceId) ?? 0;
      newClockMap.set(deviceId, Math.max(currentTimestamp, timestamp));
    }

    return VectorClock.fromMap(newClockMap);
  }

  happensAfter(otherClock: VectorClock): boolean {
    let hasGreaterTimestamp = false;

    for (const [deviceId, timestamp] of Array.from(this.clockMap.entries())) {
      const otherTimestamp = otherClock.clockMap.get(deviceId) ?? 0;

      if (timestamp < otherTimestamp) {
        return false;
      }

      if (timestamp > otherTimestamp) {
        hasGreaterTimestamp = true;
      }
    }

    for (const [deviceId, timestamp] of Array.from(otherClock.clockMap.entries())) {
      if (!this.clockMap.has(deviceId) && timestamp > 0) {
        return false;
      }
    }

    return hasGreaterTimestamp;
  }

  happensBefore(otherClock: VectorClock): boolean {
    return otherClock.happensAfter(this);
  }

  isConcurrentWith(otherClock: VectorClock): boolean {
    // Equal clocks are not concurrent with each other
    if (this.equals(otherClock)) {
      return false;
    }
    return !this.happensAfter(otherClock) && !this.happensBefore(otherClock);
  }

  // Alias for test compatibility
  isConcurrent(otherClock: VectorClock): boolean {
    return this.isConcurrentWith(otherClock);
  }

  equals(otherClock: VectorClock): boolean {
    if (this.clockMap.size !== otherClock.clockMap.size) {
      return false;
    }

    for (const [deviceId, timestamp] of Array.from(this.clockMap.entries())) {
      if (otherClock.clockMap.get(deviceId) !== timestamp) {
        return false;
      }
    }

    return true;
  }

  getTimestampForDevice(deviceId: DeviceId): number {
    return this.clockMap.get(deviceId.getValue()) ?? 0;
  }

  getAllDeviceIds(): DeviceId[] {
    const deviceIds: DeviceId[] = [];

    for (const deviceIdValue of Array.from(this.clockMap.keys())) {
      const deviceIdResult = DeviceId.create(deviceIdValue);
      if (deviceIdResult.isOk()) {
        deviceIds.push(deviceIdResult.value);
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
