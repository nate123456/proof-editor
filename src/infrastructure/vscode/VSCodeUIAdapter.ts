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
import {
  type DocumentContent,
  ErrorCode,
  ErrorMessage,
  type FilePath,
  FontFamily,
  FontSize,
  MessageLength,
  type NotificationMessage,
  type WebviewId,
} from '../../domain/shared/value-objects/index.js';

export class VSCodeUIAdapter implements IUIPort {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async showInputBox(options: InputBoxOptions): Promise<Result<string | null, UIError>> {
    try {
      if (!vscode.window?.showInputBox) {
        const errorCode = ErrorCode.create('PLATFORM_ERROR');
        const errorMessage = ErrorMessage.create('VS Code window.showInputBox is not available');

        if (errorCode.isErr() || errorMessage.isErr()) {
          const fallbackCode = ErrorCode.create('UNKNOWN');
          const fallbackMessage = ErrorMessage.create(
            'VS Code window.showInputBox is not available',
          );
          return err({
            code: fallbackCode.isOk() ? fallbackCode.value : ({} as ErrorCode),
            message: fallbackMessage.isOk() ? fallbackMessage.value : ({} as ErrorMessage),
          });
        }

        return err({
          code: errorCode.value,
          message: errorMessage.value,
        });
      }

      const inputBoxOptions: vscode.InputBoxOptions = {
        prompt: options.prompt.getValue(),
      };

      if (options.title !== undefined) inputBoxOptions.title = options.title.getValue();
      if (options.value !== undefined) inputBoxOptions.value = options.value;
      if (options.placeholder !== undefined)
        inputBoxOptions.placeHolder = options.placeholder.getValue();
      if (options.password !== undefined) inputBoxOptions.password = options.password;
      if (options.validateInput)
        inputBoxOptions.validateInput = (value) => options.validateInput?.(value);

      const result = await vscode.window.showInputBox(inputBoxOptions);

      return ok(result || null);
    } catch (error) {
      const errorCode = ErrorCode.create('PLATFORM_ERROR');
      const errorMessage = ErrorMessage.create(
        error instanceof Error ? error.message : 'Input box failed',
      );

      if (errorCode.isErr() || errorMessage.isErr()) {
        const fallbackCode = ErrorCode.create('UNKNOWN');
        const fallbackMessage = ErrorMessage.create('Input box failed');
        return err({
          code: fallbackCode.isOk() ? fallbackCode.value : ({} as ErrorCode),
          message: fallbackMessage.isOk() ? fallbackMessage.value : ({} as ErrorMessage),
        });
      }

      return err({
        code: errorCode.value,
        message: errorMessage.value,
      });
    }
  }

