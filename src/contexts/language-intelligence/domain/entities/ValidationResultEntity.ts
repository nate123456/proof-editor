import type { Result } from "../../../../domain/shared/result.js"
import { ValidationError } from "../../../../domain/shared/result.js"
import { ValidationResultId } from '../value-objects/ValidationResultId';
import { ValidationLevel } from '../value-objects/ValidationLevel';
import { DiagnosticEntity } from './DiagnosticEntity';
import { ValidationMetrics } from '../value-objects/ValidationMetrics';
import { Timestamp } from '../value-objects/Timestamp';

export class ValidationResultEntity {
  private constructor(
    private readonly id: ValidationResultId,
    private readonly level: ValidationLevel,
    private readonly isValid: boolean,
    private diagnostics: DiagnosticEntity[],
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
  ): ValidationResultEntity {
    return new ValidationResultEntity(
      ValidationResultId.generate(),
      level,
      true,
      [],
      metrics,
      Timestamp.now(),
      documentId,
      languagePackageId
    );
  }

  static createFailedValidation(
    level: ValidationLevel,
    diagnostics: DiagnosticEntity[],
    documentId: string,
    languagePackageId: string,
    metrics: ValidationMetrics
  ): Result<ValidationResultEntity, ValidationError> {
    if (diagnostics.length === 0) {
      return {
        success: false,
        error: new ValidationError('Failed validation must have at least one diagnostic')
      };
    }

    return {
      success: true,
      data: new ValidationResultEntity(
        ValidationResultId.generate(),
        level,
        false,
        diagnostics,
        metrics,
        Timestamp.now(),
        documentId,
        languagePackageId
      )
    };
  }

  getId(): ValidationResultId {
    return this.id;
  }

  getLevel(): ValidationLevel {
    return this.level;
  }

  isValidationSuccessful(): boolean {
    return this.isValid;
  }

  getDiagnostics(): readonly DiagnosticEntity[] {
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

  addDiagnostic(diagnostic: DiagnosticEntity): Result<void, ValidationError> {
    if (this.isValid) {
      return {
        success: false,
        error: new ValidationError('Cannot add diagnostic to successful validation result')
      };
    }

    this.diagnostics.push(diagnostic);
    return { success: true, data: undefined };
  }

  removeDiagnostic(diagnosticId: string): Result<void, ValidationError> {
    const index = this.diagnostics.findIndex(d => d.getId().getValue() === diagnosticId);
    if (index === -1) {
      return {
        success: false,
        error: new ValidationError('Diagnostic not found')
      };
    }

    this.diagnostics.splice(index, 1);
    return { success: true, data: undefined };
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

  combineWith(other: ValidationResultEntity): Result<ValidationResultEntity, ValidationError> {
    if (this.documentId !== other.documentId) {
      return {
        success: false,
        error: new ValidationError('Cannot combine validation results from different documents')
      };
    }

    if (!this.level.canCombineWith(other.level)) {
      return {
        success: false,
        error: new ValidationError('Cannot combine validation results from incompatible levels')
      };
    }

    const combinedLevel = this.level.combineWith(other.level);
    const combinedDiagnostics = [...this.diagnostics, ...other.diagnostics];
    const combinedMetrics = this.metrics.combineWith(other.metrics);
    const isValidCombined = this.isValid && other.isValid && combinedDiagnostics.every(d => !d.getSeverity().isError());

    if (isValidCombined) {
      return {
        success: true,
        data: new ValidationResultEntity(
          ValidationResultId.generate(),
          combinedLevel,
          true,
          [],
          combinedMetrics,
          Timestamp.now(),
          this.documentId,
          this.languagePackageId
        )
      };
    } else {
      return ValidationResultEntity.createFailedValidation(
        combinedLevel,
        combinedDiagnostics,
        this.documentId,
        this.languagePackageId,
        combinedMetrics
      );
    }
  }

  equals(other: ValidationResultEntity): boolean {
    return this.id.equals(other.id);
  }
}