import { err, ok, type Result } from 'neverthrow';

import type { ValidationError } from '../shared/result.js';
import {
  StatementContent,
  StatementId,
  Timestamp,
  UsageCount,
} from '../shared/value-objects/index.js';

export class Statement {
  private constructor(
    private readonly id: StatementId,
    private content: StatementContent,
    private readonly createdAt: Timestamp,
    private modifiedAt: Timestamp,
    private usageCount: UsageCount,
  ) {}

  /**
   * @deprecated Use StatementFactory.create() instead
   */
  static create(content: string): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    const now = Timestamp.now();

    return ok(
      new Statement(StatementId.generate(), contentResult.value, now, now, UsageCount.zero()),
    );
  }

  /**
   * @deprecated Use StatementFactory.createWithContent() instead
   */
  static createWithContent(content: StatementContent): Result<Statement, ValidationError> {
    const now = Timestamp.now();

    return ok(new Statement(StatementId.generate(), content, now, now, UsageCount.zero()));
  }

  static reconstruct(
    id: StatementId,
    content: string,
    createdAt: number,
    modifiedAt: number,
    usageCount = 0,
  ): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    const timestampCreatedResult = Timestamp.create(createdAt);
    if (timestampCreatedResult.isErr()) {
      return err(timestampCreatedResult.error);
    }

    const timestampModifiedResult = Timestamp.create(modifiedAt);
    if (timestampModifiedResult.isErr()) {
      return err(timestampModifiedResult.error);
    }

    const usageCountResult = UsageCount.create(usageCount);
    if (usageCountResult.isErr()) {
      return err(usageCountResult.error);
    }

    return ok(
      new Statement(
        id,
        contentResult.value,
        timestampCreatedResult.value,
        timestampModifiedResult.value,
        usageCountResult.value,
      ),
    );
  }

  getId(): StatementId {
    return this.id;
  }

  getContent(): string {
    return this.content.toString();
  }

  getContentObject(): StatementContent {
    return this.content;
  }

  getUsageCount(): number {
    return this.usageCount.getValue();
  }

  getCreatedAt(): number {
    return this.createdAt.getValue();
  }

  getModifiedAt(): number {
    return this.modifiedAt.getValue();
  }

  updateContent(newContent: string): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(newContent);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    if (contentResult.value.equals(this.content)) {
      return ok(this);
    }

    return ok(
      new Statement(this.id, contentResult.value, this.createdAt, Timestamp.now(), this.usageCount),
    );
  }

  incrementUsage(): Statement {
    return new Statement(
      this.id,
      this.content,
      this.createdAt,
      this.modifiedAt,
      this.usageCount.increment(),
    );
  }

  decrementUsage(): Result<Statement, ValidationError> {
    const decrementResult = this.usageCount.decrement();
    if (decrementResult.isErr()) {
      return err(decrementResult.error);
    }

    return ok(
      new Statement(this.id, this.content, this.createdAt, this.modifiedAt, decrementResult.value),
    );
  }

  isInUse(): boolean {
    return this.usageCount.isInUse();
  }

  hasEqualContent(other: Statement): boolean {
    return this.content.equals(other.content);
  }

  equals(other: Statement): boolean {
    return this.id.equals(other.id);
  }

  toString(): string {
    return this.content.toString();
  }

  hasWords(): boolean {
    return this.content.wordCount > 0;
  }

  hasContent(): boolean {
    return !this.content.isEmpty;
  }

  /**
   * Create a placeholder statement for UI display before user types.
   * This is used during bootstrap to show empty fields.
   */
  static createPlaceholder(): Result<Statement, ValidationError> {
    return Statement.create('[Enter text]');
  }

  static fromFactory(
    id: StatementId,
    content: StatementContent,
    createdAt: Timestamp,
    modifiedAt: Timestamp,
    usageCount: UsageCount,
  ): Statement {
    return new Statement(id, content, createdAt, modifiedAt, usageCount);
  }
}
