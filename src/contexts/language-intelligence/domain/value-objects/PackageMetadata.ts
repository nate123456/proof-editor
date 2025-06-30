import { Result } from "../../../../domain/shared/result.js"
import { ValidationError } from "../../../../domain/shared/result.js"
import { Timestamp } from './Timestamp';

export class PackageMetadata {
  private constructor(
    private readonly description: string,
    private readonly author: string,
    private readonly license: string,
    private readonly homepage: string | null,
    private readonly repository: string | null,
    private readonly tags: readonly string[],
    private readonly dependencies: readonly string[],
    private readonly createdAt: Timestamp,
    private readonly updatedAt: Timestamp,
    private readonly documentation: PackageDocumentation,
    private readonly configuration: PackageConfiguration
  ) {}

  static create(
    description: string,
    author: string,
    license: string = 'MIT',
    options: Partial<PackageMetadataOptions> = {}
  ): Result<PackageMetadata, ValidationError> {
    if (!description || description.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Package description cannot be empty')
      };
    }

    if (!author || author.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Package author cannot be empty')
      };
    }

    if (description.length > 500) {
      return {
        success: false,
        error: new ValidationError('Package description cannot exceed 500 characters')
      };
    }

    const now = Timestamp.now();
    
    return {
      success: true,
      data: new PackageMetadata(
        description.trim(),
        author.trim(),
        license.trim(),
        options.homepage || null,
        options.repository || null,
        options.tags || [],
        options.dependencies || [],
        options.createdAt || now,
        options.updatedAt || now,
        options.documentation || PackageDocumentation.createDefault(),
        options.configuration || PackageConfiguration.createDefault()
      )
    };
  }

  static createDefault(): PackageMetadata {
    const now = Timestamp.now();
    
    return new PackageMetadata(
      'Default language package',
      'System',
      'MIT',
      null,
      null,
      [],
      [],
      now,
      now,
      PackageDocumentation.createDefault(),
      PackageConfiguration.createDefault()
    );
  }

  static createForModalLogic(): Result<PackageMetadata, ValidationError> {
    return PackageMetadata.create(
      'Modal logic language package with support for necessity and possibility operators',
      'Proof Editor System',
      'MIT',
      {
        tags: ['modal-logic', 'necessity', 'possibility', 'formal-logic'],
        documentation: PackageDocumentation.create(
          'Modal Logic Package',
          'Provides comprehensive support for modal logic constructs including □ (necessity) and ◇ (possibility) operators.',
          ['Modal operators (□, ◇)', 'Possible worlds semantics', 'Axiom systems (K, T, S4, S5)']
        )
      }
    );
  }

  static createForPropositionalLogic(): Result<PackageMetadata, ValidationError> {
    return PackageMetadata.create(
      'Propositional logic language package with truth tables and satisfiability checking',
      'Proof Editor System',
      'MIT',
      {
        tags: ['propositional-logic', 'boolean-algebra', 'truth-tables', 'formal-logic'],
        documentation: PackageDocumentation.create(
          'Propositional Logic Package',
          'Provides comprehensive support for propositional logic including truth tables and satisfiability checking.',
          ['Logical operators (∧, ∨, →, ↔, ¬)', 'Truth table generation', 'SAT solving']
        )
      }
    );
  }

  getDescription(): string {
    return this.description;
  }

  getAuthor(): string {
    return this.author;
  }

  getLicense(): string {
    return this.license;
  }

  getHomepage(): string | null {
    return this.homepage;
  }

  getRepository(): string | null {
    return this.repository;
  }

  getTags(): readonly string[] {
    return this.tags;
  }

  getDependencies(): readonly string[] {
    return this.dependencies;
  }

  getCreatedAt(): Timestamp {
    return this.createdAt;
  }

  getUpdatedAt(): Timestamp {
    return this.updatedAt;
  }

  getDocumentation(): PackageDocumentation {
    return this.documentation;
  }

  getConfiguration(): PackageConfiguration {
    return this.configuration;
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag.toLowerCase());
  }

  hasDependency(dependency: string): boolean {
    return this.dependencies.includes(dependency);
  }

  isRecentlyUpdated(): boolean {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return this.updatedAt.getMilliseconds() > oneWeekAgo;
  }

  isRecentlyCreated(): boolean {
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return this.createdAt.getMilliseconds() > oneMonthAgo;
  }

  getAge(): number {
    return this.updatedAt.getAge();
  }

  withUpdatedTimestamp(): PackageMetadata {
    return new PackageMetadata(
      this.description,
      this.author,
      this.license,
      this.homepage,
      this.repository,
      this.tags,
      this.dependencies,
      this.createdAt,
      Timestamp.now(),
      this.documentation,
      this.configuration
    );
  }

  withDescription(newDescription: string): Result<PackageMetadata, ValidationError> {
    if (!newDescription || newDescription.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Package description cannot be empty')
      };
    }

    if (newDescription.length > 500) {
      return {
        success: false,
        error: new ValidationError('Package description cannot exceed 500 characters')
      };
    }

    return {
      success: true,
      data: new PackageMetadata(
        newDescription.trim(),
        this.author,
        this.license,
        this.homepage,
        this.repository,
        this.tags,
        this.dependencies,
        this.createdAt,
        Timestamp.now(),
        this.documentation,
        this.configuration
      )
    };
  }

  addTag(tag: string): PackageMetadata {
    if (this.hasTag(tag)) return this;
    
    return new PackageMetadata(
      this.description,
      this.author,
      this.license,
      this.homepage,
      this.repository,
      [...this.tags, tag.toLowerCase()],
      this.dependencies,
      this.createdAt,
      Timestamp.now(),
      this.documentation,
      this.configuration
    );
  }

  removeTag(tag: string): PackageMetadata {
    return new PackageMetadata(
      this.description,
      this.author,
      this.license,
      this.homepage,
      this.repository,
      this.tags.filter(t => t !== tag.toLowerCase()),
      this.dependencies,
      this.createdAt,
      Timestamp.now(),
      this.documentation,
      this.configuration
    );
  }

  equals(other: PackageMetadata): boolean {
    return this.description === other.description &&
           this.author === other.author &&
           this.license === other.license &&
           this.homepage === other.homepage &&
           this.repository === other.repository;
  }
}

