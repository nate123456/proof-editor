# Language Security

## Overview

This document outlines the security model for Proof Editor's language management system. It covers package verification, sandboxing, permission models, and best practices for ensuring safe execution of language servers.

## Security Principles

1. **Least Privilege**: Language servers run with minimal necessary permissions
2. **Verification**: All packages are verified before installation
3. **Sandboxing**: Servers execute in isolated environments
4. **User Consent**: Elevated permissions require explicit approval
5. **Transparency**: Clear visibility into what languages can do

## Package Verification

### Signature Verification

All language packages should be cryptographically signed:

```typescript
interface PackageVerifier {
  // Signature verification
  async verifySignature(
    packageData: Buffer,
    signature: string
  ): Promise<boolean> {
    // Verify package hasn't been tampered with
    const publicKey = await this.getPublisherKey(packageData);
    return crypto.verify(packageData, signature, publicKey);
  }
  
  // Content validation
  async validatePackage(package: LanguagePackage): Promise<ValidationResult> {
    const checks = [
      this.checkManifest(package),
      this.checkDependencies(package),
      this.scanForMalware(package),
      this.checkPermissions(package)
    ];
    
    return Promise.all(checks);
  }
  
  // Publisher verification
  async verifyPublisher(package: LanguagePackage): Promise<PublisherInfo> {
    const manifest = package.manifest;
    
    // Check against known publishers
    const knownPublisher = await this.getKnownPublisher(manifest.author);
    
    // Verify domain ownership for URLs
    if (manifest.homepage) {
      await this.verifyDomainOwnership(manifest.author, manifest.homepage);
    }
    
    return {
      verified: knownPublisher?.verified || false,
      reputation: knownPublisher?.reputation || 'unknown',
      warnings: this.getPublisherWarnings(manifest.author)
    };
  }
}
```

### Content Scanning

Scan packages for malicious content:

```typescript
interface MalwareScanner {
  async scanPackage(package: LanguagePackage): Promise<ScanResult> {
    const results: ScanIssue[] = [];
    
    // Check for suspicious patterns
    const patterns = [
      /eval\s*\(/,           // Dynamic code execution
      /require\s*\([^"']/,   // Dynamic requires
      /child_process/,       // Process spawning
      /\.\.\/\.\.\//,       // Directory traversal
      /rm\s+-rf/            // Dangerous commands
    ];
    
    for (const file of package.files) {
      const content = await this.readFile(file);
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          results.push({
            file: file.path,
            pattern: pattern.toString(),
            severity: 'warning',
            description: 'Potentially dangerous pattern detected'
          });
        }
      }
    }
    
    // Check binary files
    const binaries = package.files.filter(f => this.isBinary(f));
    for (const binary of binaries) {
      const scan = await this.scanBinary(binary);
      results.push(...scan.issues);
    }
    
    return {
      clean: results.length === 0,
      issues: results
    };
  }
}
```

## Sandboxing

### Process Isolation

Language servers run in isolated processes:

```typescript
interface Sandbox {
  // Sandboxing configuration
  sandboxConfig: {
    fileSystemAccess: 'read-only' | 'none';
    networkAccess: false;
    processSpawning: 'restricted';
    memoryLimit: '512MB';
    cpuLimit: '50%';
    timeout: 30000; // 30 seconds
  };
  
  // Create sandboxed environment
  async createSandbox(language: string): Promise<SandboxEnvironment> {
    const config = this.sandboxConfig;
    
    // Platform-specific sandboxing
    if (process.platform === 'darwin') {
      return this.createMacOSSandbox(language, config);
    } else if (process.platform === 'linux') {
      return this.createLinuxSandbox(language, config);
    } else if (process.platform === 'win32') {
      return this.createWindowsSandbox(language, config);
    }
  }
  
  // macOS: Use sandbox-exec
  async createMacOSSandbox(
    language: string,
    config: SandboxConfig
  ): Promise<SandboxEnvironment> {
    const profile = this.generateSandboxProfile(config);
    
    return {
      command: 'sandbox-exec',
      args: ['-p', profile, '--'],
      env: this.getSandboxEnv(language)
    };
  }
}
```

### Resource Limits

Enforce resource constraints:

