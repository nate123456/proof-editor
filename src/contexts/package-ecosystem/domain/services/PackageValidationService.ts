import { err, ok, type Result } from 'neverthrow';

import { type Package } from '../entities/Package.js';
import type { SDKInterface, SDKValidationResult, ValidationResult } from '../types/common-types.js';
import { PackageValidationError } from '../types/domain-errors.js';
import { type InstallationPath } from '../value-objects/InstallationPath.js';

export interface PackageValidationOptions {
  readonly validateSDKCompliance?: boolean;
  readonly checkSecurityPolicies?: boolean;
  readonly validateManifest?: boolean;
  readonly checkDependencyCompatibility?: boolean;
  readonly requireUserConsent?: boolean;
}

export interface SecurityValidationResult {
  readonly hasExecutableCode: boolean;
  readonly hasNetworkAccess: boolean;
  readonly hasFileSystemAccess: boolean;
  readonly requiresElevatedPermissions: boolean;
  readonly potentialSecurityRisks: readonly string[];
  readonly userConsentRequired: boolean;
}

export interface ManifestValidationResult extends ValidationResult {
  readonly requiredFieldsPresent: boolean;
  readonly versionFormatValid: boolean;
  readonly dependenciesValid: boolean;
  readonly lspConfigurationValid: boolean;
}

export interface IPackageFileSystem {
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Result<string, Error>>;
  listFiles(directory: string): Promise<Result<readonly string[], Error>>;
  isExecutable(path: string): Promise<boolean>;
}

export interface ISDKValidator {
  validateInterface(
    packagePath: string,
    interfaceName: string
  ): Promise<Result<SDKInterface, PackageValidationError>>;
  listImplementedInterfaces(
    packagePath: string
  ): Promise<Result<readonly SDKInterface[], PackageValidationError>>;
  checkVersionCompatibility(
    requiredVersion: string,
    actualVersion: string
  ): Result<boolean, PackageValidationError>;
}

export class PackageValidationService {
  constructor(
    private readonly fileSystem: IPackageFileSystem,
    private readonly sdkValidator: ISDKValidator
  ) {}

  async validatePackage(
    packageEntity: Package,
    installationPath: InstallationPath,
    options: PackageValidationOptions = {}
  ): Promise<Result<ValidationResult, PackageValidationError>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (options.validateManifest !== false) {
      const manifestResult = await this.validateManifest(packageEntity, installationPath);
      if (manifestResult.isErr()) {
        return err(manifestResult.error);
      }

      errors.push(...manifestResult.value.errors);
      warnings.push(...manifestResult.value.warnings);
    }

    if (options.validateSDKCompliance) {
      const sdkResult = await this.validateSDKCompliance(packageEntity, installationPath);
      if (sdkResult.isErr()) {
        return err(sdkResult.error);
      }

      errors.push(...sdkResult.value.errors);
      warnings.push(...sdkResult.value.warnings);
    }

