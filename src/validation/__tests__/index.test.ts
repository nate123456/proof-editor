import { describe, expect, it } from 'vitest';

describe('validation module exports', () => {
  it('should export ProofDiagnosticProvider', async () => {
    const module = await import('../index.js');
    expect(module.ProofDiagnosticProvider).toBeDefined();
    expect(typeof module.ProofDiagnosticProvider).toBe('function');
  });

  it('should export ErrorMapper', async () => {
    const module = await import('../index.js');
    expect(module.ErrorMapper).toBeDefined();
    expect(typeof module.ErrorMapper).toBe('function');
  });

  it('should export ValidationController', async () => {
    const module = await import('../index.js');
    expect(module.ValidationController).toBeDefined();
    expect(typeof module.ValidationController).toBe('function');
  });

  it('should have all expected exports', async () => {
    const module = await import('../index.js');
    const exports = Object.keys(module);

    expect(exports).toContain('ProofDiagnosticProvider');
    expect(exports).toContain('ErrorMapper');
    expect(exports).toContain('ValidationController');
    expect(exports).toHaveLength(3);
  });

  it('should be able to import all exports in a single statement', async () => {
    const { ProofDiagnosticProvider, ErrorMapper, ValidationController } = await import(
      '../index.js'
    );

    expect(ProofDiagnosticProvider).toBeDefined();
    expect(ErrorMapper).toBeDefined();
    expect(ValidationController).toBeDefined();
  });
});
