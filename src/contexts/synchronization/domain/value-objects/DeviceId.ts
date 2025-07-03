import { err, ok, type Result } from 'neverthrow';

export class DeviceId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<DeviceId, Error> {
    if (!value || typeof value !== 'string') {
      return err(new Error('Device ID must be a non-empty string'));
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return err(new Error('Device ID cannot be empty or whitespace'));
    }

    if (trimmedValue.length > 64) {
      return err(new Error('Device ID cannot exceed 64 characters'));
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(trimmedValue)) {
      return err(
        new Error('Device ID can only contain alphanumeric characters, hyphens, and underscores'),
      );
    }

    return ok(new DeviceId(trimmedValue));
  }

  static generateRandom(): Result<DeviceId, Error> {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const deviceId = `device-${timestamp}-${randomPart}`;

    return DeviceId.create(deviceId);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: DeviceId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  isLocalDevice(): boolean {
    return this.value.startsWith('local-') || this.value.includes('localhost');
  }

  getShortId(): string {
    if (this.value.length <= 8) {
      return this.value;
    }

    return `${this.value.substring(0, 4)}...${this.value.substring(this.value.length - 4)}`;
  }
}
