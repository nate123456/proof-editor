import { Result } from "../../../../domain/shared/result.js"
import { ValidationError } from "../../../../domain/shared/result.js"

export class RuleMetadata {
  private constructor(
    private readonly complexityLevel: ComplexityLevel,
    private readonly category: RuleCategory,
    private readonly logicType: LogicType,
    private readonly isBuiltIn: boolean,
    private readonly isStandard: boolean,
    private readonly tags: readonly string[],
    private readonly sourceReference: string | null,
    private readonly educationalLevel: EducationalLevel,
    private readonly prerequisiteKnowledge: readonly string[],
    private readonly relatedConcepts: readonly string[]
  ) {}

  static create(options: RuleMetadataOptions): Result<RuleMetadata, ValidationError> {
    const {
      complexityLevel = 'intermediate',
      category = 'inference',
      logicType = 'propositional',
      isBuiltIn = false,
      isStandard = false,
      tags = [],
      sourceReference = null,
      educationalLevel = 'undergraduate',
      prerequisiteKnowledge = [],
      relatedConcepts = []
    } = options;

    if (tags.some(tag => tag.trim().length === 0)) {
      return {
        success: false,
        error: new ValidationError('Tags cannot be empty')
      };
    }

    if (prerequisiteKnowledge.some(prereq => prereq.trim().length === 0)) {
      return {
        success: false,
        error: new ValidationError('Prerequisite knowledge items cannot be empty')
      };
    }

    if (relatedConcepts.some(concept => concept.trim().length === 0)) {
      return {
        success: false,
        error: new ValidationError('Related concepts cannot be empty')
      };
    }

    return {
      success: true,
      data: new RuleMetadata(
        complexityLevel,
        category,
        logicType,
        isBuiltIn,
        isStandard,
        tags.map(tag => tag.trim()),
        sourceReference?.trim() || null,
        educationalLevel,
        prerequisiteKnowledge.map(prereq => prereq.trim()),
        relatedConcepts.map(concept => concept.trim())
      )
    };
  }

  static createDefault(): RuleMetadata {
    return new RuleMetadata(
      'intermediate',
      'inference',
      'propositional',
      false,
      false,
      [],
      null,
      'undergraduate',
      [],
      []
    );
  }

  static createForModusPonens(): Result<RuleMetadata, ValidationError> {
    return RuleMetadata.create({
      complexityLevel: 'basic',
      category: 'inference',
      logicType: 'propositional',
      isBuiltIn: true,
      isStandard: true,
      tags: ['basic', 'fundamental', 'deductive'],
      educationalLevel: 'high-school',
      prerequisiteKnowledge: ['implication', 'logical-reasoning'],
      relatedConcepts: ['modus-tollens', 'hypothetical-syllogism', 'conditional-statements']
    });
  }

  static createForModalRule(): Result<RuleMetadata, ValidationError> {
    return RuleMetadata.create({
      complexityLevel: 'advanced',
      category: 'modal',
      logicType: 'modal',
      isBuiltIn: false,
      isStandard: true,
      tags: ['modal', 'necessity', 'possibility'],
      educationalLevel: 'graduate',
      prerequisiteKnowledge: ['propositional-logic', 'possible-worlds', 'modal-operators'],
      relatedConcepts: ['accessibility-relations', 'modal-axioms', 'kripke-semantics']
    });
  }

  static createForQuantifierRule(): Result<RuleMetadata, ValidationError> {
    return RuleMetadata.create({
      complexityLevel: 'intermediate',
      category: 'quantifier',
      logicType: 'first-order',
      isBuiltIn: true,
      isStandard: true,
      tags: ['quantifier', 'universal', 'existential'],
      educationalLevel: 'undergraduate',
      prerequisiteKnowledge: ['predicate-logic', 'variable-binding', 'domains'],
      relatedConcepts: ['instantiation', 'generalization', 'scope']
    });
  }

  getComplexityLevel(): ComplexityLevel {
    return this.complexityLevel;
  }

  getCategory(): RuleCategory {
    return this.category;
  }

  getLogicType(): LogicType {
    return this.logicType;
  }

  isBuiltInRule(): boolean {
    return this.isBuiltIn;
  }

  isStandardRule(): boolean {
    return this.isStandard;
  }

  getTags(): readonly string[] {
    return this.tags;
  }

  getSourceReference(): string | null {
    return this.sourceReference;
  }

  getEducationalLevel(): EducationalLevel {
    return this.educationalLevel;
  }

