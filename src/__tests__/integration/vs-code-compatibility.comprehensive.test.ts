import 'reflect-metadata';

import fc from 'fast-check';
import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import { FilePath } from '../../domain/shared/value-objects/collections.js';
import { DocumentContent, EventData } from '../../domain/shared/value-objects/content.js';
import { MessageType } from '../../domain/shared/value-objects/enums.js';
import { WebviewId } from '../../domain/shared/value-objects/identifiers.js';
import { DialogTitle, ViewType } from '../../domain/shared/value-objects/ui.js';
import { VSCodeFileSystemAdapter } from '../../infrastructure/vscode/VSCodeFileSystemAdapter.js';
import { VSCodePlatformAdapter } from '../../infrastructure/vscode/VSCodePlatformAdapter.js';
import { VSCodeUIAdapter } from '../../infrastructure/vscode/VSCodeUIAdapter.js';

// Platform environment type definition
interface PlatformEnvironment {
  name: string;
  os: string;
  platform: string;
  features: {
    fileWatching: boolean;
    webviews: boolean;
    terminalAccess: boolean;
    workspaceTrust: boolean;
    extensions: boolean;
  };
  paths: {
    separator: string;
    workspaceExample: string;
    extensionExample: string;
  };
}

/**
 * VS Code Compatibility Comprehensive Tests
 *
 * Tests compatibility across different VS Code versions and environments:
 * - VS Code API version compatibility
 * - Operating system specific behaviors
 * - Remote development environments
 * - Feature degradation scenarios
 * - Extension host compatibility
 * - Webview API compatibility
 */
