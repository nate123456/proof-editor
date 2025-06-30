import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';
import { InferenceRuleId } from '../value-objects/InferenceRuleId';
import { RulePattern } from '../value-objects/RulePattern';
import { RuleName } from '../value-objects/RuleName';
import { RuleDescription } from '../value-objects/RuleDescription';
import { RuleMetadata } from '../value-objects/RuleMetadata';
import { Timestamp } from '../value-objects/Timestamp';

export class InferenceRuleEntity {
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
  ): Result<InferenceRuleEntity, ValidationError> {
    const nameResult = RuleName.create(name);
    if (!nameResult.success) return nameResult;

    const descriptionResult = RuleDescription.create(description);
    if (!descriptionResult.success) return descriptionResult;

    if (!languagePackageId || languagePackageId.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Language package ID is required')
      };
    }

    return {
      success: true,
      data: new InferenceRuleEntity(
        InferenceRuleId.generate(),
        nameResult.data,
        descriptionResult.data,
        pattern,
        metadata || RuleMetadata.createDefault(),
        languagePackageId,
        Timestamp.now(),
        true,
        0,
        examples,
        prerequisites,
        []
      )
    };
  }

  static createModusPonens(languagePackageId: string): Result<InferenceRuleEntity, ValidationError> {
    const pattern = RulePattern.createLogicalPattern(
      ['P', 'P → Q'],
      ['Q'],
      'modus-ponens'
    );

    if (!pattern.success) return pattern;

    const examples: RuleExample[] = [
      {
        premises: ['All humans are mortal', 'Socrates is human'],
        conclusions: ['Socrates is mortal'],
        explanation: 'Classic application of modus ponens with universal instantiation'
      },
      {
        premises: ['If it rains, then the ground is wet', 'It is raining'],
        conclusions: ['The ground is wet'],
        explanation: 'Direct application of modus ponens'
      }
    ];

    return InferenceRuleEntity.create(
      'Modus Ponens',
      'If P implies Q and P is true, then Q is true',
      pattern.data,
      languagePackageId,
      examples
    );
  }

  static createModusTollens(languagePackageId: string): Result<InferenceRuleEntity, ValidationError> {
    const pattern = RulePattern.createLogicalPattern(
      ['P → Q', '¬Q'],
      ['¬P'],
      'modus-tollens'
    );

    if (!pattern.success) return pattern;

    const examples: RuleExample[] = [
      {
        premises: ['If it rains, then the ground is wet', 'The ground is not wet'],
        conclusions: ['It is not raining'],
        explanation: 'Contrapositive reasoning using modus tollens'
      }
    ];

    return InferenceRuleEntity.create(
      'Modus Tollens',
      'If P implies Q and Q is false, then P is false',
      pattern.data,
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
      return {
        success: false,
        error: new ValidationError('Rule cannot conflict with itself')
      };
    }

    if (this.conflicts.some(id => id.equals(ruleId))) {
      return {
        success: false,
        error: new ValidationError('Conflict already exists')
      };
    }

    this.conflicts.push(ruleId);
    return { success: true, data: undefined };
  }

  removeConflict(ruleId: InferenceRuleId): Result<void, ValidationError> {
    const index = this.conflicts.findIndex(id => id.equals(ruleId));
    if (index === -1) {
      return {
        success: false,
        error: new ValidationError('Conflict not found')
      };
    }

    this.conflicts.splice(index, 1);
    return { success: true, data: undefined };
  }

  hasPrerequisite(ruleId: InferenceRuleId): boolean {
    return this.prerequisites.some(id => id.equals(ruleId));
  }

  conflictsWith(ruleId: InferenceRuleId): boolean {
    return this.conflicts.some(id => id.equals(ruleId));
  }

  canBeAppliedWith(rules: InferenceRuleEntity[]): boolean {
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

  equals(other: InferenceRuleEntity): boolean {
    return this.id.equals(other.id);
  }
}

export interface RuleExample {
  premises: string[];
  conclusions: string[];
  explanation: string;
}