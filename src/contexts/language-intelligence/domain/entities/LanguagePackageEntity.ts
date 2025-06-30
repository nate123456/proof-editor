import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';
import { LanguagePackageId } from '../value-objects/LanguagePackageId';
import { PackageName } from '../value-objects/PackageName';
import { PackageVersion } from '../value-objects/PackageVersion';
import { PackageMetadata } from '../value-objects/PackageMetadata';
import { InferenceRuleEntity } from './InferenceRuleEntity';
import { Timestamp } from '../value-objects/Timestamp';
import { LanguageCapabilities } from '../value-objects/LanguageCapabilities';

export class LanguagePackageEntity {
  private constructor(
    private readonly id: LanguagePackageId,
    private readonly name: PackageName,
    private readonly version: PackageVersion,
    private readonly metadata: PackageMetadata,
    private readonly capabilities: LanguageCapabilities,
    private readonly timestamp: Timestamp,
    private inferenceRules: Map<string, InferenceRuleEntity>,
    private readonly symbols: Map<string, string>,
    private readonly parentPackageId: LanguagePackageId | null,
    private isActive: boolean,
    private readonly validationSettings: ValidationSettings,
    private readonly performanceTargets: PerformanceTargets
  ) {}

  static create(
    name: string,
    version: string,
    capabilities: LanguageCapabilities,
    validationSettings?: ValidationSettings,
    performanceTargets?: PerformanceTargets,
    parentPackageId?: LanguagePackageId,
    metadata?: PackageMetadata
  ): Result<LanguagePackageEntity, ValidationError> {
    const nameResult = PackageName.create(name);
    if (!nameResult.success) return nameResult;

    const versionResult = PackageVersion.create(version);
    if (!versionResult.success) return versionResult;

    return {
      success: true,
      data: new LanguagePackageEntity(
        LanguagePackageId.generate(),
        nameResult.data,
        versionResult.data,
        metadata || PackageMetadata.createDefault(),
        capabilities,
        Timestamp.now(),
        new Map(),
        new Map(),
        parentPackageId || null,
        true,
        validationSettings || ValidationSettings.createDefault(),
        performanceTargets || PerformanceTargets.createDefault()
      )
    };
  }

  static createModalLogicPackage(): Result<LanguagePackageEntity, ValidationError> {
    const capabilities = LanguageCapabilities.create([
      'modal-operators',
      'possible-worlds',
      'necessity-validation',
      'possibility-validation'
    ]);

    if (!capabilities.success) return capabilities;

    const validationSettings = ValidationSettings.create({
      strictMode: true,
      axiomSystem: 'S5',
      allowIncompleteProofs: false,
      enableEducationalFeedback: true
    });

    const performanceTargets = PerformanceTargets.create({
      validationTimeMs: 10,
      analysisTimeMs: 100,
      memoryLimitMb: 50
    });

    const packageResult = LanguagePackageEntity.create(
      'Modal Logic',
      '1.0.0',
      capabilities.data,
      validationSettings,
      performanceTargets
    );

    if (!packageResult.success) return packageResult;

    const modalPackage = packageResult.data;

    // Add standard modal logic symbols
    modalPackage.addSymbol('necessity', '□');
    modalPackage.addSymbol('possibility', '◇');
    modalPackage.addSymbol('implication', '→');
    modalPackage.addSymbol('negation', '¬');

    return { success: true, data: modalPackage };
  }

  static createPropositionalLogicPackage(): Result<LanguagePackageEntity, ValidationError> {
    const capabilities = LanguageCapabilities.create([
      'propositional-operators',
      'truth-tables',
      'satisfiability-checking',
      'tautology-validation'
    ]);

    if (!capabilities.success) return capabilities;

    const validationSettings = ValidationSettings.create({
      strictMode: false,
      allowIncompleteProofs: true,
      enableEducationalFeedback: true
    });

    const packageResult = LanguagePackageEntity.create(
      'Propositional Logic',
      '2.0.0',
      capabilities.data,
      validationSettings
    );

    if (!packageResult.success) return packageResult;

    const propPackage = packageResult.data;

    // Add standard propositional logic symbols
    propPackage.addSymbol('conjunction', '∧');
    propPackage.addSymbol('disjunction', '∨');
    propPackage.addSymbol('implication', '→');
    propPackage.addSymbol('biconditional', '↔');
    propPackage.addSymbol('negation', '¬');

    return { success: true, data: propPackage };
  }

  getId(): LanguagePackageId {
    return this.id;
  }

  getName(): PackageName {
    return this.name;
  }

  getVersion(): PackageVersion {
    return this.version;
  }

  getMetadata(): PackageMetadata {
    return this.metadata;
  }

  getCapabilities(): LanguageCapabilities {
    return this.capabilities;
  }

  getTimestamp(): Timestamp {
    return this.timestamp;
  }

  getInferenceRules(): readonly InferenceRuleEntity[] {
    return Array.from(this.inferenceRules.values());
  }

  getSymbols(): ReadonlyMap<string, string> {
    return new Map(this.symbols);
  }

  getParentPackageId(): LanguagePackageId | null {
    return this.parentPackageId;
  }

