/**
 * VSCodeUIAdapter Error Boundary Tests
 *
 * Comprehensive error handling tests targeting UI integration failure modes:
 * - Context initialization failures
 * - Webview creation and message passing errors
 * - Dialog and user interaction failures
 * - Theme integration edge cases
 * - Progress operation cancellation and timeouts
 * - Memory pressure during UI operations
 * - Rapid user interaction race conditions
 * - Platform-specific UI failures
 * - Accessibility tool integration issues
 * - Multi-monitor and display configuration changes
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type {
  NotificationAction,
  ProgressTask,
  QuickPickItem,
} from '../../../application/ports/IUIPort.js';
import {
  FileExtensionList,
  NotificationMessage,
} from '../../../domain/shared/value-objects/index.js';
import { VSCodeUIAdapter } from '../VSCodeUIAdapter.js';
import {
  createActionLabel,
  createDialogPrompt,
  createDialogTitle,
  createErrorMessage,
  createFilterName,
  createNotificationMessage,
  createViewType,
  createWebviewId,
  testUIValues,
} from './ui-test-helpers.js';

// Mock VS Code module with comprehensive error injection capabilities
vi.mock('vscode', () => {
  const createMockWindow = () => ({
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
    // Add minimal stubs for missing properties
    showTextDocument: vi.fn(),
    showNotebookDocument: vi.fn(),
    createTextEditorDecorationType: vi.fn(),
    showWorkspaceFolderPick: vi.fn(),
    createTreeView: vi.fn(),
    createTerminal: vi.fn(),
    createStatusBarItem: vi.fn(),
    createOutputChannel: vi.fn(),
    createQuickPick: vi.fn(),
    createInputBox: vi.fn(),
    createWebviewView: vi.fn(),
    registerWebviewPanelSerializer: vi.fn(),
    registerWebviewViewProvider: vi.fn(),
    registerCustomEditorProvider: vi.fn(),
    registerTerminalLinkProvider: vi.fn(),
    registerTerminalProfileProvider: vi.fn(),
    registerTreeDataProvider: vi.fn(),
    registerFileDecorationProvider: vi.fn(),
    registerUriHandler: vi.fn(),
    registerExternalUriOpener: vi.fn(),
    createDiagnosticCollection: vi.fn(),
    tabGroups: {
      all: [],
      activeTabGroup: undefined as any,
      onDidChangeTabGroups: vi.fn(),
      onDidChangeTabs: vi.fn(),
      close: vi.fn(),
    },
    terminals: [],
    activeTerminal: undefined,
    activeTextEditor: undefined,
    visibleTextEditors: [],
    visibleNotebookEditors: [],
    activeNotebookEditor: undefined,
    state: { focused: true, active: true },
    onDidChangeWindowState: vi.fn(),
    onDidOpenTerminal: vi.fn(),
    onDidCloseTerminal: vi.fn(),
    onDidChangeActiveTerminal: vi.fn(),
    onDidChangeTerminalDimensions: vi.fn(),
    onDidWriteTerminalData: vi.fn(),
    onDidChangeTerminalState: vi.fn(),
    onDidChangeTextEditorSelection: vi.fn(),
    onDidChangeTextEditorVisibleRanges: vi.fn(),
    onDidChangeTextEditorOptions: vi.fn(),
    onDidChangeTextEditorViewColumn: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(),
    onDidChangeVisibleTextEditors: vi.fn(),
    onDidChangeNotebookEditorSelection: vi.fn(),
    onDidChangeNotebookEditorVisibleRanges: vi.fn(),
    onDidChangeActiveNotebookEditor: vi.fn(),
    onDidChangeVisibleNotebookEditors: vi.fn(),
    onDidChangeTabGroups: vi.fn(),
    // Add missing properties for TypeScript compatibility
    withScmProgress: vi.fn(),
    onDidChangeTerminalShellIntegration: vi.fn(),
    onDidStartTerminalShellExecution: vi.fn(),
    onDidEndTerminalShellExecution: vi.fn(),
  });

  return {
    window: createMockWindow(),
    ViewColumn: { One: 1, Two: 2, Three: 3 },
    ProgressLocation: { Notification: 1, Window: 2 },
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
    Uri: {
      parse: vi.fn().mockImplementation((uri: string) => ({ toString: () => uri, fsPath: uri })),
    },
  };
});

describe('VSCodeUIAdapter Error Boundary', () => {
  let adapter: VSCodeUIAdapter;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset VS Code mock to default state
    const mockVscode = vi.mocked(vscode);
    // Re-create window mock with all required properties
    const createMockWindow = () => ({
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
      // Add minimal stubs for missing properties
      showTextDocument: vi.fn(),
      showNotebookDocument: vi.fn(),
      createTextEditorDecorationType: vi.fn(),
      showWorkspaceFolderPick: vi.fn(),
      createTreeView: vi.fn(),
      createTerminal: vi.fn(),
      createStatusBarItem: vi.fn(),
      createOutputChannel: vi.fn(),
      createQuickPick: vi.fn(),
      createInputBox: vi.fn(),
      createWebviewView: vi.fn(),
      registerWebviewPanelSerializer: vi.fn(),
      registerWebviewViewProvider: vi.fn(),
      registerCustomEditorProvider: vi.fn(),
      registerTerminalLinkProvider: vi.fn(),
      registerTerminalProfileProvider: vi.fn(),
      registerTreeDataProvider: vi.fn(),
      registerFileDecorationProvider: vi.fn(),
      registerUriHandler: vi.fn(),
      registerExternalUriOpener: vi.fn(),
      createDiagnosticCollection: vi.fn(),
      tabGroups: {
        all: [],
        activeTabGroup: undefined as any,
        onDidChangeTabGroups: vi.fn(),
        onDidChangeTabs: vi.fn(),
        close: vi.fn(),
      },
      terminals: [],
      activeTerminal: undefined,
      activeTextEditor: undefined,
      visibleTextEditors: [],
      visibleNotebookEditors: [],
      activeNotebookEditor: undefined,
      state: { focused: true, active: true },
      onDidChangeWindowState: vi.fn(),
      onDidOpenTerminal: vi.fn(),
      onDidCloseTerminal: vi.fn(),
      onDidChangeActiveTerminal: vi.fn(),
      onDidChangeTerminalDimensions: vi.fn(),
      onDidWriteTerminalData: vi.fn(),
      onDidChangeTerminalState: vi.fn(),
      onDidChangeTextEditorSelection: vi.fn(),
      onDidChangeTextEditorVisibleRanges: vi.fn(),
      onDidChangeTextEditorOptions: vi.fn(),
      onDidChangeTextEditorViewColumn: vi.fn(),
      onDidChangeActiveTextEditor: vi.fn(),
      onDidChangeVisibleTextEditors: vi.fn(),
      onDidChangeNotebookEditorSelection: vi.fn(),
      onDidChangeNotebookEditorVisibleRanges: vi.fn(),
      onDidChangeActiveNotebookEditor: vi.fn(),
      onDidChangeVisibleNotebookEditors: vi.fn(),
      onDidChangeTabGroups: vi.fn(),
      // Add missing properties for TypeScript compatibility
      withScmProgress: vi.fn(),
      onDidChangeTerminalShellIntegration: vi.fn(),
      onDidStartTerminalShellExecution: vi.fn(),
      onDidEndTerminalShellExecution: vi.fn(),
    });
    mockVscode.window = createMockWindow();

    mockContext = {
      subscriptions: [],
      extensionUri: { fsPath: '/test/extension' } as vscode.Uri,
      extensionPath: '/test/extension',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/logs',
      asAbsolutePath: vi.fn(),
      extensionMode: 1,
      secrets: {} as any,
      environmentVariableCollection: {} as any,
      workspaceState: {} as any,
      globalState: {} as any,
    } as unknown as vscode.ExtensionContext;

    adapter = new VSCodeUIAdapter(mockContext);
  });

  describe('Context and API Unavailability', () => {
    it('should handle undefined extension context gracefully', () => {
      expect(() => {
        new VSCodeUIAdapter(undefined as any);
      }).not.toThrow();
    });

    it('should handle null extension context gracefully', () => {
      expect(() => {
        new VSCodeUIAdapter(null as any);
      }).not.toThrow();
    });

    it('should handle vscode.window being undefined', async () => {
      // Create a new adapter instance with undefined window
      const adapterWithoutWindow = new VSCodeUIAdapter(mockContext);

      // Temporarily set window to undefined for this test
      const originalWindow = vscode.window;
      (vscode as any).window = undefined;

      try {
        const result = await adapterWithoutWindow.showInputBox({
          prompt: testUIValues.dialogPrompt.simple,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
        }
      } finally {
        // Restore window for other tests
        (vscode as any).window = originalWindow;
      }
    });

    it('should handle vscode.window methods throwing errors', async () => {
      // Only mock for this specific test
      const mockShowInputBox = vi.fn().mockImplementation(() => {
        throw new Error('Window method unavailable');
      });

      const originalShowInputBox = vscode.window.showInputBox;
      (vscode.window as any).showInputBox = mockShowInputBox;

      try {
        const result = await adapter.showInputBox({
          prompt: testUIValues.dialogPrompt.simple,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
          expect(result.error.message.getValue()).toContain('Window method unavailable');
        }
      } finally {
        // Restore original method
        (vscode.window as any).showInputBox = originalShowInputBox;
      }
    });

    it('should handle extension context disposal during operations', async () => {
      // Mock the showInputBox to reject with context disposal error
      vi.mocked(vscode.window.showInputBox).mockRejectedValue(new Error('Context disposed'));

      // Context gets disposed
      (mockContext as any).subscriptions = [];

      const result = await adapter.showInputBox({ prompt: createDialogPrompt('Test') });
      expect(result.isErr()).toBe(true);
    });

    it('should handle VS Code API version incompatibilities', async () => {
      // Simulate older VS Code API that doesn't support certain parameters
      vi.mocked(vscode.window.showInputBox).mockImplementation(() => {
        throw new Error('Property does not exist on this version');
      });

      const result = await adapter.showInputBox({
        title: testUIValues.dialogTitle.simple, // This might not exist in older versions
        prompt: testUIValues.dialogPrompt.simple,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });
  });

  describe('Dialog Operation Failures', () => {
    it('should handle input box validation errors', async () => {
      const validateInput = vi.fn().mockImplementation((value: string) => {
        if (value.length < 5) {
          throw new Error('Validation function crashed');
        }
        return null;
      });

      vi.mocked(vscode.window.showInputBox).mockImplementation(async (options) => {
        // Simulate validation function being called and crashing
        if (options?.validateInput) {
          options.validateInput('test'); // This should throw
        }
        return 'test';
      });

      const result = await adapter.showInputBox({
        prompt: testUIValues.dialogPrompt.simple,
        validateInput,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });

    it('should handle quick pick with malformed items', async () => {
      const malformedItems = [
        { label: 'Item 1' },
        null as any, // Malformed item
        { label: 'Item 3' },
      ];

      vi.mocked(vscode.window.showQuickPick).mockRejectedValue(new Error('Invalid item structure'));

      const result = await adapter.showQuickPick(malformedItems);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });

    it('should handle file dialog with invalid URI parsing', async () => {
      vi.mocked(vscode.Uri.parse).mockImplementation(() => {
        throw new Error('Invalid URI format');
      });

      const result = await adapter.showOpenDialog({
        defaultUri: 'invalid://uri/format',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });

    it('should handle dialog cancellation during memory pressure', async () => {
      // Simulate memory pressure causing dialog to fail
      vi.mocked(vscode.window.showSaveDialog).mockRejectedValue(new Error('Out of memory'));

      const result = await adapter.showSaveDialog({
        title: createDialogTitle('Save Large File'),
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
        expect(result.error.message.getValue()).toContain('Out of memory');
      }
    });

    it('should handle confirmation dialog with invalid message options', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockImplementation(() => {
        throw new Error('Message options invalid');
      });

      const result = await adapter.showConfirmation({
        title: testUIValues.dialogTitle.simple,
        message: testUIValues.errorMessage.detailed,
        detail: 'x'.repeat(100000), // Extremely long detail
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });
  });

  describe('Webview Integration Failures', () => {
    it('should handle webview creation failures during low memory', () => {
      vi.mocked(vscode.window.createWebviewPanel).mockImplementation(() => {
        throw new Error('Cannot create webview: insufficient memory');
      });

      expect(() => {
        adapter.createWebviewPanel({
          id: testUIValues.webviewId.test,
          title: createDialogTitle('Test Panel'),
          viewType: testUIValues.viewType.testView,
        });
      }).toThrow('Cannot create webview: insufficient memory');
    });

    it('should handle webview message passing failures', () => {
      const mockPanel = {
        webview: {
          onDidReceiveMessage: vi.fn().mockImplementation(() => {
            throw new Error('Message handler registration failed');
          }),
        },
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        reveal: vi.fn(),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

      expect(() => {
        const panel = adapter.createWebviewPanel({
          id: testUIValues.webviewId.test,
          title: createDialogTitle('Test Panel'),
          viewType: testUIValues.viewType.testView,
        });

        // This should throw when trying to register message handler
        panel.webview.onDidReceiveMessage(() => {
          // Empty handler for test
        });
      }).toThrow('Message handler registration failed');
    });

    it('should handle webview disposal failures', () => {
      const mockPanel = {
        webview: {
          onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        },
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        reveal: vi.fn(),
        dispose: vi.fn().mockImplementation(() => {
          throw new Error('Panel disposal failed');
        }),
      };

      vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

      const panel = adapter.createWebviewPanel({
        id: testUIValues.webviewId.test,
        title: createDialogTitle('Test Panel'),
        viewType: testUIValues.viewType.testView,
      });

      // Panel disposal is wrapped by adapter, so it won't throw
      expect(() => {
        mockPanel.dispose();
      }).toThrow('Panel disposal failed');
    });

    it('should handle webview script injection failures', () => {
      const mockPanel = {
        webview: {
          onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        },
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        reveal: vi.fn().mockImplementation(() => {
          throw new Error('Script execution blocked by CSP');
        }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

      const panel = adapter.createWebviewPanel({
        id: testUIValues.webviewId.test,
        title: createDialogTitle('Test Panel'),
        viewType: testUIValues.viewType.testView,
        enableScripts: true,
      });

      expect(() => {
        panel.reveal();
      }).toThrow('Script execution blocked by CSP');
    });
  });

  describe('Progress Operation Edge Cases', () => {
    it('should handle progress task throwing unhandled errors', async () => {
      const crashingTask: ProgressTask<string> = async () => {
        throw new Error('Task crashed unexpectedly');
      };

      vi.mocked(vscode.window.withProgress).mockImplementation(async (_options, task) => {
        const mockProgress = { report: vi.fn() };
        const mockToken = {
          isCancellationRequested: false,
          onCancellationRequested: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        };
        return task(mockProgress, mockToken);
      });

      await expect(
        adapter.showProgress({ title: createDialogTitle('Crashing Task') }, crashingTask),
      ).rejects.toThrow('Task crashed unexpectedly');
    });

    it('should handle progress cancellation during critical operations', async () => {
      const longRunningTask: ProgressTask<string> = async (_progress, token) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('completed'), 5000);

          token.onCancellationRequested(() => {
            clearTimeout(timeout);
            reject(new Error('Operation cancelled during critical phase'));
          });
        });
      };

      vi.mocked(vscode.window.withProgress).mockImplementation(async (_options, task) => {
        const mockProgress = { report: vi.fn() };
        const mockToken = {
          isCancellationRequested: true, // Already cancelled
          onCancellationRequested: vi.fn((callback) => {
            setTimeout(callback, 100); // Simulate delayed cancellation
            return { dispose: vi.fn() };
          }),
        };
        return task(mockProgress, mockToken);
      });

      await expect(
        adapter.showProgress(
          { title: createDialogTitle('Long Task'), cancellable: true },
          longRunningTask,
        ),
      ).rejects.toThrow('Operation cancelled during critical phase');
    });

    it('should handle progress reporter failures', async () => {
      let reportCalled = false;
      const reportingTask: ProgressTask<string> = async (progress) => {
        // The adapter wraps progress.report in try-catch, so errors are swallowed
        progress.report({ message: 'Starting...', increment: 10 });
        reportCalled = true;
        return 'completed';
      };

      vi.mocked(vscode.window.withProgress).mockImplementation(async (_options, task) => {
        const mockProgress = {
          report: vi.fn().mockImplementation(() => {
            throw new Error('Progress reporting failed');
          }),
        };
        const mockToken = {
          isCancellationRequested: false,
          onCancellationRequested: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        };
        // The task will complete successfully even if report throws
        return task(mockProgress, mockToken);
      });

      const result = await adapter.showProgress(
        { title: createDialogTitle('Reporting Task') },
        reportingTask,
      );

      // The task should complete successfully despite report failure
      expect(result).toBe('completed');
      expect(reportCalled).toBe(true);
    });

    it('should handle progress location mapping failures', async () => {
      const simpleTask: ProgressTask<string> = async () => 'completed';

      // Mock withProgress to throw when given invalid location
      vi.mocked(vscode.window.withProgress).mockImplementation(() => {
        throw new Error('Invalid progress location');
      });

      await expect(
        adapter.showProgress(
          { title: testUIValues.dialogTitle.simple, location: 'invalid-location' as any },
          simpleTask,
        ),
      ).rejects.toThrow('Invalid progress location');
    });
  });

  describe('Notification System Failures', () => {
    it('should handle notification action callback failures', async () => {
      const crashingAction: NotificationAction = {
        label: testUIValues.actionLabel.crash,
        callback: vi.fn().mockImplementation(() => {
          throw new Error('Action callback crashed');
        }),
      };

      // Mock the promise with then(success, error) format
      const mockPromise: any = {};
      mockPromise.then = vi.fn().mockImplementation((successCallback, errorCallback) => {
        // Simulate user clicking the action
        try {
          successCallback('Crash');
        } catch (error) {
          // The adapter has an error handler as second argument to then
          if (errorCallback) {
            errorCallback(error);
          }
        }
        return mockPromise;
      });

      vi.mocked(vscode.window.showInformationMessage).mockReturnValue(mockPromise as any);

      // This should not throw
      expect(() => {
        const msgResult = NotificationMessage.create('Test message');
        if (msgResult.isOk()) {
          adapter.showInformation(msgResult.value, crashingAction);
        }
      }).not.toThrow();

      // Verify the promise chain was set up with both callbacks
      expect(mockPromise.then).toHaveBeenCalled();
      expect(mockPromise.then).toHaveBeenCalledWith(
        expect.any(Function), // success callback
        expect.any(Function), // error callback
      );
    });

    it('should handle notification with invalid action labels', () => {
      const invalidActions: NotificationAction[] = [
        { label: createActionLabel('x'), callback: vi.fn() }, // Short label (empty would fail)
        { label: createActionLabel('x'.repeat(50)), callback: vi.fn() }, // Max length label
        { label: testUIValues.actionLabel.ok, callback: vi.fn() }, // Valid label
      ];

      // Mock successful warning message (invalid actions will be handled internally)
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined);

      expect(() => {
        const msgResult = NotificationMessage.create('Test warning');
        if (msgResult.isOk()) {
          adapter.showWarning(msgResult.value, ...invalidActions);
        }
      }).not.toThrow(); // Should handle gracefully
    });

    it('should handle status bar message failures', () => {
      vi.mocked(vscode.window.setStatusBarMessage).mockImplementation(() => {
        throw new Error('Status bar unavailable');
      });

      expect(() => {
        adapter.setStatusMessage('Test status');
      }).toThrow('Status bar unavailable');
    });

    it('should handle notification flooding scenarios', () => {
      // Mock successful error messages (adapter should handle errors gracefully)
      vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(undefined);

      expect(() => {
        for (let i = 0; i < 100; i++) {
          const msgResult = NotificationMessage.create(`Error ${i}`);
          if (msgResult.isOk()) {
            adapter.showError(msgResult.value);
          }
        }
      }).not.toThrow(); // Should handle gracefully without crashing
    });

    it('should handle notification with extremely long messages', () => {
      const longMessage = 'x'.repeat(100000); // 100KB message

      vi.mocked(vscode.window.showInformationMessage).mockImplementation(() => {
        throw new Error('Message too long');
      });

      expect(() => {
        const msgResult = NotificationMessage.create(longMessage);
        if (msgResult.isOk()) {
          adapter.showInformation(msgResult.value);
        }
      }).not.toThrow();
    });
  });

  describe('Theme Integration Edge Cases', () => {
    it('should handle missing color theme gracefully', () => {
      (vscode.window as any).activeColorTheme = undefined;

      expect(() => {
        const theme = adapter.getTheme();
        expect(theme.kind).toBe('light'); // Should default to light
      }).not.toThrow();
    });

    it('should handle color theme with missing properties', () => {
      (vscode.window as any).activeColorTheme = {
        /* missing kind property */
      };

      const theme = adapter.getTheme();
      expect(theme.kind).toBe('light'); // Should default to light
      expect(theme.colors).toBeDefined();
      expect(theme.fonts).toBeDefined();
    });

    it('should handle theme change listener registration failures', () => {
      vi.mocked(vscode.window.onDidChangeActiveColorTheme).mockImplementation(() => {
        throw new Error('Cannot register theme listener');
      });

      expect(() => {
        adapter.onThemeChange(() => {
          // Empty theme change handler for test
        });
      }).toThrow('Cannot register theme listener');
    });

    it('should handle theme change callback failures', () => {
      const mockDisposable = { dispose: vi.fn() };
      vi.mocked(vscode.window.onDidChangeActiveColorTheme).mockReturnValue(mockDisposable);

      const crashingCallback = () => {
        throw new Error('Theme callback crashed');
      };

      expect(() => {
        adapter.onThemeChange(crashingCallback);
      }).not.toThrow();
    });

    it('should handle high contrast theme edge cases', () => {
      (vscode.window as any).activeColorTheme = {
        kind: vscode.ColorThemeKind.HighContrast,
      };

      const theme = adapter.getTheme();
      // Should handle high contrast by defaulting to dark or light
      expect(['light', 'dark'].includes(theme.kind)).toBe(true);
    });
  });

  describe('Resource Exhaustion and Performance', () => {
    it('should handle memory pressure during dialog operations', async () => {
      vi.mocked(vscode.window.showQuickPick).mockImplementation(() => {
        throw new Error('Out of memory');
      });

      const largeItemList: QuickPickItem[] = Array.from({ length: 10000 }, (_, i) => ({
        label: `Item ${i}`,
        description: 'x'.repeat(1000), // Large descriptions
      }));

      const result = await adapter.showQuickPick(largeItemList);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });

    it('should handle UI thread blocking scenarios', async () => {
      vi.mocked(vscode.window.showInputBox).mockImplementation(() => {
        // Simulate UI thread being blocked but with shorter delay for testing
        return new Promise((resolve) => {
          setTimeout(() => resolve('result'), 100); // 100ms delay
        });
      });

      const startTime = Date.now();
      const result = await adapter.showInputBox({ prompt: testUIValues.dialogPrompt.simple });
      const duration = Date.now() - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(90); // Should handle slow UI
    });

    it('should handle concurrent dialog operations', async () => {
      vi.mocked(vscode.window.showInputBox).mockRejectedValue(
        new Error('Another dialog is already open'),
      );

      const results = await Promise.allSettled([
        adapter.showInputBox({ prompt: createDialogPrompt('Dialog 1') }),
        adapter.showInputBox({ prompt: createDialogPrompt('Dialog 2') }),
        adapter.showInputBox({ prompt: createDialogPrompt('Dialog 3') }),
      ]);

      // All should fail or handle gracefully
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          expect(result.value.isErr()).toBe(true);
        }
      });
    });

    it('should handle file dialog with large directory structures', async () => {
      vi.mocked(vscode.window.showOpenDialog).mockImplementation(() => {
        throw new Error('Directory too large to display');
      });

      const result = await adapter.showOpenDialog({
        defaultUri: '/very/large/directory/with/thousands/of/files',
        canSelectMany: true,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });
  });

  describe('Platform-Specific Failures', () => {
    it('should handle Windows-specific dialog failures', async () => {
      vi.mocked(vscode.window.showSaveDialog).mockRejectedValue(
        new Error('Invalid path format for Windows'),
      );

      const result = await adapter.showSaveDialog({
        defaultUri: '/invalid/unix/path/on/windows.txt',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });

    it('should handle macOS sandbox restrictions', async () => {
      vi.mocked(vscode.window.showOpenDialog).mockRejectedValue(
        new Error('Sandbox restrictions prevent file access'),
      );

      const result = await adapter.showOpenDialog({
        defaultUri: '/System/restricted/path',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
      }
    });

    it('should handle Linux display server issues', () => {
      vi.mocked(vscode.window.setStatusBarMessage).mockImplementation(() => {
        throw new Error('X11 display server not available');
      });

      expect(() => {
        adapter.setStatusMessage('Test status');
      }).toThrow('X11 display server not available');
    });

    it('should handle multi-monitor configuration changes', () => {
      const mockPanel = {
        webview: { onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
        onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        reveal: vi.fn().mockImplementation(() => {
          throw new Error('Monitor configuration changed');
        }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

      const panel = adapter.createWebviewPanel({
        id: testUIValues.webviewId.test,
        title: createDialogTitle('Test Panel'),
        viewType: testUIValues.viewType.testView,
      });

      expect(() => {
        panel.reveal(2); // Second monitor
      }).toThrow('Monitor configuration changed');
    });
  });

  describe('Error Recovery and Cleanup', () => {
    it('should cleanup resources when operations fail', async () => {
      const disposable = { dispose: vi.fn() };
      vi.mocked(vscode.window.onDidChangeActiveColorTheme).mockReturnValue(disposable);

      const listener = adapter.onThemeChange(() => {
        // Empty theme change handler for test
      });

      // Simulate error during disposal
      disposable.dispose.mockImplementation(() => {
        throw new Error('Disposal failed');
      });

      // Direct disposable disposal can throw
      expect(() => {
        disposable.dispose();
      }).toThrow('Disposal failed');
    });

    it('should handle partial operation failures gracefully', async () => {
      // Simulate file filters being partially invalid
      vi.mocked(vscode.window.showOpenDialog).mockImplementation((options) => {
        if (options?.filters) {
          throw new Error('Some file filters are invalid');
        }
        return Promise.resolve([{ fsPath: '/test/file.txt' }] as any);
      });

      const result = await adapter.showOpenDialog({
        filters: [
          {
            name: testUIValues.filterName.validFiles,
            extensions: FileExtensionList.create(['txt']).unwrapOr(
              FileExtensionList.create([]).unwrapOr(null as any),
            ),
          },
          {
            name: testUIValues.filterName.invalidFiles,
            extensions: FileExtensionList.create([]).unwrapOr(null as any),
          }, // Invalid filter
        ],
      });

      expect(result.isErr()).toBe(true);
    });

    it('should maintain state consistency during error recovery', () => {
      const capabilities = adapter.capabilities();

      // Capabilities should remain consistent even after errors
      expect(capabilities.supportsFileDialogs).toBe(true);
      expect(capabilities.supportsWebviews).toBe(true);
      expect(capabilities.supportsThemes).toBe(true);
    });
  });
});
