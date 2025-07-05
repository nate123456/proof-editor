import { beforeEach, describe, expect, test, vi } from 'vitest';
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

      const result = await adapter.showInputBox({
        prompt: 'Enter value',
        placeholder: 'placeholder',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('test input');
      }
    });

    test('returns null when cancelled', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined);

      const result = await adapter.showInputBox({
        prompt: 'Enter value',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(null);
      }
    });

    test('returns error when input box fails', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInputBox).mockRejectedValue(new Error('Input failed'));

      const result = await adapter.showInputBox({
        prompt: 'Enter value',
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

      await adapter.showInputBox({
        title: 'Test Title',
        prompt: 'Enter value',
        value: 'default',
        placeholder: 'placeholder',
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

      const result = await adapter.showConfirmation({
        title: 'Confirm',
        message: 'Are you sure?',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('returns false when cancelled', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Cancel' as any);

      const result = await adapter.showConfirmation({
        title: 'Confirm',
        message: 'Are you sure?',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    test('uses custom labels', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Yes' as any);

      const result = await adapter.showConfirmation({
        title: 'Confirm',
        message: 'Are you sure?',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
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

      const result = await adapter.showOpenDialog({
        title: 'Open Files',
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

      const result = await adapter.showSaveDialog({
        title: 'Save File',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('/path/to/save.txt');
      }
    });

    test('returns null when cancelled', async () => {
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

      adapter.showInformation('Test message');

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test message');
    });

    test('showInformation with actions', async () => {
      const vscode = await import('vscode');
      const callback = vi.fn();
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Action 1' as any);

      adapter.showInformation('Test message', { label: 'Action 1', callback });

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test message', 'Action 1');

      // Wait for async handling
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(callback).toHaveBeenCalled();
    });

    test('showWarning calls correct VS Code method', async () => {
      const vscode = await import('vscode');

      adapter.showWarning('Warning message');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Warning message');
    });

    test('showError calls correct VS Code method', async () => {
      const vscode = await import('vscode');

      adapter.showError('Error message');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Error message');
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

      const result = await adapter.showProgress(
        { title: 'Processing...', location: 'notification' },
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

      const panel = adapter.createWebviewPanel({
        id: 'test-panel',
        title: 'Test Panel',
        viewType: 'test.view',
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
