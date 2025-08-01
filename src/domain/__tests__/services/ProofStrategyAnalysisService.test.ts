import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProofStrategyAnalysisService } from '../../services/ProofStrategyAnalysisService.js';
import { StatementContent } from '../../shared/value-objects/index.js';

describe('ProofStrategyAnalysisService', () => {
  let service: ProofStrategyAnalysisService;

  beforeEach(() => {
    service = new ProofStrategyAnalysisService();
  });

  describe('analyzeProofStrategies', () => {
    describe('successful analysis cases', () => {
      it('should analyze strategies for basic logical argument', () => {
        const premisesResult = [
          StatementContent.create('All men are mortal'),
          StatementContent.create('Socrates is a man'),
        ];
        const conclusionResult = StatementContent.create('Socrates is mortal');

        expect(premisesResult.every((p) => p.isOk())).toBe(true);
        expect(conclusionResult.isOk()).toBe(true);

        if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
          const premises = premisesResult.map((p) => p.value);
          const conclusion = conclusionResult.value;

          const result = service.analyzeProofStrategies(premises, conclusion);

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const analysis = result.value;
            expect(analysis.getStrategies().length).toBeGreaterThan(0);
            expect(analysis.getStructuralAnalysis()).toBeDefined();
            expect(analysis.getComplexityAssessment()).toBeDefined();
            expect(analysis.getAlternativeApproaches()).toBeDefined();
            expect(analysis.getPrerequisiteChecks()).toBeDefined();

            // Should include direct proof strategy for basic logic
            const directProof = analysis
              .getStrategies()
              .find((s) => s.getName() === 'Direct Proof');
            expect(directProof).toBeDefined();
            expect(directProof?.getConfidence().getValue()).toBeGreaterThan(0);
            expect(directProof?.getSteps().length).toBeGreaterThan(0);
          }
        }
      });

      it('should recommend proof by contradiction for appropriate cases', () => {
        const premisesResult = [StatementContent.create('Assume √2 is rational')];
        const conclusionResult = StatementContent.create('√2 is irrational');

        expect(premisesResult.every((p) => p.isOk())).toBe(true);
        expect(conclusionResult.isOk()).toBe(true);

        if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
          const premises = premisesResult.map((p) => p.value);
          const conclusion = conclusionResult.value;

          const result = service.analyzeProofStrategies(premises, conclusion);

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const analysis = result.value;
            const contradictionProof = analysis
              .getStrategies()
              .find((s) => s.getName() === 'Proof by Contradiction');
            expect(contradictionProof).toBeDefined();
            expect(contradictionProof?.getSteps()).toContain(
              'Assume the negation of the conclusion',
            );
          }
        }
      });

      it('should recommend proof by cases when disjunction present', () => {
        const premises = ['P ∨ Q', 'P → R', 'Q → R'];
        const conclusion = 'R';

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const recommendations = result.value;
          const casesProof = recommendations.recommendedStrategies.find(
            (s) => s.name === 'Proof by Cases',
          );
          expect(casesProof).toBeDefined();
          expect(casesProof?.confidence).toBeGreaterThan(0.8);
        }
      });

      it('should recommend mathematical induction for universal quantification over naturals', () => {
        const premises = ['Base case: P(1)', 'Inductive step: P(k) → P(k+1)'];
        const conclusion = '∀n ∈ ℕ, P(n)';

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const recommendations = result.value;
          const inductionProof = recommendations.recommendedStrategies.find(
            (s) => s.name === 'Mathematical Induction',
          );
          expect(inductionProof).toBeDefined();
          expect(inductionProof?.confidence).toBe(0.9);
          expect(inductionProof?.difficulty).toBe('hard');
        }
      });

      it('should sort strategies by confidence in descending order', () => {
        const premises = ['P ∨ Q', 'P → R', 'Q → R'];
        const conclusion = 'R';

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const strategies = result.value.recommendedStrategies;
          for (let i = 0; i < strategies.length - 1; i++) {
            const current = strategies[i];
            const next = strategies[i + 1];
            if (current && next) {
              expect(current.confidence).toBeGreaterThanOrEqual(next.confidence);
            }
          }
        }
      });
    });

    describe('error cases', () => {
      it('should return error for empty premises', () => {
        const premises: string[] = [];
        const conclusion = 'Some conclusion';

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('empty premises');
        }
      });

      it('should return error for empty conclusion', () => {
        const premises = ['Some premise'];
        const conclusion = '';

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('empty conclusion');
        }
      });

      it('should return error for whitespace-only conclusion', () => {
        const premises = ['Some premise'];
        const conclusion = '   ';

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('empty conclusion');
        }
      });

      it('should return error for whitespace-only premises', () => {
        const premises = ['Some premise', '   ', 'Another premise'];
        const conclusion = 'Some conclusion';

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('empty content');
        }
      });

      it('should return error for empty string premises', () => {
        const premises = ['Valid premise', '', 'Another premise'];
        const conclusion = 'Some conclusion';

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('empty content');
        }
      });
    });

    describe('property-based tests', () => {
      it('should always return non-empty strategies for valid input', () => {
        // Generate strings with meaningful content (not just whitespace)
        const meaningfulString = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

        fc.assert(
          fc.property(
            fc.array(meaningfulString, { minLength: 1 }),
            meaningfulString,
            (premises, conclusion) => {
              const result = service.analyzeProofStrategies(premises, conclusion);
              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value.recommendedStrategies.length).toBeGreaterThan(0);
              }
            },
          ),
        );
      });

      it('should maintain consistent confidence bounds', () => {
        // Generate strings with meaningful content (not just whitespace)
        const meaningfulString = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

        fc.assert(
          fc.property(
            fc.array(meaningfulString, { minLength: 1 }),
            meaningfulString,
            (premises, conclusion) => {
              const result = service.analyzeProofStrategies(premises, conclusion);
              if (result.isOk()) {
                for (const strategy of result.value.recommendedStrategies) {
                  expect(strategy.confidence).toBeGreaterThanOrEqual(0);
                  expect(strategy.confidence).toBeLessThanOrEqual(1);
                }
              }
            },
          ),
        );
      });
    });
  });

  describe('analyzeLogicalStructure', () => {
    it('should detect conditionals', () => {
      const premises = ['P → Q'];
      const conclusion = 'R';

      const structure = service.analyzeLogicalStructure(premises, conclusion);

      expect(structure.hasConditionals).toBe(true);
      expect(structure.structureType).toBe('conditional');
    });

    it('should detect negations', () => {
      const premises = ['¬P'];
      const conclusion = 'Q';

      const structure = service.analyzeLogicalStructure(premises, conclusion);

      expect(structure.hasNegations).toBe(true);
    });

    it('should detect quantifiers', () => {
      const premises = ['∀x P(x)'];
      const conclusion = '∃y Q(y)';

      const structure = service.analyzeLogicalStructure(premises, conclusion);

      expect(structure.hasQuantifiers).toBe(true);
      expect(structure.structureType).toBe('quantificational');
    });

    it('should detect modal operators', () => {
      const premises = ['□P'];
      const conclusion = '◇Q';

      const structure = service.analyzeLogicalStructure(premises, conclusion);

      expect(structure.hasModalOperators).toBe(true);
    });

    it('should calculate logical complexity based on length and symbols', () => {
      const premises = ['∀x (P(x) → Q(x))', '∃y (R(y) ∧ S(y))'];
      const conclusion = '∀z (T(z) ∨ U(z))';

      const structure = service.analyzeLogicalStructure(premises, conclusion);

      expect(structure.logicalComplexity).toBeGreaterThan(0);
      expect(typeof structure.logicalComplexity).toBe('number');
    });

    it('should identify disjunctive structure', () => {
      const premises = ['P ∨ Q', 'R ∨ S'];
      const conclusion = 'T';

      const structure = service.analyzeLogicalStructure(premises, conclusion);

      expect(structure.structureType).toBe('disjunctive');
    });

    it('should default to basic structure', () => {
      const premises = ['P', 'Q'];
      const conclusion = 'R';

      const structure = service.analyzeLogicalStructure(premises, conclusion);

      expect(structure.structureType).toBe('basic');
      expect(structure.hasConditionals).toBe(false);
      expect(structure.hasNegations).toBe(false);
      expect(structure.hasQuantifiers).toBe(false);
      expect(structure.hasModalOperators).toBe(false);
    });
  });

  describe('analyzeDirectProofViability', () => {
    it('should return viable analysis with expected properties', () => {
      const premises = ['P', 'P → Q'];
      const conclusion = 'Q';

      const analysis = service.analyzeDirectProofViability(premises, conclusion);

      expect(analysis.viable).toBe(true);
      expect(analysis.confidence).toBe(0.8);
      expect(analysis.difficulty).toBe('medium');
      expect(analysis.steps.length).toBe(3);
      expect(analysis.rules).toContain('modus-ponens');
      expect(analysis.steps[0]).toContain('premises');
      expect(analysis.steps[2]).toContain('conclusion');
    });

    it('should provide consistent steps for any input', () => {
      // Generate strings with meaningful content (not just whitespace)
      const meaningfulString = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

      fc.assert(
        fc.property(
          fc.array(meaningfulString, { minLength: 1 }),
          meaningfulString,
          (premises, conclusion) => {
            const analysis = service.analyzeDirectProofViability(premises, conclusion);
            expect(analysis.steps.length).toBe(3);
            expect(analysis.rules.length).toBe(2);
          },
        ),
      );
    });
  });

  describe('edge cases and integration', () => {
    it('should handle complex logical expressions', () => {
      const premises = [
        '∀x ((P(x) ∧ Q(x)) → (R(x) ∨ S(x)))',
        '∃y (P(y) ∧ Q(y))',
        '∀z (¬R(z) → T(z))',
      ];
      const conclusion = '∃w (S(w) ∨ T(w))';

      const result = service.analyzeProofStrategies(premises, conclusion);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const recommendations = result.value;
        expect(recommendations.structuralAnalysis.hasQuantifiers).toBe(true);
        expect(recommendations.structuralAnalysis.hasConditionals).toBe(true);
        expect(recommendations.structuralAnalysis.hasNegations).toBe(true);
        expect(recommendations.complexityAssessment.level).toBe('high');
      }
    });

    it('should provide alternative approaches when multiple strategies available', () => {
      const premises = ['P ∨ Q', 'P → R', 'Q → R'];
      const conclusion = 'R';

      const result = service.analyzeProofStrategies(premises, conclusion);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const recommendations = result.value;
        expect(recommendations.recommendedStrategies.length).toBeGreaterThan(1);
        expect(recommendations.alternativeApproaches.length).toBeGreaterThan(0);
        expect(recommendations.alternativeApproaches[0]).toContain('Multiple proof strategies');
      }
    });

    it('should identify prerequisites for mathematical induction', () => {
      const premises = ['P(0)', '∀k (P(k) → P(k+1))'];
      const conclusion = '∀n P(n)';

      const result = service.analyzeProofStrategies(premises, conclusion);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const recommendations = result.value;
        expect(recommendations.prerequisiteChecks).toContain(
          'Understanding of natural number properties',
        );
      }
    });

    it('should handle performance with large input sets', () => {
      const largePremises = Array.from({ length: 100 }, (_, i) => `P${i} → Q${i}`);
      const conclusion = 'Final conclusion';

      const startTime = Date.now();
      const result = service.analyzeProofStrategies(largePremises, conclusion);
      const endTime = Date.now();

      expect(result.isOk()).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('complexity assessment', () => {
    it('should classify simple arguments as low complexity', () => {
      const premises = ['P'];
      const conclusion = 'Q';

      const result = service.analyzeProofStrategies(premises, conclusion);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.complexityAssessment.level).toBe('low');
        expect(result.value.complexityAssessment.score).toBeLessThan(10);
      }
    });

    it('should provide recommendations for high complexity', () => {
      const premises = [
        '∀x∀y∀z ((P(x,y) ∧ Q(y,z)) → (R(x,z) ∨ (S(x) ∧ T(y) ∧ U(z))))',
        '∃a∃b∃c (P(a,b) ∧ Q(b,c) ∧ ¬R(a,c))',
      ];
      const conclusion = '∃d∃e∃f (S(d) ∧ T(e) ∧ U(f))';

      const result = service.analyzeProofStrategies(premises, conclusion);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.complexityAssessment.level).toBe('high');
        expect(result.value.complexityAssessment.recommendations).toContain(
          'Consider breaking into smaller steps',
        );
      }
    });
  });
});
