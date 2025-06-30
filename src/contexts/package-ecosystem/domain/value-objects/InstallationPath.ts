import { Result } from '../types/result.js';
import { PackageValidationError } from '../types/domain-errors.js';
import { PackageId } from './package-id.js';
import { PackageVersion } from './PackageVersion.js';

export class InstallationPath {
  private constructor(
    private readonly absolutePath: string,
    private readonly packageId: PackageId,
    private readonly version: PackageVersion,
    private readonly installationType: 'user' | 'global' | 'local'
  ) {}

  static createForUserInstall(
    packageId: PackageId,
    version: PackageVersion,
    baseUserPath: string
  ): Result<InstallationPath, PackageValidationError> {
    if (!baseUserPath || !baseUserPath.trim()) {
      return Result.failure(new PackageValidationError('Base user path cannot be empty'));
    }

    const normalizedBasePath = baseUserPath.trim().replace(/\\/g, '/');
    const packagePath = `${normalizedBasePath}/packages/${packageId.toString()}/${version.toString()}`;
    
    return Result.success(new InstallationPath(packagePath, packageId, version, 'user'));
  }

  static createForGlobalInstall(
    packageId: PackageId,
    version: PackageVersion,
    baseGlobalPath: string
  ): Result<InstallationPath, PackageValidationError> {
    if (!baseGlobalPath || !baseGlobalPath.trim()) {
      return Result.failure(new PackageValidationError('Base global path cannot be empty'));
    }

    const normalizedBasePath = baseGlobalPath.trim().replace(/\\/g, '/');
    const packagePath = `${normalizedBasePath}/packages/${packageId.toString()}/${version.toString()}`;
    
    return Result.success(new InstallationPath(packagePath, packageId, version, 'global'));
  }

  static createForLocalInstall(
    packageId: PackageId,
    version: PackageVersion,
    projectPath: string
  ): Result<InstallationPath, PackageValidationError> {
    if (!projectPath || !projectPath.trim()) {
      return Result.failure(new PackageValidationError('Project path cannot be empty'));
    }

    const normalizedProjectPath = projectPath.trim().replace(/\\/g, '/');
    const packagePath = `${normalizedProjectPath}/.proof-editor/packages/${packageId.toString()}/${version.toString()}`;
    
    return Result.success(new InstallationPath(packagePath, packageId, version, 'local'));
  }

  static fromAbsolutePath(
    absolutePath: string,
    packageId: PackageId,
    version: PackageVersion
  ): Result<InstallationPath, PackageValidationError> {
    if (!absolutePath || !absolutePath.trim()) {
      return Result.failure(new PackageValidationError('Absolute path cannot be empty'));
    }

    const normalizedPath = absolutePath.trim().replace(/\\/g, '/');
    
    if (!this.isAbsolutePath(normalizedPath)) {
      return Result.failure(new PackageValidationError('Path must be absolute'));
    }

    const installationType = this.determineInstallationType(normalizedPath);
    
    return Result.success(new InstallationPath(normalizedPath, packageId, version, installationType));
  }

  private static isAbsolutePath(path: string): boolean {
    return path.startsWith('/') || /^[A-Za-z]:/.test(path);
  }

  private static determineInstallationType(path: string): 'user' | 'global' | 'local' {
    if (path.includes('/.proof-editor/packages/')) {
      return 'local';
    }
    
    if (path.includes('/global/') || path.includes('/usr/') || path.includes('/opt/')) {
      return 'global';
    }
    
    return 'user';
  }

  getAbsolutePath(): string {
    return this.absolutePath;
  }

  getPackageId(): PackageId {
    return this.packageId;
  }

  getVersion(): PackageVersion {
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
    if (!subdirectory || !subdirectory.trim()) {
      return Result.failure(new PackageValidationError('Subdirectory cannot be empty'));
    }

    const normalizedSubdir = subdirectory.trim().replace(/\\/g, '/');
    
    if (normalizedSubdir.startsWith('/') || normalizedSubdir.startsWith('../')) {
      return Result.failure(new PackageValidationError('Subdirectory must be relative and cannot escape package directory'));
    }

    return Result.success(`${this.absolutePath}/${normalizedSubdir}`);
  }

  equals(other: InstallationPath): boolean {
    return (
      this.absolutePath === other.absolutePath &&
      this.packageId.equals(other.packageId) &&
      this.version.equals(other.version) &&
      this.installationType === other.installationType
    );
  }

  toString(): string {
    return this.absolutePath;
  }

  toJSON(): object {
    return {
      absolutePath: this.absolutePath,
      packageId: this.packageId.toString(),
      version: this.version.toString(),
      installationType: this.installationType
    };
  }
}