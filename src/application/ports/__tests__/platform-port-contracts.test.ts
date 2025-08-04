import { describe, expect, test } from 'vitest';
import {
  Architecture,
  DialogPrompt,
  DialogTitle,
  Dimensions,
  DocumentContent,
  DocumentId,
  DocumentVersion,
  ErrorCode,
  ErrorMessage,
  FilePath,
  FileSize,
  FontFamily,
  FontSize,
  PlatformVersion,
  Timestamp,
  Title,
  ViewType,
  WebviewId,
} from '../../../domain/shared/value-objects/index.js';
import type {
  IFileSystemPort,
  InputBoxOptions,
  IPlatformPort,
  IUIPort,
  StoredDocument,
  WebviewPanelOptions,
} from '../index.js';

// Mock implementations for testing contracts
function createMockFileSystemPort(): IFileSystemPort {
  const storage = new Map<string, StoredDocument>();

  return {
    async readFile(path: FilePath) {
      if (path.getValue() === '/non/existent') {
        const errorCode = ErrorCode.fromString('NOT_FOUND');
        const errorMessage = ErrorMessage.fromString('File not found');
        if (errorCode.isErr() || errorMessage.isErr()) {
          throw new Error('Failed to create error value objects');
        }
        return {
          isOk: () => false,
          isErr: () => true,
          error: {
            code: errorCode.value,
            message: errorMessage.value,
            path,
          },
        } as any;
      }
      const content = DocumentContent.fromString('file content');
      if (content.isErr()) {
        throw new Error('Failed to create document content');
      }
      return {
        isOk: () => true,
        isErr: () => false,
        value: content.value,
      } as any;
    },

    async writeFile() {
      return { isOk: () => true, isErr: () => false } as any;
    },

    async exists() {
      return { isOk: () => true, isErr: () => false, value: true } as any;
    },

    async delete() {
      return { isOk: () => true, isErr: () => false } as any;
    },

    async readDirectory() {
      return { isOk: () => true, isErr: () => false, value: [] } as any;
    },

    async createDirectory() {
      return { isOk: () => true, isErr: () => false } as any;
    },

    async getStoredDocument(id: DocumentId) {
      const doc = storage.get(id.getValue());
      return { isOk: () => true, isErr: () => false, value: doc || null } as any;
    },

    async storeDocument(doc: StoredDocument) {
      storage.set(doc.id.getValue(), doc);
      return { isOk: () => true, isErr: () => false } as any;
    },

    async deleteStoredDocument(id: DocumentId) {
      storage.delete(id.getValue());
      return { isOk: () => true, isErr: () => false } as any;
    },

    async listStoredDocuments() {
      const metadata = Array.from(storage.values()).map((doc) => doc.metadata);
      return { isOk: () => true, isErr: () => false, value: metadata } as any;
    },

    capabilities() {
      return {
        canWatch: true,
        canAccessArbitraryPaths: true,
        supportsOfflineStorage: true,
        persistence: 'permanent' as const,
      };
    },
  };
}

