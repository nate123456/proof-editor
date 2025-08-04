import { err, ok, type Result } from 'neverthrow';
import type { Statement } from '../../entities/Statement.js';
import { ValidationError } from '../result.js';
import { isInteger, ValueObject } from './common.js';
import type { AtomicArgumentId, StatementId } from './identifiers.js';

export class StatementCollection {
  private readonly statements: readonly Statement[];

  private constructor(statements: Statement[]) {
    this.statements = Object.freeze([...statements]);
  }

  static create(statements: Statement[] = []): Result<StatementCollection, ValidationError> {
    const uniqueIds = new Set<string>();
    for (const statement of statements) {
      const id = statement.getId().getValue();
      if (uniqueIds.has(id)) {
        return err(new ValidationError('Duplicate statement IDs not allowed in collection'));
      }
      uniqueIds.add(id);
    }

    return ok(new StatementCollection(statements));
  }

  static empty(): StatementCollection {
    return new StatementCollection([]);
  }

  add(statement: Statement): Result<StatementCollection, ValidationError> {
    const existingId = statement.getId().getValue();
    if (this.statements.some((s) => s.getId().getValue() === existingId)) {
      return err(new ValidationError('Statement already exists in collection'));
    }

    return ok(new StatementCollection([...this.statements, statement]));
  }

  remove(statementId: StatementId): Result<StatementCollection, ValidationError> {
    const filtered = this.statements.filter((s) => !s.getId().equals(statementId));
    if (filtered.length === this.statements.length) {
      return err(new ValidationError('Statement not found in collection'));
    }

    return ok(new StatementCollection(filtered));
  }

  replace(index: number, statement: Statement): Result<StatementCollection, ValidationError> {
    if (index < 0 || index >= this.statements.length) {
      return err(new ValidationError('Invalid index for replacement'));
    }

    const newStatements = [...this.statements];
    newStatements[index] = statement;
    return StatementCollection.create(newStatements);
  }

  getAt(index: number): Statement | undefined {
    return this.statements[index];
  }

  findById(statementId: StatementId): Statement | undefined {
    return this.statements.find((s) => s.getId().equals(statementId));
  }

  contains(statementId: StatementId): boolean {
    return this.statements.some((s) => s.getId().equals(statementId));
  }

  toArray(): readonly Statement[] {
    return this.statements;
  }

  size(): number {
    return this.statements.length;
  }

  isEmpty(): boolean {
    return this.statements.length === 0;
  }

  map<T>(fn: (statement: Statement, index: number) => T): T[] {
    return this.statements.map(fn);
  }

  filter(predicate: (statement: Statement) => boolean): StatementCollection {
    return new StatementCollection(this.statements.filter(predicate));
  }

  equals(other: StatementCollection): boolean {
    if (this.statements.length !== other.statements.length) {
      return false;
    }

    return this.statements.every((statement, index) => {
      const otherStatement = other.statements[index];
      return otherStatement !== undefined && statement.equals(otherStatement);
    });
  }
}

export class ArgumentIdCollection {
  private readonly argumentIds: readonly AtomicArgumentId[];

  private constructor(argumentIds: AtomicArgumentId[]) {
    this.argumentIds = Object.freeze([...argumentIds]);
  }

  static create(
    argumentIds: AtomicArgumentId[] = [],
  ): Result<ArgumentIdCollection, ValidationError> {
    const uniqueIds = new Set<string>();
    for (const argId of argumentIds) {
      const id = argId.getValue();
      if (uniqueIds.has(id)) {
        return err(new ValidationError('Duplicate argument IDs not allowed in collection'));
      }
      uniqueIds.add(id);
    }

    return ok(new ArgumentIdCollection(argumentIds));
  }

  static empty(): ArgumentIdCollection {
    return new ArgumentIdCollection([]);
  }

  add(argumentId: AtomicArgumentId): Result<ArgumentIdCollection, ValidationError> {
    const existingId = argumentId.getValue();
    if (this.argumentIds.some((id) => id.getValue() === existingId)) {
      return err(new ValidationError('Argument ID already exists in collection'));
    }

    return ok(new ArgumentIdCollection([...this.argumentIds, argumentId]));
  }

  remove(argumentId: AtomicArgumentId): Result<ArgumentIdCollection, ValidationError> {
    const filtered = this.argumentIds.filter((id) => !id.equals(argumentId));
    if (filtered.length === this.argumentIds.length) {
      return err(new ValidationError('Argument ID not found in collection'));
    }

    return ok(new ArgumentIdCollection(filtered));
  }

  contains(argumentId: AtomicArgumentId): boolean {
    return this.argumentIds.some((id) => id.equals(argumentId));
  }

  toArray(): readonly AtomicArgumentId[] {
    return this.argumentIds;
  }

  size(): number {
    return this.argumentIds.length;
  }

  isEmpty(): boolean {
    return this.argumentIds.length === 0;
  }

