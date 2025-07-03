import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

/**
 * LanguageCapabilities value object representing supported logic systems and operators
 */
export class LanguageCapabilities {
  private constructor(
    private readonly propositionalLogic: boolean,
    private readonly firstOrderLogic: boolean,
    private readonly modalLogic: boolean,
    private readonly temporalLogic: boolean,
    private readonly higherOrderLogic: boolean,
    private readonly supportedConnectives: readonly string[],
    private readonly supportedQuantifiers: readonly string[],
    private readonly supportedModalOperators: readonly string[],
    private readonly supportedTemporalOperators: readonly string[],
  ) {}

  /**
   * Creates LanguageCapabilities with explicit logic system flags and operators
   */
  static create(
    propositionalLogic: boolean,
    firstOrderLogic: boolean,
    modalLogic: boolean,
    temporalLogic: boolean,
    higherOrderLogic: boolean,
    connectives: string[],
    quantifiers: string[],
    modalOperators: string[],
    temporalOperators: string[],
  ): Result<LanguageCapabilities, ValidationError> {
    // Validate that at least one logic system is supported
    if (
      !propositionalLogic &&
      !firstOrderLogic &&
      !modalLogic &&
      !temporalLogic &&
      !higherOrderLogic
    ) {
      return err(new ValidationError('At least one logic system must be supported'));
    }

    // Validate operator consistency with logic systems
    if (!propositionalLogic && connectives.length > 0) {
      return err(
        new ValidationError('Cannot have connectives without propositional logic support'),
      );
    }

    if (!firstOrderLogic && quantifiers.length > 0) {
      return err(new ValidationError('Cannot have quantifiers without first-order logic support'));
    }

    if (!modalLogic && modalOperators.length > 0) {
      return err(new ValidationError('Cannot have modal operators without modal logic support'));
    }

    if (!temporalLogic && temporalOperators.length > 0) {
      return err(
        new ValidationError('Cannot have temporal operators without temporal logic support'),
      );
    }

    // Create immutable arrays with unique elements
    const uniqueConnectives = Array.from(new Set(connectives));
    const uniqueQuantifiers = Array.from(new Set(quantifiers));
    const uniqueModalOperators = Array.from(new Set(modalOperators));
    const uniqueTemporalOperators = Array.from(new Set(temporalOperators));

    return ok(
      new LanguageCapabilities(
        propositionalLogic,
        firstOrderLogic,
        modalLogic,
        temporalLogic,
        higherOrderLogic,
        uniqueConnectives,
        uniqueQuantifiers,
        uniqueModalOperators,
        uniqueTemporalOperators,
      ),
    );
  }

  /**
   * Creates capabilities with only propositional logic support
   */
  static propositionalOnly(): LanguageCapabilities {
    const result = LanguageCapabilities.create(
      true,
      false,
      false,
      false,
      false,
      ['∧', '∨', '→', '¬'],
      [],
      [],
      [],
    );
    if (result.isErr()) {
      throw new Error('Failed to create propositional capabilities');
    }
    return result.value;
  }

  /**
   * Creates capabilities with first-order logic support
   */
  static firstOrderLogic(): LanguageCapabilities {
    const result = LanguageCapabilities.create(
      true,
      true,
      false,
      false,
      false,
      ['∧', '∨', '→', '¬'],
      ['∀', '∃'],
      [],
      [],
    );
    if (result.isErr()) {
      throw new Error('Failed to create first-order capabilities');
    }
    return result.value;
  }

  /**
   * Creates capabilities with modal logic support
   */
  static modalLogic(): LanguageCapabilities {
    const result = LanguageCapabilities.create(
      true,
      true,
      true,
      false,
      false,
      ['∧', '∨', '→', '¬'],
      ['∀', '∃'],
      ['□', '◇'],
      [],
    );
    if (result.isErr()) {
      throw new Error('Failed to create modal capabilities');
    }
    return result.value;
  }

  /**
   * Creates capabilities with all features enabled
   */
  static fullFeatured(): LanguageCapabilities {
    const result = LanguageCapabilities.create(
      true,
      true,
      true,
      true,
      true,
      ['∧', '∨', '→', '¬', '↔', '⊕'],
      ['∀', '∃'],
      ['□', '◇'],
      ['G', 'F', 'X', 'U'],
    );
    if (result.isErr()) {
      throw new Error('Failed to create full-featured capabilities');
    }
    return result.value;
  }

