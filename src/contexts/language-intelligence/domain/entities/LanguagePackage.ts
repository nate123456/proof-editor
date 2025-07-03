import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';
import { LanguageCapabilities } from '../value-objects/LanguageCapabilities';
import { LanguagePackageId } from '../value-objects/LanguagePackageId';
import { PackageMetadata } from '../value-objects/PackageMetadata';
import { PackageName } from '../value-objects/PackageName';
import { PackageVersion } from '../value-objects/PackageVersion';
import { Timestamp } from '../value-objects/Timestamp';
import { type InferenceRule } from './InferenceRule';

export class LanguagePackage {
  private constructor(
    private readonly id: LanguagePackageId,
    private readonly name: PackageName,
    private readonly version: PackageVersion,
    private readonly metadata: PackageMetadata,
    private readonly capabilities: LanguageCapabilities,
    private readonly timestamp: Timestamp,
    private inferenceRules: Map<string, InferenceRule>,
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
  ): Result<LanguagePackage, ValidationError> {
    const nameResult = PackageName.create(name);
    if (nameResult.isErr()) return err(nameResult.error);

    const versionResult = PackageVersion.create(version);
    if (versionResult.isErr()) return err(versionResult.error);

    return ok(
      new LanguagePackage(
        LanguagePackageId.generate(),
        nameResult.value,
        versionResult.value,
        metadata ?? PackageMetadata.createDefault(),
        capabilities,
        Timestamp.now(),
        new Map(),
        new Map(),
        parentPackageId ?? null,
        true,
        validationSettings ?? ValidationSettingsFactory.createDefault(),
        performanceTargets ?? PerformanceTargetsFactory.createDefault()
      )
    );
  }

  static createModalLogicPackage(): Result<LanguagePackage, ValidationError> {
    const capabilities = LanguageCapabilities.modalLogic();

    const validationSettings = ValidationSettingsFactory.create({
      strictMode: true,
      axiomSystem: 'S5',
      allowIncompleteProofs: false,
      enableEducationalFeedback: true,
    });

    const performanceTargets = PerformanceTargetsFactory.create({
      validationTimeMs: 10,
      analysisTimeMs: 100,
      memoryLimitMb: 50,
    });

    const packageResult = LanguagePackage.create(
      'Modal Logic',
      '1.0.0',
      capabilities,
      validationSettings,
      performanceTargets
    );

    if (packageResult.isErr()) return err(packageResult.error);

    const modalPackage = packageResult.value;

    // Add standard modal logic symbols
    modalPackage.addSymbol('necessity', '□');
    modalPackage.addSymbol('possibility', '◇');
    modalPackage.addSymbol('implication', '→');
    modalPackage.addSymbol('negation', '¬');

    return ok(modalPackage);
  }

  static createPropositionalLogicPackage(): Result<LanguagePackage, ValidationError> {
    const capabilities = LanguageCapabilities.propositionalOnly();

    const validationSettings = ValidationSettingsFactory.create({
      strictMode: false,
      allowIncompleteProofs: true,
      enableEducationalFeedback: true,
    });

    const packageResult = LanguagePackage.create(
      'Propositional Logic',
      '2.0.0',
      capabilities,
      validationSettings
    );

    if (packageResult.isErr()) return err(packageResult.error);

    const propPackage = packageResult.value;

    // Add standard propositional logic symbols
    propPackage.addSymbol('conjunction', '∧');
    propPackage.addSymbol('disjunction', '∨');
    propPackage.addSymbol('implication', '→');
    propPackage.addSymbol('biconditional', '↔');
    propPackage.addSymbol('negation', '¬');

    return ok(propPackage);
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

  getInferenceRules(): readonly InferenceRule[] {
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

  addInferenceRule(rule: InferenceRule): Result<void, ValidationError> {
    const ruleName = rule.getName().getValue();

    if (this.inferenceRules.has(ruleName)) {
      return err(new ValidationError(`Inference rule '${ruleName}' already exists`));
    }

    this.inferenceRules.set(ruleName, rule);
    return ok(undefined);
  }

  removeInferenceRule(ruleName: string): Result<void, ValidationError> {
    if (!this.inferenceRules.has(ruleName)) {
      return err(new ValidationError(`Inference rule '${ruleName}' not found`));
    }

    this.inferenceRules.delete(ruleName);
    return ok(undefined);
  }

  getInferenceRule(ruleName: string): InferenceRule | null {
    return this.inferenceRules.get(ruleName) ?? null;
  }

  addSymbol(symbolName: string, symbolValue: string): Result<void, ValidationError> {
    if (!symbolName || symbolName.trim().length === 0) {
      return err(new ValidationError('Symbol name cannot be empty'));
    }

    if (!symbolValue || symbolValue.trim().length === 0) {
      return err(new ValidationError('Symbol value cannot be empty'));
    }

    this.symbols.set(symbolName.trim(), symbolValue.trim());
    return ok(undefined);
  }

  removeSymbol(symbolName: string): Result<void, ValidationError> {
    if (!this.symbols.has(symbolName)) {
      return err(new ValidationError(`Symbol '${symbolName}' not found`));
    }

    this.symbols.delete(symbolName);
    return ok(undefined);
  }

  getSymbol(symbolName: string): string | null {
    return this.symbols.get(symbolName) ?? null;
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

  getActiveInferenceRules(): InferenceRule[] {
    return Array.from(this.inferenceRules.values()).filter(rule => rule.isRuleActive());
  }

  findMatchingRules(premises: string[], conclusions: string[]): InferenceRule[] {
    return this.getActiveInferenceRules().filter(rule =>
      rule.matchesPattern(premises, conclusions)
    );
  }

  isCompatibleWith(otherPackage: LanguagePackage): boolean {
    return this.capabilities.isCompatibleWith(otherPackage.capabilities);
  }

  extendsPackage(packageId: LanguagePackageId): boolean {
    return this.parentPackageId?.equals(packageId) ?? false;
  }

  getRuleCount(): number {
    return this.inferenceRules.size;
  }

  getSymbolCount(): number {
    return this.symbols.size;
  }

  getSupportedConnectives(): readonly string[] {
    return this.capabilities.getSupportedConnectives();
  }

  getSupportedQuantifiers(): readonly string[] {
    return this.capabilities.getSupportedQuantifiers();
  }

  getSupportedModalOperators(): readonly string[] {
    return this.capabilities.getSupportedModalOperators();
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
      isLarge: ruleCount > 50 || symbolCount > 100,
    };
  }

  equals(other: LanguagePackage): boolean {
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

export class ValidationSettingsFactory {
  static createDefault(): ValidationSettings {
    return {
      strictMode: false,
      allowIncompleteProofs: true,
      enableEducationalFeedback: true,
      maxProofDepth: 100,
    };
  }

  static create(settings: Partial<ValidationSettings>): ValidationSettings {
    return {
      ...ValidationSettingsFactory.createDefault(),
      ...settings,
    };
  }
}

export class PerformanceTargetsFactory {
  static createDefault(): PerformanceTargets {
    return {
      validationTimeMs: 10,
      analysisTimeMs: 100,
      memoryLimitMb: 50,
      maxConcurrentValidations: 5,
    };
  }

  static create(targets: Partial<PerformanceTargets>): PerformanceTargets {
    return {
      ...PerformanceTargetsFactory.createDefault(),
      ...targets,
    };
  }
}
