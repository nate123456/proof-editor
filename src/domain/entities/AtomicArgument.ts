import { err, ok, type Result, ValidationError } from '../shared/result.js';
import { AtomicArgumentId, type OrderedSetId } from '../shared/value-objects.js';

// Strategy analysis types
export interface ProofStrategyRecommendation {
  name: string;
  description: string;
  confidence: number;
  difficulty: string;
  steps: string[];
  applicableRules: string[];
}

export interface LogicalStructureAnalysis {
  hasConditionals: boolean;
  hasNegations: boolean;
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  logicalComplexity: number;
  structureType: string;
}

export interface ComplexityAssessment {
  score: number;
  level: string;
  factors: string[];
  recommendations: string[];
}

export interface ProofStrategyRecommendations {
  recommendedStrategies: ProofStrategyRecommendation[];
  structuralAnalysis: LogicalStructureAnalysis;
  complexityAssessment: ComplexityAssessment;
  alternativeApproaches: string[];
  prerequisiteChecks: string[];
}

export interface ProofViabilityAnalysis {
  viable: boolean;
  confidence: number;
  difficulty: string;
  steps: string[];
  rules: string[];
}

export interface SideLabels {
  left?: string;
  right?: string;
}

export class AtomicArgument {
  private constructor(
    private readonly id: AtomicArgumentId,
    private premiseSetRef: OrderedSetId | null,
    private conclusionSetRef: OrderedSetId | null,
    private readonly createdAt: number,
    private modifiedAt: number,
    private sideLabels: SideLabels = {}
  ) {}

  static create(
    premiseSetRef?: OrderedSetId,
    conclusionSetRef?: OrderedSetId,
    sideLabels: SideLabels = {}
  ): Result<AtomicArgument, ValidationError> {
    const now = Date.now();

    return ok(
      new AtomicArgument(
        AtomicArgumentId.generate(),
        premiseSetRef ?? null,
        conclusionSetRef ?? null,
        now,
        now,
        sideLabels
      )
    );
  }

  static createComplete(
    premiseSetRef: OrderedSetId,
    conclusionSetRef: OrderedSetId,
    sideLabels: SideLabels = {}
  ): AtomicArgument {
    const now = Date.now();

    return new AtomicArgument(
      AtomicArgumentId.generate(),
      premiseSetRef,
      conclusionSetRef,
      now,
      now,
      sideLabels
    );
  }

  static reconstruct(
    id: AtomicArgumentId,
    premiseSetRef: OrderedSetId | null,
    conclusionSetRef: OrderedSetId | null,
    createdAt: number,
    modifiedAt: number,
    sideLabels: SideLabels = {}
  ): Result<AtomicArgument, ValidationError> {
    return ok(
      new AtomicArgument(id, premiseSetRef, conclusionSetRef, createdAt, modifiedAt, sideLabels)
    );
  }

  getId(): AtomicArgumentId {
    return this.id;
  }

  getPremiseSetRef(): OrderedSetId | null {
    return this.premiseSetRef;
  }

