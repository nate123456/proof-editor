import * as vscode from 'vscode';

import { type ParseError, ParseErrorType } from '../parser/ParseError.js';

function convertParseErrorToDiagnostic(
  error: ParseError,
  document: vscode.TextDocument,
): vscode.Diagnostic {
  const range = getErrorRange(error, document);
  const severity = getErrorSeverity(error.type);
  const message = getDisplayMessage(error);

  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = 'proof-editor';
  diagnostic.code = error.type;

  return diagnostic;
}

function getErrorSeverity(errorType: ParseErrorType): vscode.DiagnosticSeverity {
  switch (errorType) {
    case ParseErrorType.YAML_SYNTAX:
      return vscode.DiagnosticSeverity.Error;
    case ParseErrorType.MISSING_REFERENCE:
      return vscode.DiagnosticSeverity.Error;
    case ParseErrorType.INVALID_STATEMENT:
      return vscode.DiagnosticSeverity.Warning;
    case ParseErrorType.INVALID_STRUCTURE:
      return vscode.DiagnosticSeverity.Error;
    case ParseErrorType.CIRCULAR_DEPENDENCY:
      return vscode.DiagnosticSeverity.Error;
    case ParseErrorType.INVALID_ARGUMENT:
      return vscode.DiagnosticSeverity.Error;
    case ParseErrorType.INVALID_TREE_STRUCTURE:
      return vscode.DiagnosticSeverity.Error;
    case ParseErrorType.DUPLICATE_ID:
      return vscode.DiagnosticSeverity.Error;
    default:
      return vscode.DiagnosticSeverity.Error;
  }
}

function getErrorRange(error: ParseError, document: vscode.TextDocument): vscode.Range {
  const line = Math.max(0, (error.line ?? 1) - 1);
  const column = Math.max(0, error.column ?? 0);

  // Ensure line is within document bounds
  const { lineCount } = document;
  const adjustedLine = Math.min(line, lineCount - 1);

  const lineText = document.lineAt(adjustedLine).text;
  const startPos = new vscode.Position(adjustedLine, column);

  // Create a meaningful error span based on the error type
  let endColumn = column;
  if (error.reference) {
    // Try to find the reference in the line to highlight it specifically
    const refIndex = lineText.indexOf(error.reference, column);
    if (refIndex !== -1) {
      endColumn = refIndex + error.reference.length;
    } else {
      endColumn = Math.min(column + 20, lineText.length);
    }
  } else {
    // For general errors, highlight a reasonable span
    endColumn = Math.min(column + 15, lineText.length);
  }

  // Ensure we have at least a 1-character span
  if (endColumn <= column) {
    endColumn = Math.min(column + 1, lineText.length);
  }

  const endPos = new vscode.Position(adjustedLine, endColumn);
  return new vscode.Range(startPos, endPos);
}

function getDisplayMessage(error: ParseError): string {
  // Convert technical parser messages to user-friendly academic language
  const { message } = error;

  // Common message improvements for academic users
  const messageMapping: Record<string, string> = {
    'YAML syntax error': 'Invalid document syntax',
    'referenced in ordered set': 'referenced in statement list',
    'but not defined in statements section': 'but statement not found',
    'referenced as premises': 'used as premises',
    'referenced as conclusions': 'used as conclusions',
    'but not defined in orderedSets section': 'but statement list not found',
    'but not defined in atomicArguments section': 'but argument not found',
  };

  let displayMessage = message;
  for (const [technical, friendly] of Object.entries(messageMapping)) {
    displayMessage = displayMessage.replace(technical, friendly);
  }

  // Add helpful context based on error type
  const contextualHelp = getContextualHelp(error.type);
  if (contextualHelp) {
    displayMessage += ` ${contextualHelp}`;
  }

  return displayMessage;
}

function getContextualHelp(errorType: ParseErrorType): string {
  switch (errorType) {
    case ParseErrorType.YAML_SYNTAX:
      return 'Check for missing colons, incorrect indentation, or unmatched quotes.';
    case ParseErrorType.MISSING_REFERENCE:
      return 'Ensure all referenced items are defined in their respective sections.';
    case ParseErrorType.INVALID_STATEMENT:
      return 'Statements cannot be empty and must contain text.';
    case ParseErrorType.INVALID_ORDERED_SET:
      return 'Statement lists must contain valid statements and cannot be empty.';
    case ParseErrorType.INVALID_ARGUMENT:
      return 'Arguments must reference valid statement lists for premises and conclusions.';
    case ParseErrorType.INVALID_ATOMIC_ARGUMENT:
      return 'Arguments must reference valid statement lists for premises and conclusions.';
    case ParseErrorType.INVALID_TREE_STRUCTURE:
      return 'Check node hierarchy and ensure all parent-child relationships are valid.';
    case ParseErrorType.CIRCULAR_DEPENDENCY:
      return 'Remove circular references between arguments.';
    case ParseErrorType.DUPLICATE_ID:
      return 'Each identifier must be unique within its section.';
    default:
      return '';
  }
}

// Export as namespace to maintain backward compatibility with existing imports
export const ErrorMapper = {
  convertParseErrorToDiagnostic,
} as const;

// Also export the function directly for modern imports
export { convertParseErrorToDiagnostic };
