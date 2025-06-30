# Language Discovery and Installation

## Overview

This document describes how Proof Editor discovers, installs, and manages language packages. The system supports multiple discovery mechanisms, from GitHub repositories to local files, and provides robust version management and caching.

## Discovery Mechanisms

### 1. GitHub Topic Search

Languages can be discovered by searching GitHub repositories with specific topics:

```typescript
interface GitHubDiscovery {
  searchByTopic(topic: "proof-editor-language"): Promise<Repository[]>;
  searchByOrganization(org: string): Promise<Repository[]>;
  searchByQuery(query: string): Promise<Repository[]>;
}
```

Repository owners tag their languages with `proof-editor-language` to make them discoverable.

### 2. Language Registry Files

Curated registries provide verified language listings:

```json
// In well-known repositories (e.g., proof-editor/language-registry)
{
  "languages": [
    {
      "name": "modal-logic",
      "description": "Modal Logic LSP with S5 support",
      "source": "github:logictools/modal-logic-lsp",
      "version": "1.2.3",
      "author": "Logic Tools Team",
      "verified": true
    },
    {
      "name": "first-order-logic",
      "description": "First-Order Logic with equality",
      "source": "github:formal-systems/fol-lsp",
      "version": "2.1.0",
      "author": "Formal Systems Lab"
    }
  ]
}
```

### 3. Local Directory Scanning

For development and offline use:

```typescript
interface LocalDiscovery {
  scanDirectory(path: string): Promise<LanguagePackage[]>;
  watchDirectory(path: string, callback: (changes: LanguageChange[]) => void): Watcher;
}
```

### 4. Direct URL Installation

Languages can be installed from direct URLs:
- `https://example.com/my-language.tar.gz`
- `file:///path/to/local/language`
- `github:owner/repo#branch`

## Installation Process

### Installation Workflow

```typescript
interface LanguageInstaller {
  // Install from various sources
  async installLanguage(spec: LanguageSource): Promise<LanguageInstallation> {
    const resolver = new LanguageResolver();
    const packageInfo = await resolver.resolve(spec);
    
    // Download package
    const packageData = await this.downloadPackage(packageInfo);
    
    // Verify integrity
    await this.verifyPackage(packageData);
    
    // Security consent for executable code
    if (packageData.containsExecutableCode) {
      const consent = await this.requestSecurityConsent(packageData);
      if (!consent.approved) {
        throw new InstallationCancelledError('User declined executable code consent');
      }
    }
    
    // Check dependencies
    const deps = await this.resolveDependencies(packageInfo);
    await this.installDependencies(deps);
    
    // Install to local cache
    const installation = await this.installToCache(packageData);
    
    // Register with language manager
    await this.registerLanguage(installation);
    
    return installation;
  }
  
  // Version management
  async updateLanguage(name: string, version?: string): Promise<void>;
  async rollbackLanguage(name: string, version: string): Promise<void>;
  
  // Dependency resolution
  async resolveDependencies(language: LanguageInfo): Promise<Dependency[]>;
  async checkCompatibility(language: LanguageInfo): Promise<CompatibilityReport>;
}
```

### Source Types

```typescript
interface LanguageSource {
  type: 'github' | 'url' | 'file' | 'registry';
  location: string;
  version?: string;  // Semver constraint
  branch?: string;   // Git branch
  tag?: string;      // Git tag
  commit?: string;   // Specific commit
}
```

### Installation Result

```typescript
interface LanguageInstallation {
  name: string;
  version: string;
  path: string;
  manifest: LanguageManifest;
  dependencies: Record<string, string>;
  installedAt: Date;
}
```

### Security Consent Integration

For packages containing executable code (JavaScript validation rules, LSP servers), the installation process integrates with the security consent system:

