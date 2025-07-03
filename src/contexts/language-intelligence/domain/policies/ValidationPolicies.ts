import { err, ok, type Result } from 'neverthrow';

import { SourceLocation } from '../../../../domain/shared/index.js';
import { Diagnostic } from '../entities/Diagnostic';
import type { LanguagePackage } from '../entities/LanguagePackage';
import { ValidationResult } from '../entities/ValidationResult';
import { ValidationError } from '../errors/DomainErrors';
import type { ValidationContext } from '../services/ValidationPolicyService';
import { ValidationLevel } from '../value-objects/ValidationLevel';
import { ValidationMetrics } from '../value-objects/ValidationMetrics';

export interface ValidationTarget {
  getContent(): string;
  getLanguagePackage(): LanguagePackage;
  getMetadata(): Record<string, unknown>;
}

export interface IValidationPolicy {
  readonly name: string;
  readonly level: ValidationLevel;
  readonly description: string;
  applies(context: ValidationContext): boolean;
  execute(target: ValidationTarget): Promise<Result<ValidationResult, ValidationError>>;
}

export class SyntacticValidationPolicy implements IValidationPolicy {
  readonly name = 'Syntactic Validation';
  readonly level = ValidationLevel.syntax();
  readonly description = 'Validates syntax and structural correctness of logical statements';

  applies(_context: ValidationContext): boolean {
    return true;
  }

