import type { Result } from 'neverthrow';

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
