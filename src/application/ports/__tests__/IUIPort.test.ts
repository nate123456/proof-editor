import { err, ok, type Result } from 'neverthrow';
import { describe, expect, test, vi } from 'vitest';
import type {
  CancellationToken,
  ConfirmationOptions,
  Disposable,
  FileFilter,
  InputBoxOptions,
  IUIPort,
  NotificationAction,
  OpenDialogOptions,
  Progress,
  ProgressOptions,
  ProgressTask,
  QuickPickItem,
  QuickPickOptions,
  SaveDialogOptions,
  UICapabilities,
  UIError,
  UITheme,
  WebviewMessage,
  WebviewPanel,
  WebviewPanelOptions,
} from '../IUIPort.js';

// Helper function to create a mock IUIPort
function createMockUIPort(): IUIPort {
  return {
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showConfirmation: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    writeFile: vi.fn(),
    showInformation: vi.fn(),
    showWarning: vi.fn(),
    showError: vi.fn(),
    setStatusMessage: vi.fn(),
    showProgress: vi.fn(),
    createWebviewPanel: vi.fn(),
    postMessageToWebview: vi.fn(),
    getTheme: vi.fn(),
    onThemeChange: vi.fn(),
    capabilities: vi.fn(),
  } as IUIPort;
}

describe('IUIPort Interface Contract', () => {
  describe('Dialog Operations', () => {
    test('showInputBox returns Result<string | null, UIError>', async () => {
      const mockPort = createMockUIPort();
      const options: InputBoxOptions = {
        title: 'Test Input',
        prompt: 'Enter a value',
        value: 'default',
        placeholder: 'Type here...',
        password: false,
      };

      const successResult = ok('user input');
      const cancelledResult = ok(null);
      const errorResult = err({
        code: 'INVALID_INPUT',
        message: 'Input validation failed',
      } as UIError);

      vi.mocked(mockPort.showInputBox).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.showInputBox).mockResolvedValueOnce(cancelledResult);
      vi.mocked(mockPort.showInputBox).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.showInputBox(options);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe('user input');
      }

      const result2 = await mockPort.showInputBox(options);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBeNull();
      }

      const result3 = await mockPort.showInputBox(options);
      expect(result3.isErr()).toBe(true);
      if (result3.isErr()) {
        expect(result3.error.code).toBe('INVALID_INPUT');
      }
    });

    test('showInputBox handles validation function', async () => {
      const mockPort = createMockUIPort();
      const optionsWithValidation: InputBoxOptions = {
        prompt: 'Enter email',
        validateInput: (value: string) => {
          if (!value.includes('@')) return 'Must be a valid email';
          return null;
        },
      };

      const validationResult = ok('user@example.com');
      vi.mocked(mockPort.showInputBox).mockResolvedValueOnce(validationResult);

      const result = await mockPort.showInputBox(optionsWithValidation);
      expect(result.isOk()).toBe(true);
      expect(mockPort.showInputBox).toHaveBeenCalledWith(optionsWithValidation);
    });

    test('showQuickPick returns Result<T | null, UIError>', async () => {
      const mockPort = createMockUIPort();
      const items: QuickPickItem[] = [
        { label: 'Option 1', description: 'First option' },
        { label: 'Option 2', description: 'Second option', picked: true },
      ];
      const options: QuickPickOptions = {
        title: 'Select Option',
        placeHolder: 'Choose an option',
        canPickMany: false,
      };

      const successResult = ok(items[0]) as Result<QuickPickItem | null, UIError>;
      const cancelledResult = ok(null) as Result<QuickPickItem | null, UIError>;
      const errorResult = err({
        code: 'CANCELLED',
        message: 'User cancelled',
      } as UIError);

      vi.mocked(mockPort.showQuickPick).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.showQuickPick).mockResolvedValueOnce(cancelledResult);
      vi.mocked(mockPort.showQuickPick).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.showQuickPick(items, options);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value?.label).toBe('Option 1');
      }

      const result2 = await mockPort.showQuickPick(items, options);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBeNull();
      }

      const result3 = await mockPort.showQuickPick(items, options);
      expect(result3.isErr()).toBe(true);
    });

    test('showConfirmation returns Result<boolean, UIError>', async () => {
      const mockPort = createMockUIPort();
      const options: ConfirmationOptions = {
        title: 'Confirm Action',
        message: 'Are you sure?',
        detail: 'This action cannot be undone',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
        isDestructive: true,
      };

      const confirmResult = ok(true);
      const cancelResult = ok(false);
      const errorResult = err({
        code: 'PLATFORM_ERROR',
        message: 'Dialog error',
      } as UIError);

      vi.mocked(mockPort.showConfirmation).mockResolvedValueOnce(confirmResult);
      vi.mocked(mockPort.showConfirmation).mockResolvedValueOnce(cancelResult);
      vi.mocked(mockPort.showConfirmation).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.showConfirmation(options);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe(true);
      }

      const result2 = await mockPort.showConfirmation(options);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(false);
      }

      const result3 = await mockPort.showConfirmation(options);
      expect(result3.isErr()).toBe(true);
    });

    test('showOpenDialog returns Result<string[] | null, UIError>', async () => {
      const mockPort = createMockUIPort();
      const options: OpenDialogOptions = {
        defaultUri: '/home/user',
        filters: [
          { name: 'Proof Files', extensions: ['proof', 'yaml'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        canSelectMany: true,
        canSelectFolders: false,
        canSelectFiles: true,
        title: 'Open Files',
      };

      const successResult = ok(['/path/to/file1.proof', '/path/to/file2.proof']);
      const cancelledResult = ok(null);
      const errorResult = err({
        code: 'NOT_SUPPORTED',
        message: 'File dialogs not supported',
      } as UIError);

      vi.mocked(mockPort.showOpenDialog).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.showOpenDialog).mockResolvedValueOnce(cancelledResult);
      vi.mocked(mockPort.showOpenDialog).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.showOpenDialog(options);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toHaveLength(2);
        expect(result1.value?.[0]).toBe('/path/to/file1.proof');
      }

      const result2 = await mockPort.showOpenDialog(options);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBeNull();
      }

      const result3 = await mockPort.showOpenDialog(options);
      expect(result3.isErr()).toBe(true);
    });

    test('showSaveDialog returns Result<string | null, UIError>', async () => {
      const mockPort = createMockUIPort();
      const options: SaveDialogOptions = {
        defaultUri: '/home/user/document.proof',
        filters: [{ name: 'Proof Files', extensions: ['proof'] }],
        saveLabel: 'Save Proof',
        title: 'Save As',
      };

      const successResult = ok({ filePath: '/path/to/saved/file.proof', cancelled: false });
      const cancelledResult = ok({ filePath: '', cancelled: true });
      const errorResult = err({
        code: 'PLATFORM_ERROR',
        message: 'Cannot save to location',
      } as UIError);

      vi.mocked(mockPort.showSaveDialog).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.showSaveDialog).mockResolvedValueOnce(cancelledResult);
      vi.mocked(mockPort.showSaveDialog).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.showSaveDialog(options);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value.filePath).toBe('/path/to/saved/file.proof');
        expect(result1.value.cancelled).toBe(false);
      }

      const result2 = await mockPort.showSaveDialog(options);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value.cancelled).toBe(true);
      }

      const result3 = await mockPort.showSaveDialog(options);
      expect(result3.isErr()).toBe(true);
    });
  });

  describe('Notification Operations', () => {
    test('showInformation displays information message', () => {
      const mockPort = createMockUIPort();
      const actions: NotificationAction[] = [
        { label: 'OK', callback: vi.fn() },
        { label: 'Cancel', callback: vi.fn() },
      ];

      vi.mocked(mockPort.showInformation).mockReturnValue(undefined);

      mockPort.showInformation('Info message', ...actions);
      expect(mockPort.showInformation).toHaveBeenCalledWith('Info message', ...actions);
    });

    test('showWarning displays warning message', () => {
      const mockPort = createMockUIPort();
      const actions: NotificationAction[] = [{ label: 'Retry', callback: vi.fn() }];

      vi.mocked(mockPort.showWarning).mockReturnValue(undefined);

      mockPort.showWarning('Warning message', ...actions);
      expect(mockPort.showWarning).toHaveBeenCalledWith('Warning message', ...actions);
    });

    test('showError displays error message', () => {
      const mockPort = createMockUIPort();
      const actions: NotificationAction[] = [{ label: 'Report Issue', callback: vi.fn() }];

      vi.mocked(mockPort.showError).mockReturnValue(undefined);

      mockPort.showError('Error message', ...actions);
      expect(mockPort.showError).toHaveBeenCalledWith('Error message', ...actions);
    });

    test('setStatusMessage returns Disposable', () => {
      const mockPort = createMockUIPort();
      const mockDisposable = { dispose: vi.fn() } as Disposable;

      vi.mocked(mockPort.setStatusMessage).mockReturnValue(mockDisposable);

      const disposable = mockPort.setStatusMessage('Status message', 5000);
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeDefined();
      expect(mockPort.setStatusMessage).toHaveBeenCalledWith('Status message', 5000);
    });

    test('showProgress executes task with progress reporting', async () => {
      const mockPort = createMockUIPort();
      const options: ProgressOptions = {
        title: 'Processing...',
        location: 'notification',
        cancellable: true,
      };

      const mockProgress = { report: vi.fn() } as Progress;
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: vi.fn(),
      } as CancellationToken;

      const task: ProgressTask<string> = async (progress, _token) => {
        progress.report({ message: 'Step 1', increment: 25 });
        progress.report({ message: 'Step 2', increment: 50 });
        return 'completed';
      };

      vi.mocked(mockPort.showProgress).mockImplementation(async (_opts, taskFn) => {
        return await taskFn(mockProgress, mockToken);
      });

      const result = await mockPort.showProgress(options, task);
      expect(result).toBe('completed');
      expect(mockPort.showProgress).toHaveBeenCalledWith(options, task);
    });
  });

  describe('Webview Operations', () => {
    test('createWebviewPanel returns WebviewPanel', () => {
      const mockPort = createMockUIPort();
      const options: WebviewPanelOptions = {
        id: 'proof-tree-panel',
        title: 'Proof Tree',
        viewType: 'proof.tree',
        showOptions: {
          viewColumn: 1,
          preserveFocus: false,
        },
        retainContextWhenHidden: true,
        enableScripts: true,
      };

      const mockPanel = {
        id: options.id,
        title: options.title,
        dispose: vi.fn(),
        postMessage: vi.fn(),
        webview: {
          onDidReceiveMessage: vi.fn(),
        },
        onDidDispose: vi.fn(),
        reveal: vi.fn(),
      } as unknown as WebviewPanel;

      vi.mocked(mockPort.createWebviewPanel).mockReturnValue(mockPanel);

      const panel = mockPort.createWebviewPanel(options);
      expect(panel.id).toBe('proof-tree-panel');
      expect(mockPort.createWebviewPanel).toHaveBeenCalledWith(options);
    });

    test('postMessageToWebview sends message to panel', () => {
      const mockPort = createMockUIPort();
      const message: WebviewMessage = {
        type: 'updateTree',
        content: 'tree data',
        extra: 'additional data',
      };

      vi.mocked(mockPort.postMessageToWebview).mockReturnValue(undefined);

      mockPort.postMessageToWebview('panel-id', message);
      expect(mockPort.postMessageToWebview).toHaveBeenCalledWith('panel-id', message);
    });

    test('WebviewPanel provides message handling', () => {
      const mockPanel = {
        id: 'test-panel',
        title: 'Test Panel',
        dispose: vi.fn(),
        postMessage: vi.fn(),
        webview: {
          onDidReceiveMessage: vi.fn(),
        },
      } as unknown as WebviewPanel;
      const mockDisposable = { dispose: vi.fn() } as Disposable;

      vi.mocked(mockPanel.webview.onDidReceiveMessage).mockReturnValue(mockDisposable);

      const messageHandler = (message: WebviewMessage) => {
        console.log('Received:', message);
      };

      const disposable = mockPanel.webview.onDidReceiveMessage(messageHandler);
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeDefined();
    });
  });

  describe('Theme Support', () => {
    test('getTheme returns UITheme', () => {
      const mockPort = createMockUIPort();
      const theme: UITheme = {
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

      vi.mocked(mockPort.getTheme).mockReturnValue(theme);

      const result = mockPort.getTheme();
      expect(result.kind).toBe('dark');
      expect(result.colors['editor.background']).toBe('#1e1e1e');
      expect(result.fonts.monospace).toBe('Consolas');
    });

    test('getTheme handles all theme kinds', () => {
      const mockPort = createMockUIPort();
      const themeKinds: Array<'light' | 'dark' | 'high-contrast'> = [
        'light',
        'dark',
        'high-contrast',
      ];

      themeKinds.forEach((kind) => {
        const theme: UITheme = {
          kind,
          colors: {},
          fonts: { default: 'Arial', monospace: 'Courier', size: 12 },
        };

        vi.mocked(mockPort.getTheme).mockReturnValue(theme);
        const result = mockPort.getTheme();
        expect(result.kind).toBe(kind);
      });
    });

    test('onThemeChange returns Disposable', () => {
      const mockPort = createMockUIPort();
      const mockDisposable = { dispose: vi.fn() } as Disposable;

      vi.mocked(mockPort.onThemeChange).mockReturnValue(mockDisposable);

      const callback = (theme: UITheme) => {
        console.log('Theme changed:', theme.kind);
      };

      const disposable = mockPort.onThemeChange(callback);
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeDefined();
      expect(mockPort.onThemeChange).toHaveBeenCalledWith(callback);
    });
  });

  describe('Platform Capabilities', () => {
    test('capabilities returns UICapabilities', () => {
      const mockPort = createMockUIPort();
      const capabilities: UICapabilities = {
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
        maxMessageLength: 1000,
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(capabilities);

      const result = mockPort.capabilities();
      expect(result.supportsFileDialogs).toBe(true);
      expect(result.supportsNotificationActions).toBe(true);
      expect(result.supportsProgress).toBe(true);
      expect(result.supportsStatusBar).toBe(true);
      expect(result.supportsWebviews).toBe(true);
      expect(result.supportsThemes).toBe(true);
      expect(result.maxMessageLength).toBe(1000);
    });

    test('capabilities handles optional fields', () => {
      const mockPort = createMockUIPort();
      const minimalCapabilities: UICapabilities = {
        supportsFileDialogs: false,
        supportsNotificationActions: false,
        supportsProgress: false,
        supportsStatusBar: false,
        supportsWebviews: false,
        supportsThemes: false,
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(minimalCapabilities);

      const result = mockPort.capabilities();
      expect(result.maxMessageLength).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('UIError has all required error codes', () => {
      const errorCodes = ['CANCELLED', 'INVALID_INPUT', 'PLATFORM_ERROR', 'NOT_SUPPORTED'] as const;

      errorCodes.forEach((code) => {
        const error: UIError = {
          code,
          message: `Test error: ${code}`,
        };

        expect(error.code).toBe(code);
        expect(error.message).toBeDefined();
      });
    });

    test('UIError message is always required', () => {
      const error: UIError = {
        code: 'CANCELLED',
        message: 'Operation was cancelled by user',
      };

      expect(error.message).toBe('Operation was cancelled by user');
    });
  });

  describe('Type Safety and Structure', () => {
    test('InputBoxOptions structure is well-typed', () => {
      const options: InputBoxOptions = {
        title: 'Test Title',
        prompt: 'Enter value',
        value: 'default value',
        placeholder: 'placeholder text',
        password: true,
        validateInput: (value: string) => (value.length > 0 ? null : 'Required'),
      };

      expect(options.title).toBe('Test Title');
      expect(options.password).toBe(true);
      expect(options.validateInput).toBeDefined();
    });

    test('QuickPickItem handles optional fields', () => {
      const minimal: QuickPickItem = {
        label: 'Option 1',
      };

      const full: QuickPickItem = {
        label: 'Option 2',
        description: 'Second option',
        detail: 'Detailed description',
        picked: true,
      };

      expect(minimal.description).toBeUndefined();
      expect(full.picked).toBe(true);
    });

    test('FileFilter structure is well-typed', () => {
      const filter: FileFilter = {
        name: 'Proof Files',
        extensions: ['proof', 'yaml', 'yml'],
      };

      expect(filter.name).toBe('Proof Files');
      expect(filter.extensions).toContain('proof');
    });

    test('ProgressReport structure is well-typed', () => {
      const report = {
        message: 'Processing step 1',
        increment: 25,
      };

      expect(report.message).toBe('Processing step 1');
      expect(report.increment).toBe(25);
    });

    test('WebviewMessage supports arbitrary properties', () => {
      const message: WebviewMessage = {
        type: 'custom',
        content: 'some content',
        customProperty: 'custom value',
        nested: { data: 'nested data' },
      };

      expect(message.type).toBe('custom');
      expect(message.customProperty).toBe('custom value');
      expect((message.nested as any).data).toBe('nested data');
    });

    test('CancellationToken provides cancellation support', () => {
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: vi.fn(),
      } as CancellationToken;
      const mockDisposable = { dispose: vi.fn() } as Disposable;

      vi.mocked(mockToken.onCancellationRequested).mockReturnValue(mockDisposable);

      const listener = () => console.log('Cancelled');
      const disposable = mockToken.onCancellationRequested(listener);

      expect(mockToken.isCancellationRequested).toBe(false);
      expect(disposable).toBeDefined();
      expect(mockToken.onCancellationRequested).toHaveBeenCalledWith(listener);
    });
  });

  describe('Cross-Platform UI Compatibility', () => {
    test('desktop UI supports full feature set', () => {
      const mockPort = createMockUIPort();
      const fullCapabilities: UICapabilities = {
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
        maxMessageLength: 10000,
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(fullCapabilities);

      const capabilities = mockPort.capabilities();
      expect(capabilities.supportsFileDialogs).toBe(true);
      expect(capabilities.supportsWebviews).toBe(true);
      expect(capabilities.maxMessageLength).toBe(10000);
    });

    test('mobile UI has limited capabilities', () => {
      const mockPort = createMockUIPort();
      const mobileCapabilities: UICapabilities = {
        supportsFileDialogs: false,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: false,
        supportsWebviews: false,
        supportsThemes: true,
        maxMessageLength: 500,
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(mobileCapabilities);

      const capabilities = mockPort.capabilities();
      expect(capabilities.supportsFileDialogs).toBe(false);
      expect(capabilities.supportsWebviews).toBe(false);
      expect(capabilities.maxMessageLength).toBe(500);
    });

    test('web UI has browser-specific limitations', () => {
      const mockPort = createMockUIPort();
      const webCapabilities: UICapabilities = {
        supportsFileDialogs: true,
        supportsNotificationActions: false,
        supportsProgress: true,
        supportsStatusBar: false,
        supportsWebviews: true,
        supportsThemes: true,
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(webCapabilities);

      const capabilities = mockPort.capabilities();
      expect(capabilities.supportsFileDialogs).toBe(true);
      expect(capabilities.supportsNotificationActions).toBe(false);
      expect(capabilities.supportsStatusBar).toBe(false);
    });
  });
});
