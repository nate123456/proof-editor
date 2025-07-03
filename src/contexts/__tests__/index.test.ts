import { describe, expect, it } from 'vitest';

import * as ContextsIndex from '../index.js';

describe('contexts/index', () => {
  it('should export without throwing errors', () => {
    expect(() => ContextsIndex).not.toThrow();
  });

  it('should be an object', () => {
    expect(typeof ContextsIndex).toBe('object');
  });

  it('should not be null or undefined', () => {
    expect(ContextsIndex).toBeDefined();
    expect(ContextsIndex).not.toBeNull();
  });

  it('should export Analysis context', () => {
    expect(ContextsIndex.Analysis).toBeDefined();
  });

  it('should export LanguageIntelligence context', () => {
    expect(ContextsIndex.LanguageIntelligence).toBeDefined();
  });

  it('should export PackageEcosystem context', () => {
    expect(ContextsIndex.PackageEcosystem).toBeDefined();
  });

  it('should export Synchronization context', () => {
    expect(ContextsIndex.Synchronization).toBeDefined();
  });
});
