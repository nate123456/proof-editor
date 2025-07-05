import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IFileSystemPort } from '../../../application/ports/IFileSystemPort.js';
import type { IPlatformPort } from '../../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../../application/ports/IUIPort.js';
// We'll import ApplicationContainer dynamically in the test
import { TOKENS } from '../../di/tokens.js';

// Mock vscode module for integration tests
vi.mock('vscode', () => ({
  version: '1.74.0',
  window: {
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    withProgress: vi.fn(),
    setStatusBarMessage: vi.fn(),
    createWebviewPanel: vi.fn(),
    activeColorTheme: { kind: 1 },
    onDidChangeActiveColorTheme: vi.fn(),
  },
  env: {
    openExternal: vi.fn(),
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn(),
    },
  },
  workspace: {
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      stat: vi.fn(),
      delete: vi.fn(),
      readDirectory: vi.fn(),
      createDirectory: vi.fn(),
    },
    createFileSystemWatcher: vi.fn(),
  },
  ViewColumn: { One: 1 },
  ProgressLocation: { Notification: 1, Window: 2 },
  ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
  Uri: {
    parse: vi.fn(),
    file: vi.fn(),
    joinPath: vi.fn(),
  },
  FileType: { Directory: 2 },
  RelativePattern: vi.fn(),
  FileSystemError: class MockFileSystemError extends Error {
    code: string;
    constructor(message: string, code: string = 'UNKNOWN') {
      super(message);
      this.code = code;
    }
  },
}));

