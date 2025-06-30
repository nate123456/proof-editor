# Package Sharing System

## Overview

The Proof Editor package system enables users to share complete logical systems, including configurations, documents, custom characters, and validation scripts. Packages are self-contained bundles that work identically across all platforms, with platform-specific distribution methods tailored to each environment.

## Architecture Overview

This documentation uses tags to distinguish between:
- **[CORE]**: Platform-agnostic package features that work identically everywhere
- **[PLATFORM]**: Platform-specific distribution and integration methods
- **[LSP]**: Optional Language Server Protocol components for advanced intelligence

## Philosophy: User-Managed Sharing

This system puts users in complete control:
- **No gatekeepers**: Share directly with colleagues, students, or the community without centralized approval barriers. Users act as their own informed gatekeepers through transparent security controls (see [Language Package Security Policy](../policies/language-package-security-policy.md))
- **Your choice**: Install only what you trust from sources you choose, with full disclosure of code execution and security implications
- **Platform flexibility**: Multiple distribution methods per platform
- **Offline capable**: Cached packages work without internet connectivity
- **Privacy preserved**: No tracking, analytics, or centralized data collection

## Core Concepts [CORE]

### Package
A self-contained bundle that works identically across all platforms:
- Configuration files (keybindings, UI settings)
- Document collections (.proof files)
- Custom fonts and character definitions
- Analysis and validation scripts
- Display preferences (e.g., bottom-up vs top-down rendering)
- **Language Server Protocol (LSP) implementations** [LSP]
- **LSP extension configurations** [LSP]
- **Custom LSP server binaries** [LSP]

### Profile
A curated collection of packages for specific use cases (e.g., "Modal Logic Course", "Formal Methods Research").

### Package Manifest
The `proof-package.json` file that defines package metadata, dependencies, and contents. This format is platform-agnostic.

## Package Structure [CORE]

The internal structure of a package is consistent across all platforms:

```
my-logic-package/
├── proof-package.json          # Package manifest [CORE]
├── README.md                   # Package documentation
├── config/
│   ├── keybindings.json       # Custom keyboard shortcuts
│   ├── characters.json        # Custom character definitions
│   └── ui-settings.json       # Display preferences
├── documents/
│   ├── examples/              # Example proofs
│   └── templates/             # Document templates
├── fonts/
│   └── logic-symbols.woff2    # Custom font files
├── scripts/
│   ├── validators/            # Validation scripts
│   └── analyzers/             # Analysis scripts
└── language-servers/           # [LSP]
    ├── modal-logic/           # LSP server implementation
    │   ├── server.js          # Server entry point
    │   ├── capabilities.json  # Server capabilities
    │   └── package.json       # LSP dependencies
    └── config.json            # LSP configuration
```

## Package Manifest Format [CORE]

The manifest format is identical across all platforms:

```json
{
  "name": "modal-logic-starter",
  "version": "1.0.0",
  "description": "Complete modal logic system for beginners",
  "author": "Logic Systems Organization",
  "homepage": "https://example.com/modal-logic",  // Optional URL
  "dependencies": {
    "basic-logic-symbols": "^2.0.0"
  },
  "contents": {
    "config": {
      "keybindings": "./config/keybindings.json",
      "characters": "./config/characters.json",
      "uiSettings": "./config/ui-settings.json"
    },
    "documents": {
      "examples": "./documents/examples/",
      "templates": "./documents/templates/"
    },
    "fonts": ["./fonts/logic-symbols.woff2"],
    "scripts": {
      "validators": "./scripts/validators/",
      "analyzers": "./scripts/analyzers/"
    },
    "languageServers": {  // [LSP]
      "modalLogic": {
        "serverPath": "./language-servers/modal-logic/server.js",
        "capabilities": "./language-servers/modal-logic/capabilities.json",
        "configuration": "./language-servers/config.json"
      }
    }
  },
  "requirements": {
    "proofEditor": ">=1.0.0"
  }
}
```

## Character Configuration

