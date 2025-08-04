/**
 * Integration scenario tests for application ports
 *
 * Tests cross-port interactions, complex workflows, and clean architecture boundaries.
 * These tests validate that ports work together correctly in realistic usage scenarios.
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  Architecture,
  FileExtensionList,
  FileName,
  FilePath,
  FileSize,
  PlatformVersion,
} from '../../../domain/shared/value-objects/collections.js';
import {
  DocumentContent,
  DocumentVersion,
  Timestamp,
  Title,
} from '../../../domain/shared/value-objects/content.js';
import { DocumentId, WebviewId } from '../../../domain/shared/value-objects/identifiers.js';
import {
  ActionLabel,
  DialogPrompt,
  DialogTitle,
  Dimensions,
  ErrorCode,
  ErrorMessage,
  FilterName,
  FontFamily,
  FontSize,
  MessageLength,
  NotificationMessage,
  PlaceholderText,
  ViewType,
} from '../../../domain/shared/value-objects/index.js';
import type {
  FileSystemError,
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
    async readFile(path: FilePath) {
      const pathStr = path.getValue();
      if (pathStr.includes('error')) {
        const errorCode = ErrorCode.create('NOT_FOUND');
        const errorMessage = ErrorMessage.create('Test error');
        if (errorCode.isErr() || errorMessage.isErr()) {
          throw new Error('Invalid error values');
        }
        return err({
          code: errorCode.value,
          message: errorMessage.value,
          path,
        } as FileSystemError);
      }
      const content = DocumentContent.create(`content from ${pathStr}`);
      if (content.isErr()) {
        throw new Error(`Invalid content: ${content.error.message}`);
      }
      return ok(content.value);
    },

    async writeFile(path: FilePath, content: DocumentContent) {
      storage.set(path.getValue(), content.getValue());
      return ok(undefined);
    },

    async exists(path: FilePath) {
      const pathStr = path.getValue();
      return ok(storage.has(pathStr) || !pathStr.includes('missing'));
    },

    async delete(path: FilePath) {
      storage.delete(path.getValue());
      return ok(undefined);
    },

    async readDirectory(path: FilePath) {
      const pathStr = path.getValue();
      if (pathStr.includes('restricted')) {
        const errorCode = ErrorCode.create('PERMISSION_DENIED');
        const errorMessage = ErrorMessage.create('Access denied');
        if (errorCode.isErr() || errorMessage.isErr()) {
          throw new Error('Invalid error values');
        }
        return err({ code: errorCode.value, message: errorMessage.value } as FileSystemError);
      }
      const filePath1 = FilePath.create(`${pathStr}/file1.proof`);
      const filePath2 = FilePath.create(`${pathStr}/subdir`);
      const fileName1 = FileName.create('file1.proof');
      const fileName2 = FileName.create('subdir');
      if (filePath1.isErr() || filePath2.isErr() || fileName1.isErr() || fileName2.isErr()) {
        throw new Error('Invalid file paths or names');
      }
      return ok([
        { path: filePath1.value, name: fileName1.value, isDirectory: false },
        { path: filePath2.value, name: fileName2.value, isDirectory: true },
      ]);
    },

    async createDirectory(path: FilePath) {
      storage.set(path.getValue(), 'directory');
      return ok(undefined);
    },

    watch: vi.fn().mockReturnValue({ dispose: vi.fn() }),

    async getStoredDocument(id: DocumentId) {
      const doc = offlineDocuments.get(id.getValue());
      return ok(doc || null);
    },

    async storeDocument(doc: StoredDocument) {
      offlineDocuments.set(doc.id.getValue(), doc);
      return ok(undefined);
    },

    async deleteStoredDocument(id: DocumentId) {
      offlineDocuments.delete(id.getValue());
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
        maxFileSize: FileSize.create(100 * 1024 * 1024).unwrapOr(
          FileSize.create(1)._unsafeUnwrap(),
        ),
      };
    },
  };

  const platformPort: IPlatformPort = {
    getPlatformInfo() {
      return {
        type: 'vscode' as const,
        version: PlatformVersion.create('1.85.0').unwrapOr(
          PlatformVersion.create('1.0.0')._unsafeUnwrap(),
        ),
        os: 'macos' as const,
        arch: Architecture.create('arm64').unwrapOr(Architecture.create('x64')._unsafeUnwrap()),
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
      const dimensionsResult = Dimensions.create(1920, 1080);
      if (dimensionsResult.isErr()) {
        throw new Error('Failed to create dimensions');
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
        const errorCode = ErrorCode.create('NOT_SUPPORTED');
        const errorMessage = ErrorMessage.create('URL blocked');
        if (errorCode.isErr() || errorMessage.isErr()) {
          throw new Error('Invalid error values');
        }
        return err({ code: errorCode.value, message: errorMessage.value } as any);
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
      const promptStr = options.prompt.getValue();
      if (promptStr.includes('cancel')) {
        return ok(null);
      }
      return ok(`user-input-for-${promptStr.slice(0, 10)}`);
    },

    async showQuickPick(items) {
      if (items.length === 0) {
        return ok(null);
      }
      return ok(items[0] || null);
    },

    async showConfirmation(options) {
      const messageStr = options.message.getValue();
      return ok(!messageStr.includes('cancel'));
    },

    async showOpenDialog() {
      const path1 = FilePath.create('/selected/file1.proof');
      const path2 = FilePath.create('/selected/file2.proof');
      if (path1.isErr() || path2.isErr()) {
        throw new Error('Invalid file paths');
      }
      return ok([path1.value.getValue(), path2.value.getValue()]);
    },

    async showSaveDialog() {
      const savePath = FilePath.create('/save/location/document.proof');
      if (savePath.isErr()) {
        throw new Error('Invalid save path');
      }
      return ok({ filePath: savePath.value.getValue(), cancelled: false });
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
        id: options.id.getValue(),
        title: options.title,
        webview: {
          html: '',
          onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        },
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        reveal: vi.fn(),
        dispose: vi.fn(() => activeWebviews.delete(options.id.getValue())),
      } as unknown as WebviewPanel;

      activeWebviews.set(options.id.getValue(), panel);
      return panel;
    },

    postMessageToWebview: vi.fn(),

    getTheme() {
      return {
        kind: 'dark' as const,
        colors: { 'editor.background': '#1e1e1e' },
        fonts: {
          default: FontFamily.create('Segoe UI').unwrapOr(
            FontFamily.create('Arial')._unsafeUnwrap(),
          ),
          monospace: FontFamily.create('Consolas').unwrapOr(
            FontFamily.create('monospace')._unsafeUnwrap(),
          ),
          size: FontSize.create(14).unwrapOr(FontSize.create(12)._unsafeUnwrap()),
        },
      };
    },

    onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),

    async writeFile(_filePath: FilePath, _content: DocumentContent | Buffer) {
      return ok(undefined);
    },

    capabilities() {
      return {
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
        maxMessageLength: MessageLength.create(1000).unwrapOr(
          MessageLength.create(100)._unsafeUnwrap(),
        ),
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
      const titleResult = DialogTitle.create('Save Proof Document');
      const filterNameResult = FilterName.create('Proof Files');
      const extListResult = FileExtensionList.create(['proof']);
      if (titleResult.isErr() || filterNameResult.isErr() || extListResult.isErr()) {
        throw new Error('Invalid dialog values');
      }
      const saveResult = await uiPort.showSaveDialog({
        title: titleResult.value,
        filters: [{ name: filterNameResult.value, extensions: extListResult.value }],
      });
      expect(saveResult.isOk()).toBe(true);

      const savePathString = saveResult.isOk() ? saveResult.value.filePath : null;
      expect(savePathString).toBe('/save/location/document.proof');

      // Step 2: Create document content with user input
      const promptResult = DialogPrompt.create('Enter document title');
      const placeholderResult = PlaceholderText.create('My Proof Document');
      if (promptResult.isErr() || placeholderResult.isErr()) {
        throw new Error('Invalid input box values');
      }
      const titleInputResult = await uiPort.showInputBox({
        prompt: promptResult.value,
        placeholder: placeholderResult.value,
      });
      expect(titleInputResult.isOk()).toBe(true);

      const title = titleInputResult.isOk() ? titleInputResult.value : 'Untitled';
      expect(title).toBe('user-input-for-Enter docu');

      // Step 3: Write document to file system
      const content = `title: ${title}\narguments: []`;
      const contentResult = DocumentContent.create(content);
      if (contentResult.isErr()) {
        throw new Error('Invalid document content');
      }
      const defaultPath = FilePath.create('/default/path');
      if (defaultPath.isErr()) {
        throw new Error('Invalid default path');
      }
      let pathToWrite: FilePath;
      if (savePathString) {
        const pathResult = FilePath.create(savePathString);
        if (pathResult.isErr()) {
          throw new Error('Invalid save path');
        }
        pathToWrite = pathResult.value;
      } else {
        pathToWrite = defaultPath.value;
      }
      const writeResult = await fileSystemPort.writeFile(pathToWrite, contentResult.value);
      expect(writeResult.isOk()).toBe(true);

      // Step 4: Store document metadata for offline access
      const docId = DocumentId.create('doc-123');
      const docTitle = Title.create(title || 'Untitled');
      const docVersion = DocumentVersion.create(1);
      const timestamp = Timestamp.create(Date.now());
      const fileSize = FileSize.create(content.length);

      if (
        docId.isErr() ||
        docTitle.isErr() ||
        docVersion.isErr() ||
        timestamp.isErr() ||
        fileSize.isErr()
      ) {
        throw new Error('Invalid document values');
      }

      const document: StoredDocument = {
        id: docId.value,
        content: contentResult.value,
        version: docVersion.value,
        metadata: {
          id: docId.value,
          title: docTitle.value,
          modifiedAt: timestamp.value,
          size: fileSize.value,
          syncStatus: 'local',
        },
      };

      const storeResult = await fileSystemPort.storeDocument(document);
      expect(storeResult.isOk()).toBe(true);

      // Step 5: Update platform storage with recent files
      const recentFiles = savePathString ? [savePathString] : [];
      const storageResult = await platformPort.setStorageValue('recent-files', recentFiles);
      expect(storageResult.isOk()).toBe(true);

      // Step 6: Show success notification
      const msgResult = NotificationMessage.create('Document saved successfully');
      if (msgResult.isOk()) {
        uiPort.showInformation(msgResult.value);
        expect(uiPort.showInformation).toHaveBeenCalledWith(msgResult.value);
      }
    });

    test('document export with error handling', async () => {
      const { fileSystemPort, uiPort, platformPort } = mocks;

      // Step 1: Get export settings from platform storage
      const settingsResult = await platformPort.getStorageValue('export-settings', {
        format: 'yaml',
      });
      expect(settingsResult.isOk()).toBe(true);

      // Step 2: Try to read source document (simulate error)
      const errorPath = FilePath.create('/path/to/error/document.proof');
      if (errorPath.isErr()) {
        throw new Error('Invalid error path');
      }
      const readResult = await fileSystemPort.readFile(errorPath.value);
      expect(readResult.isErr()).toBe(true);

      if (readResult.isErr()) {
        // Step 3: Show error to user and ask for retry
        const errorResult = NotificationMessage.create('Failed to read document');
        if (errorResult.isOk()) {
          const actionLabel = ActionLabel.create('Retry');
          if (actionLabel.isErr()) {
            throw new Error('Invalid action label');
          }
          uiPort.showError(errorResult.value, {
            label: actionLabel.value,
            callback: vi.fn(),
          });
          expect(uiPort.showError).toHaveBeenCalled();
        }

        // Step 4: User chooses alternative file
        const dialogTitle = DialogTitle.create('Select Document');
        const filterName = FilterName.create('Proof Files');
        const extList = FileExtensionList.create(['proof']);
        if (dialogTitle.isErr() || filterName.isErr() || extList.isErr()) {
          throw new Error('Invalid dialog values');
        }
        const openResult = await uiPort.showOpenDialog({
          title: dialogTitle.value,
          filters: [{ name: filterName.value, extensions: extList.value }],
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
        const webviewId = WebviewId.create('proof-tree');
        const webviewTitle = DialogTitle.create('Proof Tree');
        const viewType = ViewType.create('proofTree');
        if (webviewId.isErr() || webviewTitle.isErr() || viewType.isErr()) {
          throw new Error('Invalid webview values');
        }
        const panel = uiPort.createWebviewPanel({
          id: webviewId.value,
          title: webviewTitle.value,
          viewType: viewType.value,
        });
        expect(panel.id).toBe(webviewId.value.getValue());
      }
    });

    test('mobile vs desktop adaptation', () => {
      const { platformPort } = mocks;

      // Override for mobile simulation
      const mobilePlatformPort = {
        ...platformPort,
        getPlatformInfo: () => ({
          type: 'mobile' as const,
          version: PlatformVersion.create('1.0.0').unwrapOr(
            PlatformVersion.create('0.0.1')._unsafeUnwrap(),
          ),
          os: 'ios' as const,
          arch: Architecture.create('arm64').unwrapOr(Architecture.create('x64')._unsafeUnwrap()),
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
      const docId1Result = DocumentId.create('doc1');
      if (docId1Result.isErr()) {
        throw new Error('Failed to create doc ID 1');
      }
      const docId1 = docId1Result.value;
      const docId2Result = DocumentId.create('doc2');
      if (docId2Result.isErr()) {
        throw new Error('Failed to create doc ID 2');
      }
      const docId2 = docId2Result.value;
      const content1 = DocumentContent.create('offline content 1').unwrapOr(
        DocumentContent.create('')._unsafeUnwrap(),
      );
      const content2 = DocumentContent.create('offline content 2').unwrapOr(
        DocumentContent.create('')._unsafeUnwrap(),
      );
      const version1 = DocumentVersion.create(1).unwrapOr(DocumentVersion.initial());
      const version2 = DocumentVersion.create(1).unwrapOr(DocumentVersion.initial());
      const title1 = Title.create('Offline Doc 1').unwrapOr(
        Title.create('Untitled')._unsafeUnwrap(),
      );
      const title2 = Title.create('Offline Doc 2').unwrapOr(
        Title.create('Untitled')._unsafeUnwrap(),
      );
      const timestamp1 = Timestamp.create(new Date('2023-01-01').getTime()).unwrapOr(
        Timestamp.now(),
      );
      const timestamp2 = Timestamp.create(new Date('2023-01-02').getTime()).unwrapOr(
        Timestamp.now(),
      );
      const size1 = FileSize.create(16).unwrapOr(FileSize.create(1)._unsafeUnwrap());
      const size2 = FileSize.create(16).unwrapOr(FileSize.create(1)._unsafeUnwrap());

      const documents: StoredDocument[] = [
        {
          id: docId1,
          content: content1,
          version: version1,
          metadata: {
            id: docId1,
            title: title1,
            modifiedAt: timestamp1,
            size: size1,
            syncStatus: 'local',
          },
        },
        {
          id: docId2,
          content: content2,
          version: version2,
          metadata: {
            id: docId2,
            title: title2,
            modifiedAt: timestamp2,
            size: size2,
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
            const pathResult = FilePath.create('/some/file.proof');
            if (pathResult.isErr()) {
              throw new Error('Invalid file path');
            }
            const result = await fileSystemPort.readFile(pathResult.value);
            expect(result.isOk()).toBe(true);
          }
        }

        return 'Operation completed';
      };

      const titleResult = DialogTitle.create('Processing Documents');
      if (titleResult.isErr()) {
        throw new Error('Failed to create dialog title');
      }
      const result = await uiPort.showProgress(
        {
          title: titleResult.value,
          location: 'notification' as const,
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
      const restrictedPath = FilePath.create('/restricted/path');
      if (restrictedPath.isErr()) {
        throw new Error('Invalid restricted path');
      }
      const dirResult = await fileSystemPort.readDirectory(restrictedPath.value);
      if (dirResult.isErr()) {
        workflowErrors.push(`FileSystem: ${dirResult.error.code}`);

        // Step 2: Try to open external help link (might be blocked)
        const linkResult = await platformPort.openExternal('https://blocked.example.com');
        if (linkResult.isErr()) {
          workflowErrors.push(`Platform: ${linkResult.error.code}`);

          // Step 3: Show error to user and get alternative action
          const errorResult = NotificationMessage.create('Multiple errors occurred');
          if (errorResult.isOk()) {
            const actionLabelResult = ActionLabel.create('Show Details');
            if (actionLabelResult.isErr()) {
              throw new Error('Failed to create action label');
            }
            uiPort.showError(errorResult.value, {
              label: actionLabelResult.value,
              callback: vi.fn(),
            });
          }

          const confirmTitle = DialogTitle.create('Error Recovery').unwrapOr(
            DialogTitle.create('Error')._unsafeUnwrap(),
          );
          const confirmMessage = ErrorMessage.create(
            'Would you like to cancel the operation?',
          ).unwrapOr(ErrorMessage.create('Cancel?')._unsafeUnwrap());
          const confirmResult = await uiPort.showConfirmation({
            title: confirmTitle,
            message: confirmMessage,
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
        const watchPath = FilePath.create('/watch/path');
        if (watchPath.isErr()) {
          throw new Error('Invalid watch path');
        }
        const watchDisposable = fileSystemPort.watch(watchPath.value, () => {
          console.log('File changed');
        });
        disposables.push(watchDisposable);
      }

      // Create webview panel
      const webviewIdResult = WebviewId.create('test-panel');
      if (webviewIdResult.isErr()) {
        throw new Error('Failed to create webview ID');
      }
      const webviewId = webviewIdResult.value;
      const webviewTitle = DialogTitle.create('Test Panel').unwrapOr(
        DialogTitle.create('Panel')._unsafeUnwrap(),
      );
      const viewType = ViewType.create('test.panel').unwrapOr(
        ViewType.create('panel')._unsafeUnwrap(),
      );
      const panel = uiPort.createWebviewPanel({
        id: webviewId,
        title: webviewTitle,
        viewType: viewType,
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
      const testPath = FilePath.create('/test').unwrapOr(FilePath.create('/tmp')._unsafeUnwrap());
      const testTitle = DialogTitle.create('Test').unwrapOr(
        DialogTitle.create('Title')._unsafeUnwrap(),
      );
      const testMessage = ErrorMessage.create('Test').unwrapOr(
        ErrorMessage.create('Message')._unsafeUnwrap(),
      );
      expect(fileSystemPort.readFile(testPath)).toBeInstanceOf(Promise);
      expect(platformPort.copyToClipboard('test')).toBeInstanceOf(Promise);
      expect(uiPort.showConfirmation({ title: testTitle, message: testMessage })).toBeInstanceOf(
        Promise,
      );
    });

    test('result pattern consistency across all ports', async () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // All async operations should use Result pattern
      const testFilePath = FilePath.create('/test').unwrapOr(
        FilePath.create('/tmp')._unsafeUnwrap(),
      );
      const fileResult = await fileSystemPort.readFile(testFilePath);
      expect(typeof fileResult.isOk).toBe('function');
      expect(typeof fileResult.isErr).toBe('function');

      const platformResult = await platformPort.copyToClipboard('test');
      expect(typeof platformResult.isOk).toBe('function');
      expect(typeof platformResult.isErr).toBe('function');

      const testPrompt = DialogPrompt.create('Test').unwrapOr(
        DialogPrompt.create('Prompt')._unsafeUnwrap(),
      );
      const uiResult = await uiPort.showInputBox({ prompt: testPrompt });
      expect(typeof uiResult.isOk).toBe('function');
      expect(typeof uiResult.isErr).toBe('function');
    });

    test('error types are domain-specific', async () => {
      const { fileSystemPort, platformPort, uiPort } = mocks;

      // Test that different ports use their specific error types
      const errorPath = FilePath.create('/path/to/error').unwrapOr(
        FilePath.create('/error')._unsafeUnwrap(),
      );
      const fileError = await fileSystemPort.readFile(errorPath);
      if (fileError.isErr()) {
        expect([
          'NOT_FOUND',
          'PERMISSION_DENIED',
          'DISK_FULL',
          'INVALID_PATH',
          'QUOTA_EXCEEDED',
          'UNKNOWN',
        ]).toContain(fileError.error.code.getValue());
      }

      const platformError = await platformPort.openExternal('https://blocked.com');
      if (platformError.isErr()) {
        expect(['NOT_SUPPORTED', 'PERMISSION_DENIED', 'PLATFORM_ERROR']).toContain(
          platformError.error.code.getValue(),
        );
      }

      const cancelPrompt = DialogPrompt.create('cancel test').unwrapOr(
        DialogPrompt.create('cancel')._unsafeUnwrap(),
      );
      const _uiError = await uiPort.showInputBox({ prompt: cancelPrompt });
      // Note: This mock returns success, but in real implementation might return error
      // Error codes would be: 'CANCELLED', 'INVALID_INPUT', 'PLATFORM_ERROR', 'NOT_SUPPORTED'
    });
  });
});
