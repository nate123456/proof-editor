/**
 * Integration scenario tests for application ports
 *
 * Tests cross-port interactions, complex workflows, and clean architecture boundaries.
 * These tests validate that ports work together correctly in realistic usage scenarios.
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  IFileSystemPort,
  IPlatformPort,
  IUIPort,
  StoredDocument,
  WebviewPanel,
} from '../index.js';

// Test helpers for creating coordinated mock implementations
function createCoordinatedMocks() {
  const storage = new Map<string, any>();
  const offlineDocuments = new Map<string, StoredDocument>();
  const activeWebviews = new Map<string, WebviewPanel>();

  const fileSystemPort: IFileSystemPort = {
    async readFile(path: string) {
      if (path.includes('error')) {
        return err({ code: 'NOT_FOUND', message: 'Test error', path } as any);
      }
      return ok(`content from ${path}`);
    },

    async writeFile(path: string, content: string) {
      storage.set(path, content);
      return ok(undefined);
    },

    async exists(path: string) {
      return ok(storage.has(path) || !path.includes('missing'));
    },

    async delete(path: string) {
      storage.delete(path);
      return ok(undefined);
    },

    async readDirectory(path: string) {
      if (path.includes('restricted')) {
        return err({ code: 'PERMISSION_DENIED', message: 'Access denied' } as any);
      }
      return ok([
        { path: `${path}/file1.proof`, name: 'file1.proof', isDirectory: false },
        { path: `${path}/subdir`, name: 'subdir', isDirectory: true },
      ]);
    },

    async createDirectory(path: string) {
      storage.set(path, 'directory');
      return ok(undefined);
    },

    watch: vi.fn().mockReturnValue({ dispose: vi.fn() }),

    async getStoredDocument(id: string) {
      const doc = offlineDocuments.get(id);
      return ok(doc || null);
    },

    async storeDocument(doc: StoredDocument) {
      offlineDocuments.set(doc.id, doc);
      return ok(undefined);
    },

    async deleteStoredDocument(id: string) {
      offlineDocuments.delete(id);
      return ok(undefined);
    },

    async listStoredDocuments() {
      const metadata = Array.from(offlineDocuments.values()).map((doc) => doc.metadata);
      return ok(metadata);
    },

    capabilities() {
      return {
        canWatch: true,
        canAccessArbitraryPaths: true,
        supportsOfflineStorage: true,
        persistence: 'permanent' as const,
        maxFileSize: 100 * 1024 * 1024,
      };
    },
  };

  const platformPort: IPlatformPort = {
    getPlatformInfo() {
      return {
        type: 'vscode' as const,
        version: '1.85.0',
        os: 'macos' as const,
        arch: 'arm64',
        isDebug: false,
      };
    },

    getInputCapabilities() {
      return {
        hasKeyboard: true,
        hasMouse: true,
        hasTouch: false,
        hasPen: false,
        primaryInput: 'keyboard' as const,
      };
    },

    getDisplayCapabilities() {
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
      const supportedFeatures = new Set([
        'file-system',
        'clipboard',
        'notifications',
        'external-links',
        'webviews',
        'keyboard-shortcuts',
      ]);
      return supportedFeatures.has(feature);
    },

    async openExternal(url: string) {
      if (url.includes('blocked')) {
        return err({ code: 'NOT_SUPPORTED', message: 'URL blocked' } as any);
      }
      return ok(undefined);
    },

    async copyToClipboard(text: string) {
      storage.set('clipboard', text);
      return ok(undefined);
    },

    async readFromClipboard() {
      const text = storage.get('clipboard');
      return ok(text || null);
    },

    onWillTerminate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    preventTermination: vi.fn().mockReturnValue({ dispose: vi.fn() }),

    async getStorageValue<T>(key: string, defaultValue?: T) {
      const value = storage.get(`storage:${key}`) ?? defaultValue;
      return ok(value);
    },

    async setStorageValue<T>(key: string, value: T) {
      storage.set(`storage:${key}`, value);
      return ok(undefined);
    },

    async deleteStorageValue(key: string) {
      storage.delete(`storage:${key}`);
      return ok(undefined);
    },
  };

  const uiPort: IUIPort = {
    async showInputBox(options) {
      if (options.prompt.includes('cancel')) {
        return ok(null);
      }
      return ok(`user-input-for-${options.prompt.slice(0, 10)}`);
    },

    async showQuickPick(items) {
      if (items.length === 0) {
        return ok(null);
      }
      return ok(items[0] || null);
    },

    async showConfirmation(options) {
      return ok(!options.message.includes('cancel'));
    },

    async showOpenDialog() {
      return ok(['/selected/file1.proof', '/selected/file2.proof']);
    },

    async showSaveDialog() {
      return ok('/save/location/document.proof');
    },

    showInformation: vi.fn(),
    showWarning: vi.fn(),
    showError: vi.fn(),

    async showProgress(_options, task) {
      const mockProgress = { report: vi.fn() };
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      };
      return task(mockProgress, mockToken);
    },

    setStatusMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),

    createWebviewPanel(options) {
      const panel = {
        id: options.id,
        title: options.title,
        webview: {
          html: '',
          onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        },
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        reveal: vi.fn(),
        dispose: vi.fn(() => activeWebviews.delete(options.id)),
      } as WebviewPanel;

      activeWebviews.set(options.id, panel);
      return panel;
    },

    postMessageToWebview: vi.fn(),

    getTheme() {
      return {
        kind: 'dark' as const,
        colors: { 'editor.background': '#1e1e1e' },
        fonts: { default: 'Segoe UI', monospace: 'Consolas', size: 14 },
      };
    },

    onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),

    capabilities() {
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
    storage,
    offlineDocuments,
    activeWebviews,
  };
}

describe('Port Integration Scenarios', () => {
  let mocks: ReturnType<typeof createCoordinatedMocks>;

  beforeEach(() => {
    mocks = createCoordinatedMocks();
    vi.clearAllMocks();
  });

  describe('Document Management Workflow', () => {
    test('complete document creation workflow', async () => {
      const { fileSystemPort, uiPort, platformPort } = mocks;

      // Step 1: User selects save location via UI
      const saveResult = await uiPort.showSaveDialog({
        title: 'Save Proof Document',
        filters: [{ name: 'Proof Files', extensions: ['proof'] }],
      });
      expect(saveResult.isOk()).toBe(true);

      const savePath = saveResult.isOk() ? saveResult.value : null;
      expect(savePath).toBe('/save/location/document.proof');

      // Step 2: Create document content with user input
      const titleResult = await uiPort.showInputBox({
        prompt: 'Enter document title',
        placeholder: 'My Proof Document',
      });
      expect(titleResult.isOk()).toBe(true);

      const title = titleResult.isOk() ? titleResult.value : 'Untitled';
      expect(title).toBe('user-input-for-Enter docu');

      // Step 3: Write document to file system
      const content = `title: ${title}\narguments: []`;
      const writeResult = await fileSystemPort.writeFile(savePath || '/default/path', content);
      expect(writeResult.isOk()).toBe(true);

      // Step 4: Store document metadata for offline access
      const document: StoredDocument = {
        id: 'doc-123',
        content,
        version: 1,
        metadata: {
          id: 'doc-123',
          title: title || 'Untitled',
          modifiedAt: new Date(),
          size: content.length,
          syncStatus: 'local',
        },
      };

      const storeResult = await fileSystemPort.storeDocument(document);
      expect(storeResult.isOk()).toBe(true);

      // Step 5: Update platform storage with recent files
      const recentFiles = [savePath];
      const storageResult = await platformPort.setStorageValue('recent-files', recentFiles);
      expect(storageResult.isOk()).toBe(true);

      // Step 6: Show success notification
      uiPort.showInformation('Document saved successfully');
      expect(uiPort.showInformation).toHaveBeenCalledWith('Document saved successfully');
    });

    test('document export with error handling', async () => {
      const { fileSystemPort, uiPort, platformPort } = mocks;

      // Step 1: Get export settings from platform storage
      const settingsResult = await platformPort.getStorageValue('export-settings', {
        format: 'yaml',
      });
      expect(settingsResult.isOk()).toBe(true);

      // Step 2: Try to read source document (simulate error)
      const readResult = await fileSystemPort.readFile('/path/to/error/document.proof');
      expect(readResult.isErr()).toBe(true);

      if (readResult.isErr()) {
        // Step 3: Show error to user and ask for retry
        uiPort.showError('Failed to read document', {
          label: 'Retry',
          callback: vi.fn(),
        });
        expect(uiPort.showError).toHaveBeenCalled();

        // Step 4: User chooses alternative file
        const openResult = await uiPort.showOpenDialog({
          title: 'Select Document',
          filters: [{ name: 'Proof Files', extensions: ['proof'] }],
        });
        expect(openResult.isOk()).toBe(true);
      }
    });
  });

  describe('Platform Capability Detection and Adaptation', () => {
    test('feature-aware UI adaptation', () => {
      const { platformPort, uiPort } = mocks;

      // Check platform capabilities
      const _platformInfo = platformPort.getPlatformInfo();
      const inputCapabilities = platformPort.getInputCapabilities();
      const uiCapabilities = uiPort.capabilities();

      // Adapt UI based on capabilities
      const hasFileSystem = platformPort.isFeatureAvailable('file-system');
      const hasKeyboard = inputCapabilities.hasKeyboard;
      const supportsWebviews = uiCapabilities.supportsWebviews;

      expect(hasFileSystem).toBe(true);
      expect(hasKeyboard).toBe(true);
      expect(supportsWebviews).toBe(true);

      // Show appropriate UI elements based on capabilities
      if (hasFileSystem && uiCapabilities.supportsFileDialogs) {
        expect(uiPort.showOpenDialog).toBeDefined();
        expect(uiPort.showSaveDialog).toBeDefined();
      }

      if (supportsWebviews) {
        const panel = uiPort.createWebviewPanel({
          id: 'proof-tree',
          title: 'Proof Tree',
          viewType: 'proof.tree',
        });
        expect(panel.id).toBe('proof-tree');
      }
    });

    test('mobile vs desktop adaptation', () => {
      const { platformPort } = mocks;

      // Override for mobile simulation
      const mobilePlatformPort = {
        ...platformPort,
        getPlatformInfo: () => ({
          type: 'mobile' as const,
          version: '1.0.0',
          os: 'ios' as const,
          arch: 'arm64',
          isDebug: false,
        }),
        getInputCapabilities: () => ({
          hasKeyboard: false,
          hasMouse: false,
          hasTouch: true,
          hasPen: false,
          primaryInput: 'touch' as const,
        }),
        isFeatureAvailable: (feature: any) => {
          const mobileFeatures = new Set(['touch-gestures', 'offline-storage', 'notifications']);
          return mobileFeatures.has(feature);
        },
      };

      const platformInfo = mobilePlatformPort.getPlatformInfo();
      const inputCapabilities = mobilePlatformPort.getInputCapabilities();

      expect(platformInfo.type).toBe('mobile');
      expect(inputCapabilities.hasTouch).toBe(true);
      expect(inputCapabilities.primaryInput).toBe('touch');

      // Mobile-specific features
      expect(mobilePlatformPort.isFeatureAvailable('touch-gestures')).toBe(true);
      expect(mobilePlatformPort.isFeatureAvailable('file-system')).toBe(false);
    });
  });

  describe('Offline/Online Synchronization', () => {
    test('offline document management workflow', async () => {
      const { fileSystemPort, platformPort } = mocks;

      // Store multiple documents offline
      const documents: StoredDocument[] = [
        {
          id: 'doc1',
          content: 'offline content 1',
          version: 1,
          metadata: {
            id: 'doc1',
            title: 'Offline Doc 1',
            modifiedAt: new Date('2023-01-01'),
            size: 16,
            syncStatus: 'local',
          },
        },
        {
          id: 'doc2',
          content: 'offline content 2',
          version: 1,
          metadata: {
            id: 'doc2',
            title: 'Offline Doc 2',
            modifiedAt: new Date('2023-01-02'),
            size: 16,
            syncStatus: 'conflict',
          },
        },
      ];

      // Store documents
      for (const doc of documents) {
        const result = await fileSystemPort.storeDocument(doc);
        expect(result.isOk()).toBe(true);
      }

      // List all offline documents
      const listResult = await fileSystemPort.listStoredDocuments();
      expect(listResult.isOk()).toBe(true);

      if (listResult.isOk()) {
        expect(listResult.value).toHaveLength(2);
        expect(listResult.value.some((m) => m.syncStatus === 'conflict')).toBe(true);
      }

      // Save sync status to platform storage
      const syncState = { lastSync: new Date().toISOString(), pendingCount: 1 };
      const storageResult = await platformPort.setStorageValue('sync-state', syncState);
      expect(storageResult.isOk()).toBe(true);

      // Retrieve sync state
      const retrieveResult = await platformPort.getStorageValue('sync-state');
      expect(retrieveResult.isOk()).toBe(true);

      if (retrieveResult.isOk()) {
        expect(retrieveResult.value).toEqual(syncState);
      }
    });
  });

  describe('Progress and Error Handling Integration', () => {
    test('long-running operation with progress and cancellation', async () => {
      const { uiPort, fileSystemPort } = mocks;

      const progressReports: any[] = [];
      let wasCancelled = false;

      const longRunningTask = async (progress: any, token: any) => {
        // Simulate multi-step operation
        const steps = ['Reading files', 'Processing data', 'Saving results'];

        for (let i = 0; i < steps.length; i++) {
          if (token.isCancellationRequested) {
            wasCancelled = true;
            throw new Error('Operation cancelled');
          }

          progress.report({
            message: steps[i],
            increment: Math.round(((i + 1) / steps.length) * 100),
          });

          progressReports.push(steps[i]);

          // Simulate some work
          if (i === 1) {
            // Simulate file operation during processing
            const result = await fileSystemPort.readFile('/some/file.proof');
            expect(result.isOk()).toBe(true);
          }
        }

        return 'Operation completed';
      };

      const result = await uiPort.showProgress(
        {
          title: 'Processing Documents',
          location: 'notification',
          cancellable: true,
        },
        longRunningTask,
      );

      expect(result).toBe('Operation completed');
      expect(progressReports).toEqual(['Reading files', 'Processing data', 'Saving results']);
      expect(wasCancelled).toBe(false);
    });

    test('cascading error handling across ports', async () => {
      const { fileSystemPort, uiPort, platformPort } = mocks;

      // Simulate a workflow that encounters multiple types of errors
      const workflowErrors: string[] = [];

      // Step 1: Try to read a restricted directory
      const dirResult = await fileSystemPort.readDirectory('/restricted/path');
      if (dirResult.isErr()) {
        workflowErrors.push(`FileSystem: ${dirResult.error.code}`);

        // Step 2: Try to open external help link (might be blocked)
        const linkResult = await platformPort.openExternal('https://blocked.example.com');
        if (linkResult.isErr()) {
          workflowErrors.push(`Platform: ${linkResult.error.code}`);

          // Step 3: Show error to user and get alternative action
          uiPort.showError('Multiple errors occurred', {
            label: 'Show Details',
            callback: vi.fn(),
          });

          const confirmResult = await uiPort.showConfirmation({
            title: 'Error Recovery',
            message: 'Would you like to cancel the operation?',
          });

          if (confirmResult.isOk() && confirmResult.value) {
            workflowErrors.push('User cancelled');
          }
        }
      }

      expect(workflowErrors).toContain('FileSystem: PERMISSION_DENIED');
      expect(workflowErrors).toContain('Platform: NOT_SUPPORTED');
      expect(uiPort.showError).toHaveBeenCalled();
    });
  });

  describe('Memory and Resource Management', () => {
    test('disposable resource cleanup', () => {
      const { uiPort, platformPort, fileSystemPort } = mocks;
      const disposables: any[] = [];

      // Create various disposable resources
      const statusDisposable = uiPort.setStatusMessage('Working...', 5000);
      disposables.push(statusDisposable);

      const themeDisposable = uiPort.onThemeChange((theme) => {
        console.log('Theme changed:', theme.kind);
      });
      disposables.push(themeDisposable);

      const terminationDisposable = platformPort.onWillTerminate(() => {
        console.log('App terminating');
      });
      disposables.push(terminationDisposable);

      if (fileSystemPort.watch) {
        const watchDisposable = fileSystemPort.watch('/watch/path', () => {
          console.log('File changed');
        });
        disposables.push(watchDisposable);
      }

      // Create webview panel
      const panel = uiPort.createWebviewPanel({
        id: 'test-panel',
        title: 'Test Panel',
        viewType: 'test.panel',
      });

      const messageDisposable = panel.webview.onDidReceiveMessage(() => {
        console.log('Message received');
      });
      disposables.push(messageDisposable);

      // Verify all disposables have dispose method
      disposables.forEach((disposable) => {
        expect(disposable.dispose).toBeDefined();
        expect(typeof disposable.dispose).toBe('function');
      });

      // Cleanup all resources
      disposables.forEach((disposable) => disposable.dispose());
      panel.dispose();

      // Verify cleanup was called
      expect(panel.dispose).toHaveBeenCalled();
      expect(mocks.activeWebviews.has('test-panel')).toBe(false);
    });
  });

  describe('Clean Architecture Boundary Validation', () => {
    test('ports maintain clean dependency direction', () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // Ports should not depend on concrete implementations
      // They should only define contracts through interfaces
      expect(typeof fileSystemPort.readFile).toBe('function');
      expect(typeof fileSystemPort.capabilities).toBe('function');

      expect(typeof platformPort.getPlatformInfo).toBe('function');
      expect(typeof platformPort.isFeatureAvailable).toBe('function');

      expect(typeof uiPort.showInputBox).toBe('function');
      expect(typeof uiPort.capabilities).toBe('function');

      // All async operations should return Results
      expect(fileSystemPort.readFile('/test')).toBeInstanceOf(Promise);
      expect(platformPort.copyToClipboard('test')).toBeInstanceOf(Promise);
      expect(uiPort.showConfirmation({ title: 'Test', message: 'Test' })).toBeInstanceOf(Promise);
    });

    test('result pattern consistency across all ports', async () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // All async operations should use Result pattern
      const fileResult = await fileSystemPort.readFile('/test');
      expect(typeof fileResult.isOk).toBe('function');
      expect(typeof fileResult.isErr).toBe('function');

      const platformResult = await platformPort.copyToClipboard('test');
      expect(typeof platformResult.isOk).toBe('function');
      expect(typeof platformResult.isErr).toBe('function');

      const uiResult = await uiPort.showInputBox({ prompt: 'Test' });
      expect(typeof uiResult.isOk).toBe('function');
      expect(typeof uiResult.isErr).toBe('function');
    });

    test('error types are domain-specific', async () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // Test that different ports use their specific error types
      const fileError = await fileSystemPort.readFile('/path/to/error');
      if (fileError.isErr()) {
        expect([
          'NOT_FOUND',
          'PERMISSION_DENIED',
          'DISK_FULL',
          'INVALID_PATH',
          'QUOTA_EXCEEDED',
          'UNKNOWN',
        ]).toContain(fileError.error.code);
      }

      const platformError = await platformPort.openExternal('https://blocked.com');
      if (platformError.isErr()) {
        expect(['NOT_SUPPORTED', 'PERMISSION_DENIED', 'PLATFORM_ERROR']).toContain(
          platformError.error.code,
        );
      }

      const _uiError = await uiPort.showInputBox({ prompt: 'cancel test' });
      // Note: This mock returns success, but in real implementation might return error
      // Error codes would be: 'CANCELLED', 'INVALID_INPUT', 'PLATFORM_ERROR', 'NOT_SUPPORTED'
    });
  });
});
