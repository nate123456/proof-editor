# Platform Testing and Migration Strategy

## Introduction

This document outlines the comprehensive testing strategy for the platform abstraction layer and provides a detailed migration plan for transitioning from VS Code-specific implementation to a multi-platform architecture. The strategy ensures high code quality, platform parity, and smooth migration with minimal disruption.

## Testing Strategy Overview

The testing strategy consists of three layers:
1. **Platform-Agnostic Core Tests**: Test business logic independently of platforms
2. **Adapter Contract Tests**: Ensure all adapters implement interfaces correctly
3. **Platform Integration Tests**: Verify platform-specific implementations work correctly

## Platform-Agnostic Core Tests

These tests verify the core business logic works correctly regardless of platform:

```typescript
// Core business logic tests work on any platform
describe('ProofEngine', () => {
  let engine: ProofEngine;
  let mockPlatform: PlatformContainer;
  
  beforeEach(() => {
    mockPlatform = createMockPlatform();
    engine = new ProofEngine(mockPlatform);
  });
  
  describe('Atomic Argument Creation', () => {
    it('should create atomic arguments with ordered sets', async () => {
      const argument = await engine.createAtomicArgument({
        premises: ['P', 'P → Q'],
        conclusions: ['Q'],
        rule: 'Modus Ponens'
      });
      
      expect(argument.id).toBeDefined();
      expect(argument.premiseSet.statements).toEqual(['P', 'P → Q']);
      expect(argument.conclusionSet.statements).toEqual(['Q']);
      expect(argument.rule).toBe('Modus Ponens');
    });
    
    it('should establish connections through shared ordered sets', async () => {
      const arg1 = await engine.createAtomicArgument({
        premises: ['P'],
        conclusions: ['Q']
      });
      
      const arg2 = await engine.createAtomicArgument({
        premises: ['Q'], // Same as arg1's conclusion
        conclusions: ['R']
      });
      
      const connections = engine.getConnections(arg1);
      expect(connections).toContain(arg2);
      expect(arg1.conclusionSet).toBe(arg2.premiseSet); // Same object reference
    });
  });
  
  describe('Tree Navigation', () => {
    it('should navigate up and down the proof tree', async () => {
      const root = await engine.createAtomicArgument({
        premises: [],
        conclusions: ['A']
      });
      
      const child = await engine.branch(root, 'conclusion', {
        conclusions: ['B']
      });
      
      expect(engine.getParent(child)).toBe(root);
      expect(engine.getChildren(root)).toContain(child);
    });
  });
});

// Mock platform for testing
function createMockPlatform(): PlatformContainer {
  return {
    fileSystem: createMockFileSystem(),
    settings: createMockSettings(),
    ui: createMockUI(),
    lsp: createMockLSP(),
    commands: createMockCommands(),
    packages: createMockPackages(),
    theme: createMockTheme(),
    language: createMockLanguage()
  };
}

function createMockFileSystem(): FileSystemAdapter {
  const files = new Map<string, string>();
  
  return {
    async readFile(path: string): Promise<string> {
      const content = files.get(path);
      if (!content) throw new Error(`File not found: ${path}`);
      return content;
    },
    
    async writeFile(path: string, content: string): Promise<void> {
      files.set(path, content);
    },
    
    async exists(path: string): Promise<boolean> {
      return files.has(path);
    },
    
    // ... other methods
  };
}
```

## Adapter Contract Tests

Contract tests ensure all platform implementations correctly implement the adapter interfaces:

