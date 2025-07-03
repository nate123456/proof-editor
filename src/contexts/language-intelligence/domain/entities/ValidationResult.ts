import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';
import { Timestamp } from '../value-objects/Timestamp';
import { type ValidationLevel } from '../value-objects/ValidationLevel';
import { type ValidationMetrics } from '../value-objects/ValidationMetrics';
import { ValidationResultId } from '../value-objects/ValidationResultId';
import { type Diagnostic } from './Diagnostic';

export class ValidationResult {
  private constructor(
    private readonly id: ValidationResultId,
    private readonly level: ValidationLevel,
    private readonly _isValid: boolean,
    private diagnostics: Diagnostic[],
    private readonly metrics: ValidationMetrics,
    private readonly timestamp: Timestamp,
    private readonly documentId: string,
    private readonly languagePackageId: string
  ) {}

  static createSuccessfulValidation(
    level: ValidationLevel,
    documentId: string,
    languagePackageId: string,
    metrics: ValidationMetrics
  ): Result<ValidationResult, ValidationError> {
    return ok(
      new ValidationResult(
        ValidationResultId.generate(),
        level,
        true,
        [],
        metrics,
        Timestamp.now(),
        documentId,
        languagePackageId
      )
    );
  }

  static createFailedValidation(
    level: ValidationLevel,
    diagnostics: Diagnostic[],
    documentId: string,
    languagePackageId: string,
    metrics: ValidationMetrics
  ): Result<ValidationResult, ValidationError> {
    if (diagnostics.length === 0) {
      return err(new ValidationError('Failed validation must have at least one diagnostic'));
    }

    return ok(
      new ValidationResult(
        ValidationResultId.generate(),
        level,
        false,
        diagnostics,
        metrics,
        Timestamp.now(),
        documentId,
        languagePackageId
      )
    );
  }

  getId(): ValidationResultId {
    return this.id;
  }

  getLevel(): ValidationLevel {
    return this.level;
  }

  isValidationSuccessful(): boolean {
    return this._isValid;
  }

  getDiagnostics(): readonly Diagnostic[] {
    return [...this.diagnostics];
  }

  getMetrics(): ValidationMetrics {
    return this.metrics;
  }

  getTimestamp(): Timestamp {
    return this.timestamp;
  }

  getDocumentId(): string {
    return this.documentId;
  }

  getLanguagePackageId(): string {
    return this.languagePackageId;
  }

  isValid(): boolean {
    return this._isValid;
  }

  addDiagnostic(diagnostic: Diagnostic): Result<void, ValidationError> {
    if (this._isValid) {
      return err(new ValidationError('Cannot add diagnostic to successful validation result'));
    }

    this.diagnostics.push(diagnostic);
    return ok(undefined);
  }

  removeDiagnostic(diagnosticId: string): Result<void, ValidationError> {
    const index = this.diagnostics.findIndex(d => d.getId().getValue() === diagnosticId);
    if (index === -1) {
      return err(new ValidationError('Diagnostic not found'));
    }

    this.diagnostics.splice(index, 1);
    return ok(undefined);
  }

  hasErrorDiagnostics(): boolean {
    return this.diagnostics.some(d => d.getSeverity().isError());
  }

  hasWarningDiagnostics(): boolean {
    return this.diagnostics.some(d => d.getSeverity().isWarning());
  }

  getErrorCount(): number {
    return this.diagnostics.filter(d => d.getSeverity().isError()).length;
  }

  getWarningCount(): number {
    return this.diagnostics.filter(d => d.getSeverity().isWarning()).length;
  }

  getInfoCount(): number {
    return this.diagnostics.filter(d => d.getSeverity().isInfo()).length;
  }

  meetsPerformanceTarget(): boolean {
    const targetMs = this.level.getPerformanceTargetMs();
    return this.metrics.getValidationTimeMs() <= targetMs;
  }

  combineWith(other: ValidationResult): Result<ValidationResult, ValidationError> {
    if (this.documentId !== other.documentId) {
      return err(new ValidationError('Cannot combine validation results from different documents'));
    }

    if (!this.level.canCombineWith(other.level)) {
      return err(new ValidationError('Cannot combine validation results from incompatible levels'));
    }

    const combinedLevel = this.level.combineWith(other.level);
    const combinedDiagnostics = [...this.diagnostics, ...other.diagnostics];
    const combinedMetrics = this.metrics.combineWith(other.metrics);
    const isValidCombined =
      this._isValid && other._isValid && combinedDiagnostics.every(d => !d.getSeverity().isError());

    if (isValidCombined) {
      return ok(
        new ValidationResult(
          ValidationResultId.generate(),
          combinedLevel,
          true,
          [],
          combinedMetrics,
          Timestamp.now(),
          this.documentId,
          this.languagePackageId
        )
      );
    } else {
      return ValidationResult.createFailedValidation(
        combinedLevel,
        combinedDiagnostics,
        this.documentId,
        this.languagePackageId,
        combinedMetrics
      );
    }
  }