  // Logic system support checks
  supportsPropositionalLogic(): boolean {
    return this.propositionalLogic;
  }

  supportsFirstOrderLogic(): boolean {
    return this.firstOrderLogic;
  }

  supportsModalLogic(): boolean {
    return this.modalLogic;
  }

  supportsTemporalLogic(): boolean {
    return this.temporalLogic;
  }

  supportsHigherOrderLogic(): boolean {
    return this.higherOrderLogic;
  }

  // Operator getters
  getSupportedConnectives(): readonly string[] {
    return this.supportedConnectives;
  }

  getSupportedQuantifiers(): readonly string[] {
    return this.supportedQuantifiers;
  }

  getSupportedModalOperators(): readonly string[] {
    return this.supportedModalOperators;
  }

  getSupportedTemporalOperators(): readonly string[] {
    return this.supportedTemporalOperators;
  }

  // Operator support checks
  supportsConnective(connective: string): boolean {
    return this.supportedConnectives.includes(connective);
  }

  supportsQuantifier(quantifier: string): boolean {
    return this.supportedQuantifiers.includes(quantifier);
  }

  supportsModalOperator(operator: string): boolean {
    return this.supportedModalOperators.includes(operator);
  }

  supportsTemporalOperator(operator: string): boolean {
    return this.supportedTemporalOperators.includes(operator);
  }

  /**
   * Checks if this capabilities set is compatible with (covers all features of) another
   */
  isCompatibleWith(other: LanguageCapabilities): boolean {
    // Check logic system compatibility
    if (other.propositionalLogic && !this.propositionalLogic) return false;
    if (other.firstOrderLogic && !this.firstOrderLogic) return false;
    if (other.modalLogic && !this.modalLogic) return false;
    if (other.temporalLogic && !this.temporalLogic) return false;
    if (other.higherOrderLogic && !this.higherOrderLogic) return false;

    // Check operator compatibility
    for (const connective of other.supportedConnectives) {
      if (!this.supportsConnective(connective)) return false;
    }

    for (const quantifier of other.supportedQuantifiers) {
      if (!this.supportsQuantifier(quantifier)) return false;
    }

    for (const modalOp of other.supportedModalOperators) {
      if (!this.supportsModalOperator(modalOp)) return false;
    }

    for (const temporalOp of other.supportedTemporalOperators) {
      if (!this.supportsTemporalOperator(temporalOp)) return false;
    }

    return true;
  }

  /**
   * Merges this capabilities with another, creating union of features
   */
  mergeWith(other: LanguageCapabilities): LanguageCapabilities {
    const mergedConnectives = Array.from(
      new Set([...this.supportedConnectives, ...other.supportedConnectives]),
    );
    const mergedQuantifiers = Array.from(
      new Set([...this.supportedQuantifiers, ...other.supportedQuantifiers]),
    );
    const mergedModalOperators = Array.from(
      new Set([...this.supportedModalOperators, ...other.supportedModalOperators]),
    );
    const mergedTemporalOperators = Array.from(
      new Set([...this.supportedTemporalOperators, ...other.supportedTemporalOperators]),
    );

    const result = LanguageCapabilities.create(
      this.propositionalLogic || other.propositionalLogic,
      this.firstOrderLogic || other.firstOrderLogic,
      this.modalLogic || other.modalLogic,
      this.temporalLogic || other.temporalLogic,
      this.higherOrderLogic || other.higherOrderLogic,
      mergedConnectives,
      mergedQuantifiers,
      mergedModalOperators,
      mergedTemporalOperators,
    );

    if (result.isErr()) {
      throw new Error('Failed to merge capabilities');
    }
    return result.value;
  }

  /**
   * Creates intersection of this capabilities with another
   */
  intersectWith(other: LanguageCapabilities): LanguageCapabilities {
    const intersectedConnectives = this.supportedConnectives.filter((c) =>
      other.supportsConnective(c),
    );
    const intersectedQuantifiers = this.supportedQuantifiers.filter((q) =>
      other.supportsQuantifier(q),
    );
    const intersectedModalOperators = this.supportedModalOperators.filter((m) =>
      other.supportsModalOperator(m),
    );
    const intersectedTemporalOperators = this.supportedTemporalOperators.filter((t) =>
      other.supportsTemporalOperator(t),
    );

    const result = LanguageCapabilities.create(
      this.propositionalLogic && other.propositionalLogic,
      this.firstOrderLogic && other.firstOrderLogic,
      this.modalLogic && other.modalLogic,
      this.temporalLogic && other.temporalLogic,
      this.higherOrderLogic && other.higherOrderLogic,
      intersectedConnectives,
      intersectedQuantifiers,
      intersectedModalOperators,
      intersectedTemporalOperators,
    );

    if (result.isErr()) {
      throw new Error('Failed to intersect capabilities');
    }
    return result.value;
  }