export interface PackageMetadataOptions {
  homepage?: string;
  repository?: string;
  tags?: string[];
  dependencies?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  documentation?: PackageDocumentation;
  configuration?: PackageConfiguration;
}

export class PackageDocumentation {
  constructor(
    private readonly title: string,
    private readonly overview: string,
    private readonly features: readonly string[],
    private readonly examples: readonly string[],
    private readonly apiReference: readonly string[]
  ) {}

  static create(
    title: string,
    overview: string,
    features: string[] = [],
    examples: string[] = [],
    apiReference: string[] = []
  ): PackageDocumentation {
    return new PackageDocumentation(title, overview, features, examples, apiReference);
  }

  static createDefault(): PackageDocumentation {
    return new PackageDocumentation(
      'Default Package',
      'A default language package',
      [],
      [],
      []
    );
  }

  getTitle(): string {
    return this.title;
  }

  getOverview(): string {
    return this.overview;
  }

  getFeatures(): readonly string[] {
    return this.features;
  }

  getExamples(): readonly string[] {
    return this.examples;
  }

  getApiReference(): readonly string[] {
    return this.apiReference;
  }
}

export class PackageConfiguration {
  constructor(
    private readonly defaultValidationLevel: string,
    private readonly performanceSettings: PerformanceSettings,
    private readonly educationalSettings: EducationalSettings,
    private readonly customSettings: Record<string, unknown>
  ) {}

  static createDefault(): PackageConfiguration {
    return new PackageConfiguration(
      'semantic',
      PerformanceSettings.createDefault(),
      EducationalSettings.createDefault(),
      {}
    );
  }

  getDefaultValidationLevel(): string {
    return this.defaultValidationLevel;
  }

  getPerformanceSettings(): PerformanceSettings {
    return this.performanceSettings;
  }

  getEducationalSettings(): EducationalSettings {
    return this.educationalSettings;
  }

  getCustomSettings(): Record<string, unknown> {
    return { ...this.customSettings };
  }
}

export interface PerformanceSettings {
  maxValidationTimeMs: number;
  enableCaching: boolean;
  enableParallelValidation: boolean;
}

export interface EducationalSettings {
  enableHints: boolean;
  enableStepByStep: boolean;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
}

export class PerformanceSettings {
  static createDefault(): PerformanceSettings {
    return {
      maxValidationTimeMs: 10,
      enableCaching: true,
      enableParallelValidation: false
    };
  }
}

export class EducationalSettings {
  static createDefault(): EducationalSettings {
    return {
      enableHints: true,
      enableStepByStep: true,
      difficultyLevel: 'intermediate'
    };
  }
}