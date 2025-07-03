import { describe, expect, it } from 'vitest';

import { type DocumentId, type TreeId } from '../../shared/value-objects.js';
import {
  type ConsistencyResult,
  CustomRuleApplied,
  LogicalConsistencyChecked,
  type RuleApplicationResult,
  SemanticAnalysisCompleted,
  type SemanticFinding,
  ValidationCacheInvalidated,
  ValidationCompleted,
  ValidationFailed,
  type ValidationFailure,
  type ValidationPattern,
  ValidationPatternDetected,
  type ValidationResult,
  type ValidationScope,
  type ValidationSuggestion,
} from '../validation-events.js';

const mockDocumentId = { getValue: () => 'doc-123' } as DocumentId;

describe('ValidationCompleted', () => {
  const mockValidationScope: ValidationScope = {
    type: 'document',
    targetId: 'doc-123',
    includeConnected: true,
    depth: 5,
  };

  const mockValidationResult: ValidationResult = {
    isValid: true,
    score: 0.85,
    issues: [],
    suggestions: [
      {
        type: 'improvement',
        message: 'Consider adding more detailed premises',
        actionable: true,
        autoApplicable: false,
        priority: 3,
      },
    ],
    metrics: {
      statementsValidated: 25,
      argumentsValidated: 8,
      flowPathsValidated: 3,
      rulesApplied: 12,
      cacheHits: 15,
      cacheMisses: 5,
    },
    duration: 1250,
  };

  it('should create event with correct properties', () => {
    const event = new ValidationCompleted(
      'validation-agg-123',
      'Document',
      mockValidationScope,
      mockValidationResult,
      'validation-engine',
      'logical-reasoning-v2'
    );

    expect(event.eventType).toBe('ValidationCompleted');
    expect(event.aggregateId).toBe('validation-agg-123');
    expect(event.aggregateType).toBe('Document');
    expect(event.validationScope).toBe(mockValidationScope);
    expect(event.result).toBe(mockValidationResult);
    expect(event.validatedBy).toBe('validation-engine');
    expect(event.languagePackage).toBe('logical-reasoning-v2');
  });

  it('should serialize event data correctly', () => {
    const event = new ValidationCompleted(
      'validation-agg-456',
      'Tree',
      mockValidationScope,
      mockValidationResult,
      'validator-service',
      'mathematics-logic-v1'
    );

    const data = event.eventData;

    expect(data).toEqual({
      validationScope: mockValidationScope,
      result: mockValidationResult,
      validatedBy: 'validator-service',
      languagePackage: 'mathematics-logic-v1',
    });
  });

  it('should handle different validation scopes', () => {
    const scopes = ['statement', 'atomic_argument', 'tree', 'document', 'flow_path'];

    scopes.forEach(scopeType => {
      const scope = { ...mockValidationScope, type: scopeType as any };
      const event = new ValidationCompleted(
        'validation-agg-123',
        'Document',
        scope,
        mockValidationResult,
        'validator',
        'package-v1'
      );

      expect(event.validationScope.type).toBe(scopeType);
    });
  });

  it('should create valid event record', () => {
    const event = new ValidationCompleted(
      'validation-agg-123',
      'Document',
      mockValidationScope,
      mockValidationResult,
      'validation-engine',
      'logical-reasoning-v2'
    );

    const record = event.toEventRecord();

    expect(record.eventType).toBe('ValidationCompleted');
    expect(record.aggregateId).toBe('validation-agg-123');
    expect(record.aggregateType).toBe('Document');
    expect(record.eventVersion).toBe(1);
    expect(record.eventData).toEqual(event.eventData);
    expect(record.metadata).toEqual({});
  });
});

