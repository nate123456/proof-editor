import { Result } from "../../../../domain/shared/result.js"
import { ValidationError } from "../../../../domain/shared/result.js"

export class RuleName {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<RuleName, ValidationError> {
    if (!value || value.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Rule name cannot be empty')
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 2) {
      return {
        success: false,
        error: new ValidationError('Rule name must be at least 2 characters long')
      };
    }

    if (trimmedValue.length > 100) {
      return {
        success: false,
        error: new ValidationError('Rule name cannot exceed 100 characters')
      };
    }

    if (!/^[a-zA-Z0-9\s\-_.()]+$/.test(trimmedValue)) {
      return {
        success: false,
        error: new ValidationError('Rule name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses')
      };
    }

    return {
      success: true,
      data: new RuleName(trimmedValue)
    };
  }

  getValue(): string {
    return this.value;
  }

  getDisplayName(): string {
    return this.value;
  }

  getSlug(): string {
    return this.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  isStandardRule(): boolean {
    const standardRules = [
      'modus ponens',
      'modus tollens',
      'hypothetical syllogism',
      'disjunctive syllogism',
      'addition',
      'simplification',
      'conjunction',
      'disjunction',
      'universal instantiation',
      'universal generalization',
      'existential instantiation',
      'existential generalization'
    ];

    return standardRules.includes(this.value.toLowerCase());
  }

  isModalRule(): boolean {
    const modalKeywords = ['necessity', 'possibility', 'modal', 'k-axiom', 't-axiom', 's4-axiom', 's5-axiom'];
    const lowerValue = this.value.toLowerCase();
    return modalKeywords.some(keyword => lowerValue.includes(keyword));
  }

  isQuantifierRule(): boolean {
    const quantifierKeywords = ['universal', 'existential', 'instantiation', 'generalization'];
    const lowerValue = this.value.toLowerCase();
    return quantifierKeywords.some(keyword => lowerValue.includes(keyword));
  }

  getComplexityLevel(): 'basic' | 'intermediate' | 'advanced' {
    if (this.isStandardRule()) return 'basic';
    if (this.isModalRule() || this.isQuantifierRule()) return 'intermediate';
    return 'advanced';
  }

  equals(other: RuleName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }
}