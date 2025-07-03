/**
 * Tests for PatternRecognitionService
 *
 * Tests the actual public methods that exist in the service:
 * - recognizeProofPatterns
 * - recognizeArgumentStructure
 * - analyzeArgumentStructure
 * - detectCommonMistakes
 * - recognizePatterns
 * - detectLogicalStructure
 * - suggestPatternCompletion
 * - extractPatternFeatures
 * - findSimilarPatterns
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SourceLocation } from '../../../../../domain/shared/index.js';
import { Diagnostic } from '../../entities/Diagnostic';
import { type InferenceRule } from '../../entities/InferenceRule';
import { type LanguagePackage } from '../../entities/LanguagePackage';
import { type ValidationResult } from '../../entities/ValidationResult';
import { PatternRecognitionService } from '../../services/PatternRecognitionService';
import { DiagnosticSeverity } from '../../value-objects/DiagnosticSeverity';
// Mock factories
const createMockLanguagePackage = (
  options: {
    supportsFirstOrderLogic?: boolean;
    supportsModalLogic?: boolean;
    supportsPropositionalLogic?: boolean;
    rules?: InferenceRule[];
  } = {}
): LanguagePackage => {
  return {
    getId: vi.fn(() => ({ getValue: () => 'lang-package-1' })),
    getName: vi.fn(() => ({ getValue: () => 'Test Package' })),
    getVersion: vi.fn(() => ({ toString: () => '1.0.0' })),
    getDescription: vi.fn(() => ({ getValue: () => 'Test description' })),
    getRules: vi.fn(() => options.rules ?? []),
    getValidationRules: vi.fn(() => []),
    supportsFirstOrderLogic: vi.fn(() => options.supportsFirstOrderLogic ?? true),
    supportsModalLogic: vi.fn(() => options.supportsModalLogic ?? false),
    supportsPropositionalLogic: vi.fn(() => options.supportsPropositionalLogic ?? true),
    getSupportedConnectives: vi.fn(() => ['∧', '∨', '→', '¬', '↔']),
    getSupportedQuantifiers: vi.fn(() => ['∀', '∃']),
    getSupportedModalOperators: vi.fn(() => ['□', '◇']),
    isActive: vi.fn(() => true),
    getInferenceRules: vi.fn(() => options.rules ?? []),
  } as unknown as LanguagePackage;
};

const createMockValidationResult = (diagnostics: Diagnostic[] = []): ValidationResult => {
  return {
    getId: vi.fn(() => ({ getValue: () => 'validation-1' })),
    getDiagnostics: vi.fn(() => diagnostics),
    getErrorCount: vi.fn(
      () => diagnostics.filter(d => d.getSeverity().getSeverity() === 'error').length
    ),
    getWarningCount: vi.fn(
      () => diagnostics.filter(d => d.getSeverity().getSeverity() === 'warning').length
    ),
    hasErrors: vi.fn(() => diagnostics.some(d => d.getSeverity().getSeverity() === 'error')),
    hasWarnings: vi.fn(() => diagnostics.some(d => d.getSeverity().getSeverity() === 'warning')),
  } as unknown as ValidationResult;
};

const createMockDiagnostic = (
  severity: 'error' | 'warning' | 'info' = 'error',
  code = 'test-code',
  message = 'Test diagnostic message'
): Diagnostic => {
  const range = SourceLocation.create(1, 1, 1, 10);
  if (range.isErr()) throw new Error('Failed to create range');

  const diagnosticSeverity =
    severity === 'error'
      ? DiagnosticSeverity.error()
      : severity === 'warning'
        ? DiagnosticSeverity.warning()
        : DiagnosticSeverity.info();

  const result = Diagnostic.create(
    diagnosticSeverity,
    message,
    code,
    range.value,
    'test-source',
    [],
    []
  );

  if (result.isErr()) throw new Error('Failed to create diagnostic');

  const diagnostic = result.value;

  // Add methods that might be called by the service
  vi.spyOn(diagnostic, 'isSemanticRelated').mockReturnValue(code.includes('semantic'));
  vi.spyOn(diagnostic, 'isSyntaxRelated').mockReturnValue(code.includes('syntax'));
  vi.spyOn(diagnostic, 'isStyleRelated').mockReturnValue(code.includes('style'));

  return diagnostic;
};

describe('PatternRecognitionService', () => {
  let service: PatternRecognitionService;
  let mockLanguagePackage: LanguagePackage;

  beforeEach(() => {
    service = new PatternRecognitionService();
    mockLanguagePackage = createMockLanguagePackage();
  });

  describe('recognizeProofPatterns', () => {
    it('should recognize patterns in proof with statements and connections', () => {
      const statements = ['P', 'P → Q', 'Q'];
      const connections = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
      ];

      const result = service.recognizeProofPatterns(statements, connections, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.recognizedPatterns).toBeDefined();
        expect(analysis.structuralFeatures).toBeDefined();
        expect(analysis.logicalFeatures).toBeDefined();
        expect(analysis.patternInsights).toBeDefined();
        expect(analysis.confidence).toBeGreaterThanOrEqual(0);
        expect(analysis.performance).toBeDefined();
      }
    });

    it('should handle empty statements and connections', () => {
      const result = service.recognizeProofPatterns([], [], mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.recognizedPatterns).toEqual([]);
        expect(result.value.confidence).toBe(0);
      }
    });

    it('should recognize modus ponens pattern', () => {
      const statements = ['A', 'A → B', 'B'];
      const connections = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
      ];

      const result = service.recognizeProofPatterns(statements, connections, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const patterns = result.value.recognizedPatterns;
        expect(patterns.some(p => p.name === 'modus-ponens')).toBe(true);
      }
    });

    it('should filter patterns by confidence threshold', () => {
      const statements = ['P', 'Q', 'R'];
      const connections = [{ from: 0, to: 2 }];

      const result = service.recognizeProofPatterns(statements, connections, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const patterns = result.value.recognizedPatterns;
        patterns.forEach(pattern => {
          expect(pattern.confidence).toBeGreaterThanOrEqual(0.7);
        });
      }
    });
  });

  describe('recognizeArgumentStructure', () => {
    it('should analyze basic argument structure', () => {
      const premises = ['P', 'P → Q'];
      const conclusions = ['Q'];

      const result = service.recognizeArgumentStructure(premises, conclusions, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.argumentType).toBeDefined();
        expect(analysis.inferenceRules).toBeDefined();
        expect(analysis.complexity).toBeDefined();
        expect(typeof analysis.validity).toBe('boolean');
        expect(typeof analysis.soundness).toBe('boolean');
        expect(analysis.logicalFeatures).toBeDefined();
        expect(analysis.suggestions).toBeDefined();
      }
    });

    it('should handle empty premises', () => {
      const result = service.recognizeArgumentStructure([], ['Q'], mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.argumentType).toBeDefined();
        expect(result.value.validity).toBe(false);
      }
    });

    it('should calculate argument complexity', () => {
      const premises = ['P ∧ Q', '(P ∧ Q) → R', 'R → S'];
      const conclusions = ['S'];

      const result = service.recognizeArgumentStructure(premises, conclusions, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { complexity } = result.value;
        expect(complexity.score).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(complexity.level);
        expect(complexity.factors).toBeDefined();
      }
    });
  });

  describe('analyzeArgumentStructure', () => {
    it('should analyze detailed argument structure', () => {
      const premises = ['P', 'P → Q'];
      const conclusion = 'Q';

      const result = service.analyzeArgumentStructure(premises, conclusion, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.argumentType).toBe('deductive');
        expect(typeof analysis.isValid).toBe('boolean');
        expect(Array.isArray(analysis.logicalForm)).toBe(true);
        expect(Array.isArray(analysis.dependencies)).toBe(true);
        expect(Array.isArray(analysis.assumptions)).toBe(true);
        expect(typeof analysis.strength).toBe('number');
        expect(typeof analysis.hasCircularDependencies).toBe('boolean');
      }
    });

    it('should identify modus ponens pattern', () => {
      const premises = ['A', 'A → B'];
      const conclusion = 'B';

      const result = service.analyzeArgumentStructure(premises, conclusion, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.logicalForm).toContain('modus ponens');
      }
    });

    it('should handle empty premises with zero strength', () => {
      const result = service.analyzeArgumentStructure([], 'Q', mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.strength).toBe(0);
      }
    });

    it('should detect dependencies between premises and conclusion', () => {
      const premises = ['P', 'P → Q', 'R'];
      const conclusion = 'Q';

      const result = service.analyzeArgumentStructure(premises, conclusion, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.dependencies.length).toBeGreaterThan(0);
      }
    });
  });

  describe('detectCommonMistakes', () => {
    it('should analyze validation results for common mistakes', () => {
      const diagnostics = [
        createMockDiagnostic('error', 'semantic-error', 'Invalid inference'),
        createMockDiagnostic('warning', 'style-warning', 'Style issue'),
      ];
      const validationResults = [createMockValidationResult(diagnostics)];

      const result = service.detectCommonMistakes(validationResults, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(Array.isArray(analysis.commonMistakes)).toBe(true);
        expect(typeof analysis.errorFrequency).toBe('object');
        expect(typeof analysis.severityDistribution).toBe('object');
        expect(Array.isArray(analysis.improvementAreas)).toBe(true);
        expect(Array.isArray(analysis.learningRecommendations)).toBe(true);
      }
    });

    it('should detect missing premises from semantic errors', () => {
      const semanticDiagnostic = createMockDiagnostic('error', 'semantic-error', 'Missing premise');
      const validationResults = [createMockValidationResult([semanticDiagnostic])];

      const result = service.detectCommonMistakes(validationResults, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const mistakes = result.value.commonMistakes;
        expect(mistakes.some(m => m.type === 'missing-premise')).toBe(true);
      }
    });

    it('should detect modal logic errors when supported', () => {
      const modalPackage = createMockLanguagePackage({ supportsModalLogic: true });
      const modalDiagnostic = createMockDiagnostic(
        'error',
        'modal-error',
        'Invalid modal operator'
      );
      const validationResults = [createMockValidationResult([modalDiagnostic])];

      const result = service.detectCommonMistakes(validationResults, modalPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const mistakes = result.value.commonMistakes;
        expect(mistakes.some(m => m.type === 'modal-logic-error')).toBe(true);
      }
    });

    it('should provide learning recommendations based on mistake types', () => {
      const inferenceError = createMockDiagnostic('error', 'inference-error', 'Invalid inference');
      const validationResults = [createMockValidationResult([inferenceError])];

      const result = service.detectCommonMistakes(validationResults, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.learningRecommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('recognizePatterns', () => {
    it('should recognize patterns in statement list', () => {
      const statements = ['P', 'P → Q', 'Q'];

      const result = service.recognizePatterns(statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const patterns = result.value;
        expect(Array.isArray(patterns.logicalPatterns)).toBe(true);
        expect(Array.isArray(patterns.structuralPatterns)).toBe(true);
        expect(Array.isArray(patterns.customPatterns)).toBe(true);
        expect(typeof patterns.overallComplexity).toBe('number');
      }
    });

    it('should detect modus ponens in logical patterns', () => {
      const statements = ['A', 'A → B', 'B'];

      const result = service.recognizePatterns(statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { logicalPatterns } = result.value;
        expect(logicalPatterns.some(p => p.name === 'modus-ponens')).toBe(true);
      }
    });

    it('should handle statements with no clear patterns', () => {
      const statements = ['A', 'B', 'C'];

      const result = service.recognizePatterns(statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.logicalPatterns.length).toBe(0);
      }
    });
  });

  describe('detectLogicalStructure', () => {
    it('should detect conjunction structure', () => {
      const statement = 'P ∧ Q';

      const result = service.detectLogicalStructure(statement, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const structure = result.value;
        expect(structure.mainOperator).toBe('∧');
        expect(structure.subformulas).toHaveLength(2);
        expect(structure.isAtomic).toBe(false);
        expect(structure.isCompound).toBe(true);
      }
    });

    it('should detect atomic formulas', () => {
      const statement = 'P';

      const result = service.detectLogicalStructure(statement, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const structure = result.value;
        expect(structure.mainOperator).toBeNull();
        expect(structure.subformulas).toEqual([]);
        expect(structure.isAtomic).toBe(true);
        expect(structure.isCompound).toBe(false);
      }
    });

    it('should detect nested structures', () => {
      const statement = '(P ∧ Q) → (R ∨ S)';

      const result = service.detectLogicalStructure(statement, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const structure = result.value;
        expect(structure.mainOperator).toBe('→');
        expect(structure.isNested).toBe(true);
        expect(structure.depth).toBeGreaterThan(1);
      }
    });

    it('should detect quantified formulas', () => {
      const statement = '∀x(P(x) → Q(x))';

      const result = service.detectLogicalStructure(statement, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const structure = result.value;
        expect(structure.hasQuantifiers).toBe(true);
        expect(structure.quantifiers).toContain('∀');
        expect(structure.variables).toContain('x');
      }
    });

    it('should detect modal formulas', () => {
      const statement = '□(P → Q)';

      const result = service.detectLogicalStructure(statement, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const structure = result.value;
        expect(structure.hasModalOperators).toBe(true);
        expect(structure.modalOperators).toContain('□');
      }
    });
  });

  describe('suggestPatternCompletion', () => {
    it('should suggest modus ponens completion', () => {
      const partialStatements = ['P', 'P → Q'];

      const result = service.suggestPatternCompletion(partialStatements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const suggestions = result.value;
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0]?.suggestedStatement).toBe('Q');
        expect(suggestions[0]?.patternType).toContain('modus');
      }
    });

    it('should suggest conjunction completion', () => {
      const partialStatements = ['P', 'Q'];

      const result = service.suggestPatternCompletion(partialStatements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const suggestions = result.value;
        expect(suggestions.some(s => s.suggestedStatement === 'P ∧ Q')).toBe(true);
      }
    });

    it('should handle statements with no clear completion pattern', () => {
      const partialStatements = ['A', 'B', 'C', 'D'];

      const result = service.suggestPatternCompletion(partialStatements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(0);
      }
    });

    it('should provide explanations for suggestions', () => {
      const partialStatements = ['P', 'P → Q'];

      const result = service.suggestPatternCompletion(partialStatements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const suggestions = result.value;
        if (suggestions.length > 0) {
          expect(suggestions[0]?.explanation).toBeDefined();
          expect(suggestions[0]?.explanation?.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('extractPatternFeatures', () => {
    it('should extract comprehensive pattern features', () => {
      const statements = ['P', 'P → Q', 'Q', 'A ∧ B'];

      const result = service.extractPatternFeatures(statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const features = result.value;
        expect(features.totalStatements).toBe(statements.length);
        expect(typeof features.uniquePatterns).toBe('number');
        expect(typeof features.patternDensity).toBe('number');
        expect(typeof features.complexityScore).toBe('number');
        expect(typeof features.patternDistribution).toBe('object');
        expect(typeof features.logicalOperatorFrequency).toBe('object');
        expect(Array.isArray(features.inferencePatterns)).toBe(true);
        expect(features.structuralMetrics).toBeDefined();
        expect(features.complexityDistribution).toBeDefined();
      }
    });

    it('should handle empty statements', () => {
      const result = service.extractPatternFeatures([], mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const features = result.value;
        expect(features.totalStatements).toBe(0);
        expect(features.uniquePatterns).toBe(0);
        expect(features.patternDensity).toBe(0);
      }
    });

    it('should calculate pattern distribution correctly', () => {
      const statements = ['P', 'P → Q', 'Q', 'A', 'A → B', 'B', 'X ∧ Y'];

      const result = service.extractPatternFeatures(statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const features = result.value;
        expect(Object.keys(features.patternDistribution).length).toBeGreaterThan(0);
        expect(features.patternDistribution['modus-ponens']).toBeGreaterThan(0);
      }
    });
  });

  describe('findSimilarPatterns', () => {
    it('should find similar modus ponens patterns', () => {
      const targetPattern = {
        type: 'modus-ponens',
        premises: ['P', 'P → Q'],
        conclusions: ['Q'],
        confidence: 0.95,
      };
      const statements = ['A is true', 'A is true → B is true', 'B is true'];

      const result = service.findSimilarPatterns(targetPattern, statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const similar = result.value;
        expect(similar.length).toBeGreaterThan(0);
        expect(similar[0]?.similarity).toBeGreaterThan(0.5);
      }
    });

    it('should find similar conjunction patterns', () => {
      const targetPattern = {
        type: 'conjunction',
        premises: ['P', 'Q'],
        conclusions: ['P ∧ Q'],
        confidence: 0.9,
      };
      const statements = ['A', 'B', 'A ∧ B'];

      const result = service.findSimilarPatterns(targetPattern, statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const similar = result.value;
        expect(similar.length).toBeGreaterThan(0);
        expect(similar[0]?.similarity).toBeGreaterThan(0.8);
      }
    });

    it('should handle patterns with no similar matches', () => {
      const targetPattern = {
        type: 'complex-modal',
        premises: ['□P', '◇Q'],
        conclusions: ['□(P ∧ Q)'],
        confidence: 0.8,
      };
      const statements = ['A', 'B', 'C'];

      const result = service.findSimilarPatterns(targetPattern, statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should rank similar patterns by similarity score', () => {
      const targetPattern = {
        type: 'conjunction',
        premises: ['P', 'Q'],
        conclusions: ['P ∧ Q'],
        confidence: 0.9,
      };
      const statements = ['A', 'B', 'A ∧ B', 'X', 'Y', 'X ∧ Y', 'M', 'N', 'M ∨ N'];

      const result = service.findSimilarPatterns(targetPattern, statements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const similar = result.value;
        if (similar.length > 1) {
          for (let i = 1; i < similar.length; i++) {
            expect(similar[i - 1]?.similarity).toBeGreaterThanOrEqual(similar[i]?.similarity ?? 0);
          }
        }
      }
    });
  });

  describe('error handling', () => {
    it('should handle malformed statements gracefully', () => {
      const malformedStatements = ['P ∧', '→ Q', '(((P'];

      const result = service.recognizePatterns(malformedStatements, mockLanguagePackage);

      expect(result.isOk()).toBe(true);
    });

    it('should handle invalid language package gracefully', () => {
      const invalidPackage = {} as LanguagePackage;
      const statements = ['P', 'Q'];

      const result = service.recognizePatterns(statements, invalidPackage);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('performance characteristics', () => {
    it('should handle large statement sets efficiently', () => {
      const largeStatementSet = Array.from({ length: 100 }, (_, i) => `P${i}`);

      const startTime = Date.now();
      const result = service.recognizePatterns(largeStatementSet, mockLanguagePackage);
      const endTime = Date.now();

      expect(result.isOk()).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