  equals(other: ArgumentIdCollection): boolean {
    if (this.argumentIds.length !== other.argumentIds.length) {
      return false;
    }

    return this.argumentIds.every((id, index) => {
      const otherId = other.argumentIds[index];
      return otherId !== undefined && id.equals(otherId);
    });
  }
}

export class FileExtensionList {
  private readonly extensions: readonly string[];

  private constructor(extensions: string[]) {
    this.extensions = Object.freeze([...extensions]);
  }

  static create(extensions: string[]): Result<FileExtensionList, ValidationError> {
    if (!Array.isArray(extensions)) {
      return err(
        new ValidationError('Extensions must be an array', {
          field: 'extensions',
          value: extensions,
        }),
      );
    }

    const validExtensions: string[] = [];
    for (const ext of extensions) {
      if (typeof ext !== 'string') {
        return err(
          new ValidationError('All extensions must be strings', { field: 'extension', value: ext }),
        );
      }

      const trimmed = ext.trim();
      if (trimmed.length === 0) {
        return err(
          new ValidationError('Extensions cannot be empty', { field: 'extension', value: ext }),
        );
      }

      // Ensure extension starts with dot or add it
      const normalized = trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
      if (!/^\.[a-zA-Z0-9]+$/.test(normalized)) {
        return err(
          new ValidationError(
            'Invalid extension format. Must contain only alphanumeric characters',
            {
              field: 'extension',
              value: ext,
            },
          ),
        );
      }

      validExtensions.push(normalized);
    }

    if (validExtensions.length === 0) {
      return err(new ValidationError('At least one extension is required'));
    }

    return ok(new FileExtensionList(validExtensions));
  }

  static fromStringArray(extensions: string[]): Result<FileExtensionList, ValidationError> {
    return FileExtensionList.create(extensions);
  }

  toArray(): readonly string[] {
    return this.extensions;
  }

  contains(extension: string): boolean {
    const normalized = extension.startsWith('.') ? extension : `.${extension}`;
    return this.extensions.includes(normalized);
  }

  size(): number {
    return this.extensions.length;
  }

  isEmpty(): boolean {
    return this.extensions.length === 0;
  }
}

