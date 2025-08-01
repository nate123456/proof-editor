import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { PatternRecognitionError } from '../../errors/DomainErrors';
import type { SimilarPattern } from '../PatternRecognitionService';

@injectable()
export class PatternMatcher {
  findSimilarPatterns(
    targetPattern: { type: string; premises: string[]; conclusions: string[]; confidence: number },
    statements: string[],
    languagePackage: LanguagePackage,
  ): Result<SimilarPattern[], PatternRecognitionError> {
    try {
      const similarPatterns: SimilarPattern[] = [];

      // Find patterns based on structure
      const structuralMatches = this.findStructuralMatches(targetPattern, statements);
      similarPatterns.push(...structuralMatches);

      // Find patterns based on specific types
      const typeSpecificMatches = this.findTypeSpecificMatches(targetPattern, statements);
      similarPatterns.push(...typeSpecificMatches);

      // Find semantic matches using language package
      const semanticMatches = this.findSemanticMatches(targetPattern, statements, languagePackage);
      similarPatterns.push(...semanticMatches);

      // Sort by similarity score descending
      similarPatterns.sort((a, b) => b.similarity - a.similarity);

      // Remove duplicates
      const uniquePatterns = this.removeDuplicatePatterns(similarPatterns);

      return ok(uniquePatterns);
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to find similar patterns',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private findStructuralMatches(
    targetPattern: { type: string; premises: string[]; conclusions: string[]; confidence: number },
    statements: string[],
  ): SimilarPattern[] {
    const matches: SimilarPattern[] = [];
    const targetLength = targetPattern.premises.length + targetPattern.conclusions.length;

    // Slide window through statements looking for similar structure
    for (let i = 0; i <= statements.length - targetLength; i++) {
      const candidatePremises = statements.slice(i, i + targetPattern.premises.length);
      const candidateConclusions = statements.slice(
        i + targetPattern.premises.length,
        i + targetLength,
      );

      if (candidateConclusions.length === targetPattern.conclusions.length) {
        const similarity = this.calculatePatternSimilarity(
          { premises: targetPattern.premises, conclusions: targetPattern.conclusions },
          { premises: candidatePremises, conclusions: candidateConclusions },
        );

        if (similarity > 0.5) {
          matches.push({
            pattern: {
              type: targetPattern.type,
              premises: candidatePremises,
              conclusions: candidateConclusions,
              confidence: similarity,
            },
            similarity,
            location: {
              startIndex: i,
              endIndex: i + targetLength,
            },
          });
        }
      }
    }

    return matches;
  }

  private findTypeSpecificMatches(
    targetPattern: { type: string; premises: string[]; conclusions: string[]; confidence: number },
    statements: string[],
  ): SimilarPattern[] {
    const matches: SimilarPattern[] = [];

    switch (targetPattern.type) {
      case 'modus-ponens':
        matches.push(...this.findModusPonensPatterns(statements));
        break;
      case 'modus-tollens':
        matches.push(...this.findModusTollensPatterns(statements));
        break;
      case 'hypothetical-syllogism':
        matches.push(...this.findHypotheticalSyllogismPatterns(statements));
        break;
      case 'conjunction':
        matches.push(...this.findConjunctionPatterns(statements));
        break;
      case 'disjunction':
        matches.push(...this.findDisjunctionPatterns(statements));
        break;
      case 'disjunctive-syllogism':
        matches.push(...this.findDisjunctiveSyllogismPatterns(statements));
        break;
    }

    return matches;
  }

  private findSemanticMatches(
    targetPattern: { type: string; premises: string[]; conclusions: string[]; confidence: number },
    statements: string[],
    languagePackage: LanguagePackage,
  ): SimilarPattern[] {
    const matches: SimilarPattern[] = [];
    const rules = languagePackage.getInferenceRules();

    // Use language package rules to find semantic matches
    for (let i = 0; i < statements.length; i++) {
      for (const rule of rules) {
        if (!rule.isRuleActive()) continue;

        // Try to match rule patterns
        const rulePatterns = this.extractRulePatterns(rule);
        for (const rulePattern of rulePatterns) {
          if (this.isSemanticMatch(targetPattern, rulePattern)) {
            const match = this.tryMatchAtPosition(statements, i, rulePattern);
            if (match) {
              matches.push(match);
            }
          }
        }
      }
    }

    return matches;
  }

  private findModusPonensPatterns(statements: string[]): SimilarPattern[] {
    const patterns: SimilarPattern[] = [];

    for (let i = 0; i < statements.length - 2; i++) {
      const stmt1 = statements[i];
      const stmt2 = statements[i + 1];
      const stmt3 = statements[i + 2];

      if (stmt1 && stmt2 && stmt3 && stmt2.includes('→')) {
        const parts = stmt2.split('→');
        if (parts.length === 2) {
          const antecedent = parts[0]?.trim() ?? '';
          const consequent = parts[1]?.trim() ?? '';

          // Check exact modus ponens
          if (stmt1 === antecedent && stmt3 === consequent) {
            patterns.push({
              pattern: {
                type: 'modus-ponens',
                premises: [stmt1, stmt2],
                conclusions: [stmt3],
                confidence: 1.0,
              },
              similarity: 1.0,
              location: { startIndex: i, endIndex: i + 3 },
            });
          } else {
            // Check similarity-based match
            const similarity1 = this.calculateStringSimilarity(stmt1, antecedent);
            const similarity2 = this.calculateStringSimilarity(stmt3, consequent);
            const overallSimilarity = (similarity1 + similarity2) / 2;

            if (overallSimilarity > 0.5) {
              patterns.push({
                pattern: {
                  type: 'modus-ponens',
                  premises: [stmt1, stmt2],
                  conclusions: [stmt3],
                  confidence: overallSimilarity,
                },
                similarity: overallSimilarity,
                location: { startIndex: i, endIndex: i + 3 },
              });
            }
          }
        }
      }
    }

    return patterns;
  }

  private findModusTollensPatterns(statements: string[]): SimilarPattern[] {
    const patterns: SimilarPattern[] = [];

    for (let i = 0; i < statements.length - 2; i++) {
      const stmt1 = statements[i];
      const stmt2 = statements[i + 1];
      const stmt3 = statements[i + 2];

      if (stmt1 && stmt2 && stmt3 && stmt1.includes('→')) {
        const parts = stmt1.split('→');
        if (parts.length === 2) {
          const antecedent = parts[0]?.trim() ?? '';
          const consequent = parts[1]?.trim() ?? '';
          const negatedConsequent = `¬${consequent}`;
          const negatedAntecedent = `¬${antecedent}`;

          if (stmt2 === negatedConsequent && stmt3 === negatedAntecedent) {
            patterns.push({
              pattern: {
                type: 'modus-tollens',
                premises: [stmt1, stmt2],
                conclusions: [stmt3],
                confidence: 1.0,
              },
              similarity: 1.0,
              location: { startIndex: i, endIndex: i + 3 },
            });
          }
        }
      }
    }

    return patterns;
  }

  private findHypotheticalSyllogismPatterns(statements: string[]): SimilarPattern[] {
    const patterns: SimilarPattern[] = [];

    for (let i = 0; i < statements.length - 2; i++) {
      const stmt1 = statements[i];
      const stmt2 = statements[i + 1];
      const stmt3 = statements[i + 2];

      if (stmt1 && stmt2 && stmt3 && stmt1.includes('→') && stmt2.includes('→')) {
        const parts1 = stmt1.split('→');
        const parts2 = stmt2.split('→');

        if (parts1.length === 2 && parts2.length === 2) {
          const p = parts1[0]?.trim() ?? '';
          const q = parts1[1]?.trim() ?? '';
          const q2 = parts2[0]?.trim() ?? '';
          const r = parts2[1]?.trim() ?? '';

          if (q === q2 && stmt3 === `${p} → ${r}`) {
            patterns.push({
              pattern: {
                type: 'hypothetical-syllogism',
                premises: [stmt1, stmt2],
                conclusions: [stmt3],
                confidence: 1.0,
              },
              similarity: 1.0,
              location: { startIndex: i, endIndex: i + 3 },
            });
          }
        }
      }
    }

    return patterns;
  }

  private findConjunctionPatterns(statements: string[]): SimilarPattern[] {
    const patterns: SimilarPattern[] = [];

    for (let i = 0; i < statements.length - 2; i++) {
      const stmt1 = statements[i];
      const stmt2 = statements[i + 1];
      const stmt3 = statements[i + 2];

      if (stmt1 && stmt2 && stmt3) {
        // Check for conjunction introduction
        const expectedConjunction = `${stmt1} ∧ ${stmt2}`;
        const similarity = this.calculateStringSimilarity(stmt3, expectedConjunction);

        if (similarity > 0.8) {
          patterns.push({
            pattern: {
              type: 'conjunction',
              premises: [stmt1, stmt2],
              conclusions: [stmt3],
              confidence: similarity,
            },
            similarity,
            location: { startIndex: i, endIndex: i + 3 },
          });
        }

        // Check for conjunction elimination
        if (stmt1.includes('∧')) {
          const parts = stmt1.split('∧').map((p) => p.trim());
          if (parts.length === 2) {
            if (stmt2 === parts[0] || stmt2 === parts[1]) {
              patterns.push({
                pattern: {
                  type: 'conjunction-elimination',
                  premises: [stmt1],
                  conclusions: [stmt2],
                  confidence: 1.0,
                },
                similarity: 1.0,
                location: { startIndex: i, endIndex: i + 2 },
              });
            }
          }
        }
      }
    }

    return patterns;
  }

  private findDisjunctionPatterns(statements: string[]): SimilarPattern[] {
    const patterns: SimilarPattern[] = [];

    for (let i = 0; i < statements.length - 1; i++) {
      const stmt1 = statements[i];
      const stmt2 = statements[i + 1];

      if (stmt1 && stmt2) {
        // Check for disjunction introduction
        if (stmt2.includes('∨') && (stmt2.includes(stmt1) || stmt1.includes(stmt2))) {
          patterns.push({
            pattern: {
              type: 'disjunction-introduction',
              premises: [stmt1],
              conclusions: [stmt2],
              confidence: 0.9,
            },
            similarity: 0.9,
            location: { startIndex: i, endIndex: i + 2 },
          });
        }
      }
    }

    return patterns;
  }

  private findDisjunctiveSyllogismPatterns(statements: string[]): SimilarPattern[] {
    const patterns: SimilarPattern[] = [];

    for (let i = 0; i < statements.length - 2; i++) {
      const stmt1 = statements[i];
      const stmt2 = statements[i + 1];
      const stmt3 = statements[i + 2];

      if (stmt1 && stmt2 && stmt3 && stmt1.includes('∨')) {
        const parts = stmt1.split('∨').map((p) => p.trim());
        if (parts.length === 2) {
          const p = parts[0] ?? '';
          const q = parts[1] ?? '';

          // Check P∨Q, ¬P ⊢ Q
          if (stmt2 === `¬${p}` && stmt3 === q) {
            patterns.push({
              pattern: {
                type: 'disjunctive-syllogism',
                premises: [stmt1, stmt2],
                conclusions: [stmt3],
                confidence: 1.0,
              },
              similarity: 1.0,
              location: { startIndex: i, endIndex: i + 3 },
            });
          }

          // Check P∨Q, ¬Q ⊢ P
          if (stmt2 === `¬${q}` && stmt3 === p) {
            patterns.push({
              pattern: {
                type: 'disjunctive-syllogism',
                premises: [stmt1, stmt2],
                conclusions: [stmt3],
                confidence: 1.0,
              },
              similarity: 1.0,
              location: { startIndex: i, endIndex: i + 3 },
            });
          }
        }
      }
    }

    return patterns;
  }

  private calculatePatternSimilarity(
    pattern1: { premises: string[]; conclusions: string[] },
    pattern2: { premises: string[]; conclusions: string[] },
  ): number {
    if (
      pattern1.premises.length !== pattern2.premises.length ||
      pattern1.conclusions.length !== pattern2.conclusions.length
    ) {
      return 0;
    }

    let totalSimilarity = 0;
    let totalComparisons = 0;

    // Compare premises
    for (let i = 0; i < pattern1.premises.length; i++) {
      const premise1 = pattern1.premises[i];
      const premise2 = pattern2.premises[i];
      if (premise1 && premise2) {
        const sim = this.calculateStringSimilarity(premise1, premise2);
        totalSimilarity += sim;
        totalComparisons++;
      }
    }

    // Compare conclusions
    for (let i = 0; i < pattern1.conclusions.length; i++) {
      const conclusion1 = pattern1.conclusions[i];
      const conclusion2 = pattern2.conclusions[i];
      if (conclusion1 && conclusion2) {
        const sim = this.calculateStringSimilarity(conclusion1, conclusion2);
        totalSimilarity += sim;
        totalComparisons++;
      }
    }

    return totalComparisons > 0 ? totalSimilarity / totalComparisons : 0;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Handle exact matches
    if (str1 === str2) return 1;

    // Simple Levenshtein distance-based similarity
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array.from({ length: str2.length + 1 }, () =>
      Array.from({ length: str1.length + 1 }, () => 0),
    );

    // Initialize first row and column
    for (let i = 0; i <= str1.length; i++) {
      const firstRow = matrix[0];
      if (firstRow) {
        firstRow[i] = i;
      }
    }
    for (let j = 0; j <= str2.length; j++) {
      const row = matrix[j];
      if (row) {
        row[0] = j;
      }
    }

    // Fill the matrix
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        const current = matrix[j];
        const above = matrix[j - 1];
        if (
          current &&
          above &&
          current[i - 1] !== undefined &&
          above[i] !== undefined &&
          above[i - 1] !== undefined
        ) {
          const currentVal = current[i - 1];
          const aboveVal = above[i];
          const abovePrevVal = above[i - 1];
          if (currentVal !== undefined && aboveVal !== undefined && abovePrevVal !== undefined) {
            current[i] = Math.min(currentVal + 1, aboveVal + 1, abovePrevVal + cost);
          }
        }
      }
    }

