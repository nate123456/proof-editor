import { describe, expect, test } from 'vitest';
import { ProofAggregate } from '../../aggregates/ProofAggregate.js';
import {
  CanCreateEmptyArgumentSpec,
  CanHaveEmptyOrderedSetSpec,
  RequiresValidationSpec,
} from '../BootstrapSpecifications.js';

describe('BootstrapSpecifications', () => {
  describe('CanCreateEmptyArgumentSpec', () => {
    const spec = new CanCreateEmptyArgumentSpec();

    test('allows empty argument when no arguments exist', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);
      if (!proofResult.isOk()) return;

      const result = spec.isSatisfiedBy(proofResult.value);
      expect(result).toBe(true);
    });

    test('disallows empty argument when arguments exist', () => {
      const proofResult = ProofAggregate.createNew({ initialStatement: 'Test' });
      expect(proofResult.isOk()).toBe(true);
      if (!proofResult.isOk()) return;

      const statementIds = Array.from(proofResult.value.getStatements().keys());
      const firstStatementId = statementIds[0];
      if (!firstStatementId) {
        throw new Error('Expected at least one statement to exist');
      }
      const argResult = proofResult.value.createAtomicArgument([firstStatementId], []);
      expect(argResult.isOk()).toBe(true);

      const result = spec.isSatisfiedBy(proofResult.value);
      expect(result).toBe(false);
    });
  });

  describe('CanHaveEmptyOrderedSetSpec', () => {
    const spec = new CanHaveEmptyOrderedSetSpec();

    test('allows empty ordered set in bootstrap context', () => {
      const result = spec.isSatisfiedBy('bootstrap');
      expect(result).toBe(true);
    });

    test('disallows empty ordered set in normal context', () => {
      const result = spec.isSatisfiedBy('normal');
      expect(result).toBe(false);
    });
  });

  describe('RequiresValidationSpec', () => {
    const spec = new RequiresValidationSpec();

    test('no validation required when no arguments', () => {
      const result = spec.isSatisfiedBy(0, 5);
      expect(result).toBe(false);
    });

    test('no validation required when no statements', () => {
      const result = spec.isSatisfiedBy(5, 0);
      expect(result).toBe(false);
    });

    test('validation required when both arguments and statements exist', () => {
      const result = spec.isSatisfiedBy(3, 5);
      expect(result).toBe(true);
    });
  });
});
