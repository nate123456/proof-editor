import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../result.js';
import { isInteger, ValueObject } from './common.js';

export class StatementContent extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<StatementContent, ValidationError> {
    if (value === null || value === undefined) {
      return err(
        new ValidationError('StatementContent cannot be null or undefined', {
          field: 'value',
          value,
        }),
      );
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return err(
        new ValidationError('StatementContent cannot be empty', { field: 'value', value }),
      );
    }

    if (trimmed.length > 10000) {
      return err(
        new ValidationError('StatementContent cannot exceed 10000 characters', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new StatementContent(trimmed));
  }

  static fromString(value: string): Result<StatementContent, ValidationError> {
    return StatementContent.create(value);
  }

  get isEmpty(): boolean {
    return this.value.length === 0;
  }

  get wordCount(): number {
    return this.value.split(/\s+/).filter((word) => word.length > 0).length;
  }
}

export class DocumentContent extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<DocumentContent, ValidationError> {
    if (value === null || value === undefined) {
      return err(
        new ValidationError('Document content cannot be null or undefined', {
          field: 'value',
          value,
        }),
      );
    }

    // Allow empty documents
    if (value.length > 50 * 1024 * 1024) {
      // 50MB limit
      return err(
        new ValidationError('Document content cannot exceed 50MB', {
          field: 'value',
          value: 'content too large',
        }),
      );
    }

    return ok(new DocumentContent(value));
  }

  static fromString(value: string): Result<DocumentContent, ValidationError> {
    return DocumentContent.create(value);
  }

  static empty(): DocumentContent {
    return new DocumentContent('');
  }

  isEmpty(): boolean {
    return this.value.length === 0;
  }

  getSize(): number {
    return this.value.length;
  }

  getLineCount(): number {
    return this.value.split('\n').length;
  }
}

export class Title extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<Title, ValidationError> {
    if (value === null || value === undefined) {
      return err(
        new ValidationError('Title cannot be null or undefined', {
          field: 'value',
          value,
        }),
      );
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return err(new ValidationError('Title cannot be empty', { field: 'value', value }));
    }

    if (trimmed.length > 255) {
      return err(
        new ValidationError('Title cannot exceed 255 characters', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new Title(trimmed));
  }

  static fromString(value: string): Result<Title, ValidationError> {
    return Title.create(value);
  }
}

export class SideLabel extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<SideLabel, ValidationError> {
    if (value === null || value === undefined) {
      return err(
        new ValidationError('SideLabel cannot be null or undefined', {
          field: 'value',
          value,
        }),
      );
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return err(new ValidationError('SideLabel cannot be empty', { field: 'value', value }));
    }

    if (trimmed.length > 100) {
      return err(
        new ValidationError('SideLabel cannot exceed 100 characters', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new SideLabel(trimmed));
  }

  static fromString(value: string): Result<SideLabel, ValidationError> {
    return SideLabel.create(value);
  }
}

export class Version extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<Version, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Version must be a non-negative integer', { field: 'value', value }),
      );
    }

    return ok(new Version(value));
  }

  static initial(): Version {
    return new Version(0);
  }

  increment(): Version {
    return new Version(this.value + 1);
  }

  isAfter(other: Version): boolean {
    return this.value > other.value;
  }

  isBefore(other: Version): boolean {
    return this.value < other.value;
  }
}

export class DocumentVersion extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<DocumentVersion, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Document version must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new DocumentVersion(value));
  }

  static fromNumber(value: number): Result<DocumentVersion, ValidationError> {
    return DocumentVersion.create(value);
  }

  static initial(): DocumentVersion {
    return new DocumentVersion(0);
  }

  increment(): DocumentVersion {
    return new DocumentVersion(this.value + 1);
  }

  isInitial(): boolean {
    return this.value === 0;
  }

  isAfter(other: DocumentVersion): boolean {
    return this.value > other.value;
  }
}

export class Timestamp extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<Timestamp, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Timestamp must be a non-negative integer', { field: 'value', value }),
      );
    }

    return ok(new Timestamp(value));
  }

  static now(): Timestamp {
    return new Timestamp(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return new Timestamp(date.getTime());
  }

  toDate(): Date {
    return new Date(this.value);
  }

  isAfter(other: Timestamp): boolean {
    return this.value > other.value;
  }

  isBefore(other: Timestamp): boolean {
    return this.value < other.value;
  }
}

