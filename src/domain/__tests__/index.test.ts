import { describe, expect, it } from 'vitest';

import * as DomainIndex from '../index.js';

describe('domain/index', () => {
  it('should export without throwing errors', () => {
    expect(() => DomainIndex).not.toThrow();
  });

  it('should be an object', () => {
    expect(typeof DomainIndex).toBe('object');
  });

  it('should not be null or undefined', () => {
    expect(DomainIndex).toBeDefined();
    expect(DomainIndex).not.toBeNull();
  });
});
