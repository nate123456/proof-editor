import { err, ok, type Result } from 'neverthrow';
import * as vscode from 'vscode';
import type {
  ConfirmationOptions,
  Disposable,
  InputBoxOptions,
  IUIPort,
  NotificationAction,
  OpenDialogOptions,
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
} from '../../application/ports/IUIPort.js';

export class VSCodeUIAdapter implements IUIPort {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async showInputBox(options: InputBoxOptions): Promise<Result<string | null, UIError>> {
    try {
      const inputBoxOptions: vscode.InputBoxOptions = {
        prompt: options.prompt,
      };

      if (options.title !== undefined) inputBoxOptions.title = options.title;
      if (options.value !== undefined) inputBoxOptions.value = options.value;
      if (options.placeholder !== undefined) inputBoxOptions.placeHolder = options.placeholder;
      if (options.password !== undefined) inputBoxOptions.password = options.password;
      if (options.validateInput)
        inputBoxOptions.validateInput = (value) => options.validateInput?.(value);

      const result = await vscode.window.showInputBox(inputBoxOptions);

      return ok(result || null);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Input box failed',
      });
    }
  }

  async showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: QuickPickOptions,
  ): Promise<Result<T | null, UIError>> {
    try {
      const vscodeItems = items.map((item) => {
        const vscodeItem: vscode.QuickPickItem & { originalItem: T } = {
          label: item.label,
          originalItem: item,
        };
        if (item.description !== undefined) vscodeItem.description = item.description;
        if (item.detail !== undefined) vscodeItem.detail = item.detail;
        if (item.picked !== undefined) vscodeItem.picked = item.picked;
        return vscodeItem;
      });

      const quickPickOptions: vscode.QuickPickOptions = {};
      if (options?.title !== undefined) quickPickOptions.title = options.title;
      if (options?.placeHolder !== undefined) quickPickOptions.placeHolder = options.placeHolder;
      if (options?.canPickMany !== undefined) quickPickOptions.canPickMany = options.canPickMany;
      if (options?.matchOnDescription !== undefined)
        quickPickOptions.matchOnDescription = options.matchOnDescription;
      if (options?.matchOnDetail !== undefined)
        quickPickOptions.matchOnDetail = options.matchOnDetail;

      const result = await vscode.window.showQuickPick(vscodeItems, quickPickOptions);

      if (!result) {
        return ok(null);
      }

      // Return original item
      return ok((result as vscode.QuickPickItem & { originalItem: T }).originalItem);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Quick pick failed',
      });
    }
  }

  async showConfirmation(options: ConfirmationOptions): Promise<Result<boolean, UIError>> {
    try {
      const messageOptions: vscode.MessageOptions = {
        modal: true,
      };
      if (options.detail !== undefined) messageOptions.detail = options.detail;

      const result = await vscode.window.showInformationMessage(
        options.message,
        messageOptions,
        options.confirmLabel || 'OK',
        options.cancelLabel || 'Cancel',
      );

      return ok(result === (options.confirmLabel || 'OK'));
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Confirmation dialog failed',
      });
    }
  }

  async showOpenDialog(options: OpenDialogOptions): Promise<Result<string[] | null, UIError>> {
    try {
      const openDialogOptions: vscode.OpenDialogOptions = {};

      if (options.defaultUri !== undefined)
        openDialogOptions.defaultUri = vscode.Uri.parse(options.defaultUri);
      if (options.filters !== undefined)
        openDialogOptions.filters = this.mapFileFilters(options.filters);
      if (options.canSelectMany !== undefined)
        openDialogOptions.canSelectMany = options.canSelectMany;
      if (options.canSelectFolders !== undefined)
        openDialogOptions.canSelectFolders = options.canSelectFolders;
      if (options.canSelectFiles !== undefined)
        openDialogOptions.canSelectFiles = options.canSelectFiles;
      if (options.title !== undefined) openDialogOptions.title = options.title;

      const result = await vscode.window.showOpenDialog(openDialogOptions);

      if (!result || result.length === 0) {
        return ok(null);
      }

      return ok(result.map((uri) => uri.fsPath));
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Open dialog failed',
      });
    }
  }

  async showSaveDialog(
    options: SaveDialogOptions,
  ): Promise<Result<{ filePath: string; cancelled: boolean }, UIError>> {
    try {
      const saveDialogOptions: vscode.SaveDialogOptions = {};

      if (options.defaultUri !== undefined)
        saveDialogOptions.defaultUri = vscode.Uri.parse(options.defaultUri);
      if (options.filters !== undefined)
        saveDialogOptions.filters = this.mapFileFilters(options.filters);
      if (options.saveLabel !== undefined) saveDialogOptions.saveLabel = options.saveLabel;
      if (options.title !== undefined) saveDialogOptions.title = options.title;

      const result = await vscode.window.showSaveDialog(saveDialogOptions);

      return ok({
        filePath: result ? result.fsPath : '',
        cancelled: !result,
      });
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Save dialog failed',
      });
    }
  }

  showInformation(message: string, ...actions: NotificationAction[]): void {
    if (actions.length === 0) {
      vscode.window.showInformationMessage(message);
    } else {
      vscode.window
        .showInformationMessage(message, ...actions.map((a) => a.label))
        .then((selected) => {
          const action = actions.find((a) => a.label === selected);
          if (action) {
            action.callback();
          }
        });
    }
  }

  showWarning(message: string, ...actions: NotificationAction[]): void {
    if (actions.length === 0) {
      vscode.window.showWarningMessage(message);
    } else {
      vscode.window.showWarningMessage(message, ...actions.map((a) => a.label)).then((selected) => {
        const action = actions.find((a) => a.label === selected);
        if (action) {
          action.callback();
        }
      });
    }
  }

  showError(message: string, ...actions: NotificationAction[]): void {
    if (actions.length === 0) {
      vscode.window.showErrorMessage(message);
    } else {
      vscode.window.showErrorMessage(message, ...actions.map((a) => a.label)).then((selected) => {
        const action = actions.find((a) => a.label === selected);
        if (action) {
          action.callback();
        }
      });
    }
  }

  async showProgress<T>(options: ProgressOptions, task: ProgressTask<T>): Promise<T> {
    const location = this.mapProgressLocation(options.location);

    return vscode.window.withProgress(
      {
        location,
        title: options.title,
        ...(options.cancellable !== undefined && { cancellable: options.cancellable }),
      },
      async (progress, token) => {
        const progressReporter = {
          report: (value: { message?: string; increment?: number }) => {
            const reportValue: { message?: string; increment?: number } = {};
            if (value.message !== undefined) reportValue.message = value.message;
            if (value.increment !== undefined) reportValue.increment = value.increment;
            progress.report(reportValue);
          },
        };

        const cancellationToken = {
          get isCancellationRequested() {
            return token.isCancellationRequested;
          },
          onCancellationRequested: (listener: () => void) => {
            const disposable = token.onCancellationRequested(listener);
            return {
              dispose: () => disposable.dispose(),
            };
          },
        };

        return task(progressReporter, cancellationToken);
      },
    );
  }

  setStatusMessage(message: string, timeout?: number): Disposable {
    const disposable =
      timeout !== undefined
        ? vscode.window.setStatusBarMessage(message, timeout)
        : vscode.window.setStatusBarMessage(message);
    return {
      dispose: () => disposable.dispose(),
    };
  }

  createWebviewPanel(options: WebviewPanelOptions): WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      options.viewType,
      options.title,
      options.showOptions?.viewColumn || vscode.ViewColumn.One,
      {
        ...(options.enableScripts !== undefined && { enableScripts: options.enableScripts }),
        ...(options.retainContextWhenHidden !== undefined && {
          retainContextWhenHidden: options.retainContextWhenHidden,
        }),
      },
    );

    return {
      id: options.id,
      webview: {
        html: '',
        onDidReceiveMessage: (callback: (message: WebviewMessage) => void) => {
          const disposable = panel.webview.onDidReceiveMessage(callback);
          return {
            dispose: () => disposable.dispose(),
          };
        },
      },
      onDidDispose: (callback: () => void) => {
        const disposable = panel.onDidDispose(callback);
        return {
          dispose: () => disposable.dispose(),
        };
      },
      reveal: (viewColumn?: number, preserveFocus?: boolean) => {
        panel.reveal(viewColumn, preserveFocus);
      },
      dispose: () => {
        panel.dispose();
      },
    };
  }

  postMessageToWebview(_panelId: string, _message: WebviewMessage): void {
    // Implementation depends on webview panel management
  }

  getTheme(): UITheme {
    const colorTheme = vscode.window.activeColorTheme;
    return {
      kind: colorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light',
      colors: {
        background: 'var(--vscode-editor-background)',
        foreground: 'var(--vscode-editor-foreground)',
        primary: 'var(--vscode-button-background)',
        secondary: 'var(--vscode-button-secondaryBackground)',
        accent: 'var(--vscode-focusBorder)',
        error: 'var(--vscode-errorForeground)',
        warning: 'var(--vscode-warningForeground)',
        success: 'var(--vscode-terminal-ansiGreen)',
      },
      fonts: {
        default: 'var(--vscode-font-family)',
        monospace: 'var(--vscode-editor-font-family)',
        size: 13, // VS Code default
      },
    };
  }

  onThemeChange(callback: (theme: UITheme) => void): Disposable {
    const disposable = vscode.window.onDidChangeActiveColorTheme(() => {
      callback(this.getTheme());
    });

    return {
      dispose: () => disposable.dispose(),
    };
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<Result<void, UIError>> {
    try {
      const uri = vscode.Uri.file(filePath);
      const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
      await vscode.workspace.fs.writeFile(uri, data);
      return ok(undefined);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to write file',
      });
    }
  }

  capabilities(): UICapabilities {
    return {
      supportsFileDialogs: true,
      supportsNotificationActions: true,
      supportsProgress: true,
      supportsStatusBar: true,
      supportsWebviews: true,
      supportsThemes: true,
      maxMessageLength: 1000, // VS Code reasonable limit
    };
  }

  // Helper methods
  private mapFileFilters(filters: { name: string; extensions: string[] }[]) {
    const result: { [name: string]: string[] } = {};
    filters.forEach((filter) => {
      result[filter.name] = filter.extensions;
    });
    return result;
  }

  private mapProgressLocation(location?: string): vscode.ProgressLocation {
    switch (location) {
      case 'notification':
        return vscode.ProgressLocation.Notification;
      case 'statusbar':
        return vscode.ProgressLocation.Window;
      case 'dialog':
        return vscode.ProgressLocation.Notification; // VS Code doesn't have dialog progress
      default:
        return vscode.ProgressLocation.Notification;
    }
  }
}