```typescript
interface SecurityConsentRequest {
  packageName: string;
  version: string;
  source: string;
  executableComponents: ExecutableComponent[];
  trustLevel: 'verified' | 'community' | 'unknown';
  securityConstraints: SecurityConstraint[];
}

interface SecurityConsentResponse {
  approved: boolean;
  userAction: 'install' | 'review' | 'cancel';
  reviewedCode?: boolean;
}

async requestSecurityConsent(packageData: PackageData): Promise<SecurityConsentResponse> {
  const consentDialog = new SecurityConsentDialog({
    packageInfo: packageData.manifest,
    executableComponents: packageData.executableComponents,
    trustLevel: await this.evaluateTrustLevel(packageData.source),
    securityConstraints: packageData.securityConstraints
  });
  
  return await consentDialog.show();
}
```

**Security Policy Integration**: The consent process implements the requirements defined in [Language Package Security Policy](../../policies/language-package-security-policy.md), including risk disclosure, trust framework evaluation, and user consent collection.
```

## Cache Management

### Cache Location

Languages are cached locally for offline use and performance:
- **Desktop**: `~/.proof-editor/languages/`
- **Mobile**: App documents directory

### Cache Operations

```typescript
interface LanguageCacheManager {
  // Cache location: ~/.proof-editor/languages/
  cacheDirectory: string;
  
  // Cache operations
  async getCachedLanguage(name: string, version: string): Promise<LanguageInstallation | null>;
  async listCachedLanguages(): Promise<LanguageInfo[]>;
  async clearCache(): Promise<void>;
  async pruneOldVersions(keepLatest: number): Promise<void>;
  
  // Offline support
  async exportLanguages(names: string[], target: string): Promise<void>;
  async importLanguages(source: string): Promise<LanguageInfo[]>;
}
```

### Cache Structure

```
~/.proof-editor/languages/
├── modal-logic/
│   ├── 1.2.3/
│   │   ├── language-spec.yaml
│   │   ├── server/
│   │   └── ...
│   ├── 1.2.2/
│   └── metadata.json
├── first-order-logic/
│   ├── 2.1.0/
│   └── metadata.json
└── registry-cache.json
```

## Version Resolution

### Semantic Versioning

Languages use semantic versioning for predictable updates:

```typescript
interface VersionResolver {
  // Resolve version constraints
  async resolveVersion(name: string, constraint: string): Promise<string> {
    const available = await this.getAvailableVersions(name);
    return semver.maxSatisfying(available, constraint);
  }
  
  // Check compatibility
  async checkCompatibility(
    language: LanguageInfo,
    proofEditorVersion: string
  ): Promise<boolean>;
  
  // Migration support
  async getMigrationPath(
    name: string,
    fromVersion: string,
    toVersion: string
  ): Promise<Migration[]>;
}
```

### Version Constraints

- `^1.2.3` - Compatible updates (1.x.x)
- `~1.2.3` - Patch updates only (1.2.x)
- `1.2.3` - Exact version
- `>=1.2.0 <2.0.0` - Range constraint
- `latest` - Most recent version

### Dependency Resolution

Languages can depend on other languages:

```yaml
dependencies:
  languages:
    - name: "propositional-logic"
      version: "^2.0.0"
    - name: "first-order-logic"
      version: "^1.5.0"
```

Resolution follows these rules:
1. Install dependencies first
2. Resolve version conflicts using highest compatible version
3. Share dependencies when possible
4. Isolate incompatible versions

## Registry Management

### Official Registry

The official registry provides curated, verified languages:

```typescript
interface LanguageRegistry {
  // Registry operations
  async searchLanguages(query: SearchQuery): Promise<LanguageDescriptor[]>;
  async getLanguageInfo(name: string): Promise<LanguageDescriptor>;
  async getVersions(name: string): Promise<VersionInfo[]>;
  
  // Caching
  async updateCache(): Promise<void>;
  getCacheAge(): number;
  
  // Categories
  async getCategories(): Promise<Category[]>;
  async getLanguagesByCategory(category: string): Promise<LanguageDescriptor[]>;
}

interface LanguageDescriptor {
  name: string;
  version: string;
  description: string;
  author: string;
  source: LanguageSource;
  capabilities: string[];
  verified?: boolean;
  downloads?: number;
  lastUpdated?: Date;
}