describe('ValidationFailed', () => {
  const mockValidationScope: ValidationScope = {
    type: 'atomic_argument',
    targetId: 'arg-456',
    includeConnected: false,
  };

  const mockValidationFailures: ValidationFailure[] = [
    {
      type: 'logical_error',
      message: 'Invalid inference from premises to conclusion',
      location: {
        type: 'argument',
        id: 'arg-456',
        position: 2,
      },
      severity: 'error',
      suggestedFix: 'Add intermediate reasoning step',
    },
    {
      type: 'syntax_error',
      message: 'Malformed logical statement',
      location: {
        type: 'statement',
        id: 'stmt-789',
        range: { start: 10, end: 25 },
      },
      severity: 'error',
    },
  ];

  it('should create event with correct properties', () => {
    const event = new ValidationFailed(
      'validation-agg-123',
      'AtomicArgument',
      mockValidationScope,
      mockValidationFailures,
      'validation-engine',
      'formal-logic-v1'
    );

    expect(event.eventType).toBe('ValidationFailed');
    expect(event.aggregateId).toBe('validation-agg-123');
    expect(event.aggregateType).toBe('AtomicArgument');
    expect(event.validationScope).toBe(mockValidationScope);
    expect(event.failures).toBe(mockValidationFailures);
    expect(event.validatedBy).toBe('validation-engine');
    expect(event.languagePackage).toBe('formal-logic-v1');
  });

  it('should serialize event data correctly', () => {
    const event = new ValidationFailed(
      'validation-agg-456',
      'Statement',
      mockValidationScope,
      mockValidationFailures,
      'syntax-validator',
      'natural-language-v2'
    );

    const data = event.eventData;

    expect(data).toEqual({
      validationScope: mockValidationScope,
      failures: mockValidationFailures,
      validatedBy: 'syntax-validator',
      languagePackage: 'natural-language-v2',
    });
  });

  it('should handle different failure types', () => {
    const failureTypes = [
      'syntax_error',
      'semantic_error',
      'logical_error',
      'rule_violation',
      'constraint_violation',
    ];

    failureTypes.forEach(type => {
      const failure: ValidationFailure = {
        ...mockValidationFailures[0],
        type: type as any,
        message: 'Test failure message',
        location: mockValidationFailures[0]!.location,
        severity: mockValidationFailures[0]!.severity,
        ...(mockValidationFailures[0]!.suggestedFix !== undefined && {
          suggestedFix: mockValidationFailures[0]!.suggestedFix,
        }),
      };
      const event = new ValidationFailed(
        'validation-agg-123',
        'Statement',
        mockValidationScope,
        [failure],
        'validator',
        'package-v1'
      );

      expect(event.failures[0]?.type).toBe(type);
    });
  });
});

describe('ValidationPatternDetected', () => {
  const mockValidationPattern: ValidationPattern = {
    patternId: 'modus-ponens-123',
    name: 'Modus Ponens',
    description: 'Classical logical inference pattern',
    context: {
      type: 'tree',
      targetId: 'tree-456',
      includeConnected: true,
      depth: 3,
    },
    indicators: [
      {
        type: 'structural',
        description: 'If-then premise followed by affirmation',
        strength: 0.9,
      },
      {
        type: 'semantic',
        description: 'Logical implication pattern detected',
        strength: 0.85,
      },
    ],
  };

  const mockSuggestions: ValidationSuggestion[] = [
    {
      type: 'improvement',
      message: 'Pattern could be made more explicit',
      actionable: true,
      autoApplicable: true,
      priority: 2,
    },
  ];

  it('should create event with correct properties', () => {
    const event = new ValidationPatternDetected(
      'pattern-agg-123',
      'Tree',
      mockValidationPattern,
      0.92,
      'pattern-recognizer',
      mockSuggestions
    );

    expect(event.eventType).toBe('ValidationPatternDetected');
    expect(event.aggregateId).toBe('pattern-agg-123');
    expect(event.aggregateType).toBe('Tree');
    expect(event.pattern).toBe(mockValidationPattern);
    expect(event.confidence).toBe(0.92);
    expect(event.detectedBy).toBe('pattern-recognizer');
    expect(event.suggestions).toBe(mockSuggestions);
  });

  it('should serialize event data correctly', () => {
    const event = new ValidationPatternDetected(
      'pattern-agg-456',
      'Document',
      mockValidationPattern,
      0.78,
      'ml-pattern-detector',
      mockSuggestions
    );

    const data = event.eventData;

    expect(data).toEqual({
      pattern: mockValidationPattern,
      confidence: 0.78,
      detectedBy: 'ml-pattern-detector',
      suggestions: mockSuggestions,
    });
  });

  it('should handle high and low confidence values', () => {
    const confidenceValues = [0.1, 0.5, 0.95, 1.0];

    confidenceValues.forEach(confidence => {
      const event = new ValidationPatternDetected(
        'pattern-agg-123',
        'Tree',
        mockValidationPattern,
        confidence,
        'detector',
        []
      );

      expect(event.confidence).toBe(confidence);
    });
  });
});