export class MessageContent extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<MessageContent, ValidationError> {
    if (value === null || value === undefined) {
      return err(
        new ValidationError('Message content cannot be null or undefined', {
          field: 'value',
          value,
        }),
      );
    }

    // Allow empty content for some message types
    if (value.length > 100000) {
      // 100KB limit for message content
      return err(
        new ValidationError('Message content cannot exceed 100KB', {
          field: 'value',
          value: 'content too large',
        }),
      );
    }

    return ok(new MessageContent(value));
  }

  static fromString(value: string): Result<MessageContent, ValidationError> {
    return MessageContent.create(value);
  }

  static empty(): MessageContent {
    return new MessageContent('');
  }

  isEmpty(): boolean {
    return this.value.length === 0;
  }

  getSize(): number {
    return this.value.length;
  }
}

export class EventData extends ValueObject<Record<string, unknown>> {
  private constructor(value: Record<string, unknown>) {
    super(value);
  }

  static create(value: Record<string, unknown>): Result<EventData, ValidationError> {
    if (value === null || value === undefined) {
      return err(
        new ValidationError('Event data cannot be null or undefined', {
          field: 'value',
          value,
        }),
      );
    }

    // Basic validation for event data structure
    if (typeof value !== 'object') {
      return err(
        new ValidationError('Event data must be an object', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new EventData(value));
  }

  static fromObject(value: Record<string, unknown>): Result<EventData, ValidationError> {
    return EventData.create(value);
  }

  static empty(): EventData {
    return new EventData({});
  }

  has(key: string): boolean {
    return key in this.value;
  }

  get(key: string): unknown {
    return this.value[key];
  }

  isEmpty(): boolean {
    return Object.keys(this.value).length === 0;
  }
}

export class SideLabels {
  private constructor(
    private readonly left?: SideLabel,
    private readonly right?: SideLabel,
  ) {}

  static create(left?: SideLabel, right?: SideLabel): SideLabels {
    return new SideLabels(left, right);
  }

  static empty(): SideLabels {
    return new SideLabels();
  }

  static fromStrings(sideLabels: {
    left?: string;
    right?: string;
  }): Result<SideLabels, ValidationError> {
    let left: SideLabel | undefined;
    let right: SideLabel | undefined;

    if (sideLabels.left !== undefined) {
      const leftResult = SideLabel.create(sideLabels.left);
      if (leftResult.isErr()) {
        return err(leftResult.error);
      }
      left = leftResult.value;
    }

    if (sideLabels.right !== undefined) {
      const rightResult = SideLabel.create(sideLabels.right);
      if (rightResult.isErr()) {
        return err(rightResult.error);
      }
      right = rightResult.value;
    }

    return ok(new SideLabels(left, right));
  }

  getLeft(): SideLabel | undefined {
    return this.left;
  }

  getRight(): SideLabel | undefined {
    return this.right;
  }

  hasLeft(): boolean {
    return this.left !== undefined;
  }

  hasRight(): boolean {
    return this.right !== undefined;
  }

  hasAny(): boolean {
    return this.hasLeft() || this.hasRight();
  }

  withLeft(left?: SideLabel): SideLabels {
    return new SideLabels(left, this.right);
  }

  withRight(right?: SideLabel): SideLabels {
    return new SideLabels(this.left, right);
  }

  toStrings(): { left?: string; right?: string } {
    return {
      left: this.left?.getValue(),
      right: this.right?.getValue(),
    };
  }

  equals(other: SideLabels): boolean {
    const leftEquals = this.left?.equals(other.left) ?? other.left === undefined;
    const rightEquals = this.right?.equals(other.right) ?? other.right === undefined;
    return leftEquals && rightEquals;
  }

  toString(): string {
    const leftStr = this.left?.getValue() || '';
    const rightStr = this.right?.getValue() || '';
    return `[${leftStr}|${rightStr}]`;
  }
}

export class ImplicationLine {
  private constructor(
    private readonly argumentId: string,
    private readonly position: number,
  ) {}

  static create(
    argumentId: string,
    position: number = 0,
  ): Result<ImplicationLine, ValidationError> {
    if (!argumentId || argumentId.trim().length === 0) {
      return err(
        new ValidationError('Implication line must have a valid argument ID', {
          field: 'argumentId',
          value: argumentId,
        }),
      );
    }

    if (!isInteger(position) || position < 0) {
      return err(
        new ValidationError('Implication line position must be a non-negative integer', {
          field: 'position',
          value: position,
        }),
      );
    }

    return ok(new ImplicationLine(argumentId.trim(), position));
  }

  static fromArgument(argumentId: string): Result<ImplicationLine, ValidationError> {
    return ImplicationLine.create(argumentId);
  }

  getArgumentId(): string {
    return this.argumentId;
  }

  getPosition(): number {
    return this.position;
  }

  isMainLine(): boolean {
    return this.position === 0;
  }

  equals(other: ImplicationLine): boolean {
    return this.argumentId === other.argumentId && this.position === other.position;
  }

  toString(): string {
    if (this.isMainLine()) {
      return `ImplicationLine(${this.argumentId})`;
    }
    return `ImplicationLine(${this.argumentId}:${this.position})`;
  }
}

export class BranchPoint {
  private constructor(
    private readonly startIndex: number,
    private readonly endIndex: number,
    private readonly selectedText: string,
  ) {}

  static create(
    startIndex: number,
    endIndex: number,
    selectedText: string,
  ): Result<BranchPoint, ValidationError> {
    if (!isInteger(startIndex) || startIndex < 0) {
      return err(
        new ValidationError('Start index must be a non-negative integer', {
          field: 'startIndex',
          value: startIndex,
        }),
      );
    }

    if (!isInteger(endIndex) || endIndex < 0) {
      return err(
        new ValidationError('End index must be a non-negative integer', {
          field: 'endIndex',
          value: endIndex,
        }),
      );
    }

    if (endIndex < startIndex) {
      return err(
        new ValidationError('End index must be greater than or equal to start index', {
          field: 'indices',
          value: { startIndex, endIndex },
        }),
      );
    }

    if (endIndex - startIndex > 10000) {
      return err(
        new ValidationError('Selection cannot exceed 10000 characters', {
          field: 'length',
          value: endIndex - startIndex,
        }),
      );
    }

    if (selectedText === null || selectedText === undefined) {
      return err(
        new ValidationError('Selected text cannot be null or undefined', {
          field: 'selectedText',
          value: selectedText,
        }),
      );
    }

    if (selectedText.length !== endIndex - startIndex) {
      return err(
        new ValidationError('Selected text length must match index range', {
          field: 'selectedText',
          value: {
            textLength: selectedText.length,
            indexRange: endIndex - startIndex,
          },
        }),
      );
    }

    return ok(new BranchPoint(startIndex, endIndex, selectedText));
  }

  static fromSelection(
    fullText: string,
    startIndex: number,
    endIndex: number,
  ): Result<BranchPoint, ValidationError> {
    if (startIndex < 0 || startIndex > fullText.length) {
      return err(
        new ValidationError('Start index out of bounds', {
          field: 'startIndex',
          value: { startIndex, textLength: fullText.length },
        }),
      );
    }

    if (endIndex < 0 || endIndex > fullText.length) {
      return err(
        new ValidationError('End index out of bounds', {
          field: 'endIndex',
          value: { endIndex, textLength: fullText.length },
        }),
      );
    }

    const selectedText = fullText.substring(startIndex, endIndex);
    return BranchPoint.create(startIndex, endIndex, selectedText);
  }

  getStartIndex(): number {
    return this.startIndex;
  }

  getEndIndex(): number {
    return this.endIndex;
  }

  getSelectedText(): string {
    return this.selectedText;
  }

  getLength(): number {
    return this.endIndex - this.startIndex;
  }

  isEmpty(): boolean {
    return this.startIndex === this.endIndex;
  }

  overlaps(other: BranchPoint): boolean {
    return !(this.endIndex <= other.startIndex || other.endIndex <= this.startIndex);
  }

  contains(index: number): boolean {
    return index >= this.startIndex && index < this.endIndex;
  }

  equals(other: BranchPoint): boolean {
    return (
      this.startIndex === other.startIndex &&
      this.endIndex === other.endIndex &&
      this.selectedText === other.selectedText
    );
  }

  toString(): string {
    return `[${this.startIndex}:${this.endIndex}] "${this.selectedText}"`;
  }
}