```typescript
interface ResourceLimiter {
  // Memory limits
  async enforceMemoryLimit(process: Process, limit: string): Promise<void> {
    const bytes = this.parseSize(limit);
    
    // Monitor memory usage
    const interval = setInterval(async () => {
      const usage = await this.getMemoryUsage(process);
      if (usage > bytes) {
        await this.handleMemoryExceeded(process);
      }
    }, 1000);
    
    process.on('exit', () => clearInterval(interval));
  }
  
  // CPU limits
  async enforceCpuLimit(process: Process, limit: string): Promise<void> {
    const percent = parseInt(limit);
    
    // Platform-specific CPU limiting
    if (process.platform === 'linux') {
      // Use cgroups
      await this.applyCgroupLimit(process.pid, percent);
    } else {
      // Use nice/renice
      await this.applyNiceValue(process.pid, percent);
    }
  }
  
  // Timeout enforcement
  enforceTimeout(process: Process, timeout: number): void {
    setTimeout(() => {
      if (!process.killed) {
        process.kill('SIGTERM');
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      }
    }, timeout);
  }
}
```

## Permission Model

### Permission Declaration

Languages must declare required permissions:

```typescript
interface LanguagePermissions {
  // Required permissions declared in manifest
  required: {
    fileSystem?: {
      read?: string[];  // Paths that can be read
      write?: string[]; // Paths that can be written
    };
    network?: {
      urls?: string[];  // Allowed URLs
      ports?: number[]; // Allowed ports
    };
    process?: {
      spawn?: string[]; // Allowed executables
    };
  };
  
  // User approval required for sensitive permissions
  async requestPermissions(
    language: LanguageInfo
  ): Promise<GrantedPermissions> {
    const required = language.manifest.permissions;
    
    // Show permission dialog
    const approved = await this.ui.showPermissionDialog({
      title: `${language.name} requires permissions`,
      permissions: required,
      risks: this.assessRisks(required)
    });
    
    if (!approved) {
      throw new Error('Permissions denied');
    }
    
    return this.grantPermissions(language, required);
  }
}
```

### Permission Enforcement

Runtime enforcement of granted permissions:

```typescript
interface PermissionEnforcer {
  // File system access control
  async checkFileAccess(
    language: string,
    path: string,
    mode: 'read' | 'write'
  ): Promise<boolean> {
    const permissions = await this.getPermissions(language);
    const allowed = permissions.fileSystem?.[mode] || [];
    
    // Check if path matches allowed patterns
    return allowed.some(pattern => 
      this.matchPath(path, pattern)
    );
  }
  
  // Network access control
  async checkNetworkAccess(
    language: string,
    url: string
  ): Promise<boolean> {
    const permissions = await this.getPermissions(language);
    const allowed = permissions.network?.urls || [];
    
    // Check if URL matches allowed patterns
    return allowed.some(pattern => 
      this.matchUrl(url, pattern)
    );
  }
  
  // Intercept and validate operations
  createProxy(language: string): OperationProxy {
    return {
      readFile: async (path: string) => {
        if (!await this.checkFileAccess(language, path, 'read')) {
          throw new Error(`Access denied: ${path}`);
        }
        return this.fs.readFile(path);
      },
      
      fetch: async (url: string, options?: any) => {
        if (!await this.checkNetworkAccess(language, url)) {
          throw new Error(`Network access denied: ${url}`);
        }
        return fetch(url, options);
      }
    };
  }
}
```

## Security Best Practices

### For Language Developers

1. **Minimize Permissions**
   - Only request necessary permissions
   - Use specific paths instead of wildcards
   - Avoid network access if possible

2. **Sign Your Packages**
   - Use GPG or similar for package signing
   - Publish public keys securely
   - Include signature in releases

3. **Security Documentation**
   - Document what permissions are needed and why
   - Explain security implications
   - Provide security contact information

4. **Regular Updates**
   - Keep dependencies updated
   - Respond quickly to security reports
   - Use automated security scanning

5. **Safe Defaults**
   - Disable dangerous features by default
   - Require explicit opt-in for risky operations
   - Fail securely on errors

### For Users

