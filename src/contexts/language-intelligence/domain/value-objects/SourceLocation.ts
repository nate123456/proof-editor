import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';

export class SourceLocation {
  private constructor(
    private readonly startLine: number,
    private readonly startColumn: number,
    private readonly endLine: number,
    private readonly endColumn: number,
    private readonly documentUri?: string
  ) {}

  static create(
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
    documentUri?: string
  ): Result<SourceLocation, ValidationError> {
    if (startLine < 0) {
      return {
        success: false,
        error: new ValidationError('Start line cannot be negative')
      };
    }

    if (startColumn < 0) {
      return {
        success: false,
        error: new ValidationError('Start column cannot be negative')
      };
    }

    if (endLine < startLine) {
      return {
        success: false,
        error: new ValidationError('End line cannot be before start line')
      };
    }

    if (endLine === startLine && endColumn < startColumn) {
      return {
        success: false,
        error: new ValidationError('End column cannot be before start column on same line')
      };
    }

    return {
      success: true,
      data: new SourceLocation(startLine, startColumn, endLine, endColumn, documentUri)
    };
  }

  static createSinglePosition(
    line: number,
    column: number,
    documentUri?: string
  ): Result<SourceLocation, ValidationError> {
    return SourceLocation.create(line, column, line, column, documentUri);
  }

  static createLineRange(
    startLine: number,
    endLine: number,
    documentUri?: string
  ): Result<SourceLocation, ValidationError> {
    return SourceLocation.create(startLine, 0, endLine, Number.MAX_SAFE_INTEGER, documentUri);
  }

  static createDefault(): SourceLocation {
    return new SourceLocation(0, 0, 0, 0);
  }

  static createFromRange(start: Position, end: Position, documentUri?: string): Result<SourceLocation, ValidationError> {
    return SourceLocation.create(start.line, start.column, end.line, end.column, documentUri);
  }

  getStartLine(): number {
    return this.startLine;
  }

  getStartColumn(): number {
    return this.startColumn;
  }

  getEndLine(): number {
    return this.endLine;
  }

  getEndColumn(): number {
    return this.endColumn;
  }

  getDocumentUri(): string | undefined {
    return this.documentUri;
  }

  getStartPosition(): Position {
    return { line: this.startLine, column: this.startColumn };
  }

  getEndPosition(): Position {
    return { line: this.endLine, column: this.endColumn };
  }

  isSingleLine(): boolean {
    return this.startLine === this.endLine;
  }

  isSinglePosition(): boolean {
    return this.isSingleLine() && this.startColumn === this.endColumn;
  }

  getLineCount(): number {
    return this.endLine - this.startLine + 1;
  }

  getColumnCount(): number {
    if (!this.isSingleLine()) return 0;
    return this.endColumn - this.startColumn;
  }

  contains(other: SourceLocation): boolean {
    if (this.documentUri && other.documentUri && this.documentUri !== other.documentUri) {
      return false;
    }

    const startContains = this.startLine < other.startLine || 
                         (this.startLine === other.startLine && this.startColumn <= other.startColumn);
    
    const endContains = this.endLine > other.endLine || 
                       (this.endLine === other.endLine && this.endColumn >= other.endColumn);

    return startContains && endContains;
  }

  overlapsRange(other: SourceLocation): boolean {
    if (this.documentUri && other.documentUri && this.documentUri !== other.documentUri) {
      return false;
    }

    if (this.endLine < other.startLine || other.endLine < this.startLine) {
      return false;
    }

    if (this.endLine === other.startLine) {
      return this.endColumn >= other.startColumn;
    }

    if (other.endLine === this.startLine) {
      return other.endColumn >= this.startColumn;
    }

    return true;
  }

  intersects(other: SourceLocation): boolean {
    return this.overlapsRange(other);
  }

  union(other: SourceLocation): Result<SourceLocation, ValidationError> {
    if (this.documentUri && other.documentUri && this.documentUri !== other.documentUri) {
      return {
        success: false,
        error: new ValidationError('Cannot union locations from different documents')
      };
    }

    const startLine = Math.min(this.startLine, other.startLine);
    const endLine = Math.max(this.endLine, other.endLine);
    
    let startColumn: number;
    let endColumn: number;

    if (this.startLine === other.startLine) {
      startColumn = Math.min(this.startColumn, other.startColumn);
    } else {
      startColumn = this.startLine < other.startLine ? this.startColumn : other.startColumn;
    }

    if (this.endLine === other.endLine) {
      endColumn = Math.max(this.endColumn, other.endColumn);
    } else {
      endColumn = this.endLine > other.endLine ? this.endColumn : other.endColumn;
    }

    return SourceLocation.create(
      startLine,
      startColumn,
      endLine,
      endColumn,
      this.documentUri || other.documentUri
    );
  }

  withDocument(documentUri: string): SourceLocation {
    return new SourceLocation(
      this.startLine,
      this.startColumn,
      this.endLine,
      this.endColumn,
      documentUri
    );
  }

  toRange(): Range {
    return {
      start: this.getStartPosition(),
      end: this.getEndPosition()
    };
  }

  toString(): string {
    if (this.isSinglePosition()) {
      return `${this.startLine}:${this.startColumn}`;
    }
    
    if (this.isSingleLine()) {
      return `${this.startLine}:${this.startColumn}-${this.endColumn}`;
    }
    
    return `${this.startLine}:${this.startColumn}-${this.endLine}:${this.endColumn}`;
  }

  equals(other: SourceLocation): boolean {
    return this.startLine === other.startLine &&
           this.startColumn === other.startColumn &&
           this.endLine === other.endLine &&
           this.endColumn === other.endColumn &&
           this.documentUri === other.documentUri;
  }
}

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}