```json
{
  "characters": [
    {
      "symbol": "◇",
      "name": "possibly",
      "keybinding": "\\diamond",
      "category": "modal"
    },
    {
      "symbol": "□",
      "name": "necessarily",
      "keybinding": "\\box",
      "category": "modal"
    },
    {
      "symbol": "⊢",
      "name": "turnstile",
      "keybinding": "\\vdash",
      "category": "logical"
    }
  ]
}
```

## Package Distribution [PLATFORM]

Different platforms support different distribution methods, but packages work identically once installed.

### VS Code Desktop
```typescript
// From GitHub repository
await installPackage('github:university/logic-course-2024');

// From GitHub gist (for quick sharing)
await installPackage('gist:abc123def456');

// From local file
await installPackage('file:///path/to/package');

// From URL
await installPackage('https://example.com/packages/modal-logic.zip');
```

### Mobile Platforms
```typescript
// From bundled packages (included with app)
await activateBundledPackage('basic-logic');

// From QR code (classroom sharing)
await installFromQRCode(scannedData);

// From direct share (AirDrop, nearby share, etc.)
await installFromShare(sharedPackage);

// From university server
await installPackage('https://university.edu/courses/logic101/package');
```

### All Platforms [CORE]
```typescript
// Local package import (works everywhere)
await importPackage(packageData);

// Package manifest parsing
const manifest = await parsePackageManifest(manifestData);
```

### Document-Level Requirements

Documents can specify required or recommended imports:

```yaml
version: "1.0"
imports:
  - modal-logic-starter@^1.0.0     # Required package
  - modal-logic-advanced@^2.0.0?   # Optional package (note the ?)

# Rest of document...
```

When opening such a document, users see:
```
This document requires: modal-logic-starter
This document recommends: modal-logic-advanced

[Install Required] [Install All] [Skip]
```

### User Overrides

Users can override package settings locally:

```json
// ~/.proof-editor/overrides.json
{
  "modal-logic-starter": {
    "characters": {
      "possibly": {
        "keybinding": "\\pos"  // Override default \diamond
      }
    }
  }
}
```

## Profile System

Profiles bundle multiple packages for specific workflows:

```json
{
  "name": "undergraduate-logic-course",
  "version": "2023.1",
  "description": "Complete setup for Logic 101",
  "packages": [
    "basic-logic-symbols@^2.0.0",
    "propositional-logic@^1.5.0",
    "predicate-logic@^1.2.0",
    "course-exercises@^2023.1.0"
  ],
  "defaultSettings": {
    "ui.theme": "high-contrast",
    "editor.fontSize": 16
  }
}
```

## Security Considerations [CORE]

### Package Verification
- **Script execution requires user confirmation** that clearly articulates the nature of the code (e.g., 'user-defined logical rules') and security implications
- Sandboxed script environment with limited API access
- No network access from scripts
- Content Security Policy (CSP) enforced
- Package signatures for authenticity (future enhancement)
- Platform-specific source verification

### User Consent and Risk Disclosure

**When Consent is Required**: The system prompts for explicit user consent before installing or running any package containing executable code (JavaScript validation rules, custom LSP servers, or other scripts).

**Consent Flow**:
1. **Detection**: System analyzes package contents and identifies executable components
2. **Risk Disclosure**: Clear warning dialog displays:
   - What executable code is present (validation rules, LSP extensions, etc.)
   - Security constraints and sandboxing measures
   - Source information and trust level (see [Language Package Security Policy](../policies/language-package-security-policy.md))
   - Potential risks from untrusted sources
3. **Explicit Actions**: User must take explicit action:
   - "Install and Trust" - Proceed with installation
   - "Review Code" - Examine package contents before deciding
   - "Cancel" - Reject installation
4. **Installation**: If approved, package installs with security constraints applied

**Information Displayed**: Users see exactly what they're agreeing to install, including code execution capabilities, resource access permissions, and source verification status.

For comprehensive details on consent processes, risk disclosure, trust mechanisms, and security enforcement, see [Language Package Security Policy](../policies/language-package-security-policy.md).