1. **Verify Publishers**
   - Only install from trusted sources
   - Check publisher reputation
   - Look for verification badges

2. **Review Permissions**
   - Understand what access is requested
   - Deny unnecessary permissions
   - Be cautious with file system write access

3. **Keep Updated**
   - Install security updates promptly
   - Enable automatic updates if available
   - Monitor security advisories

4. **Report Issues**
   - Report suspicious behavior
   - Contact publishers about concerns
   - Share experiences with community

### For Platform Implementers

1. **Defense in Depth**
   - Multiple layers of security
   - Assume each layer can fail
   - Monitor for anomalies

2. **Secure Defaults**
   - Sandboxing enabled by default
   - Minimal permissions by default
   - Require opt-in for dangerous features

3. **Transparency**
   - Clear permission prompts
   - Activity logging
   - Security dashboard

4. **Incident Response**
   - Plan for security incidents
   - Quick revocation mechanism
   - Clear communication channels

## Security Monitoring

### Runtime Monitoring

Monitor language server behavior:

```typescript
interface SecurityMonitor {
  // Activity logging
  async logActivity(
    language: string,
    activity: SecurityActivity
  ): Promise<void> {
    const log: ActivityLog = {
      timestamp: new Date(),
      language,
      activity: activity.type,
      details: activity.details,
      risk: this.assessRisk(activity)
    };
    
    await this.storage.append('security.log', log);
    
    // Alert on high-risk activities
    if (log.risk === 'high') {
      await this.alertUser(log);
    }
  }
  
  // Anomaly detection
  async detectAnomalies(language: string): Promise<Anomaly[]> {
    const baseline = await this.getBaseline(language);
    const current = await this.getCurrentMetrics(language);
    
    const anomalies: Anomaly[] = [];
    
    // Check for unusual file access patterns
    if (current.fileAccess > baseline.fileAccess * 2) {
      anomalies.push({
        type: 'excessive-file-access',
        severity: 'medium',
        description: 'Unusual number of file operations'
      });
    }
    
    // Check for unexpected network activity
    if (current.networkRequests > 0 && !baseline.hasNetwork) {
      anomalies.push({
        type: 'unexpected-network',
        severity: 'high',
        description: 'Network activity from non-network language'
      });
    }
    
    return anomalies;
  }
}
```

## Incident Response

### Handling Security Incidents

```typescript
interface IncidentResponse {
  async handleSecurityIncident(
    incident: SecurityIncident
  ): Promise<void> {
    // 1. Contain the threat
    await this.containThreat(incident);
    
    // 2. Assess impact
    const impact = await this.assessImpact(incident);
    
    // 3. Notify affected users
    await this.notifyUsers(impact.affectedUsers, incident);
    
    // 4. Remediate
    await this.remediate(incident);
    
    // 5. Document
    await this.documentIncident(incident);
  }
  
  async containThreat(incident: SecurityIncident): Promise<void> {
    // Stop affected language servers
    await this.stopLanguageServer(incident.language);
    
    // Revoke permissions
    await this.revokePermissions(incident.language);
    
    // Block further installations
    await this.blockLanguage(incident.language, incident.version);
  }
  
  async remediate(incident: SecurityIncident): Promise<void> {
    // Remove malicious package
    await this.uninstallLanguage(incident.language);
    
    // Clean up any modifications
    await this.cleanupModifications(incident);
    
    // Restore from backups if needed
    if (incident.requiresRestore) {
      await this.restoreFromBackup(incident.affectedFiles);
    }
  }
}
```

## Implementation Roadmap

### Phase 1: Basic Security
- [ ] Package signature verification
- [ ] Basic permission model
- [ ] Simple sandboxing

### Phase 2: Enhanced Security
- [ ] Advanced sandboxing
- [ ] Runtime monitoring
- [ ] Anomaly detection

### Phase 3: Complete Security
- [ ] Full permission enforcement
- [ ] Security dashboard
- [ ] Incident response system

## See Also

- [Language Architecture](./language-architecture.md) - Understanding language packages
- [Language Discovery](./language-discovery.md) - Secure discovery and installation
- [LSP Lifecycle](./lsp-lifecycle.md) - Secure server execution
- [Security](../security.md) - Overall security architecture