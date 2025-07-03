import { err, ok, type Result } from 'neverthrow';

import type { DeviceId } from './DeviceId';

export class OperationId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<OperationId, Error> {
    if (!value || typeof value !== 'string') {
      return err(new Error('Operation ID must be a non-empty string'));
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return err(new Error('Operation ID cannot be empty or whitespace'));
    }

    if (trimmedValue.length > 128) {
      return err(new Error('Operation ID cannot exceed 128 characters'));
    }

    if (!/^[a-zA-Z0-9-_:.]+$/.test(trimmedValue)) {
      return err(
        new Error(
          'Operation ID can only contain alphanumeric characters, hyphens, underscores, colons, and periods',
        ),
      );
    }

    return ok(new OperationId(trimmedValue));
  }

  static generate(deviceId: DeviceId, sequenceNumber: number): Result<OperationId, Error> {
    if (sequenceNumber < 0) {
      return err(new Error('Sequence number cannot be negative'));
    }

    const timestamp = Date.now().toString(36);
    const deviceIdShort = deviceId.getShortId();
    const operationId = `op_${deviceIdShort}_${sequenceNumber}_${timestamp}`;

    return OperationId.create(operationId);
  }

  static generateWithUUID(deviceId: DeviceId): Result<OperationId, Error> {
    const uuid = OperationId.generateUUID();
    const deviceIdShort = deviceId.getShortId();
    const operationId = `op_${deviceIdShort}_${uuid}`;

    return OperationId.create(operationId);
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  getValue(): string {
    return this.value;
  }

  equals(other: OperationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  getDeviceId(): string | null {
    const parts = this.value.split('_');
    if (parts.length >= 3 && parts[0] === 'op') {
      return parts[1] ?? null;
    }
    return null;
  }

  getSequenceNumber(): number | null {
    const parts = this.value.split('_');
    if (parts.length >= 4 && parts[0] === 'op') {
      const seqNum = Number.parseInt(parts[2] ?? '0', 10);
      return Number.isNaN(seqNum) ? null : seqNum;
    }
    return null;
  }

  getTimestamp(): number | null {
    const parts = this.value.split('_');
    if (parts.length >= 4 && parts[0] === 'op') {
      const timestamp = Number.parseInt(parts[3] ?? '0', 36);
      return Number.isNaN(timestamp) ? null : timestamp;
    }
    return null;
  }

  isFromDevice(deviceId: DeviceId): boolean {
    const extractedDeviceId = this.getDeviceId();
    return extractedDeviceId === deviceId.getShortId();
  }

  isOlderThan(other: OperationId): boolean {
    const thisTimestamp = this.getTimestamp();
    const otherTimestamp = other.getTimestamp();

    if (thisTimestamp === null || otherTimestamp === null) {
      return false;
    }

    return thisTimestamp < otherTimestamp;
  }

  isNewerThan(other: OperationId): boolean {
    const thisTimestamp = this.getTimestamp();
    const otherTimestamp = other.getTimestamp();

    if (thisTimestamp === null || otherTimestamp === null) {
      return false;
    }

    return thisTimestamp > otherTimestamp;
  }

  getShortId(): string {
    if (this.value.length <= 16) {
      return this.value;
    }

    return `${this.value.substring(0, 8)}...${this.value.substring(this.value.length - 8)}`;
  }

  compareBySequence(other: OperationId): number {
    const thisSeq = this.getSequenceNumber();
    const otherSeq = other.getSequenceNumber();

    if (thisSeq === null || otherSeq === null) {
      return this.value.localeCompare(other.value);
    }

    return thisSeq - otherSeq;
  }
}
