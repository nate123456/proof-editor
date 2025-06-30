import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';
import { DiagnosticId } from '../value-objects/DiagnosticId';
import { DiagnosticSeverity } from '../value-objects/DiagnosticSeverity';
import { DiagnosticMessage } from '../value-objects/DiagnosticMessage';
import { SourceLocation } from '../value-objects/SourceLocation';
import { DiagnosticCode } from '../value-objects/DiagnosticCode';
import { Timestamp } from '../value-objects/Timestamp';

export class DiagnosticEntity {
  private constructor(
    private readonly id: DiagnosticId,
    private readonly severity: DiagnosticSeverity,
    private readonly message: DiagnosticMessage,
    private readonly code: DiagnosticCode,
    private readonly location: SourceLocation,
    private readonly timestamp: Timestamp,
    private readonly languagePackageId: string,
    private relatedDiagnostics: DiagnosticId[],
    private readonly quickFixes: string[],
    private readonly tags: string[]
  ) {}

  static create(
    severity: DiagnosticSeverity,
    message: string,
    code: string,
    location: SourceLocation,
    languagePackageId: string,
    quickFixes: string[] = [],
    tags: string[] = []
  ): Result<DiagnosticEntity, ValidationError> {
    const messageResult = DiagnosticMessage.create(message);
    if (!messageResult.success) return messageResult;

    const codeResult = DiagnosticCode.create(code);
    if (!codeResult.success) return codeResult;

    return {
      success: true,
      data: new DiagnosticEntity(
        DiagnosticId.generate(),
        severity,
        messageResult.data,
        codeResult.data,
        location,
        Timestamp.now(),
        languagePackageId,
        [],
        quickFixes,
        tags
      )
    };
  }

  static createSyntaxError(
    message: string,
    location: SourceLocation,
    languagePackageId: string,
    quickFixes: string[] = []
  ): Result<DiagnosticEntity, ValidationError> {
    return DiagnosticEntity.create(
      DiagnosticSeverity.error(),
      message,
      'syntax-error',
      location,
      languagePackageId,
      quickFixes,
      ['syntax']
    );
  }

  static createSemanticError(
    message: string,
    location: SourceLocation,
    languagePackageId: string,
    quickFixes: string[] = []
  ): Result<DiagnosticEntity, ValidationError> {
    return DiagnosticEntity.create(
      DiagnosticSeverity.error(),
      message,
      'semantic-error',
      location,
      languagePackageId,
      quickFixes,
      ['semantic']
    );
  }

  static createStyleWarning(
    message: string,
    location: SourceLocation,
    languagePackageId: string,
    quickFixes: string[] = []
  ): Result<DiagnosticEntity, ValidationError> {
    return DiagnosticEntity.create(
      DiagnosticSeverity.warning(),
      message,
      'style-warning',
      location,
      languagePackageId,
      quickFixes,
      ['style']
    );
  }

  static createEducationalInfo(
    message: string,
    location: SourceLocation,
    languagePackageId: string,
    learningHints: string[] = []
  ): Result<DiagnosticEntity, ValidationError> {
    return DiagnosticEntity.create(
      DiagnosticSeverity.info(),
      message,
      'educational-info',
      location,
      languagePackageId,
      learningHints,
      ['educational']
    );
  }

  getId(): DiagnosticId {
    return this.id;
  }

  getSeverity(): DiagnosticSeverity {
    return this.severity;
  }

  getMessage(): DiagnosticMessage {
    return this.message;
  }

  getCode(): DiagnosticCode {
    return this.code;
  }

  getLocation(): SourceLocation {
    return this.location;
  }

  getTimestamp(): Timestamp {
    return this.timestamp;
  }

  getLanguagePackageId(): string {
    return this.languagePackageId;
  }

  getRelatedDiagnostics(): readonly DiagnosticId[] {
    return [...this.relatedDiagnostics];
  }

  getQuickFixes(): readonly string[] {
    return [...this.quickFixes];
  }

  getTags(): readonly string[] {
    return [...this.tags];
  }

  addRelatedDiagnostic(diagnosticId: DiagnosticId): Result<void, ValidationError> {
    if (diagnosticId.equals(this.id)) {
      return {
        success: false,
        error: new ValidationError('Cannot relate diagnostic to itself')
      };
    }

    if (this.relatedDiagnostics.some(id => id.equals(diagnosticId))) {
      return {
        success: false,
        error: new ValidationError('Diagnostic already related')
      };
    }

    this.relatedDiagnostics.push(diagnosticId);
    return { success: true, data: undefined };
  }

  removeRelatedDiagnostic(diagnosticId: DiagnosticId): Result<void, ValidationError> {
    const index = this.relatedDiagnostics.findIndex(id => id.equals(diagnosticId));
    if (index === -1) {
      return {
        success: false,
        error: new ValidationError('Related diagnostic not found')
      };
    }

    this.relatedDiagnostics.splice(index, 1);
    return { success: true, data: undefined };
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  isSyntaxRelated(): boolean {
    return this.hasTag('syntax');
  }

  isSemanticRelated(): boolean {
    return this.hasTag('semantic');
  }

  isStyleRelated(): boolean {
    return this.hasTag('style');
  }

  isEducational(): boolean {
    return this.hasTag('educational');
  }

  hasQuickFixes(): boolean {
    return this.quickFixes.length > 0;
  }

  overlapsLocation(other: DiagnosticEntity): boolean {
    return this.location.overlapsRange(other.location);
  }

  isMoreSevereThan(other: DiagnosticEntity): boolean {
    return this.severity.isMoreSevereThan(other.severity);
  }

  canSupersede(other: DiagnosticEntity): boolean {
    return this.overlapsLocation(other) && 
           this.isMoreSevereThan(other) &&
           this.code.equals(other.code);
  }

  equals(other: DiagnosticEntity): boolean {
    return this.id.equals(other.id);
  }
}