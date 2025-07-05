import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import type { IDiagnosticPort } from '../application/ports/IDiagnosticPort.js';
import { ValidationError } from '../domain/shared/result.js';
import { TOKENS } from '../infrastructure/di/tokens.js';

// Platform-agnostic document interface
export interface DocumentInfo {
  uri: string;
  content: string;
  languageId: string;
}

@injectable()
export class ValidationController {
  private readonly validationTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly validationDelay: number;

  constructor(
    @inject(TOKENS.IDiagnosticPort) private readonly diagnosticPort: IDiagnosticPort,
    validationDelay = 500,
  ) {
    this.validationDelay = validationDelay;
  }

  public async validateDocumentImmediate(
    document: DocumentInfo,
  ): Promise<Result<void, ValidationError>> {
    if (document.languageId !== 'proof') {
      return ok(undefined);
    }

    const result = await this.diagnosticPort.validateDocument(document.uri, document.content);
    if (result.isErr()) {
      return err(new ValidationError(`Validation failed: ${result.error.message}`));
    }

    return ok(undefined);
  }

  public validateDocumentDebounced(
    document: DocumentInfo,
    onError?: (error: ValidationError) => void,
  ): void {
    if (document.languageId !== 'proof') {
      return;
    }

    const documentUri = document.uri;

    // Clear existing timeout for this document
    const existingTimeout = this.validationTimeouts.get(documentUri);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new debounced validation
    const timeout = setTimeout(async () => {
      const result = await this.diagnosticPort.validateDocument(document.uri, document.content);
      if (result.isErr()) {
        const validationError = new ValidationError(
          `Debounced validation failed: ${result.error.message}`,
        );
        if (onError) {
          onError(validationError);
        }
        // If no error handler provided, validation fails silently (resilient behavior)
      }
      this.validationTimeouts.delete(documentUri);
    }, this.validationDelay);

    this.validationTimeouts.set(documentUri, timeout);
  }

  public clearDocumentValidation(document: DocumentInfo): void {
    const documentUri = document.uri;

    // Clear any pending validation
    const existingTimeout = this.validationTimeouts.get(documentUri);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.validationTimeouts.delete(documentUri);
    }

    // Clear diagnostics
    this.diagnosticPort.clearDiagnostics(documentUri);
  }

  public clearAllValidation(): void {
    // Clear all pending validations
    this.validationTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.validationTimeouts.clear();

    // Clear all diagnostics
    this.diagnosticPort.clearAllDiagnostics();
  }

  public dispose(): void {
    this.clearAllValidation();
    this.diagnosticPort.dispose();
  }
}
