import { err, ok, type Result } from 'neverthrow';

import { SourceLocation } from '../../../../domain/shared/index.js';
import { ValidationError } from '../errors/DomainErrors';
import type { ValidationLevel } from './ValidationLevel';

export class ValidationRequest {
  private constructor(
    private readonly statementText: string,
    private readonly location: SourceLocation,
    private readonly level: ValidationLevel,
    private readonly documentId: string,
    private readonly languagePackageId: string,
    private readonly metadata: ValidationRequestMetadata,
  ) {}

  static create(
    statementText: string,
    location: SourceLocation,
    level: ValidationLevel,
    documentId: string,
    languagePackageId: string,
    metadata: ValidationRequestMetadata = createDefaultValidationRequestMetadata(),
  ): Result<ValidationRequest, ValidationError> {
    if (!statementText || statementText.trim().length === 0) {
      return err(new ValidationError('Statement text cannot be empty'));
    }

    if (!documentId || documentId.trim().length === 0) {
      return err(new ValidationError('Document ID cannot be empty'));
    }

    if (!languagePackageId || languagePackageId.trim().length === 0) {
      return err(new ValidationError('Language package ID cannot be empty'));
    }

    return ok(
      new ValidationRequest(
        statementText.trim(),
        location,
        level,
        documentId.trim(),
        languagePackageId.trim(),
        metadata,
      ),
    );
  }

  static createForInference(
    premises: string[],
    conclusions: string[],
    level: ValidationLevel,
    documentId: string,
    languagePackageId: string,
    metadata: ValidationRequestMetadata = createDefaultValidationRequestMetadata(),
  ): Result<ValidationRequest, ValidationError> {
    if (!premises || premises.length === 0) {
      return err(new ValidationError('At least one premise is required'));
    }

    if (!conclusions || conclusions.length === 0) {
      return err(new ValidationError('At least one conclusion is required'));
    }

    const premiseText = premises.join(' | ');
    const conclusionText = conclusions.join(' | ');
    const inferenceText = `${premiseText} ⊢ ${conclusionText}`;

    return ValidationRequest.create(
      inferenceText,
      SourceLocation.createDefault(),
      level,
      documentId,
      languagePackageId,
      { ...metadata, isInferenceValidation: true, premises, conclusions },
    );
  }

  getStatementText(): string {
    return this.statementText;
  }

  getLocation(): SourceLocation {
    return this.location;
  }

  getValidationLevel(): ValidationLevel {
    return this.level;
  }

  getDocumentId(): string {
    return this.documentId;
  }

  getLanguagePackageId(): string {
    return this.languagePackageId;
  }

  getMetadata(): ValidationRequestMetadata {
    return this.metadata;
  }

  isInferenceValidation(): boolean {
    return this.metadata.isInferenceValidation;
  }

  getPremises(): string[] {
    return this.metadata.premises ?? [];
  }

  getConclusions(): string[] {
    return this.metadata.conclusions ?? [];
  }

  requiresPerformanceTracking(): boolean {
    return this.metadata.trackPerformance;
  }

  enablesEducationalFeedback(): boolean {
    return this.metadata.educationalFeedback;
  }

  hasCustomValidators(): boolean {
    return !!(this.metadata.customValidators && this.metadata.customValidators.length > 0);
  }

  getCustomValidators(): string[] {
    return this.metadata.customValidators ?? [];
  }

  withLevel(newLevel: ValidationLevel): ValidationRequest {
    return new ValidationRequest(
      this.statementText,
      this.location,
      newLevel,
      this.documentId,
      this.languagePackageId,
      this.metadata,
    );
  }

  withMetadata(newMetadata: Partial<ValidationRequestMetadata>): ValidationRequest {
    return new ValidationRequest(
      this.statementText,
      this.location,
      this.level,
      this.documentId,
      this.languagePackageId,
      { ...this.metadata, ...newMetadata },
    );
  }

  getStatementLength(): number {
    return this.statementText.length;
  }

  getComplexityScore(): number {
    const baseScore = this.statementText.length;
    const symbolWeight = (this.statementText.match(/[∀∃∧∨→↔¬□◇]/g) ?? []).length * 2;
    const parenthesesWeight = (this.statementText.match(/[()]/g) ?? []).length * 0.5;

    return Math.floor(baseScore + symbolWeight + parenthesesWeight);
  }

  equals(other: ValidationRequest): boolean {
    return (
      this.statementText === other.statementText &&
      this.documentId === other.documentId &&
      this.languagePackageId === other.languagePackageId &&
      this.level.equals(other.level)
    );
  }
}

export interface ValidationRequestMetadata {
  isInferenceValidation: boolean;
  premises?: string[];
  conclusions?: string[];
  trackPerformance: boolean;
  educationalFeedback: boolean;
  customValidators?: string[];
  requestSource: ValidationRequestSource;
  priority: ValidationPriority;
  timeout: number;
}

export type ValidationRequestSource = 'editor' | 'lsp' | 'api' | 'test';
export type ValidationPriority = 'low' | 'normal' | 'high' | 'urgent';

export function createDefaultValidationRequestMetadata(): ValidationRequestMetadata {
  return {
    isInferenceValidation: false,
    trackPerformance: true,
    educationalFeedback: true,
    requestSource: 'editor',
    priority: 'normal',
    timeout: 10000,
  };
}

export function createLSPValidationRequestMetadata(): ValidationRequestMetadata {
  return {
    ...createDefaultValidationRequestMetadata(),
    requestSource: 'lsp',
    timeout: 5000,
  };
}

export function createAPIValidationRequestMetadata(): ValidationRequestMetadata {
  return {
    ...createDefaultValidationRequestMetadata(),
    requestSource: 'api',
    priority: 'high',
    timeout: 15000,
  };
}
