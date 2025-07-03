import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../shared/result.js';
import { StatementContent, StatementId } from '../shared/value-objects.js';

export class Statement {
  private constructor(
    private readonly id: StatementId,
    private content: StatementContent,
    private readonly createdAt: number,
    private modifiedAt: number,
    private usageCount = 0
  ) {}

  static create(content: string): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    const now = Date.now();

    return ok(new Statement(StatementId.generate(), contentResult.value, now, now));
  }

  static reconstruct(
    id: StatementId,
    content: string,
    createdAt: number,
    modifiedAt: number,
    usageCount = 0
  ): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    if (usageCount < 0) {
      return err(new ValidationError('Usage count cannot be negative'));
    }

    return ok(new Statement(id, contentResult.value, createdAt, modifiedAt, usageCount));
  }

  getId(): StatementId {
    return this.id;
  }

  getContent(): string {
    return this.content.getValue();
  }

  getContentObject(): StatementContent {
    return this.content;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getModifiedAt(): number {
    return this.modifiedAt;
  }

  getUsageCount(): number {
    return this.usageCount;
  }

  updateContent(newContent: string): Result<void, ValidationError> {
    const contentResult = StatementContent.create(newContent);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    if (contentResult.value.equals(this.content)) {
      return ok(undefined);
    }

    this.content = contentResult.value;
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  incrementUsage(): void {
    this.usageCount++;
  }

  incrementUsageCount(): void {
    this.usageCount++;
  }

  decrementUsage(): Result<void, ValidationError> {
    if (this.usageCount <= 0) {
      return err(new ValidationError('Cannot decrement usage count below zero'));
    }

    this.usageCount--;
    return ok(undefined);
  }

  isReferencedInOrderedSets(): boolean {
    return this.usageCount > 0;
  }

  contentEquals(other: Statement): boolean {
    return this.content.equals(other.content);
  }

  equals(other: Statement): boolean {
    return this.id.equals(other.id);
  }

  toString(): string {
    return this.content.toString();
  }

  getWordCount(): number {
    return this.content.wordCount;
  }

  hasContent(): boolean {
    return !this.content.isEmpty;
  }
}
