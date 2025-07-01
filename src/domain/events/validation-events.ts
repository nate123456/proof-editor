import {
  // AtomicArgumentId,
  type DocumentId,
  // StatementId,
  type TreeId,
} from '../shared/value-objects.js';
import { DomainEvent } from './base-event.js';

export class ValidationCompleted extends DomainEvent {
  readonly eventType = 'ValidationCompleted';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly validationScope: ValidationScope,
    public readonly result: ValidationResult,
    public readonly validatedBy: string,
    public readonly languagePackage: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      validationScope: this.validationScope,
      result: this.result,
      validatedBy: this.validatedBy,
      languagePackage: this.languagePackage,
    };
  }
}

export class ValidationFailed extends DomainEvent {
  readonly eventType = 'ValidationFailed';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly validationScope: ValidationScope,
    public readonly failures: ValidationFailure[],
    public readonly validatedBy: string,
    public readonly languagePackage: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      validationScope: this.validationScope,
      failures: this.failures,
      validatedBy: this.validatedBy,
      languagePackage: this.languagePackage,
    };
  }
}

export class ValidationPatternDetected extends DomainEvent {
  readonly eventType = 'ValidationPatternDetected';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly pattern: ValidationPattern,
    public readonly confidence: number,
    public readonly detectedBy: string,
    public readonly suggestions: ValidationSuggestion[]
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      pattern: this.pattern,
      confidence: this.confidence,
      detectedBy: this.detectedBy,
      suggestions: this.suggestions,
    };
  }
}

export class CustomRuleApplied extends DomainEvent {
  readonly eventType = 'CustomRuleApplied';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly ruleName: string,
    public readonly ruleVersion: string,
    public readonly applicationResult: RuleApplicationResult,
    public readonly appliedBy: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      ruleName: this.ruleName,
      ruleVersion: this.ruleVersion,
      applicationResult: this.applicationResult,
      appliedBy: this.appliedBy,
    };
  }
}

export class SemanticAnalysisCompleted extends DomainEvent {
  readonly eventType = 'SemanticAnalysisCompleted';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly analysisType: SemanticAnalysisType,
    public readonly findings: SemanticFinding[],
    public readonly analyzedBy: string,
    public readonly languagePackage: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      analysisType: this.analysisType,
      findings: this.findings,
      analyzedBy: this.analyzedBy,
      languagePackage: this.languagePackage,
    };
  }
}

export class LogicalConsistencyChecked extends DomainEvent {
  readonly eventType = 'LogicalConsistencyChecked';

  constructor(
    public readonly documentId: DocumentId,
    public readonly checkedTrees: TreeId[],
    public readonly consistencyResult: ConsistencyResult,
    public readonly checkedBy: string
  ) {
    super(documentId.getValue(), 'Document');
  }

  get eventData(): Record<string, unknown> {
    return {
      documentId: this.documentId.getValue(),
      checkedTrees: this.checkedTrees.map(id => id.getValue()),
      consistencyResult: this.consistencyResult,
      checkedBy: this.checkedBy,
    };
  }
}

export class ValidationCacheInvalidated extends DomainEvent {
  readonly eventType = 'ValidationCacheInvalidated';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly invalidationReason: CacheInvalidationReason,
    public readonly affectedScopes: ValidationScope[],
    public readonly triggeredBy: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      invalidationReason: this.invalidationReason,
      affectedScopes: this.affectedScopes,
      triggeredBy: this.triggeredBy,
    };
  }
}

export interface ValidationScope {
  type: 'statement' | 'atomic_argument' | 'tree' | 'document' | 'flow_path';
  targetId: string;
  includeConnected?: boolean;
  depth?: number;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
  metrics: ValidationMetrics;
  duration: number;
}

export interface ValidationFailure {
  type: ValidationFailureType;
  message: string;
  location: ValidationLocation;
  severity: 'error' | 'warning' | 'info';
  suggestedFix?: string;
}

export interface ValidationPattern {
  patternId: string;
  name: string;
  description: string;
  context: ValidationScope;
  indicators: PatternIndicator[];
}

export interface ValidationSuggestion {
  type: 'fix' | 'improvement' | 'alternative' | 'clarification';
  message: string;
  actionable: boolean;
  autoApplicable: boolean;
  priority: number;
}

export interface RuleApplicationResult {
  success: boolean;
  modifications: RuleModification[];
  warnings: string[];
  performanceMetrics: {
    executionTime: number;
    memoryUsed: number;
    rulesEvaluated: number;
  };
}

export interface SemanticFinding {
  type: SemanticFindingType;
  confidence: number;
  description: string;
  location: ValidationLocation;
  relatedFindings: string[];
}

export interface ConsistencyResult {
  isConsistent: boolean;
  conflicts: LogicalConflict[];
  redundancies: LogicalRedundancy[];
  gaps: LogicalGap[];
  overallScore: number;
}

export interface ValidationIssue {
  id: string;
  type: ValidationIssueType;
  message: string;
  location: ValidationLocation;
  severity: 'error' | 'warning' | 'info';
  context?: Record<string, unknown>;
}

export interface ValidationLocation {
  type: 'statement' | 'argument' | 'node' | 'tree' | 'flow';
  id: string;
  position?: number;
  range?: { start: number; end: number };
}

export interface ValidationMetrics {
  statementsValidated: number;
  argumentsValidated: number;
  flowPathsValidated: number;
  rulesApplied: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface PatternIndicator {
  type: 'structural' | 'semantic' | 'statistical';
  description: string;
  strength: number;
}

export interface RuleModification {
  type: 'statement_added' | 'statement_modified' | 'argument_modified' | 'structure_changed';
  target: string;
  previousValue?: unknown;
  newValue: unknown;
}

export interface LogicalConflict {
  type: 'contradiction' | 'circular_dependency' | 'incompatible_assumptions';
  involvedElements: string[];
  description: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface LogicalRedundancy {
  type: 'duplicate_statement' | 'redundant_argument' | 'unnecessary_step';
  redundantElements: string[];
  description: string;
  removalSafe: boolean;
}

export interface LogicalGap {
  type: 'missing_premise' | 'invalid_inference' | 'incomplete_argument';
  location: ValidationLocation;
  description: string;
  suggestions: string[];
}

export type ValidationFailureType =
  | 'syntax_error'
  | 'semantic_error'
  | 'logical_error'
  | 'rule_violation'
  | 'constraint_violation';

export type SemanticAnalysisType =
  | 'logical_structure'
  | 'semantic_roles'
  | 'domain_concepts'
  | 'argument_patterns'
  | 'statement_relationships';

export type SemanticFindingType =
  | 'concept_identification'
  | 'relationship_discovery'
  | 'pattern_match'
  | 'anomaly_detection'
  | 'similarity_assessment';

export type ValidationIssueType =
  | 'logical_gap'
  | 'invalid_inference'
  | 'circular_reference'
  | 'missing_premise'
  | 'malformed_statement'
  | 'inconsistent_usage';

export type CacheInvalidationReason =
  | 'statement_modified'
  | 'argument_modified'
  | 'structure_changed'
  | 'rule_updated'
  | 'language_package_changed'
  | 'manual_invalidation';