  getConclusionSetRef(): OrderedSetId | null {
    return this.conclusionSetRef;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getModifiedAt(): number {
    return this.modifiedAt;
  }

  getSideLabels(): SideLabels {
    return { ...this.sideLabels };
  }

  setPremiseSetRef(orderedSetRef: OrderedSetId | null): void {
    if (this.premiseSetRef?.equals(orderedSetRef ?? null)) {
      return;
    }

    this.premiseSetRef = orderedSetRef;
    this.modifiedAt = Date.now();
  }

  setConclusionSetRef(orderedSetRef: OrderedSetId | null): void {
    if (this.conclusionSetRef?.equals(orderedSetRef ?? null)) {
      return;
    }

    this.conclusionSetRef = orderedSetRef;
    this.modifiedAt = Date.now();
  }

  updateSideLabels(newSideLabels: SideLabels): Result<void, ValidationError> {
    this.sideLabels = { ...newSideLabels };
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  setLeftSideLabel(label?: string): Result<void, ValidationError> {
    if (label === undefined) {
      delete this.sideLabels.left;
    } else {
      this.sideLabels.left = label;
    }
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  setRightSideLabel(label?: string): Result<void, ValidationError> {
    if (label === undefined) {
      delete this.sideLabels.right;
    } else {
      this.sideLabels.right = label;
    }
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  hasPremiseSet(): boolean {
    return this.premiseSetRef !== null;
  }

  hasConclusionSet(): boolean {
    return this.conclusionSetRef !== null;
  }

  hasEmptyPremiseSet(): boolean {
    return this.premiseSetRef === null;
  }

  hasEmptyConclusionSet(): boolean {
    return this.conclusionSetRef === null;
  }

  canConnectToPremiseOf(other: AtomicArgument): boolean {
    return this.conclusionSetRef?.equals(other.premiseSetRef) ?? false;
  }

  canConnectToConclusionOf(other: AtomicArgument): boolean {
    return this.premiseSetRef?.equals(other.conclusionSetRef) ?? false;
  }

  isDirectlyConnectedTo(other: AtomicArgument): boolean {
    return this.canConnectToPremiseOf(other) || this.canConnectToConclusionOf(other);
  }

  sharesOrderedSetWith(other: AtomicArgument): boolean {
    if (
      this.premiseSetRef &&
      other.premiseSetRef &&
      this.premiseSetRef.equals(other.premiseSetRef)
    ) {
      return true;
    }

    if (
      this.conclusionSetRef &&
      other.conclusionSetRef &&
      this.conclusionSetRef.equals(other.conclusionSetRef)
    ) {
      return true;
    }

    return this.isDirectlyConnectedTo(other);
  }

  createBranchFromConclusion(): Result<AtomicArgument, ValidationError> {
    if (!this.conclusionSetRef) {
      return err(new ValidationError('Cannot branch from argument without conclusion set'));
    }

    return AtomicArgument.create(this.conclusionSetRef);
  }

  createBranchToPremise(): Result<AtomicArgument, ValidationError> {
    if (!this.premiseSetRef) {
      return err(new ValidationError('Cannot branch to argument without premise set'));
    }

    return AtomicArgument.create(undefined, this.premiseSetRef);
  }

  createChildArgument(): AtomicArgument {
    if (!this.conclusionSetRef) {
      throw new ValidationError('Cannot create child argument without conclusion set');
    }

    const result = AtomicArgument.create(this.conclusionSetRef);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  isBootstrapArgument(): boolean {
    return this.premiseSetRef === null && this.conclusionSetRef === null;
  }

  hasLeftSideLabel(): boolean {
    return this.sideLabels.left !== undefined && this.sideLabels.left.trim().length > 0;
  }

  hasRightSideLabel(): boolean {
    return this.sideLabels.right !== undefined && this.sideLabels.right.trim().length > 0;
  }

  hasSideLabels(): boolean {
    return this.hasLeftSideLabel() || this.hasRightSideLabel();
  }

  equals(other: AtomicArgument): boolean {
    return this.id.equals(other.id);
  }

  isComplete(): boolean {
    return this.premiseSetRef !== null && this.conclusionSetRef !== null;
  }

  isEmpty(): boolean {
    return this.premiseSetRef === null && this.conclusionSetRef === null;
  }

  canConnectTo(other: AtomicArgument): boolean {
    if (!this.conclusionSetRef || !other.premiseSetRef) {
      return false;
    }
    return this.conclusionSetRef.equals(other.premiseSetRef);
  }

  wouldCreateDirectCycle(other: AtomicArgument): boolean {
    if (!this.canConnectTo(other)) {
      return false;
    }

    return other.canConnectTo(this);
  }

  sharesSetWith(other: AtomicArgument): boolean {
    return this.sharesOrderedSetWith(other);
  }

  validateConnectionSafety(other: AtomicArgument): Result<boolean, ValidationError> {
    if (this.equals(other)) {
      return err(new ValidationError('Cannot connect argument to itself'));
    }

    if (!this.conclusionSetRef) {
      return err(new ValidationError('Source argument has no conclusion set'));
    }

    if (!other.premiseSetRef) {
      return err(new ValidationError('Target argument has no premise set'));
    }

    if (this.wouldCreateDirectCycle(other)) {
      return err(new ValidationError('Connection would create direct cycle'));
    }

    return ok(true);
  }

  toString(): string {
    const premiseRef = this.premiseSetRef?.getValue() ?? 'empty';
    const conclusionRef = this.conclusionSetRef?.getValue() ?? 'empty';
    return `${premiseRef} → ${conclusionRef}`;
  }

  // Strategy Analysis Methods - Domain Logic for Strategic Decision Making

  /**
   * Identifies viable proof strategies for given premises and conclusion
   * This is core strategic logic that belongs in the argument entity
   */
  identifyProofStrategies(premises: string[], conclusion: string): ProofStrategyRecommendations {
    const strategies: ProofStrategyRecommendation[] = [];

    // Analyze the logical structure
    const structure = this.analyzeLogicalStructure(premises, conclusion);

    // Direct proof strategy
    const directProof = this.analyzeDirectProofViability(premises, conclusion);
    if (directProof.viable) {
      strategies.push({
        name: 'Direct Proof',
        description: 'Proceed directly from premises to conclusion',
        confidence: directProof.confidence,
        difficulty: directProof.difficulty,
        steps: directProof.steps,
        applicableRules: directProof.rules,
      });
    }

    // Proof by contradiction
    const contradictionProof = this.analyzeContradictionProofViability(premises, conclusion);
    if (contradictionProof.viable) {
      strategies.push({
        name: 'Proof by Contradiction',
        description: 'Assume negation of conclusion and derive contradiction',
        confidence: contradictionProof.confidence,
        difficulty: contradictionProof.difficulty,
        steps: contradictionProof.steps,
        applicableRules: contradictionProof.rules,
      });
    }

    // Proof by cases
    const casesProof = this.analyzeCasesProofViability(premises, conclusion);
    if (casesProof.viable) {
      strategies.push({
        name: 'Proof by Cases',
        description: 'Break into exhaustive cases and prove each',
        confidence: casesProof.confidence,
        difficulty: casesProof.difficulty,
        steps: casesProof.steps,
        applicableRules: casesProof.rules,
      });
    }

    // Mathematical induction (if applicable)
    if (this.isInductionApplicable(premises, conclusion)) {
      const inductionProof = this.analyzeInductionProofViability(premises, conclusion);
      if (inductionProof.viable) {
        strategies.push({
          name: 'Mathematical Induction',
          description: 'Prove base case and inductive step',
          confidence: inductionProof.confidence,
          difficulty: inductionProof.difficulty,
          steps: inductionProof.steps,
          applicableRules: inductionProof.rules,
        });
      }
    }

    // Sort by confidence
    strategies.sort((a, b) => b.confidence - a.confidence);

    return {
      recommendedStrategies: strategies,
      structuralAnalysis: structure,
      complexityAssessment: this.assessProofComplexity(premises, conclusion),
      alternativeApproaches: this.suggestAlternativeApproaches(strategies),
      prerequisiteChecks: this.identifyPrerequisites(strategies),
    };
  }

  private analyzeLogicalStructure(
    premises: string[],
    conclusion: string
  ): LogicalStructureAnalysis {
    return {
      hasConditionals: [...premises, conclusion].some(s => s.includes('→')),
      hasNegations: [...premises, conclusion].some(s => s.includes('¬')),
      hasQuantifiers: [...premises, conclusion].some(s => /[∀∃]/.test(s)),
      hasModalOperators: [...premises, conclusion].some(s => /[□◇]/.test(s)),
      logicalComplexity: this.calculateLogicalComplexity(premises, conclusion),
      structureType: this.determineStructureType(premises, conclusion),
    };
  }

  private calculateLogicalComplexity(premises: string[], conclusion: string): number {
    const allStatements = [...premises, conclusion];
    const totalLength = allStatements.join('').length;
    const symbols = allStatements.join('').match(/[∀∃∧∨→↔¬□◇]/g) || [];
    return Math.round(totalLength * 0.1 + symbols.length * 2);
  }

  private determineStructureType(premises: string[], conclusion: string): string {
    if (premises.some(p => p.includes('∨'))) return 'disjunctive';
    if (premises.some(p => p.includes('→'))) return 'conditional';
    if (conclusion.includes('∀') || conclusion.includes('∃')) return 'quantificational';
    return 'basic';
  }

  private analyzeDirectProofViability(
    _premises: string[],
    _conclusion: string
  ): ProofViabilityAnalysis {
    // Simplified analysis - in practice would use theorem prover
    return {
      viable: true,
      confidence: 0.8,
      difficulty: 'medium',
      steps: [
        'Start with given premises',
        'Apply logical rules step by step',
        'Derive the conclusion',
      ],
      rules: ['modus-ponens', 'conjunction-elimination'],
    };
  }

  private analyzeContradictionProofViability(
    _premises: string[],
    _conclusion: string
  ): ProofViabilityAnalysis {
    return {
      viable: true,
      confidence: 0.7,
      difficulty: 'medium',
      steps: [
        'Assume the negation of the conclusion',
        'Combine with the given premises',
        'Derive a contradiction',
        'Conclude the original statement',
      ],
      rules: ['contradiction-introduction', 'negation-elimination'],
    };
  }

  private analyzeCasesProofViability(
    premises: string[],
    _conclusion: string
  ): ProofViabilityAnalysis {
    const hasDisjunction = premises.some(p => p.includes('∨'));

    return {
      viable: hasDisjunction,
      confidence: hasDisjunction ? 0.85 : 0.2,
      difficulty: 'medium',
      steps: [
        'Identify the relevant cases from disjunctive premises',
        'Prove the conclusion for each case separately',
        'Combine the results using disjunction elimination',
      ],
      rules: ['disjunction-elimination', 'case-analysis'],
    };
  }

  private isInductionApplicable(premises: string[], conclusion: string): boolean {
    // Check if the conclusion involves universal quantification over natural numbers
    return /∀n/.test(conclusion) || conclusion.includes('all n');
  }

  private analyzeInductionProofViability(
    _premises: string[],
    _conclusion: string
  ): ProofViabilityAnalysis {
    return {
      viable: true,
      confidence: 0.9,
      difficulty: 'hard',
      steps: [
        'Prove the base case (typically n = 0 or n = 1)',
        'Assume the statement holds for some arbitrary k',
        'Prove it holds for k + 1',
        'Conclude by mathematical induction',
      ],
      rules: ['mathematical-induction', 'universal-generalization'],
    };
  }

  private assessProofComplexity(premises: string[], conclusion: string): ComplexityAssessment {
    const complexity = this.calculateLogicalComplexity(premises, conclusion);

    return {
      score: complexity,
      level: complexity < 10 ? 'low' : complexity < 30 ? 'medium' : 'high',
      factors: ['Number of logical operators', 'Statement length', 'Nesting depth'],
      recommendations: complexity > 30 ? ['Consider breaking into smaller steps'] : [],
    };
  }

  private suggestAlternativeApproaches(strategies: ProofStrategyRecommendation[]): string[] {
    const alternatives: string[] = [];

    if (strategies.length > 1) {
      alternatives.push(
        'Multiple proof strategies are viable - choose based on your comfort level'
      );
    }

    if (strategies.some(s => s.name === 'Direct Proof')) {
      alternatives.push('If direct proof seems difficult, consider proof by contradiction');
    }

    return alternatives;
  }

  private identifyPrerequisites(strategies: ProofStrategyRecommendation[]): string[] {
    const prerequisites: string[] = [];

    for (const strategy of strategies) {
      if (strategy.name === 'Mathematical Induction') {
        prerequisites.push('Understanding of natural number properties');
      }

      if (strategy.applicableRules.some(rule => rule.includes('modal'))) {
        prerequisites.push('Modal logic fundamentals');
      }
    }

    return Array.from(new Set(prerequisites));
  }
}
