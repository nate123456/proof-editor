import type { Result } from "../shared/result.js";
import { success, failure, ValidationError } from "../shared/result.js";
import { StatementId, StatementContent } from "../shared/value-objects.js";

export class StatementEntity {
  private constructor(
    private readonly id: StatementId,
    private content: StatementContent,
    private readonly createdAt: number,
    private modifiedAt: number,
    private usageCount: number = 0
  ) {}

  static create(content: string): Result<StatementEntity, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (!contentResult.success) {
      return failure((contentResult as { success: false; error: ValidationError }).error);
    }

    const now = Date.now();

    return success(new StatementEntity(
      StatementId.generate(),
      contentResult.data,
      now,
      now
    ));
  }

  static reconstruct(
    id: StatementId,
    content: string,
    createdAt: number,
    modifiedAt: number,
    usageCount: number = 0
  ): Result<StatementEntity, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (!contentResult.success) {
      return failure((contentResult as { success: false; error: ValidationError }).error);
    }

    if (usageCount < 0) {
      return failure(new ValidationError("Usage count cannot be negative"));
    }

    return success(new StatementEntity(
      id,
      contentResult.data,
      createdAt,
      modifiedAt,
      usageCount
    ));
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
    if (!contentResult.success) {
      return failure((contentResult as { success: false; error: ValidationError }).error);
    }

    if (contentResult.data.equals(this.content)) {
      return success(undefined);
    }

    this.content = contentResult.data;
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  incrementUsage(): void {
    this.usageCount++;
  }

  incrementUsageCount(): void {
    this.usageCount++;
  }

  decrementUsage(): Result<void, ValidationError> {
    if (this.usageCount <= 0) {
      return failure(new ValidationError("Cannot decrement usage count below zero"));
    }

    this.usageCount--;
    return success(undefined);
  }

  isReferencedInOrderedSets(): boolean {
    return this.usageCount > 0;
  }

  contentEquals(other: StatementEntity): boolean {
    return this.content.equals(other.content);
  }

  equals(other: StatementEntity): boolean {
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