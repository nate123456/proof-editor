# Task I0: Platform Abstraction Interfaces

## Status
- **Phase**: 3 - Infrastructure Layer (But define interfaces first!)
- **Priority**: Critical (Enables multi-platform support)
- **Estimated Effort**: 2-3 hours (simplified from 3-4)
- **Dependencies**: None (interfaces only)
- **Blocks**: All infrastructure implementations
- **COMPLETED**: ✅ All 3 platform ports implemented with comprehensive tests

## Goal
Define simplified platform abstraction interfaces that allow the application to run on VS Code, React Native, and future platforms without changing core logic. Based on audit feedback, reduce from 7 ports to 3-4 essential ones.

## Context
From CLAUDE.md: "Platform Strategy: Leverage First, Build Second" and "Multi-Platform: 90%+ code reuse via platform abstraction"

These interfaces are contracts that infrastructure must implement. They belong in the Application layer (ports) but are implemented in Infrastructure (adapters).

## Design Simplification
Based on audit feedback, we're reducing complexity:
- **Original**: 7 ports (over-engineered)
- **Simplified**: 3 essential ports
- **Principle**: Only abstract what's truly platform-specific
- **Validation**: Moved to application layer (not platform-specific)

## Port Architecture Summary

The platform abstraction layer consists of **3 essential ports** that provide clean separation between application logic and platform-specific implementations:

1. **IFileSystemPort**: Handles all file operations including offline storage
2. **IUIPort**: Combines all user interface operations (dialogs, notifications, webviews)
3. **IPlatformPort**: Provides platform capabilities detection and utilities

This simplified design replaces the original 7-port architecture, focusing only on truly platform-specific operations while moving domain concerns (like validation) to the application layer where they belong.

## Required Implementation

### 1. File System Port
Create `src/application/ports/IFileSystemPort.ts`:
```typescript
import { Result } from 'neverthrow';

export interface IFileSystemPort {
  // Basic file operations
  readFile(path: string): Promise<Result<string, FileSystemError>>;
  writeFile(path: string, content: string): Promise<Result<void, FileSystemError>>;
  exists(path: string): Promise<Result<boolean, FileSystemError>>;
  delete(path: string): Promise<Result<void, FileSystemError>>;
  
  // Directory operations
  readDirectory(path: string): Promise<Result<FileInfo[], FileSystemError>>;
  createDirectory(path: string): Promise<Result<void, FileSystemError>>;
  
  // Watch operations (optional - not all platforms support)
  watch?(path: string, callback: (event: FileChangeEvent) => void): Disposable;
  
  // Offline storage operations (for mobile support)
  getStoredDocument(id: string): Promise<Result<StoredDocument | null, FileSystemError>>;
  storeDocument(doc: StoredDocument): Promise<Result<void, FileSystemError>>;
  deleteStoredDocument(id: string): Promise<Result<void, FileSystemError>>;
  listStoredDocuments(): Promise<Result<DocumentMetadata[], FileSystemError>>;
  
  // Platform capabilities
  capabilities(): FileSystemCapabilities;
}

export interface FileInfo {
  path: string;
  name: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
}

export interface FileChangeEvent {
  type: 'created' | 'changed' | 'deleted';
  path: string;
}

export interface StoredDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  version: number;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  modifiedAt: Date;
  size: number;
  syncStatus?: 'local' | 'synced' | 'conflict';
}

export interface FileSystemCapabilities {
  canWatch: boolean;
  canAccessArbitraryPaths: boolean; // false on mobile
  maxFileSize?: number;
  supportsOfflineStorage: boolean;
  persistence: 'memory' | 'session' | 'permanent';
}

export interface FileSystemError {
  code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'DISK_FULL' | 'INVALID_PATH' | 'QUOTA_EXCEEDED' | 'UNKNOWN';
  message: string;
  path?: string;
}

export interface Disposable {
  dispose(): void;
}
```

### 2. UI Port (Combined Dialog, Notification, and Rendering)
Create `src/application/ports/IUIPort.ts`:
```typescript
import { Result } from 'neverthrow';

export interface IUIPort {
  // Dialogs
  showInputBox(options: InputBoxOptions): Promise<Result<string | null, UIError>>;
  showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: QuickPickOptions
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
  postMessageToWebview(panelId: string, message: any): void;
  
  // Theme support
  getTheme(): UITheme;
  onThemeChange(callback: (theme: UITheme) => void): Disposable;
  
  // Platform capabilities
  capabilities(): UICapabilities;
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

export interface ProgressTask<T> {
  (progress: Progress, token: CancellationToken): Promise<T>;
}

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
    onDidReceiveMessage(callback: (message: any) => void): Disposable;
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
```

