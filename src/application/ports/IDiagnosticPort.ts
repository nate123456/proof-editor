import type { Result } from 'neverthrow';

export interface IDiagnosticPort {
  // Document operations
  validateDocument(documentUri: string, content: string): Promise<Result<void, DiagnosticError>>;
  clearDiagnostics(documentUri: string): void;
  clearAllDiagnostics(): void;

  // Platform lifecycle
  dispose(): void;
}

// Platform-agnostic document representation
export interface DocumentInfo {
  uri: string;
  content: string;
  languageId: string;
  lineCount: number;
}

// Platform-agnostic diagnostic representation
export interface Diagnostic {
  range: DiagnosticRange;
  message: string;
  severity: DiagnosticSeverity;
  source?: string;
  code?: string;
}

export interface DiagnosticRange {
  start: DiagnosticPosition;
  end: DiagnosticPosition;
}

export interface DiagnosticPosition {
  line: number; // 0-based
  character: number; // 0-based
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

// Error types
export interface DiagnosticError {
  code: 'VALIDATION_FAILED' | 'DOCUMENT_NOT_FOUND' | 'PLATFORM_ERROR';
  message: string;
}

// Disposable utility
export interface Disposable {
  dispose(): void;
}