    return matrix[str2.length]?.[str1.length] ?? 0;
  }

  private removeDuplicatePatterns(patterns: SimilarPattern[]): SimilarPattern[] {
    const unique: SimilarPattern[] = [];
    const seen = new Set<string>();

    for (const pattern of patterns) {
      const key = `${pattern.location.startIndex}-${pattern.location.endIndex}-${pattern.pattern.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(pattern);
      }
    }

    return unique;
  }

  private extractRulePatterns(rule: unknown): Array<{
    type: string;
    premises: string[];
    conclusions: string[];
    length: number;
  }> {
    // Extract patterns from rule - simplified version
    const patterns: Array<{
      type: string;
      premises: string[];
      conclusions: string[];
      length: number;
    }> = [];

    if (typeof rule === 'object' && rule !== null && 'getPattern' in rule) {
      const pattern = (rule as { getPattern: () => unknown }).getPattern();
      if (
        typeof pattern === 'object' &&
        pattern !== null &&
        'type' in pattern &&
        'premises' in pattern &&
        'conclusions' in pattern
      ) {
        const typedPattern = pattern as {
          type: string;
          premises: string[];
          conclusions: string[];
        };
        patterns.push({
          ...typedPattern,
          length: typedPattern.premises.length + typedPattern.conclusions.length,
        });
      }
    }

    return patterns;
  }

  private isSemanticMatch(targetPattern: { type: string }, rulePattern: { type: string }): boolean {
    // Check if patterns match semantically - simplified
    return targetPattern.type === rulePattern.type;
  }

  private tryMatchAtPosition(
    statements: string[],
    position: number,
    pattern: {
      type: string;
      premises: string[];
      conclusions: string[];
      length: number;
    },
  ): SimilarPattern | null {
    // Try to match pattern at specific position - simplified
    if (position + pattern.length > statements.length) {
      return null;
    }

    const slice = statements.slice(position, position + pattern.length);
    const similarity = this.calculatePatternSimilarity(
      { premises: pattern.premises, conclusions: pattern.conclusions },
      {
        premises: slice.slice(0, pattern.premises.length),
        conclusions: slice.slice(pattern.premises.length),
      },
    );

    if (similarity > 0.6) {
      return {
        pattern: {
          type: pattern.type,
          premises: slice.slice(0, pattern.premises.length),
          conclusions: slice.slice(pattern.premises.length),
          confidence: similarity,
        },
        similarity,
        location: {
          startIndex: position,
          endIndex: position + pattern.length,
        },
      };
    }

    return null;
  }
}
