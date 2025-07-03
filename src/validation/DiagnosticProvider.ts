import { inject, injectable } from 'tsyringe';
import * as vscode from 'vscode';

import { TOKENS } from '../infrastructure/di/tokens.js';
import type { ParseFailureError } from '../parser/ParseError.js';
import type { ProofFileParser } from '../parser/ProofFileParser.js';
import { convertParseErrorToDiagnostic } from './ErrorMapper.js';

@injectable()
export class ProofDiagnosticProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  constructor(@inject(TOKENS.ProofFileParser) private readonly parser: ProofFileParser) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('proof');
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
    document: vscode.TextDocument,
  ): vscode.Diagnostic[] {
    return parseError.getAllErrors().map((error) => convertParseErrorToDiagnostic(error, document));
  }
}