```typescript
// Shared contract tests for all FileSystemAdapter implementations
export function fileSystemAdapterContractTests(
  createAdapter: () => FileSystemAdapter,
  testDirectory: string
) {
  describe('FileSystemAdapter Contract', () => {
    let adapter: FileSystemAdapter;
    
    beforeEach(() => {
      adapter = createAdapter();
    });
    
    describe('File Operations', () => {
      const testFile = `${testDirectory}/test.txt`;
      const testContent = 'Hello, World!';
      
      afterEach(async () => {
        // Cleanup
        if (await adapter.exists(testFile)) {
          await adapter.deleteFile(testFile);
        }
      });
      
      it('should write and read files', async () => {
        await adapter.writeFile(testFile, testContent);
        const content = await adapter.readFile(testFile);
        expect(content).toBe(testContent);
      });
      
      it('should check file existence', async () => {
        expect(await adapter.exists(testFile)).toBe(false);
        await adapter.writeFile(testFile, testContent);
        expect(await adapter.exists(testFile)).toBe(true);
      });
      
      it('should delete files', async () => {
        await adapter.writeFile(testFile, testContent);
        await adapter.deleteFile(testFile);
        expect(await adapter.exists(testFile)).toBe(false);
      });
      
      it('should handle non-existent files', async () => {
        await expect(adapter.readFile('/non/existent/file')).rejects.toThrow();
      });
    });
    
    describe('Directory Operations', () => {
      const testDir = `${testDirectory}/test-dir`;
      
      afterEach(async () => {
        // Cleanup
        if (await adapter.exists(testDir)) {
          const files = await adapter.listDirectory(testDir);
          for (const file of files) {
            if (!file.isDirectory) {
              await adapter.deleteFile(file.path);
            }
          }
        }
      });
      
      it('should create directories', async () => {
        await adapter.createDirectory(testDir);
        expect(await adapter.exists(testDir)).toBe(true);
      });
      
      it('should list directory contents', async () => {
        await adapter.createDirectory(testDir);
        await adapter.writeFile(`${testDir}/file1.txt`, 'content1');
        await adapter.writeFile(`${testDir}/file2.txt`, 'content2');
        
        const files = await adapter.listDirectory(testDir);
        expect(files).toHaveLength(2);
        expect(files.map(f => f.name)).toContain('file1.txt');
        expect(files.map(f => f.name)).toContain('file2.txt');
      });
    });
    
    describe('File Watching', () => {
      const watchFile = `${testDirectory}/watch.txt`;
      
      it('should detect file changes', async (done) => {
        await adapter.writeFile(watchFile, 'initial');
        
        const watcher = adapter.watchFile(watchFile, (content, event) => {
          if (event === 'modified') {
            expect(content).toBe('modified');
            watcher.dispose();
            done();
          }
        });
        
        // Trigger change
        setTimeout(() => {
          adapter.writeFile(watchFile, 'modified');
        }, 100);
      });
    });
    
    describe('Path Utilities', () => {
      it('should join paths correctly', () => {
        expect(adapter.joinPath('/foo', 'bar', 'baz.txt')).toBe('/foo/bar/baz.txt');
        expect(adapter.joinPath('foo/', '/bar')).toBe('foo/bar');
      });
      
      it('should extract dirname', () => {
        expect(adapter.dirname('/foo/bar/baz.txt')).toBe('/foo/bar');
        expect(adapter.dirname('/foo')).toBe('/');
      });
      
      it('should extract basename', () => {
        expect(adapter.basename('/foo/bar/baz.txt')).toBe('baz.txt');
        expect(adapter.basename('/foo/bar/')).toBe('bar');
      });
    });
  });
}

// Run contract tests for VS Code implementation
describe('VS Code FileSystemAdapter', () => {
  fileSystemAdapterContractTests(
    () => new VSCodeFileSystemAdapter(),
    '/tmp/vscode-test'
  );
});

// Run contract tests for React Native implementation
describe('React Native FileSystemAdapter', () => {
  fileSystemAdapterContractTests(
    () => new ReactNativeFileSystemAdapter(),
    RNFS.DocumentDirectoryPath + '/test'
  );
});
```

## Platform Integration Tests

Platform-specific integration tests verify the implementations work correctly with actual platform APIs:

### VS Code Integration Tests

```typescript
// Test VS Code adapter implementation
describe('VSCodeFileSystemAdapter Integration', () => {
  let adapter: VSCodeFileSystemAdapter;
  let workspace: vscode.WorkspaceFolder;
  
  beforeEach(async () => {
    adapter = new VSCodeFileSystemAdapter();
    workspace = vscode.workspace.workspaceFolders![0];
  });
  
  it('should integrate with VS Code file system API', async () => {
    const testFile = vscode.Uri.joinPath(workspace.uri, 'test-integration.txt');
    const content = 'VS Code integration test';
    
    // Write through adapter
    await adapter.writeFile(testFile.fsPath, content);
    
    // Verify through VS Code API
    const data = await vscode.workspace.fs.readFile(testFile);
    const vsCodeContent = Buffer.from(data).toString('utf8');
    expect(vsCodeContent).toBe(content);
    
    // Cleanup
    await vscode.workspace.fs.delete(testFile);
  });
  
  it('should handle VS Code file watchers', async () => {
    const testFile = vscode.Uri.joinPath(workspace.uri, 'watch-test.txt');
    
    return new Promise((resolve) => {
      // Create watcher through adapter
      const watcher = adapter.watchFile(testFile.fsPath, (content, event) => {
        if (event === 'created') {
          expect(content).toBe('watched content');
          watcher.dispose();
          resolve(undefined);
        }
      });
      
      // Create file through VS Code API
      setTimeout(async () => {
        const data = Buffer.from('watched content', 'utf8');
        await vscode.workspace.fs.writeFile(testFile, data);
      }, 100);
    });
  });
});

describe('VSCodeUIAdapter Integration', () => {
  let adapter: VSCodeUIAdapter;
  
  beforeEach(() => {
    adapter = new VSCodeUIAdapter();
  });
  
  it('should show messages through VS Code API', async () => {
    // Mock VS Code window API
    const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage');
    const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage');
    
    await adapter.showMessage('Info message', 'info');
    expect(showInfoSpy).toHaveBeenCalledWith('Info message');
    
    await adapter.showMessage('Error message', 'error');
    expect(showErrorSpy).toHaveBeenCalledWith('Error message');
  });
  
  it('should create webview panels', () => {
    const webview = adapter.createWebView({
      title: 'Test WebView',
      enableScripts: true
    });
    
    expect(webview).toBeDefined();
    expect(webview.html).toBe('');
    
    webview.html = '<h1>Test</h1>';
    expect(webview.html).toBe('<h1>Test</h1>');
    
    webview.dispose();
  });
});
```

