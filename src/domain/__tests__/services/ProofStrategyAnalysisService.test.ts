import fc from 'fast-check';
import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProofStrategyAnalysisService } from '../../services/ProofStrategyAnalysisService.js';
import { ValidationError } from '../../shared/result.js';
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
        const premisesResult = [
          StatementContent.create('P ∨ Q'),
          StatementContent.create('P → R'),
          StatementContent.create('Q → R'),
        ];
        const conclusionResult = StatementContent.create('R');

        expect(premisesResult.every((p) => p.isOk())).toBe(true);
        expect(conclusionResult.isOk()).toBe(true);

        if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
          const premises = premisesResult.map((p) => p.value);
          const conclusion = conclusionResult.value;

          const result = service.analyzeProofStrategies(premises, conclusion);

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const analysis = result.value;
            const casesProof = analysis
              .getStrategies()
              .find((s) => s.getName() === 'Proof by Cases');
            expect(casesProof).toBeDefined();
            expect(casesProof?.getConfidence().getValue()).toBeGreaterThan(0.8);
          }
        }
      });

      it('should recommend mathematical induction for universal quantification over naturals', () => {
        const premisesResult = [
          StatementContent.create('Base case: P(1)'),
          StatementContent.create('Inductive step: P(k) → P(k+1)'),
        ];
        const conclusionResult = StatementContent.create('∀n ∈ ℕ, P(n)');

        expect(premisesResult.every((p) => p.isOk())).toBe(true);
        expect(conclusionResult.isOk()).toBe(true);

        if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
          const premises = premisesResult.map((p) => p.value);
          const conclusion = conclusionResult.value;

          const result = service.analyzeProofStrategies(premises, conclusion);

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const analysis = result.value;
            const inductionProof = analysis
              .getStrategies()
              .find((s) => s.getName() === 'Mathematical Induction');
            expect(inductionProof).toBeDefined();
            expect(inductionProof?.getConfidence().getValue()).toBe(0.9);
            expect(inductionProof?.getDifficulty()).toBe('hard');
          }
        }
      });

      it('should sort strategies by confidence in descending order', () => {
        const premisesResult = [
          StatementContent.create('P ∨ Q'),
          StatementContent.create('P → R'),
          StatementContent.create('Q → R'),
        ];
        const conclusionResult = StatementContent.create('R');

        expect(premisesResult.every((p) => p.isOk())).toBe(true);
        expect(conclusionResult.isOk()).toBe(true);

        if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
          const premises = premisesResult.map((p) => p.value);
          const conclusion = conclusionResult.value;

          const result = service.analyzeProofStrategies(premises, conclusion);

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const strategies = result.value.getStrategies();
            for (let i = 0; i < strategies.length - 1; i++) {
              const current = strategies[i];
              const next = strategies[i + 1];
              if (current && next) {
                expect(current.getConfidence().getValue()).toBeGreaterThanOrEqual(
                  next.getConfidence().getValue(),
                );
              }
            }
          }
        }
      });
    });

    describe('error cases', () => {
      it('should return error for empty premises', () => {
        const premises: StatementContent[] = [];
        const conclusionResult = StatementContent.create('Some conclusion');

        expect(conclusionResult.isOk()).toBe(true);
        if (conclusionResult.isOk()) {
          const conclusion = conclusionResult.value;
          const result = service.analyzeProofStrategies(premises, conclusion);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toContain('empty premises');
          }
        }
      });

      it('should return error for empty conclusion', () => {
        const premisesResult = [StatementContent.create('Some premise')];
        const conclusionResult = StatementContent.create('');

        expect(premisesResult.every((p) => p.isOk())).toBe(true);
        expect(conclusionResult.isErr()).toBe(true);
      });

      it('should return error for whitespace-only conclusion', () => {
        const premisesResult = [StatementContent.create('Some premise')];
        const conclusionResult = StatementContent.create('   ');

        expect(premisesResult.every((p) => p.isOk())).toBe(true);
        expect(conclusionResult.isErr()).toBe(true);
      });

      it('should return error for whitespace-only premises', () => {
        const premisesResult = [
          StatementContent.create('Some premise'),
          StatementContent.create('   '),
          StatementContent.create('Another premise'),
        ];
        const conclusionResult = StatementContent.create('Some conclusion');

        expect(premisesResult[1]?.isErr()).toBe(true);
      });

      it('should return error for empty string premises', () => {
        const premisesResult = [
          StatementContent.create('Valid premise'),
          StatementContent.create(''),
          StatementContent.create('Another premise'),
        ];
        const conclusionResult = StatementContent.create('Some conclusion');

        expect(premisesResult[1]?.isErr()).toBe(true);
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
            (premiseStrings, conclusionString) => {
              const premisesResult = premiseStrings.map((p) => StatementContent.create(p));
              const conclusionResult = StatementContent.create(conclusionString);

              if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
                const premises = premisesResult.map((p) => p.value);
                const conclusion = conclusionResult.value;

                const result = service.analyzeProofStrategies(premises, conclusion);
                expect(result.isOk()).toBe(true);
                if (result.isOk()) {
                  expect(result.value.getStrategies().length).toBeGreaterThan(0);
                }
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
            (premiseStrings, conclusionString) => {
              const premisesResult = premiseStrings.map((p) => StatementContent.create(p));
              const conclusionResult = StatementContent.create(conclusionString);

              if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
                const premises = premisesResult.map((p) => p.value);
                const conclusion = conclusionResult.value;

                const result = service.analyzeProofStrategies(premises, conclusion);
                if (result.isOk()) {
                  for (const strategy of result.value.getStrategies()) {
                    expect(strategy.getConfidence().getValue()).toBeGreaterThanOrEqual(0);
                    expect(strategy.getConfidence().getValue()).toBeLessThanOrEqual(1);
                  }
                }
              }
            },
          ),
        );
      });
    });
  });

  describe('edge cases and integration', () => {
    it('should handle complex logical expressions', () => {
      const premisesResult = [
        StatementContent.create('∀x ((P(x) ∧ Q(x)) → (R(x) ∨ S(x)))'),
        StatementContent.create('∃y (P(y) ∧ Q(y))'),
        StatementContent.create('∀z (¬R(z) → T(z))'),
      ];
      const conclusionResult = StatementContent.create('∃w (S(w) ∨ T(w))');

      expect(premisesResult.every((p) => p.isOk())).toBe(true);
      expect(conclusionResult.isOk()).toBe(true);

      if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
        const premises = premisesResult.map((p) => p.value);
        const conclusion = conclusionResult.value;

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const analysis = result.value;
          const structural = analysis.getStructuralAnalysis();
          expect(structural.hasQuantifiers).toBe(true);
          expect(structural.hasConditionals).toBe(true);
          expect(structural.hasNegations).toBe(true);
          expect(analysis.getComplexityAssessment().level).toBe('high');
        }
      }
    });

    it('should provide alternative approaches when multiple strategies available', () => {
      const premisesResult = [
        StatementContent.create('P ∨ Q'),
        StatementContent.create('P → R'),
        StatementContent.create('Q → R'),
      ];
      const conclusionResult = StatementContent.create('R');

      expect(premisesResult.every((p) => p.isOk())).toBe(true);
      expect(conclusionResult.isOk()).toBe(true);

      if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
        const premises = premisesResult.map((p) => p.value);
        const conclusion = conclusionResult.value;

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const analysis = result.value;
          expect(analysis.getStrategies().length).toBeGreaterThan(1);
          expect(analysis.getAlternativeApproaches().length).toBeGreaterThan(0);
          expect(analysis.getAlternativeApproaches()[0]).toContain('Multiple proof strategies');
        }
      }
    });

    it('should identify prerequisites for mathematical induction', () => {
      const premisesResult = [
        StatementContent.create('P(0)'),
        StatementContent.create('∀k (P(k) → P(k+1))'),
      ];
      const conclusionResult = StatementContent.create('∀n P(n)');

      expect(premisesResult.every((p) => p.isOk())).toBe(true);
      expect(conclusionResult.isOk()).toBe(true);

      if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
        const premises = premisesResult.map((p) => p.value);
        const conclusion = conclusionResult.value;

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const analysis = result.value;
          expect(analysis.getPrerequisiteChecks()).toContain(
            'Understanding of natural number properties',
          );
        }
      }
    });

    it('should handle performance with large input sets', () => {
      const largePremisesResult = Array.from({ length: 100 }, (_, i) =>
        StatementContent.create(`P${i} → Q${i}`),
      );
      const conclusionResult = StatementContent.create('Final conclusion');

      expect(largePremisesResult.every((p) => p.isOk())).toBe(true);
      expect(conclusionResult.isOk()).toBe(true);

      if (largePremisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
        const largePremises = largePremisesResult.map((p) => p.value);
        const conclusion = conclusionResult.value;

        const startTime = Date.now();
        const result = service.analyzeProofStrategies(largePremises, conclusion);
        const endTime = Date.now();

        expect(result.isOk()).toBe(true);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      }
    });
  });

  describe('complexity assessment', () => {
    it('should classify simple arguments as low complexity', () => {
      const premisesResult = [StatementContent.create('P')];
      const conclusionResult = StatementContent.create('Q');

      expect(premisesResult.every((p) => p.isOk())).toBe(true);
      expect(conclusionResult.isOk()).toBe(true);

      if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
        const premises = premisesResult.map((p) => p.value);
        const conclusion = conclusionResult.value;

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const complexity = result.value.getComplexityAssessment();
          expect(complexity.level).toBe('low');
          expect(complexity.score).toBeLessThan(10);
        }
      }
    });

    it('should provide recommendations for high complexity', () => {
      const premisesResult = [
        StatementContent.create('∀x∀y∀z ((P(x,y) ∧ Q(y,z)) → (R(x,z) ∨ (S(x) ∧ T(y) ∧ U(z))))'),
        StatementContent.create('∃a∃b∃c (P(a,b) ∧ Q(b,c) ∧ ¬R(a,c))'),
      ];
      const conclusionResult = StatementContent.create('∃d∃e∃f (S(d) ∧ T(e) ∧ U(f))');

      expect(premisesResult.every((p) => p.isOk())).toBe(true);
      expect(conclusionResult.isOk()).toBe(true);

      if (premisesResult.every((p) => p.isOk()) && conclusionResult.isOk()) {
        const premises = premisesResult.map((p) => p.value);
        const conclusion = conclusionResult.value;

        const result = service.analyzeProofStrategies(premises, conclusion);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const complexity = result.value.getComplexityAssessment();
          expect(complexity.level).toBe('high');
          expect(complexity.recommendations).toContain('Consider breaking into smaller steps');
        }
      }
    });
  });
});
