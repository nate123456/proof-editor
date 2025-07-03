import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import { SourceLocation } from '../../../../domain/shared/index.js';
import { Diagnostic } from '../entities/Diagnostic';
import type { InferenceRule } from '../entities/InferenceRule';
import type { LanguagePackage } from '../entities/LanguagePackage';
import { ValidationResult } from '../entities/ValidationResult';
import { type DomainError, ValidationError } from '../errors/DomainErrors';
import { DiagnosticSeverity } from '../value-objects/DiagnosticSeverity';
import { PerformanceTracker } from '../value-objects/PerformanceTracker';
import { ValidationLevel } from '../value-objects/ValidationLevel';
import { ValidationMetrics } from '../value-objects/ValidationMetrics';

@injectable()
export class LogicValidationService {
  private readonly performanceTarget = 10; // 10ms target

  validateStatement(
    statement: string,
    location: SourceLocation,
    languagePackage: LanguagePackage,
    level: ValidationLevel,
  ): Result<ValidationResult, DomainError> {
    const tracker = PerformanceTracker.start();
    const documentId = `temp-${Date.now()}`;

    try {
      const diagnostics: Diagnostic[] = [];

      // Syntax validation
      if (level.includesLevel(ValidationLevel.syntax())) {
        const syntaxDiagnostics = this.validateSyntax(statement, location, languagePackage);
        diagnostics.push(...syntaxDiagnostics);
      }

      // Flow validation
      if (level.includesLevel(ValidationLevel.flow())) {
        const flowDiagnostics = this.validateFlow(statement, location, languagePackage);
        diagnostics.push(...flowDiagnostics);
      }

      // Semantic validation
      if (level.includesLevel(ValidationLevel.semantic())) {
        const semanticDiagnostics = this.validateSemantics(statement, location, languagePackage);
        diagnostics.push(...semanticDiagnostics);
      }

      // Style validation
      if (level.includesLevel(ValidationLevel.style())) {
        const styleDiagnostics = this.validateStyle(statement, location, languagePackage);
        diagnostics.push(...styleDiagnostics);
      }

      const metrics = ValidationMetrics.create(
        tracker.getElapsedMs(),
        diagnostics.length,
        statement.length,
        1,
      );

      if (metrics.isErr()) {
        return err(new ValidationError('Failed to create validation metrics'));
      }

      // Create result based on validation outcome
      const hasErrors = diagnostics.some((d) => d.getSeverity().isError());

      if (hasErrors) {
        const failedValidationResult = ValidationResult.createFailedValidation(
          level,
          diagnostics,
          documentId,
          languagePackage.getId().getValue(),
          metrics.value,
        );
        if (failedValidationResult.isErr()) {
          return err(failedValidationResult.error);
        }
        return ok(failedValidationResult.value);
      } else if (diagnostics.length > 0) {
        // Successful validation with warnings - create as failed validation but should be treated as valid
        const validationWithWarnings = ValidationResult.createFailedValidation(
          level,
          diagnostics,
          documentId,
          languagePackage.getId().getValue(),
          metrics.value,
        );
        if (validationWithWarnings.isErr()) {
          return err(validationWithWarnings.error);
        }
        return ok(validationWithWarnings.value);
      } else {
        const successfulValidationResult = ValidationResult.createSuccessfulValidation(
          level,
          documentId,
          languagePackage.getId().getValue(),
          metrics.value,
        );
        if (successfulValidationResult.isErr()) {
          return err(successfulValidationResult.error);
        }
        return ok(successfulValidationResult.value);
      }
    } catch (error) {
      return err(
        new ValidationError(
          'Validation failed with unexpected error',
          error instanceof Error ? error : undefined,
        ),
      );
    } finally {
      tracker.stop();
    }
  }

