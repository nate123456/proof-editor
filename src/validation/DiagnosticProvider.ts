import * as vscode from 'vscode';

import { type ParseFailureError } from '../parser/ParseError.js';
import { ProofFileParser } from '../parser/ProofFileParser.js';
import { ErrorMapper } from './ErrorMapper.js';

export class ProofDiagnosticProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private readonly parser: ProofFileParser;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('proof');
    this.parser = new ProofFileParser();
  }

  public validateDocument(document: vscode.TextDocument): void {
    if (document.languageId !== 'proof') {
      return;
    }

    // Clear existing diagnostics for this document
    this.diagnosticCollection.delete(document.uri);

    // Parse the document and convert any errors to diagnostics
    const parseResult = this.parser.parseProofFile(document.getText());

    if (parseResult.isErr()) {
      const parseError = parseResult.error;
      const diagnostics = this.convertErrorsToDiagnostics(parseError, document);
      this.diagnosticCollection.set(document.uri, diagnostics);
    }
    // If parse succeeds, diagnostics are already cleared above
  }

  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  public clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
  }

  private convertErrorsToDiagnostics(
    parseError: ParseFailureError,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    return parseError
      .getAllErrors()
      .map(error => ErrorMapper.convertParseErrorToDiagnostic(error, document));
  }
}
