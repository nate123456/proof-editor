import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { ValidationError } from '../../errors/DomainErrors';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ContentAdaptation {
  adaptedContent: string;
  originalContent: string;
  targetLevel: LearningLevel;
  simplifications: string[];
  addedExplanations: string[];
  technicalTermsAdded: string[];
}

export interface ConceptContent {
  title: string;
  description: string;
  examples: string[];
  keyPoints: string[];
  prerequisites: string[];
  nextSteps: string[];
}

export interface RelatedTopics {
  prerequisites: string[];
  related: string[];
  advanced: string[];
  suggestions: string[];
  userLevelAppropriate: string[];
}

@injectable()
export class ContentAdaptationService {
  adaptContentToUserLevel(
    content: string,
    userLevel: LearningLevel,
  ): Result<ContentAdaptation, ValidationError> {
    try {
      let adaptedContent = content;
      const simplifications: string[] = [];
      const addedExplanations: string[] = [];
      const technicalTermsAdded: string[] = [];

      switch (userLevel) {
        case 'beginner':
          // Simplify language, add more explanations
          adaptedContent = this.simplifyForBeginner(content);
          simplifications.push('Replaced technical terms with simpler language');
          addedExplanations.push('Added basic explanations for logical concepts');
          break;
        case 'intermediate':
          // Standard explanations with moderate detail
          adaptedContent = this.adaptForIntermediate(content);
          addedExplanations.push('Added contextual clarifications for technical terms');
          break;
        case 'advanced':
          // More concise, technical language
          adaptedContent = this.adaptForAdvanced(content);
          technicalTermsAdded.push('Used precise technical terminology');
          break;
      }

      return ok({
        originalContent: content,
        adaptedContent,
        targetLevel: userLevel,
        simplifications,
        addedExplanations,
        technicalTermsAdded,
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to adapt content to user level',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  generateContentForConcept(
    concept: string,
    userLevel: LearningLevel = 'intermediate',
    languagePackage?: LanguagePackage,
  ): Result<ConceptContent, ValidationError> {
    try {
      const conceptMap: Record<string, ConceptContent> = {
        'logical-operators': {
          title: 'Logical Operators',
          description: 'Basic building blocks of logical expressions',
          examples: [
            'P ∧ Q (conjunction)',
            'P ∨ Q (disjunction)',
            'P → Q (implication)',
            '¬P (negation)',
          ],
          keyPoints: [
            'Conjunction (∧) means "and" - both must be true',
            'Disjunction (∨) means "or" - at least one must be true',
            'Implication (→) means "if...then"',
            'Negation (¬) means "not"',
          ],
          prerequisites: [],
          nextSteps: ['truth-tables', 'compound-statements'],
        },
        'inference-rules': {
          title: 'Inference Rules',
          description: 'Valid patterns of logical reasoning',
          examples: [
            'Modus Ponens: P, P → Q ∴ Q',
            'Modus Tollens: ¬Q, P → Q ∴ ¬P',
            'Hypothetical Syllogism: P → Q, Q → R ∴ P → R',
          ],
          keyPoints: [
            'Inference rules preserve truth',
            'If premises are true, conclusion must be true',
            'Each rule has a specific pattern',
          ],
          prerequisites: ['logical-operators'],
          nextSteps: ['proof-strategies', 'formal-proofs'],
        },
        'modal-logic': {
          title: 'Modal Logic',
          description: 'Logic of necessity and possibility',
          examples: [
            '□P means "P is necessarily true"',
            '◇P means "P is possibly true"',
            '□P → ◇P (necessity implies possibility)',
          ],
          keyPoints: [
            'Modal operators express modes of truth',
            'Necessity is stronger than possibility',
            'Different modal systems have different axioms',
          ],
          prerequisites: ['propositional-logic'],
          nextSteps: ['temporal-logic', 'epistemic-logic'],
        },
        quantifiers: {
          title: 'Quantifiers',
          description: 'Express statements about quantities of objects',
          examples: [
            '∀x P(x) means "for all x, P(x) is true"',
            '∃x P(x) means "there exists an x such that P(x) is true"',
            '∀x∃y R(x,y) means "for every x, there exists a y such that R(x,y)"',
          ],
          keyPoints: [
            'Universal quantifier (∀) applies to all objects',
            'Existential quantifier (∃) requires at least one object',
            'Order of quantifiers matters in nested statements',
            'Variables must be properly bound by quantifiers',
          ],
          prerequisites: ['predicate-logic', 'variable-binding'],
          nextSteps: ['nested-quantifiers', 'higher-order-logic'],
        },
        'proof-by-contradiction': {
          title: 'Proof by Contradiction',
          description: 'Indirect proof method using logical contradiction',
          examples: [
            'To prove P: assume ¬P, derive contradiction, conclude P',
            'Prove √2 is irrational by assuming it is rational',
            'Show infinitely many primes by assuming finitely many',
          ],
          keyPoints: [
            'Assume the negation of what you want to prove',
            'Use valid logical steps to derive a contradiction',
            'The contradiction shows the assumption must be false',
            'Therefore the original statement must be true',
          ],
          prerequisites: ['negation', 'logical-inference'],
          nextSteps: ['proof-by-contrapositive', 'constructive-proofs'],
        },
      };

      let baseContent = conceptMap[concept] ?? {
        title: this.formatConceptTitle(concept),
        description: `Information about ${concept}`,
        examples: [],
        keyPoints: [],
        prerequisites: [],
        nextSteps: [],
      };

      // Adapt content based on user level
      baseContent = this.adaptConceptContent(baseContent, userLevel);

      // Add language package specific information
      if (languagePackage) {
        this.enrichWithLanguagePackageInfo(baseContent, concept, languagePackage);
      }

      return ok(baseContent);
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to generate content for concept',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  suggestRelatedTopics(
    currentTopic: string,
    userLevel: LearningLevel = 'intermediate',
    languagePackage?: LanguagePackage,
  ): Result<RelatedTopics, ValidationError> {
    try {
      const topicRelations: Record<
        string,
        { prerequisites: string[]; related: string[]; advanced: string[] }
      > = {
        'logical-operators': {
          prerequisites: [],
          related: ['truth-tables', 'boolean-algebra'],
          advanced: ['propositional-logic', 'logical-equivalences'],
        },
        'inference-rules': {
          prerequisites: ['logical-operators'],
          related: ['natural-deduction', 'formal-proofs'],
          advanced: ['soundness-completeness', 'proof-theory'],
        },
        'modal-logic': {
          prerequisites: ['propositional-logic', 'inference-rules'],
          related: ['possible-worlds', 'modal-operators'],
          advanced: ['temporal-logic', 'dynamic-logic'],
        },
        quantifiers: {
          prerequisites: ['propositional-logic'],
          related: ['predicate-logic', 'variable-binding'],
          advanced: ['first-order-logic', 'higher-order-logic'],
        },
        'proof-by-contradiction': {
          prerequisites: ['negation', 'logical-inference'],
          related: ['proof-by-contrapositive', 'direct-proof'],
          advanced: ['constructive-logic', 'intuitionistic-logic'],
        },
        'truth-tables': {
          prerequisites: ['logical-operators'],
          related: ['boolean-algebra', 'logical-equivalences'],
          advanced: ['satisfiability', 'tautology-checking'],
        },
      };

      const relations = topicRelations[currentTopic] ?? {
        prerequisites: [],
        related: [],
        advanced: [],
      };

      let suggestions: string[] = [];

      // Include suggestions based on user level
      switch (userLevel) {
        case 'beginner':
          suggestions = [...relations.prerequisites, ...relations.related.slice(0, 2)];
          break;
        case 'intermediate':
          suggestions = [...relations.related, ...relations.advanced.slice(0, 2)];
          break;
        case 'advanced':
          suggestions = [...relations.related, ...relations.advanced];
          break;
      }

      // Filter based on language package capabilities
      if (languagePackage) {
        suggestions = this.filterTopicsByLanguagePackage(suggestions, languagePackage);
      }

      return ok({
        prerequisites: relations.prerequisites,
        related: relations.related,
        advanced: relations.advanced,
        suggestions: Array.from(new Set(suggestions)),
        userLevelAppropriate: suggestions,
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to suggest related topics',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private simplifyForBeginner(content: string): string {
    // Replace technical terms with simpler explanations
    return content
      .replace(/logical operator/g, 'logical word like "and", "or", "not"')
      .replace(/inference rule/g, 'reasoning pattern')
      .replace(/proposition/g, 'statement')
      .replace(/tautology/g, 'statement that is always true')
      .replace(/contradiction/g, 'statement that is always false')
      .replace(/biconditional/g, 'if and only if statement')
      .replace(/quantifier/g, 'word that tells us about quantity like "all" or "some"')
      .replace(/modal operator/g, 'word about necessity or possibility')
      .replace(/semantics/g, 'meaning')
      .replace(/syntax/g, 'grammar rules')
      .replace(/validity/g, 'logical correctness')
      .replace(/soundness/g, 'truth-preserving quality');
  }

  private adaptForIntermediate(content: string): string {
    // Keep standard technical language with brief clarifications
    return content
      .replace(/\b(modus ponens)\b/g, '$1 (if P and P→Q, then Q)')
      .replace(/\b(modus tollens)\b/g, '$1 (if ¬Q and P→Q, then ¬P)')
      .replace(/\b(universal instantiation)\b/g, '$1 (from ∀x P(x) to P(a))')
      .replace(/\b(existential generalization)\b/g, '$1 (from P(a) to ∃x P(x))')
      .replace(/\b(biconditional)\b/g, '$1 (P ↔ Q, meaning P if and only if Q)')
      .replace(/\b(contrapositive)\b/g, '$1 (¬Q → ¬P from P → Q)');
  }

  private adaptForAdvanced(content: string): string {
    // Use precise technical language, assume familiarity
    return content
      .replace(/reasoning pattern/g, 'inference rule')
      .replace(/logical word/g, 'logical operator')
      .replace(/statement/g, 'proposition')
      .replace(/word that tells us about quantity/g, 'quantifier')
      .replace(/logical correctness/g, 'validity')
      .replace(/truth-preserving quality/g, 'soundness')
      .replace(/grammar rules/g, 'syntax');
  }

  private adaptConceptContent(content: ConceptContent, userLevel: LearningLevel): ConceptContent {
    switch (userLevel) {
      case 'beginner':
        return {
          ...content,
          description: this.simplifyForBeginner(content.description),
          keyPoints: content.keyPoints.map((point) => this.simplifyForBeginner(point)),
          examples: content.examples.map((example) => this.addBeginnerContext(example)),
        };
      case 'intermediate':
        return {
          ...content,
          description: this.adaptForIntermediate(content.description),
          keyPoints: content.keyPoints.map((point) => this.adaptForIntermediate(point)),
        };
      case 'advanced':
        return {
          ...content,
          description: this.adaptForAdvanced(content.description),
          keyPoints: content.keyPoints.map((point) => this.adaptForAdvanced(point)),
          examples: content.examples.map((example) => this.addAdvancedContext(example)),
        };
      default:
        return content;
    }
  }

  private addBeginnerContext(example: string): string {
    if (example.includes('∧')) {
      return `${example} (both parts must be true)`;
    }
    if (example.includes('∨')) {
      return `${example} (at least one part must be true)`;
    }
    if (example.includes('→')) {
      return `${example} (if the first part, then the second part)`;
    }
    if (example.includes('¬')) {
      return `${example} (opposite or "not")`;
    }
    return example;
  }

  private addAdvancedContext(example: string): string {
    if (example.includes('∀') && example.includes('→')) {
      return `${example} (universally quantified conditional)`;
    }
    if (example.includes('∃') && example.includes('∧')) {
      return `${example} (existentially quantified conjunction)`;
    }
    if (example.includes('□')) {
      return `${example} (alethic necessity)`;
    }
    if (example.includes('◇')) {
      return `${example} (alethic possibility)`;
    }
    return example;
  }

  private formatConceptTitle(concept: string): string {
    return concept
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private enrichWithLanguagePackageInfo(
    content: ConceptContent,
    concept: string,
    languagePackage: LanguagePackage,
  ): void {
    if (concept === 'modal-logic' && languagePackage.supportsModalLogic()) {
      if (
        'getSupportedModalOperators' in languagePackage &&
        typeof languagePackage.getSupportedModalOperators === 'function'
      ) {
        const modalOps = (languagePackage.getSupportedModalOperators as () => unknown[])();
        if (Array.isArray(modalOps) && modalOps.length > 0) {
          content.examples.push(
            ...modalOps.map((op) => `${String(op)} - modal operator supported by this package`),
          );
        }
      }
    }

    if (concept === 'quantifiers' && languagePackage.supportsFirstOrderLogic()) {
      if (
        'getSupportedQuantifiers' in languagePackage &&
        typeof languagePackage.getSupportedQuantifiers === 'function'
      ) {
        const quantifiers = (languagePackage.getSupportedQuantifiers as () => unknown[])();
        if (Array.isArray(quantifiers) && quantifiers.length > 0) {
          content.examples.push(
            ...quantifiers.map((q) => `${String(q)} - quantifier supported by this package`),
          );
        }
      }
    }

    // Add general package information
    const symbols = Array.from(languagePackage.getSymbols().entries());
    if (symbols.length > 0 && concept === 'logical-operators') {
      content.keyPoints.push(
        `This package supports: ${symbols.map(([name, symbol]) => `${symbol} (${name})`).join(', ')}`,
      );
    }
  }

  private filterTopicsByLanguagePackage(
    topics: string[],
    languagePackage: LanguagePackage,
  ): string[] {
    return topics.filter((topic) => {
      switch (topic) {
        case 'modal-logic':
        case 'temporal-logic':
        case 'dynamic-logic':
        case 'epistemic-logic':
          return languagePackage.supportsModalLogic();
        case 'quantifiers':
        case 'predicate-logic':
        case 'first-order-logic':
        case 'higher-order-logic':
        case 'variable-binding':
        case 'nested-quantifiers':
          return languagePackage.supportsFirstOrderLogic();
        default:
          return true; // Include general topics
      }
    });
  }
}
