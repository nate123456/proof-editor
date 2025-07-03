import { err as _err, ok as _ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';
import { DiagnosticSeverity } from './DiagnosticSeverity';

export class ValidationRule {
  private constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly description: string,
    private readonly category: ValidationRuleCategory,
    private readonly severity: DiagnosticSeverity,
    private readonly pattern: ValidationRulePattern,
    private readonly isActive: boolean,
    private readonly metadata: IValidationRuleMetadata,
  ) {}

  static create(
    name: string,
    description: string,
    category: ValidationRuleCategory,
    severity: DiagnosticSeverity,
    pattern: ValidationRulePattern,
    metadata: IValidationRuleMetadata = createDefaultValidationRuleMetadata(),
  ): Result<ValidationRule, ValidationError> {
    if (!name || name.trim().length === 0) {
      return _err(new ValidationError('Rule name cannot be empty'));
    }

    if (!description || description.trim().length === 0) {
      return _err(new ValidationError('Rule description cannot be empty'));
    }

    const id = ValidationRule.generateId(name, category);

    return _ok(
      new ValidationRule(
        id,
        name.trim(),
        description.trim(),
        category,
        severity,
        pattern,
        true,
        metadata,
      ),
    );
  }

  static createSyntaxRule(
    name: string,
    description: string,
    pattern: ValidationRulePattern,
    severity: DiagnosticSeverity = DiagnosticSeverity.error(),
  ): Result<ValidationRule, ValidationError> {
    return ValidationRule.create(
      name,
      description,
      'syntax',
      severity,
      pattern,
      createSyntaxValidationRuleMetadata(),
    );
  }

  static createSemanticRule(
    name: string,
    description: string,
    pattern: ValidationRulePattern,
    severity: DiagnosticSeverity = DiagnosticSeverity.error(),
  ): Result<ValidationRule, ValidationError> {
    return ValidationRule.create(
      name,
      description,
      'semantic',
      severity,
      pattern,
      createSemanticValidationRuleMetadata(),
    );
  }

  static createStyleRule(
    name: string,
    description: string,
    pattern: ValidationRulePattern,
    severity: DiagnosticSeverity = DiagnosticSeverity.warning(),
  ): Result<ValidationRule, ValidationError> {
    return ValidationRule.create(
      name,
      description,
      'style',
      severity,
      pattern,
      createStyleValidationRuleMetadata(),
    );
  }

  private static generateId(name: string, category: ValidationRuleCategory): string {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = Date.now().toString(36);
    return `${category}-${sanitizedName}-${timestamp}`;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getCategory(): ValidationRuleCategory {
    return this.category;
  }

  getSeverity(): DiagnosticSeverity {
    return this.severity;
  }

  getPattern(): ValidationRulePattern {
    return this.pattern;
  }

  isRuleActive(): boolean {
    return this.isActive;
  }

  getMetadata(): IValidationRuleMetadata {
    return this.metadata;
  }

  matches(text: string): boolean {
    if (!this.isActive) return false;

    switch (this.pattern.type) {
      case 'regex':
        try {
          const regex = new RegExp(this.pattern.value, this.pattern.flags ?? 'g');
          return regex.test(text);
        } catch {
          return false;
        }

      case 'literal':
        return text.includes(this.pattern.value);

      case 'function':
        // Function-based validation disabled for security reasons
        return false;

      case 'ast':
        return this.matchesAST(text);

      default:
        return false;
    }
  }

  getMatchPositions(text: string): ValidationRuleMatch[] {
    if (!this.matches(text)) return [];

    const matches: ValidationRuleMatch[] = [];

    switch (this.pattern.type) {
      case 'regex':
        try {
          const regex = new RegExp(this.pattern.value, 'g');
          let match: RegExpExecArray | null = null;
          match = regex.exec(text);
          while (match !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              matchedText: match[0],
              confidence: this.calculateConfidence(match[0]),
            });
            if (!regex.global) break;
            match = regex.exec(text);
          }
        } catch {
          // Ignore regex errors
        }
        break;

      case 'literal': {
        let index = text.indexOf(this.pattern.value);
        while (index !== -1) {
          matches.push({
            start: index,
            end: index + this.pattern.value.length,
            matchedText: this.pattern.value,
            confidence: 1.0,
          });
          index = text.indexOf(this.pattern.value, index + 1);
        }
        break;
      }
    }

    return matches;
  }

  validate(text: string): ValidationRuleResult {
    const matches = this.getMatchPositions(text);

    return {
      ruleId: this.id,
      ruleName: this.name,
      matches,
      isValid: matches.length === 0,
      severity: this.severity,
      suggestions: this.generateSuggestions(text, matches),
      performance: {
        executionTimeMs: 0, // Would be measured in real implementation
        memoryUsageMb: 0,
      },
    };
  }

  canCombineWith(other: ValidationRule): boolean {
    return (
      this.category === other.category &&
      this.severity.equals(other.severity) &&
      !this.metadata.isExclusive &&
      !other.metadata.isExclusive
    );
  }

  withSeverity(newSeverity: DiagnosticSeverity): ValidationRule {
    return new ValidationRule(
      this.id,
      this.name,
      this.description,
      this.category,
      newSeverity,
      this.pattern,
      this.isActive,
      this.metadata,
    );
  }

  activate(): ValidationRule {
    return new ValidationRule(
      this.id,
      this.name,
      this.description,
      this.category,
      this.severity,
      this.pattern,
      true,
      this.metadata,
    );
  }

  deactivate(): ValidationRule {
    return new ValidationRule(
      this.id,
      this.name,
      this.description,
      this.category,
      this.severity,
      this.pattern,
      false,
      this.metadata,
    );
  }

  private matchesAST(_text: string): boolean {
    // Simplified AST matching - in practice would use a proper parser
    // This is a placeholder for more sophisticated pattern matching
    return false;
  }

  private calculateConfidence(matchedText: string): number {
    // Simple confidence calculation based on match quality
    const lengthScore = Math.min(matchedText.length / 10, 1);
    const contextScore = this.pattern.contextWeight ?? 0.5;
    return Math.min(lengthScore + contextScore, 1);
  }

  private generateSuggestions(_text: string, matches: ValidationRuleMatch[]): string[] {
    const suggestions: string[] = [];

    if (matches.length > 0 && this.metadata.autoFix) {
      suggestions.push('Apply automatic fix');
    }

    if (this.metadata.educationalHints) {
      suggestions.push(...this.metadata.educationalHints);
    }

    return suggestions;
  }

  equals(other: ValidationRule): boolean {
    return this.id === other.id;
  }
}

