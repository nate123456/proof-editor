export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isInteger(value: number): boolean {
  return (
    typeof value === 'number' && globalThis.Number.isFinite(value) && Math.floor(value) === value
  );
}

export function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && globalThis.Number.isFinite(value);
}

export abstract class ValueObject<T> {
  constructor(protected readonly value: T) {}

  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.value === other.value;
  }

  getValue(): T {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}