  isPackageActive(): boolean {
    return this.isActive;
  }

  getValidationSettings(): ValidationSettings {
    return this.validationSettings;
  }

  getPerformanceTargets(): PerformanceTargets {
    return this.performanceTargets;
  }

  addInferenceRule(rule: InferenceRuleEntity): Result<void, ValidationError> {
    const ruleName = rule.getName().getValue();
    
    if (this.inferenceRules.has(ruleName)) {
      return {
        success: false,
        error: new ValidationError(`Inference rule '${ruleName}' already exists`)
      };
    }

    this.inferenceRules.set(ruleName, rule);
    return { success: true, data: undefined };
  }

  removeInferenceRule(ruleName: string): Result<void, ValidationError> {
    if (!this.inferenceRules.has(ruleName)) {
      return {
        success: false,
        error: new ValidationError(`Inference rule '${ruleName}' not found`)
      };
    }

    this.inferenceRules.delete(ruleName);
    return { success: true, data: undefined };
  }

  getInferenceRule(ruleName: string): InferenceRuleEntity | null {
    return this.inferenceRules.get(ruleName) || null;
  }

  addSymbol(symbolName: string, symbolValue: string): Result<void, ValidationError> {
    if (!symbolName || symbolName.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Symbol name cannot be empty')
      };
    }

    if (!symbolValue || symbolValue.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Symbol value cannot be empty')
      };
    }

    this.symbols.set(symbolName.trim(), symbolValue.trim());
    return { success: true, data: undefined };
  }

  removeSymbol(symbolName: string): Result<void, ValidationError> {
    if (!this.symbols.has(symbolName)) {
      return {
        success: false,
        error: new ValidationError(`Symbol '${symbolName}' not found`)
      };
    }

    this.symbols.delete(symbolName);
    return { success: true, data: undefined };
  }

  getSymbol(symbolName: string): string | null {
    return this.symbols.get(symbolName) || null;
  }

  hasSymbol(symbolName: string): boolean {
    return this.symbols.has(symbolName);
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  hasCapability(capability: string): boolean {
    return this.capabilities.hasCapability(capability);
  }

  supportsModalLogic(): boolean {
    return this.hasCapability('modal-operators');
  }

  supportsFirstOrderLogic(): boolean {
    return this.hasCapability('quantifiers');
  }

  supportsPropositionalLogic(): boolean {
    return this.hasCapability('propositional-operators');
  }

  getActiveInferenceRules(): InferenceRuleEntity[] {
    return Array.from(this.inferenceRules.values()).filter(rule => rule.isRuleActive());
  }

  findMatchingRules(premises: string[], conclusions: string[]): InferenceRuleEntity[] {
    return this.getActiveInferenceRules().filter(rule => 
      rule.matchesPattern(premises, conclusions)
    );
  }

  isCompatibleWith(otherPackage: LanguagePackageEntity): boolean {
    return this.capabilities.isCompatibleWith(otherPackage.capabilities);
  }

  extendsPackage(packageId: LanguagePackageId): boolean {
    return this.parentPackageId?.equals(packageId) || false;
  }

  getRuleCount(): number {
    return this.inferenceRules.size;
  }

  getSymbolCount(): number {
    return this.symbols.size;
  }

  getPackageSize(): PackageSize {
    const ruleCount = this.getRuleCount();
    const symbolCount = this.getSymbolCount();
    const capabilityCount = this.capabilities.getCapabilityCount();

    return {
      ruleCount,
      symbolCount,
      capabilityCount,
      totalSize: ruleCount + symbolCount + capabilityCount,
      isLarge: ruleCount > 50 || symbolCount > 100
    };
  }

  equals(other: LanguagePackageEntity): boolean {
    return this.id.equals(other.id);
  }
}

export interface ValidationSettings {
  strictMode: boolean;
  axiomSystem?: string;
  allowIncompleteProofs: boolean;
  enableEducationalFeedback: boolean;
  maxProofDepth?: number;
  customValidators?: string[];
}

export interface PerformanceTargets {
  validationTimeMs: number;
  analysisTimeMs: number;
  memoryLimitMb: number;
  maxConcurrentValidations?: number;
}

export interface PackageSize {
  ruleCount: number;
  symbolCount: number;
  capabilityCount: number;
  totalSize: number;
  isLarge: boolean;
}

export class ValidationSettings {
  static createDefault(): ValidationSettings {
    return {
      strictMode: false,
      allowIncompleteProofs: true,
      enableEducationalFeedback: true,
      maxProofDepth: 100
    };
  }

  static create(settings: Partial<ValidationSettings>): ValidationSettings {
    return {
      ...ValidationSettings.createDefault(),
      ...settings
    };
  }
}

export class PerformanceTargets {
  static createDefault(): PerformanceTargets {
    return {
      validationTimeMs: 10,
      analysisTimeMs: 100,
      memoryLimitMb: 50,
      maxConcurrentValidations: 5
    };
  }

  static create(targets: Partial<PerformanceTargets>): PerformanceTargets {
    return {
      ...PerformanceTargets.createDefault(),
      ...targets
    };
  }
}