export type ValidationRuleCategory = 'syntax' | 'semantic' | 'style' | 'educational';

export interface ValidationRulePattern {
  type: 'regex' | 'literal' | 'function' | 'ast';
  value: string;
  flags?: string;
  contextWeight?: number;
}

export interface IValidationRuleMetadata {
  autoFix: boolean;
  educationalHints: string[];
  isExclusive: boolean;
  performanceWeight: number;
  priority: number;
  tags: string[];
}

export interface ValidationRuleMatch {
  start: number;
  end: number;
  matchedText: string;
  confidence: number;
}

export interface ValidationRuleResult {
  ruleId: string;
  ruleName: string;
  matches: ValidationRuleMatch[];
  isValid: boolean;
  severity: DiagnosticSeverity;
  suggestions: string[];
  performance: {
    executionTimeMs: number;
    memoryUsageMb: number;
  };
}

export function createDefaultValidationRuleMetadata(): IValidationRuleMetadata {
  return {
    autoFix: false,
    educationalHints: [],
    isExclusive: false,
    performanceWeight: 1,
    priority: 0,
    tags: [],
  };
}

export function createSyntaxValidationRuleMetadata(): IValidationRuleMetadata {
  return {
    ...createDefaultValidationRuleMetadata(),
    autoFix: true,
    priority: 10,
    tags: ['syntax', 'critical'],
  };
}

export function createSemanticValidationRuleMetadata(): IValidationRuleMetadata {
  return {
    ...createDefaultValidationRuleMetadata(),
    educationalHints: ['Review logical structure', 'Check inference validity'],
    priority: 5,
    tags: ['semantic', 'logic'],
  };
}

export function createStyleValidationRuleMetadata(): IValidationRuleMetadata {
  return {
    ...createDefaultValidationRuleMetadata(),
    autoFix: true,
    priority: 1,
    tags: ['style', 'formatting'],
  };
}
