export enum ParseErrorType {
  YAML_SYNTAX = 'yaml-syntax',
  MISSING_REFERENCE = 'missing-reference',
  INVALID_STATEMENT = 'invalid-statement',
  INVALID_STRUCTURE = 'invalid-structure',
  CIRCULAR_DEPENDENCY = 'circular-dependency',
  INVALID_ARGUMENT = 'invalid-argument',
  INVALID_ORDERED_SET = 'invalid-ordered-set',
  INVALID_ATOMIC_ARGUMENT = 'invalid-atomic-argument',
  INVALID_TREE_STRUCTURE = 'invalid-tree-structure',
  DUPLICATE_ID = 'duplicate-id',
}

export interface ParseError {
  type: ParseErrorType;
  message: string;
  line?: number;
  column?: number;
  section?: string;
  reference?: string;
}

export class ParseFailureError extends Error {
  private readonly _errors: ParseError[];

  constructor(errors: ParseError[]) {
    super(`Parse failed with ${errors.length} error(s): ${errors[0]?.message}`);
    this.name = 'ParseFailureError';
    // Create defensive copy to ensure immutability
    this._errors = [...errors];
  }

  getAllErrors(): readonly ParseError[] {
    return this._errors;
  }

  get errors(): readonly ParseError[] {
    return this._errors;
  }

  getErrorsByType(type: ParseErrorType): ParseError[] {
    return this._errors.filter((error) => error.type === type);
  }

  hasErrorType(type: ParseErrorType): boolean {
    return this._errors.some((error) => error.type === type);
  }

  toFormattedString(): string {
    return this._errors
      .map((error) => {
        const location =
          error.line !== undefined
            ? ` (line ${error.line}${error.column !== undefined ? `, col ${error.column}` : ''})`
            : '';
        const section = error.section ? ` in ${error.section}` : '';
        return `${error.type}: ${error.message}${location}${section}`;
      })
      .join('\n');
  }
}