  validateInference(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
    level: ValidationLevel,
  ): Result<ValidationResult, DomainError> {
    const tracker = PerformanceTracker.start();
    const documentId = `inference-${Date.now()}`;

    try {
      const diagnostics: Diagnostic[] = [];

      // Find matching inference rules
      const matchingRules = languagePackage.findMatchingRules(premises, conclusions);

      if (matchingRules.length === 0) {
        const errorResult = Diagnostic.createSemanticError(
          'No valid inference rule found for this argument structure',
          SourceLocation.createDefault(),
          languagePackage.getId().getValue(),
          ['Try breaking down the argument into simpler steps'],
        );

        if (errorResult.isErr()) {
          return err(new ValidationError('Failed to create diagnostic'));
        }

        diagnostics.push(errorResult.value);
      } else {
        // Validate with the best matching rule
        const bestRule = this.selectBestRule(matchingRules, premises, conclusions);
        const ruleValidation = this.validateWithRule(
          premises,
          conclusions,
          bestRule,
          languagePackage,
          level,
        );

        if (ruleValidation.isErr()) {
          return err(ruleValidation.error);
        }

        diagnostics.push(...ruleValidation.value);
      }

      const metrics = ValidationMetrics.create(
        tracker.getElapsedMs(),
        diagnostics.length,
        premises.join(' ').length + conclusions.join(' ').length,
        1,
      );

      if (metrics.isErr()) {
        return err(new ValidationError('Failed to create validation metrics'));
      }

      const hasErrors = diagnostics.some((d) => d.getSeverity().isError());

      if (hasErrors) {
        const failedValidationResult = ValidationResult.createFailedValidation(
          level,
          diagnostics,
          documentId,
          languagePackage.getId().getValue(),
          metrics.value,
        );
        if (failedValidationResult.isErr()) {
          return err(failedValidationResult.error);
        }
        return ok(failedValidationResult.value);
      } else if (diagnostics.length > 0) {
        // Successful validation with warnings - create as failed validation but should be treated as valid
        const validationWithWarnings = ValidationResult.createFailedValidation(
          level,
          diagnostics,
          documentId,
          languagePackage.getId().getValue(),
          metrics.value,
        );
        if (validationWithWarnings.isErr()) {
          return err(validationWithWarnings.error);
        }
        return ok(validationWithWarnings.value);
      } else {
        const successfulValidationResult = ValidationResult.createSuccessfulValidation(
          level,
          documentId,
          languagePackage.getId().getValue(),
          metrics.value,
        );
        if (successfulValidationResult.isErr()) {
          return err(successfulValidationResult.error);
        }
        return ok(successfulValidationResult.value);
      }
    } catch (error) {
      return err(
        new ValidationError(
          'Inference validation failed with unexpected error',
          error instanceof Error ? error : undefined,
        ),
      );
    } finally {
      tracker.stop();
    }
  }

  validateProofStructure(
    _statements: string[],
    _connections: { from: number; to: number }[],
    _languagePackage: LanguagePackage,
    _level: ValidationLevel,
  ): Result<ValidationResult, DomainError> {
    // Simplified implementation
    const documentId = `proof-${Date.now()}`;

    const metrics = ValidationMetrics.empty();

    const validationResult = ValidationResult.createSuccessfulValidation(
      ValidationLevel.syntax(),
      documentId,
      'default-package',
      metrics,
    );

    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    return ok(validationResult.value);
  }

  private validateSyntax(
    statement: string,
    location: SourceLocation,
    languagePackage: LanguagePackage,
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check for empty statements
    if (!statement || statement.trim().length === 0) {
      const errorResult = Diagnostic.createSyntaxError(
        'Statement cannot be empty',
        location,
        languagePackage.getId().getValue(),
      );
      if (errorResult.isOk()) {
        diagnostics.push(errorResult.value);
      }
      return diagnostics;
    }

    // Check for balanced parentheses
    if (!this.hasBalancedParentheses(statement)) {
      const errorResult = Diagnostic.createSyntaxError(
        'Unbalanced parentheses in statement',
        location,
        languagePackage.getId().getValue(),
        ['Add missing closing parenthesis', 'Remove extra opening parenthesis'],
      );
      if (errorResult.isOk()) {
        diagnostics.push(errorResult.value);
      }
    }

    // Check for valid symbols
    const invalidSymbols = this.findInvalidSymbols(statement, languagePackage);
    if (invalidSymbols.length > 0) {
      const errorResult = Diagnostic.createSyntaxError(
        `Invalid symbols found: ${invalidSymbols.join(', ')}`,
        location,
        languagePackage.getId().getValue(),
        [`Use valid symbols from ${languagePackage.getName().getValue()}`],
      );
      if (errorResult.isOk()) {
        diagnostics.push(errorResult.value);
      }
    }

    return diagnostics;
  }

