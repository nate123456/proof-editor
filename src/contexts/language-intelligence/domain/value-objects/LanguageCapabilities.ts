import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class LanguageCapabilities {
  private constructor(private readonly capabilities: Set<string>) {}

  static create(capabilities: string[]): Result<LanguageCapabilities, ValidationError> {
    if (!capabilities || capabilities.length === 0) {
      return err(new ValidationError('At least one capability must be provided'));
    }

    const validatedCapabilities = new Set<string>();

    for (const capability of capabilities) {
      if (!capability || capability.trim().length === 0) {
        return err(new ValidationError('Capability cannot be empty'));
      }

      const trimmed = capability.trim().toLowerCase();

      if (!LanguageCapabilities.isValidCapability(trimmed)) {
        return err(new ValidationError(`Invalid capability: ${capability}`));
      }

      validatedCapabilities.add(trimmed);
    }

    return ok(new LanguageCapabilities(validatedCapabilities));
  }

  static createEmpty(): LanguageCapabilities {
    return new LanguageCapabilities(new Set());
  }

  static createPropositionalLogic(): Result<LanguageCapabilities, ValidationError> {
    return LanguageCapabilities.create([
      'propositional-operators',
      'truth-tables',
      'satisfiability-checking',
      'tautology-validation',
      'boolean-algebra',
    ]);
  }

  static createModalLogic(): Result<LanguageCapabilities, ValidationError> {
    return LanguageCapabilities.create([
      'modal-operators',
      'possible-worlds',
      'necessity-validation',
      'possibility-validation',
      'accessibility-relations',
      'modal-axioms',
    ]);
  }

  static createFirstOrderLogic(): Result<LanguageCapabilities, ValidationError> {
    return LanguageCapabilities.create([
      'quantifiers',
      'predicate-logic',
      'function-symbols',
      'variable-binding',
      'unification',
      'herbrand-universe',
    ]);
  }

  private static isValidCapability(capability: string): boolean {
    const validCapabilities = new Set([
      // Propositional Logic
      'propositional-operators',
      'truth-tables',
      'satisfiability-checking',
      'tautology-validation',
      'boolean-algebra',
      'cnf-conversion',
      'dnf-conversion',

      // Modal Logic
      'modal-operators',
      'possible-worlds',
      'necessity-validation',
      'possibility-validation',
      'accessibility-relations',
      'modal-axioms',
      'temporal-logic',
      'deontic-logic',
      'epistemic-logic',

      // First Order Logic
      'quantifiers',
      'predicate-logic',
      'function-symbols',
      'variable-binding',
      'unification',
      'herbrand-universe',
      'skolemization',
      'resolution-theorem-proving',

      // Higher Order Logic
      'higher-order-quantification',
      'lambda-abstraction',
      'type-theory',

      // Proof Systems
      'natural-deduction',
      'sequent-calculus',
      'resolution',
      'tableau-method',
      'hilbert-system',

      // Syntax and Parsing
      'syntax-highlighting',
      'parse-trees',
      'error-recovery',
      'incremental-parsing',

      // Validation and Analysis
      'syntax-validation',
      'semantic-validation',
      'type-checking',
      'proof-checking',
      'consistency-checking',
      'completeness-checking',

      // Educational Features
      'step-by-step-guidance',
      'hint-generation',
      'error-explanation',
      'proof-visualization',
      'interactive-exercises',

      // Performance Features
      'parallel-validation',
      'caching',
      'incremental-validation',
      'lazy-evaluation',

      // Integration Features
      'lsp-support',
      'vscode-integration',
      'web-compatibility',
      'mobile-support',

      // Custom Extensions
      'custom-rules',
      'plugin-system',
      'scripting-support',
      'api-extensions',
    ]);

    return validCapabilities.has(capability);
  }

  hasCapability(capability: string): boolean {
    return this.capabilities.has(capability.toLowerCase().trim());
  }

  getCapabilities(): readonly string[] {
    return Array.from(this.capabilities).sort();
  }

  getCapabilityCount(): number {
    return this.capabilities.size;
  }

  addCapability(capability: string): Result<LanguageCapabilities, ValidationError> {
    const trimmed = capability.trim().toLowerCase();

    if (!LanguageCapabilities.isValidCapability(trimmed)) {
      return err(new ValidationError(`Invalid capability: ${capability}`));
    }

    const newCapabilities = new Set(this.capabilities);
    newCapabilities.add(trimmed);

    return ok(new LanguageCapabilities(newCapabilities));
  }

  removeCapability(capability: string): LanguageCapabilities {
    const newCapabilities = new Set(this.capabilities);
    newCapabilities.delete(capability.toLowerCase().trim());
    return new LanguageCapabilities(newCapabilities);
  }

  combineWith(other: LanguageCapabilities): LanguageCapabilities {
    const combined = new Set([...this.capabilities, ...other.capabilities]);
    return new LanguageCapabilities(combined);
  }

  intersectWith(other: LanguageCapabilities): LanguageCapabilities {
    const intersection = new Set<string>();

    for (const capability of this.capabilities) {
      if (other.capabilities.has(capability)) {
        intersection.add(capability);
      }
    }

    return new LanguageCapabilities(intersection);
  }

  isCompatibleWith(other: LanguageCapabilities): boolean {
    // Compatible if they share at least one core capability
    const coreCapabilities = new Set([
      'propositional-operators',
      'modal-operators',
      'quantifiers',
      'syntax-validation',
      'semantic-validation',
    ]);

    for (const capability of this.capabilities) {
      if (coreCapabilities.has(capability) && other.capabilities.has(capability)) {
        return true;
      }
    }

    return false;
  }

  supportsPropositionalLogic(): boolean {
    return this.hasCapability('propositional-operators');
  }

  supportsModalLogic(): boolean {
    return this.hasCapability('modal-operators');
  }

  supportsFirstOrderLogic(): boolean {
    return this.hasCapability('quantifiers');
  }

  supportsHigherOrderLogic(): boolean {
    return this.hasCapability('higher-order-quantification');
  }

  supportsProofSystems(): boolean {
    return (
      this.hasCapability('natural-deduction') ||
      this.hasCapability('sequent-calculus') ||
      this.hasCapability('resolution') ||
      this.hasCapability('tableau-method')
    );
  }

  supportsEducationalFeatures(): boolean {
    return (
      this.hasCapability('step-by-step-guidance') ||
      this.hasCapability('hint-generation') ||
      this.hasCapability('error-explanation')
    );
  }

  getLogicLevel(): LogicLevel {
    if (this.supportsHigherOrderLogic()) return 'higher-order';
    if (this.supportsFirstOrderLogic()) return 'first-order';
    if (this.supportsModalLogic()) return 'modal';
    if (this.supportsPropositionalLogic()) return 'propositional';
    return 'basic';
  }

  getCapabilitiesByCategory(): CapabilityCategories {
    const categories: CapabilityCategories = {
      logic: [],
      proofSystems: [],
      syntax: [],
      validation: [],
      educational: [],
      performance: [],
      integration: [],
      custom: [],
    };

    for (const capability of this.capabilities) {
      if (
        capability.includes('logic') ||
        capability.includes('operators') ||
        capability.includes('quantifiers')
      ) {
        categories.logic.push(capability);
      } else if (
        capability.includes('deduction') ||
        capability.includes('calculus') ||
        capability.includes('resolution')
      ) {
        categories.proofSystems.push(capability);
      } else if (capability.includes('syntax') || capability.includes('parse')) {
        categories.syntax.push(capability);
      } else if (capability.includes('validation') || capability.includes('checking')) {
        categories.validation.push(capability);
      } else if (
        capability.includes('guidance') ||
        capability.includes('hint') ||
        capability.includes('explanation')
      ) {
        categories.educational.push(capability);
      } else if (
        capability.includes('parallel') ||
        capability.includes('caching') ||
        capability.includes('performance')
      ) {
        categories.performance.push(capability);
      } else if (
        capability.includes('lsp') ||
        capability.includes('vscode') ||
        capability.includes('integration')
      ) {
        categories.integration.push(capability);
      } else if (
        capability.includes('custom') ||
        capability.includes('plugin') ||
        capability.includes('extension')
      ) {
        categories.custom.push(capability);
      }
    }

    return categories;
  }

  equals(other: LanguageCapabilities): boolean {
    if (this.capabilities.size !== other.capabilities.size) {
      return false;
    }

    for (const capability of this.capabilities) {
      if (!other.capabilities.has(capability)) {
        return false;
      }
    }

    return true;
  }

  toString(): string {
    return Array.from(this.capabilities).sort().join(', ');
  }
}

export type LogicLevel = 'basic' | 'propositional' | 'modal' | 'first-order' | 'higher-order';

export interface CapabilityCategories {
  logic: string[];
  proofSystems: string[];
  syntax: string[];
  validation: string[];
  educational: string[];
  performance: string[];
  integration: string[];
  custom: string[];
}
