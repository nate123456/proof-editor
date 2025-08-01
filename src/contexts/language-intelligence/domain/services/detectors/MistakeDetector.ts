import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';
import type { LanguagePackage } from '../../entities/LanguagePackage';
import type { CommonMistake, ValidationResult } from '../../entities/ValidationResult';
import { PatternRecognitionError } from '../../errors/DomainErrors';
import type { MistakeAnalysis } from '../PatternRecognitionService';

@injectable()
export class MistakeDetector {
  detectCommonMistakes(
    validationResults: ValidationResult[],
    languagePackage: LanguagePackage,
  ): Result<MistakeAnalysis, PatternRecognitionError> {
    try {
      const mistakes: CommonMistake[] = [];
      const patterns = this.analyzeErrorPatterns(validationResults);

      // Detect circular reasoning
      const circularReasoning = this.detectCircularReasoning(validationResults);
      if (circularReasoning.detected) {
        mistakes.push({
          type: 'circular-reasoning',
          description: 'Circular reasoning detected in proof structure',
          confidence: circularReasoning.confidence,
          instances: circularReasoning.instances,
          suggestion: 'Ensure conclusions do not depend on themselves',
        });
      }

      // Detect invalid inferences
      const invalidInferences = this.detectInvalidInferences(validationResults, languagePackage);
      mistakes.push(...invalidInferences);

      // Detect missing premises
      const missingPremises = this.detectMissingPremises(validationResults);
      mistakes.push(...missingPremises);

      // Detect inconsistent premises
      const inconsistentPremises = this.detectInconsistentPremises(validationResults);
      mistakes.push(...inconsistentPremises);

      // Detect modal logic errors
      if (languagePackage.supportsModalLogic()) {
        const modalErrors = this.detectModalLogicErrors(validationResults);
        mistakes.push(...modalErrors);
      }

      // Detect quantifier errors
      const quantifierErrors = this.detectQuantifierErrors(validationResults);
      mistakes.push(...quantifierErrors);

      // Detect scope errors
      const scopeErrors = this.detectScopeErrors(validationResults);
      mistakes.push(...scopeErrors);

      return ok({
        commonMistakes: mistakes,
        errorFrequency: this.calculateErrorFrequency(patterns),
        severityDistribution: this.analyzeSeverityDistribution(validationResults),
        improvementAreas: this.identifyImprovementAreas(mistakes),
        learningRecommendations: this.generateLearningRecommendations(mistakes),
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to detect common mistakes',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private analyzeErrorPatterns(validationResults: ValidationResult[]): Map<string, number> {
    const patterns = new Map<string, number>();

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const code = diagnostic.getCode().getCode();
        patterns.set(code, (patterns.get(code) ?? 0) + 1);
      }
    }

    return patterns;
  }

  private detectCircularReasoning(validationResults: ValidationResult[]): {
    detected: boolean;
    confidence: number;
    instances: string[];
  } {
    const instances: string[] = [];
    let circularCount = 0;

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const message = diagnostic.getMessage().getText().toLowerCase();
        const code = diagnostic.getCode().getCode().toLowerCase();

        if (
          message.includes('circular') ||
          code.includes('circular') ||
          message.includes('self-referential') ||
          code.includes('dependency-cycle')
        ) {
          circularCount++;
          instances.push(diagnostic.getLocation().toString());
        }
      }
    }

    const confidence = circularCount > 0 ? Math.min(0.9, 0.3 + circularCount * 0.2) : 0;