  private validateSemantics(
    statement: string,
    location: SourceLocation,
    _languagePackage: LanguagePackage,
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Basic semantic validation
    if (statement.includes('contradiction') && statement.includes('valid')) {
      const errorResult = Diagnostic.createSemanticError(
        'Statement contains logical contradiction',
        location,
        'default-package',
        ['Remove contradictory terms', 'Clarify intended meaning'],
      );
      if (errorResult.isOk()) {
        diagnostics.push(errorResult.value);
      }
    }

    return diagnostics;
  }

  private validateFlow(
    statement: string,
    _location: SourceLocation,
    _languagePackage: LanguagePackage,
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Basic flow validation
    if (statement.includes('therefore') && !statement.includes('because')) {
      // Could add flow diagnostics here
    }

    return diagnostics;
  }

  private validateStyle(
    statement: string,
    location: SourceLocation,
    _languagePackage: LanguagePackage,
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Style validation
    if (statement.length > 200) {
      const warningResult = Diagnostic.create(
        DiagnosticSeverity.warning(),
        'Statement is long, consider breaking it down',
        'style-length',
        location,
        'default-package',
        ['Break into smaller statements', 'Use shorter sentences'],
        ['style'],
      );
      if (warningResult.isOk()) {
        diagnostics.push(warningResult.value);
      }
    }

    return diagnostics;
  }

  private selectBestRule(
    rules: InferenceRule[],
    premises: string[],
    conclusions: string[],
  ): InferenceRule {
    if (rules.length === 0) {
      throw new Error('No rules provided to selectBestRule');
    }

    const firstRule = rules[0];
    if (!firstRule) {
      throw new Error('No rules provided to selectBestRule');
    }
    let bestRule: InferenceRule = firstRule;
    let bestScore = 0;

    for (const rule of rules) {
      const confidence = rule.getPatternConfidence(premises, conclusions);
      if (confidence > bestScore) {
        bestScore = confidence;
        bestRule = rule;
      }
    }

    return bestRule;
  }

  private validateWithRule(
    premises: string[],
    conclusions: string[],
    rule: InferenceRule,
    languagePackage: LanguagePackage,
    _level: ValidationLevel,
  ): Result<Diagnostic[], DomainError> {
    const diagnostics: Diagnostic[] = [];

    // This is a simplified validation - in a real implementation,
    // this would involve more sophisticated logical reasoning
    const confidence = rule.getPatternConfidence(premises, conclusions);

    if (confidence < 0.8) {
      const warningResult = Diagnostic.create(
        DiagnosticSeverity.warning(),
        `Low confidence match with rule ${rule.getName().getValue()}`,
        'rule-confidence',
        SourceLocation.createDefault(),
        languagePackage.getId().getValue(),
        ['Review the inference steps', 'Check premise-conclusion relationship'],
        ['semantic'],
      );
      if (warningResult.isOk()) {
        diagnostics.push(warningResult.value);
      }
    }

    return ok(diagnostics);
  }

  private validateStructuralIntegrity(
    _statements: string[],
    _connections: { from: number; to: number }[],
    _languagePackage: LanguagePackage,
  ): Diagnostic[] {
    return [];
  }

  private validateLogicalFlow(
    _statements: string[],
    _connections: { from: number; to: number }[],
    _languagePackage: LanguagePackage,
  ): Diagnostic[] {
    return [];
  }

  private hasBalancedParentheses(statement: string): boolean {
    let count = 0;
    for (const char of statement) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  private findInvalidSymbols(statement: string, _languagePackage: LanguagePackage): string[] {
    // Find all non-alphanumeric, non-whitespace, non-standard punctuation characters
    const allSymbols = statement.match(/[^\w\s(),.]/g) ?? [];
    // Basic validation - assume common logical symbols are valid
    const validSymbols = ['∀', '∃', '∧', '∨', '¬', '→', '↔'];
    return allSymbols.filter((symbol) => !validSymbols.includes(symbol));
  }

  private parseLogicalStructure(statement: string): {
    operators: string[];
    variables: string[];
    structure: string;
  } {
    const operators = statement.match(/[∀∃∧∨¬→↔]/g) ?? [];
    const variables = statement.match(/[a-z]/g) ?? [];
    return {
      operators,
      variables,
      structure: statement.replace(/[a-zA-Z0-9\s]/g, ''),
    };
  }

  private detectLogicalFallacies(_premises: string[], _conclusions: string[]): string[] {
    return [];
  }

  private validateModalLogic(_statement: string): boolean {
    return true;
  }

  private validateQuantifiers(_statement: string): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }
}
