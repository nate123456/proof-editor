import type { Result } from 'neverthrow';

export interface IUIPort {
  // Dialogs
  showInputBox(options: InputBoxOptions): Promise<Result<string | null, UIError>>;
  showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: QuickPickOptions,
  ): Promise<Result<T | null, UIError>>;
  showConfirmation(options: ConfirmationOptions): Promise<Result<boolean, UIError>>;
  showOpenDialog(options: OpenDialogOptions): Promise<Result<string[] | null, UIError>>;
  showSaveDialog(options: SaveDialogOptions): Promise<Result<string | null, UIError>>;

  // Notifications
  showInformation(message: string, ...actions: NotificationAction[]): void;
  showWarning(message: string, ...actions: NotificationAction[]): void;
  showError(message: string, ...actions: NotificationAction[]): void;
  showProgress<T>(options: ProgressOptions, task: ProgressTask<T>): Promise<T>;
  setStatusMessage(message: string, timeout?: number): Disposable;

  // Webview/Panel rendering
  createWebviewPanel(options: WebviewPanelOptions): WebviewPanel;
  postMessageToWebview(panelId: string, message: WebviewMessage): void;

  // Theme support
  getTheme(): UITheme;
  onThemeChange(callback: (theme: UITheme) => void): Disposable;

  // Platform capabilities
  capabilities(): UICapabilities;
}

// Webview message types
export interface WebviewMessage {
  type: string;
  content?: string;
  [key: string]: unknown;
}

export interface WebviewTreeMessage extends WebviewMessage {
  type: 'updateTree';
  content: string;
}

export interface WebviewErrorMessage extends WebviewMessage {
  type: 'showError';
  content: string;
}

// Dialog types
export interface InputBoxOptions {
  title?: string;
  prompt: string;
  value?: string;
  placeholder?: string;
  password?: boolean;
  validateInput?(value: string): string | null; // null = valid
}

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
}

export interface QuickPickOptions {
  title?: string;
  placeHolder?: string;
  canPickMany?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
}

export interface ConfirmationOptions {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export interface OpenDialogOptions {
  defaultUri?: string;
  filters?: FileFilter[];
  canSelectMany?: boolean;
  canSelectFolders?: boolean;
  canSelectFiles?: boolean;
  title?: string;
}

export interface SaveDialogOptions {
  defaultUri?: string;
  filters?: FileFilter[];
  saveLabel?: string;
  title?: string;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

// Notification types
export interface NotificationAction {
  label: string;
  callback(): void;
}

export interface ProgressOptions {
  title: string;
  location?: 'notification' | 'statusbar' | 'dialog';
  cancellable?: boolean;
}

export type ProgressTask<T> = (progress: Progress, token: CancellationToken) => Promise<T>;

export interface Progress {
  report(value: ProgressReport): void;
}

export interface ProgressReport {
  message?: string;
  increment?: number;
}

export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly onCancellationRequested: (listener: () => void) => Disposable;
}

// Webview types
export interface WebviewPanelOptions {
  id: string;
  title: string;
  viewType: string;
  showOptions?: {
    viewColumn?: number;
    preserveFocus?: boolean;
  };
  retainContextWhenHidden?: boolean;
  enableScripts?: boolean;
}

export interface WebviewPanel {
  id: string;
  webview: {
    html: string;
    onDidReceiveMessage(callback: (message: WebviewMessage) => void): Disposable;
  };
  onDidDispose(callback: () => void): Disposable;
  reveal(viewColumn?: number, preserveFocus?: boolean): void;
  dispose(): void;
}

// Theme types
export interface UITheme {
  kind: 'light' | 'dark' | 'high-contrast';
  colors: Record<string, string>;
  fonts: {
    default: string;
    monospace: string;
    size: number;
  };
}

// Capabilities
export interface UICapabilities {
  supportsFileDialogs: boolean;
  supportsNotificationActions: boolean;
  supportsProgress: boolean;
  supportsStatusBar: boolean;
  supportsWebviews: boolean;
  supportsThemes: boolean;
  maxMessageLength?: number;
}

// Error types
export interface UIError {
  code: 'CANCELLED' | 'INVALID_INPUT' | 'PLATFORM_ERROR' | 'NOT_SUPPORTED';
  message: string;
}

// Utility types
export interface Disposable {
  dispose(): void;
}
