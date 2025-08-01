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

      const queryService = proofResult.value.createQueryService();
      const statementIds = Array.from(queryService.getStatements().keys());
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

    test('no validation required when both arguments and statements are zero', () => {
      const result = spec.isSatisfiedBy(0, 0);
      expect(result).toBe(false);
    });

    test('validation required when single argument and statement exist', () => {
      const result = spec.isSatisfiedBy(1, 1);
      expect(result).toBe(true);
    });

    test('handles large numbers correctly', () => {
      const result = spec.isSatisfiedBy(1000, 1000);
      expect(result).toBe(true);
    });
  });

  describe('specification consistency', () => {
    test('CanCreateEmptyArgumentSpec and RequiresValidationSpec work together', () => {
      const emptyArgSpec = new CanCreateEmptyArgumentSpec();
      const validationSpec = new RequiresValidationSpec();

      // Create empty proof
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        // Should allow empty argument creation
        expect(emptyArgSpec.isSatisfiedBy(proof)).toBe(true);

        // Should not require validation
        const queryService = proof.createQueryService();
        expect(
          validationSpec.isSatisfiedBy(
            queryService.getArguments().size,
            queryService.getStatements().size,
          ),
        ).toBe(false);
      }
    });

    test('specifications handle edge case with single statement', () => {
      const emptyArgSpec = new CanCreateEmptyArgumentSpec();
      const validationSpec = new RequiresValidationSpec();

      // Create proof with single statement
      const proofResult = ProofAggregate.createNew({ initialStatement: 'Test statement' });
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        // Should not allow empty argument creation (since statements exist)
        expect(emptyArgSpec.isSatisfiedBy(proof)).toBe(true); // Still true because no arguments created yet

        // Create an argument
        const queryService = proof.createQueryService();
        const statementIds = Array.from(queryService.getStatements().keys());
        const firstStatementId = statementIds[0];
        if (firstStatementId) {
          const argResult = proof.createAtomicArgument([firstStatementId], []);
          expect(argResult.isOk()).toBe(true);

          // Now should not allow empty arguments
          expect(emptyArgSpec.isSatisfiedBy(proof)).toBe(false);

          // Should require validation
          const updatedQueryService = proof.createQueryService();
          expect(
            validationSpec.isSatisfiedBy(
              updatedQueryService.getArguments().size,
              updatedQueryService.getStatements().size,
            ),
          ).toBe(true);
        }
      }
    });
  });

  describe('CanHaveEmptyOrderedSetSpec edge cases', () => {
    const spec = new CanHaveEmptyOrderedSetSpec();

    test('handles mixed case context strings', () => {
      // These should not match the exact \'bootstrap\' string
      expect(spec.isSatisfiedBy('Bootstrap' as any)).toBe(false);
      expect(spec.isSatisfiedBy('BOOTSTRAP' as any)).toBe(false);
      expect(spec.isSatisfiedBy('bootstrap-mode' as any)).toBe(false);
    });

    test('handles empty string context', () => {
      expect(spec.isSatisfiedBy('' as any)).toBe(false);
    });

    test('handles whitespace context', () => {
      expect(spec.isSatisfiedBy(' bootstrap ' as any)).toBe(false);
    });
  });
});