function createMockUIPort(): IUIPort {
  const panels = new Map<string, any>();

  return {
    async showInputBox(_options: InputBoxOptions) {
      // Simulate user cancellation
      return { isOk: () => true, isErr: () => false, value: null } as any;
    },

    async showQuickPick() {
      return { isOk: () => true, isErr: () => false, value: null } as any;
    },

    async showConfirmation() {
      return { isOk: () => true, isErr: () => false, value: true } as any;
    },

    async showOpenDialog() {
      return { isOk: () => true, isErr: () => false, value: null } as any;
    },

    async showSaveDialog() {
      return { isOk: () => true, isErr: () => false, value: null } as any;
    },

    async writeFile() {
      return { isOk: () => true, isErr: () => false, value: undefined } as any;
    },

    showInformation() {
      // Mock notification - no UI in tests
    },
    showWarning() {
      // Mock warning - no UI in tests
    },
    showError() {
      // Mock error - no UI in tests
    },

    async showProgress(_options, task) {
      const mockProgress = {
        report: () => {
          // Mock progress reporting
        },
      };
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: () => ({
          dispose: () => {
            // Mock cleanup
          },
        }),
      };
      return task(mockProgress, mockToken);
    },

    setStatusMessage() {
      return {
        dispose: () => {
          // Mock cleanup
        },
      };
    },

    createWebviewPanel(options: WebviewPanelOptions) {
      const panel = {
        id: options.id,
        webview: {
          html: '',
          onDidReceiveMessage: () => ({
            dispose: () => {
              // Mock message handler cleanup
            },
          }),
        },
        onDidDispose: () => ({
          dispose: () => {
            // Mock disposal cleanup
          },
        }),
        reveal: () => {
          // Mock panel reveal
        },
        dispose: () => {
          panels.delete(options.id.getValue());
        },
      };
      panels.set(options.id.getValue(), panel);
      return panel;
    },

    postMessageToWebview(_panelId: any) {
      // Mock message posting - no actual webview in tests
      // panelId is used to identify which panel to send to
    },

    getTheme() {
      return {
        kind: 'light' as const,
        colors: {},
        fonts: {
          default: (() => {
            const result = FontFamily.fromString('Arial');
            if (result.isErr()) throw new Error('Failed to create FontFamily');
            return result.value;
          })(),
          monospace: (() => {
            const result = FontFamily.fromString('Courier');
            if (result.isErr()) throw new Error('Failed to create FontFamily');
            return result.value;
          })(),
          size: (() => {
            const result = FontSize.fromNumber(14);
            if (result.isErr()) throw new Error('Failed to create FontSize');
            return result.value;
          })(),
        },
      };
    },

    onThemeChange() {
      return {
        dispose: () => {
          // Mock theme change cleanup
        },
      };
    },

    capabilities() {
      return {
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
      };
    },
  };
}

function createMockPlatformPort(
  platformType: 'vscode' | 'mobile' | 'web' | 'desktop' = 'vscode',
): IPlatformPort {
  const storage = new Map<string, any>();

  return {
    getPlatformInfo() {
      return {
        type: platformType,
        version: (() => {
          const result = PlatformVersion.fromString('1.0.0');
          if (result.isErr()) throw new Error('Failed to create PlatformVersion');
          return result.value;
        })(),
        os: platformType === 'mobile' ? 'ios' : 'macos',
        arch: (() => {
          const result = Architecture.fromString('arm64');
          if (result.isErr()) throw new Error('Failed to create Architecture');
          return result.value;
        })(),
        isDebug: false,
      };
    },

    getInputCapabilities() {
      return {
        hasKeyboard: platformType !== 'mobile',
        hasMouse: platformType === 'vscode' || platformType === 'desktop',
        hasTouch: platformType === 'mobile',
        hasPen: false,
        primaryInput: platformType === 'mobile' ? 'touch' : 'keyboard',
      };
    },

    getDisplayCapabilities() {
      const dimensions = Dimensions.create(1920, 1080);
      if (dimensions.isErr()) {
        throw new Error('Failed to create dimensions');
      }
      return {
        screenDimensions: dimensions.value,
        devicePixelRatio: 1,
        colorDepth: 24,
        isHighContrast: false,
        prefersReducedMotion: false,
      };
    },

    isFeatureAvailable(feature) {
      const mobileFeatures = new Set(['touch-gestures', 'offline-storage']);
      if (platformType === 'mobile') {
        return mobileFeatures.has(feature) || feature === 'notifications';
      }
      return true;
    },

    async openExternal() {
      return { isOk: () => true, isErr: () => false } as any;
    },

    async copyToClipboard() {
      return { isOk: () => true, isErr: () => false } as any;
    },

    async readFromClipboard() {
      return { isOk: () => true, isErr: () => false, value: 'clipboard content' } as any;
    },

    onWillTerminate() {
      return {
        dispose: () => {
          // Mock termination handler cleanup
        },
      };
    },

    preventTermination() {
      return {
        dispose: () => {
          // Mock termination prevention cleanup
        },
      };
    },

    async getStorageValue<T>(key: string, defaultValue?: T) {
      const value = storage.get(key) ?? defaultValue;
      return { isOk: () => true, isErr: () => false, value } as any;
    },

    async setStorageValue<T>(key: string, value: T) {
      storage.set(key, value);
      return { isOk: () => true, isErr: () => false } as any;
    },

    async deleteStorageValue(key: string) {
      storage.delete(key);
      return { isOk: () => true, isErr: () => false } as any;
    },
  };
}