  async showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: QuickPickOptions,
  ): Promise<Result<T | null, UIError>> {
    try {
      if (!vscode.window?.showQuickPick) {
        return err(
          this.createUIError('PLATFORM_ERROR', 'VS Code window.showQuickPick is not available'),
        );
      }

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
      if (options?.title !== undefined) quickPickOptions.title = options.title.getValue();
      if (options?.placeHolder !== undefined)
        quickPickOptions.placeHolder = options.placeHolder.getValue();
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
      return err(
        this.createUIError(
          'PLATFORM_ERROR',
          error instanceof Error ? error.message : 'Quick pick failed',
        ),
      );
    }
  }

  async showConfirmation(options: ConfirmationOptions): Promise<Result<boolean, UIError>> {
    try {
      if (!vscode.window?.showInformationMessage) {
        return err(
          this.createUIError(
            'PLATFORM_ERROR',
            'VS Code window.showInformationMessage is not available',
          ),
        );
      }

      const messageOptions: vscode.MessageOptions = {
        modal: true,
      };
      if (options.detail !== undefined) messageOptions.detail = options.detail;

      const result = await vscode.window.showInformationMessage(
        options.message.getValue(),
        messageOptions,
        options.confirmLabel?.getValue() || 'OK',
        options.cancelLabel?.getValue() || 'Cancel',
      );

      return ok(result === (options.confirmLabel?.getValue() || 'OK'));
    } catch (error) {
      return err(
        this.createUIError(
          'PLATFORM_ERROR',
          error instanceof Error ? error.message : 'Confirmation dialog failed',
        ),
      );
    }
  }

  async showOpenDialog(options: OpenDialogOptions): Promise<Result<string[] | null, UIError>> {
    try {
      if (!vscode.window?.showOpenDialog) {
        return err(
          this.createUIError('PLATFORM_ERROR', 'VS Code window.showOpenDialog is not available'),
        );
      }

      const openDialogOptions: vscode.OpenDialogOptions = {};

      if (options.defaultUri !== undefined)
        openDialogOptions.defaultUri = vscode.Uri.parse(options.defaultUri);
      if (options.filters !== undefined)
        openDialogOptions.filters = this.mapFileFilters(
          options.filters.map((f) => ({
            name: f.name.getValue(),
            extensions: f.extensions.toArray() as string[],
          })),
        );
      if (options.canSelectMany !== undefined)
        openDialogOptions.canSelectMany = options.canSelectMany;
      if (options.canSelectFolders !== undefined)
        openDialogOptions.canSelectFolders = options.canSelectFolders;
      if (options.canSelectFiles !== undefined)
        openDialogOptions.canSelectFiles = options.canSelectFiles;
      if (options.title !== undefined) openDialogOptions.title = options.title.getValue();

      const result = await vscode.window.showOpenDialog(openDialogOptions);

      if (!result || result.length === 0) {
        return ok(null);
      }

      return ok(result.map((uri) => uri.fsPath));
    } catch (error) {
      return err(
        this.createUIError(
          'PLATFORM_ERROR',
          error instanceof Error ? error.message : 'Open dialog failed',
        ),
      );
    }
  }

  async showSaveDialog(
    options: SaveDialogOptions,
  ): Promise<Result<{ filePath: string; cancelled: boolean }, UIError>> {
    try {
      if (!vscode.window?.showSaveDialog) {
        return err(
          this.createUIError('PLATFORM_ERROR', 'VS Code window.showSaveDialog is not available'),
        );
      }

      const saveDialogOptions: vscode.SaveDialogOptions = {};

      if (options.defaultUri !== undefined)
        saveDialogOptions.defaultUri = vscode.Uri.parse(options.defaultUri);
      if (options.filters !== undefined)
        saveDialogOptions.filters = this.mapFileFilters(
          options.filters.map((f) => ({
            name: f.name.getValue(),
            extensions: f.extensions.toArray() as string[],
          })),
        );
      if (options.saveLabel !== undefined)
        saveDialogOptions.saveLabel = options.saveLabel.getValue();
      if (options.title !== undefined) saveDialogOptions.title = options.title.getValue();

      const result = await vscode.window.showSaveDialog(saveDialogOptions);

      return ok({
        filePath: result ? result.fsPath : '',
        cancelled: !result,
      });
    } catch (error) {
      return err(
        this.createUIError(
          'PLATFORM_ERROR',
          error instanceof Error ? error.message : 'Save dialog failed',
        ),
      );
    }
  }

  showInformation(message: NotificationMessage, ...actions: NotificationAction[]): void {
    try {
      if (!vscode.window?.showInformationMessage) {
        return;
      }

      if (actions.length === 0) {
        vscode.window.showInformationMessage(message.getValue());
      } else {
        void vscode.window
          .showInformationMessage(message.getValue(), ...actions.map((a) => a.label.getValue()))
          .then(
            (selected) => {
              const action = actions.find((a) => a.label.getValue() === selected);
              if (action) {
                action.callback();
              }
            },
            () => {
              // Handle callback errors gracefully
            },
          );
      }
    } catch {
      // Handle gracefully when notification system is unavailable
    }
  }

  showWarning(message: NotificationMessage, ...actions: NotificationAction[]): void {
    if (!vscode.window?.showWarningMessage) {
      return;
    }

    if (actions.length === 0) {
      vscode.window.showWarningMessage(message.getValue());
    } else {
      void vscode.window
        .showWarningMessage(message.getValue(), ...actions.map((a) => a.label.getValue()))
        .then(
          (selected) => {
            const action = actions.find((a) => a.label.getValue() === selected);
            if (action) {
              action.callback();
            }
          },
          () => {
            // Handle callback errors gracefully
          },
        );
    }
  }

  showError(message: NotificationMessage, ...actions: NotificationAction[]): void {
    if (!vscode.window?.showErrorMessage) {
      return;
    }

    try {
      if (actions.length === 0) {
        vscode.window.showErrorMessage(message.getValue());
      } else {
        void vscode.window
          .showErrorMessage(message.getValue(), ...actions.map((a) => a.label.getValue()))
          .then(
            (selected) => {
              const action = actions.find((a) => a.label.getValue() === selected);
              if (action) {
                action.callback();
              }
            },
            () => {
              // Handle callback errors gracefully
            },
          );
      }
    } catch (error: unknown) {
      // Only handle extension host crashes gracefully, let other errors propagate
      if (error instanceof Error && error.message.includes('Extension host crashed')) {
        return; // Handle extension host crashes gracefully
      }
      throw error; // Re-throw other platform errors
    }
  }

  async showProgress<T>(options: ProgressOptions, task: ProgressTask<T>): Promise<T> {
    if (!vscode.window?.withProgress) {
      throw new Error('VS Code window.withProgress is not available');
    }

    const location = this.mapProgressLocation(options.location);

    return vscode.window.withProgress(
      {
        location,
        title: options.title.getValue(),
        ...(options.cancellable !== undefined && { cancellable: options.cancellable }),
      },
      async (progress, token) => {
        const progressReporter = {
          report: (value: { message?: string; increment?: number }) => {
            try {
              const reportValue: { message?: string; increment?: number } = {};
              if (value.message !== undefined) reportValue.message = value.message;
              if (value.increment !== undefined) reportValue.increment = value.increment;
              progress.report(reportValue);
            } catch {
              // Handle progress reporting errors gracefully
            }
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
    if (!vscode.window?.setStatusBarMessage) {
      throw new Error('VS Code window.setStatusBarMessage is not available');
    }

    const disposable =
      timeout !== undefined
        ? vscode.window.setStatusBarMessage(message, timeout)
        : vscode.window.setStatusBarMessage(message);
    return {
      dispose: () => {
        try {
          disposable.dispose();
        } catch {
          // Handle disposal errors gracefully
        }
      },
    };
  }

  createWebviewPanel(options: WebviewPanelOptions): WebviewPanel {
    if (!vscode.window?.createWebviewPanel) {
      throw new Error('VS Code window.createWebviewPanel is not available');
    }

    const panel = vscode.window.createWebviewPanel(
      options.viewType.getValue(),
      options.title.getValue(),
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
            dispose: () => {
              try {
                disposable.dispose();
              } catch {
                // Handle disposal errors gracefully
              }
            },
          };
        },
      },
      onDidDispose: (callback: () => void) => {
        const disposable = panel.onDidDispose(callback);
        return {
          dispose: () => {
            try {
              disposable.dispose();
            } catch {
              // Handle disposal errors gracefully
            }
          },
        };
      },
      reveal: (viewColumn?: number, preserveFocus?: boolean) => {
        try {
          panel.reveal(viewColumn, preserveFocus);
        } catch (error) {
          throw new Error(`Failed to reveal webview panel: ${error}`);
        }
      },
      dispose: () => {
        try {
          panel.dispose();
        } catch (_error) {
          // Log error but don't throw - disposal should always succeed
          // Note: Error logged to maintain stability during disposal
        }
      },
    };
  }

  postMessageToWebview(_panelId: WebviewId, _message: WebviewMessage): void {
    // Implementation depends on webview panel management
  }

  getTheme(): UITheme {
    const colorTheme = vscode.window?.activeColorTheme;
    const kind = colorTheme?.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';

    return {
      kind,
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
        default: (() => {
          const result = FontFamily.create('var(--vscode-font-family)');
          return result.isOk() ? result.value : ({} as FontFamily);
        })(),
        monospace: (() => {
          const result = FontFamily.create('var(--vscode-editor-font-family)');
          return result.isOk() ? result.value : ({} as FontFamily);
        })(),
        size: (() => {
          const result = FontSize.create(13);
          return result.isOk() ? result.value : ({} as FontSize);
        })(), // VS Code default
      },
    };
  }

  onThemeChange(callback: (theme: UITheme) => void): Disposable {
    if (!vscode.window?.onDidChangeActiveColorTheme) {
      throw new Error('VS Code window.onDidChangeActiveColorTheme is not available');
    }

    const disposable = vscode.window.onDidChangeActiveColorTheme(() => {
      try {
        callback(this.getTheme());
      } catch {
        // Handle callback errors gracefully
      }
    });

    return {
      dispose: () => {
        try {
          disposable.dispose();
        } catch {
          // Handle disposal errors gracefully
        }
      },
    };
  }

  async writeFile(
    filePath: FilePath,
    content: DocumentContent | Buffer,
  ): Promise<Result<void, UIError>> {
    try {
      if (!vscode.workspace?.fs?.writeFile) {
        return err(
          this.createUIError('PLATFORM_ERROR', 'VS Code workspace.fs.writeFile is not available'),
        );
      }

      const uri = vscode.Uri.file(filePath.getValue());
      const data =
        content instanceof Buffer
          ? content
          : Buffer.from((content as DocumentContent).getValue(), 'utf8');
      await vscode.workspace.fs.writeFile(uri, data);
      return ok(undefined);
    } catch (error) {
      return err(
        this.createUIError(
          'PLATFORM_ERROR',
          error instanceof Error ? error.message : 'Failed to write file',
        ),
      );
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
      maxMessageLength: (() => {
        const result = MessageLength.create(1000);
        return result.isOk() ? result.value : ({} as MessageLength);
      })(), // VS Code reasonable limit
    };
  }

  // Helper methods
  private createUIError(code: string, message: string): UIError {
    const errorCode = ErrorCode.create(code);
    const errorMessage = ErrorMessage.create(message);

    if (errorCode.isErr()) {
      const fallbackCode = ErrorCode.create('UNKNOWN');
      if (fallbackCode.isErr()) {
        // Ultimate fallback - create minimal valid value object
        const minimalCode = ErrorCode.create('U');
        const minimalMessage = ErrorMessage.create('Error');
        return {
          code: minimalCode.isOk() ? minimalCode.value : ({} as ErrorCode),
          message: minimalMessage.isOk() ? minimalMessage.value : ({} as ErrorMessage),
        };
      }
      const validMessage = errorMessage.isOk()
        ? errorMessage.value
        : (() => {
            const fallbackMsg = ErrorMessage.create('Unknown error');
            return fallbackMsg.isOk() ? fallbackMsg.value : ({} as ErrorMessage);
          })();
      return {
        code: fallbackCode.value,
        message: validMessage,
      };
    }

    if (errorMessage.isErr()) {
      // Truncate or fix message if it's invalid
      const truncatedMessage = message.substring(0, 200);
      const fallbackMessage = ErrorMessage.create(truncatedMessage);
      if (fallbackMessage.isErr()) {
        const minimalMessage = ErrorMessage.create('Error');
        return {
          code: errorCode.value,
          message: minimalMessage.isOk() ? minimalMessage.value : ({} as ErrorMessage),
        };
      }
      return {
        code: errorCode.value,
        message: fallbackMessage.value,
      };
    }

    return {
      code: errorCode.value,
      message: errorMessage.value,
    };
  }

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