    if (options.checkSecurityPolicies) {
      const securityResult = await this.validateSecurity(packageEntity, installationPath);
      if (securityResult.isErr()) {
        return err(securityResult.error);
      }

      if (securityResult.value.potentialSecurityRisks.length > 0) {
        warnings.push(...securityResult.value.potentialSecurityRisks);
      }
    }

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    return ok(validationResult);
  }

  async validateSDKCompliance(
    packageEntity: Package,
    installationPath: InstallationPath
  ): Promise<Result<SDKValidationResult, PackageValidationError>> {
    const packagePath = installationPath.getAbsolutePath();
    const manifest = packageEntity.getManifest();
    const expectedInterfaces = packageEntity.getSDKInterfaces();

    const implementedResult = await this.sdkValidator.listImplementedInterfaces(packagePath);
    if (implementedResult.isErr()) {
      return err(implementedResult.error);
    }

    const implementedInterfaces = implementedResult.value;
    const implementedInterfaceNames = new Set(implementedInterfaces.map(iface => iface.name));

    const missingInterfaces: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const expectedInterface of expectedInterfaces) {
      if (!implementedInterfaceNames.has(expectedInterface.name)) {
        missingInterfaces.push(expectedInterface.name);
        errors.push(`Missing required SDK interface: ${expectedInterface.name}`);
      } else {
        const implementedInterface = implementedInterfaces.find(
          iface => iface.name === expectedInterface.name
        )!;

        const versionCompatResult = this.sdkValidator.checkVersionCompatibility(
          expectedInterface.version,
          implementedInterface.version
        );

        if (versionCompatResult.isErr()) {
          return err(versionCompatResult.error);
        }

        if (!versionCompatResult.value) {
          warnings.push(
            `SDK interface ${expectedInterface.name} version mismatch: expected ${expectedInterface.version}, found ${implementedInterface.version}`
          );
        }

        const missingMethods = expectedInterface.methods.filter(
          method => !implementedInterface.methods.includes(method)
        );

        if (missingMethods.length > 0) {
          errors.push(
            `SDK interface ${expectedInterface.name} missing methods: ${missingMethods.join(', ')}`
          );
        }
      }
    }

    let versionCompatibility = true;
    const requiredProofEditorVersion = manifest.getRequiredProofEditorVersion();
    if (requiredProofEditorVersion) {
      const compatResult = this.validateProofEditorVersion(requiredProofEditorVersion);
      if (compatResult.isErr()) {
        errors.push(`Incompatible Proof Editor version requirement: ${requiredProofEditorVersion}`);
        versionCompatibility = false;
      }
    }

    const requiredNodeVersion = manifest.getRequiredNodeVersion();
    if (requiredNodeVersion) {
      const nodeCompatResult = this.validateNodeVersion(requiredNodeVersion);
      if (nodeCompatResult.isErr()) {
        errors.push(`Incompatible Node.js version requirement: ${requiredNodeVersion}`);
        versionCompatibility = false;
      }
    }

    if (packageEntity.hasLSPSupport()) {
      const lspValidationResult = await this.validateLSPConfiguration(
        packageEntity,
        installationPath
      );
      if (lspValidationResult.isErr()) {
        return err(lspValidationResult.error);
      }

      errors.push(...lspValidationResult.value.errors);
      warnings.push(...lspValidationResult.value.warnings);
    }

    const result: SDKValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      implementedInterfaces: [...implementedInterfaces],
      missingInterfaces,
      versionCompatibility,
    };

    return ok(result);
  }

  async validateSecurity(
    packageEntity: Package,
    installationPath: InstallationPath
  ): Promise<Result<SecurityValidationResult, PackageValidationError>> {
    const packagePath = installationPath.getAbsolutePath();
    const potentialSecurityRisks: string[] = [];

    let hasExecutableCode = false;
    let hasNetworkAccess = false;
    let hasFileSystemAccess = false;
    let requiresElevatedPermissions = false;

    const fileListResult = await this.fileSystem.listFiles(packagePath);
    if (fileListResult.isErr()) {
      return err(
        new PackageValidationError(`Failed to list package files: ${fileListResult.error.message}`)
      );
    }

    const executableExtensions = ['.exe', '.sh', '.bat', '.cmd', '.ps1'];
    const scriptExtensions = ['.js', '.ts', '.py', '.rb', '.pl'];

    for (const file of fileListResult.value) {
      const isExecutable =
        executableExtensions.some(ext => file.endsWith(ext)) ||
        (await this.fileSystem.isExecutable(file));

      if (isExecutable) {
        hasExecutableCode = true;
        potentialSecurityRisks.push(`Executable file detected: ${file}`);
      }

      if (scriptExtensions.some(ext => file.endsWith(ext))) {
        const contentResult = await this.fileSystem.readFile(file);
        if (contentResult.isOk()) {
          const content = contentResult.value;

          if (this.containsNetworkAccess(content)) {
            hasNetworkAccess = true;
            potentialSecurityRisks.push(`Network access detected in: ${file}`);
          }

          if (this.containsFileSystemAccess(content)) {
            hasFileSystemAccess = true;
            potentialSecurityRisks.push(`File system access detected in: ${file}`);
          }

          if (this.requiresElevatedPermissions(content)) {
            requiresElevatedPermissions = true;
            potentialSecurityRisks.push(`Elevated permissions required in: ${file}`);
          }
        }
      }
    }

    const userConsentRequired =
      hasExecutableCode || requiresElevatedPermissions || (hasNetworkAccess && hasFileSystemAccess);

    const result: SecurityValidationResult = {
      hasExecutableCode,
      hasNetworkAccess,
      hasFileSystemAccess,
      requiresElevatedPermissions,
      potentialSecurityRisks,
      userConsentRequired,
    };

    return ok(result);
  }

  async validateManifest(
    packageEntity: Package,
    installationPath: InstallationPath
  ): Promise<Result<ManifestValidationResult, PackageValidationError>> {
    const manifest = packageEntity.getManifest();
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredFields = ['name', 'version', 'description', 'author'];
    let requiredFieldsPresent = true;

    for (const field of requiredFields) {
      const value = (manifest as any)[`get${field.charAt(0).toUpperCase()}${field.slice(1)}`]?.();
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors.push(`Required field missing or empty: ${field}`);
        requiredFieldsPresent = false;
      }
    }

    let versionFormatValid = true;
    try {
      const versionRegex = /^\d+\.\d+\.\d+/;
      if (!versionRegex.test(manifest.getVersion())) {
        errors.push(`Invalid version format: ${manifest.getVersion()}`);
        versionFormatValid = false;
      }
    } catch {
      errors.push('Version validation failed');
      versionFormatValid = false;
    }

    let dependenciesValid = true;
    const dependencies = manifest.getDependencies();
    for (const [depName, constraint] of Array.from(dependencies)) {
      if (!depName.trim()) {
        errors.push('Dependency name cannot be empty');
        dependenciesValid = false;
      }

      if (!constraint.toString().trim()) {
        errors.push(`Dependency version constraint cannot be empty for: ${depName}`);
        dependenciesValid = false;
      }
    }

    let lspConfigurationValid = true;
    if (manifest.hasLSPSupport()) {
      const desktopConfig = manifest.getLSPDesktopConfiguration();
      const mobileConfig = manifest.getLSPMobileConfiguration();

      if (desktopConfig) {
        if (!desktopConfig.command || desktopConfig.command.length === 0) {
          errors.push('LSP desktop configuration must specify command');
          lspConfigurationValid = false;
        }

        if (!['stdio', 'websocket'].includes(desktopConfig.transport)) {
          errors.push('LSP desktop transport must be stdio or websocket');
          lspConfigurationValid = false;
        }
      }

      if (mobileConfig) {
        if (!['websocket', 'http'].includes(mobileConfig.transport)) {
          errors.push('LSP mobile transport must be websocket or http');
          lspConfigurationValid = false;
        }
      }
    }

    const manifestPath = installationPath.getManifestPath();
    const manifestExistsResult = await this.fileSystem.fileExists(manifestPath);
    if (!manifestExistsResult) {
      warnings.push('Package manifest file not found at expected location');
    }

    const result: ManifestValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredFieldsPresent,
      versionFormatValid,
      dependenciesValid,
      lspConfigurationValid,
    };

    return ok(result);
  }

  private validateProofEditorVersion(
    requiredVersion: string
  ): Result<boolean, PackageValidationError> {
    const currentVersion = process.env['PROOF_EDITOR_VERSION'] || '1.0.0';

    try {
      const currentParts = currentVersion.split('.').map(Number);
      const requiredParts = requiredVersion.split('.').map(Number);

      if (
        currentParts.length !== 3 ||
        requiredParts.length !== 3 ||
        currentParts.some(isNaN) ||
        requiredParts.some(isNaN)
      ) {
        return err(new PackageValidationError('Invalid version format'));
      }

      const [currentMajor, currentMinor, currentPatch] = currentParts;
      const [requiredMajor, requiredMinor, requiredPatch] = requiredParts;

      if (currentMajor! > requiredMajor!) return ok(true);
      if (currentMajor! < requiredMajor!) return ok(false);

      if (currentMinor! > requiredMinor!) return ok(true);
      if (currentMinor! < requiredMinor!) return ok(false);

      return ok(currentPatch! >= requiredPatch!);
    } catch {
      return err(new PackageValidationError('Invalid version format'));
    }
  }

  private validateNodeVersion(requiredVersion: string): Result<boolean, PackageValidationError> {
    const currentVersion = process.version.replace('v', '');

    try {
      const currentParts = currentVersion.split('.').map(Number);
      const requiredParts = requiredVersion.split('.').map(Number);

      if (
        currentParts.length !== 3 ||
        requiredParts.length !== 3 ||
        currentParts.some(isNaN) ||
        requiredParts.some(isNaN)
      ) {
        return err(new PackageValidationError('Invalid Node version format'));
      }

      const [currentMajor, currentMinor, currentPatch] = currentParts;
      const [requiredMajor, requiredMinor, requiredPatch] = requiredParts;

      if (currentMajor! > requiredMajor!) return ok(true);
      if (currentMajor! < requiredMajor!) return ok(false);

      if (currentMinor! > requiredMinor!) return ok(true);
      if (currentMinor! < requiredMinor!) return ok(false);

      return ok(currentPatch! >= requiredPatch!);
    } catch {
      return err(new PackageValidationError('Invalid Node version format'));
    }
  }

  private async validateLSPConfiguration(
    packageEntity: Package,
    installationPath: InstallationPath
  ): Promise<Result<ValidationResult, PackageValidationError>> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const manifest = packageEntity.getManifest();

    const desktopConfig = manifest.getLSPDesktopConfiguration();
    if (desktopConfig) {
      const command = desktopConfig.command[0];
      if (!command) {
        errors.push('LSP desktop command is required');
        return ok({
          isValid: false,
          errors: ['LSP desktop command is required'],
          warnings: [],
        });
      }
      const binaryPath = installationPath.getBinaryPath(command);
      const binaryExists = await this.fileSystem.fileExists(binaryPath);

      if (!binaryExists) {
        errors.push(`LSP desktop binary not found: ${desktopConfig.command[0]}`);
      }
    }

    const mobileConfig = manifest.getLSPMobileConfiguration();
    if (mobileConfig) {
      if (mobileConfig.transport === 'websocket' && !mobileConfig.service) {
        errors.push('LSP mobile websocket configuration requires service URL');
      }

      if (mobileConfig.transport === 'http' && !mobileConfig.endpoint) {
        errors.push('LSP mobile HTTP configuration requires endpoint URL');
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    return ok(result);
  }

  private containsNetworkAccess(content: string): boolean {
    const networkPatterns = [
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /require\s*\(\s*['"]https?/,
      /import\s+.*\s+from\s+['"]https?/,
      /net\.createConnection/,
      /http\.request/,
      /https\.request/,
    ];

    return networkPatterns.some(pattern => pattern.test(content));
  }

  private containsFileSystemAccess(content: string): boolean {
    const fsPatterns = [
      /require\s*\(\s*['"]fs['"]/,
      /import\s+.*\s+from\s+['"]fs['"]/,
      /fs\.readFile/,
      /fs\.writeFile/,
      /fs\.unlink/,
      /fs\.rmdir/,
      /fs\.mkdir/,
      /process\.chdir/,
    ];

    return fsPatterns.some(pattern => pattern.test(content));
  }

  private requiresElevatedPermissions(content: string): boolean {
    const elevatedPatterns = [/sudo/, /runas/, /UAC/, /administrator/i, /elevated/i, /privilege/i];

    return elevatedPatterns.some(pattern => pattern.test(content));
  }
}
