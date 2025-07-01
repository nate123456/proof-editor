import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class DiagnosticMessage {
  private constructor(
    private readonly text: string,
    private readonly context: string,
    private readonly severity: 'error' | 'warning' | 'info'
  ) {}

  static create(
    text: string,
    context = '',
    severity: 'error' | 'warning' | 'info' = 'error'
  ): Result<DiagnosticMessage, ValidationError> {
    if (!text || text.trim().length === 0) {
      return err(new ValidationError('Diagnostic message text cannot be empty'));
    }

    const trimmedText = text.trim();

    if (trimmedText.length > 500) {
      return err(new ValidationError('Diagnostic message cannot exceed 500 characters'));
    }

    return ok(new DiagnosticMessage(trimmedText, context.trim(), severity));
  }

  static createError(text: string, context = ''): Result<DiagnosticMessage, ValidationError> {
    return DiagnosticMessage.create(text, context, 'error');
  }

  static createWarning(text: string, context = ''): Result<DiagnosticMessage, ValidationError> {
    return DiagnosticMessage.create(text, context, 'warning');
  }

  static createInfo(text: string, context = ''): Result<DiagnosticMessage, ValidationError> {
    return DiagnosticMessage.create(text, context, 'info');
  }

  getText(): string {
    return this.text;
  }

  getContext(): string {
    return this.context;
  }

  getSeverity(): 'error' | 'warning' | 'info' {
    return this.severity;
  }

  getFullMessage(): string {
    if (this.context) {
      return `${this.text} (${this.context})`;
    }
    return this.text;
  }

  getFormattedMessage(): string {
    const severityPrefix = this.severity.toUpperCase();
    return `[${severityPrefix}] ${this.getFullMessage()}`;
  }

  hasContext(): boolean {
    return this.context.length > 0;
  }

  withContext(newContext: string): Result<DiagnosticMessage, ValidationError> {
    return DiagnosticMessage.create(this.text, newContext, this.severity);
  }

  withSeverity(newSeverity: 'error' | 'warning' | 'info'): DiagnosticMessage {
    return new DiagnosticMessage(this.text, this.context, newSeverity);
  }

  getWordCount(): number {
    return this.text.split(/\s+/).filter(word => word.length > 0).length;
  }

  isLongMessage(): boolean {
    return this.text.length > 100;
  }

  containsKeyword(keyword: string): boolean {
    return this.text.toLowerCase().includes(keyword.toLowerCase());
  }

  equals(other: DiagnosticMessage): boolean {
    return (
      this.text === other.text && this.context === other.context && this.severity === other.severity
    );
  }

  toString(): string {
    return this.getFullMessage();
  }
}
