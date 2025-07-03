import { err as _err, ok as _ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class RulePattern {
  private constructor(
    private readonly patternType: PatternType,
    private readonly premisePatterns: string[],
    private readonly conclusionPatterns: string[],
    private readonly patternId: string,
    private readonly variables: Map<string, PatternVariable>,
    private readonly constraints: PatternConstraint[],
    private readonly confidence: number
  ) {}

  static createLogicalPattern(
    premisePatterns: string[],
    conclusionPatterns: string[],
    patternId: string,
    confidence = 1.0
  ): Result<RulePattern, ValidationError> {
    if (premisePatterns.length === 0) {
      return _err(new ValidationError('At least one premise pattern is required'));
    }

    if (conclusionPatterns.length === 0) {
      return _err(new ValidationError('At least one conclusion pattern is required'));
    }

    if (!patternId || patternId.trim().length === 0) {
      return _err(new ValidationError('Pattern ID is required'));
    }

    if (confidence < 0 || confidence > 1) {
      return _err(new ValidationError('Confidence must be between 0 and 1'));
    }

    const variables = RulePattern.extractVariables(premisePatterns, conclusionPatterns);
    const constraints = RulePattern.generateConstraints(variables);

    return _ok(
      new RulePattern(
        'logical',
        premisePatterns.map(p => p.trim()),
        conclusionPatterns.map(c => c.trim()),
        patternId.trim(),
        variables,
        constraints,
        confidence
      )
    );
  }

  static createModalPattern(
    premisePatterns: string[],
    conclusionPatterns: string[],
    patternId: string,
    modalOperators: string[] = ['□', '◇']
  ): Result<RulePattern, ValidationError> {
    const logicalPatternResult = RulePattern.createLogicalPattern(
      premisePatterns,
      conclusionPatterns,
      patternId
    );

    if (logicalPatternResult.isErr()) return logicalPatternResult;

    const pattern = logicalPatternResult.value;

    // Add modal operator constraints
    const modalConstraints: PatternConstraint[] = modalOperators.map(op => ({
      type: 'modal-operator',
      operator: op,
      description: `Modal operator ${op} validation`,
    }));

    return _ok(
      new RulePattern(
        'modal',
        pattern.premisePatterns,
        pattern.conclusionPatterns,
        pattern.patternId,
        pattern.variables,
        [...pattern.constraints, ...modalConstraints],
        pattern.confidence
      )
    );
  }

  static createTemplatePattern(
    template: string,
    patternId: string
  ): Result<RulePattern, ValidationError> {
    if (!template || template.trim().length === 0) {
      return _err(new ValidationError('Template cannot be empty'));
    }

    const parts = template.split('⊢'); // Use turnstile to separate premises from conclusions
    if (parts.length !== 2) {
      return _err(new ValidationError('Template must have format: premises ⊢ conclusions'));
    }

    const premisePatterns =
      parts[0]
        ?.split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0) ?? [];
    const conclusionPatterns =
      parts[1]
        ?.split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0) ?? [];

    return RulePattern.createLogicalPattern(premisePatterns, conclusionPatterns, patternId);
  }

  private static extractVariables(
    premisePatterns: string[],
    conclusionPatterns: string[]
  ): Map<string, PatternVariable> {
    const variables = new Map<string, PatternVariable>();
    const allPatterns = [...premisePatterns, ...conclusionPatterns];

    for (const pattern of allPatterns) {
      // Find variables like P, Q, R, etc. (single uppercase letters)
      const variableMatches = pattern.match(/\b[A-Z]\b/g);
      if (variableMatches) {
        for (const variable of variableMatches) {
          if (!variables.has(variable)) {
            variables.set(variable, {
              name: variable,
              type: 'proposition',
              constraints: [],
            });
          }
        }
      }

      // Find complex variables like P(x), R(a,b), etc.
      const complexVariableMatches = pattern.match(/\b[A-Z]\([^)]+\)/g);
      if (complexVariableMatches) {
        for (const variable of complexVariableMatches) {
          const varName = variable.split('(')[0];
          if (varName && !variables.has(varName)) {
            variables.set(varName, {
              name: varName,
              type: 'predicate',
              constraints: [],
            });
          }
        }
      }
    }

    return variables;
  }

  private static generateConstraints(variables: Map<string, PatternVariable>): PatternConstraint[] {
    const constraints: PatternConstraint[] = [];

    // Add consistency constraints for each variable
    for (const [name, variable] of variables) {
      constraints.push({
        type: 'consistency',
        variable: name,
        description: `Variable ${name} must be consistent across all occurrences`,
      });

      if (variable.type === 'predicate') {
        constraints.push({
          type: 'arity-consistency',
          variable: name,
          description: `Predicate ${name} must have consistent arity`,
        });
      }
    }

    return constraints;
  }

  getPatternType(): PatternType {
    return this.patternType;
  }

  getPremisePatterns(): readonly string[] {
    return [...this.premisePatterns];
  }

  getConclusionPatterns(): readonly string[] {
    return [...this.conclusionPatterns];
  }

  getPatternId(): string {
    return this.patternId;
  }

  getVariables(): ReadonlyMap<string, PatternVariable> {
    return new Map(this.variables);
  }

  getConstraints(): readonly PatternConstraint[] {
    return [...this.constraints];
  }

  getConfidence(): number {
    return this.confidence;
  }

  matches(premises: string[], conclusions: string[]): boolean {
    if (
      premises.length !== this.premisePatterns.length ||
      conclusions.length !== this.conclusionPatterns.length
    ) {
      return false;
    }

    const substitution = this.findSubstitution(premises, conclusions);
    return substitution !== null;
  }

  calculateConfidence(premises: string[], conclusions: string[]): number {
    if (!this.matches(premises, conclusions)) {
      return 0;
    }

    const substitution = this.findSubstitution(premises, conclusions);
    if (!substitution) return 0;

    // Calculate confidence based on pattern complexity and variable consistency
    let { confidence } = this;

    // Reduce confidence for complex substitutions
    const substitutionComplexity = Object.values(substitution).reduce((acc, value) => {
      return acc + (value.length > 10 ? 0.1 : 0);
    }, 0);

    confidence = Math.max(0.1, confidence - substitutionComplexity);

    return confidence;
  }

  private findSubstitution(
    premises: string[],
    conclusions: string[]
  ): Record<string, string> | null {
    const substitution: Record<string, string> = {};

    // Try to match premises
    for (let i = 0; i < this.premisePatterns.length; i++) {
      const premise = premises[i];
      const premisePattern = this.premisePatterns[i];
      if (!premise || !premisePattern) return null;
      const patternMatch = this.matchPattern(premisePattern, premise, substitution);
      if (!patternMatch) return null;
      Object.assign(substitution, patternMatch);
    }

    // Try to match conclusions
    for (let i = 0; i < this.conclusionPatterns.length; i++) {
      const conclusion = conclusions[i];
      const conclusionPattern = this.conclusionPatterns[i];
      if (!conclusion || !conclusionPattern) return null;
      const patternMatch = this.matchPattern(conclusionPattern, conclusion, substitution);
      if (!patternMatch) return null;
      Object.assign(substitution, patternMatch);
    }

    return substitution;
  }

  private matchPattern(
    pattern: string,
    statement: string,
    existingSubstitution: Record<string, string>
  ): Record<string, string> | null {
    const newSubstitution: Record<string, string> = {};

    // If no variables in pattern, must be exact match
    if (this.variables.size === 0) {
      return pattern === statement ? {} : null;
    }

    // Simple variable matching (this is a simplified implementation)
    for (const [varName] of this.variables) {
      if (pattern.includes(varName)) {
        // Find what this variable should be substituted with
        const patternParts = pattern.split(varName);
        if (patternParts.length === 2) {
          const before = patternParts[0];
          const after = patternParts[1];

          if (
            before !== undefined &&
            after !== undefined &&
            statement.startsWith(before) &&
            statement.endsWith(after)
          ) {
            const substitutionValue = statement.substring(
              before.length,
              statement.length - after.length
            );

            // Check consistency with existing substitution
            if (
              existingSubstitution[varName] &&
              existingSubstitution[varName] !== substitutionValue
            ) {
              return null;
            }

            newSubstitution[varName] = substitutionValue;
          } else {
            return null; // Pattern doesn't match
          }
        }
      }
    }

    // Ensure all variables in pattern have been substituted
    for (const [varName] of this.variables) {
      if (
        pattern.includes(varName) &&
        !newSubstitution[varName] &&
        !existingSubstitution[varName]
      ) {
        return null;
      }
    }

    return newSubstitution;
  }

  applySubstitution(substitution: Record<string, string>): RulePattern {
    const substitutedPremises = this.premisePatterns.map(pattern => {
      let result = pattern;
      for (const [variable, value] of Object.entries(substitution)) {
        result = result.replace(new RegExp(`\\b${variable}\\b`, 'g'), value);
      }
      return result;
    });

    const substitutedConclusions = this.conclusionPatterns.map(pattern => {
      let result = pattern;
      for (const [variable, value] of Object.entries(substitution)) {
        result = result.replace(new RegExp(`\\b${variable}\\b`, 'g'), value);
      }
      return result;
    });

    const result = RulePattern.createLogicalPattern(
      substitutedPremises,
      substitutedConclusions,
      `${this.patternId}-instantiated`,
      this.confidence * 0.9 // Slightly reduce confidence for instantiated patterns
    );

    return result.isOk() ? result.value : this;
  }

  isModal(): boolean {
    return this.patternType === 'modal';
  }

  isLogical(): boolean {
    return this.patternType === 'logical';
  }

  hasVariable(variableName: string): boolean {
    return this.variables.has(variableName);
  }

  getVariableCount(): number {
    return this.variables.size;
  }

  isSimplePattern(): boolean {
    return this.variables.size <= 2 && this.constraints.length <= 2;
  }

  isComplexPattern(): boolean {
    return this.variables.size > 5 || this.constraints.length > 10;
  }

  toString(): string {
    const premises = this.premisePatterns.join(', ');
    const conclusions = this.conclusionPatterns.join(', ');
    return `${premises} ⊢ ${conclusions}`;
  }

  equals(other: RulePattern): boolean {
    return (
      this.patternId === other.patternId &&
      this.patternType === other.patternType &&
      JSON.stringify(this.premisePatterns) === JSON.stringify(other.premisePatterns) &&
      JSON.stringify(this.conclusionPatterns) === JSON.stringify(other.conclusionPatterns)
    );
  }
}

export type PatternType = 'logical' | 'modal' | 'temporal' | 'custom';

export interface PatternVariable {
  name: string;
  type: 'proposition' | 'predicate' | 'term' | 'formula';
  constraints: string[];
}

export interface PatternConstraint {
  type: 'consistency' | 'arity-consistency' | 'modal-operator' | 'temporal-operator' | 'custom';
  variable?: string;
  operator?: string;
  description: string;
}