interface SearchQuery {
  text?: string;
  category?: string;
  author?: string;
  capabilities?: string[];
  verified?: boolean;
}
```

### Registry Sources

1. **Primary Registry**: `github:proof-editor/language-registry`
2. **Mirror Registries**: Alternative sources for reliability
3. **Private Registries**: For organizations and courses

### Registry Format

```json
{
  "version": "1.0",
  "languages": [
    {
      "name": "modal-logic",
      "description": "Modal Logic with S5 support",
      "source": "github:logictools/modal-logic-lsp",
      "latestVersion": "1.2.3",
      "versions": [
        {
          "version": "1.2.3",
          "releaseDate": "2024-03-15",
          "changelog": "Added S5 axiom support"
        },
        {
          "version": "1.2.2",
          "releaseDate": "2024-02-01",
          "changelog": "Fixed necessity distribution"
        }
      ],
      "author": {
        "name": "Logic Tools Team",
        "email": "contact@logictools.com",
        "url": "https://logictools.com"
      },
      "verified": true,
      "verifiedDate": "2024-01-15",
      "downloads": 1523,
      "rating": 4.8,
      "keywords": ["modal", "logic", "S5", "philosophy"],
      "category": "modal-logics"
    }
  ],
  "categories": [
    {
      "id": "modal-logics",
      "name": "Modal Logics",
      "description": "Necessity, possibility, and modal reasoning"
    },
    {
      "id": "first-order",
      "name": "First-Order Logic",
      "description": "Quantification and predicate logic"
    }
  ]
}
```

## Installation UI/UX

### Auto-Installation

When opening a proof file with an unknown language:

1. **Detection**: System detects missing language
2. **Prompt**: User sees installation prompt
3. **Discovery**: System searches for language
4. **Installation**: One-click install with progress
5. **Activation**: Language activated automatically

### Manual Installation

Users can browse and install languages:

1. **Language Browser**: Search and filter available languages
2. **Details View**: See capabilities, examples, reviews
3. **Version Selection**: Choose specific version
4. **Install Options**: Configure installation location

### Progress Indication

```typescript
interface InstallProgress {
  stage: 'discovering' | 'downloading' | 'verifying' | 'installing' | 'activating';
  progress: number; // 0-100
  message: string;
  bytesDownloaded?: number;
  totalBytes?: number;
}
```

## Offline Support

### Pre-bundled Languages

Essential languages included with installation:
- Propositional Logic
- First-Order Logic
- Basic Modal Logic

### Export/Import

For classroom and offline scenarios:

```typescript
interface OfflineSupport {
  // Export languages for sharing
  async exportBundle(languages: string[], target: string): Promise<void> {
    const bundle = await this.createBundle(languages);
    await this.saveBundle(bundle, target);
  }
  
  // Import language bundle
  async importBundle(source: string): Promise<ImportResult> {
    const bundle = await this.loadBundle(source);
    const results = await this.installFromBundle(bundle);
    return results;
  }
  
  // QR code for mobile sharing
  async generateInstallQR(language: string): Promise<string> {
    const url = await this.getInstallUrl(language);
    return this.generateQRCode(url);
  }
}
```

## Error Handling

### Common Errors

1. **Network Errors**: Retry with exponential backoff
2. **Version Conflicts**: Show resolution options
3. **Missing Dependencies**: Auto-install or prompt
4. **Corrupted Downloads**: Verify and retry
5. **Insufficient Space**: Clear cache or choose location

### Error Recovery

```typescript
interface ErrorRecovery {
  async handleInstallError(error: InstallError): Promise<RecoveryAction> {
    switch (error.type) {
      case 'network':
        return this.retryWithBackoff(error);
      case 'version-conflict':
        return this.promptVersionResolution(error);
      case 'missing-dependency':
        return this.installDependencies(error);
      case 'corrupted':
        return this.redownload(error);
      case 'space':
        return this.promptCacheClear(error);
    }
  }
}
```

## See Also

- [Language Architecture](./language-architecture.md) - Core concepts and package structure
- [LSP Lifecycle](./lsp-lifecycle.md) - Server management after installation
- [Language Security](./language-security.md) - Package verification and security
- [Platform Abstraction](../platform-abstraction.md) - Platform-specific considerations