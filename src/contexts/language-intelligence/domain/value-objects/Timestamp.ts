import { err as _err, ok as _ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class Timestamp {
  private constructor(private readonly value: Date) {}

  static create(date: Date): Result<Timestamp, ValidationError> {
    if (!date || Number.isNaN(date.getTime())) {
      return _err(new ValidationError('Invalid date provided'));
    }

    return _ok(new Timestamp(new Date(date.getTime())));
  }

  static fromMilliseconds(milliseconds: number): Result<Timestamp, ValidationError> {
    if (milliseconds < 0) {
      return _err(new ValidationError('Timestamp cannot be negative'));
    }

    return Timestamp.create(new Date(milliseconds));
  }

  static fromISOString(isoString: string): Result<Timestamp, ValidationError> {
    try {
      const date = new Date(isoString);
      return Timestamp.create(date);
    } catch {
      return _err(new ValidationError('Invalid ISO string format'));
    }
  }

  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  getValue(): Date {
    return new Date(this.value.getTime());
  }

  getMilliseconds(): number {
    return this.value.getTime();
  }

  toISOString(): string {
    return this.value.toISOString();
  }

  toLocaleDateString(): string {
    return this.value.toLocaleDateString();
  }

  toLocaleTimeString(): string {
    return this.value.toLocaleTimeString();
  }

  toLocaleString(): string {
    return this.value.toLocaleString();
  }

  isBefore(other: Timestamp): boolean {
    return this.value.getTime() < other.value.getTime();
  }

  isAfter(other: Timestamp): boolean {
    return this.value.getTime() > other.value.getTime();
  }

  equals(other: Timestamp): boolean {
    return this.value.getTime() === other.value.getTime();
  }

  getAge(): number {
    return Date.now() - this.value.getTime();
  }

  isOlderThan(milliseconds: number): boolean {
    return this.getAge() > milliseconds;
  }

  isNewerThan(milliseconds: number): boolean {
    return this.getAge() < milliseconds;
  }

  addMilliseconds(milliseconds: number): Timestamp {
    return new Timestamp(new Date(this.value.getTime() + milliseconds));
  }

  addSeconds(seconds: number): Timestamp {
    return this.addMilliseconds(seconds * 1000);
  }

  addMinutes(minutes: number): Timestamp {
    return this.addSeconds(minutes * 60);
  }

  addHours(hours: number): Timestamp {
    return this.addMinutes(hours * 60);
  }

  addDays(days: number): Timestamp {
    return this.addHours(days * 24);
  }

  toString(): string {
    return this.value.toISOString();
  }
}