describe('CustomRuleApplied', () => {
  const mockApplicationResult: RuleApplicationResult = {
    isValid: true,
    modifications: [
      {
        type: 'statement_modified',
        target: 'stmt-123',
        previousValue: 'All men are mortal',
        newValue: 'All humans are mortal',
      },
      {
        type: 'argument_modified',
        target: 'arg-456',
        newValue: { sideLabels: { left: 'Syllogism' } },
      },
    ],
    warnings: ['Original formatting was preserved'],
    performanceMetrics: {
      executionTime: 150,
      memoryUsed: 2048,
      rulesEvaluated: 5,
    },
  };

  it('should create event with correct properties', () => {
    const event = new CustomRuleApplied(
      'rule-agg-123',
      'Document',
      'inclusive-language-rule',
      '2.1.0',
      mockApplicationResult,
      'rule-engine'
    );

    expect(event.eventType).toBe('CustomRuleApplied');
    expect(event.aggregateId).toBe('rule-agg-123');
    expect(event.aggregateType).toBe('Document');
    expect(event.ruleName).toBe('inclusive-language-rule');
    expect(event.ruleVersion).toBe('2.1.0');
    expect(event.applicationResult).toBe(mockApplicationResult);
    expect(event.appliedBy).toBe('rule-engine');
  });

  it('should serialize event data correctly', () => {
    const event = new CustomRuleApplied(
      'rule-agg-456',
      'Tree',
      'consistency-checker',
      '1.0.5',
      mockApplicationResult,
      'custom-rule-processor'
    );

    const data = event.eventData;

    expect(data).toEqual({
      ruleName: 'consistency-checker',
      ruleVersion: '1.0.5',
      applicationResult: mockApplicationResult,
      appliedBy: 'custom-rule-processor',
    });
  });

  it('should handle failed rule application', () => {
    const failedResult = {
      ...mockApplicationResult,
      isValid: false,
      modifications: [],
      warnings: ['Rule failed to execute', 'Syntax error in rule definition'],
    };

    const event = new CustomRuleApplied(
      'rule-agg-123',
      'Document',
      'broken-rule',
      '0.1.0',
      failedResult,
      'rule-engine'
    );

    expect(event.applicationResult.isValid).toBe(false);
    expect(event.applicationResult.modifications).toEqual([]);
  });
});

describe('SemanticAnalysisCompleted', () => {
  const mockSemanticFindings: SemanticFinding[] = [
    {
      type: 'concept_identification',
      confidence: 0.88,
      description: 'Mathematical concept: Prime numbers',
      location: {
        type: 'statement',
        id: 'stmt-123',
        position: 15,
      },
      relatedFindings: ['finding-456', 'finding-789'],
    },
    {
      type: 'relationship_discovery',
      confidence: 0.72,
      description: 'Causal relationship between concepts',
      location: {
        type: 'argument',
        id: 'arg-456',
      },
      relatedFindings: [],
    },
  ];

  it('should create event with correct properties', () => {
    const event = new SemanticAnalysisCompleted(
      'semantic-agg-123',
      'Document',
      'logical_structure',
      mockSemanticFindings,
      'semantic-analyzer',
      'nlp-logic-v3'
    );

    expect(event.eventType).toBe('SemanticAnalysisCompleted');
    expect(event.aggregateId).toBe('semantic-agg-123');
    expect(event.aggregateType).toBe('Document');
    expect(event.analysisType).toBe('logical_structure');
    expect(event.findings).toBe(mockSemanticFindings);
    expect(event.analyzedBy).toBe('semantic-analyzer');
    expect(event.languagePackage).toBe('nlp-logic-v3');
  });

  it('should serialize event data correctly', () => {
    const event = new SemanticAnalysisCompleted(
      'semantic-agg-456',
      'Tree',
      'domain_concepts',
      mockSemanticFindings,
      'domain-analyzer',
      'domain-specific-v1'
    );

    const data = event.eventData;

    expect(data).toEqual({
      analysisType: 'domain_concepts',
      findings: mockSemanticFindings,
      analyzedBy: 'domain-analyzer',
      languagePackage: 'domain-specific-v1',
    });
  });

  it('should handle different analysis types', () => {
    const analysisTypes = [
      'logical_structure',
      'semantic_roles',
      'domain_concepts',
      'argument_patterns',
      'statement_relationships',
    ];

    analysisTypes.forEach(type => {
      const event = new SemanticAnalysisCompleted(
        'semantic-agg-123',
        'Document',
        type as any,
        [],
        'analyzer',
        'package-v1'
      );

      expect(event.analysisType).toBe(type);
    });
  });
});