    return {
      detected: circularCount > 0,
      confidence,
      instances,
    };
  }

  private detectInvalidInferences(
    validationResults: ValidationResult[],
    _languagePackage: LanguagePackage,
  ): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    const inferenceErrors = new Map<string, string[]>();

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const code = diagnostic.getCode().getCode();
        const message = diagnostic.getMessage().getText();

        if (
          code.includes('inference') ||
          message.toLowerCase().includes('invalid inference') ||
          message.toLowerCase().includes('inference rule')
        ) {
          const errorType = this.classifyInferenceError(message);
          if (!inferenceErrors.has(errorType)) {
            inferenceErrors.set(errorType, []);
          }
          inferenceErrors.get(errorType)?.push(diagnostic.getLocation().toString());
        }
      }
    }

    for (const [errorType, instances] of inferenceErrors) {
      mistakes.push({
        type: 'invalid-inference',
        description: `Invalid ${errorType} inference detected`,
        confidence: 0.8,
        instances,
        suggestion: this.getInferenceSuggestion(errorType),
      });
    }

    return mistakes;
  }

  private detectMissingPremises(validationResults: ValidationResult[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    const gapIndicators = [
      'unsupported',
      'missing premise',
      'assumption',
      'gap in reasoning',
      'requires justification',
    ];

    for (const result of validationResults) {
      const semanticErrors = result.getDiagnostics().filter((d) => d.isSemanticRelated());

      for (const diagnostic of semanticErrors) {
        const message = diagnostic.getMessage().getText().toLowerCase();

        if (gapIndicators.some((indicator) => message.includes(indicator))) {
          mistakes.push({
            type: 'missing-premise',
            description: 'Possible missing premise detected',
            confidence: 0.7,
            instances: [diagnostic.getLocation().toString()],
            suggestion: 'Consider if additional premises are needed to support the conclusion',
          });
        }
      }
    }

    return this.consolidateSimilarMistakes(mistakes);
  }

  private detectInconsistentPremises(validationResults: ValidationResult[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const message = diagnostic.getMessage().getText().toLowerCase();

        if (
          message.includes('inconsistent') ||
          message.includes('contradiction') ||
          message.includes('conflict')
        ) {
          mistakes.push({
            type: 'inconsistent-premises',
            description: 'Inconsistent or contradictory premises detected',
            confidence: 0.85,
            instances: [diagnostic.getLocation().toString()],
            suggestion: 'Review premises for contradictions and ensure logical consistency',
          });
        }
      }
    }

    return mistakes;
  }

  private detectModalLogicErrors(validationResults: ValidationResult[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    const modalIndicators = ['modal', 'necessity', 'possibility', 'necessarily', 'possibly'];

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const message = diagnostic.getMessage().getText().toLowerCase();

        if (modalIndicators.some((indicator) => message.includes(indicator))) {
          const errorType = this.classifyModalError(message);
          mistakes.push({
            type: 'modal-logic-error',
            description: `Modal logic error: ${errorType}`,
            confidence: 0.85,
            instances: [diagnostic.getLocation().toString()],
            suggestion: this.getModalLogicSuggestion(errorType),
          });
        }
      }
    }

    return mistakes;
  }

  private detectQuantifierErrors(validationResults: ValidationResult[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    const quantifierIndicators = [
      'quantifier',
      'universal',
      'existential',
      'for all',
      'there exists',
      'scope',
    ];

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const message = diagnostic.getMessage().getText().toLowerCase();

        if (quantifierIndicators.some((indicator) => message.includes(indicator))) {
          mistakes.push({
            type: 'quantifier-error',
            description: 'Quantifier usage error detected',
            confidence: 0.75,
            instances: [diagnostic.getLocation().toString()],
            suggestion: 'Check quantifier scope and variable binding',
          });
        }
      }
    }

    return mistakes;
  }

  private detectScopeErrors(validationResults: ValidationResult[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const message = diagnostic.getMessage().getText().toLowerCase();

        if (
          message.includes('scope') ||
          message.includes('binding') ||
          message.includes('free variable')
        ) {
          mistakes.push({
            type: 'scope-error',
            description: 'Variable scope or binding error',
            confidence: 0.8,
            instances: [diagnostic.getLocation().toString()],
            suggestion: 'Ensure all variables are properly bound within their scope',
          });
        }
      }
    }

    return mistakes;
  }

  private calculateErrorFrequency(patterns: Map<string, number>): Record<string, number> {
    const frequency: Record<string, number> = {};
    const total = Array.from(patterns.values()).reduce((sum, count) => sum + count, 0);

    for (const [pattern, count] of Array.from(patterns.entries())) {
      frequency[pattern] = total > 0 ? count / total : 0;
    }

    return frequency;
  }

  private analyzeSeverityDistribution(
    validationResults: ValidationResult[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {
      error: 0,
      warning: 0,
      info: 0,
    };

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const severity = diagnostic.getSeverity().getSeverity();
        if (severity in distribution) {
          const currentCount = distribution[severity];
          if (currentCount !== undefined) {
            distribution[severity] = currentCount + 1;
          }
        }
      }
    }

    return distribution;
  }

  private identifyImprovementAreas(mistakes: CommonMistake[]): string[] {
    const areas = new Set<string>();

    for (const mistake of mistakes) {
      switch (mistake.type) {
        case 'invalid-inference':
          areas.add('logical-reasoning');
          areas.add('inference-rules');
          break;
        case 'missing-premise':
          areas.add('argument-structure');
          areas.add('premise-identification');
          break;
        case 'modal-logic-error':
          areas.add('modal-logic');
          areas.add('necessity-possibility');
          break;
        case 'circular-reasoning':
          areas.add('logical-dependencies');
          areas.add('argument-flow');
          break;
        case 'inconsistent-premises':
          areas.add('logical-consistency');
          areas.add('contradiction-detection');
          break;
        case 'quantifier-error':
          areas.add('quantifier-logic');
          areas.add('variable-binding');
          break;
        case 'scope-error':
          areas.add('scope-management');
          areas.add('variable-scope');
          break;
      }
    }

    return Array.from(areas);
  }

  private generateLearningRecommendations(mistakes: CommonMistake[]): string[] {
    const recommendations: string[] = [];
    const mistakeTypes = new Set(mistakes.map((m) => m.type));

    if (mistakeTypes.has('invalid-inference')) {
      recommendations.push('Study basic inference rules (modus ponens, modus tollens, etc.)');
      recommendations.push('Practice identifying valid vs invalid inference patterns');
    }

    if (mistakeTypes.has('modal-logic-error')) {
      recommendations.push('Review modal logic concepts and operator semantics');
      recommendations.push('Study the difference between necessity and possibility');
    }

    if (mistakeTypes.has('circular-reasoning')) {
      recommendations.push(
        'Practice identifying logical dependencies and avoiding circular arguments',
      );
      recommendations.push('Learn techniques for detecting self-referential reasoning');
    }

    if (mistakeTypes.has('missing-premise')) {
      recommendations.push('Study argument structure and premise identification');
      recommendations.push('Practice finding hidden assumptions in arguments');
    }

    if (mistakeTypes.has('inconsistent-premises')) {
      recommendations.push('Learn contradiction detection techniques');
      recommendations.push('Study methods for ensuring logical consistency');
    }

    if (mistakeTypes.has('quantifier-error')) {
      recommendations.push('Review quantifier logic and scope rules');
      recommendations.push('Practice proper variable binding in quantified statements');
    }

    return recommendations;
  }

  // Helper methods
  private classifyInferenceError(message: string): string {
    const lowercaseMessage = message.toLowerCase();

    if (lowercaseMessage.includes('modus ponens')) return 'modus ponens';
    if (lowercaseMessage.includes('modus tollens')) return 'modus tollens';
    if (lowercaseMessage.includes('syllogism')) return 'syllogistic';
    if (lowercaseMessage.includes('affirming')) return 'affirming the consequent';
    if (lowercaseMessage.includes('denying')) return 'denying the antecedent';

    return 'general';
  }

  private getInferenceSuggestion(errorType: string): string {
    const suggestions: Record<string, string> = {
      'modus ponens': 'Review modus ponens: from P and P→Q, infer Q',
      'modus tollens': 'Review modus tollens: from P→Q and ¬Q, infer ¬P',
      syllogistic: 'Check syllogistic form and ensure valid structure',
      'affirming the consequent': 'Avoid affirming the consequent: P→Q and Q does not imply P',
      'denying the antecedent': 'Avoid denying the antecedent: P→Q and ¬P does not imply ¬Q',
      general: 'Review the inference rule being applied',
    };

    return (
      suggestions[errorType] ?? suggestions.general ?? 'Review the inference rule being applied'
    );
  }

  private classifyModalError(message: string): string {
    const lowercaseMessage = message.toLowerCase();

    if (lowercaseMessage.includes('necessity')) return 'necessity violation';
    if (lowercaseMessage.includes('possibility')) return 'possibility violation';
    if (lowercaseMessage.includes('accessibility')) return 'accessibility relation error';

    return 'general modal error';
  }

  private getModalLogicSuggestion(errorType: string): string {
    const suggestions: Record<string, string> = {
      'necessity violation': 'Check that necessary statements hold in all accessible worlds',
      'possibility violation': 'Ensure possible statements hold in at least one accessible world',
      'accessibility relation error': 'Review accessibility relations between possible worlds',
      'general modal error': 'Review modal logic principles and operator usage',
    };

    return (
      suggestions[errorType] ??
      suggestions['general modal error'] ??
      'Review modal logic principles and operator usage'
    );
  }

  private consolidateSimilarMistakes(mistakes: CommonMistake[]): CommonMistake[] {
    if (mistakes.length <= 1) return mistakes;

    const consolidated: CommonMistake[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < mistakes.length; i++) {
      if (processed.has(i)) continue;

      const current = mistakes[i];
      if (!current) continue;
      const similar: CommonMistake[] = [current];

      for (let j = i + 1; j < mistakes.length; j++) {
        const other = mistakes[j];
        if (!other) continue;
        if (current.type === other.type && current.description === other.description) {
          similar.push(other);
          processed.add(j);
        }
      }

      if (similar.length > 1) {
        consolidated.push({
          ...current,
          instances: similar.flatMap((m) => m.instances),
          confidence: Math.max(...similar.map((m) => m.confidence)),
        });
      } else {
        consolidated.push(current);
      }
    }

    return consolidated;
  }
}
