import { Result } from '../types/result.js';
import { PackageValidationError } from '../types/domain-errors.js';
import { PackageEntity } from '../entities/package-entity.js';
import { InstallationPath } from '../value-objects/InstallationPath.js';
import { SDKInterface, SDKValidationResult, ValidationResult } from '../types/common-types.js';

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
  validateInterface(packagePath: string, interfaceName: string): Promise<Result<SDKInterface, PackageValidationError>>;
  listImplementedInterfaces(packagePath: string): Promise<Result<readonly SDKInterface[], PackageValidationError>>;
  checkVersionCompatibility(requiredVersion: string, actualVersion: string): Result<boolean, PackageValidationError>;
}

export class PackageValidationService {
  constructor(
    private readonly fileSystem: IPackageFileSystem,
    private readonly sdkValidator: ISDKValidator
  ) {}

  async validatePackage(
    packageEntity: PackageEntity,
    installationPath: InstallationPath,
    options: PackageValidationOptions = {}
  ): Promise<Result<ValidationResult, PackageValidationError>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (options.validateManifest !== false) {
      const manifestResult = await this.validateManifest(packageEntity, installationPath);
      if (!manifestResult.success) {
        return Result.failure(manifestResult.error);
      }
      
      errors.push(...manifestResult.data.errors);
      warnings.push(...manifestResult.data.warnings);
    }

    if (options.validateSDKCompliance) {
      const sdkResult = await this.validateSDKCompliance(packageEntity, installationPath);
      if (!sdkResult.success) {
        return Result.failure(sdkResult.error);
      }
      
      errors.push(...sdkResult.data.errors);
      warnings.push(...sdkResult.data.warnings);
    }