  /**
   * Calculates complexity score based on number of logic systems and operators
   */
  getComplexityScore(): number {
    let score = 0;

    // Logic system complexity weights
    if (this.propositionalLogic) score += 1;
    if (this.firstOrderLogic) score += 3;
    if (this.modalLogic) score += 5;
    if (this.temporalLogic) score += 7;
    if (this.higherOrderLogic) score += 10;

    // Operator complexity
    score += this.supportedConnectives.length * 0.5;
    score += this.supportedQuantifiers.length * 1;
    score += this.supportedModalOperators.length * 2;
    score += this.supportedTemporalOperators.length * 2;

    return score;
  }

  /**
   * Checks if this represents minimal capabilities (propositional only)
   */
  isMinimal(): boolean {
    return (
      this.propositionalLogic &&
      !this.firstOrderLogic &&
      !this.modalLogic &&
      !this.temporalLogic &&
      !this.higherOrderLogic
    );
  }

  /**
   * Checks if this represents extensive capabilities (multiple advanced logic systems)
   */
  isExtensive(): boolean {
    const advancedSystems = [this.modalLogic, this.temporalLogic, this.higherOrderLogic].filter(
      Boolean,
    ).length;
    return advancedSystems >= 2;
  }

  /**
   * Gets total count of supported operators
   */
  getTotalOperatorCount(): number {
    return (
      this.supportedConnectives.length +
      this.supportedQuantifiers.length +
      this.supportedModalOperators.length +
      this.supportedTemporalOperators.length
    );
  }

  /**
   * Checks if a specific capability is supported
   */
  hasCapability(capability: string): boolean {
    switch (capability.toLowerCase()) {
      case 'propositional-operators':
        return this.propositionalLogic && this.supportedConnectives.length > 0;
      case 'quantifiers':
        return this.firstOrderLogic && this.supportedQuantifiers.length > 0;
      case 'modal-operators':
        return this.modalLogic && this.supportedModalOperators.length > 0;
      case 'temporal-operators':
        return this.temporalLogic && this.supportedTemporalOperators.length > 0;
      case 'propositional':
        return this.propositionalLogic;
      case 'first-order':
        return this.firstOrderLogic;
      case 'modal':
        return this.modalLogic;
      case 'temporal':
        return this.temporalLogic;
      case 'higher-order':
        return this.higherOrderLogic;
      // Modal logic specific capabilities
      case 'possible-worlds':
        return this.modalLogic;
      case 'necessity-validation':
        return this.modalLogic && this.supportedModalOperators.includes('□');
      case 'possibility-validation':
        return this.modalLogic && this.supportedModalOperators.includes('◇');
      // Propositional logic specific capabilities
      case 'truth-tables':
        return this.propositionalLogic;
      case 'satisfiability-checking':
        return this.propositionalLogic;
      case 'tautology-validation':
        return this.propositionalLogic;
      default:
        return false;
    }
  }

  /**
   * Gets the total count of supported capabilities (major capability categories)
   */
  getCapabilityCount(): number {
    let count = 0;

    // Count capability types that are actually supported
    if (this.propositionalLogic) count++; // Propositional logic system
    if (this.propositionalLogic && this.supportedConnectives.length > 0) count++; // Propositional operators
    if (this.firstOrderLogic && this.supportedQuantifiers.length > 0) count++; // Quantifiers
    if (this.modalLogic && this.supportedModalOperators.length > 0) count++; // Modal operators
    if (this.temporalLogic && this.supportedTemporalOperators.length > 0) count++; // Temporal operators
    if (this.higherOrderLogic) count++; // Higher-order logic

    return count;
  }

  /**
   * Checks if capabilities meet minimum requirements (at least propositional logic)
   */
  meetsMinimumRequirements(): boolean {
    return this.propositionalLogic;
  }