  async execute(target: ValidationTarget): Promise<Result<ValidationResult, ValidationError>> {
    try {
      const diagnostics: Diagnostic[] = [];
      const content = target.getContent();

      if (!content || content.trim().length === 0) {
        const errorResult = Diagnostic.createSyntaxError(
          'Statement cannot be empty',
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
        );
        if (errorResult.isOk()) {
          diagnostics.push(errorResult.value);
        }
      }

      if (!this.hasBalancedParentheses(content)) {
        const errorResult = Diagnostic.createSyntaxError(
          'Unbalanced parentheses in statement',
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
          ['Add missing closing parenthesis', 'Remove extra opening parenthesis'],
        );
        if (errorResult.isOk()) {
          diagnostics.push(errorResult.value);
        }
      }

      const invalidSymbols = this.findInvalidSymbols(content);
      if (invalidSymbols.length > 0) {
        const errorResult = Diagnostic.createSyntaxError(
          `Invalid symbols found: ${invalidSymbols.join(', ')}`,
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
          [`Use valid logical symbols`],
        );
        if (errorResult.isOk()) {
          diagnostics.push(errorResult.value);
        }
      }

      const hasErrors = diagnostics.some((d) => d.getSeverity().isError());
      const documentId = `syntactic-${Date.now()}`;
      const metricsResult = ValidationMetrics.create(
        1, // elapsedMs
        diagnostics.length, // issueCount
        content.length, // inputSize
        1, // ruleCount
      );

      if (metricsResult.isErr()) {
        return err(metricsResult.error);
      }

      const metrics = metricsResult.value;

      if (hasErrors) {
        const result = ValidationResult.createFailedValidation(
          this.level,
          diagnostics,
          documentId,
          target.getLanguagePackage().getId().getValue(),
          metrics,
        );
        return result.isOk() ? ok(result.value) : err(result.error);
      }

      const result = ValidationResult.createSuccessfulValidation(
        this.level,
        documentId,
        target.getLanguagePackage().getId().getValue(),
        metrics,
      );
      return result.isOk() ? ok(result.value) : err(result.error);
    } catch (error) {
      return err(
        new ValidationError(
          'Syntactic validation failed',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private hasBalancedParentheses(content: string): boolean {
    let count = 0;
    for (const char of content) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  private findInvalidSymbols(content: string): string[] {
    const allSymbols = content.match(/[^\w\s(),.]/g) ?? [];
    const validSymbols = ['∀', '∃', '∧', '∨', '¬', '→', '↔', '∴', '∵'];
    return allSymbols.filter((symbol) => !validSymbols.includes(symbol));
  }
}

export class SemanticValidationPolicy implements IValidationPolicy {
  readonly name = 'Semantic Validation';
  readonly level = ValidationLevel.semantic();
  readonly description = 'Validates semantic correctness and logical consistency';

  applies(context: ValidationContext): boolean {
    return context.requiresSemanticAnalysis();
  }

  async execute(target: ValidationTarget): Promise<Result<ValidationResult, ValidationError>> {
    try {
      const diagnostics: Diagnostic[] = [];
      const content = target.getContent();

      if (this.hasLogicalContradiction(content)) {
        const errorResult = Diagnostic.createSemanticError(
          'Statement contains logical contradiction',
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
          ['Remove contradictory terms', 'Clarify intended meaning'],
        );
        if (errorResult.isOk()) {
          diagnostics.push(errorResult.value);
        }
      }

      if (this.hasUnboundVariables(content)) {
        const errorResult = Diagnostic.createSemanticError(
          'Statement contains unbound variables',
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
          ['Add proper quantification', 'Define variable scope'],
        );
        if (errorResult.isOk()) {
          diagnostics.push(errorResult.value);
        }
      }

      const hasErrors = diagnostics.some((d) => d.getSeverity().isError());
      const documentId = `semantic-${Date.now()}`;
      const metricsResult = ValidationMetrics.create(
        2, // elapsedMs
        diagnostics.length, // issueCount
        content.length, // inputSize
        1, // ruleCount
      );

      if (metricsResult.isErr()) {
        return err(metricsResult.error);
      }

      const metrics = metricsResult.value;

      if (hasErrors) {
        const result = ValidationResult.createFailedValidation(
          this.level,
          diagnostics,
          documentId,
          target.getLanguagePackage().getId().getValue(),
          metrics,
        );
        return result.isOk() ? ok(result.value) : err(result.error);
      }

      const result = ValidationResult.createSuccessfulValidation(
        this.level,
        documentId,
        target.getLanguagePackage().getId().getValue(),
        metrics,
      );
      return result.isOk() ? ok(result.value) : err(result.error);
    } catch (error) {
      return err(
        new ValidationError(
          'Semantic validation failed',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private hasLogicalContradiction(content: string): boolean {
    return content.includes('contradiction') && content.includes('valid');
  }

  private hasUnboundVariables(content: string): boolean {
    const variables = content.match(/[a-z]/g) ?? [];
    const quantifiers = content.match(/[∀∃]/g) ?? [];
    return variables.length > quantifiers.length;
  }
}

export class FlowValidationPolicy implements IValidationPolicy {
  readonly name = 'Flow Validation';
  readonly level = ValidationLevel.flow();
  readonly description = 'Validates argument flow and logical connections between statements';

  applies(context: ValidationContext): boolean {
    return context.needsFlowValidation();
  }

  async execute(target: ValidationTarget): Promise<Result<ValidationResult, ValidationError>> {
    try {
      const diagnostics: Diagnostic[] = [];
      const content = target.getContent();

      if (this.hasBrokenInferenceChain(content)) {
        const errorResult = Diagnostic.createSemanticError(
          'Inference chain is incomplete or broken',
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
          ['Add missing intermediate steps', 'Verify logical flow'],
        );
        if (errorResult.isOk()) {
          diagnostics.push(errorResult.value);
        }
      }

      if (this.hasCircularReasoning(content)) {
        const errorResult = Diagnostic.createSemanticError(
          'Circular reasoning detected',
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
          ['Remove circular dependencies', 'Restructure argument'],
        );
        if (errorResult.isOk()) {
          diagnostics.push(errorResult.value);
        }
      }

      const hasErrors = diagnostics.some((d) => d.getSeverity().isError());
      const documentId = `flow-${Date.now()}`;
      const metricsResult = ValidationMetrics.create(
        3, // elapsedMs
        diagnostics.length, // issueCount
        content.length, // inputSize
        1, // ruleCount
      );

      if (metricsResult.isErr()) {
        return err(metricsResult.error);
      }

      const metrics = metricsResult.value;

      if (hasErrors) {
        const result = ValidationResult.createFailedValidation(
          this.level,
          diagnostics,
          documentId,
          target.getLanguagePackage().getId().getValue(),
          metrics,
        );
        return result.isOk() ? ok(result.value) : err(result.error);
      }

      const result = ValidationResult.createSuccessfulValidation(
        this.level,
        documentId,
        target.getLanguagePackage().getId().getValue(),
        metrics,
      );
      return result.isOk() ? ok(result.value) : err(result.error);
    } catch (error) {
      return err(
        new ValidationError('Flow validation failed', error instanceof Error ? error : undefined),
      );
    }
  }

  private hasBrokenInferenceChain(content: string): boolean {
    return content.includes('therefore') && !content.includes('because');
  }

  private hasCircularReasoning(_content: string): boolean {
    return false;
  }
}

export class StyleValidationPolicy implements IValidationPolicy {
  readonly name = 'Style Validation';
  readonly level = ValidationLevel.style();
  readonly description = 'Validates style conventions and formatting requirements';

  applies(context: ValidationContext): boolean {
    return context.requiresStyleValidation();
  }

  async execute(target: ValidationTarget): Promise<Result<ValidationResult, ValidationError>> {
    try {
      const diagnostics: Diagnostic[] = [];
      const content = target.getContent();

      if (content.length > 200) {
        const warningResult = Diagnostic.createStyleWarning(
          'Statement is long, consider breaking it down',
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
          ['Break into smaller statements', 'Use shorter sentences'],
        );
        if (warningResult.isOk()) {
          diagnostics.push(warningResult.value);
        }
      }

      if (this.hasInconsistentFormatting(content)) {
        const warningResult = Diagnostic.createStyleWarning(
          'Inconsistent formatting detected',
          SourceLocation.createDefault(),
          target.getLanguagePackage().getId().getValue(),
          ['Use consistent spacing', 'Follow style guidelines'],
        );
        if (warningResult.isOk()) {
          diagnostics.push(warningResult.value);
        }
      }

      const hasErrors = diagnostics.some((d) => d.getSeverity().isError());
      const documentId = `style-${Date.now()}`;

      const metricsResult = ValidationMetrics.create(
        1, // validationTimeMs
        diagnostics.length, // issueCount
        content.length, // inputSize
        1, // ruleCount
      );

      if (metricsResult.isErr()) {
        return err(metricsResult.error);
      }

      if (hasErrors) {
        const result = ValidationResult.createFailedValidation(
          this.level,
          diagnostics,
          documentId,
          target.getLanguagePackage().getId().getValue(),
          metricsResult.value,
        );
        return result.isOk() ? ok(result.value) : err(result.error);
      }

      const result = ValidationResult.createSuccessfulValidation(
        this.level,
        documentId,
        target.getLanguagePackage().getId().getValue(),
        metricsResult.value,
      );
      return result.isOk() ? ok(result.value) : err(result.error);
    } catch (error) {
      return err(
        new ValidationError('Style validation failed', error instanceof Error ? error : undefined),
      );
    }
  }

  private hasInconsistentFormatting(content: string): boolean {
    const spacingIssues = content.includes('  ') || content.includes('\t');
    return spacingIssues;
  }
}