### Permission Model
```typescript
// User prompted for permissions
const permissions = await requestPermissions({
  scripts: ['validators/modal-logic.js'],
  fonts: ['logic-symbols.woff2'],
  access: {
    readDocuments: true,
    writeDocuments: false,
    executeValidation: true
  }
});
```

### Script Sandboxing
Scripts run in isolated context with:
- Limited API surface (only proof manipulation)
- No file system access
- No network capabilities
- Memory limits enforced
- Execution timeout (default: 5 seconds)

### Package Integrity
```json
{
  "name": "modal-logic-starter",
  "version": "1.0.0",
  "integrity": {
    "algorithm": "sha256",
    "hash": "abc123...",
    "files": {
      "scripts/validator.js": "def456..."
    }
  }
}
```

## Implementation Architecture

### Package Resolution [CORE]
1. Check local cache first
2. Fetch from distribution source
3. Validate package manifest
4. Check dependencies recursively
5. Install in dependency order

### Caching Strategy
- Packages cached locally for offline use
- Cache invalidation based on version
- Manual cache clearing available
- Cache location: `~/.proof-editor/package-cache/`

### Platform Integration [PLATFORM]

#### VS Code Desktop
- Leverage VS Code's extension settings infrastructure
- Integrate with VS Code's built-in settings sync
- Use VS Code's file watcher for package changes
- Support workspace-level package configuration
- Package settings stored in VS Code's standard locations:
  - User: `~/.config/Code/User/globalStorage/proof-editor/`
  - Workspace: `.vscode/proof-editor-packages.json`
- Respect VS Code's proxy settings for downloads
- Honor VS Code's telemetry preferences

#### Mobile (iOS/Android)
- Use platform storage APIs for package persistence
- Implement app bundle packages for offline installation
- Support document-relative package locations
- Package storage locations:
  - iOS: `{DocumentDirectory}/ProofEditor/packages/`
  - Android: `{getFilesDir()}/proof-editor/packages/`
- Handle app lifecycle during package operations
- Respect device storage limitations
- Support package preloading during app installation

#### Web Browser
- Use IndexedDB for package storage
- Support URL-based package loading
- Cache packages in service worker
- Respect browser storage quotas

### Offline Usage
- All installed packages cached locally
- Offline mode automatically detected
- Cached packages remain fully functional
- Cache manifest tracks versions and dependencies
- Background sync when connection restored
- Export/import cache for air-gapped environments
- Fallback to cached versions when newer unavailable

### Version Management
- Semantic versioning (semver) enforced
- Version resolution follows npm-style rules:
  - `^1.2.3` - Compatible with 1.x.x
  - `~1.2.3` - Patch updates only
  - `1.2.3` - Exact version
  - `>=1.2.3 <2.0.0` - Range specification
- Automatic update checks (configurable)
- Version conflict resolution strategies:
  - Use highest compatible version
  - Prompt user for conflicts
  - Lock file support for reproducibility

## Example Workflows

### Academic Course Setup
1. **Instructor creates course package** [CORE]:
   - Standard notation and keybindings
   - Exercise templates
   - Validation scripts for assignments
   - Example proofs

2. **Distribution** [PLATFORM]:
   - **VS Code**: Share GitHub URL or publish to course website
   - **Mobile**: Generate QR code for classroom, bundle with course app
   - **Web**: Host on university server with direct links

3. **Students install package**:
   - All students get identical setup regardless of platform
   - Package contents work the same everywhere
   - Platform-appropriate UI adaptations applied automatically

### Research Team Collaboration
1. **Team creates shared package** [CORE]:
   - Domain-specific symbols
   - Shared proof templates
   - Custom validation rules
   - Team conventions

2. **Synchronization** [PLATFORM]:
   - **Desktop**: Git-based workflows with version control
   - **Mobile**: Cloud sync with offline support
   - **Web**: Real-time collaboration features

3. **Team benefits**:
   - Consistent notation across all platforms
   - Local overrides for personal preferences
   - Seamless collaboration regardless of device

