// Platform Abstraction Interfaces
// These ports define contracts that infrastructure must implement
// to support multiple platforms (VS Code, mobile, web, desktop)

// File System Operations
// Common Types
export type {
  Disposable,
  DocumentMetadata,
  FileChangeEvent,
  FileInfo,
  FileSystemCapabilities,
  FileSystemError,
  IFileSystemPort,
  StoredDocument,
} from './IFileSystemPort.js';

// Platform Capabilities and Utilities
export type {
  DisplayCapabilities,
  InputCapabilities,
  IPlatformPort,
  PlatformError,
  PlatformFeature,
  PlatformInfo,
} from './IPlatformPort.js';
// User Interface Operations
export type {
  CancellationToken,
  ConfirmationOptions,
  FileFilter,
  InputBoxOptions,
  IUIPort,
  NotificationAction,
  OpenDialogOptions,
  Progress,
  ProgressOptions,
  ProgressReport,
  ProgressTask,
  QuickPickItem,
  QuickPickOptions,
  SaveDialogOptions,
  UICapabilities,
  UIError,
  UITheme,
  WebviewErrorMessage,
  WebviewMessage,
  WebviewPanel,
  WebviewPanelOptions,
  WebviewTreeMessage,
} from './IUIPort.js';
