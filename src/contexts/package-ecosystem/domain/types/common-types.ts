export interface GitPackageSource {
  readonly url: string;
  readonly ref: string;
  readonly path?: string;
}

export interface LocalPackageSource {
  readonly path: string;
}

export interface PackageManifestData {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly homepage?: string;
  readonly license?: string;
  readonly dependencies?: Record<string, string>;
  readonly requirements?: {
    readonly proofEditor?: string;
    readonly node?: string;
  };
  readonly lsp?: {
    readonly desktop?: {
      readonly command: string[];
      readonly args?: string[];
      readonly transport: 'stdio' | 'websocket';
    };
    readonly mobile?: {
      readonly transport: 'websocket' | 'http';
      readonly service?: string;
      readonly endpoint?: string;
    };
    readonly binaries?: Record<string, string>;
  };
  readonly capabilities?: {
    readonly textDocument?: Record<string, boolean>;
    readonly proofCapabilities?: string[];
  };
  readonly validation?: {
    readonly categories?: Array<{
      readonly id: string;
      readonly name: string;
      readonly rules: string[];
    }>;
    readonly customValidators?: string[];
  };
  readonly keywords?: string[];
  readonly category?: string;
  readonly tags?: string[];
}

export interface PackageInstallationInfo {
  readonly installedAt: Date;
  readonly installedFrom: GitPackageSource | LocalPackageSource;
  readonly isEnabled: boolean;
  readonly configurationOverrides?: Record<string, unknown>;
}

export interface DependencyInfo {
  readonly targetPackageId: string;
  readonly versionConstraint: string;
  readonly isRequired: boolean;
  readonly resolvedVersion?: string;
}

export interface SDKInterface {
  readonly name: string;
  readonly version: string;
  readonly methods: string[];
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export interface SDKValidationResult extends ValidationResult {
  readonly implementedInterfaces: SDKInterface[];
  readonly missingInterfaces: string[];
  readonly versionCompatibility: boolean;
}