export class FilePath extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<FilePath, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('File path cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();

    if (trimmed.length > 4096) {
      return err(
        new ValidationError('File path cannot exceed 4096 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    // Basic path validation - no null bytes, proper separators
    if (trimmed.includes('\0')) {
      return err(
        new ValidationError('File path cannot contain null bytes', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new FilePath(trimmed));
  }

  static fromString(value: string): Result<FilePath, ValidationError> {
    return FilePath.create(value);
  }

  isAbsolute(): boolean {
    return this.value.startsWith('/') || /^[A-Za-z]:\\/.test(this.value);
  }

  isRelative(): boolean {
    return !this.isAbsolute();
  }

  hasExtension(extension: string): boolean {
    return this.value.toLowerCase().endsWith(extension.toLowerCase());
  }

  isYamlFile(): boolean {
    return this.hasExtension('.yaml') || this.hasExtension('.yml');
  }

  isJsonFile(): boolean {
    return this.hasExtension('.json');
  }

  getExtension(): string {
    const lastDot = this.value.lastIndexOf('.');
    return lastDot === -1 ? '' : this.value.substring(lastDot);
  }

  getFileName(): string {
    const lastSlash = Math.max(this.value.lastIndexOf('/'), this.value.lastIndexOf('\\'));
    return lastSlash === -1 ? this.value : this.value.substring(lastSlash + 1);
  }

  getDirectory(): string {
    const lastSlash = Math.max(this.value.lastIndexOf('/'), this.value.lastIndexOf('\\'));
    return lastSlash === -1 ? '' : this.value.substring(0, lastSlash);
  }
}

export class FileName extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<FileName, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('File name cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();

    // Check for invalid characters in file names
    const invalidChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    for (const char of invalidChars) {
      if (trimmed.includes(char)) {
        return err(
          new ValidationError(`File name cannot contain character: ${char}`, {
            field: 'value',
            value: trimmed,
          }),
        );
      }
    }

    if (trimmed.length > 255) {
      return err(
        new ValidationError('File name cannot exceed 255 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new FileName(trimmed));
  }

  static fromString(value: string): Result<FileName, ValidationError> {
    return FileName.create(value);
  }

  getExtension(): string {
    const lastDot = this.value.lastIndexOf('.');
    return lastDot === -1 ? '' : this.value.substring(lastDot);
  }

  getBaseName(): string {
    const lastDot = this.value.lastIndexOf('.');
    return lastDot === -1 ? this.value : this.value.substring(0, lastDot);
  }

  hasExtension(extension: string): boolean {
    const ext = this.getExtension();
    return ext.toLowerCase() === extension.toLowerCase();
  }
}

export class FileSize extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<FileSize, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('File size must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > Number.MAX_SAFE_INTEGER) {
      return err(
        new ValidationError('File size exceeds maximum safe integer', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new FileSize(value));
  }

  static fromNumber(value: number): Result<FileSize, ValidationError> {
    return FileSize.create(value);
  }

  static zero(): FileSize {
    return new FileSize(0);
  }

  toHumanReadable(): string {
    const bytes = this.value;
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  }

  isEmpty(): boolean {
    return this.value === 0;
  }

  isLarge(): boolean {
    return this.value > 10 * 1024 * 1024; // > 10MB
  }
}

export class PlatformVersion extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<PlatformVersion, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(
        new ValidationError('Platform version cannot be empty', { field: 'value', value }),
      );
    }

    const trimmed = value.trim();
    if (trimmed.length > 50) {
      return err(
        new ValidationError('Platform version cannot exceed 50 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    // Basic version format validation (e.g., "1.2.3", "1.0.0-beta", etc.)
    if (!/^[\w.-]+$/.test(trimmed)) {
      return err(
        new ValidationError('Platform version contains invalid characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new PlatformVersion(trimmed));
  }

  static fromString(value: string): Result<PlatformVersion, ValidationError> {
    return PlatformVersion.create(value);
  }

  isPrerelease(): boolean {
    return this.value.includes('-') || this.value.includes('alpha') || this.value.includes('beta');
  }
}

export class Architecture extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<Architecture, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Architecture cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim().toLowerCase();
    const validArchitectures = ['x64', 'x86', 'arm64', 'arm', 'ia32', 'mips', 'ppc', 's390x'];

    if (!validArchitectures.includes(trimmed)) {
      return err(
        new ValidationError(
          `Invalid architecture. Must be one of: ${validArchitectures.join(', ')}`,
          {
            field: 'value',
            value,
          },
        ),
      );
    }

    return ok(new Architecture(trimmed));
  }

  static fromString(value: string): Result<Architecture, ValidationError> {
    return Architecture.create(value);
  }

  isX64(): boolean {
    return this.value === 'x64';
  }

  isArm(): boolean {
    return this.value.startsWith('arm');
  }
}

export class ArgumentPath {
  private readonly argumentIds: readonly AtomicArgumentId[];

  private constructor(argumentIds: AtomicArgumentId[]) {
    this.argumentIds = Object.freeze([...argumentIds]);
  }

  static create(argumentIds: AtomicArgumentId[]): Result<ArgumentPath, ValidationError> {
    if (!Array.isArray(argumentIds)) {
      return err(
        new ValidationError('Argument path must be an array', {
          field: 'argumentIds',
          value: argumentIds,
        }),
      );
    }

    if (argumentIds.length === 0) {
      return err(new ValidationError('Argument path cannot be empty'));
    }

    if (argumentIds.length > 100) {
      return err(
        new ValidationError('Argument path cannot exceed 100 arguments (cycle protection)', {
          field: 'length',
          value: argumentIds.length,
        }),
      );
    }

    // Check for cycles in the path
    const seen = new Set<string>();
    for (const argId of argumentIds) {
      const id = argId.getValue();
      if (seen.has(id)) {
        return err(
          new ValidationError('Argument path contains cycle', {
            field: 'argumentIds',
            value: id,
          }),
        );
      }
      seen.add(id);
    }

    return ok(new ArgumentPath(argumentIds));
  }

  static fromSingle(argumentId: AtomicArgumentId): ArgumentPath {
    return new ArgumentPath([argumentId]);
  }

  append(argumentId: AtomicArgumentId): Result<ArgumentPath, ValidationError> {
    if (this.contains(argumentId)) {
      return err(
        new ValidationError('Cannot add argument that would create a cycle', {
          field: 'argumentId',
          value: argumentId.getValue(),
        }),
      );
    }

    return ArgumentPath.create([...this.argumentIds, argumentId]);
  }

  prepend(argumentId: AtomicArgumentId): Result<ArgumentPath, ValidationError> {
    if (this.contains(argumentId)) {
      return err(
        new ValidationError('Cannot add argument that would create a cycle', {
          field: 'argumentId',
          value: argumentId.getValue(),
        }),
      );
    }

    return ArgumentPath.create([argumentId, ...this.argumentIds]);
  }

  contains(argumentId: AtomicArgumentId): boolean {
    return this.argumentIds.some((id) => id.equals(argumentId));
  }

  getFirst(): AtomicArgumentId | undefined {
    return this.argumentIds[0];
  }

  getLast(): AtomicArgumentId | undefined {
    return this.argumentIds[this.argumentIds.length - 1];
  }

  getAt(index: number): AtomicArgumentId | undefined {
    return this.argumentIds[index];
  }

  toArray(): readonly AtomicArgumentId[] {
    return this.argumentIds;
  }

  length(): number {
    return this.argumentIds.length;
  }

  isEmpty(): boolean {
    return this.argumentIds.length === 0;
  }

  equals(other: ArgumentPath): boolean {
    if (this.argumentIds.length !== other.argumentIds.length) {
      return false;
    }

    return this.argumentIds.every((id, index) => {
      const otherId = other.argumentIds[index];
      return otherId !== undefined && id.equals(otherId);
    });
  }

  toString(): string {
    return this.argumentIds.map((id) => id.getValue()).join(' → ');
  }
}
