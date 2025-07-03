import { describe, expect, it } from 'vitest';

import * as SharedIndex from '../index.js';

describe('domain/shared/index', () => {
  it('should export without throwing errors', () => {
    expect(() => SharedIndex).not.toThrow();
  });

  it('should be an object', () => {
    expect(typeof SharedIndex).toBe('object');
  });

  it('should not be null or undefined', () => {
    expect(SharedIndex).toBeDefined();
    expect(SharedIndex).not.toBeNull();
  });

  it('should export ValidationError', () => {
    expect(SharedIndex.ValidationError).toBeDefined();
  });

  it('should export StatementContent', () => {
    expect(SharedIndex.StatementContent).toBeDefined();
  });

  it('should export StatementId', () => {
    expect(SharedIndex.StatementId).toBeDefined();
  });
});
