import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import * as vscode from 'vscode';
import type {
  Diagnostic,
  DiagnosticError,
  DiagnosticPosition,
  DiagnosticRange,
  DiagnosticSeverity,
  IDiagnosticPort,
} from '../../application/ports/IDiagnosticPort.js';
import type { ParseFailureError } from '../../parser/ParseError.js';
import type { ProofFileParser } from '../../parser/ProofFileParser.js';
import { convertParseErrorToDiagnostic } from '../../validation/ErrorMapper.js';
import { TOKENS } from '../di/tokens.js';

@injectable()
export class VSCodeDiagnosticAdapter implements IDiagnosticPort {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  constructor(@inject(TOKENS.ProofFileParser) private readonly parser: ProofFileParser) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('proof');
  }

  async validateDocument(
    documentUri: string,
    content: string,
  ): Promise<Result<void, DiagnosticError>> {
    try {
      // Clear existing diagnostics for this document
      const uri = vscode.Uri.parse(documentUri);
      this.diagnosticCollection.delete(uri);

      // Parse the document and convert any errors to diagnostics
      const parseResult = this.parser.parseProofFile(content);

      if (parseResult.isErr()) {
        const parseError = parseResult.error;
        const diagnostics = this.convertErrorsToDiagnostics(parseError, content, documentUri);
        this.diagnosticCollection.set(uri, diagnostics);
      }
      // If parse succeeds, diagnostics are already cleared above

      return ok(undefined);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: `Failed to validate document: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  clearDiagnostics(documentUri: string): void {
    const uri = vscode.Uri.parse(documentUri);
    this.diagnosticCollection.delete(uri);
  }

  clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }

  private convertErrorsToDiagnostics(
    parseError: ParseFailureError,
    content: string,
    documentUri: string,
  ): vscode.Diagnostic[] {
    // Create a temporary document-like object for the legacy error mapper
    const lines = content.split('\n');
    const mockDocument = {
      uri: vscode.Uri.parse(documentUri),
      getText: () => content,
      lineAt: (line: number) => ({
        text: lines[line] || '',
        lineNumber: line,
      }),
      lineCount: lines.length,
    } as vscode.TextDocument;

    return parseError
      .getAllErrors()
      .map((error) => convertParseErrorToDiagnostic(error, mockDocument));
  }

  // Helper method to convert platform-agnostic diagnostic to VS Code diagnostic
  private convertToVSCodeDiagnostic(diagnostic: Diagnostic): vscode.Diagnostic {
    const range = new vscode.Range(
      new vscode.Position(diagnostic.range.start.line, diagnostic.range.start.character),
      new vscode.Position(diagnostic.range.end.line, diagnostic.range.end.character),
    );

    const vscodeDiagnostic = new vscode.Diagnostic(
      range,
      diagnostic.message,
      this.convertSeverity(diagnostic.severity),
    );

    if (diagnostic.source) {
      vscodeDiagnostic.source = diagnostic.source;
    }
    if (diagnostic.code) {
      vscodeDiagnostic.code = diagnostic.code;
    }

    return vscodeDiagnostic;
  }

  private convertSeverity(severity: DiagnosticSeverity): vscode.DiagnosticSeverity {
    switch (severity) {
      case 1: // DiagnosticSeverity.Error
        return vscode.DiagnosticSeverity.Error;
      case 2: // DiagnosticSeverity.Warning
        return vscode.DiagnosticSeverity.Warning;
      case 3: // DiagnosticSeverity.Information
        return vscode.DiagnosticSeverity.Information;
      case 4: // DiagnosticSeverity.Hint
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Error;
    }
  }

  // Helper methods to convert from VS Code types to platform-agnostic types
  private convertFromVSCodeRange(range: vscode.Range): DiagnosticRange {
    return {
      start: this.convertFromVSCodePosition(range.start),
      end: this.convertFromVSCodePosition(range.end),
    };
  }

  private convertFromVSCodePosition(position: vscode.Position): DiagnosticPosition {
    return {
      line: position.line,
      character: position.character,
    };
  }
}
