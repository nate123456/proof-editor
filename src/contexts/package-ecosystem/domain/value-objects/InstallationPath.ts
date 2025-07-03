import { err, ok, type Result } from 'neverthrow';

import { PackageValidationError } from '../types/domain-errors.js';
import type { PackageVersion } from './PackageVersion.js';
import type { PackageId } from './package-id.js';

export class InstallationPath {
  private constructor(
    private readonly absolutePath: string,
    private readonly packageId: PackageId | null,
    private readonly version: PackageVersion | null,
    private readonly installationType: 'user' | 'global' | 'local',
  ) {}

  static createForUserInstall(
    packageId: PackageId,
    version: PackageVersion,
    baseUserPath: string,
  ): Result<InstallationPath, PackageValidationError> {
    if (!baseUserPath?.trim()) {
      return err(new PackageValidationError('Base user path cannot be empty'));
    }

    const normalizedBasePath = baseUserPath.trim().replace(/\\/g, '/');
    const packagePath = `${normalizedBasePath}/packages/${packageId.toString()}/${version.toString()}`;

    return ok(new InstallationPath(packagePath, packageId, version, 'user'));
  }

  static createForGlobalInstall(
    packageId: PackageId,
    version: PackageVersion,
    baseGlobalPath: string,
  ): Result<InstallationPath, PackageValidationError> {
    if (!baseGlobalPath?.trim()) {
      return err(new PackageValidationError('Base global path cannot be empty'));
    }

    const normalizedBasePath = baseGlobalPath.trim().replace(/\\/g, '/');
    const packagePath = `${normalizedBasePath}/packages/${packageId.toString()}/${version.toString()}`;

    return ok(new InstallationPath(packagePath, packageId, version, 'global'));
  }

  static createForLocalInstall(
    packageId: PackageId,
    version: PackageVersion,
    projectPath: string,
  ): Result<InstallationPath, PackageValidationError> {
    if (!projectPath?.trim()) {
      return err(new PackageValidationError('Project path cannot be empty'));
    }

    const normalizedProjectPath = projectPath.trim().replace(/\\/g, '/');
    const packagePath = `${normalizedProjectPath}/.proof-editor/packages/${packageId.toString()}/${version.toString()}`;

    return ok(new InstallationPath(packagePath, packageId, version, 'local'));
  }

  static create(absolutePath: string): Result<InstallationPath, PackageValidationError> {
    if (!absolutePath?.trim()) {
      return err(new PackageValidationError('Absolute path cannot be empty'));
    }

    const normalizedPath = absolutePath.trim().replace(/\\/g, '/');

    if (!InstallationPath.isAbsolutePath(normalizedPath)) {
      return err(new PackageValidationError('Path must be absolute'));
    }

    const installationType = InstallationPath.determineInstallationType(normalizedPath);

    // For simple create method, we'll create a minimal InstallationPath
    // This is mainly for testing purposes - we'll use null as placeholders
    return ok(new InstallationPath(normalizedPath, null, null, installationType));
  }

  static fromAbsolutePath(
    absolutePath: string,
    packageId: PackageId,
    version: PackageVersion,
  ): Result<InstallationPath, PackageValidationError> {
    if (!absolutePath?.trim()) {
      return err(new PackageValidationError('Absolute path cannot be empty'));
    }

    const normalizedPath = absolutePath.trim().replace(/\\/g, '/');

    if (!InstallationPath.isAbsolutePath(normalizedPath)) {
      return err(new PackageValidationError('Path must be absolute'));
    }

    const installationType = InstallationPath.determineInstallationType(normalizedPath);

    return ok(new InstallationPath(normalizedPath, packageId, version, installationType));
  }

  private static isAbsolutePath(path: string): boolean {
    return path.startsWith('/') || /^[A-Za-z]:/.test(path);
  }

  private static determineInstallationType(path: string): 'user' | 'global' | 'local' {
    // Check for global paths first
    if (path.includes('/global/') || path.includes('/usr/') || path.includes('/opt/')) {
      return 'global';
    }

    // Check for local project paths - must be specifically in project directory
    // Local paths would be like /some/project/.proof-editor/packages
    // User paths would be like /home/user/.proof-editor/packages
    if (path.includes('/.proof-editor/packages/')) {
      // If it's in a user's home directory, it's a user install
      if (path.includes('/home/') || path.includes('/Users/') || path.includes('C:\\Users\\')) {
        return 'user';
      }
      // Otherwise it's a local project install
      return 'local';
    }

    return 'user';
  }

  getAbsolutePath(): string {
    return this.absolutePath;
  }

  getPackageId(): PackageId | null {
    return this.packageId;
  }

  getVersion(): PackageVersion | null {
    return this.version;
  }

  getInstallationType(): 'user' | 'global' | 'local' {
    return this.installationType;
  }

  getPackageDirectory(): string {
    return this.absolutePath;
  }

  getBinaryPath(binaryName: string): string {
    return `${this.absolutePath}/bin/${binaryName}`;
  }

  getManifestPath(): string {
    return `${this.absolutePath}/package.json`;
  }

  getSourcePath(): string {
    return `${this.absolutePath}/src`;
  }

  getConfigPath(): string {
    return `${this.absolutePath}/config`;
  }

  getLogPath(): string {
    return `${this.absolutePath}/logs`;
  }

  getCachePath(): string {
    return `${this.absolutePath}/cache`;
  }

  isUserInstall(): boolean {
    return this.installationType === 'user';
  }

  isGlobalInstall(): boolean {
    return this.installationType === 'global';
  }

  isLocalInstall(): boolean {
    return this.installationType === 'local';
  }

  withSubdirectory(subdirectory: string): Result<string, PackageValidationError> {
    if (!subdirectory?.trim()) {
      return err(new PackageValidationError('Subdirectory cannot be empty'));
    }

    const normalizedSubdir = subdirectory.trim().replace(/\\/g, '/');

    // Check for obvious directory traversal patterns
    if (normalizedSubdir.startsWith('/') || normalizedSubdir.startsWith('../')) {
      return err(
        new PackageValidationError(
          'Subdirectory must be relative and cannot escape package directory',
        ),
      );
    }

    // Check for embedded directory traversal patterns like "safe/../../../escape"
    if (normalizedSubdir.includes('../')) {
      return err(
        new PackageValidationError(
          'Subdirectory must be relative and cannot escape package directory',
        ),
      );
    }

    return ok(`${this.absolutePath}/${normalizedSubdir}`);
  }

  equals(other: InstallationPath): boolean {
    const packageIdEquals =
      (this.packageId === null && other.packageId === null) ||
      (this.packageId !== null &&
        other.packageId !== null &&
        this.packageId.equals(other.packageId));

    const versionEquals =
      (this.version === null && other.version === null) ||
      (this.version !== null && other.version !== null && this.version.equals(other.version));

    return (
      this.absolutePath === other.absolutePath &&
      packageIdEquals &&
      versionEquals &&
      this.installationType === other.installationType
    );
  }

  toString(): string {
    return this.absolutePath;
  }

  toJSON(): object {
    return {
      absolutePath: this.absolutePath,
      packageId: this.packageId?.toString() ?? null,
      version: this.version?.toString() ?? null,
      installationType: this.installationType,
    };
  }
}
