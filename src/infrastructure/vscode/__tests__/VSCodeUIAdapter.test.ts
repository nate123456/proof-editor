import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  ActionLabel,
  DialogPrompt,
  DialogTitle,
  ErrorMessage,
  NotificationMessage,
  PlaceholderText,
  ViewType,
  WebviewId,
} from '../../../domain/shared/value-objects/index.js';
import { VSCodeUIAdapter } from '../VSCodeUIAdapter.js';

// Mock vscode module
vi.mock('vscode', () => ({
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
  ViewColumn: { One: 1 },
  ProgressLocation: { Notification: 1, Window: 2 },
  ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
  Uri: { parse: vi.fn() },
}));

describe('VSCodeUIAdapter', () => {
  let adapter: VSCodeUIAdapter;
  let mockContext: any;

  beforeEach(() => {
    mockContext = vi.fn();
    adapter = new VSCodeUIAdapter(mockContext);
  });

  describe('showInputBox', () => {
    test('returns user input when successful', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('test input');

      const promptResult = DialogPrompt.create('Enter value');
      const placeholderResult = PlaceholderText.create('placeholder');

      expect(promptResult.isOk()).toBe(true);
      expect(placeholderResult.isOk()).toBe(true);

      if (!promptResult.isOk() || !placeholderResult.isOk()) return;

      const result = await adapter.showInputBox({
        prompt: promptResult.value,
        placeholder: placeholderResult.value,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('test input');
      }
    });

    test('returns null when cancelled', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined);

      const promptResult = DialogPrompt.create('Enter value');
      expect(promptResult.isOk()).toBe(true);
      if (!promptResult.isOk()) return;

      const result = await adapter.showInputBox({
        prompt: promptResult.value,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(null);
      }
    });

    test('returns error when input box fails', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInputBox).mockRejectedValue(new Error('Input failed'));

      const promptResult = DialogPrompt.create('Enter value');
      expect(promptResult.isOk()).toBe(true);
      if (!promptResult.isOk()) return;

      const result = await adapter.showInputBox({
        prompt: promptResult.value,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PLATFORM_ERROR');
        expect(result.error.message).toBe('Input failed');
      }
    });

    test('passes all options correctly', async () => {
      const vscode = await import('vscode');
      const validateInput = vi.fn().mockReturnValue(null);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('test');

      const titleResult = DialogTitle.create('Test Title');
      const promptResult = DialogPrompt.create('Enter value');
      const placeholderResult = PlaceholderText.create('placeholder');

      expect(titleResult.isOk()).toBe(true);
      expect(promptResult.isOk()).toBe(true);
      expect(placeholderResult.isOk()).toBe(true);

      if (!titleResult.isOk() || !promptResult.isOk() || !placeholderResult.isOk()) return;

      await adapter.showInputBox({
        title: titleResult.value,
        prompt: promptResult.value,
        value: 'default',
        placeholder: placeholderResult.value,
        password: true,
        validateInput,
      });

      expect(vscode.window.showInputBox).toHaveBeenCalledWith({
        title: 'Test Title',
        prompt: 'Enter value',
        value: 'default',
        placeHolder: 'placeholder',
        password: true,
        validateInput: expect.any(Function),
      });
    });
  });

  describe('showQuickPick', () => {
    test('returns selected item when successful', async () => {
      const vscode = await import('vscode');
      const items = [
        { label: 'Item 1', description: 'First item' },
        { label: 'Item 2', description: 'Second item' },
      ];

      vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
        label: 'Item 1',
        description: 'First item',
        originalItem: items[0],
      } as any);

      const result = await adapter.showQuickPick(items);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(items[0]);
      }
    });

    test('returns null when cancelled', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

      const result = await adapter.showQuickPick([]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(null);
      }
    });

    test('returns error when quick pick fails', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showQuickPick).mockRejectedValue(new Error('Pick failed'));

      const result = await adapter.showQuickPick([]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PLATFORM_ERROR');
      }
    });
  });

  describe('showConfirmation', () => {
    test('returns true when confirmed', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('OK' as any);

      const titleResult = DialogTitle.create('Confirm');
      const messageResult = ErrorMessage.create('Are you sure?');

      expect(titleResult.isOk()).toBe(true);
      expect(messageResult.isOk()).toBe(true);

      if (!titleResult.isOk() || !messageResult.isOk()) return;

      const result = await adapter.showConfirmation({
        title: titleResult.value,
        message: messageResult.value,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('returns false when cancelled', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Cancel' as any);

      const titleResult = DialogTitle.create('Confirm');
      const messageResult = ErrorMessage.create('Are you sure?');

      expect(titleResult.isOk()).toBe(true);
      expect(messageResult.isOk()).toBe(true);

      if (!titleResult.isOk() || !messageResult.isOk()) return;

      const result = await adapter.showConfirmation({
        title: titleResult.value,
        message: messageResult.value,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    test('uses custom labels', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Yes' as any);

      const titleResult = DialogTitle.create('Confirm');
      const messageResult = ErrorMessage.create('Are you sure?');
      const confirmLabelResult = ActionLabel.create('Yes');
      const cancelLabelResult = ActionLabel.create('No');

      expect(titleResult.isOk()).toBe(true);
      expect(messageResult.isOk()).toBe(true);
      expect(confirmLabelResult.isOk()).toBe(true);
      expect(cancelLabelResult.isOk()).toBe(true);

      if (
        !titleResult.isOk() ||
        !messageResult.isOk() ||
        !confirmLabelResult.isOk() ||
        !cancelLabelResult.isOk()
      )
        return;

      const result = await adapter.showConfirmation({
        title: titleResult.value,
        message: messageResult.value,
        confirmLabel: confirmLabelResult.value,
        cancelLabel: cancelLabelResult.value,
      });

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Are you sure?',
        { modal: true, detail: undefined },
        'Yes',
        'No',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('showOpenDialog', () => {
    test('returns selected file paths', async () => {
      const vscode = await import('vscode');
      const mockUris = [{ fsPath: '/path/to/file1.txt' }, { fsPath: '/path/to/file2.txt' }];
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(mockUris as any);

      const titleResult = DialogTitle.create('Open Files');
      expect(titleResult.isOk()).toBe(true);
      if (!titleResult.isOk()) return;

      const result = await adapter.showOpenDialog({
        title: titleResult.value,
        canSelectMany: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(['/path/to/file1.txt', '/path/to/file2.txt']);
      }
    });

    test('returns null when cancelled', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined);

      const result = await adapter.showOpenDialog({});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(null);
      }
    });
  });

  describe('showSaveDialog', () => {
    test('returns selected file path', async () => {
      const vscode = await import('vscode');
      const mockUri = { fsPath: '/path/to/save.txt' };
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(mockUri as any);

      const titleResult = DialogTitle.create('Save File');
      expect(titleResult.isOk()).toBe(true);
      if (!titleResult.isOk()) return;

      const result = await adapter.showSaveDialog({
        title: titleResult.value,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ filePath: '/path/to/save.txt', cancelled: false });
      }
    });

    test('returns cancelled result when cancelled', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(undefined);

      const result = await adapter.showSaveDialog({});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ filePath: '', cancelled: true });
      }
    });
  });

  describe('notification methods', () => {
    test('showInformation without actions', async () => {
      const vscode = await import('vscode');

      const msgResult = NotificationMessage.create('Test message');
      if (msgResult.isOk()) {
        adapter.showInformation(msgResult.value);
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test message');
      }
    });

    test('showInformation with actions', async () => {
      const vscode = await import('vscode');
      const callback = vi.fn();
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Action 1' as any);

      const msgResult = NotificationMessage.create('Test message');
      if (msgResult.isOk()) {
        const labelResult = ActionLabel.create('Action 1');
        expect(labelResult.isOk()).toBe(true);
        if (!labelResult.isOk()) return;

        adapter.showInformation(msgResult.value, { label: labelResult.value, callback });
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          'Test message',
          'Action 1',
        );
      }

      // Wait for async handling
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(callback).toHaveBeenCalled();
    });

    test('showWarning calls correct VS Code method', async () => {
      const vscode = await import('vscode');

      const msgResult = NotificationMessage.create('Warning message');
      if (msgResult.isOk()) {
        adapter.showWarning(msgResult.value);
        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Warning message');
      }
    });

    test('showError calls correct VS Code method', async () => {
      const vscode = await import('vscode');

      const msgResult = NotificationMessage.create('Error message');
      if (msgResult.isOk()) {
        adapter.showError(msgResult.value);
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Error message');
      }
    });
  });

  describe('showProgress', () => {
    test('executes task with progress reporter', async () => {
      const vscode = await import('vscode');
      const mockTask = vi.fn().mockResolvedValue('result');

      vi.mocked(vscode.window.withProgress).mockImplementation((_options: any, task: any) => {
        const mockProgress = { report: vi.fn() };
        const mockToken = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
        return task(mockProgress, mockToken);
      });

      const titleResult = DialogTitle.create('Processing...');
      expect(titleResult.isOk()).toBe(true);
      if (!titleResult.isOk()) return;

      const result = await adapter.showProgress(
        { title: titleResult.value, location: 'notification' },
        mockTask,
      );

      expect(result).toBe('result');
      expect(mockTask).toHaveBeenCalled();
    });
  });

  describe('setStatusMessage', () => {
    test('sets status message with timeout', async () => {
      const vscode = await import('vscode');
      const mockDisposable = { dispose: vi.fn() };
      vi.mocked(vscode.window.setStatusBarMessage).mockReturnValue(mockDisposable);

      const disposable = adapter.setStatusMessage('Status message', 5000);

      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith('Status message', 5000);
      expect(disposable).toHaveProperty('dispose');
    });
  });

  describe('createWebviewPanel', () => {
    test('creates webview panel with correct options', async () => {
      const vscode = await import('vscode');
      const mockPanel = {
        webview: { onDidReceiveMessage: vi.fn() },
        onDidDispose: vi.fn(),
        reveal: vi.fn(),
        dispose: vi.fn(),
      };
      vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

      const idResult = WebviewId.create('test-panel');
      const titleResult = DialogTitle.create('Test Panel');
      const viewTypeResult = ViewType.create('test.view');

      expect(idResult.isOk()).toBe(true);
      expect(titleResult.isOk()).toBe(true);
      expect(viewTypeResult.isOk()).toBe(true);

      if (!idResult.isOk() || !titleResult.isOk() || !viewTypeResult.isOk()) return;

      const panel = adapter.createWebviewPanel({
        id: idResult.value,
        title: titleResult.value,
        viewType: viewTypeResult.value,
        enableScripts: true,
      });

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'test.view',
        'Test Panel',
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: undefined },
      );

      expect(panel.id).toBe('test-panel');
      expect(panel).toHaveProperty('webview');
      expect(panel).toHaveProperty('onDidDispose');
      expect(panel).toHaveProperty('reveal');
      expect(panel).toHaveProperty('dispose');
    });
  });

  describe('getTheme', () => {
    test('returns light theme info', () => {
      const theme = adapter.getTheme();

      expect(theme.kind).toBe('light');
      expect(theme.colors).toHaveProperty('background');
      expect(theme.colors).toHaveProperty('foreground');
      expect(theme.fonts).toHaveProperty('default');
      expect(theme.fonts).toHaveProperty('monospace');
      expect(typeof theme.fonts.size).toBe('number');
    });

    test('returns dark theme for dark color theme', async () => {
      const vscode = await import('vscode');
      (vscode.window.activeColorTheme as any).kind = vscode.ColorThemeKind.Dark;

      const theme = adapter.getTheme();

      expect(theme.kind).toBe('dark');
    });
  });

  describe('onThemeChange', () => {
    test('registers theme change callback', async () => {
      const vscode = await import('vscode');
      const mockDisposable = { dispose: vi.fn() };
      vi.mocked(vscode.window.onDidChangeActiveColorTheme).mockReturnValue(mockDisposable);

      const callback = vi.fn();
      const disposable = adapter.onThemeChange(callback);

      expect(vscode.window.onDidChangeActiveColorTheme).toHaveBeenCalled();
      expect(disposable).toHaveProperty('dispose');
    });
  });

  describe('capabilities', () => {
    test('returns VS Code capabilities', () => {
      const caps = adapter.capabilities();

      expect(caps.supportsFileDialogs).toBe(true);
      expect(caps.supportsNotificationActions).toBe(true);
      expect(caps.supportsProgress).toBe(true);
      expect(caps.supportsStatusBar).toBe(true);
      expect(caps.supportsWebviews).toBe(true);
      expect(caps.supportsThemes).toBe(true);
      expect(typeof caps.maxMessageLength).toBe('number');
    });
  });

  describe('helper methods', () => {
    test('mapFileFilters converts format correctly', () => {
      const adapter = new VSCodeUIAdapter(mockContext);
      const filters = [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'Images', extensions: ['png', 'jpg'] },
      ];

      // Access private method for testing
      const result = (adapter as any).mapFileFilters(filters);

      expect(result).toEqual({
        'Text Files': ['txt', 'md'],
        Images: ['png', 'jpg'],
      });
    });

    test('mapProgressLocation converts locations correctly', async () => {
      const adapter = new VSCodeUIAdapter(mockContext);
      const vscode = await import('vscode');

      expect((adapter as any).mapProgressLocation('notification')).toBe(
        vscode.ProgressLocation.Notification,
      );
      expect((adapter as any).mapProgressLocation('statusbar')).toBe(
        vscode.ProgressLocation.Window,
      );
      expect((adapter as any).mapProgressLocation('dialog')).toBe(
        vscode.ProgressLocation.Notification,
      );
      expect((adapter as any).mapProgressLocation(undefined)).toBe(
        vscode.ProgressLocation.Notification,
      );
    });
  });
});