  getPrerequisiteKnowledge(): readonly string[] {
    return this.prerequisiteKnowledge;
  }

  getRelatedConcepts(): readonly string[] {
    return this.relatedConcepts;
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag.toLowerCase());
  }

  isBasic(): boolean {
    return this.complexityLevel === 'basic';
  }

  isAdvanced(): boolean {
    return this.complexityLevel === 'advanced';
  }

  isModalLogic(): boolean {
    return this.logicType === 'modal';
  }

  isFirstOrderLogic(): boolean {
    return this.logicType === 'first-order';
  }

  isPropositionalLogic(): boolean {
    return this.logicType === 'propositional';
  }

  requiresAdvancedKnowledge(): boolean {
    return this.educationalLevel === 'graduate' || this.complexityLevel === 'advanced';
  }

  getSuitableForLevel(level: EducationalLevel): boolean {
    const levelOrder: EducationalLevel[] = ['high-school', 'undergraduate', 'graduate'];
    const requiredIndex = levelOrder.indexOf(this.educationalLevel);
    const userIndex = levelOrder.indexOf(level);
    return userIndex >= requiredIndex;
  }

  getDifficultyScore(): number {
    let score = 0;
    
    switch (this.complexityLevel) {
      case 'basic': score += 1; break;
      case 'intermediate': score += 2; break;
      case 'advanced': score += 3; break;
    }

    switch (this.logicType) {
      case 'propositional': score += 1; break;
      case 'first-order': score += 2; break;
      case 'modal': score += 3; break;
      case 'higher-order': score += 4; break;
    }

    score += this.prerequisiteKnowledge.length * 0.5;

    return Math.round(score * 10) / 10;
  }

  getTagsByCategory(): TagCategories {
    const categories: TagCategories = {
      logical: [],
      educational: [],
      technical: [],
      conceptual: []
    };

    for (const tag of this.tags) {
      if (['basic', 'intermediate', 'advanced', 'beginner', 'expert'].includes(tag)) {
        categories.educational.push(tag);
      } else if (['propositional', 'modal', 'first-order', 'quantifier'].includes(tag)) {
        categories.logical.push(tag);
      } else if (['built-in', 'standard', 'custom', 'experimental'].includes(tag)) {
        categories.technical.push(tag);
      } else {
        categories.conceptual.push(tag);
      }
    }

    return categories;
  }

  withAdditionalTags(newTags: string[]): Result<RuleMetadata, ValidationError> {
    const allTags = [...this.tags, ...newTags.map(tag => tag.trim())];
    
    return RuleMetadata.create({
      complexityLevel: this.complexityLevel,
      category: this.category,
      logicType: this.logicType,
      isBuiltIn: this.isBuiltIn,
      isStandard: this.isStandard,
      tags: Array.from(new Set(allTags)),
      sourceReference: this.sourceReference,
      educationalLevel: this.educationalLevel,
      prerequisiteKnowledge: [...this.prerequisiteKnowledge],
      relatedConcepts: [...this.relatedConcepts]
    });
  }

  withComplexityLevel(newLevel: ComplexityLevel): RuleMetadata {
    return new RuleMetadata(
      newLevel,
      this.category,
      this.logicType,
      this.isBuiltIn,
      this.isStandard,
      this.tags,
      this.sourceReference,
      this.educationalLevel,
      this.prerequisiteKnowledge,
      this.relatedConcepts
    );
  }

  equals(other: RuleMetadata): boolean {
    return this.complexityLevel === other.complexityLevel &&
           this.category === other.category &&
           this.logicType === other.logicType &&
           this.isBuiltIn === other.isBuiltIn &&
           this.isStandard === other.isStandard;
  }
}

export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced';
export type RuleCategory = 'inference' | 'equivalence' | 'modal' | 'quantifier' | 'structural' | 'custom';
export type LogicType = 'propositional' | 'first-order' | 'modal' | 'higher-order' | 'temporal' | 'deontic';
export type EducationalLevel = 'high-school' | 'undergraduate' | 'graduate';

export interface RuleMetadataOptions {
  complexityLevel?: ComplexityLevel;
  category?: RuleCategory;
  logicType?: LogicType;
  isBuiltIn?: boolean;
  isStandard?: boolean;
  tags?: string[];
  sourceReference?: string;
  educationalLevel?: EducationalLevel;
  prerequisiteKnowledge?: string[];
  relatedConcepts?: string[];
}

export interface TagCategories {
  logical: string[];
  educational: string[];
  technical: string[];
  conceptual: string[];
}