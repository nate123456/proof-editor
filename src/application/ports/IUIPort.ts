import type { Result } from 'neverthrow';
import type {
  ActionLabel,
  DialogPrompt,
  DialogTitle,
  DocumentContent,
  ErrorCode,
  ErrorMessage,
  EventData,
  FileExtensionList,
  FilePath,
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
} from '../../domain/shared/value-objects/index.js';

export interface IUIPort {
  // Dialogs
  showInputBox(options: InputBoxOptions): Promise<Result<string | null, UIError>>;
  showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: QuickPickOptions,
  ): Promise<Result<T | null, UIError>>;
  showConfirmation(options: ConfirmationOptions): Promise<Result<boolean, UIError>>;
  showOpenDialog(options: OpenDialogOptions): Promise<Result<string[] | null, UIError>>;
  showSaveDialog(
    options: SaveDialogOptions,
  ): Promise<Result<{ filePath: string; cancelled: boolean }, UIError>>;

  // File operations
  writeFile(filePath: FilePath, content: DocumentContent | Buffer): Promise<Result<void, UIError>>;

  // Notifications
  showInformation(message: NotificationMessage, ...actions: NotificationAction[]): void;
  showWarning(message: NotificationMessage, ...actions: NotificationAction[]): void;
  showError(message: NotificationMessage, ...actions: NotificationAction[]): void;
  showProgress<T>(options: ProgressOptions, task: ProgressTask<T>): Promise<T>;
  setStatusMessage(message: string, timeout?: number): Disposable;

  // Webview/Panel rendering
  createWebviewPanel(options: WebviewPanelOptions): WebviewPanel;
  postMessageToWebview(panelId: WebviewId, message: WebviewMessage): void;

  // Theme support
  getTheme(): UITheme;
  onThemeChange(callback: (theme: UITheme) => void): Disposable;

  // Platform capabilities
  capabilities(): UICapabilities;
}

// Webview message types
export interface WebviewMessage {
  type: MessageType;
  content?: MessageContent;
  data?: EventData;
}

export interface WebviewTreeMessage extends WebviewMessage {
  type: MessageType.UPDATE_TREE;
  content: MessageContent;
}

export interface WebviewErrorMessage extends WebviewMessage {
  type: MessageType.SHOW_ERROR;
  content: MessageContent;
}

// Dialog types
export interface InputBoxOptions {
  title?: DialogTitle;
  prompt: DialogPrompt;
  value?: string;
  placeholder?: PlaceholderText;
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
  title?: DialogTitle;
  placeHolder?: PlaceholderText;
  canPickMany?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
}

export interface ConfirmationOptions {
  title: DialogTitle;
  message: ErrorMessage;
  detail?: string;
  confirmLabel?: ActionLabel;
  cancelLabel?: ActionLabel;
  isDestructive?: boolean;
}

export interface OpenDialogOptions {
  defaultUri?: string;
  filters?: FileFilter[];
  canSelectMany?: boolean;
  canSelectFolders?: boolean;
  canSelectFiles?: boolean;
  title?: DialogTitle;
}

export interface SaveDialogOptions {
  defaultUri?: string;
  defaultFilename?: string;
  filters?: FileFilter[];
  saveLabel?: ActionLabel;
  title?: DialogTitle;
}

export interface FileFilter {
  name: FilterName;
  extensions: FileExtensionList;
}

// Notification types
export interface NotificationAction {
  label: ActionLabel;
  callback(): void;
}

export interface ProgressOptions {
  title: DialogTitle;
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
  id: WebviewId;
  title: DialogTitle;
  viewType: ViewType;
  showOptions?: {
    viewColumn?: number;
    preserveFocus?: boolean;
  };
  retainContextWhenHidden?: boolean;
  enableScripts?: boolean;
}

export interface WebviewPanel {
  id: WebviewId;
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
    default: FontFamily;
    monospace: FontFamily;
    size: FontSize;
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
  maxMessageLength?: MessageLength;
}

// Error types
export interface UIError {
  code: ErrorCode;
  message: ErrorMessage;
}

// Utility types
export interface Disposable {
  dispose(): void;
}