describe('LogicalConsistencyChecked', () => {
  const mockCheckedTrees = [
    { getValue: () => 'tree-1' } as TreeId,
    { getValue: () => 'tree-2' } as TreeId,
    { getValue: () => 'tree-3' } as TreeId,
  ];

  const mockConsistencyResult: ConsistencyResult = {
    isConsistent: false,
    conflicts: [
      {
        type: 'contradiction',
        involvedElements: ['stmt-123', 'stmt-456'],
        description: 'Contradictory statements detected',
        severity: 'major',
      },
    ],
    redundancies: [
      {
        type: 'duplicate_statement',
        redundantElements: ['stmt-789', 'stmt-101'],
        description: 'Identical statements found',
        removalSafe: true,
      },
    ],
    gaps: [
      {
        type: 'missing_premise',
        location: {
          type: 'argument',
          id: 'arg-123',
        },
        description: 'Premise required to support conclusion',
        suggestions: ['Add supporting evidence', 'Refine argument structure'],
      },
    ],
    overallScore: 0.72,
  };

  it('should create event with correct properties', () => {
    const event = new LogicalConsistencyChecked(
      mockDocumentId,
      mockCheckedTrees,
      mockConsistencyResult,
      'consistency-checker'
    );

    expect(event.eventType).toBe('LogicalConsistencyChecked');
    expect(event.aggregateId).toBe('doc-123');
    expect(event.aggregateType).toBe('Document');
    expect(event.documentId).toBe(mockDocumentId);
    expect(event.checkedTrees).toBe(mockCheckedTrees);
    expect(event.consistencyResult).toBe(mockConsistencyResult);
    expect(event.checkedBy).toBe('consistency-checker');
  });

  it('should serialize event data correctly', () => {
    const event = new LogicalConsistencyChecked(
      mockDocumentId,
      mockCheckedTrees,
      mockConsistencyResult,
      'logic-validator'
    );

    const data = event.eventData;

    expect(data).toEqual({
      documentId: 'doc-123',
      checkedTrees: ['tree-1', 'tree-2', 'tree-3'],
      consistencyResult: mockConsistencyResult,
      checkedBy: 'logic-validator',
    });
  });

  it('should handle consistent results', () => {
    const consistentResult = {
      ...mockConsistencyResult,
      isConsistent: true,
      conflicts: [],
      redundancies: [],
      gaps: [],
      overallScore: 0.95,
    };

    const event = new LogicalConsistencyChecked(
      mockDocumentId,
      mockCheckedTrees,
      consistentResult,
      'consistency-checker'
    );

    expect(event.consistencyResult.isConsistent).toBe(true);
    expect(event.consistencyResult.conflicts).toEqual([]);
  });
});

describe('ValidationCacheInvalidated', () => {
  const mockAffectedScopes: ValidationScope[] = [
    {
      type: 'statement',
      targetId: 'stmt-123',
    },
    {
      type: 'tree',
      targetId: 'tree-456',
      includeConnected: true,
      depth: 2,
    },
  ];

  it('should create event with correct properties', () => {
    const event = new ValidationCacheInvalidated(
      'cache-agg-123',
      'ValidationCache',
      'statement_modified',
      mockAffectedScopes,
      'cache-manager'
    );

    expect(event.eventType).toBe('ValidationCacheInvalidated');
    expect(event.aggregateId).toBe('cache-agg-123');
    expect(event.aggregateType).toBe('ValidationCache');
    expect(event.invalidationReason).toBe('statement_modified');
    expect(event.affectedScopes).toBe(mockAffectedScopes);
    expect(event.triggeredBy).toBe('cache-manager');
  });

  it('should serialize event data correctly', () => {
    const event = new ValidationCacheInvalidated(
      'cache-agg-456',
      'Document',
      'language_package_changed',
      mockAffectedScopes,
      'package-updater'
    );

    const data = event.eventData;

    expect(data).toEqual({
      invalidationReason: 'language_package_changed',
      affectedScopes: mockAffectedScopes,
      triggeredBy: 'package-updater',
    });
  });

  it('should handle different invalidation reasons', () => {
    const reasons = [
      'statement_modified',
      'argument_modified',
      'structure_changed',
      'rule_updated',
      'language_package_changed',
      'manual_invalidation',
    ];

    reasons.forEach(reason => {
      const event = new ValidationCacheInvalidated(
        'cache-agg-123',
        'ValidationCache',
        reason as any,
        [],
        'invalidator'
      );

      expect(event.invalidationReason).toBe(reason);
    });
  });

  it('should handle empty affected scopes', () => {
    const event = new ValidationCacheInvalidated(
      'cache-agg-123',
      'ValidationCache',
      'manual_invalidation',
      [],
      'admin'
    );

    expect(event.affectedScopes).toEqual([]);
    expect(event.eventData['affectedScopes']).toEqual([]);
  });
});
