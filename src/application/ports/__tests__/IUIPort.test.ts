import { err, ok, type Result } from 'neverthrow';
import { describe, expect, test, vi } from 'vitest';
import {
  ActionLabel,
  DialogPrompt,
  DialogTitle,
  ErrorCode,
  ErrorMessage,
  FileExtensionList,
  FilterName,
  FontFamily,
  FontSize,
  MessageContent,
  MessageLength,
  MessageType,
  NotificationMessage,
  PlaceholderText,
  ViewType,
  WebviewId,
} from '../../../domain/shared/value-objects/index.js';
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
      const titleResult = DialogTitle.create('Test Input');
      const promptResult = DialogPrompt.create('Enter a value');
      const placeholderResult = PlaceholderText.create('Type here...');

      if (titleResult.isErr() || promptResult.isErr() || placeholderResult.isErr()) {
        throw new Error('Failed to create value objects');
      }

      const options: InputBoxOptions = {
        title: titleResult.value,
        prompt: promptResult.value,
        value: 'default',
        placeholder: placeholderResult.value,
        password: false,
      };

      const successResult = ok('user input');
      const cancelledResult = ok(null);
      const errorCodeResult = ErrorCode.create('INVALID_INPUT');
      const errorMessageResult = ErrorMessage.create('Input validation failed');
      if (errorCodeResult.isErr() || errorMessageResult.isErr()) {
        throw new Error('Failed to create error value objects');
      }
      const errorResult = err({
        code: errorCodeResult.value,
        message: errorMessageResult.value,
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
        expect(result3.error.code.getValue()).toBe('INVALID_INPUT');
      }
    });

    test('showInputBox handles validation function', async () => {
      const mockPort = createMockUIPort();
      const promptResult2 = DialogPrompt.create('Enter email');
      if (promptResult2.isErr()) {
        throw new Error('Failed to create prompt');
      }
      const optionsWithValidation: InputBoxOptions = {
        prompt: promptResult2.value,
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
      const titleResult = DialogTitle.create('Select Option');
      const placeholderResult = PlaceholderText.create('Choose an option');
      if (titleResult.isErr() || placeholderResult.isErr()) {
        throw new Error('Failed to create value objects');
      }
      const options: QuickPickOptions = {
        title: titleResult.value,
        placeHolder: placeholderResult.value,
        canPickMany: false,
      };

      const successResult = ok(items[0]) as Result<QuickPickItem | null, UIError>;
      const cancelledResult = ok(null) as Result<QuickPickItem | null, UIError>;
      const errorCodeResult = ErrorCode.create('CANCELLED');
      const errorMessageResult = ErrorMessage.create('User cancelled');
      if (errorCodeResult.isErr() || errorMessageResult.isErr()) {
        throw new Error('Failed to create error value objects');
      }
      const errorResult = err({
        code: errorCodeResult.value,
        message: errorMessageResult.value,
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
      const titleResult = DialogTitle.create('Confirm Action');
      const msgResult = NotificationMessage.create('Are you sure?');
      if (titleResult.isErr() || msgResult.isErr()) {
        throw new Error('Failed to create value objects');
      }
      const errorMsgResult = ErrorMessage.create('Are you sure?');
      const confirmLabelResult = ActionLabel.create('Yes');
      const cancelLabelResult = ActionLabel.create('No');
      if (errorMsgResult.isErr() || confirmLabelResult.isErr() || cancelLabelResult.isErr()) {
        throw new Error('Failed to create value objects');
      }
      const options: ConfirmationOptions = {
        title: titleResult.value,
        message: errorMsgResult.value,
        detail: 'This action cannot be undone',
        confirmLabel: confirmLabelResult.value,
        cancelLabel: cancelLabelResult.value,
        isDestructive: true,
      };

      const confirmResult = ok(true);
      const cancelResult = ok(false);
      const errorCodeResult = ErrorCode.create('PLATFORM_ERROR');
      const errorMessageResult = ErrorMessage.create('Dialog error');
      if (errorCodeResult.isErr() || errorMessageResult.isErr()) {
        throw new Error('Failed to create error value objects');
      }
      const errorResult = err({
        code: errorCodeResult.value,
        message: errorMessageResult.value,
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
      const titleResult = DialogTitle.create('Open Files');
      const filterName1Result = FilterName.create('Proof Files');
      const filterName2Result = FilterName.create('All Files');
      const extensions1Result = FileExtensionList.create(['proof', 'yaml']);
      const extensions2Result = FileExtensionList.create(['txt']);

      if (
        titleResult.isErr() ||
        filterName1Result.isErr() ||
        filterName2Result.isErr() ||
        extensions1Result.isErr() ||
        extensions2Result.isErr()
      ) {
        throw new Error('Failed to create value objects');
      }

      const options: OpenDialogOptions = {
        defaultUri: '/home/user',
        filters: [
          { name: filterName1Result.value, extensions: extensions1Result.value },
          { name: filterName2Result.value, extensions: extensions2Result.value },
        ],
        canSelectMany: true,
        canSelectFolders: false,
        canSelectFiles: true,
        title: titleResult.value,
      };

      const successResult = ok(['/path/to/file1.proof', '/path/to/file2.proof']);
      const cancelledResult = ok(null);
      const errorCodeResult = ErrorCode.create('NOT_SUPPORTED');
      const errorMessageResult = ErrorMessage.create('File dialogs not supported');
      if (errorCodeResult.isErr() || errorMessageResult.isErr()) {
        throw new Error('Failed to create error value objects');
      }
      const errorResult = err({
        code: errorCodeResult.value,
        message: errorMessageResult.value,
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
      const titleResult = DialogTitle.create('Save As');
      const filterNameResult = FilterName.create('Proof Files');
      const extensionsResult = FileExtensionList.create(['proof']);

      if (titleResult.isErr() || filterNameResult.isErr() || extensionsResult.isErr()) {
        throw new Error('Failed to create value objects');
      }

      const saveLabelResult = ActionLabel.create('Save Proof');
      if (saveLabelResult.isErr()) {
        throw new Error('Failed to create save label');
      }
      const options: SaveDialogOptions = {
        defaultUri: '/home/user/document.proof',
        filters: [{ name: filterNameResult.value, extensions: extensionsResult.value }],
        saveLabel: saveLabelResult.value,
        title: titleResult.value,
      };

      const successResult = ok({ filePath: '/path/to/saved/file.proof', cancelled: false });
      const cancelledResult = ok({ filePath: '', cancelled: true });
      const errorCodeResult = ErrorCode.create('PLATFORM_ERROR');
      const errorMessageResult = ErrorMessage.create('Cannot save to location');
      if (errorCodeResult.isErr() || errorMessageResult.isErr()) {
        throw new Error('Failed to create error value objects');
      }
      const errorResult = err({
        code: errorCodeResult.value,
        message: errorMessageResult.value,
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
      const label1Result = ActionLabel.create('OK');
      const label2Result = ActionLabel.create('Cancel');
      if (label1Result.isErr() || label2Result.isErr()) {
        throw new Error('Failed to create action labels');
      }
      const actions: NotificationAction[] = [
        { label: label1Result.value, callback: vi.fn() },
        { label: label2Result.value, callback: vi.fn() },
      ];

      vi.mocked(mockPort.showInformation).mockReturnValue(undefined);

      const msgResult = NotificationMessage.create('Info message');
      if (msgResult.isOk()) {
        mockPort.showInformation(msgResult.value, ...actions);
        expect(mockPort.showInformation).toHaveBeenCalledWith(msgResult.value, ...actions);
      }
    });

    test('showWarning displays warning message', () => {
      const mockPort = createMockUIPort();
      const labelResult = ActionLabel.create('Retry');
      if (labelResult.isErr()) {
        throw new Error('Failed to create action label');
      }
      const actions: NotificationAction[] = [{ label: labelResult.value, callback: vi.fn() }];

      vi.mocked(mockPort.showWarning).mockReturnValue(undefined);

      const msgResult = NotificationMessage.create('Warning message');
      if (msgResult.isOk()) {
        mockPort.showWarning(msgResult.value, ...actions);
        expect(mockPort.showWarning).toHaveBeenCalledWith(msgResult.value, ...actions);
      }
    });

    test('showError displays error message', () => {
      const mockPort = createMockUIPort();
      const labelResult = ActionLabel.create('Report Issue');
      if (labelResult.isErr()) {
        throw new Error('Failed to create action label');
      }
      const actions: NotificationAction[] = [{ label: labelResult.value, callback: vi.fn() }];

      vi.mocked(mockPort.showError).mockReturnValue(undefined);

      const msgResult = NotificationMessage.create('Error message');
      if (msgResult.isOk()) {
        mockPort.showError(msgResult.value, ...actions);
        expect(mockPort.showError).toHaveBeenCalledWith(msgResult.value, ...actions);
      }
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
      const titleResult = DialogTitle.create('Processing...');
      if (titleResult.isErr()) {
        throw new Error('Failed to create title');
      }
      const options: ProgressOptions = {
        title: titleResult.value,
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
      const webviewIdResult = WebviewId.create('proof-tree-panel');
      const titleResult = DialogTitle.create('Proof Tree');
      const viewTypeResult = ViewType.create('proofTree');

      if (webviewIdResult.isErr() || titleResult.isErr() || viewTypeResult.isErr()) {
        throw new Error('Failed to create value objects');
      }

      const options: WebviewPanelOptions = {
        id: webviewIdResult.value,
        title: titleResult.value,
        viewType: viewTypeResult.value,
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
      expect(panel.id.getValue()).toBe('proof-tree-panel');
      expect(mockPort.createWebviewPanel).toHaveBeenCalledWith(options);
    });

    test('postMessageToWebview sends message to panel', () => {
      const mockPort = createMockUIPort();
      const contentResult = MessageContent.create('tree data');
      if (contentResult.isErr()) {
        throw new Error('Failed to create message content');
      }
      const message: WebviewMessage = {
        type: MessageType.UPDATE_TREE,
        content: contentResult.value,
      };

      vi.mocked(mockPort.postMessageToWebview).mockReturnValue(undefined);

      const webviewIdResult = WebviewId.create('panel-id');
      if (webviewIdResult.isErr()) {
        throw new Error('Failed to create webview ID');
      }
      mockPort.postMessageToWebview(webviewIdResult.value, message);
      expect(mockPort.postMessageToWebview).toHaveBeenCalledWith(webviewIdResult.value, message);
    });

    test('WebviewPanel provides message handling', () => {
      const webviewIdResult = WebviewId.create('test-panel');
      const titleResult = DialogTitle.create('Test Panel');
      if (webviewIdResult.isErr() || titleResult.isErr()) {
        throw new Error('Failed to create value objects');
      }
      const mockPanel = {
        id: webviewIdResult.value,
        title: titleResult.value,
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
          default: FontFamily.create('Segoe UI').unwrapOr(FontFamily.defaultSansSerif()),
          monospace: FontFamily.create('Consolas').unwrapOr(FontFamily.defaultMonospace()),
          size: FontSize.create(14).unwrapOr(FontSize.default()),
        },
      };

      vi.mocked(mockPort.getTheme).mockReturnValue(theme);

      const result = mockPort.getTheme();
      expect(result.kind).toBe('dark');
      expect(result.colors['editor.background']).toBe('#1e1e1e');
      expect(result.fonts.monospace.getValue()).toBe('Consolas');
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
          fonts: {
            default: FontFamily.create('Arial').unwrapOr(FontFamily.defaultSansSerif()),
            monospace: FontFamily.create('Courier').unwrapOr(FontFamily.defaultMonospace()),
            size: FontSize.create(12).unwrapOr(FontSize.default()),
          },
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
        maxMessageLength: MessageLength.create(1000).unwrapOr(MessageLength.default()),
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(capabilities);

      const result = mockPort.capabilities();
      expect(result.supportsFileDialogs).toBe(true);
      expect(result.supportsNotificationActions).toBe(true);
      expect(result.supportsProgress).toBe(true);
      expect(result.supportsStatusBar).toBe(true);
      expect(result.supportsWebviews).toBe(true);
      expect(result.supportsThemes).toBe(true);
      expect(result.maxMessageLength?.getValue()).toBe(1000);
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
        const errorCodeResult = ErrorCode.create(code);
        const errorMessageResult = ErrorMessage.create(`Test error: ${code}`);
        if (errorCodeResult.isErr() || errorMessageResult.isErr()) {
          throw new Error('Failed to create error value objects');
        }
        const error: UIError = {
          code: errorCodeResult.value,
          message: errorMessageResult.value,
        };

        expect(error.code.getValue()).toBe(code);
        expect(error.message).toBeDefined();
      });
    });

    test('UIError message is always required', () => {
      const errorCodeResult = ErrorCode.create('CANCELLED');
      const errorMessageResult = ErrorMessage.create('Operation was cancelled by user');
      if (errorCodeResult.isErr() || errorMessageResult.isErr()) {
        throw new Error('Failed to create error value objects');
      }
      const error: UIError = {
        code: errorCodeResult.value,
        message: errorMessageResult.value,
      };

      expect(error.message.getValue()).toBe('Operation was cancelled by user');
    });
  });

  describe('Type Safety and Structure', () => {
    test('InputBoxOptions structure is well-typed', () => {
      const titleResult = DialogTitle.create('Test Title');
      const promptResult = DialogPrompt.create('Enter value');
      const placeholderResult = PlaceholderText.create('placeholder text');

      if (titleResult.isErr() || promptResult.isErr() || placeholderResult.isErr()) {
        throw new Error('Failed to create value objects');
      }

      const options: InputBoxOptions = {
        title: titleResult.value,
        prompt: promptResult.value,
        value: 'default value',
        placeholder: placeholderResult.value,
        password: true,
        validateInput: (value: string) => (value.length > 0 ? null : 'Required'),
      };

      expect(options.title?.getValue()).toBe('Test Title');
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
      const filterNameResult = FilterName.create('Proof Files');
      const extensionsResult = FileExtensionList.create(['proof', 'yaml', 'yml']);

      if (filterNameResult.isErr() || extensionsResult.isErr()) {
        throw new Error('Failed to create value objects');
      }

      const filter: FileFilter = {
        name: filterNameResult.value,
        extensions: extensionsResult.value,
      };

      expect(filter.name.getValue()).toBe('Proof Files');
      expect(filter.extensions.toArray()).toContain('.proof');
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
      const contentResult = MessageContent.create('some content');
      if (contentResult.isErr()) {
        throw new Error('Failed to create message content');
      }
      const message: WebviewMessage = {
        type: MessageType.ARGUMENT_CREATED,
        content: contentResult.value,
      };

      expect(message.type).toBe(MessageType.ARGUMENT_CREATED);
      // WebviewMessage only has type and content properties
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
        maxMessageLength: MessageLength.create(10000).unwrapOr(MessageLength.default()),
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(fullCapabilities);

      const capabilities = mockPort.capabilities();
      expect(capabilities.supportsFileDialogs).toBe(true);
      expect(capabilities.supportsWebviews).toBe(true);
      expect(capabilities.maxMessageLength?.getValue()).toBe(10000);
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
        maxMessageLength: MessageLength.create(500).unwrapOr(MessageLength.default()),
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(mobileCapabilities);

      const capabilities = mockPort.capabilities();
      expect(capabilities.supportsFileDialogs).toBe(false);
      expect(capabilities.supportsWebviews).toBe(false);
      expect(capabilities.maxMessageLength?.getValue()).toBe(500);
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