  analyzeErrorPatterns(): Map<string, number> {
    const patterns = new Map<string, number>();

    for (const diagnostic of this.diagnostics) {
      const code = diagnostic.getCode().getCode();
      patterns.set(code, (patterns.get(code) ?? 0) + 1);
    }

    return patterns;
  }

  detectCircularReasoning(): CircularReasoningAnalysis {
    // Simplified circular reasoning detection
    // In practice, this would involve more sophisticated dependency analysis
    return {
      detected: false,
      confidence: 0,
      instances: [],
    };
  }

  detectInvalidInferences(): CommonMistake[] {
    const mistakes: CommonMistake[] = [];

    for (const diagnostic of this.diagnostics) {
      const code = diagnostic.getCode().getCode();
      const message = diagnostic.getMessage().getText().toLowerCase();

      if (code.includes('inference') || message.includes('inference')) {
        mistakes.push({
          type: 'invalid-inference',
          description: diagnostic.getMessage().getText(),
          confidence: 0.8,
          instances: [diagnostic.getLocation().toString()],
          suggestion: 'Review the inference rule being applied',
        });
      }
    }

    return mistakes;
  }

  detectMissingPremises(): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    const semanticErrors = this.diagnostics.filter(d => d.isSemanticRelated());

    if (semanticErrors.length > 0) {
      mistakes.push({
        type: 'missing-premise',
        description: 'Possible missing premise detected',
        confidence: 0.6,
        instances: semanticErrors.map(d => d.getLocation().toString()),
        suggestion: 'Consider if additional premises are needed to support the conclusion',
      });
    }

    return mistakes;
  }

  detectModalLogicErrors(): CommonMistake[] {
    const mistakes: CommonMistake[] = [];

    for (const diagnostic of this.diagnostics) {
      const message = diagnostic.getMessage().getText().toLowerCase();

      if (
        message.includes('modal') ||
        message.includes('necessity') ||
        message.includes('possibility')
      ) {
        mistakes.push({
          type: 'modal-logic-error',
          description: diagnostic.getMessage().getText(),
          confidence: 0.85,
          instances: [diagnostic.getLocation().toString()],
          suggestion: 'Review modal logic principles and operator usage',
        });
      }
    }

    return mistakes;
  }

  calculateErrorFrequency(): Record<string, number> {
    const patterns = this.analyzeErrorPatterns();
    const frequency: Record<string, number> = {};
    const total = Array.from(patterns.values()).reduce((sum, count) => sum + count, 0);

    for (const [pattern, count] of patterns.entries()) {
      frequency[pattern] = total > 0 ? count / total : 0;
    }

    return frequency;
  }

  analyzeSeverityDistribution(): Record<string, number> {
    const distribution = { error: 0, warning: 0, info: 0 };

    for (const diagnostic of this.diagnostics) {
      const severity = diagnostic.getSeverity().getSeverity();
      distribution[severity]++;
    }

    return distribution;
  }

  identifyImprovementAreas(mistakes: CommonMistake[]): string[] {
    const areas = new Set<string>();

    for (const mistake of mistakes) {
      switch (mistake.type) {
        case 'invalid-inference':
          areas.add('logical-reasoning');
          break;
        case 'missing-premise':
          areas.add('argument-structure');
          break;
        case 'modal-logic-error':
          areas.add('modal-logic');
          break;
        case 'circular-reasoning':
          areas.add('logical-dependencies');
          break;
      }
    }

    return Array.from(areas);
  }

  generateLearningRecommendations(mistakes: CommonMistake[]): string[] {
    const recommendations: string[] = [];
    const mistakeTypes = new Set(mistakes.map(m => m.type));

    if (mistakeTypes.has('invalid-inference')) {
      recommendations.push('Study basic inference rules (modus ponens, modus tollens, etc.)');
    }

    if (mistakeTypes.has('modal-logic-error')) {
      recommendations.push('Review modal logic concepts and operator semantics');
    }

    if (mistakeTypes.has('circular-reasoning')) {
      recommendations.push(
        'Practice identifying logical dependencies and avoiding circular arguments'
      );
    }

    return recommendations;
  }

  equals(other: ValidationResult): boolean {
    return this.id.equals(other.id);
  }
}

export interface CommonMistake {
  type: string;
  description: string;
  confidence: number;
  instances: string[];
  suggestion: string;
}

export interface CircularReasoningAnalysis {
  detected: boolean;
  confidence: number;
  instances: string[];
}