  /**
   * Checks if a specific feature is required/supported
   */
  hasRequiredFeature(feature: string): boolean {
    switch (feature.toLowerCase()) {
      case 'propositional':
        return this.propositionalLogic;
      case 'first-order':
        return this.firstOrderLogic;
      case 'modal':
        return this.modalLogic;
      case 'temporal':
        return this.temporalLogic;
      case 'higher-order':
        return this.higherOrderLogic;
      default:
        return false;
    }
  }

  /**
   * Validates operator consistency with logic system flags
   */
  hasConsistentOperators(): boolean {
    // This is always true since validation happens at creation time
    return true;
  }

  /**
   * String representation listing supported logic systems
   */
  toString(): string {
    const systems: string[] = [];
    if (this.propositionalLogic) systems.push('propositional');
    if (this.firstOrderLogic) systems.push('first-order');
    if (this.modalLogic) systems.push('modal');
    if (this.temporalLogic) systems.push('temporal');
    if (this.higherOrderLogic) systems.push('higher-order');

    return `LanguageCapabilities[${systems.join(', ')}]`;
  }

  /**
   * Serializes to JSON format
   */
  toJSON(): LanguageCapabilitiesJSON {
    return {
      propositionalLogic: this.propositionalLogic,
      firstOrderLogic: this.firstOrderLogic,
      modalLogic: this.modalLogic,
      temporalLogic: this.temporalLogic,
      higherOrderLogic: this.higherOrderLogic,
      supportedConnectives: [...this.supportedConnectives],
      supportedQuantifiers: [...this.supportedQuantifiers],
      supportedModalOperators: [...this.supportedModalOperators],
      supportedTemporalOperators: [...this.supportedTemporalOperators],
    };
  }

  /**
   * Creates LanguageCapabilities from JSON format
   */
  static fromJSON(json: unknown): Result<LanguageCapabilities, ValidationError> {
    try {
      // Validate JSON structure
      if (typeof json !== 'object' || json === null) {
        return err(new ValidationError('JSON must be an object'));
      }

      const jsonObj = json as Record<string, unknown>;

      const { propositionalLogic } = jsonObj;
      const { firstOrderLogic } = jsonObj;
      const { modalLogic } = jsonObj;
      const { temporalLogic } = jsonObj;
      const { higherOrderLogic } = jsonObj;
      const { supportedConnectives } = jsonObj;
      const { supportedQuantifiers } = jsonObj;
      const { supportedModalOperators } = jsonObj;
      const { supportedTemporalOperators } = jsonObj;

      // Validate boolean fields
      if (
        typeof propositionalLogic !== 'boolean' ||
        typeof firstOrderLogic !== 'boolean' ||
        typeof modalLogic !== 'boolean' ||
        typeof temporalLogic !== 'boolean' ||
        typeof higherOrderLogic !== 'boolean'
      ) {
        return err(new ValidationError('Logic system flags must be boolean'));
      }

      // Validate array fields
      if (
        !Array.isArray(supportedConnectives) ||
        !Array.isArray(supportedQuantifiers) ||
        !Array.isArray(supportedModalOperators) ||
        !Array.isArray(supportedTemporalOperators)
      ) {
        return err(new ValidationError('Operator arrays must be arrays'));
      }

      // Validate and convert array contents to strings
      const validateStringArray = (arr: unknown[], name: string): string[] => {
        const result: string[] = [];
        for (const item of arr) {
          if (typeof item !== 'string') {
            throw new Error(`All ${name} must be strings`);
          }
          result.push(item);
        }
        return result;
      };

      const connectives = validateStringArray(supportedConnectives, 'connectives');
      const quantifiers = validateStringArray(supportedQuantifiers, 'quantifiers');
      const modalOperators = validateStringArray(supportedModalOperators, 'modal operators');
      const temporalOperators = validateStringArray(
        supportedTemporalOperators,
        'temporal operators',
      );

      return LanguageCapabilities.create(
        propositionalLogic,
        firstOrderLogic,
        modalLogic,
        temporalLogic,
        higherOrderLogic,
        connectives,
        quantifiers,
        modalOperators,
        temporalOperators,
      );
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}

export interface LanguageCapabilitiesJSON {
  propositionalLogic: boolean;
  firstOrderLogic: boolean;
  modalLogic: boolean;
  temporalLogic: boolean;
  higherOrderLogic: boolean;
  supportedConnectives: string[];
  supportedQuantifiers: string[];
  supportedModalOperators: string[];
  supportedTemporalOperators: string[];
}
