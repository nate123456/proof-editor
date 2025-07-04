import { describe, expect, test } from 'vitest';
import {
  CanAttachNodeSpec,
  CanCreateStatementSpec,
  IsValidProofTreeSpec,
} from '../ProofSpecifications.js';

describe('ProofSpecifications', () => {
  describe('CanCreateStatementSpec', () => {
    test('allows valid statement content', () => {
      const spec = new CanCreateStatementSpec();

      expect(spec.isSatisfiedBy('Valid statement')).toBe(true);
      expect(spec.reasonForDissatisfaction('Valid statement')).toBeNull();
    });

    test('rejects empty statement content', () => {
      const spec = new CanCreateStatementSpec();

      expect(spec.isSatisfiedBy('')).toBe(false);
      expect(spec.isSatisfiedBy('   ')).toBe(false);
      expect(spec.reasonForDissatisfaction('')).toBe('Statement content cannot be empty');
      expect(spec.reasonForDissatisfaction('   ')).toBe('Statement content cannot be empty');
    });

    test('rejects statement content that is too long', () => {
      const spec = new CanCreateStatementSpec();
      const longContent = 'a'.repeat(1001);

      expect(spec.isSatisfiedBy(longContent)).toBe(false);
      expect(spec.reasonForDissatisfaction(longContent)).toBe(
        'Statement content exceeds maximum length',
      );
    });

    test('allows statement content at maximum length', () => {
      const spec = new CanCreateStatementSpec();
      const maxContent = 'a'.repeat(1000);

      expect(spec.isSatisfiedBy(maxContent)).toBe(true);
      expect(spec.reasonForDissatisfaction(maxContent)).toBeNull();
    });

    test('trims whitespace when checking length', () => {
      const spec = new CanCreateStatementSpec();

      expect(spec.isSatisfiedBy('  Valid content  ')).toBe(true);
      expect(spec.reasonForDissatisfaction('  Valid content  ')).toBeNull();
    });
  });

  describe('CanAttachNodeSpec', () => {
    test('allows attachment when all conditions are met', () => {
      const spec = new CanAttachNodeSpec();

      expect(spec.isSatisfiedBy(true, true, true)).toBe(true);
    });

    test('rejects attachment when parent has no premises', () => {
      const spec = new CanAttachNodeSpec();

      expect(spec.isSatisfiedBy(false, true, true)).toBe(false);
    });

    test('rejects attachment when child has no conclusions', () => {
      const spec = new CanAttachNodeSpec();

      expect(spec.isSatisfiedBy(true, false, true)).toBe(false);
    });

    test('rejects attachment when position is invalid', () => {
      const spec = new CanAttachNodeSpec();

      expect(spec.isSatisfiedBy(true, true, false)).toBe(false);
    });

    test('rejects attachment when multiple conditions fail', () => {
      const spec = new CanAttachNodeSpec();

      expect(spec.isSatisfiedBy(false, false, false)).toBe(false);
      expect(spec.isSatisfiedBy(false, false, true)).toBe(false);
      expect(spec.isSatisfiedBy(false, true, false)).toBe(false);
      expect(spec.isSatisfiedBy(true, false, false)).toBe(false);
    });
  });

  describe('IsValidProofTreeSpec', () => {
    test('considers tree valid when all conditions are met', () => {
      const spec = new IsValidProofTreeSpec();

      expect(spec.isSatisfiedBy(true, true, true)).toBe(true);
    });

    test('considers tree invalid when it has no root', () => {
      const spec = new IsValidProofTreeSpec();

      expect(spec.isSatisfiedBy(false, true, true)).toBe(false);
    });

    test('considers tree invalid when it has cycles', () => {
      const spec = new IsValidProofTreeSpec();

      expect(spec.isSatisfiedBy(true, false, true)).toBe(false);
    });

    test('considers tree invalid when nodes are not all connected', () => {
      const spec = new IsValidProofTreeSpec();

      expect(spec.isSatisfiedBy(true, true, false)).toBe(false);
    });

    test('considers tree invalid when multiple conditions fail', () => {
      const spec = new IsValidProofTreeSpec();

      expect(spec.isSatisfiedBy(false, false, false)).toBe(false);
      expect(spec.isSatisfiedBy(false, false, true)).toBe(false);
      expect(spec.isSatisfiedBy(false, true, false)).toBe(false);
      expect(spec.isSatisfiedBy(true, false, false)).toBe(false);
    });
  });
});