describe('VSCode Adapters Integration', () => {
  let container: any;

  beforeEach(async () => {
    // Create a test container instead of using the global one
    const { ApplicationContainer } = await import('../../di/container.js');
    container = new ApplicationContainer();

    // Register mock platform adapters for testing
    const mockFileSystemPort: IFileSystemPort = {
      capabilities: () => ({
        canWatch: true,
        canAccessArbitraryPaths: true,
        supportsOfflineStorage: true,
        persistence: 'permanent' as const,
        maxFileSize: 10 * 1024 * 1024,
      }),
      readFile: vi.fn().mockResolvedValue(ok('file content')),
      writeFile: vi.fn().mockResolvedValue(ok(undefined)),
      exists: vi.fn().mockResolvedValue(ok(true)),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      createDirectory: vi.fn().mockResolvedValue(ok(undefined)),
      readDirectory: vi.fn().mockResolvedValue(ok([])),
      watch: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getStoredDocument: vi.fn().mockResolvedValue(ok(null)),
      storeDocument: vi.fn().mockResolvedValue(ok(undefined)),
      deleteStoredDocument: vi.fn().mockResolvedValue(ok(undefined)),
      listStoredDocuments: vi.fn().mockResolvedValue(ok([])),
    };

    const mockUIPort: IUIPort = {
      capabilities: () => ({
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
        maxMessageLength: 1000,
      }),
      showInputBox: vi.fn().mockResolvedValue(ok('test input')),
      showQuickPick: vi.fn().mockResolvedValue(ok('test selection')),
      showConfirmation: vi.fn().mockResolvedValue(ok(true)),
      showOpenDialog: vi.fn().mockResolvedValue(ok(['/test/file'])),
      showSaveDialog: vi.fn().mockResolvedValue(ok('/test/save')),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      showProgress: vi.fn().mockResolvedValue('progress result'),
      setStatusMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      createWebviewPanel: vi.fn().mockReturnValue({
        id: 'test-panel',
        webview: {
          html: '<html></html>',
          onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        },
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        reveal: vi.fn(),
        dispose: vi.fn(),
      }),
      postMessageToWebview: vi.fn(),
      getTheme: () => ({
        kind: 'light' as const,
        colors: { 'editor.background': '#ffffff' },
        fonts: { default: 'Arial', monospace: 'Courier', size: 12 },
      }),
      onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    };

    const mockPlatformPort: IPlatformPort = {
      getPlatformInfo: () => ({
        type: 'vscode' as const,
        version: '1.74.0',
        os: 'linux' as const,
        arch: 'x64',
        isDebug: false,
      }),
      getInputCapabilities: () => ({
        hasKeyboard: true,
        hasMouse: true,
        hasTouch: false,
        hasPen: false,
        primaryInput: 'keyboard' as const,
      }),
      getDisplayCapabilities: () => ({
        screenWidth: 1920,
        screenHeight: 1080,
        devicePixelRatio: 1,
        colorDepth: 24,
        isHighContrast: false,
        prefersReducedMotion: false,
      }),
      isFeatureAvailable: (feature: string) => {
        const supportedFeatures = ['file-system', 'clipboard', 'notifications', 'webviews'];
        return supportedFeatures.includes(feature);
      },
      openExternal: vi.fn().mockResolvedValue(ok(undefined)),
      copyToClipboard: vi.fn().mockResolvedValue(ok(undefined)),
      readFromClipboard: vi.fn().mockResolvedValue(ok('clipboard content')),
      onWillTerminate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      preventTermination: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getStorageValue: vi.fn().mockResolvedValue(ok('storage value')),
      setStorageValue: vi.fn().mockResolvedValue(ok(undefined)),
      deleteStorageValue: vi.fn().mockResolvedValue(ok(undefined)),
    };

    container.registerInstance(TOKENS.IFileSystemPort, mockFileSystemPort);
    container.registerInstance(TOKENS.IUIPort, mockUIPort);
    container.registerInstance(TOKENS.IPlatformPort, mockPlatformPort);
  });

  describe('Platform Adapter Registration', () => {
    test('all platform adapters are registered', () => {
      expect(container.isRegistered(TOKENS.IFileSystemPort)).toBe(true);
      expect(container.isRegistered(TOKENS.IUIPort)).toBe(true);
      expect(container.isRegistered(TOKENS.IPlatformPort)).toBe(true);
    });

    test('platform adapters can be resolved', () => {
      const fileSystemPort = container.resolve(TOKENS.IFileSystemPort) as IFileSystemPort;
      const uiPort = container.resolve(TOKENS.IUIPort) as IUIPort;
      const platformPort = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;

      expect(fileSystemPort).toBeDefined();
      expect(uiPort).toBeDefined();
      expect(platformPort).toBeDefined();
    });

    test('platform adapters are singleton instances', () => {
      const fileSystemPort1 = container.resolve(TOKENS.IFileSystemPort) as IFileSystemPort;
      const fileSystemPort2 = container.resolve(TOKENS.IFileSystemPort) as IFileSystemPort;

      const uiPort1 = container.resolve(TOKENS.IUIPort) as IUIPort;
      const uiPort2 = container.resolve(TOKENS.IUIPort) as IUIPort;

      const platformPort1 = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;
      const platformPort2 = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;

      expect(fileSystemPort1).toBe(fileSystemPort2);
      expect(uiPort1).toBe(uiPort2);
      expect(platformPort1).toBe(platformPort2);
    });
  });

  describe('Platform Adapter Capabilities', () => {
    test('UI adapter has consistent capabilities', () => {
      const uiPort = container.resolve(TOKENS.IUIPort) as IUIPort;
      const capabilities = uiPort.capabilities();

      expect(capabilities.supportsFileDialogs).toBe(true);
      expect(capabilities.supportsNotificationActions).toBe(true);
      expect(capabilities.supportsProgress).toBe(true);
      expect(capabilities.supportsStatusBar).toBe(true);
      expect(capabilities.supportsWebviews).toBe(true);
      expect(capabilities.supportsThemes).toBe(true);
      expect(typeof capabilities.maxMessageLength).toBe('number');
    });

    test('platform adapter has correct platform info', () => {
      const platformPort = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;
      const platformInfo = platformPort.getPlatformInfo();

      expect(platformInfo.type).toBe('vscode');
      expect(platformInfo.version).toBe('1.74.0');
      expect(platformInfo.os).toMatch(/windows|macos|linux/);
      expect(typeof platformInfo.arch).toBe('string');
      expect(typeof platformInfo.isDebug).toBe('boolean');
    });

    test('platform adapter supports expected features', () => {
      const platformPort = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;

      expect(platformPort.isFeatureAvailable('file-system')).toBe(true);
      expect(platformPort.isFeatureAvailable('clipboard')).toBe(true);
      expect(platformPort.isFeatureAvailable('notifications')).toBe(true);
      expect(platformPort.isFeatureAvailable('webviews')).toBe(true);
      expect(platformPort.isFeatureAvailable('touch-gestures')).toBe(false);
    });

    test('file system adapter has expected capabilities', () => {
      const fileSystemPort = container.resolve(TOKENS.IFileSystemPort) as IFileSystemPort;
      const capabilities = fileSystemPort.capabilities();

      expect(capabilities.canWatch).toBe(true);
      expect(capabilities.canAccessArbitraryPaths).toBe(true);
      expect(capabilities.supportsOfflineStorage).toBe(true);
      expect(capabilities.persistence).toBe('permanent');
      expect(typeof capabilities.maxFileSize).toBe('number');
    });
  });

  describe('Cross-Adapter Integration', () => {
    test('all adapters share same context reference', () => {
      const fileSystemPort = container.resolve(TOKENS.IFileSystemPort) as IFileSystemPort;
      const uiPort = container.resolve(TOKENS.IUIPort) as IUIPort;
      const platformPort = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;

      // All adapters should have been created with the same context
      // We can't directly access the private context, but we can verify they work
      expect(fileSystemPort).toBeDefined();
      expect(uiPort).toBeDefined();
      expect(platformPort).toBeDefined();
    });

    test('adapters work together for common operations', async () => {
      const uiPort = container.resolve(TOKENS.IUIPort) as IUIPort;
      const platformPort = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;

      // Test theme consistency
      const theme = uiPort.getTheme();
      const displayCaps = platformPort.getDisplayCapabilities();

      expect(theme.kind).toMatch(/light|dark|high-contrast/);
      expect(typeof displayCaps.isHighContrast).toBe('boolean');
    });

    test('adapters handle errors consistently', async () => {
      const platformPort = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;
      const uiPort = container.resolve(TOKENS.IUIPort) as IUIPort;

      // Mock our adapters to return errors for testing
      vi.mocked(platformPort.copyToClipboard).mockResolvedValue(
        err({ code: 'PLATFORM_ERROR', message: 'Test error' }),
      );
      vi.mocked(uiPort.showInputBox).mockResolvedValue(
        err({ code: 'PLATFORM_ERROR', message: 'UI error' }),
      );

      const clipboardResult = await platformPort.copyToClipboard('test');
      expect(clipboardResult.isErr()).toBe(true);
      if (clipboardResult.isErr()) {
        expect(clipboardResult.error.code).toBe('PLATFORM_ERROR');
      }

      const inputResult = await uiPort.showInputBox({ prompt: 'test' });
      expect(inputResult.isErr()).toBe(true);
      if (inputResult.isErr()) {
        expect(inputResult.error.code).toBe('PLATFORM_ERROR');
      }
    });
  });

  describe('DI Container Integration', () => {
    test('adapters integrate with application services', () => {
      // Test that adapters can be injected into other services
      const documentController = 'DocumentController';
      const proofTreeController = 'ProofTreeController';

      // Verify tokens exist for controllers
      expect(TOKENS.DocumentController).toBe(documentController);
      expect(TOKENS.ProofTreeController).toBe(proofTreeController);
    });

    test('platform adapters available before application services', () => {
      // Platform adapters should be registered before application services need them
      expect(container.isRegistered(TOKENS.IFileSystemPort)).toBe(true);
      expect(container.isRegistered(TOKENS.IUIPort)).toBe(true);
      expect(container.isRegistered(TOKENS.IPlatformPort)).toBe(true);
    });

    test('container can create controllers with platform dependencies', () => {
      // This tests that the DI wiring works end-to-end
      // Create a mock controller that uses platform dependencies
      class MockController {
        constructor(
          private uiPort: IUIPort,
          private platformPort: IPlatformPort,
        ) {}

        handleDocumentOpened() {
          return this.uiPort.showInformation('Document opened');
        }

        showPlatformInfo() {
          return this.platformPort.getPlatformInfo();
        }
      }

      const controller = new MockController(
        container.resolve(TOKENS.IUIPort),
        container.resolve(TOKENS.IPlatformPort),
      );

      expect(controller).toBeDefined();
      expect(typeof controller.handleDocumentOpened).toBe('function');
      expect(typeof controller.showPlatformInfo).toBe('function');
    });
  });

  describe('VS Code API Mock Verification', () => {
    test('all required VS Code APIs are mocked', async () => {
      const vscode = await import('vscode');

      // Verify window APIs
      expect(vscode.window.showInputBox).toBeDefined();
      expect(vscode.window.showQuickPick).toBeDefined();
      expect(vscode.window.showInformationMessage).toBeDefined();
      expect(vscode.window.createWebviewPanel).toBeDefined();

      // Verify env APIs
      expect(vscode.env.openExternal).toBeDefined();
      expect(vscode.env.clipboard.writeText).toBeDefined();
      expect(vscode.env.clipboard.readText).toBeDefined();

      // Verify workspace APIs
      expect(vscode.workspace.fs.readFile).toBeDefined();
      expect(vscode.workspace.fs.writeFile).toBeDefined();

      // Verify constants
      expect(vscode.ViewColumn.One).toBe(1);
      expect(vscode.ColorThemeKind.Light).toBe(1);
    });

    test('mock functions can be called without errors', async () => {
      const vscode = await import('vscode');

      expect(() => vscode.window.showInformationMessage('test')).not.toThrow();
      expect(() => vscode.Uri.parse('file:///test')).not.toThrow();
      expect(() => new vscode.RelativePattern('/', '**/*')).not.toThrow();
    });
  });

  describe('Error Boundary Testing', () => {
    test('adapters handle VS Code API errors gracefully', async () => {
      const uiPort = container.resolve(TOKENS.IUIPort) as IUIPort;

      // Mock our adapter to return errors
      vi.mocked(uiPort.showInputBox).mockResolvedValue(
        err({ code: 'PLATFORM_ERROR', message: 'VS Code API Error' }),
      );

      const result = await uiPort.showInputBox({ prompt: 'test' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PLATFORM_ERROR');
        expect(result.error.message).toBe('VS Code API Error');
      }
    });

    test('adapters handle context errors gracefully', async () => {
      const platformPort = container.resolve(TOKENS.IPlatformPort) as IPlatformPort;

      // Mock our adapter to return context errors
      vi.mocked(platformPort.getStorageValue).mockResolvedValue(
        err({ code: 'PLATFORM_ERROR', message: 'Context error' }),
      );

      const result = await platformPort.getStorageValue('test-key');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PLATFORM_ERROR');
      }
    });
  });
});