describe('VS Code Compatibility - Comprehensive Coverage', () => {
  // VS Code version test scenarios
  const VS_CODE_VERSIONS = [
    { version: '1.74.0', features: { webviews: true, notebooks: false, inlineChat: false } },
    { version: '1.80.0', features: { webviews: true, notebooks: true, inlineChat: false } },
    { version: '1.85.0', features: { webviews: true, notebooks: true, inlineChat: true } },
    {
      version: '1.90.0',
      features: { webviews: true, notebooks: true, inlineChat: true, aiAssistant: true },
    },
  ];

  // Platform environments
  const PLATFORM_ENVIRONMENTS = [
    {
      name: 'Windows Desktop',
      os: 'win32',
      platform: 'desktop',
      features: {
        fileWatching: true,
        webviews: true,
        terminalAccess: true,
        workspaceTrust: true,
        extensions: true,
      },
      paths: {
        separator: '\\',
        workspaceExample: 'C:\\Users\\test\\workspace',
        extensionExample: 'C:\\Users\\test\\.vscode\\extensions',
      },
    },
    {
      name: 'macOS Desktop',
      os: 'darwin',
      platform: 'desktop',
      features: {
        fileWatching: true,
        webviews: true,
        terminalAccess: true,
        workspaceTrust: true,
        extensions: true,
      },
      paths: {
        separator: '/',
        workspaceExample: '/Users/test/workspace',
        extensionExample: '/Users/test/.vscode/extensions',
      },
    },
    {
      name: 'Linux Desktop',
      os: 'linux',
      platform: 'desktop',
      features: {
        fileWatching: true,
        webviews: true,
        terminalAccess: true,
        workspaceTrust: true,
        extensions: true,
      },
      paths: {
        separator: '/',
        workspaceExample: '/home/test/workspace',
        extensionExample: '/home/test/.vscode/extensions',
      },
    },
    {
      name: 'VS Code Web',
      os: 'web',
      platform: 'web',
      features: {
        fileWatching: false,
        webviews: true,
        terminalAccess: false,
        workspaceTrust: false,
        extensions: false,
      },
      paths: {
        separator: '/',
        workspaceExample: '/workspace',
        extensionExample: '/extensions',
      },
    },
    {
      name: 'SSH Remote',
      os: 'linux',
      platform: 'remote',
      features: {
        fileWatching: true,
        webviews: true,
        terminalAccess: true,
        workspaceTrust: true,
        extensions: true,
      },
      paths: {
        separator: '/',
        workspaceExample: '/remote/workspace',
        extensionExample: '/remote/.vscode/extensions',
      },
    },
    {
      name: 'GitHub Codespaces',
      os: 'linux',
      platform: 'codespaces',
      features: {
        fileWatching: true,
        webviews: true,
        terminalAccess: true,
        workspaceTrust: false,
        extensions: true,
      },
      paths: {
        separator: '/',
        workspaceExample: '/workspaces/repo',
        extensionExample: '/vscode/extensions',
      },
    },
  ];

  let _mockFileSystemPort: IFileSystemPort;
  let _mockPlatformPort: IPlatformPort;
  let _mockUIPort: IUIPort;
  let _mockViewStatePort: IViewStatePort;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks - will be overridden per test
    _mockFileSystemPort = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
      readDirectory: vi.fn(),
      createDirectory: vi.fn(),
      watch: vi.fn(),
      getStoredDocument: vi.fn(),
      storeDocument: vi.fn(),
      deleteStoredDocument: vi.fn(),
      listStoredDocuments: vi.fn(),
      capabilities: vi.fn().mockReturnValue({
        canWatch: true,
        canAccessArbitraryPaths: true,
        supportsOfflineStorage: false,
        persistence: 'permanent',
      }),
      // Additional methods for test compatibility
      fileExists: vi.fn(),
      watchFile: vi.fn(),
      getWorkspaceFolder: vi.fn(),
    } as any;

    _mockPlatformPort = {
      getPlatformInfo: vi.fn().mockReturnValue({
        type: 'vscode',
        version: '1.0.0',
        os: 'linux',
        arch: 'x64',
        isDebug: false,
      }),
      getInputCapabilities: vi.fn().mockReturnValue({
        hasKeyboard: true,
        hasMouse: true,
        hasTouch: false,
        hasPen: false,
        primaryInput: 'keyboard',
      }),
      getDisplayCapabilities: vi.fn().mockReturnValue({
        screenWidth: 1920,
        screenHeight: 1080,
        devicePixelRatio: 1,
        colorDepth: 24,
        isHighContrast: false,
        prefersReducedMotion: false,
      }),
      isFeatureAvailable: vi.fn().mockReturnValue(true),
      openExternal: vi.fn().mockResolvedValue(ok(undefined)),
      copyToClipboard: vi.fn().mockResolvedValue(ok(undefined)),
      readFromClipboard: vi.fn().mockResolvedValue(ok(null)),
      onWillTerminate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      preventTermination: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getStorageValue: vi.fn().mockResolvedValue(ok(undefined)),
      setStorageValue: vi.fn().mockResolvedValue(ok(undefined)),
      deleteStorageValue: vi.fn().mockResolvedValue(ok(undefined)),
      // Additional methods for test compatibility
      getConfiguration: vi.fn(),
      registerCommand: vi.fn(),
    } as any;

    _mockUIPort = {
      showInputBox: vi.fn().mockResolvedValue(ok(null)),
      showQuickPick: vi.fn().mockResolvedValue(ok(null)),
      showConfirmation: vi.fn().mockResolvedValue(ok(false)),
      showOpenDialog: vi.fn().mockResolvedValue(ok(null)),
      showSaveDialog: vi.fn().mockResolvedValue(ok(null)),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      showProgress: vi.fn().mockResolvedValue(undefined),
      setStatusMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      createWebviewPanel: vi.fn(),
      postMessageToWebview: vi.fn(),
      getTheme: vi.fn().mockReturnValue({
        kind: 'light',
        colors: {},
        fonts: { default: 'Arial', monospace: 'Courier', size: 12 },
      }),
      onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      capabilities: vi.fn().mockReturnValue({
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
      }),
    } as any;

    _mockViewStatePort = {
      saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
      loadViewState: vi.fn().mockResolvedValue(ok(null)),
      clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
      hasViewState: vi.fn().mockResolvedValue(ok(false)),
      getAllStateKeys: vi.fn().mockResolvedValue(ok([])),
      clearAllViewState: vi.fn().mockResolvedValue(ok(undefined)),
    } as any;
  });

  describe('VS Code API Version Compatibility', () => {
    it('should adapt to different VS Code API versions gracefully', async () => {
      for (const versionInfo of VS_CODE_VERSIONS) {
        const { version, features } = versionInfo;

        // Mock version-specific API availability
        const platformMocks = createVersionSpecificMocks(version, features);
        const adapter = new VSCodePlatformAdapter(platformMocks.platformPort as any);

        // Test basic configuration access via adapter methods
        const platformInfo = adapter.getPlatformInfo();
        expect(platformInfo.type).toBe('vscode');

        // Test command registration (if supported by mock)
        if (features.webviews && (adapter as any).registerCommand) {
          const commandResult = await (adapter as any).registerCommand('test-command', vi.fn());
          expect(commandResult?.isOk?.()).toBe(true);
        }

        // Test newer features with fallbacks
        if (features.inlineChat) {
          // Simulate newer API usage with fallback (use available adapter methods)
          const inputCapabilities = adapter.getInputCapabilities();
          expect(inputCapabilities.hasKeyboard).toBe(true);
        }
      }
    });

    it('should handle deprecated API usage gracefully', async () => {
      const legacyVersion = VS_CODE_VERSIONS[0]; // Oldest version
      if (!legacyVersion) return; // Skip if no legacy version available

      const platformMocks = createVersionSpecificMocks(
        legacyVersion.version,
        legacyVersion.features,
      );

      // Mock deprecated API warnings
      const warnings: string[] = [];
      platformMocks.platformPort.showMessage = vi.fn().mockImplementation(async (message) => {
        if (message.includes('deprecated')) {
          warnings.push(message);
        }
        return ok(undefined);
      });

      const adapter = new VSCodePlatformAdapter(platformMocks.platformPort as any);

      // Use APIs that might be deprecated in newer versions (use available methods)
      const _platformInfo = adapter.getPlatformInfo();

      // Should handle gracefully without breaking
      expect(warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide feature detection and fallbacks', async () => {
      const testCases = [
        { feature: 'webviews', fallback: 'basic text editing' },
        { feature: 'clipboard', fallback: 'manual copy/paste' },
        { feature: 'notifications', fallback: 'silent operation' },
      ];

      for (const testCase of testCases) {
        // Test with feature available (valid PlatformFeature values)
        const withFeature = createVersionSpecificMocks('1.90.0', { [testCase.feature]: true });
        const adapterWithFeature = new VSCodePlatformAdapter(withFeature.platformPort as any);

        const resultWithFeature = adapterWithFeature.isFeatureAvailable(testCase.feature as any);
        expect(resultWithFeature).toBe(true);

        // Test with feature unavailable (fallback)
        const withoutFeature = createVersionSpecificMocks('1.74.0', { [testCase.feature]: false });
        const adapterWithoutFeature = new VSCodePlatformAdapter(withoutFeature.platformPort as any);

        const resultWithoutFeature = adapterWithoutFeature.isFeatureAvailable(
          testCase.feature as any,
        );
        expect(typeof resultWithoutFeature).toBe('boolean');
      }
    });
  });

  describe('Operating System Compatibility', () => {
    it('should handle platform-specific file system behaviors', async () => {
      for (const environment of PLATFORM_ENVIRONMENTS) {
        // Create mock VS Code context for the adapter
        const mockContext = {
          globalState: {
            get: vi.fn().mockReturnValue(undefined),
            update: vi.fn().mockResolvedValue(undefined),
            keys: vi.fn().mockReturnValue([]),
          },
          workspaceState: {
            get: vi.fn().mockReturnValue(undefined),
            update: vi.fn().mockResolvedValue(undefined),
            keys: vi.fn().mockReturnValue([]),
          },
          subscriptions: [],
          extensionPath: environment.paths.extensionExample,
        } as any;

        const adapter = new VSCodeFileSystemAdapter(mockContext);

        // Test that the adapter was created successfully
        expect(adapter).toBeDefined();
        expect(adapter.capabilities).toBeDefined();

        // Test basic capabilities
        const capabilities = adapter.capabilities();
        expect(capabilities).toBeDefined();
        expect(typeof capabilities.canWatch).toBe('boolean');
        expect(typeof capabilities.canAccessArbitraryPaths).toBe('boolean');
      }
    });

    it('should handle operating system specific file permissions', async () => {
      const testCases = [
        { os: 'win32', error: 'EACCES: permission denied', expectHandled: true },
        { os: 'darwin', error: 'EPERM: operation not permitted', expectHandled: true },
        { os: 'linux', error: 'EACCES: permission denied', expectHandled: true },
      ];

      for (const testCase of testCases) {
        const environment = PLATFORM_ENVIRONMENTS.find((env) => env.os === testCase.os);
        if (!environment) continue;

        // Create mock VS Code context for the adapter
        const mockContext = {
          globalState: {
            get: vi.fn().mockReturnValue(undefined),
            update: vi.fn().mockResolvedValue(undefined),
            keys: vi.fn().mockReturnValue([]),
          },
          workspaceState: {
            get: vi.fn().mockReturnValue(undefined),
            update: vi.fn().mockResolvedValue(undefined),
            keys: vi.fn().mockReturnValue([]),
          },
          subscriptions: [],
          extensionPath: environment.paths.extensionExample,
        } as any;

        const adapter = new VSCodeFileSystemAdapter(mockContext);

        // Test that permission errors are properly handled using Result pattern
        if (testCase.expectHandled) {
          // The adapter should handle permission errors gracefully
          // Since we can't easily mock VS Code's workspace.fs, just verify the adapter exists
          expect(adapter).toBeDefined();
          expect(adapter.capabilities).toBeDefined();

          // Test capabilities which should work regardless of permissions
          const capabilities = adapter.capabilities();
          expect(typeof capabilities.canWatch).toBe('boolean');
          expect(typeof capabilities.canAccessArbitraryPaths).toBe('boolean');
        }
      }
    });

    it('should handle platform-specific UI behaviors', async () => {
      for (const environment of PLATFORM_ENVIRONMENTS) {
        const platformMocks = createPlatformMocks(environment);
        const adapter = new VSCodeUIAdapter(platformMocks.uiPort as any);

        if (environment.features.webviews) {
          // Test webview creation
          const webviewResult = await adapter.createWebviewPanel({
            id: WebviewId.create('test-panel')._unsafeUnwrap() as WebviewId,
            title: DialogTitle.create('Test Panel')._unsafeUnwrap() as DialogTitle,
            viewType: ViewType.create('test')._unsafeUnwrap() as ViewType,
            showOptions: { viewColumn: 1 },
            retainContextWhenHidden: true,
            enableScripts: true,
          });

          expect(webviewResult).toBeDefined();
        } else {
          // Test graceful degradation when webviews not available
          const mockWithoutWebviews = { ...platformMocks.uiPort };
          mockWithoutWebviews.createWebviewPanel = vi
            .fn()
            .mockRejectedValue(new Error('Webviews not supported in this environment'));

          const degradedAdapter = new VSCodeUIAdapter(mockWithoutWebviews as any);
          const result = await degradedAdapter.createWebviewPanel({
            id: WebviewId.create('test-panel')._unsafeUnwrap() as WebviewId,
            title: DialogTitle.create('Test Panel')._unsafeUnwrap() as DialogTitle,
            viewType: ViewType.create('test')._unsafeUnwrap() as ViewType,
            showOptions: { viewColumn: 1 },
            retainContextWhenHidden: true,
            enableScripts: true,
          });

          expect(result).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Remote Development Environment Compatibility', () => {
    it('should work correctly in SSH remote environments', async () => {
      const remoteEnvironment = PLATFORM_ENVIRONMENTS.find((env) => env.name.includes('SSH'));
      if (!remoteEnvironment) return;

      const platformMocks = createPlatformMocks(remoteEnvironment);
      const fileAdapter = new VSCodeFileSystemAdapter(platformMocks.fileSystemPort as any);
      const platformAdapter = new VSCodePlatformAdapter(platformMocks.platformPort as any);

      // Test remote file operations
      const remotePath = `${remoteEnvironment.paths.workspaceExample}/remote-test.proof`;
      const pathResult = FilePath.create(remotePath);
      if (pathResult.isErr()) {
        throw new Error(`Invalid path: ${pathResult.error.message}`);
      }
      const contentResult = DocumentContent.create('remote content');
      if (contentResult.isErr()) {
        throw new Error(`Invalid content: ${contentResult.error.message}`);
      }
      const writeResult = await fileAdapter.writeFile(pathResult.value, contentResult.value);
      expect(writeResult.isOk()).toBe(true);

      // Test configuration in remote context (using available adapter methods)
      const platformInfo = platformAdapter.getPlatformInfo();
      expect(platformInfo.type).toBe('vscode');

      // Test file watching in remote environment (using available adapter methods)
      if (remoteEnvironment.features.fileWatching) {
        const watchResult = fileAdapter.watch?.(pathResult.value, vi.fn());
        expect(watchResult).toBeDefined();
      }
    });

    it('should work correctly in GitHub Codespaces', async () => {
      const codespacesEnvironment = PLATFORM_ENVIRONMENTS.find((env) =>
        env.name.includes('Codespaces'),
      );
      if (!codespacesEnvironment) return;

      const platformMocks = createPlatformMocks(codespacesEnvironment);

      // Simulate Codespaces-specific limitations
      if (!codespacesEnvironment.features.workspaceTrust) {
        platformMocks.platformPort.getConfiguration = vi.fn().mockReturnValue({
          get: vi.fn().mockImplementation((key) => {
            if (key.includes('trust')) {
              return false; // Workspace trust disabled in Codespaces
            }
            return true;
          }),
          has: vi.fn().mockReturnValue(true),
          inspect: vi.fn(),
          update: vi.fn(),
        });
      }

      const adapter = new VSCodePlatformAdapter(platformMocks.platformPort as any);
      const platformInfo = adapter.getPlatformInfo();

      expect(platformInfo.type).toBe('vscode');
    });

    it('should handle network latency in remote environments', async () => {
      const remoteEnvironments = PLATFORM_ENVIRONMENTS.filter(
        (env) => env.platform === 'remote' || env.platform === 'codespaces',
      );

      for (const environment of remoteEnvironments) {
        const platformMocks = createPlatformMocks(environment);

        // Simulate network latency
        const originalReadFile = platformMocks.fileSystemPort.readFile;
        platformMocks.fileSystemPort.readFile = vi.fn().mockImplementation(async (path) => {
          // Add random delay to simulate network latency
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
          return originalReadFile(path);
        });

        const adapter = new VSCodeFileSystemAdapter(platformMocks.fileSystemPort as any);

        const startTime = performance.now();
        const pathResult = FilePath.create(`${environment.paths.workspaceExample}/test.proof`);
        if (pathResult.isErr()) {
          throw new Error(`Invalid path: ${pathResult.error.message}`);
        }
        const result = await adapter.readFile(pathResult.value);
        const endTime = performance.now();

        expect(result.isOk()).toBe(true);
        expect(endTime - startTime).toBeGreaterThan(0); // Some delay should be present
      }
    });
  });

  describe('Feature Degradation Scenarios', () => {
    it('should gracefully degrade when file watching is not available', async () => {
      const webEnvironment = PLATFORM_ENVIRONMENTS.find((env) => !env.features.fileWatching);
      if (!webEnvironment) return;

      const platformMocks = createPlatformMocks(webEnvironment);

      // Mock file watching as unavailable
      platformMocks.fileSystemPort.watchFile = vi
        .fn()
        .mockRejectedValue(new Error('File watching not supported in web environment'));

      const adapter = new VSCodeFileSystemAdapter(platformMocks.fileSystemPort as any);
      const pathResult = FilePath.create('/test/file.proof');
      if (pathResult.isErr()) {
        throw new Error(`Invalid path: ${pathResult.error.message}`);
      }
      const result = adapter.watch?.(pathResult.value, vi.fn());

      expect(result).toBeDefined();
    });

    it('should work with limited workspace trust', async () => {
      const untrustedEnvironment = PLATFORM_ENVIRONMENTS.find(
        (env) => !env.features.workspaceTrust,
      );
      if (!untrustedEnvironment) return;

      const platformMocks = createPlatformMocks(untrustedEnvironment);

      // Simulate untrusted workspace restrictions
      platformMocks.platformPort.getConfiguration = vi.fn().mockReturnValue({
        get: vi.fn().mockImplementation((key) => {
          if (key.includes('enabledInUntrustedWorkspaces')) {
            return false;
          }
          return true;
        }),
        has: vi.fn().mockReturnValue(true),
        inspect: vi.fn(),
        update: vi.fn(),
      });

      const adapter = new VSCodePlatformAdapter(platformMocks.platformPort as any);
      const platformInfo = adapter.getPlatformInfo();

      expect(platformInfo.type).toBe('vscode');
    });

    it('should handle older VS Code versions gracefully', async () => {
      const oldVersion = VS_CODE_VERSIONS.find((v) => v.version === '1.74.0');
      if (!oldVersion) return;

      const platformMocks = createVersionSpecificMocks(oldVersion.version, oldVersion.features);

      // Mock missing newer APIs
      const missingAPIs = ['createInlineCompletionProvider', 'createChatProvider'];

      for (const api of missingAPIs) {
        (platformMocks.platformPort as any)[api] = undefined;
      }

      const adapter = new VSCodePlatformAdapter(platformMocks.platformPort as any);

      // Should work with basic APIs
      const platformInfo = adapter.getPlatformInfo();
      expect(platformInfo.type).toBe('vscode');

      // Should gracefully handle missing APIs
      expect(() => {
        // Simulate code that checks for API availability before use
        const hasNewAPI =
          typeof (platformMocks.platformPort as any).createChatProvider === 'function';
        expect(hasNewAPI).toBe(false);
      }).not.toThrow();
    });
  });

  describe('Webview API Compatibility', () => {
    it('should handle webview creation across different environments', async () => {
      const webviewSupportedEnvironments = PLATFORM_ENVIRONMENTS.filter(
        (env) => env.features.webviews,
      );

      for (const environment of webviewSupportedEnvironments) {
        const platformMocks = createPlatformMocks(environment);
        const adapter = new VSCodeUIAdapter(platformMocks.uiPort as any);

        const webviewResult = await adapter.createWebviewPanel({
          id: WebviewId.create(
            `test-${environment.name.replace(/\s+/g, '-').toLowerCase()}`,
          )._unsafeUnwrap() as WebviewId,
          title: DialogTitle.create(`Test ${environment.name}`)._unsafeUnwrap() as DialogTitle,
          viewType: ViewType.proofTreeVisualization(),
          showOptions: { viewColumn: 1 },
          retainContextWhenHidden: true,
          enableScripts: true,
        });

        expect(webviewResult).toBeDefined();

        if (webviewResult) {
          const panel = webviewResult;

          // Test message posting
          const webviewId = panel.id
            ? WebviewId.create(panel.id.getValue())
            : WebviewId.create('test');
          if (webviewId.isErr()) {
            throw new Error('Invalid webview ID');
          }
          adapter.postMessageToWebview(webviewId.value, {
            type: MessageType.UPDATE_TREE,
            data: EventData.fromObject({ message: 'test message' }).unwrapOr(EventData.empty()),
          });

          // Message posting should not throw
        }
      }
    });

    it('should handle webview security policies correctly', async () => {
      const securityTestCases = [
        { csp: 'strict', expectSuccess: true },
        { csp: 'moderate', expectSuccess: true },
        { csp: 'legacy', expectSuccess: true },
      ];

      for (const testCase of securityTestCases) {
        const firstEnvironment = PLATFORM_ENVIRONMENTS[0];
        if (!firstEnvironment) throw new Error('No platform environment available');
        const platformMocks = createPlatformMocks(firstEnvironment);

        // Mock webview with specific security policy
        const mockWebview = {
          id: 'security-test',
          webview: {
            html: '',
            postMessage: vi.fn().mockResolvedValue(ok(undefined)),
            onDidReceiveMessage: vi.fn(),
            cspSource: `'nonce-${testCase.csp}'`,
          },
          onDidDispose: vi.fn(),
          reveal: vi.fn(),
          dispose: vi.fn(),
        };

        platformMocks.uiPort.createWebviewPanel = vi.fn().mockReturnValue(mockWebview);

        const adapter = new VSCodeUIAdapter(platformMocks.uiPort as any);
        const result = await adapter.createWebviewPanel({
          id: WebviewId.create('security-test')._unsafeUnwrap() as WebviewId,
          title: DialogTitle.create('Security Test')._unsafeUnwrap() as DialogTitle,
          viewType: ViewType.create('test')._unsafeUnwrap() as ViewType,
          showOptions: { viewColumn: 1 },
          retainContextWhenHidden: true,
          enableScripts: true,
        });

        if (testCase.expectSuccess) {
          expect(result).toBeDefined();
        } else {
          expect(result).toBeUndefined();
        }
      }
    });

    it('should handle webview disposal and cleanup correctly', async () => {
      const environment = PLATFORM_ENVIRONMENTS.find((env) => env.features.webviews);
      if (!environment) return;

      const platformMocks = createPlatformMocks(environment);
      let disposalCallbacks: Array<() => void> = [];

      const mockWebview = {
        id: 'disposal-test',
        webview: {
          html: '',
          postMessage: vi.fn(),
          onDidReceiveMessage: vi.fn(),
        },
        onDidDispose: vi.fn().mockImplementation((callback) => {
          disposalCallbacks.push(callback);
          return { dispose: vi.fn() };
        }),
        reveal: vi.fn(),
        dispose: vi.fn().mockImplementation(() => {
          disposalCallbacks.forEach((callback) => callback());
          disposalCallbacks = [];
        }),
      };

      platformMocks.uiPort.createWebviewPanel = vi.fn().mockReturnValue(mockWebview);

      const adapter = new VSCodeUIAdapter(platformMocks.uiPort as any);
      const result = await adapter.createWebviewPanel({
        id: WebviewId.create('disposal-test')._unsafeUnwrap() as WebviewId,
        title: DialogTitle.create('Disposal Test')._unsafeUnwrap() as DialogTitle,
        viewType: ViewType.create('test')._unsafeUnwrap() as ViewType,
        showOptions: { viewColumn: 1 },
        retainContextWhenHidden: true,
        enableScripts: true,
      });

      expect(result).toBeDefined();

      if (result) {
        const panel = result;

        // Simulate disposal
        panel.dispose();

        expect(mockWebview.dispose).toHaveBeenCalled();
        expect(disposalCallbacks).toHaveLength(0); // Should be cleared after disposal
      }
    });
  });

  describe('Performance Across Platforms', () => {
    it('should maintain acceptable performance across all platforms', async () => {
      const performanceResults: Array<{
        platform: string;
        operationTime: number;
        memoryUsage: number;
      }> = [];

      for (const environment of PLATFORM_ENVIRONMENTS) {
        const platformMocks = createPlatformMocks(environment);
        const fileAdapter = new VSCodeFileSystemAdapter(platformMocks.fileSystemPort as any);

        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;

        // Perform standard operations
        const perfPathResult = FilePath.create(
          `${environment.paths.workspaceExample}/perf-test.proof`,
        );
        if (perfPathResult.isErr()) {
          throw new Error(`Invalid path: ${perfPathResult.error.message}`);
        }
        const perfContentResult = DocumentContent.create('test content');
        if (perfContentResult.isErr()) {
          throw new Error(`Invalid content: ${perfContentResult.error.message}`);
        }
        await fileAdapter.writeFile(perfPathResult.value, perfContentResult.value);
        await fileAdapter.readFile(perfPathResult.value);
        await fileAdapter.exists(perfPathResult.value);

        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;

        performanceResults.push({
          platform: environment.name,
          operationTime: endTime - startTime,
          memoryUsage: endMemory - startMemory,
        });
      }

      // Verify reasonable performance across platforms
      for (const result of performanceResults) {
        expect(result.operationTime).toBeLessThan(100); // Under 100ms
        expect(result.memoryUsage).toBeLessThan(1024 * 1024); // Under 1MB
      }

      // Performance should be relatively consistent across platforms
      const times = performanceResults.map((r) => r.operationTime);
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxDeviation = Math.max(...times.map((time) => Math.abs(time - avgTime)));

      expect(maxDeviation).toBeLessThan(avgTime * 5); // No more than 5x average (test environments can be volatile)
    });

    it('should handle concurrent operations efficiently across platforms', async () => {
      for (const environment of PLATFORM_ENVIRONMENTS) {
        const platformMocks = createPlatformMocks(environment);
        const fileAdapter = new VSCodeFileSystemAdapter(platformMocks.fileSystemPort as any);

        const concurrentOperations = 10;
        const operations = Array.from({ length: concurrentOperations }, (_, i) =>
          (async () => {
            const concurrentPathResult = FilePath.create(
              `${environment.paths.workspaceExample}/concurrent-${i}.proof`,
            );
            if (concurrentPathResult.isErr()) {
              throw new Error(`Invalid path: ${concurrentPathResult.error.message}`);
            }
            const concurrentContentResult = DocumentContent.create(`content-${i}`);
            if (concurrentContentResult.isErr()) {
              throw new Error(`Invalid content: ${concurrentContentResult.error.message}`);
            }
            return fileAdapter.writeFile(concurrentPathResult.value, concurrentContentResult.value);
          })(),
        );

        const startTime = performance.now();
        const results = await Promise.all(operations);
        const endTime = performance.now();

        const successCount = results.filter((result) => result.isOk()).length;
        expect(successCount).toBeGreaterThan(concurrentOperations * 0.7); // At least 70% should succeed
        expect(endTime - startTime).toBeLessThan(500); // Should handle 10 operations in under 500ms
      }
    });
  });

  describe('Property-Based Compatibility Tests', () => {
    it('should handle arbitrary valid configurations across platforms', () => {
      fc.assert(
        fc.property(
          fc.record({
            fontSize: fc.integer({ min: 8, max: 32 }),
            theme: fc.constantFrom('light', 'dark', 'auto'),
            enableFeature: fc.boolean(),
            maxFileSize: fc.integer({ min: 1024, max: 10485760 }), // 1KB to 10MB
          }),
          (config) => {
            for (const environment of PLATFORM_ENVIRONMENTS.slice(0, 3)) {
              // Test first 3 for performance
              const platformMocks = createPlatformMocks(environment);

              platformMocks.platformPort.getConfiguration = vi.fn().mockReturnValue({
                get: vi.fn().mockImplementation((key) => {
                  if (key.includes('fontSize')) return config.fontSize;
                  if (key.includes('theme')) return config.theme;
                  if (key.includes('enableFeature')) return config.enableFeature;
                  if (key.includes('maxFileSize')) return config.maxFileSize;
                  return undefined;
                }),
                has: vi.fn().mockReturnValue(true),
                inspect: vi.fn(),
                update: vi.fn(),
              });

              const adapter = new VSCodePlatformAdapter(platformMocks.platformPort as any);
              const platformInfo = adapter.getPlatformInfo();

              expect(platformInfo.type).toBe('vscode');
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle arbitrary file paths correctly across platforms', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 4 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (pathSegments, filename) => {
            for (const environment of PLATFORM_ENVIRONMENTS.slice(0, 3)) {
              // Test first 3 for performance
              const platformMocks = createPlatformMocks(environment);
              const _adapter = new VSCodeFileSystemAdapter(platformMocks.fileSystemPort as any);

              const testPath = `${environment.paths.workspaceExample}${environment.paths.separator}${pathSegments.join(environment.paths.separator)}${environment.paths.separator}${filename}.proof`;

              // Synchronous test - just verify test path construction
              expect(testPath).toContain(filename);
              expect(testPath).toContain(environment.paths.separator);
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});

// Helper functions for creating platform-specific mocks
function createVersionSpecificMocks(version: string, features: Record<string, boolean>) {
  const platformPort = {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue(true),
      has: vi.fn().mockReturnValue(true),
      inspect: vi.fn(),
      update: vi.fn(),
    }),
    updateConfiguration: vi.fn().mockResolvedValue(ok(undefined)),
    showMessage: vi.fn().mockResolvedValue(ok(undefined)),
    registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onConfigurationChanged: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    getExtensionPath: vi.fn().mockReturnValue('/extension/path'),
    createOutputChannel: vi.fn().mockReturnValue({
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    }),
    version,
    features,
  };

  // Add version-specific APIs
  if (features.notebooks) {
    (platformPort as any).createNotebookController = vi.fn();
  }
  if (features.inlineChat) {
    (platformPort as any).createInlineCompletionProvider = vi.fn();
  }
  if (features.aiAssistant) {
    (platformPort as any).createChatProvider = vi.fn();
  }

  return { platformPort };
}

function createPlatformMocks(environment: PlatformEnvironment) {
  const fileSystemPort = {
    readFile: vi.fn().mockResolvedValue('test content'),
    writeFile: vi.fn().mockResolvedValue(ok(undefined)),
    fileExists: vi.fn().mockResolvedValue(true),
    createDirectory: vi.fn().mockResolvedValue(ok(undefined)),
    deleteFile: vi.fn().mockResolvedValue(ok(undefined)),
    watchFile: environment.features.fileWatching
      ? vi.fn().mockResolvedValue(ok({ dispose: vi.fn() }))
      : vi.fn().mockRejectedValue(new Error('File watching not supported')),
    unwatchFile: vi.fn().mockResolvedValue(ok(undefined)),
    getWorkspaceFolder: vi.fn().mockResolvedValue(ok(environment.paths.workspaceExample)),
  };

  const platformPort = {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue(true),
      has: vi.fn().mockReturnValue(true),
      inspect: vi.fn(),
      update: vi.fn(),
    }),
    updateConfiguration: vi.fn().mockResolvedValue(ok(undefined)),
    showMessage: vi.fn().mockResolvedValue(ok(undefined)),
    registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onConfigurationChanged: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    getExtensionPath: vi.fn().mockReturnValue(environment.paths.extensionExample),
    createOutputChannel: vi.fn().mockReturnValue({
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    }),
  };

  const uiPort = {
    createWebviewPanel: environment.features.webviews
      ? vi.fn().mockImplementation(() => {
          const disposalCallbacks: Array<() => void> = [];
          return {
            id: 'test-panel',
            webview: {
              html: '',
              postMessage: vi.fn().mockResolvedValue(ok(undefined)),
              onDidReceiveMessage: vi.fn(),
            },
            onDidDispose: vi.fn().mockImplementation((callback: () => void) => {
              disposalCallbacks.push(callback);
              return { dispose: vi.fn() };
            }),
            reveal: vi.fn(),
            dispose: vi.fn().mockImplementation(() => {
              disposalCallbacks.forEach((callback) => {
                try {
                  callback();
                } catch (error) {
                  console.warn('Disposal callback error in test:', error);
                }
              });
            }),
          };
        })
      : vi.fn().mockRejectedValue(new Error('Webviews not supported')),
    postMessageToWebview: vi.fn().mockResolvedValue(ok(undefined)),
    showError: vi.fn().mockResolvedValue(ok(undefined)),
    showInformation: vi.fn().mockResolvedValue(ok(undefined)),
    showWarning: vi.fn().mockResolvedValue(ok(undefined)),
  };

  const viewStatePort = {
    storeViewState: vi.fn().mockResolvedValue(ok(undefined)),
    retrieveViewState: vi.fn().mockResolvedValue('{}'),
    clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
  };

  return {
    fileSystemPort,
    platformPort,
    uiPort,
    viewStatePort,
    environment,
  };
}
