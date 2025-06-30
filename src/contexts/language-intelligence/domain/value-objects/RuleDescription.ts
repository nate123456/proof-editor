import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';

export class RuleDescription {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<RuleDescription, ValidationError> {
    if (!value || value.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Rule description cannot be empty')
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 10) {
      return {
        success: false,
        error: new ValidationError('Rule description must be at least 10 characters long')
      };
    }

    if (trimmedValue.length > 1000) {
      return {
        success: false,
        error: new ValidationError('Rule description cannot exceed 1000 characters')
      };
    }

    return {
      success: true,
      data: new RuleDescription(trimmedValue)
    };
  }

  getValue(): string {
    return this.value;
  }

  getSummary(maxLength: number = 100): string {
    if (this.value.length <= maxLength) {
      return this.value;
    }

    const truncated = this.value.substring(0, maxLength - 3);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength / 2) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  getWordCount(): number {
    return this.value.split(/\s+/).filter(word => word.length > 0).length;
  }

  containsKeyword(keyword: string): boolean {
    return this.value.toLowerCase().includes(keyword.toLowerCase());
  }

  hasLogicalSymbols(): boolean {
    return /[∀∃∧∨→↔¬□◇]/.test(this.value);
  }

  getReadingTime(): number {
    const wordsPerMinute = 200;
    const wordCount = this.getWordCount();
    return Math.ceil(wordCount / wordsPerMinute);
  }

  isDetailed(): boolean {
    return this.getWordCount() > 50;
  }

  isConcise(): boolean {
    return this.getWordCount() <= 20;
  }

  equals(other: RuleDescription): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}