### Cross-Platform Usage
1. **Start on desktop**: Create proof using full keyboard
2. **Continue on tablet**: Review and annotate with touch
3. **Present on phone**: Show proof in presentation mode
4. **Share via web**: Collaborate with remote colleagues

All using the same package with platform-optimized experiences.

## Best Practices

### Package Development
- Version packages semantically
- Include comprehensive examples
- Document all custom characters
- Test on clean installation
- Provide migration guides for breaking changes

### Package Naming
- Use descriptive, lowercase names
- Prefix with organization (e.g., `stanford-modal-logic`)
- Include logic system type
- Avoid generic names

### Sharing Strategies
- **Public packages**: Use public GitHub repositories for open sharing
- **Course materials**: Use private repositories, share access with students
- **Quick sharing**: Use GitHub gists for simple configurations
- **Team packages**: Use organization repositories with team access
- **Versioning**: Use git tags for stable releases
- **Documentation**: Include clear README with usage instructions

### Dependency Management
- Minimize dependencies (including LSP server dependencies)
- Use version ranges carefully
- Document breaking changes (especially LSP protocol changes)
- Test dependency combinations
- Provide fallbacks for optional dependencies
- **Manage LSP server dependency chains carefully**
- **Test LSP server compatibility across versions**
- **Provide LSP server rollback mechanisms**
- **Document LSP server resource requirements**

## Language Server Protocol (LSP) Integration [LSP]

### Overview
Packages can optionally include LSP servers to provide advanced language intelligence. This is separate from core package functionality.

### LSP Package Components

```json
{
  "name": "modal-logic-complete",
  "version": "1.0.0",
  "lspServers": {
    "modalLogic": {
      "serverPath": "./lsp-servers/modal-logic-lsp/server.js",
      "capabilities": "./lsp-servers/modal-logic-lsp/capabilities.json",
      "configuration": "./lsp-servers/lsp-config.json"
    }
  },
  "lspCapabilities": {
    "validation": true,
    "completion": true,
    "hover": true,
    "diagnostics": true,
    "customRequests": [
      "proof/validateInferenceRule",
      "proof/getSuggestions",
      "proof/analyzeComplexity"
    ]
  }
}
```

### LSP Server Lifecycle Management
```typescript
interface LSPServerManager {
  // Server lifecycle
  startServer(serverId: string): Promise<void>;
  stopServer(serverId: string): Promise<void>;
  restartServer(serverId: string): Promise<void>;
  
  // Configuration management
  configureServer(serverId: string, config: LSPConfig): Promise<void>;
  updateServer(serverId: string, version: string): Promise<void>;
  
  // Health monitoring
  getServerHealth(serverId: string): Promise<ServerHealth>;
  getServerMetrics(serverId: string): Promise<ServerMetrics>;
}
```

### Package-Specific LSP Extensions
```typescript
// Custom LSP requests for package-specific functionality
interface PackageLSPExtension {
  packageId: string;
  customRequests: {
    [method: string]: {
      params: any;
      result: any;
      documentation: string;
    };
  };
  customNotifications: {
    [method: string]: {
      params: any;
      documentation: string;
    };
  };
}
```

### LSP Security [CORE]
LSP servers run with strict security constraints:

- **Process isolation**: Separate process or sandboxed environment
- **Resource limits**: Memory and CPU limits enforced
- **Communication constraints**: Only LSP protocol allowed
- **File system restrictions**: Limited to package directory
- **Network restrictions**: No network access by default
- **Capability restrictions**: Only declared capabilities allowed

```typescript
interface LSPSandboxConfig {
  memoryAllocation: 'adaptive' | 'fixed';
  maxCPUPercent: number;
  allowedPaths: string[];
  networkAccess: boolean;
  timeoutSeconds: number;
  allowedCapabilities: string[];
}
```

### LSP Platform Strategies [PLATFORM]

#### Desktop
- Local LSP servers run as separate processes
- Full LSP protocol support via stdio
- Binary compatibility across platforms
- Automatic dependency resolution

#### Mobile
- Remote LSP servers via WebSocket/HTTP
- Bundled minimal validators for offline use
- Cloud-hosted LSP for advanced features
- Progressive enhancement based on connectivity

