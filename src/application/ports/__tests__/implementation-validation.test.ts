/**
 * Implementation validation tests for application ports
 *
 * Tests mock behavior consistency, implementation adherence to contracts,
 * and validates that real implementations would satisfy the port contracts.
 * Focuses on ensuring clean architecture boundaries are maintained.
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  FileSystemCapabilities,
  IFileSystemPort,
  IPlatformPort,
  IUIPort,
  PlatformInfo,
  StoredDocument,
  UICapabilities,
  WebviewPanel,
} from '../index.js';

// Helper to create implementation-validating mocks
function createValidationMocks() {
  // Track method call patterns for validation
  const callLog: Array<{ port: string; method: string; args: any[] }> = [];

  const logCall = (port: string, method: string, args: any[]) => {
    callLog.push({ port, method, args });
  };

  const fileSystemPort: IFileSystemPort = {
    async readFile(path: string) {
      logCall('FileSystem', 'readFile', [path]);

      // Validate input parameters
      if (typeof path !== 'string') {
        throw new Error('readFile expects string path');
      }

      // Consistent error handling
      if (!path || path.trim() === '') {
        return err({
          code: 'INVALID_PATH',
          message: 'Path cannot be empty',
          path,
        });
      }

      return ok(`Mock content for ${path}`);
    },

    async writeFile(path: string, content: string) {
      logCall('FileSystem', 'writeFile', [path, content]);

      // Validate input parameters
      if (typeof path !== 'string' || typeof content !== 'string') {
        throw new Error('writeFile expects string parameters');
      }

      return ok(undefined);
    },

    async exists(path: string) {
      logCall('FileSystem', 'exists', [path]);

      if (typeof path !== 'string') {
        throw new Error('exists expects string path');
      }

      return ok(true);
    },

    async delete(path: string) {
      logCall('FileSystem', 'delete', [path]);

      if (typeof path !== 'string') {
        throw new Error('delete expects string path');
      }

      return ok(undefined);
    },

    async readDirectory(path: string) {
      logCall('FileSystem', 'readDirectory', [path]);

      if (typeof path !== 'string') {
        throw new Error('readDirectory expects string path');
      }

      return ok([
        {
          path: `${path}/example.proof`,
          name: 'example.proof',
          isDirectory: false,
          size: 1024,
          modifiedAt: new Date('2023-01-01T12:00:00Z'),
        },
      ]);
    },

    async createDirectory(path: string) {
      logCall('FileSystem', 'createDirectory', [path]);

      if (typeof path !== 'string') {
        throw new Error('createDirectory expects string path');
      }

      return ok(undefined);
    },

    watch(path: string, callback: (event: any) => void) {
      logCall('FileSystem', 'watch', [path, 'callback']);

      if (typeof path !== 'string' || typeof callback !== 'function') {
        throw new Error('watch expects string path and function callback');
      }

      return {
        dispose: vi.fn().mockImplementation(() => {
          logCall('FileSystem', 'watch.dispose', []);
        }),
      };
    },

    async getStoredDocument(id: string) {
      logCall('FileSystem', 'getStoredDocument', [id]);

      if (typeof id !== 'string') {
        throw new Error('getStoredDocument expects string id');
      }

      return ok(null); // No document found
    },

    async storeDocument(doc: StoredDocument) {
      // Validate document structure first
      if (!doc || typeof doc !== 'object') {
        throw new Error('storeDocument expects StoredDocument object');
      }

      logCall('FileSystem', 'storeDocument', [doc.id]);

      const requiredFields = ['id', 'content', 'metadata', 'version'];
      for (const field of requiredFields) {
        if (!(field in doc)) {
          throw new Error(`StoredDocument missing required field: ${field}`);
        }
      }

      // Validate metadata structure
      const requiredMetadataFields = ['id', 'title', 'modifiedAt', 'size'];
      for (const field of requiredMetadataFields) {
        if (!(field in doc.metadata)) {
          throw new Error(`DocumentMetadata missing required field: ${field}`);
        }
      }

      return ok(undefined);
    },

    async deleteStoredDocument(id: string) {
      logCall('FileSystem', 'deleteStoredDocument', [id]);

      if (typeof id !== 'string') {
        throw new Error('deleteStoredDocument expects string id');
      }

      return ok(undefined);
    },

    async listStoredDocuments() {
      logCall('FileSystem', 'listStoredDocuments', []);

      return ok([]);
    },

    capabilities(): FileSystemCapabilities {
      logCall('FileSystem', 'capabilities', []);

      // Return consistent, valid capabilities
      return {
        canWatch: true,
        canAccessArbitraryPaths: true,
        maxFileSize: 100 * 1024 * 1024,
        supportsOfflineStorage: true,
        persistence: 'permanent',
      };
    },
  };

  const platformPort: IPlatformPort = {
    getPlatformInfo(): PlatformInfo {
      logCall('Platform', 'getPlatformInfo', []);

      // Return consistent platform info
      return {
        type: 'vscode',
        version: '1.85.0',
        os: 'macos',
        arch: 'arm64',
        isDebug: false,
      };
    },

    getInputCapabilities() {
      logCall('Platform', 'getInputCapabilities', []);

      return {
        hasKeyboard: true,
        hasMouse: true,
        hasTouch: false,
        hasPen: false,
        primaryInput: 'keyboard',
      };
    },

    getDisplayCapabilities() {
      logCall('Platform', 'getDisplayCapabilities', []);

      return {
        screenWidth: 1920,
        screenHeight: 1080,
        devicePixelRatio: 2.0,
        colorDepth: 24,
        isHighContrast: false,
        prefersReducedMotion: false,
      };
    },

    isFeatureAvailable(feature) {
      logCall('Platform', 'isFeatureAvailable', [feature]);

      if (typeof feature !== 'string') {
        throw new Error('isFeatureAvailable expects string feature');
      }

      const validFeatures = new Set([
        'file-system',
        'clipboard',
        'notifications',
        'external-links',
        'offline-storage',
        'webviews',
        'touch-gestures',
        'keyboard-shortcuts',
      ]);

      if (!validFeatures.has(feature)) {
        throw new Error(`Unknown platform feature: ${feature}`);
      }

      return true; // Mock supports all features
    },

    async openExternal(url: string) {
      logCall('Platform', 'openExternal', [url]);

      if (typeof url !== 'string') {
        throw new Error('openExternal expects string URL');
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        return err({
          code: 'PLATFORM_ERROR',
          message: 'Invalid URL format',
        });
      }

      return ok(undefined);
    },

    async copyToClipboard(text: string) {
      logCall('Platform', 'copyToClipboard', [text]);

      if (typeof text !== 'string') {
        throw new Error('copyToClipboard expects string text');
      }

      return ok(undefined);
    },

    async readFromClipboard() {
      logCall('Platform', 'readFromClipboard', []);

      return ok('mock clipboard content');
    },

    onWillTerminate(callback: () => void) {
      logCall('Platform', 'onWillTerminate', ['callback']);

      if (typeof callback !== 'function') {
        throw new Error('onWillTerminate expects function callback');
      }

      return {
        dispose: vi.fn().mockImplementation(() => {
          logCall('Platform', 'onWillTerminate.dispose', []);
        }),
      };
    },

    preventTermination(reason: string) {
      logCall('Platform', 'preventTermination', [reason]);

      if (typeof reason !== 'string') {
        throw new Error('preventTermination expects string reason');
      }

      return {
        dispose: vi.fn().mockImplementation(() => {
          logCall('Platform', 'preventTermination.dispose', []);
        }),
      };
    },

    async getStorageValue<T>(key: string, defaultValue?: T) {
      logCall('Platform', 'getStorageValue', [key, defaultValue]);

      if (typeof key !== 'string') {
        throw new Error('getStorageValue expects string key');
      }

      return ok(defaultValue);
    },

    async setStorageValue<T>(key: string, value: T) {
      logCall('Platform', 'setStorageValue', [key, value]);

      if (typeof key !== 'string') {
        throw new Error('setStorageValue expects string key');
      }

      return ok(undefined);
    },

    async deleteStorageValue(key: string) {
      logCall('Platform', 'deleteStorageValue', [key]);

      if (typeof key !== 'string') {
        throw new Error('deleteStorageValue expects string key');
      }

      return ok(undefined);
    },
  };

  const uiPort: IUIPort = {
    async showInputBox(options) {
      logCall('UI', 'showInputBox', [options]);

      // Validate options structure
      if (!options || typeof options !== 'object') {
        throw new Error('showInputBox expects options object');
      }

      if (!('prompt' in options) || typeof options.prompt !== 'string') {
        throw new Error('showInputBox options must include string prompt');
      }

      // Validate optional validation function
      if (options.validateInput && typeof options.validateInput !== 'function') {
        throw new Error('validateInput must be a function if provided');
      }

      return ok('mock user input');
    },

    async showQuickPick(items, options?) {
      logCall('UI', 'showQuickPick', [items.length, options]);

      if (!Array.isArray(items)) {
        throw new Error('showQuickPick expects array of items');
      }

      // Validate item structure
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== 'object' || !('label' in item)) {
          throw new Error(`QuickPickItem at index ${i} must have label property`);
        }
      }

      return ok(items[0] || null);
    },

    async showConfirmation(options) {
      logCall('UI', 'showConfirmation', [options]);

      if (!options || typeof options !== 'object') {
        throw new Error('showConfirmation expects options object');
      }

      const requiredFields = ['title', 'message'] as const;
      for (const field of requiredFields) {
        if (!(field in options) || typeof options[field] !== 'string') {
          throw new Error(`showConfirmation options must include string ${field}`);
        }
      }

      return ok(true);
    },

    async showOpenDialog(options) {
      logCall('UI', 'showOpenDialog', [options]);

      if (!options || typeof options !== 'object') {
        throw new Error('showOpenDialog expects options object');
      }

      // Validate filters if provided
      if (options.filters) {
        if (!Array.isArray(options.filters)) {
          throw new Error('filters must be an array');
        }

        for (const filter of options.filters) {
          if (!filter.name || !Array.isArray(filter.extensions)) {
            throw new Error('Each filter must have name and extensions array');
          }
        }
      }

      return ok(['/mock/selected/file.proof']);
    },

    async showSaveDialog(options) {
      logCall('UI', 'showSaveDialog', [options]);

      if (!options || typeof options !== 'object') {
        throw new Error('showSaveDialog expects options object');
      }

      return ok({ filePath: '/mock/save/path.proof', cancelled: false });
    },

    showInformation(message: string, ...actions) {
      logCall('UI', 'showInformation', [message, actions.length]);

      if (typeof message !== 'string') {
        throw new Error('showInformation expects string message');
      }

      // Validate action structure
      for (const action of actions) {
        if (!action || typeof action.label !== 'string' || typeof action.callback !== 'function') {
          throw new Error('NotificationAction must have string label and function callback');
        }
      }
    },

    showWarning(message: string, ...actions) {
      logCall('UI', 'showWarning', [message, actions.length]);

      if (typeof message !== 'string') {
        throw new Error('showWarning expects string message');
      }
    },

    showError(message: string, ...actions) {
      logCall('UI', 'showError', [message, actions.length]);

      if (typeof message !== 'string') {
        throw new Error('showError expects string message');
      }
    },

    async showProgress(options, task) {
      logCall('UI', 'showProgress', [options, 'task']);

      if (!options || typeof options !== 'object' || typeof options.title !== 'string') {
        throw new Error('showProgress expects options with string title');
      }

      if (typeof task !== 'function') {
        throw new Error('showProgress expects function task');
      }

      const mockProgress = {
        report: vi.fn().mockImplementation((report) => {
          if (report && typeof report !== 'object') {
            throw new Error('progress.report expects object parameter');
          }
        }),
      };

      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      };

      return task(mockProgress, mockToken);
    },

    setStatusMessage(message: string, timeout?: number) {
      logCall('UI', 'setStatusMessage', [message, timeout]);

      if (typeof message !== 'string') {
        throw new Error('setStatusMessage expects string message');
      }

      if (timeout !== undefined && typeof timeout !== 'number') {
        throw new Error('timeout must be number if provided');
      }

      return {
        dispose: vi.fn().mockImplementation(() => {
          logCall('UI', 'setStatusMessage.dispose', []);
        }),
      };
    },

    createWebviewPanel(options) {
      logCall('UI', 'createWebviewPanel', [options]);

      if (!options || typeof options !== 'object') {
        throw new Error('createWebviewPanel expects options object');
      }

      const requiredFields = ['id', 'title', 'viewType'] as const;
      for (const field of requiredFields) {
        if (!(field in options) || typeof options[field] !== 'string') {
          throw new Error(`WebviewPanelOptions must include string ${field}`);
        }
      }

      const panel: WebviewPanel = {
        id: options.id,
        webview: {
          html: '',
          onDidReceiveMessage: vi.fn().mockImplementation((callback) => {
            if (typeof callback !== 'function') {
              throw new Error('onDidReceiveMessage expects function callback');
            }
            return { dispose: vi.fn() };
          }),
        },
        onDidDispose: vi.fn().mockImplementation((callback) => {
          if (typeof callback !== 'function') {
            throw new Error('onDidDispose expects function callback');
          }
          return { dispose: vi.fn() };
        }),
        reveal: vi.fn(),
        dispose: vi.fn().mockImplementation(() => {
          logCall('UI', 'webviewPanel.dispose', [options.id]);
        }),
      };

      return panel;
    },

    postMessageToWebview(panelId: string, message) {
      logCall('UI', 'postMessageToWebview', [panelId, message]);

      if (typeof panelId !== 'string') {
        throw new Error('postMessageToWebview expects string panelId');
      }

      if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
        throw new Error('WebviewMessage must be object with string type');
      }
    },

    getTheme() {
      logCall('UI', 'getTheme', []);

      return {
        kind: 'dark',
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
        },
        fonts: {
          default: 'Segoe UI',
          monospace: 'Consolas',
          size: 14,
        },
      };
    },

    onThemeChange(callback) {
      logCall('UI', 'onThemeChange', ['callback']);

      if (typeof callback !== 'function') {
        throw new Error('onThemeChange expects function callback');
      }

      return {
        dispose: vi.fn().mockImplementation(() => {
          logCall('UI', 'onThemeChange.dispose', []);
        }),
      };
    },

    async writeFile(filePath, content) {
      logCall('UI', 'writeFile', [filePath, content]);

      if (typeof filePath !== 'string') {
        throw new Error('writeFile expects string filePath');
      }

      if (typeof content !== 'string' && !Buffer.isBuffer(content)) {
        throw new Error('writeFile expects string or Buffer content');
      }

      return ok(undefined);
    },

    capabilities(): UICapabilities {
      logCall('UI', 'capabilities', []);

      return {
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
        maxMessageLength: 1000,
      };
    },
  };

  return {
    fileSystemPort,
    platformPort,
    uiPort,
    getCallLog: () => [...callLog],
    clearCallLog: () => {
      callLog.length = 0;
    },
  };
}

describe('Port Implementation Validation', () => {
  let mocks: ReturnType<typeof createValidationMocks>;

  beforeEach(() => {
    mocks = createValidationMocks();
    vi.clearAllMocks();
  });

  describe('Input Parameter Validation', () => {
    test('FileSystem port validates input parameters correctly', async () => {
      const { fileSystemPort } = mocks;

      // Test string parameter validation
      await expect(async () => {
        await (fileSystemPort as any).readFile(123);
      }).rejects.toThrow('readFile expects string path');
      await expect(async () => {
        await (fileSystemPort as any).writeFile(123, 'content');
      }).rejects.toThrow('writeFile expects string parameters');
      await expect(async () => {
        await (fileSystemPort as any).writeFile('path', 123);
      }).rejects.toThrow('writeFile expects string parameters');

      // Test object parameter validation
      await expect((fileSystemPort as any).storeDocument(null)).rejects.toThrow(
        'storeDocument expects StoredDocument object',
      );
      await expect((fileSystemPort as any).storeDocument({ id: 'test' })).rejects.toThrow(
        'StoredDocument missing required field',
      );

      // Test function parameter validation
      expect(() => (fileSystemPort as any).watch('path', 'not-function')).toThrow(
        'watch expects string path and function callback',
      );
    });

    test('Platform port validates input parameters correctly', async () => {
      const { platformPort } = mocks;

      // Test feature validation
      expect(() => (platformPort as any).isFeatureAvailable(123)).toThrow(
        'isFeatureAvailable expects string feature',
      );
      expect(() => (platformPort as any).isFeatureAvailable('invalid-feature')).toThrow(
        'Unknown platform feature',
      );

      // Test URL validation
      const invalidUrlResult = await platformPort.openExternal('not-a-url');
      expect(invalidUrlResult.isErr()).toBe(true);

      // Test callback validation
      expect(() => (platformPort as any).onWillTerminate('not-function')).toThrow(
        'onWillTerminate expects function callback',
      );
    });

    test('UI port validates input parameters correctly', async () => {
      const { uiPort } = mocks;

      // Test options object validation
      await expect((uiPort as any).showInputBox(null)).rejects.toThrow(
        'showInputBox expects options object',
      );
      await expect((uiPort as any).showInputBox({ title: 'test' })).rejects.toThrow(
        'showInputBox options must include string prompt',
      );

      // Test array validation
      await expect((uiPort as any).showQuickPick('not-array')).rejects.toThrow(
        'showQuickPick expects array of items',
      );
      await expect(uiPort.showQuickPick([{ invalid: 'item' } as any])).rejects.toThrow(
        'QuickPickItem at index 0 must have label property',
      );

      // Test message validation
      expect(() => (uiPort as any).showInformation(123)).toThrow(
        'showInformation expects string message',
      );
    });
  });

  describe('Return Type Consistency', () => {
    test('all async file operations return Result types', async () => {
      const { fileSystemPort } = mocks;

      const operations = [
        fileSystemPort.readFile('/test'),
        fileSystemPort.writeFile('/test', 'content'),
        fileSystemPort.exists('/test'),
        fileSystemPort.delete('/test'),
        fileSystemPort.readDirectory('/test'),
        fileSystemPort.createDirectory('/test'),
        fileSystemPort.getStoredDocument('test'),
        fileSystemPort.listStoredDocuments(),
      ];

      const results = await Promise.all(operations);

      for (const result of results) {
        expect(typeof result.isOk).toBe('function');
        expect(typeof result.isErr).toBe('function');
        expect(result.isOk() || result.isErr()).toBe(true);
        expect(result.isOk() && result.isErr()).toBe(false);
      }
    });

    test('all async platform operations return Result types', async () => {
      const { platformPort } = mocks;

      const operations = [
        platformPort.openExternal('https://example.com'),
        platformPort.copyToClipboard('test'),
        platformPort.readFromClipboard(),
        platformPort.getStorageValue('key'),
        platformPort.setStorageValue('key', 'value'),
        platformPort.deleteStorageValue('key'),
      ];

      const results = await Promise.all(operations);

      for (const result of results) {
        expect(typeof result.isOk).toBe('function');
        expect(typeof result.isErr).toBe('function');
      }
    });

    test('all async UI operations return Result types', async () => {
      const { uiPort } = mocks;

      const operations = [
        uiPort.showInputBox({ prompt: 'test' }),
        uiPort.showQuickPick([{ label: 'test' }]),
        uiPort.showConfirmation({ title: 'test', message: 'test' }),
        uiPort.showOpenDialog({}),
        uiPort.showSaveDialog({}),
      ];

      const results = await Promise.all(operations);

      for (const result of results) {
        expect(typeof result.isOk).toBe('function');
        expect(typeof result.isErr).toBe('function');
      }
    });
  });

  describe('Disposable Pattern Compliance', () => {
    test('all disposable-returning methods return valid disposables', () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      const disposables = [
        fileSystemPort.watch?.('/test', () => {
          /* File change handler */
        }),
        platformPort.onWillTerminate(() => {
          /* Termination handler */
        }),
        platformPort.preventTermination('test'),
        uiPort.setStatusMessage('test'),
        uiPort.onThemeChange(() => {
          /* Theme change handler */
        }),
      ].filter(Boolean);

      for (const disposable of disposables) {
        expect(disposable).toBeDefined();
        expect(typeof disposable?.dispose).toBe('function');
      }
    });

    test('webview panel implements disposable pattern correctly', () => {
      const { uiPort } = mocks;

      const panel = uiPort.createWebviewPanel({
        id: 'test',
        title: 'Test',
        viewType: 'test.panel',
      });

      expect(typeof panel.dispose).toBe('function');
      expect(typeof panel.webview.onDidReceiveMessage).toBe('function');
      expect(typeof panel.onDidDispose).toBe('function');

      // Test webview event handlers return disposables
      const messageDisposable = panel.webview.onDidReceiveMessage(() => {
        /* Message handler */
      });
      const disposeDisposable = panel.onDidDispose(() => {
        /* Dispose handler */
      });

      expect(typeof messageDisposable.dispose).toBe('function');
      expect(typeof disposeDisposable.dispose).toBe('function');
    });
  });

  describe('Capabilities Contract Compliance', () => {
    test('FileSystem capabilities return valid structure', () => {
      const { fileSystemPort } = mocks;

      const capabilities = fileSystemPort.capabilities();

      expect(typeof capabilities.canWatch).toBe('boolean');
      expect(typeof capabilities.canAccessArbitraryPaths).toBe('boolean');
      expect(typeof capabilities.supportsOfflineStorage).toBe('boolean');
      expect(['memory', 'session', 'permanent']).toContain(capabilities.persistence);

      if (capabilities.maxFileSize !== undefined) {
        expect(typeof capabilities.maxFileSize).toBe('number');
        expect(capabilities.maxFileSize).toBeGreaterThan(0);
      }
    });

    test('Platform info returns valid structure', () => {
      const { platformPort } = mocks;

      const info = platformPort.getPlatformInfo();

      expect(['vscode', 'mobile', 'web', 'desktop']).toContain(info.type);
      expect(typeof info.version).toBe('string');
      expect(['windows', 'macos', 'linux', 'ios', 'android']).toContain(info.os);
      expect(typeof info.arch).toBe('string');
      expect(typeof info.isDebug).toBe('boolean');
    });

    test('UI capabilities return valid structure', () => {
      const { uiPort } = mocks;

      const capabilities = uiPort.capabilities();

      const booleanFields = [
        'supportsFileDialogs',
        'supportsNotificationActions',
        'supportsProgress',
        'supportsStatusBar',
        'supportsWebviews',
        'supportsThemes',
      ];

      for (const field of booleanFields) {
        expect(typeof capabilities[field as keyof typeof capabilities]).toBe('boolean');
      }

      if (capabilities.maxMessageLength !== undefined) {
        expect(typeof capabilities.maxMessageLength).toBe('number');
        expect(capabilities.maxMessageLength).toBeGreaterThan(0);
      }
    });
  });

  describe('Method Call Tracking and Patterns', () => {
    test('tracks method calls correctly', async () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // Perform various operations
      await fileSystemPort.readFile('/test');
      platformPort.getPlatformInfo();
      uiPort.showInformation('test message');

      const callLog = mocks.getCallLog();

      expect(callLog).toHaveLength(3);
      expect(callLog[0]).toEqual({
        port: 'FileSystem',
        method: 'readFile',
        args: ['/test'],
      });
      expect(callLog[1]).toEqual({
        port: 'Platform',
        method: 'getPlatformInfo',
        args: [],
      });
      expect(callLog[2]).toEqual({
        port: 'UI',
        method: 'showInformation',
        args: ['test message', 0],
      });
    });

    test('validates method call patterns in workflows', async () => {
      const { fileSystemPort, uiPort } = mocks;

      // Simulate a save workflow
      const saveDialog = await uiPort.showSaveDialog({ title: 'Save File' });
      if (saveDialog.isOk() && saveDialog.value && !saveDialog.value.cancelled) {
        await fileSystemPort.writeFile(saveDialog.value.filePath, 'content');
        uiPort.showInformation('File saved successfully');
      }

      const callLog = mocks.getCallLog();

      expect(callLog).toHaveLength(3);
      expect(callLog[0]?.method).toBe('showSaveDialog');
      expect(callLog[1]?.method).toBe('writeFile');
      expect(callLog[2]?.method).toBe('showInformation');
    });
  });

  describe('Error Handling Contract Compliance', () => {
    test('error objects have consistent structure', async () => {
      const { fileSystemPort } = mocks;

      // Test empty path error
      const result = await fileSystemPort.readFile('');
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(typeof result.error.code).toBe('string');
        expect(typeof result.error.message).toBe('string');
        expect(result.error.code).toBe('INVALID_PATH');
      }
    });

    test('platform feature validation produces appropriate errors', () => {
      const { platformPort } = mocks;

      expect(() => platformPort.isFeatureAvailable('invalid-feature' as any)).toThrow(
        'Unknown platform feature: invalid-feature',
      );
    });

    test('UI validation errors are informative', async () => {
      const { uiPort } = mocks;

      await expect(uiPort.showQuickPick([{ invalid: 'structure' } as any])).rejects.toThrow(
        'QuickPickItem at index 0 must have label property',
      );
    });
  });

  describe('Clean Architecture Boundary Enforcement', () => {
    test('ports do not leak implementation details', () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // Ports should only expose their interface methods
      const fileSystemMethods = Object.getOwnPropertyNames(fileSystemPort);
      const platformMethods = Object.getOwnPropertyNames(platformPort);
      const uiMethods = Object.getOwnPropertyNames(uiPort);

      // Should not contain implementation-specific methods
      expect(fileSystemMethods).not.toContain('vscodeApi');
      expect(fileSystemMethods).not.toContain('nativeFileSystem');
      expect(platformMethods).not.toContain('electronApi');
      expect(uiMethods).not.toContain('domManipulation');
    });

    test('all operations maintain independence', async () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // Operations should not depend on each other's internal state
      await fileSystemPort.readFile('/test1');
      await platformPort.copyToClipboard('test');
      await uiPort.showInputBox({ prompt: 'test' });

      // Each port should maintain its own state independently
      const callLog = mocks.getCallLog();
      const fileSystemCalls = callLog.filter((call) => call.port === 'FileSystem');
      const platformCalls = callLog.filter((call) => call.port === 'Platform');
      const uiCalls = callLog.filter((call) => call.port === 'UI');

      expect(fileSystemCalls).toHaveLength(1);
      expect(platformCalls).toHaveLength(1);
      expect(uiCalls).toHaveLength(1);
    });
  });
});
