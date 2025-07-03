import type * as vscode from 'vscode';

import { ProofDiagnosticProvider } from './DiagnosticProvider.js';

export class ValidationController {
  private readonly diagnosticProvider: ProofDiagnosticProvider;
  private readonly validationTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly validationDelay: number;

  constructor(validationDelay = 500) {
    this.diagnosticProvider = new ProofDiagnosticProvider();
    this.validationDelay = validationDelay;
  }

  public validateDocumentImmediate(document: vscode.TextDocument): void {
    this.diagnosticProvider.validateDocument(document);
  }

  public validateDocumentDebounced(document: vscode.TextDocument): void {
    if (document.languageId !== 'proof') {
      return;
    }

    const documentUri = document.uri.toString();

    // Clear existing timeout for this document
    const existingTimeout = this.validationTimeouts.get(documentUri);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new debounced validation
    const timeout = setTimeout(() => {
      this.diagnosticProvider.validateDocument(document);
      this.validationTimeouts.delete(documentUri);
    }, this.validationDelay);

    this.validationTimeouts.set(documentUri, timeout);
  }

  public clearDocumentValidation(document: vscode.TextDocument): void {
    const documentUri = document.uri.toString();

    // Clear any pending validation
    const existingTimeout = this.validationTimeouts.get(documentUri);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.validationTimeouts.delete(documentUri);
    }

    // Clear diagnostics
    this.diagnosticProvider.clearDiagnostics(document);
  }

  public clearAllValidation(): void {
    // Clear all pending validations
    for (const timeout of this.validationTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.validationTimeouts.clear();

    // Clear all diagnostics
    this.diagnosticProvider.clearAllDiagnostics();
  }

  public dispose(): void {
    this.clearAllValidation();
    this.diagnosticProvider.dispose();
  }

  public getDiagnosticProvider(): ProofDiagnosticProvider {
    return this.diagnosticProvider;
  }
}
