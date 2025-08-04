/**
 * Implementation validation tests for application ports
 *
 * Tests mock behavior consistency, implementation adherence to contracts,
 * and validates that real implementations would satisfy the port contracts.
 * Focuses on ensuring clean architecture boundaries are maintained.
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  Architecture,
  DialogPrompt,
  DialogTitle,
  Dimensions,
  DocumentContent,
  DocumentId,
  ErrorCode,
  ErrorMessage,
  FileName,
  FilePath,
  FileSize,
  FontFamily,
  FontSize,
  MessageLength,
  NotificationMessage,
  PlatformVersion,
  ViewType,
  WebviewId,
} from '../../../domain/shared/value-objects/index.js';
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
    async readFile(path: FilePath) {
      // Validate input parameters first
      if (!path || typeof path !== 'object' || typeof path.getValue !== 'function') {
        throw new Error('readFile expects FilePath object');
      }

      logCall('FileSystem', 'readFile', [path.getValue()]);

      // Create mock document content
      const contentResult = DocumentContent.create(`Mock content for ${path.getValue()}`);
      if (contentResult.isErr()) {
        const errorCode = ErrorCode.create('FILE_ERROR');
        const errorMessage = ErrorMessage.create('Failed to create mock content');

        if (errorCode.isErr() || errorMessage.isErr()) {
          throw new Error('Failed to create error objects');
        }

        return err({
          code: errorCode.value,
          message: errorMessage.value,
          path,
        });
      }

      return ok(contentResult.value);
    },

    async writeFile(path: FilePath, content: DocumentContent) {
      // Validate input parameters first
      if (!path || typeof path !== 'object' || typeof path.getValue !== 'function') {
        throw new Error('writeFile expects FilePath object');
      }
      if (!content || typeof content !== 'object' || typeof content.getValue !== 'function') {
        throw new Error('writeFile expects DocumentContent object');
      }

      logCall('FileSystem', 'writeFile', [path.getValue(), content.getValue()]);

      return ok(undefined);
    },

    async exists(path: FilePath) {
      logCall('FileSystem', 'exists', [path.getValue()]);

      if (!path || !(path instanceof FilePath)) {
        throw new Error('exists expects FilePath object');
      }

      return ok(true);
    },

    async delete(path: FilePath) {
      logCall('FileSystem', 'delete', [path.getValue()]);

      if (!path || !(path instanceof FilePath)) {
        throw new Error('delete expects FilePath object');
      }

      return ok(undefined);
    },

    async readDirectory(path: FilePath) {
      logCall('FileSystem', 'readDirectory', [path.getValue()]);

      if (!path || !(path instanceof FilePath)) {
        throw new Error('readDirectory expects FilePath object');
      }

      const filePathResult = FilePath.create(`${path.getValue()}/example.proof`);
      const fileNameResult = FileName.create('example.proof');
      const fileSizeResult = FileSize.create(1024);

      if (filePathResult.isErr() || fileNameResult.isErr() || fileSizeResult.isErr()) {
        const errorCode = ErrorCode.create('FILE_ERROR');
        const errorMessage = ErrorMessage.create('Failed to create file info');

        if (errorCode.isErr() || errorMessage.isErr()) {
          throw new Error('Failed to create error objects');
        }

        return err({
          code: errorCode.value,
          message: errorMessage.value,
        });
      }

      return ok([
        {
          path: filePathResult.value,
          name: fileNameResult.value,
          isDirectory: false,
          size: fileSizeResult.value,
          modifiedAt: new Date('2023-01-01T12:00:00Z'),
        },
      ]);
    },

    async createDirectory(path: FilePath) {
      logCall('FileSystem', 'createDirectory', [path.getValue()]);

      if (!path || !(path instanceof FilePath)) {
        throw new Error('createDirectory expects FilePath object');
      }

      return ok(undefined);
    },

    watch(path: FilePath, callback: (event: any) => void) {
      // Validate input parameters first
      if (!path || typeof path !== 'object' || typeof path.getValue !== 'function') {
        throw new Error('watch expects FilePath object');
      }
      if (typeof callback !== 'function') {
        throw new Error('watch expects function callback');
      }

      logCall('FileSystem', 'watch', [path.getValue(), 'callback']);

      return {
        dispose: vi.fn().mockImplementation(() => {
          logCall('FileSystem', 'watch.dispose', []);
        }),
      };
    },

    async getStoredDocument(id: DocumentId) {
      logCall('FileSystem', 'getStoredDocument', [id.getValue()]);

      if (!id || !(id instanceof DocumentId)) {
        throw new Error('getStoredDocument expects DocumentId object');
      }

      return ok(null); // No document found
    },

    async storeDocument(doc: StoredDocument) {
      // Validate document structure first
      if (!doc || typeof doc !== 'object') {
        throw new Error('storeDocument expects StoredDocument object');
      }

      const requiredFields = ['id', 'content', 'metadata', 'version'];
      for (const field of requiredFields) {
        if (!(field in doc)) {
          throw new Error(`StoredDocument missing required field: ${field}`);
        }
      }

      logCall('FileSystem', 'storeDocument', [doc.id.getValue()]);

      // Validate metadata structure
      const requiredMetadataFields = ['id', 'title', 'modifiedAt', 'size'];
      for (const field of requiredMetadataFields) {
        if (!(field in doc.metadata)) {
          throw new Error(`DocumentMetadata missing required field: ${field}`);
        }
      }

      return ok(undefined);
    },

    async deleteStoredDocument(id: DocumentId) {
      logCall('FileSystem', 'deleteStoredDocument', [id.getValue()]);

      if (!id || !(id instanceof DocumentId)) {
        throw new Error('deleteStoredDocument expects DocumentId object');
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
      const maxFileSizeResult = FileSize.create(100 * 1024 * 1024);

      const capabilities: FileSystemCapabilities = {
        canWatch: true,
        canAccessArbitraryPaths: true,
        supportsOfflineStorage: true,
        persistence: 'permanent',
      };

      if (maxFileSizeResult.isOk()) {
        capabilities.maxFileSize = maxFileSizeResult.value;
      }

      return capabilities;
    },
  };

  const platformPort: IPlatformPort = {
    getPlatformInfo(): PlatformInfo {
      logCall('Platform', 'getPlatformInfo', []);

      // Return consistent platform info
      const versionResult = PlatformVersion.create('1.85.0');
      const archResult = Architecture.create('arm64');

      if (versionResult.isErr() || archResult.isErr()) {
        throw new Error('Failed to create platform info');
      }

      return {
        type: 'vscode',
        version: versionResult.value,
        os: 'macos',
        arch: archResult.value,
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

      const dimensionsResult = Dimensions.create(1920, 1080);

      if (dimensionsResult.isErr()) {
        throw new Error('Failed to create display capabilities');
      }

      return {
        screenDimensions: dimensionsResult.value,
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
        const errorCode = ErrorCode.create('PLATFORM_ERROR');
        const errorMessage = ErrorMessage.create('Invalid URL format');

        if (errorCode.isErr() || errorMessage.isErr()) {
          throw new Error('Failed to create error objects');
        }

        return err({
          code: errorCode.value,
          message: errorMessage.value,
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

      if (!('prompt' in options)) {
        throw new Error('showInputBox options must include prompt');
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
        if (!(field in options)) {
          throw new Error(`showConfirmation options must include ${field}`);
        }
      }

      // Note: We don't check value object types here for simplicity
      // The actual implementation would validate these

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

    showInformation(message: NotificationMessage, ...actions) {
      // Validate input parameters first
      if (!message || typeof message !== 'object' || typeof message.getValue !== 'function') {
        throw new Error('showInformation expects NotificationMessage object');
      }

      logCall('UI', 'showInformation', [message.getValue(), actions.length]);

      // Validate action structure
      for (const action of actions) {
        if (!action || typeof action.label !== 'string' || typeof action.callback !== 'function') {
          throw new Error('NotificationAction must have string label and function callback');
        }
      }
    },

    showWarning(message: NotificationMessage, ...actions) {
      // Validate input parameters first
      if (!message || typeof message !== 'object' || typeof message.getValue !== 'function') {
        throw new Error('showWarning expects NotificationMessage object');
      }

      logCall('UI', 'showWarning', [message.getValue(), actions.length]);
    },

    showError(message: NotificationMessage, ...actions) {
      // Validate input parameters first
      if (!message || typeof message !== 'object' || typeof message.getValue !== 'function') {
        throw new Error('showError expects NotificationMessage object');
      }

      logCall('UI', 'showError', [message.getValue(), actions.length]);
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
        if (!(field in options)) {
          throw new Error(`WebviewPanelOptions must include ${field}`);
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

    postMessageToWebview(panelId: WebviewId, message) {
      logCall('UI', 'postMessageToWebview', [panelId.getValue(), message]);

      if (!panelId || !(panelId instanceof WebviewId)) {
        throw new Error('postMessageToWebview expects WebviewId object');
      }

      if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
        throw new Error('WebviewMessage must be object with string type');
      }
    },

    getTheme() {
      logCall('UI', 'getTheme', []);

      const defaultFont = FontFamily.create('Segoe UI');
      const monospaceFont = FontFamily.create('Consolas');
      const fontSize = FontSize.create(14);

      if (defaultFont.isErr() || monospaceFont.isErr() || fontSize.isErr()) {
        throw new Error('Failed to create theme fonts');
      }

      return {
        kind: 'dark' as const,
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
        },
        fonts: {
          default: defaultFont.value,
          monospace: monospaceFont.value,
          size: fontSize.value,
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

    async writeFile(filePath: FilePath, content: DocumentContent | Buffer) {
      logCall('UI', 'writeFile', [
        filePath.getValue(),
        content instanceof DocumentContent ? content.getValue() : 'Buffer',
      ]);

      if (!filePath || !(filePath instanceof FilePath)) {
        throw new Error('writeFile expects FilePath object');
      }

      if (!content || (!(content instanceof DocumentContent) && !Buffer.isBuffer(content))) {
        throw new Error('writeFile expects DocumentContent or Buffer');
      }

      return ok(undefined);
    },

    capabilities(): UICapabilities {
      logCall('UI', 'capabilities', []);

      const maxMessageLength = MessageLength.create(1000);

      const capabilities: UICapabilities = {
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
      };

      if (maxMessageLength.isOk()) {
        capabilities.maxMessageLength = maxMessageLength.value;
      }

      return capabilities;
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
      }).rejects.toThrow('readFile expects FilePath object');
      await expect(async () => {
        await (fileSystemPort as any).writeFile(123, 'content');
      }).rejects.toThrow('writeFile expects FilePath object');
      await expect(async () => {
        await (fileSystemPort as any).writeFile('path', 123);
      }).rejects.toThrow('writeFile expects FilePath object');

      // Test object parameter validation
      await expect((fileSystemPort as any).storeDocument(null)).rejects.toThrow(
        'storeDocument expects StoredDocument object',
      );
      await expect((fileSystemPort as any).storeDocument({ id: 'test' })).rejects.toThrow(
        'StoredDocument missing required field',
      );

      // Test function parameter validation
      expect(() => (fileSystemPort as any).watch('path', 'not-function')).toThrow(
        'watch expects FilePath object',
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
      const titleResult = DialogTitle.create('test');
      if (titleResult.isErr()) {
        throw new Error('Failed to create DialogTitle');
      }
      await expect((uiPort as any).showInputBox({ title: titleResult.value })).rejects.toThrow(
        'showInputBox options must include prompt',
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
        'showInformation expects NotificationMessage object',
      );
    });
  });

  describe('Return Type Consistency', () => {
    test('all async file operations return Result types', async () => {
      const { fileSystemPort } = mocks;

      const pathResult = FilePath.create('/test');
      const contentResult = DocumentContent.create('content');
      const docIdResult = DocumentId.create('test');

      if (pathResult.isErr() || contentResult.isErr() || docIdResult.isErr()) {
        throw new Error('Failed to create test value objects');
      }

      const operations = [
        fileSystemPort.readFile(pathResult.value),
        fileSystemPort.writeFile(pathResult.value, contentResult.value),
        fileSystemPort.exists(pathResult.value),
        fileSystemPort.delete(pathResult.value),
        fileSystemPort.readDirectory(pathResult.value),
        fileSystemPort.createDirectory(pathResult.value),
        fileSystemPort.getStoredDocument(docIdResult.value),
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

      const promptResult = DialogPrompt.create('test');
      const titleResult = DialogTitle.create('test');
      const messageResult = ErrorMessage.create('test');

      if (promptResult.isErr() || titleResult.isErr() || messageResult.isErr()) {
        throw new Error('Failed to create UI value objects');
      }

      const operations = [
        uiPort.showInputBox({ prompt: promptResult.value }),
        uiPort.showQuickPick([{ label: 'test' }]),
        uiPort.showConfirmation({ title: titleResult.value, message: messageResult.value }),
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

      const pathResult = FilePath.create('/test');
      if (pathResult.isErr()) {
        throw new Error('Failed to create test FilePath');
      }

      const disposables = [
        fileSystemPort.watch?.(pathResult.value, () => {
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

      const webviewIdResult = WebviewId.create('test');
      const titleResult = DialogTitle.create('Test');
      const viewTypeResult = ViewType.create('testPanel');

      if (webviewIdResult.isErr() || titleResult.isErr() || viewTypeResult.isErr()) {
        throw new Error('Failed to create webview panel options');
      }

      const panel = uiPort.createWebviewPanel({
        id: webviewIdResult.value,
        title: titleResult.value,
        viewType: viewTypeResult.value,
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
        expect(capabilities.maxFileSize).toBeDefined();
        expect(capabilities.maxFileSize?.getValue()).toBeGreaterThan(0);
      }
    });

    test('Platform info returns valid structure', () => {
      const { platformPort } = mocks;

      const info = platformPort.getPlatformInfo();

      expect(['vscode', 'mobile', 'web', 'desktop']).toContain(info.type);
      expect(info.version).toBeDefined();
      expect(info.version.getValue()).toBe('1.85.0');
      expect(['windows', 'macos', 'linux', 'ios', 'android']).toContain(info.os);
      expect(info.arch).toBeDefined();
      expect(info.arch.getValue()).toBe('arm64');
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
        expect(capabilities.maxMessageLength).toBeDefined();
        expect(capabilities.maxMessageLength.getValue()).toBeGreaterThan(0);
      }
    });
  });

  describe('Method Call Tracking and Patterns', () => {
    test('tracks method calls correctly', async () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // Perform various operations
      const pathResult = FilePath.create('/test');
      if (pathResult.isErr()) {
        throw new Error('Failed to create test FilePath');
      }

      await fileSystemPort.readFile(pathResult.value);
      platformPort.getPlatformInfo();
      const msgResult = NotificationMessage.create('test message');
      if (msgResult.isOk()) {
        uiPort.showInformation(msgResult.value);
      }

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
      const titleResult = DialogTitle.create('Save File');
      if (titleResult.isErr()) {
        throw new Error('Failed to create DialogTitle');
      }

      const saveDialog = await uiPort.showSaveDialog({ title: titleResult.value });
      if (saveDialog.isOk() && saveDialog.value && !saveDialog.value.cancelled) {
        const filePathResult = FilePath.create(saveDialog.value.filePath);
        const contentResult = DocumentContent.create('content');

        if (filePathResult.isErr() || contentResult.isErr()) {
          throw new Error('Failed to create file path or content');
        }

        await fileSystemPort.writeFile(filePathResult.value, contentResult.value);
        const msgResult = NotificationMessage.create('File saved successfully');
        if (msgResult.isOk()) {
          uiPort.showInformation(msgResult.value);
        }
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

      // Test invalid file system error
      // Note: We can't create an empty FilePath due to validation,
      // so we'll test with a mock scenario that would trigger an error
      const pathResult = FilePath.create('/nonexistent/test/file');
      if (pathResult.isErr()) {
        throw new Error('Failed to create test FilePath');
      }

      // Override the readFile method temporarily to simulate an error
      const originalReadFile = fileSystemPort.readFile;
      fileSystemPort.readFile = async (path: FilePath) => {
        const errorCode = ErrorCode.create('INVALID_PATH');
        const errorMessage = ErrorMessage.create('Path cannot be empty');

        if (errorCode.isErr() || errorMessage.isErr()) {
          throw new Error('Failed to create error objects');
        }

        return err({
          code: errorCode.value,
          message: errorMessage.value,
          path,
        });
      };

      const result = await fileSystemPort.readFile(pathResult.value);
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(typeof result.error.code.getValue()).toBe('string');
        expect(typeof result.error.message.getValue()).toBe('string');
        expect(result.error.code.getValue()).toBe('INVALID_PATH');
      }

      // Restore original method
      fileSystemPort.readFile = originalReadFile;
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
      const pathResult = FilePath.create('/test1');
      const promptResult = DialogPrompt.create('test');

      if (pathResult.isErr() || promptResult.isErr()) {
        throw new Error('Failed to create test value objects');
      }

      await fileSystemPort.readFile(pathResult.value);
      await platformPort.copyToClipboard('test');
      await uiPort.showInputBox({ prompt: promptResult.value });

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