### React Native Integration Tests

```typescript
// Test React Native adapter implementation
describe('ReactNativeFileSystemAdapter Integration', () => {
  let adapter: ReactNativeFileSystemAdapter;
  
  beforeEach(() => {
    adapter = new ReactNativeFileSystemAdapter();
  });
  
  it('should integrate with React Native file system', async () => {
    const testFile = `${RNFS.DocumentDirectoryPath}/rn-integration-test.txt`;
    const content = 'React Native integration test';
    
    // Write through adapter
    await adapter.writeFile(testFile, content);
    
    // Verify through RNFS
    const rnContent = await RNFS.readFile(testFile, 'utf8');
    expect(rnContent).toBe(content);
    
    // Cleanup
    await RNFS.unlink(testFile);
  });
  
  it('should enforce sandboxing', async () => {
    // Attempt to write outside sandbox
    const forbiddenPath = '/system/test.txt';
    
    await expect(adapter.writeFile(forbiddenPath, 'test'))
      .rejects.toThrow('Access denied: Path outside sandbox');
  });
});

describe('ReactNativeSettingsAdapter Integration', () => {
  let adapter: ReactNativeSettingsAdapter;
  
  beforeEach(() => {
    adapter = new ReactNativeSettingsAdapter();
    AsyncStorage.clear();
  });
  
  it('should integrate with AsyncStorage', async () => {
    const key = 'test-setting';
    const value = { foo: 'bar' };
    
    // Set through adapter
    await adapter.set(key, value);
    
    // Verify through AsyncStorage
    const stored = await AsyncStorage.getItem(`@ProofEditor:${key}`);
    expect(JSON.parse(stored!)).toEqual(value);
  });
  
  it('should handle scoped settings', async () => {
    await adapter.setScoped('workspace', 'theme', 'dark');
    await adapter.setScoped('global', 'theme', 'light');
    
    expect(adapter.getScoped('workspace', 'theme')).toBe('dark');
    expect(adapter.getScoped('global', 'theme')).toBe('light');
  });
});
```

## Performance Testing

Performance tests ensure the platform abstraction layer doesn't introduce significant overhead:

```typescript
describe('Platform Abstraction Performance', () => {
  const iterations = 1000;
  
  it('should have minimal overhead for file operations', async () => {
    const mockAdapter = createMockFileSystem();
    const content = 'x'.repeat(1024); // 1KB
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await mockAdapter.writeFile(`/test${i}.txt`, content);
      await mockAdapter.readFile(`/test${i}.txt`);
    }
    
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;
    
    expect(avgTime).toBeLessThan(1); // Less than 1ms per operation
  });
  
  it('should efficiently handle large proof documents', async () => {
    const engine = new ProofEngine(createMockPlatform());
    
    const startTime = performance.now();
    
    // Create a large proof tree
    const root = await engine.createAtomicArgument({
      premises: [],
      conclusions: ['Root']
    });
    
    for (let i = 0; i < 100; i++) {
      await engine.branch(root, 'conclusion', {
        conclusions: [`Branch${i}`]
      });
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(1000); // Less than 1 second for 100 branches
  });
});
```

## Migration Strategy

The migration from VS Code-specific implementation to platform-agnostic architecture follows a phased approach:

### Phase 1: Interface Definition (Week 1-2)

1. **Define all platform abstraction interfaces**
   ```typescript
   // Create comprehensive interface definitions
   interface FileSystemAdapter { /* ... */ }
   interface SettingsAdapter { /* ... */ }
   interface UIAdapter { /* ... */ }
   // ... etc
   ```

2. **Create mock implementations for testing**
   ```typescript
   class MockFileSystemAdapter implements FileSystemAdapter {
     // Simple in-memory implementation for testing
   }
   ```

3. **Update core types to use abstractions**
   ```typescript
   // Before
   class ProofDocument {
     async save() {
       await vscode.workspace.fs.writeFile(/* ... */);
     }
   }
   
   // After
   class ProofDocument {
     constructor(private fileSystem: FileSystemAdapter) {}
     
     async save() {
       await this.fileSystem.writeFile(/* ... */);
     }
   }
   ```

