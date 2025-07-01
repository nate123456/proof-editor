import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';
import { InferenceRuleId } from '../value-objects/InferenceRuleId';
import { RuleDescription } from '../value-objects/RuleDescription';
import { RuleMetadata } from '../value-objects/RuleMetadata';
import { RuleName } from '../value-objects/RuleName';
import { RulePattern } from '../value-objects/RulePattern';
import { Timestamp } from '../value-objects/Timestamp';
import { type PatternInstance } from './AnalysisReport';

export class InferenceRule {
  private constructor(
    private readonly id: InferenceRuleId,
    private readonly name: RuleName,
    private readonly description: RuleDescription,
    private readonly pattern: RulePattern,
    private readonly metadata: RuleMetadata,
    private readonly languagePackageId: string,
    private readonly timestamp: Timestamp,
    private isActive: boolean,
    private usageCount: number,
    private readonly examples: RuleExample[],
    private readonly prerequisites: InferenceRuleId[],
    private readonly conflicts: InferenceRuleId[]
  ) {}

  static create(
    name: string,
    description: string,
    pattern: RulePattern,
    languagePackageId: string,
    examples: RuleExample[] = [],
    prerequisites: InferenceRuleId[] = [],
    metadata?: RuleMetadata
  ): Result<InferenceRule, ValidationError> {
    const nameResult = RuleName.create(name);
    if (nameResult.isErr()) return err(nameResult.error);

    const descriptionResult = RuleDescription.create(description);
    if (descriptionResult.isErr()) return err(descriptionResult.error);

    if (!languagePackageId || languagePackageId.trim().length === 0) {
      return err(new ValidationError('Language package ID is required'));
    }

    return ok(
      new InferenceRule(
        InferenceRuleId.generate(),
        nameResult.value,
        descriptionResult.value,
        pattern,
        metadata ?? RuleMetadata.createDefault(),
        languagePackageId,
        Timestamp.now(),
        true,
        0,
        examples,
        prerequisites,
        []
      )
    );
  }

  static createModusPonens(languagePackageId: string): Result<InferenceRule, ValidationError> {
    const pattern = RulePattern.createLogicalPattern(['P', 'P → Q'], ['Q'], 'modus-ponens');

    if (pattern.isErr()) return err(pattern.error);

    const examples: RuleExample[] = [
      {
        premises: ['All humans are mortal', 'Socrates is human'],
        conclusions: ['Socrates is mortal'],
        explanation: 'Classic application of modus ponens with universal instantiation',
      },
      {
        premises: ['If it rains, then the ground is wet', 'It is raining'],
        conclusions: ['The ground is wet'],
        explanation: 'Direct application of modus ponens',
      },
    ];

    return InferenceRule.create(
      'Modus Ponens',
      'If P implies Q and P is true, then Q is true',
      pattern.value,
      languagePackageId,
      examples
    );
  }

  static createModusTollens(languagePackageId: string): Result<InferenceRule, ValidationError> {
    const pattern = RulePattern.createLogicalPattern(['P → Q', '¬Q'], ['¬P'], 'modus-tollens');

    if (pattern.isErr()) return err(pattern.error);

    const examples: RuleExample[] = [
      {
        premises: ['If it rains, then the ground is wet', 'The ground is not wet'],
        conclusions: ['It is not raining'],
        explanation: 'Contrapositive reasoning using modus tollens',
      },
    ];

    return InferenceRule.create(
      'Modus Tollens',
      'If P implies Q and Q is false, then P is false',
      pattern.value,
      languagePackageId,
      examples
    );
  }

  getId(): InferenceRuleId {
    return this.id;
  }

  getName(): RuleName {
    return this.name;
  }

  getDescription(): RuleDescription {
    return this.description;
  }

  getPattern(): RulePattern {
    return this.pattern;
  }

  getMetadata(): RuleMetadata {
    return this.metadata;
  }

  getLanguagePackageId(): string {
    return this.languagePackageId;
  }

  getTimestamp(): Timestamp {
    return this.timestamp;
  }

  isRuleActive(): boolean {
    return this.isActive;
  }

  getUsageCount(): number {
    return this.usageCount;
  }

  getExamples(): readonly RuleExample[] {
    return [...this.examples];
  }

  getPrerequisites(): readonly InferenceRuleId[] {
    return [...this.prerequisites];
  }