    if (options.checkSecurityPolicies) {
      const securityResult = await this.validateSecurity(packageEntity, installationPath);
      if (!securityResult.success) {
        return Result.failure(securityResult.error);
      }
      
      if (securityResult.data.potentialSecurityRisks.length > 0) {
        warnings.push(...securityResult.data.potentialSecurityRisks);
      }
    }

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    return Result.success(validationResult);
  }

  async validateSDKCompliance(
    packageEntity: PackageEntity,
    installationPath: InstallationPath
  ): Promise<Result<SDKValidationResult, PackageValidationError>> {
    const packagePath = installationPath.getAbsolutePath();
    const manifest = packageEntity.getManifest();
    const expectedInterfaces = packageEntity.getSDKInterfaces();

    const implementedResult = await this.sdkValidator.listImplementedInterfaces(packagePath);
    if (!implementedResult.success) {
      return Result.failure(implementedResult.error);
    }

    const implementedInterfaces = implementedResult.data;
    const implementedInterfaceNames = new Set(implementedInterfaces.map(iface => iface.name));
    
    const missingInterfaces: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const expectedInterface of expectedInterfaces) {
      if (!implementedInterfaceNames.has(expectedInterface.name)) {
        missingInterfaces.push(expectedInterface.name);
        errors.push(`Missing required SDK interface: ${expectedInterface.name}`);
      } else {
        const implementedInterface = implementedInterfaces.find(iface => iface.name === expectedInterface.name)!;
        
        const versionCompatResult = this.sdkValidator.checkVersionCompatibility(
          expectedInterface.version,
          implementedInterface.version
        );
        
        if (!versionCompatResult.success) {
          return Result.failure(versionCompatResult.error);
        }
        
        if (!versionCompatResult.data) {
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
      if (!compatResult.success) {
        errors.push(`Incompatible Proof Editor version requirement: ${requiredProofEditorVersion}`);
        versionCompatibility = false;
      }
    }

    const requiredNodeVersion = manifest.getRequiredNodeVersion();
    if (requiredNodeVersion) {
      const nodeCompatResult = this.validateNodeVersion(requiredNodeVersion);
      if (!nodeCompatResult.success) {
        errors.push(`Incompatible Node.js version requirement: ${requiredNodeVersion}`);
        versionCompatibility = false;
      }
    }

    if (packageEntity.hasLSPSupport()) {
      const lspValidationResult = await this.validateLSPConfiguration(packageEntity, installationPath);
      if (!lspValidationResult.success) {
        return Result.failure(lspValidationResult.error);
      }
      
      errors.push(...lspValidationResult.data.errors);
      warnings.push(...lspValidationResult.data.warnings);
    }

    const result: SDKValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      implementedInterfaces,
      missingInterfaces,
      versionCompatibility
    };

    return Result.success(result);
  }

  async validateSecurity(
    packageEntity: PackageEntity,
    installationPath: InstallationPath
  ): Promise<Result<SecurityValidationResult, PackageValidationError>> {
    const packagePath = installationPath.getAbsolutePath();
    const potentialSecurityRisks: string[] = [];

    let hasExecutableCode = false;
    let hasNetworkAccess = false;
    let hasFileSystemAccess = false;
    let requiresElevatedPermissions = false;

    const fileListResult = await this.fileSystem.listFiles(packagePath);
    if (!fileListResult.success) {
      return Result.failure(new PackageValidationError(
        `Failed to list package files: ${fileListResult.error.message}`
      ));
    }

    const executableExtensions = ['.exe', '.sh', '.bat', '.cmd', '.ps1'];
    const scriptExtensions = ['.js', '.ts', '.py', '.rb', '.pl'];

    for (const file of fileListResult.data) {
      const isExecutable = executableExtensions.some(ext => file.endsWith(ext)) ||
                          await this.fileSystem.isExecutable(file);
      
      if (isExecutable) {
        hasExecutableCode = true;
        potentialSecurityRisks.push(`Executable file detected: ${file}`);
      }

      if (scriptExtensions.some(ext => file.endsWith(ext))) {
        const contentResult = await this.fileSystem.readFile(file);
        if (contentResult.success) {
          const content = contentResult.data;
          
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

    const userConsentRequired = hasExecutableCode || requiresElevatedPermissions || 
                               (hasNetworkAccess && hasFileSystemAccess);

    const result: SecurityValidationResult = {
      hasExecutableCode,
      hasNetworkAccess,
      hasFileSystemAccess,
      requiresElevatedPermissions,
      potentialSecurityRisks,
      userConsentRequired
    };

    return Result.success(result);
  }

  async validateManifest(
    packageEntity: PackageEntity,
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
    for (const [depName, constraint] of dependencies) {
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
      lspConfigurationValid
    };

    return Result.success(result);
  }

  private validateProofEditorVersion(requiredVersion: string): Result<boolean, PackageValidationError> {
    const currentVersion = process.env.PROOF_EDITOR_VERSION || '1.0.0';
    
    try {
      const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);
      const [requiredMajor, requiredMinor, requiredPatch] = requiredVersion.split('.').map(Number);
      
      if (currentMajor > requiredMajor) return Result.success(true);
      if (currentMajor < requiredMajor) return Result.success(false);
      
      if (currentMinor > requiredMinor) return Result.success(true);
      if (currentMinor < requiredMinor) return Result.success(false);
      
      return Result.success(currentPatch >= requiredPatch);
      
    } catch {
      return Result.failure(new PackageValidationError('Invalid version format'));
    }
  }

  private validateNodeVersion(requiredVersion: string): Result<boolean, PackageValidationError> {
    const currentVersion = process.version.replace('v', '');
    
    try {
      const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);
      const [requiredMajor, requiredMinor, requiredPatch] = requiredVersion.split('.').map(Number);
      
      if (currentMajor > requiredMajor) return Result.success(true);
      if (currentMajor < requiredMajor) return Result.success(false);
      
      if (currentMinor > requiredMinor) return Result.success(true);
      if (currentMinor < requiredMinor) return Result.success(false);
      
      return Result.success(currentPatch >= requiredPatch);
      
    } catch {
      return Result.failure(new PackageValidationError('Invalid Node version format'));
    }
  }

  private async validateLSPConfiguration(
    packageEntity: PackageEntity,
    installationPath: InstallationPath
  ): Promise<Result<ValidationResult, PackageValidationError>> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const manifest = packageEntity.getManifest();

    const desktopConfig = manifest.getLSPDesktopConfiguration();
    if (desktopConfig) {
      const binaryPath = installationPath.getBinaryPath(desktopConfig.command[0]);
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
      warnings
    };

    return Result.success(result);
  }

  private containsNetworkAccess(content: string): boolean {
    const networkPatterns = [
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /require\s*\(\s*['"]https?/,
      /import\s+.*\s+from\s+['"]https?/,
      /net\.createConnection/,
      /http\.request/,
      /https\.request/
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
      /process\.chdir/
    ];

    return fsPatterns.some(pattern => pattern.test(content));
  }

  private requiresElevatedPermissions(content: string): boolean {
    const elevatedPatterns = [
      /sudo/,
      /runas/,
      /UAC/,
      /administrator/i,
      /elevated/i,
      /privilege/i
    ];

    return elevatedPatterns.some(pattern => pattern.test(content));
  }
}