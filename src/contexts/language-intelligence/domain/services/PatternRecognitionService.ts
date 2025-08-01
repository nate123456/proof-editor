import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';

import type { PatternInstance, StructuralFeatures } from '../entities/AnalysisReport';
import type { LogicalFeatures } from '../entities/InferenceRule';
import type { LanguagePackage } from '../entities/LanguagePackage';
import type { CommonMistake, ValidationResult } from '../entities/ValidationResult';
import { PatternRecognitionError } from '../errors/DomainErrors';
import { PerformanceMetrics } from '../value-objects/PerformanceMetrics';
import { ArgumentStructureAnalyzer } from './analyzers/ArgumentStructureAnalyzer';
import { ProofPatternAnalyzer } from './analyzers/ProofPatternAnalyzer';
import { MistakeDetector } from './detectors/MistakeDetector';
import { LogicalStructureHelper } from './helpers/LogicalStructureHelper';
import { PatternSuggestionHelper } from './helpers/PatternSuggestionHelper';
import { PatternMatcher } from './matchers/PatternMatcher';

@injectable()
export class PatternRecognitionService {
  private readonly patternCache = new Map<string, RecognizedPattern[]>();
  private readonly maxCacheSize = 1000;

  constructor(
    @inject(ProofPatternAnalyzer) private readonly proofAnalyzer: ProofPatternAnalyzer,
    @inject(ArgumentStructureAnalyzer) private readonly argumentAnalyzer: ArgumentStructureAnalyzer,
    @inject(MistakeDetector) private readonly mistakeDetector: MistakeDetector,
    @inject(PatternMatcher) private readonly patternMatcher: PatternMatcher,
    @inject(LogicalStructureHelper) private readonly logicalHelper: LogicalStructureHelper,
    @inject(PatternSuggestionHelper) private readonly suggestionHelper: PatternSuggestionHelper,
  ) {}

  recognizeProofPatterns(
    statements: string[],
    connections: { from: number; to: number }[],
    languagePackage: LanguagePackage,
  ): Result<ProofPatternAnalysis, PatternRecognitionError> {
    // Check cache first
    const cacheKey = this.generateCacheKey(statements, connections);
    const cached = this.patternCache.get(cacheKey);
    if (cached) {
      return this.buildProofAnalysisFromCache(cached, statements, connections);
    }

    // Delegate to specialized analyzer
    const result = this.proofAnalyzer.analyzeProofPatterns(
      statements,
      connections,
      languagePackage,
    );

    // Cache successful results
    if (result.isOk()) {
      this.cachePatterns(cacheKey, result.value.recognizedPatterns);
    }

    return result;
  }

  recognizeArgumentStructure(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
  ): Result<ArgumentStructureAnalysis, PatternRecognitionError> {
    // Delegate to specialized analyzer
    return this.argumentAnalyzer.analyzeArgumentStructure(premises, conclusions, languagePackage);
  }

  analyzeArgumentStructure(
    premises: string[],
    conclusion: string,
    languagePackage: LanguagePackage,
  ): Result<DetailedArgumentStructureAnalysis, PatternRecognitionError> {
    // Delegate to specialized analyzer
    return this.argumentAnalyzer.analyzeDetailedArgumentStructure(
      premises,
      conclusion,
      languagePackage,
    );
  }

  detectCommonMistakes(
    validationResults: ValidationResult[],
    languagePackage: LanguagePackage,
  ): Result<MistakeAnalysis, PatternRecognitionError> {
    // Delegate to specialized detector
    return this.mistakeDetector.detectCommonMistakes(validationResults, languagePackage);
  }

  recognizePatterns(
    statements: string[],
    languagePackage: LanguagePackage,
  ): Result<RecognizedPatternResult, PatternRecognitionError> {
    // Delegate to logical structure helper
    return this.logicalHelper.recognizePatterns(statements, languagePackage);
  }

  detectLogicalStructure(
    statement: string,
    languagePackage: LanguagePackage,
  ): Result<DetailedLogicalStructureAnalysis, PatternRecognitionError> {
    // Delegate to logical structure helper
    return this.logicalHelper.detectLogicalStructure(statement, languagePackage);
  }

  suggestPatternCompletion(
    partialStatements: string[],
    languagePackage: LanguagePackage,
  ): Result<PatternCompletionSuggestion[], PatternRecognitionError> {
    // Delegate to suggestion helper
    return this.suggestionHelper.suggestPatternCompletion(partialStatements, languagePackage);
  }

  extractPatternFeatures(
    statements: string[],
    languagePackage: LanguagePackage,
  ): Result<ExtractedPatternFeatures, PatternRecognitionError> {
    // Delegate to suggestion helper
    return this.suggestionHelper.extractPatternFeatures(statements, languagePackage);
  }

  findSimilarPatterns(
    targetPattern: { type: string; premises: string[]; conclusions: string[]; confidence: number },
    statements: string[],
    languagePackage: LanguagePackage,
  ): Result<SimilarPattern[], PatternRecognitionError> {
    // Delegate to pattern matcher
    return this.patternMatcher.findSimilarPatterns(targetPattern, statements, languagePackage);
  }

  // Cache management
  private generateCacheKey(
    statements: string[],
    connections: { from: number; to: number }[],
  ): string {
    return `${statements.join('|')}_${connections.map((c) => `${c.from}-${c.to}`).join('|')}`;
  }

  private cachePatterns(key: string, patterns: RecognizedPattern[]): void {
    // Implement LRU cache eviction if needed
    if (this.patternCache.size >= this.maxCacheSize) {
      const firstKey = this.patternCache.keys().next().value;
      if (firstKey) {
        this.patternCache.delete(firstKey);
      }
    }
    this.patternCache.set(key, patterns);
  }