  getConflicts(): readonly InferenceRuleId[] {
    return [...this.conflicts];
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  incrementUsage(): void {
    this.usageCount++;
  }

  addConflict(ruleId: InferenceRuleId): Result<void, ValidationError> {
    if (ruleId.equals(this.id)) {
      return err(new ValidationError('Rule cannot conflict with itself'));
    }

    if (this.conflicts.some(id => id.equals(ruleId))) {
      return err(new ValidationError('Conflict already exists'));
    }

    this.conflicts.push(ruleId);
    return ok(undefined);
  }

  removeConflict(ruleId: InferenceRuleId): Result<void, ValidationError> {
    const index = this.conflicts.findIndex(id => id.equals(ruleId));
    if (index === -1) {
      return err(new ValidationError('Conflict not found'));
    }

    this.conflicts.splice(index, 1);
    return ok(undefined);
  }

  hasPrerequisite(ruleId: InferenceRuleId): boolean {
    return this.prerequisites.some(id => id.equals(ruleId));
  }

  conflictsWith(ruleId: InferenceRuleId): boolean {
    return this.conflicts.some(id => id.equals(ruleId));
  }

  canBeAppliedWith(rules: InferenceRule[]): boolean {
    if (!this.isActive) return false;

    const activeRuleIds = rules.filter(r => r.isActive).map(r => r.getId());

    // Check if any conflicts are active
    const hasActiveConflicts = this.conflicts.some(conflictId =>
      activeRuleIds.some(activeId => activeId.equals(conflictId))
    );

    if (hasActiveConflicts) return false;

    // Check if all prerequisites are met
    const prerequisitesMet = this.prerequisites.every(prereqId =>
      activeRuleIds.some(activeId => activeId.equals(prereqId))
    );

    return prerequisitesMet;
  }

  matchesPattern(premises: string[], conclusions: string[]): boolean {
    return this.pattern.matches(premises, conclusions);
  }

  getPatternConfidence(premises: string[], conclusions: string[]): number {
    return this.pattern.calculateConfidence(premises, conclusions);
  }

  isBasicRule(): boolean {
    return this.metadata.getComplexityLevel() === 'basic';
  }

  isAdvancedRule(): boolean {
    return this.metadata.getComplexityLevel() === 'advanced';
  }

  analyzeLogicalPatterns(statements: string[]): LogicalPattern[] {
    const patterns: LogicalPattern[] = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      // Modus ponens pattern
      const modusPonens = this.detectModusPonens(statement, statements, i);
      if (modusPonens) {
        patterns.push(modusPonens);
      }

      // Modus tollens pattern
      const modusTollens = this.detectModusTollens(statement, statements, i);
      if (modusTollens) {
        patterns.push(modusTollens);
      }

      // Hypothetical syllogism
      const hypotheticalSyllogism = this.detectHypotheticalSyllogism(statement, statements, i);
      if (hypotheticalSyllogism) {
        patterns.push(hypotheticalSyllogism);
      }
    }

    return patterns;
  }

  detectModalPatterns(statement: string, allStatements: string[], index: number): LogicalPattern[] {
    const patterns: LogicalPattern[] = [];

    // Necessity distribution: □(P ∧ Q) ↔ (□P ∧ □Q)
    if (statement.includes('□') && statement.includes('∧')) {
      patterns.push({
        type: 'necessity-distribution',
        name: 'Necessity Distribution',
        description: 'Distribution of necessity over conjunction',
        confidence: 0.7,
        instances: [{ startIndex: index, endIndex: index }],
        properties: { formula: statement },
      });
    }

    // Possibility duality: ◇P ↔ ¬□¬P
    if (statement.includes('◇') || (statement.includes('¬') && statement.includes('□'))) {
      patterns.push({
        type: 'modal-duality',
        name: 'Modal Duality',
        description: 'Duality between possibility and necessity',
        confidence: 0.75,
        instances: [{ startIndex: index, endIndex: index }],
        properties: { formula: statement },
      });
    }

    return patterns;
  }

  extractLogicalFeatures(statements: string[]): LogicalFeatures {
    const features: LogicalFeatures = {
      hasQuantifiers: false,
      hasModalOperators: false,
      hasNegations: false,
      hasImplications: false,
      hasConjunctions: false,
      hasDisjunctions: false,
      logicalComplexity: 0,
    };

    for (const statement of statements) {
      if (/[∀∃]/.test(statement)) features.hasQuantifiers = true;
      if (/[□◇]/.test(statement)) features.hasModalOperators = true;
      if (/¬/.test(statement)) features.hasNegations = true;
      if (/→/.test(statement)) features.hasImplications = true;
      if (/∧/.test(statement)) features.hasConjunctions = true;
      if (/∨/.test(statement)) features.hasDisjunctions = true;

      features.logicalComplexity += this.calculateStatementComplexity(statement);
    }

    features.logicalComplexity = Math.round(features.logicalComplexity / statements.length);
    return features;
  }

