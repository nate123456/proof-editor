/**
 * Tests for AnalysisReport entity
 *
 * Focuses on:
 * - Basic creation and validation
 * - Public method testing
 * - Error handling scenarios
 * - High coverage for core functionality
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  AnalysisInsight,
  type InsightCategory,
  PatternMatch,
  type PatternType,
  SourceLocation,
} from '../../../../../domain/shared/index.js';
import { AnalysisReport, AnalysisScope } from '../../entities/AnalysisReport';
import { AnalysisMetrics } from '../../value-objects/AnalysisMetrics';
import { PerformanceMetrics } from '../../value-objects/PerformanceMetrics';

// Mock factories for test data
const createMockInsight = (
  category: InsightCategory = 'syntax',
  highPriority = false,
): AnalysisInsight => {
  const result = AnalysisInsight.create(
    category,
    'Test insight title',
    'Test insight description',
    highPriority ? 'high' : 'medium',
    0.85,
    ['Evidence 1'],
    ['Recommendation 1'],
    ['pattern-1'],
  );
  if (result.isErr()) {
    throw new Error('Failed to create mock insight');
  }
  return result.value;
};

const createMockPatternMatch = (patternType: PatternType = 'structural'): PatternMatch => {
  const locationResult = SourceLocation.createSinglePosition(1, 1);
  if (locationResult.isErr()) {
    throw new Error('Failed to create mock location');
  }
  const result = PatternMatch.create(
    'pattern-id-1',
    patternType,
    'Test Pattern',
    locationResult.value,
    0.95,
    'matched text',
    new Map([['var1', 'value1']]),
  );
  if (result.isErr()) {
    throw new Error('Failed to create mock pattern match');
  }
  return result.value;
};

describe('AnalysisReport', () => {
  describe('create', () => {
    it('should create a new analysis report with valid inputs', () => {
      const result = AnalysisReport.create('doc-123', 'lang-package-456', AnalysisScope.Full);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const report = result.value;
        expect(report.getDocumentId()).toBe('doc-123');
        expect(report.getLanguagePackageId()).toBe('lang-package-456');
        expect(report.getAnalysisScope()).toBe(AnalysisScope.Full);
        expect(report.getInsights()).toEqual([]);
        expect(report.getPatternMatches()).toEqual([]);
        expect(report.getRecommendations()).toEqual([]);
      }
    });

    it('should fail with empty document ID', () => {
      const result = AnalysisReport.create('', 'lang-package-456', AnalysisScope.Full);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID is required');
      }
    });

    it('should fail with whitespace-only document ID', () => {
      const result = AnalysisReport.create('   ', 'lang-package-456', AnalysisScope.Full);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID is required');
      }
    });

    it('should fail with empty language package ID', () => {
      const result = AnalysisReport.create('doc-123', '', AnalysisScope.Full);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID is required');
      }
    });

    it('should fail with whitespace-only language package ID', () => {
      const result = AnalysisReport.create('doc-123', '   ', AnalysisScope.Full);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID is required');
      }
    });

    it('should create report with different analysis scopes', () => {
      const scopes = [
        AnalysisScope.Syntax,
        AnalysisScope.Semantics,
        AnalysisScope.Flow,
        AnalysisScope.Style,
        AnalysisScope.Performance,
        AnalysisScope.Educational,
        AnalysisScope.Full,
      ];

      scopes.forEach((scope) => {
        const result = AnalysisReport.create('doc-123', 'lang-456', scope);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getAnalysisScope()).toBe(scope);
        }
      });
    });
  });

  describe('createCompleted', () => {
    it('should create a completed analysis report with all data', () => {
      const metrics = AnalysisMetrics.empty();
      const insights = [createMockInsight()];
      const patternMatches = [createMockPatternMatch()];
      const performanceMetrics = PerformanceMetrics.empty();
      const recommendations = ['Fix issue 1', 'Improve performance'];

      const result = AnalysisReport.createCompleted(
        'doc-123',
        'lang-456',
        AnalysisScope.Full,
        metrics,
        insights,
        patternMatches,
        performanceMetrics,
        recommendations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const report = result.value;
        expect(report.getDocumentId()).toBe('doc-123');
        expect(report.getLanguagePackageId()).toBe('lang-456');
        expect(report.getInsights()).toEqual(insights);
        expect(report.getPatternMatches()).toEqual(patternMatches);
        expect(report.getRecommendations()).toEqual(recommendations);
      }
    });

    it('should create completed report without recommendations', () => {
      const result = AnalysisReport.createCompleted(
        'doc-123',
        'lang-456',
        AnalysisScope.Full,
        AnalysisMetrics.empty(),
        [],
        [],
        PerformanceMetrics.empty(),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getRecommendations()).toEqual([]);
      }
    });

    it('should fail with invalid document ID', () => {
      const result = AnalysisReport.createCompleted(
        '',
        'lang-456',
        AnalysisScope.Full,
        AnalysisMetrics.empty(),
        [],
        [],
        PerformanceMetrics.empty(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID is required');
      }
    });

    it('should fail with invalid language package ID', () => {
      const result = AnalysisReport.createCompleted(
        'doc-123',
        '',
        AnalysisScope.Full,
        AnalysisMetrics.empty(),
        [],
        [],
        PerformanceMetrics.empty(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID is required');
      }
    });
  });

  describe('insight management', () => {
    let report: AnalysisReport;

    beforeEach(() => {
      const result = AnalysisReport.create('doc-123', 'lang-456', AnalysisScope.Full);
      if (result.isOk()) {
        report = result.value;
      }
    });

    it('should add insights to the report', () => {
      const insight1 = createMockInsight('syntax');
      const insight2 = createMockInsight('semantics');

      report.addInsight(insight1);
      report.addInsight(insight2);

      const insights = report.getInsights();
      expect(insights).toHaveLength(2);
      expect(insights[0]).toBe(insight1);
      expect(insights[1]).toBe(insight2);
    });

    it('should get insights by category', () => {
      const insight1 = createMockInsight('syntax');
      const insight2 = createMockInsight('performance');
      const insight3 = createMockInsight('syntax');

      report.addInsight(insight1);
      report.addInsight(insight2);
      report.addInsight(insight3);

      const syntaxInsights = report.getInsightsByCategory('syntax' as InsightCategory);
      expect(syntaxInsights).toHaveLength(2);
      expect(syntaxInsights[0]).toBe(insight1);
      expect(syntaxInsights[1]).toBe(insight3);

      const performanceInsights = report.getInsightsByCategory('performance' as InsightCategory);
      expect(performanceInsights).toHaveLength(1);
      expect(performanceInsights[0]).toBe(insight2);
    });

    it('should detect high priority insights', () => {
      expect(report.hasHighPriorityInsights()).toBe(false);

      report.addInsight(createMockInsight('syntax', false));
      expect(report.hasHighPriorityInsights()).toBe(false);

      report.addInsight(createMockInsight('syntax', true));
      expect(report.hasHighPriorityInsights()).toBe(true);
    });
  });

  describe('pattern match management', () => {
    let report: AnalysisReport;

    beforeEach(() => {
      const result = AnalysisReport.create('doc-123', 'lang-456', AnalysisScope.Full);
      if (result.isOk()) {
        report = result.value;
      }
    });

    it('should add pattern matches to the report', () => {
      const pattern1 = createMockPatternMatch('structural');
      const pattern2 = createMockPatternMatch('inference');

      report.addPatternMatch(pattern1);
      report.addPatternMatch(pattern2);

      const patterns = report.getPatternMatches();
      expect(patterns).toHaveLength(2);
      expect(patterns[0]).toBe(pattern1);
      expect(patterns[1]).toBe(pattern2);
    });

    it('should get pattern matches by type', () => {
      const pattern1 = createMockPatternMatch('inference');
      const pattern2 = createMockPatternMatch('structural');
      const pattern3 = createMockPatternMatch('inference');

      report.addPatternMatch(pattern1);
      report.addPatternMatch(pattern2);
      report.addPatternMatch(pattern3);

      const fallacyPatterns = report.getPatternMatchesByType('inference' as PatternType);
      expect(fallacyPatterns).toHaveLength(2);
      expect(fallacyPatterns[0]).toBe(pattern1);
      expect(fallacyPatterns[1]).toBe(pattern3);

      const codeSmellPatterns = report.getPatternMatchesByType('structural' as PatternType);
      expect(codeSmellPatterns).toHaveLength(1);
      expect(codeSmellPatterns[0]).toBe(pattern2);
    });
  });

  describe('recommendation management', () => {
    let report: AnalysisReport;

    beforeEach(() => {
      const result = AnalysisReport.create('doc-123', 'lang-456', AnalysisScope.Full);
      if (result.isOk()) {
        report = result.value;
      }
    });

    it('should add recommendations to the report', () => {
      const result1 = report.addRecommendation('Fix issue 1');
      const result2 = report.addRecommendation('Improve performance');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      const recommendations = report.getRecommendations();
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0]).toBe('Fix issue 1');
      expect(recommendations[1]).toBe('Improve performance');
    });

    it('should trim recommendations before adding', () => {
      const result = report.addRecommendation('  Trimmed recommendation  ');

      expect(result.isOk()).toBe(true);
      const recommendations = report.getRecommendations();
      expect(recommendations[0]).toBe('Trimmed recommendation');
    });

    it('should reject empty recommendations', () => {
      const result = report.addRecommendation('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Recommendation cannot be empty');
      }
    });

    it('should reject whitespace-only recommendations', () => {
      const result = report.addRecommendation('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Recommendation cannot be empty');
      }
    });

    it('should reject duplicate recommendations', () => {
      const result1 = report.addRecommendation('Fix issue');
      const result2 = report.addRecommendation('Fix issue');

      expect(result1.isOk()).toBe(true);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.message).toBe('Recommendation already exists');
      }
    });

    it('should remove recommendations', () => {
      report.addRecommendation('Recommendation 1');
      report.addRecommendation('Recommendation 2');

      const result = report.removeRecommendation('Recommendation 1');

      expect(result.isOk()).toBe(true);
      const recommendations = report.getRecommendations();
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toBe('Recommendation 2');
    });

    it('should fail to remove non-existent recommendation', () => {
      const result = report.removeRecommendation('Non-existent');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Recommendation not found');
      }
    });
  });

  describe('analysis completion and performance', () => {
    it('should determine if analysis is complete', () => {
      const result = AnalysisReport.create('doc-123', 'lang-456', AnalysisScope.Full);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const report = result.value;
        expect(report.isAnalysisComplete()).toBe(false);

        // Add insight but no performance metrics
        report.addInsight(createMockInsight());
        expect(report.isAnalysisComplete()).toBe(false);

        // Create completed report with performance metrics
        const completedResult = AnalysisReport.createCompleted(
          'doc-123',
          'lang-456',
          AnalysisScope.Full,
          AnalysisMetrics.empty(),
          [createMockInsight()],
          [],
          (() => {
            const result = PerformanceMetrics.create(100, 50, 512, 1024);
            return result.isOk() ? result.value : PerformanceMetrics.empty();
          })(),
        );

        if (completedResult.isOk()) {
          expect(completedResult.value.isAnalysisComplete()).toBe(true);
        }
      }
    });

    it('should get complexity and quality scores from metrics', () => {
      const metricsResult = AnalysisMetrics.create(75, 85, 10, 2);
      if (metricsResult.isErr()) {
        throw new Error('Failed to create metrics');
      }
      const metrics = metricsResult.value;
      const result = AnalysisReport.createCompleted(
        'doc-123',
        'lang-456',
        AnalysisScope.Full,
        metrics,
        [],
        [],
        PerformanceMetrics.empty(),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getComplexityScore()).toBe(2);
        expect(result.value.getQualityScore()).toBe(15);
      }
    });

    it('should check if performance targets are met', () => {
      // Create performance metrics that meet targets (< 1000ms, < 1MB)
      const performanceMetricsResult = PerformanceMetrics.create(50, 25, 256, 512);
      if (performanceMetricsResult.isErr()) {
        throw new Error('Failed to create performance metrics');
      }
      const performanceMetrics = performanceMetricsResult.value;
      // Remove mock since meetsTargets no longer exists

      const result = AnalysisReport.createCompleted(
        'doc-123',
        'lang-456',
        AnalysisScope.Full,
        AnalysisMetrics.empty(),
        [],
        [],
        performanceMetrics,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.meetsPerformanceTargets()).toBe(true);
      }
    });
  });

  describe('generateSummary', () => {
    it('should generate complete summary of the report', () => {
      const metricsResult = AnalysisMetrics.create(70, 80, 5, 1);
      if (metricsResult.isErr()) {
        throw new Error('Failed to create metrics');
      }
      const metrics = metricsResult.value;
      const insights = [createMockInsight('syntax', true), createMockInsight('semantics', false)];
      const patternMatches = [createMockPatternMatch()];
      const performanceMetricsResult = PerformanceMetrics.create(100, 50, 512, 1024);
      if (performanceMetricsResult.isErr()) {
        throw new Error('Failed to create performance metrics');
      }
      const performanceMetrics = performanceMetricsResult.value;
      // Remove mock since meetsTargets no longer exists

      const result = AnalysisReport.createCompleted(
        'doc-123',
        'lang-456',
        AnalysisScope.Educational,
        metrics,
        insights,
        patternMatches,
        performanceMetrics,
        ['Recommendation 1', 'Recommendation 2'],
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const summary = result.value.generateSummary();

        expect(summary.documentId).toBe('doc-123');
        expect(summary.languagePackageId).toBe('lang-456');
        expect(summary.analysisTime).toBe(100);
        expect(summary.insightCount).toBe(2);
        expect(summary.patternMatchCount).toBe(1);
        expect(summary.complexityScore).toBe(1);
        expect(summary.qualityScore).toBe(0);
        expect(summary.hasHighPriorityIssues).toBe(true);
        expect(summary.meetsPerformanceTargets).toBe(true);
        expect(summary.recommendationCount).toBe(2);
        expect(summary.analysisScope).toBe(AnalysisScope.Educational);
        expect(typeof summary.timestamp).toBe('number');
      }
    });
  });

  describe('structural analysis methods', () => {
    let report: AnalysisReport;

    beforeEach(() => {
      const result = AnalysisReport.create('doc-123', 'lang-456', AnalysisScope.Full);
      if (result.isOk()) {
        report = result.value;
      }
    });

    describe('analyzeStructuralPatterns', () => {
      it('should detect linear proof pattern', () => {
        const statements = ['A', 'B', 'C', 'D'];
        const connections = [
          { from: 0, to: 1 },
          { from: 1, to: 2 },
          { from: 2, to: 3 },
        ];

        const patterns = report.analyzeStructuralPatterns(statements, connections);

        expect(patterns).toContainEqual(
          expect.objectContaining({
            type: 'linear-proof',
            name: 'Linear Proof Structure',
            confidence: 0.9,
          }),
        );
      });

      it('should detect tree proof pattern', () => {
        const statements = ['A', 'B', 'C', 'D'];
        const connections = [
          { from: 0, to: 1 },
          { from: 0, to: 2 },
          { from: 1, to: 3 },
        ];

        const patterns = report.analyzeStructuralPatterns(statements, connections);

        expect(patterns).toContainEqual(
          expect.objectContaining({
            type: 'tree-proof',
            name: 'Tree Proof Structure',
            confidence: 0.85,
          }),
        );
      });

      it('should detect convergent reasoning pattern', () => {
        const statements = ['A', 'B', 'C', 'D'];
        const connections = [
          { from: 0, to: 2 },
          { from: 1, to: 2 },
          { from: 2, to: 3 },
        ];

        const patterns = report.analyzeStructuralPatterns(statements, connections);

        expect(patterns).toContainEqual(
          expect.objectContaining({
            type: 'convergent-reasoning',
            name: 'Convergent Reasoning',
            confidence: 0.8,
          }),
        );
      });

      it('should handle empty connections', () => {
        const statements = ['A', 'B'];
        const connections: { from: number; to: number }[] = [];

        const patterns = report.analyzeStructuralPatterns(statements, connections);

        expect(patterns).toContainEqual(
          expect.objectContaining({
            type: 'linear-proof',
            confidence: 0.9,
          }),
        );
      });
    });

    describe('extractStructuralFeatures', () => {
      it('should extract basic structural features', () => {
        const statements = ['A', 'B', 'C', 'D'];
        const connections = [
          { from: 0, to: 1 },
          { from: 0, to: 2 },
          { from: 1, to: 3 },
          { from: 2, to: 3 },
        ];

        const features = report.extractStructuralFeatures(statements, connections);

        expect(features.statementCount).toBe(4);
        expect(features.connectionCount).toBe(4);
        expect(features.isLinear).toBe(false);
        expect(features.isTree).toBe(false);
        expect(features.hasCycles).toBe(false);
        expect(features.maxDepth).toBeGreaterThan(0);
        expect(features.branchingFactor).toBeGreaterThan(0);
      });

      it('should identify linear structure', () => {
        const statements = ['A', 'B', 'C'];
        const connections = [
          { from: 0, to: 1 },
          { from: 1, to: 2 },
        ];

        const features = report.extractStructuralFeatures(statements, connections);

        expect(features.isLinear).toBe(true);
        expect(features.isTree).toBe(true);
      });

      it('should detect cycles', () => {
        const statements = ['A', 'B', 'C'];
        const connections = [
          { from: 0, to: 1 },
          { from: 1, to: 2 },
          { from: 2, to: 0 },
        ];

        const features = report.extractStructuralFeatures(statements, connections);

        expect(features.hasCycles).toBe(true);
        expect(features.isTree).toBe(false);
      });

      it('should handle empty structures', () => {
        const features = report.extractStructuralFeatures([], []);

        expect(features.statementCount).toBe(0);
        expect(features.connectionCount).toBe(0);
        expect(features.maxDepth).toBe(0);
        expect(features.branchingFactor).toBe(0);
        expect(features.isLinear).toBe(true);
        expect(features.hasCycles).toBe(false);
      });
    });
  });

  describe('equals', () => {
    it('should compare reports by ID', () => {
      const result1 = AnalysisReport.create('doc-123', 'lang-456', AnalysisScope.Full);
      const result2 = AnalysisReport.create('doc-123', 'lang-456', AnalysisScope.Full);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        // Different instances with different IDs
        expect(result1.value.equals(result2.value)).toBe(false);

        // Same instance
        expect(result1.value.equals(result1.value)).toBe(true);
      }
    });
  });
});