### Phase 2: VS Code Adapter Implementation (Week 3-4)

1. **Implement VS Code adapters for all interfaces**
   ```typescript
   class VSCodeFileSystemAdapter implements FileSystemAdapter {
     // Wrap VS Code APIs
   }
   ```

2. **Update existing VS Code code to use adapters**
   ```typescript
   // In extension.ts
   const platform = createVSCodePlatform();
   const proofEditor = new ProofEditorCore(platform);
   ```

3. **Maintain backward compatibility**
   - Keep existing command IDs
   - Preserve settings structure
   - Maintain file format compatibility

### Phase 3: Core Business Logic Refactor (Week 5-8)

1. **Remove direct VS Code dependencies from core code**
   ```typescript
   // Remove all 'vscode' imports from core modules
   // Replace with platform adapter usage
   ```

2. **Inject platform adapters through dependency injection**
   ```typescript
   class ProofEditorCore {
     constructor(private platform: PlatformContainer) {
       // Initialize with injected adapters
     }
   }
   ```

3. **Ensure all core functionality is platform-agnostic**
   - Test core logic with mock adapters
   - Verify no platform-specific code remains

### Phase 4: React Native Implementation (Week 9-12)

1. **Implement React Native adapters**
   ```typescript
   class ReactNativeFileSystemAdapter implements FileSystemAdapter {
     // React Native specific implementation
   }
   ```

2. **Create React Native app shell**
   ```typescript
   // App.tsx
   const platform = createReactNativePlatform();
   const proofEditor = new ProofEditorCore(platform);
   ```

3. **Integrate core business logic with React Native adapters**
   - Set up navigation
   - Implement touch interactions
   - Configure mobile-specific features

### Phase 5: Testing and Optimization (Week 13-16)

1. **Comprehensive testing on both platforms**
   - Run all contract tests
   - Perform integration testing
   - Conduct user acceptance testing

2. **Performance optimization for mobile**
   - Profile and optimize rendering
   - Reduce memory usage
   - Optimize battery consumption

3. **UI/UX adaptation for touch interfaces**
   - Adjust hit targets
   - Implement gestures
   - Optimize layouts for mobile screens

## Migration Checklist

### Pre-Migration Preparation
- [ ] Document all VS Code specific features
- [ ] Identify platform-specific dependencies
- [ ] Create migration branch in version control
- [ ] Set up CI/CD for multi-platform builds
- [ ] Notify users of upcoming changes

### During Migration
- [ ] Implement all adapter interfaces
- [ ] Create comprehensive test suite
- [ ] Maintain backward compatibility
- [ ] Document breaking changes
- [ ] Regular testing on both platforms

### Post-Migration Validation
- [ ] All tests pass on both platforms
- [ ] Performance benchmarks meet targets
- [ ] User acceptance testing complete
- [ ] Documentation updated
- [ ] Migration guide published

## Rollback Plan

In case of critical issues during migration:

1. **Version Control Strategy**
   - Tag stable version before migration
   - Maintain migration branch separate from main
   - Regular commits with clear messages

2. **Feature Flags**
   ```typescript
   if (FeatureFlags.usePlatformAbstraction) {
     // New platform-agnostic code
   } else {
     // Legacy VS Code specific code
   }
   ```

3. **Gradual Rollout**
   - Beta testing with select users
   - Phased rollout by feature
   - Monitor error rates and performance

4. **Emergency Rollback**
   ```bash
   # Revert to pre-migration tag
   git checkout pre-migration-stable
   
   # Create hotfix branch if needed
   git checkout -b hotfix/critical-issue
   ```

## Success Metrics

### Code Quality Metrics
- **Test Coverage**: >90% for core logic, >80% for adapters
- **Code Duplication**: <5% across platforms
- **Cyclomatic Complexity**: <10 for all methods
- **Type Coverage**: 100% TypeScript strict mode

### Performance Metrics
- **Startup Time**: <3s on mobile, <1s on desktop
- **Memory Usage**: <200MB for large documents
- **Response Time**: <100ms for user interactions
- **Battery Impact**: <5% per hour on mobile

### User Satisfaction Metrics
- **Feature Parity**: 100% core features on both platforms
- **Crash Rate**: <0.1% of sessions
- **User Ratings**: >4.5 stars on app stores
- **Migration Success**: >95% of users successfully migrated

## Conclusion

This testing and migration strategy ensures a smooth transition from VS Code-specific implementation to a multi-platform architecture. By following this phased approach with comprehensive testing at each stage, we can maintain stability while expanding Proof Editor's reach to mobile platforms. The platform abstraction layer provides the foundation for sustainable multi-platform development while preserving the rich functionality users expect.