### 3. Platform Capabilities Port
Create `src/application/ports/IPlatformPort.ts`:
```typescript
import { Result } from 'neverthrow';

export interface IPlatformPort {
  // Platform information
  getPlatformInfo(): PlatformInfo;
  
  // Input capabilities
  getInputCapabilities(): InputCapabilities;
  
  // Display capabilities
  getDisplayCapabilities(): DisplayCapabilities;
  
  // Feature detection
  isFeatureAvailable(feature: PlatformFeature): boolean;
  
  // Platform-specific operations
  openExternal(url: string): Promise<Result<void, PlatformError>>;
  copyToClipboard(text: string): Promise<Result<void, PlatformError>>;
  readFromClipboard(): Promise<Result<string | null, PlatformError>>;
  
  // Application lifecycle
  onWillTerminate(callback: () => void): Disposable;
  preventTermination(reason: string): Disposable;
  
  // Key-value storage (for settings, preferences)
  getStorageValue<T>(key: string, defaultValue?: T): Promise<Result<T | undefined, PlatformError>>;
  setStorageValue<T>(key: string, value: T): Promise<Result<void, PlatformError>>;
  deleteStorageValue(key: string): Promise<Result<void, PlatformError>>;
}

export interface PlatformInfo {
  type: 'vscode' | 'mobile' | 'web' | 'desktop';
  version: string;
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
  arch: string;
  isDebug: boolean;
}

export interface InputCapabilities {
  hasKeyboard: boolean;
  hasMouse: boolean;
  hasTouch: boolean;
  hasPen: boolean;
  primaryInput: 'keyboard' | 'touch' | 'mouse';
}

export interface DisplayCapabilities {
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  isHighContrast: boolean;
  prefersReducedMotion: boolean;
}

export type PlatformFeature = 
  | 'file-system'
  | 'clipboard'
  | 'notifications'
  | 'external-links'
  | 'offline-storage'
  | 'webviews'
  | 'touch-gestures'
  | 'keyboard-shortcuts';

export interface PlatformError {
  code: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'PLATFORM_ERROR';
  message: string;
}

export interface Disposable {
  dispose(): void;
}
```

## Testing Requirements

### Port Tests
```typescript
describe('Platform Port Contracts', () => {
  test('FileSystemPort handles all error cases', async () => {
    const mockPort: IFileSystemPort = createMockFileSystemPort();
    
    const result = await mockPort.readFile('/non/existent');
    expect(result.isErr()).toBe(true);
    expect(result.error.code).toBe('NOT_FOUND');
  });
  
  test('FileSystemPort supports offline storage', async () => {
    const mockPort: IFileSystemPort = createMockFileSystemPort();
    
    const doc: StoredDocument = {
      id: 'test-doc',
      content: 'test content',
      metadata: {
        id: 'test-doc',
        title: 'Test Document',
        modifiedAt: new Date(),
        size: 12,
        syncStatus: 'local'
      },
      version: 1
    };
    
    const storeResult = await mockPort.storeDocument(doc);
    expect(storeResult.isOk()).toBe(true);
    
    const getResult = await mockPort.getStoredDocument('test-doc');
    expect(getResult.isOk()).toBe(true);
    expect(getResult.value?.content).toBe('test content');
  });
  
  test('UIPort respects cancellation', async () => {
    const mockPort: IUIPort = createMockUIPort();
    
    const result = await mockPort.showInputBox({ prompt: 'Test' });
    // User cancels
    expect(result.isOk()).toBe(true);
    expect(result.value).toBeNull();
  });
  
  test('UIPort creates webview panels', () => {
    const mockPort: IUIPort = createMockUIPort();
    
    const panel = mockPort.createWebviewPanel({
      id: 'test-panel',
      title: 'Test Panel',
      viewType: 'proof.tree',
      enableScripts: true
    });
    
    expect(panel.id).toBe('test-panel');
    expect(panel.webview).toBeDefined();
  });
  
  test('PlatformPort correctly reports capabilities', () => {
    const mockPort: IPlatformPort = createMockPlatformPort('mobile');
    
    const info = mockPort.getPlatformInfo();
    expect(info.type).toBe('mobile');
    
    const input = mockPort.getInputCapabilities();
    expect(input.hasTouch).toBe(true);
    expect(input.primaryInput).toBe('touch');
  });
  
  test('PlatformPort handles storage operations', async () => {
    const mockPort: IPlatformPort = createMockPlatformPort('vscode');
    
    const setResult = await mockPort.setStorageValue('theme', 'dark');
    expect(setResult.isOk()).toBe(true);
    
    const getResult = await mockPort.getStorageValue<string>('theme');
    expect(getResult.isOk()).toBe(true);
    expect(getResult.value).toBe('dark');
  });
});
```

## Success Criteria
- [ ] All ports use Result types for error handling
- [ ] Only 3 essential ports (reduced from 7)
- [ ] Capabilities queryable for feature detection
- [ ] No platform-specific types in interfaces
- [ ] Disposable pattern for cleanup
- [ ] Async operations properly typed
- [ ] Error types cover all failure modes
- [ ] Optional features clearly marked
- [ ] Works for VS Code, mobile, and web
- [ ] Offline storage integrated into FileSystemPort
- [ ] UI operations combined into single port
- [ ] Validation moved to application layer

## Notes
- These are APPLICATION layer ports (not infrastructure)
- Infrastructure implements these interfaces
- Use Result<T, E> consistently
- Design for least common denominator
- But allow platform-specific enhancements
- Consider offline-first for all operations
- Touch must be first-class, not an afterthought
- Validation runtime is NOT platform-specific (moved to application layer)
- Storage port merged into FileSystemPort for simplicity
- UI operations (dialogs, notifications, webviews) combined into single UIPort