import { err, ok, type Result } from 'neverthrow';

import { type SourceLocation } from '../../../../domain/shared/index.js';
import { ValidationError } from '../errors/DomainErrors';
import { DiagnosticCode } from '../value-objects/DiagnosticCode';
import { DiagnosticId } from '../value-objects/DiagnosticId';
import { DiagnosticMessage } from '../value-objects/DiagnosticMessage';
import { DiagnosticSeverity } from '../value-objects/DiagnosticSeverity';
import { Timestamp } from '../value-objects/Timestamp';

export class Diagnostic {
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
  ): Result<Diagnostic, ValidationError> {
    const messageResult = DiagnosticMessage.create(message);
    if (messageResult.isErr()) return err(messageResult.error);

    const codeResult = DiagnosticCode.create(code);
    if (codeResult.isErr()) return err(codeResult.error);

    return ok(
      new Diagnostic(
        DiagnosticId.generate(),
        severity,
        messageResult.value,
        codeResult.value,
        location,
        Timestamp.now(),
        languagePackageId,
        [],
        quickFixes,
        tags
      )
    );
  }

  static createSyntaxError(
    message: string,
    location: SourceLocation,
    languagePackageId: string,
    quickFixes: string[] = []
  ): Result<Diagnostic, ValidationError> {
    return Diagnostic.create(
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
  ): Result<Diagnostic, ValidationError> {
    return Diagnostic.create(
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
  ): Result<Diagnostic, ValidationError> {
    return Diagnostic.create(
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
  ): Result<Diagnostic, ValidationError> {
    return Diagnostic.create(
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
      return err(new ValidationError('Cannot relate diagnostic to itself'));
    }

    if (this.relatedDiagnostics.some(id => id.equals(diagnosticId))) {
      return err(new ValidationError('Diagnostic already related'));
    }

    this.relatedDiagnostics.push(diagnosticId);
    return ok(undefined);
  }

  removeRelatedDiagnostic(diagnosticId: DiagnosticId): Result<void, ValidationError> {
    const index = this.relatedDiagnostics.findIndex(id => id.equals(diagnosticId));
    if (index === -1) {
      return err(new ValidationError('Related diagnostic not found'));
    }

    this.relatedDiagnostics.splice(index, 1);
    return ok(undefined);
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

  overlapsLocation(other: Diagnostic): boolean {
    return this.location.overlapsRange(other.location);
  }

  isMoreSevereThan(other: Diagnostic): boolean {
    return this.severity.isMoreSevereThan(other.severity);
  }

  canSupersede(other: Diagnostic): boolean {
    return (
      this.overlapsLocation(other) && this.isMoreSevereThan(other) && this.code.equals(other.code)
    );
  }

  equals(other: Diagnostic): boolean {
    return this.id.equals(other.id);
  }
}