#### Web Browser
- WebAssembly-based LSP servers
- Web Worker isolation
- IndexedDB for persistence
- Service Worker for offline support

## Mobile-Specific Features [PLATFORM]

### QR Code Sharing
Mobile platforms support unique distribution methods optimized for classroom and conference settings:

```typescript
interface QRCodeSharing {
  // Generate shareable QR code
  generateQR(packageId: string): Promise<QRCode>;
  
  // Scan and install
  scanAndInstall(): Promise<PackageInfo>;
  
  // Bulk classroom distribution
  bulkShare(packages: string[]): Promise<QRCode[]>;
}
```

### App Bundle Distribution
```typescript
interface MobilePackageDistribution {
  // Pre-bundled packages included with app installation
  bundledPackages: {
    basicLogic: string;      // Path in app bundle
    propositionalLogic: string;
    firstOrderLogic: string;
  };
  
  // Downloadable packages from approved sources
  downloadableSources: {
    github: GitHubPackageSource;
    universityServers: UniversityPackageSource[];
    verifiedPublishers: VerifiedPackageSource[];
  };
  
  // Local package creation for course instructors
  localPackageSupport: {
    packageBuilder: boolean;
    exportSharing: boolean;
    qrCodeSharing: boolean;
  };
}
```

### Mobile-Specific Package Features

#### Touch-Optimized UI Packages
```json
{
  "name": "mobile-friendly-logic",
  "version": "1.0.0",
  "mobileOptimizations": {
    "touchTargetSize": "large",
    "gestureSupport": ["pinch", "pan", "double-tap"],
    "landscapeLayout": true,
    "portraitLayout": true,
    "keyboardType": "logical-symbols"
  },
  "platformAdaptations": {
    "vs-code": {
      "keybindings": "./config/desktop-keybindings.json"
    },
    "react-native": {
      "touchGestures": "./config/mobile-gestures.json",
      "customKeyboard": "./config/mobile-keyboard.json"
    }
  }
}
```

#### Offline-First Package Design
```typescript
interface OfflinePackageConfig {
  // Essential functionality available offline
  offlineCapabilities: {
    validation: 'local' | 'cached' | 'disabled';
    completion: 'local' | 'cached' | 'disabled';
    analysis: 'local' | 'cached' | 'disabled';
  };
  
  // Background sync when online
  syncStrategy: {
    uploadProofs: boolean;
    downloadUpdates: boolean;
    syncFrequency: 'immediate' | 'hourly' | 'daily';
    wifiOnly: boolean;
  };
  
  // Fallback strategies
  fallbacks: {
    noNetwork: 'cache' | 'basic-local' | 'disabled';
    lowBandwidth: 'reduce-quality' | 'defer-sync' | 'cache-only';
    lowStorage: 'clear-cache' | 'compress' | 'warn-user';
  };
}
```

### Mobile Installation Patterns

#### QR Code Package Sharing
```typescript
interface QRCodePackageSharing {
  // Generate QR code for package sharing
  generatePackageQR(packageId: string): Promise<{
    qrCode: string; // Base64 image
    shareUrl: string; // Deep link URL
    expirationTime: Date;
  }>;
  
  // Install package from QR code scan
  installFromQR(qrData: string): Promise<PackageInfo>;
  
  // Classroom sharing workflow
  classroomSharing: {
    instructorGenerate: boolean;
    studentScan: boolean;
    bulkInstall: boolean;
    progressTracking: boolean;
  };
}
```

#### App Bundle Package Preloading
```typescript
interface BundledPackageManager {
  // Packages included with app installation
  listBundledPackages(): Promise<PackageInfo[]>;
  
  // Activate bundled packages
  activateBundledPackage(packageId: string): Promise<void>;
  
  // Update bundled packages with app updates
  updateBundledPackages(): Promise<PackageInfo[]>;
  
  // Custom package bundling for enterprise apps
  bundleCustomPackages(packageIds: string[]): Promise<void>;
}
```