import { type MockProxy, mock } from 'jest-mock-extended';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LanguagePackage } from '../../entities/LanguagePackage';
import type { ValidationContext } from '../../services/ValidationPolicyService';
import type { LanguagePackageId } from '../../value-objects/LanguagePackageId';
import {
  FlowValidationPolicy,
  SemanticValidationPolicy,
  StyleValidationPolicy,
  SyntacticValidationPolicy,
  type ValidationTarget,
} from '../ValidationPolicies';

describe('ValidationPolicies', () => {
  let mockTarget: MockProxy<ValidationTarget>;
  let mockLanguagePackage: MockProxy<LanguagePackage>;
  let mockContext: MockProxy<ValidationContext>;

  beforeEach(() => {
    mockLanguagePackage = mock<LanguagePackage>();
    mockLanguagePackage.getId.mockReturnValue({
      getValue: () => 'test-package',
    } as LanguagePackageId);

    mockTarget = mock<ValidationTarget>();
    mockTarget.getLanguagePackage.mockReturnValue(mockLanguagePackage);
    mockTarget.getMetadata.mockReturnValue({});

    mockContext = mock<ValidationContext>();
  });

  describe('SyntacticValidationPolicy', () => {
    let policy: SyntacticValidationPolicy;

    beforeEach(() => {
      policy = new SyntacticValidationPolicy();
    });

    it('should have correct metadata', () => {
      expect(policy.name).toBe('Syntactic Validation');
      expect(policy.level.isSyntax()).toBe(true);
      expect(policy.description).toContain('syntax and structural correctness');
    });

    it('should always apply to any context', () => {
      mockContext.requiresSemanticAnalysis.mockReturnValue(false);
      mockContext.needsFlowValidation.mockReturnValue(false);

      const applies = policy.applies(mockContext);

      expect(applies).toBe(true);
    });

    it('should detect empty statement errors', async () => {
      mockTarget.getContent.mockReturnValue('');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]?.getMessage().getValue()).toContain('cannot be empty');
        expect(diagnostics[0]?.getSeverity().isError()).toBe(true);
      }
    });

    it('should detect unbalanced parentheses', async () => {
      mockTarget.getContent.mockReturnValue('P ∧ (Q ∨ R');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics.some((d) => d.getMessage().getValue().includes('parentheses'))).toBe(
          true,
        );
      }
    });

    it('should detect invalid symbols', async () => {
      mockTarget.getContent.mockReturnValue('P ∧ Q @ R');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics.some((d) => d.getMessage().getValue().includes('Invalid symbols'))).toBe(
          true,
        );
      }
    });

    it('should pass validation for correct syntax', async () => {
      mockTarget.getContent.mockReturnValue('P ∧ (Q ∨ R)');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.filter((d) => d.getSeverity().isError())).toHaveLength(0);
      }
    });

    it('should handle execution errors gracefully', async () => {
      mockTarget.getContent.mockImplementation(() => {
        throw new Error('Content access failed');
      });

      const result = await policy.execute(mockTarget);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Syntactic validation failed');
      }
    });
  });

  describe('SemanticValidationPolicy', () => {
    let policy: SemanticValidationPolicy;

    beforeEach(() => {
      policy = new SemanticValidationPolicy();
    });

    it('should have correct metadata', () => {
      expect(policy.name).toBe('Semantic Validation');
      expect(policy.level.isSemantic()).toBe(true);
      expect(policy.description).toContain('semantic correctness and logical consistency');
    });

    it('should apply when semantic analysis is required', () => {
      mockContext.requiresSemanticAnalysis.mockReturnValue(true);

      const applies = policy.applies(mockContext);

      expect(applies).toBe(true);
    });

    it('should not apply when semantic analysis is not required', () => {
      mockContext.requiresSemanticAnalysis.mockReturnValue(false);

      const applies = policy.applies(mockContext);

      expect(applies).toBe(false);
    });

    it('should detect logical contradictions', async () => {
      mockTarget.getContent.mockReturnValue('This statement is both valid and contradiction');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics.some((d) => d.getMessage().getValue().includes('contradiction'))).toBe(
          true,
        );
      }
    });

    it('should detect unbound variables', async () => {
      mockTarget.getContent.mockReturnValue('P(x) ∧ Q(y)');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(
          diagnostics.some((d) => d.getMessage().getValue().includes('unbound variables')),
        ).toBe(true);
      }
    });

    it('should pass validation for semantically correct content', async () => {
      mockTarget.getContent.mockReturnValue('∀x (P(x) → Q(x))');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.filter((d) => d.getSeverity().isError())).toHaveLength(0);
      }
    });
  });

  describe('FlowValidationPolicy', () => {
    let policy: FlowValidationPolicy;

    beforeEach(() => {
      policy = new FlowValidationPolicy();
    });

    it('should have correct metadata', () => {
      expect(policy.name).toBe('Flow Validation');
      expect(policy.level.isFlow()).toBe(true);
      expect(policy.description).toContain('argument flow and logical connections');
    });

    it('should apply when flow validation is needed', () => {
      mockContext.needsFlowValidation.mockReturnValue(true);

      const applies = policy.applies(mockContext);

      expect(applies).toBe(true);
    });

    it('should not apply when flow validation is not needed', () => {
      mockContext.needsFlowValidation.mockReturnValue(false);

      const applies = policy.applies(mockContext);

      expect(applies).toBe(false);
    });

    it('should detect broken inference chains', async () => {
      mockTarget.getContent.mockReturnValue('P is true, therefore Q is true');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics.some((d) => d.getMessage().getValue().includes('Inference chain'))).toBe(
          true,
        );
      }
    });

    it('should pass validation for proper flow', async () => {
      mockTarget.getContent.mockReturnValue('P is true because of X, therefore Q follows');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.filter((d) => d.getSeverity().isError())).toHaveLength(0);
      }
    });
  });

  describe('StyleValidationPolicy', () => {
    let policy: StyleValidationPolicy;

    beforeEach(() => {
      policy = new StyleValidationPolicy();
    });

    it('should have correct metadata', () => {
      expect(policy.name).toBe('Style Validation');
      expect(policy.level.isStyle()).toBe(true);
      expect(policy.description).toContain('style conventions and formatting');
    });

    it('should apply when style validation is required', () => {
      mockContext.requiresStyleValidation.mockReturnValue(true);

      const applies = policy.applies(mockContext);

      expect(applies).toBe(true);
    });

    it('should not apply when style validation is not required', () => {
      mockContext.requiresStyleValidation.mockReturnValue(false);

      const applies = policy.applies(mockContext);

      expect(applies).toBe(false);
    });

    it('should warn about long statements', async () => {
      const longContent = 'P'.repeat(250);
      mockTarget.getContent.mockReturnValue(longContent);

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics.some((d) => d.getMessage().getValue().includes('long'))).toBe(true);
        expect(diagnostics.some((d) => d.getSeverity().isWarning())).toBe(true);
      }
    });

    it('should warn about inconsistent formatting', async () => {
      mockTarget.getContent.mockReturnValue('P  ∧  Q\t∨  R');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics.some((d) => d.getMessage().getValue().includes('formatting'))).toBe(
          true,
        );
      }
    });

    it('should pass validation for well-formatted content', async () => {
      mockTarget.getContent.mockReturnValue('P ∧ Q ∨ R');

      const result = await policy.execute(mockTarget);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.filter((d) => d.getSeverity().isError())).toHaveLength(0);
      }
    });
  });
});