  private detectModusPonens(
    statement: string,
    allStatements: string[],
    index: number
  ): LogicalPattern | null {
    const implicationPattern = /(.+)\s*→\s*(.+)/;
    const match = statement.match(implicationPattern);

    if (match?.[1] && match[2]) {
      const antecedent = match[1]?.trim() ?? '';
      const consequent = match[2]?.trim() ?? '';

      for (let i = 0; i < index; i++) {
        if (allStatements[i]?.trim() === antecedent) {
          return {
            type: 'modus-ponens',
            name: 'Modus Ponens',
            description: 'From P and P → Q, infer Q',
            confidence: 0.95,
            instances: [{ startIndex: i, endIndex: index }],
            properties: { antecedent, consequent },
          };
        }
      }
    }

    return null;
  }

  private detectModusTollens(
    statement: string,
    allStatements: string[],
    index: number
  ): LogicalPattern | null {
    const negationPattern = /¬(.+)/;
    const match = statement.match(negationPattern);

    if (match?.[1]) {
      const negatedFormula = match[1]?.trim() ?? '';

      for (let i = 0; i < index; i++) {
        const implicationMatch = allStatements[i]?.match(/(.+)\s*→\s*(.+)/);
        if (implicationMatch && implicationMatch[2]?.trim() === negatedFormula) {
          return {
            type: 'modus-tollens',
            name: 'Modus Tollens',
            description: 'From P → Q and ¬Q, infer ¬P',
            confidence: 0.9,
            instances: [{ startIndex: i, endIndex: index }],
            properties: {
              implication: allStatements[i] ?? '',
              negation: statement,
            },
          };
        }
      }
    }

    return null;
  }

  private detectHypotheticalSyllogism(
    statement: string,
    allStatements: string[],
    index: number
  ): LogicalPattern | null {
    const implicationPattern = /(.+)\s*→\s*(.+)/;
    const match = statement.match(implicationPattern);

    if (match?.[1] && match[2]) {
      const finalAntecedent = match[1]?.trim() ?? '';
      const finalConsequent = match[2]?.trim() ?? '';

      for (let i = 0; i < index; i++) {
        for (let j = i + 1; j < index; j++) {
          const match1 = allStatements[i]?.match(implicationPattern);
          const match2 = allStatements[j]?.match(implicationPattern);

          if (match1 && match2 && match1[1] && match1[2] && match2[1] && match2[2]) {
            const ant1 = match1[1];
            const cons1 = match1[2];
            const ant2 = match2[1];
            const cons2 = match2[2];

            if (
              ant1?.trim() === finalAntecedent &&
              cons1?.trim() === ant2?.trim() &&
              cons2?.trim() === finalConsequent
            ) {
              return {
                type: 'hypothetical-syllogism',
                name: 'Hypothetical Syllogism',
                description: 'From P → Q and Q → R, infer P → R',
                confidence: 0.88,
                instances: [{ startIndex: i, endIndex: index }],
                properties: {
                  firstImplication: allStatements[i] ?? '',
                  secondImplication: allStatements[j] ?? '',
                  conclusion: statement,
                },
              };
            }
          }
        }
      }
    }

    return null;
  }

  private calculateStatementComplexity(statement: string): number {
    let complexity = 0;
    complexity += statement.length * 0.1;
    complexity += (statement.match(/[∀∃∧∨→↔¬□◇]/g) ?? []).length * 2;
    complexity += (statement.match(/\(/g) ?? []).length * 1.5;
    return complexity;
  }

  equals(other: InferenceRule): boolean {
    return this.id.equals(other.id);
  }
}

export interface RuleExample {
  premises: string[];
  conclusions: string[];
  explanation: string;
}

export interface LogicalPattern {
  type: string;
  name: string;
  description: string;
  confidence: number;
  instances: PatternInstance[];
  properties: Record<string, unknown>;
}

export interface LogicalFeatures {
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  hasNegations: boolean;
  hasImplications: boolean;
  hasConjunctions: boolean;
  hasDisjunctions: boolean;
  logicalComplexity: number;
}