  private buildProofAnalysisFromCache(
    cachedPatterns: RecognizedPattern[],
    statements: string[],
    connections: { from: number; to: number }[],
  ): Result<ProofPatternAnalysis, PatternRecognitionError> {
    try {
      // Build minimal analysis from cache
      const structuralFeatures: StructuralFeatures = {
        statementCount: statements.length,
        connectionCount: connections.length,
        maxDepth: 0, // Would need recalculation
        branchingFactor: 0, // Would need recalculation
        isLinear: false, // Would need recalculation
        isTree: false, // Would need recalculation
        hasCycles: false, // Would need recalculation
      };

      const logicalFeatures: LogicalFeatures = {
        hasQuantifiers: false, // Would need recalculation
        hasModalOperators: false, // Would need recalculation
        hasNegations: false, // Would need recalculation
        hasImplications: false, // Would need recalculation
        hasConjunctions: false, // Would need recalculation
        hasDisjunctions: false, // Would need recalculation
        logicalComplexity: 0, // Would need recalculation
      };

      const perfResult = PerformanceMetrics.create(0, 0, 0, 0);
      const performance = perfResult.isOk()
        ? perfResult.value
        : (() => {
            const fallback = PerformanceMetrics.create(0, 0, 0, 0);
            if (fallback.isOk()) return fallback.value;
            throw new Error('Failed to create performance metrics');
          })();

      return ok({
        recognizedPatterns: cachedPatterns,
        structuralFeatures,
        logicalFeatures,
        patternInsights: [],
        confidence: this.calculateAverageConfidence(cachedPatterns),
        performance,
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to build analysis from cache',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private calculateAverageConfidence(patterns: RecognizedPattern[]): number {
    if (patterns.length === 0) return 0;
    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
    return totalConfidence / patterns.length;
  }
}

// Re-export types used by other parts of the system
export interface RecognizedPattern {
  type: string;
  name: string;
  description: string;
  confidence: number;
  instances: PatternInstance[];
  properties: Record<string, unknown>;
}

export interface ProofPatternAnalysis {
  recognizedPatterns: RecognizedPattern[];
  structuralFeatures: StructuralFeatures;
  logicalFeatures: LogicalFeatures;
  patternInsights: PatternInsight[];
  confidence: number;
  performance: PerformanceMetrics;
}

export interface PatternInsight {
  type: string;
  description: string;
  confidence: number;
  implications: string[];
}

export interface ArgumentStructureAnalysis {
  argumentType: string;
  inferenceRules: string[];
  complexity: ArgumentComplexity;
  validity: boolean;
  soundness: boolean;
  logicalFeatures: ArgumentFeatures;
  suggestions: string[];
}

export interface ArgumentStructure {
  type: string;
  premiseCount: number;
  conclusionCount: number;
  isValid: boolean;
  strength: number;
}

export interface ArgumentComplexity {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: {
    statementCount: number;
    averageLength: number;
    logicalSymbolCount: number;
  };
}

export interface ArgumentFeatures {
  hasConditionals: boolean;
  hasNegations: boolean;
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  averageStatementLength: number;
  logicalDepth: number;
}

export interface MistakeAnalysis {
  commonMistakes: CommonMistake[];
  errorFrequency: Record<string, number>;
  severityDistribution: Record<string, number>;
  improvementAreas: string[];
  learningRecommendations: string[];
}

export interface RecognizedPatternResult {
  logicalPatterns: RecognizedPattern[];
  structuralPatterns: RecognizedPattern[];
  customPatterns: RecognizedPattern[];
  overallComplexity: number;
}

export interface LogicalStructureAnalysis {
  mainConnective: string | null;
  subformulas: string[];
  complexity: number;
  operators: string[];
  isWellFormed: boolean;
  parenthesesDepth: number;
  atomicPropositions: string[];
}

export interface PatternCompletionSuggestion {
  suggestedStatement: string;
  patternType: string;
  confidence: number;
  explanation: string;
}

export interface ExtractedPatternFeatures {
  totalStatements: number;
  uniquePatterns: number;
  patternDensity: number;
  dominantPatternType: string | null;
  complexityScore: number;
  patternDistribution: Record<string, number>;
  logicalOperatorFrequency: Record<string, number>;
  inferencePatterns: string[];
  structuralMetrics: StructuralMetrics;
  complexityDistribution: ComplexityDistribution;
}

export interface StructuralMetrics {
  averageLength: number;
  maxDepth: number;
  totalConnectives: number;
  statementCount: number;
}

export interface ComplexityDistribution {
  low: number;
  medium: number;
  high: number;
  average: number;
}

export interface DetailedLogicalStructureAnalysis {
  mainOperator: string | null;
  subformulas: string[];
  complexity: number;
  operators: string[];
  isWellFormed: boolean;
  parenthesesDepth: number;
  atomicPropositions: string[];
  isAtomic: boolean;
  isCompound: boolean;
  isNested: boolean;
  depth: number;
  hasQuantifiers: boolean;
  quantifiers: string[];
  variables: string[];
  hasModalOperators: boolean;
  modalOperators: string[];
}

export interface DetailedArgumentStructureAnalysis {
  argumentType: string;
  isValid: boolean;
  logicalForm: string[];
  dependencies: string[];
  assumptions: string[];
  strength: number;
  hasCircularDependencies: boolean;
}

export interface SimilarPattern {
  pattern: {
    type: string;
    premises: string[];
    conclusions: string[];
    confidence: number;
  };
  similarity: number;
  location: {
    startIndex: number;
    endIndex: number;
  };
}