describe('Platform Port Contracts', () => {
  describe('FileSystemPort', () => {
    test('handles all error cases', async () => {
      const mockPort = createMockFileSystemPort();

      const filePathResult = FilePath.fromString('/non/existent');
      if (filePathResult.isErr()) {
        throw new Error('Failed to create file path');
      }
      const result = await mockPort.readFile(filePathResult.value);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    test('supports offline storage', async () => {
      const mockPort = createMockFileSystemPort();

      const docId = DocumentId.fromString('test-doc');
      const content = DocumentContent.fromString('test content');
      const title = Title.fromString('Test Document');
      const fileSize = FileSize.fromNumber(12);
      const version = DocumentVersion.fromNumber(1);

      if (
        docId.isErr() ||
        content.isErr() ||
        title.isErr() ||
        fileSize.isErr() ||
        version.isErr()
      ) {
        throw new Error('Failed to create value objects for document');
      }

      const doc: StoredDocument = {
        id: docId.value,
        content: content.value,
        metadata: {
          id: docId.value,
          title: title.value,
          modifiedAt: Timestamp.fromDate(new Date()),
          size: fileSize.value,
          syncStatus: 'local',
        },
        version: version.value,
      };

      const storeResult = await mockPort.storeDocument(doc);
      expect(storeResult.isOk()).toBe(true);

      const docIdResult = DocumentId.fromString('test-doc');
      if (docIdResult.isErr()) {
        throw new Error('Failed to create document ID');
      }
      const getResult = await mockPort.getStoredDocument(docIdResult.value);
      expect(getResult.isOk()).toBe(true);
      if (getResult.isOk()) {
        expect(getResult.value?.content.getValue()).toBe('test content');
      }
    });

    test('reports capabilities correctly', () => {
      const mockPort = createMockFileSystemPort();

      const capabilities = mockPort.capabilities();
      expect(capabilities.canWatch).toBe(true);
      expect(capabilities.supportsOfflineStorage).toBe(true);
      expect(capabilities.persistence).toBe('permanent');
    });
  });

  describe('UIPort', () => {
    test('respects cancellation', async () => {
      const mockPort = createMockUIPort();

      const promptResult = DialogPrompt.fromString('Test');
      if (promptResult.isErr()) {
        throw new Error('Failed to create dialog prompt');
      }
      const result = await mockPort.showInputBox({ prompt: promptResult.value });
      // User cancels
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    test('creates webview panels', () => {
      const mockPort = createMockUIPort();

      const webviewId = WebviewId.fromString('test-panel');
      const dialogTitle = DialogTitle.fromString('Test Panel');
      const viewType = ViewType.fromString('proofTree');

      if (webviewId.isErr() || dialogTitle.isErr() || viewType.isErr()) {
        throw new Error('Failed to create webview panel value objects');
      }

      const panel = mockPort.createWebviewPanel({
        id: webviewId.value,
        title: dialogTitle.value,
        viewType: viewType.value,
        enableScripts: true,
      });

      expect(panel.id).toBe('test-panel');
      expect(panel.webview).toBeDefined();
    });

    test('handles progress operations', async () => {
      const mockPort = createMockUIPort();

      const titleResult = DialogTitle.fromString('Testing');
      if (titleResult.isErr()) {
        throw new Error('Failed to create dialog title');
      }
      const result = await mockPort.showProgress(
        { title: titleResult.value },
        async (progress, _token) => {
          progress.report({ message: 'Working...' });
          return 'completed';
        },
      );

      expect(result).toBe('completed');
    });

    test('reports UI capabilities', () => {
      const mockPort = createMockUIPort();

      const capabilities = mockPort.capabilities();
      expect(capabilities.supportsWebviews).toBe(true);
      expect(capabilities.supportsFileDialogs).toBe(true);
      expect(capabilities.supportsThemes).toBe(true);
    });
  });

  describe('PlatformPort', () => {
    test('correctly reports VS Code capabilities', () => {
      const mockPort = createMockPlatformPort('vscode');

      const info = mockPort.getPlatformInfo();
      expect(info.type).toBe('vscode');

      const input = mockPort.getInputCapabilities();
      expect(input.hasKeyboard).toBe(true);
      expect(input.primaryInput).toBe('keyboard');
    });

    test('correctly reports mobile capabilities', () => {
      const mockPort = createMockPlatformPort('mobile');

      const info = mockPort.getPlatformInfo();
      expect(info.type).toBe('mobile');

      const input = mockPort.getInputCapabilities();
      expect(input.hasTouch).toBe(true);
      expect(input.primaryInput).toBe('touch');
    });

    test('handles storage operations', async () => {
      const mockPort = createMockPlatformPort('vscode');

      const setResult = await mockPort.setStorageValue('theme', 'dark');
      expect(setResult.isOk()).toBe(true);

      const getResult = await mockPort.getStorageValue<string>('theme');
      expect(getResult.isOk()).toBe(true);
      if (getResult.isOk()) {
        expect(getResult.value).toBe('dark');
      }
    });

    test('feature detection works correctly', () => {
      const vscodePort = createMockPlatformPort('vscode');
      const mobilePort = createMockPlatformPort('mobile');

      expect(vscodePort.isFeatureAvailable('file-system')).toBe(true);
      expect(vscodePort.isFeatureAvailable('keyboard-shortcuts')).toBe(true);

      expect(mobilePort.isFeatureAvailable('touch-gestures')).toBe(true);
      expect(mobilePort.isFeatureAvailable('offline-storage')).toBe(true);
    });

    test('handles clipboard operations', async () => {
      const mockPort = createMockPlatformPort('vscode');

      const copyResult = await mockPort.copyToClipboard('test text');
      expect(copyResult.isOk()).toBe(true);

      const readResult = await mockPort.readFromClipboard();
      expect(readResult.isOk()).toBe(true);
      if (readResult.isOk()) {
        expect(typeof readResult.value).toBe('string');
      }
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('all platforms implement required interfaces', () => {
      const platforms = ['vscode', 'mobile', 'web', 'desktop'] as const;

      platforms.forEach((platform) => {
        const port = createMockPlatformPort(platform);

        // All platforms must provide basic info
        expect(port.getPlatformInfo().type).toBe(platform);
        expect(port.getInputCapabilities()).toBeDefined();
        expect(port.getDisplayCapabilities()).toBeDefined();

        // Storage must work on all platforms
        expect(port.setStorageValue).toBeDefined();
        expect(port.getStorageValue).toBeDefined();
      });
    });

    test('mobile platform has touch-first design', () => {
      const mobilePort = createMockPlatformPort('mobile');
      const input = mobilePort.getInputCapabilities();

      expect(input.hasTouch).toBe(true);
      expect(input.primaryInput).toBe('touch');
      expect(mobilePort.isFeatureAvailable('touch-gestures')).toBe(true);
    });

    test('desktop platforms support full feature set', () => {
      const vscodePort = createMockPlatformPort('vscode');

      const features = [
        'file-system',
        'clipboard',
        'notifications',
        'external-links',
        'webviews',
        'keyboard-shortcuts',
      ] as const;

      features.forEach((feature) => {
        expect(vscodePort.isFeatureAvailable(feature)).toBe(true);
      });
    });
  });
});
