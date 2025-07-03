import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class DiagnosticSeverity {
  private static readonly ERROR_LEVEL = 3;
  private static readonly WARNING_LEVEL = 2;
  private static readonly INFO_LEVEL = 1;

  private constructor(
    private readonly severity: DiagnosticSeverityType,
    private readonly level: number,
  ) {}

  static error(): DiagnosticSeverity {
    return new DiagnosticSeverity('error', DiagnosticSeverity.ERROR_LEVEL);
  }

  static warning(): DiagnosticSeverity {
    return new DiagnosticSeverity('warning', DiagnosticSeverity.WARNING_LEVEL);
  }

  static info(): DiagnosticSeverity {
    return new DiagnosticSeverity('info', DiagnosticSeverity.INFO_LEVEL);
  }

  static fromString(severity: string): Result<DiagnosticSeverity, ValidationError> {
    switch (severity.toLowerCase()) {
      case 'error':
        return ok(DiagnosticSeverity.error());
      case 'warning':
        return ok(DiagnosticSeverity.warning());
      case 'info':
        return ok(DiagnosticSeverity.info());
      default:
        return err(new ValidationError(`Invalid diagnostic severity: ${severity}`));
    }
  }

  static fromLevel(level: number): Result<DiagnosticSeverity, ValidationError> {
    switch (level) {
      case DiagnosticSeverity.ERROR_LEVEL:
        return ok(DiagnosticSeverity.error());
      case DiagnosticSeverity.WARNING_LEVEL:
        return ok(DiagnosticSeverity.warning());
      case DiagnosticSeverity.INFO_LEVEL:
        return ok(DiagnosticSeverity.info());
      default:
        return err(new ValidationError(`Invalid diagnostic severity level: ${level}`));
    }
  }

  getSeverity(): DiagnosticSeverityType {
    return this.severity;
  }

  getLevel(): number {
    return this.level;
  }

  isError(): boolean {
    return this.severity === 'error';
  }

  isWarning(): boolean {
    return this.severity === 'warning';
  }

  isInfo(): boolean {
    return this.severity === 'info';
  }

  isMoreSevereThan(other: DiagnosticSeverity): boolean {
    return this.level > other.level;
  }

  isLessSevereThan(other: DiagnosticSeverity): boolean {
    return this.level < other.level;
  }

  getIcon(): string {
    switch (this.severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '?';
    }
  }

  getColor(): string {
    switch (this.severity) {
      case 'error':
        return '#ff4444';
      case 'warning':
        return '#ffaa00';
      case 'info':
        return '#4488ff';
      default:
        return '#666666';
    }
  }

  getDisplayName(): string {
    switch (this.severity) {
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Unknown';
    }
  }

  blocksValidation(): boolean {
    return this.isError();
  }

  requiresAttention(): boolean {
    return this.isError() || this.isWarning();
  }

  toString(): string {
    return this.severity;
  }

  equals(other: DiagnosticSeverity): boolean {
    return this.severity === other.severity;
  }
}

export type DiagnosticSeverityType = 'error' | 'warning' | 'info';
