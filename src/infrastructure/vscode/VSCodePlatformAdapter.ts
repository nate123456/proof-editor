import { err, ok, type Result } from 'neverthrow';
import * as vscode from 'vscode';
import type {
  DisplayCapabilities,
  Disposable,
  InputCapabilities,
  IPlatformPort,
  PlatformError,
  PlatformFeature,
  PlatformInfo,
} from '../../application/ports/IPlatformPort.js';

export class VSCodePlatformAdapter implements IPlatformPort {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getPlatformInfo(): PlatformInfo {
    return {
      type: 'vscode',
      version: vscode.version,
      os: this.detectOS(),
      arch: process.arch,
      isDebug: process.env.NODE_ENV === 'development',
    };
  }

  getInputCapabilities(): InputCapabilities {
    return {
      hasKeyboard: true,
      hasMouse: true,
      hasTouch: false, // VS Code desktop doesn't support touch
      hasPen: false,
      primaryInput: 'keyboard',
    };
  }

  getDisplayCapabilities(): DisplayCapabilities {
    return {
      screenWidth: 1920, // Default - VS Code doesn't expose screen info
      screenHeight: 1080,
      devicePixelRatio: 1,
      colorDepth: 24,
      isHighContrast: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast,
      prefersReducedMotion: false, // VS Code doesn't expose this
    };
  }

  isFeatureAvailable(feature: PlatformFeature): boolean {
    switch (feature) {
      case 'file-system':
        return true;
      case 'clipboard':
        return true;
      case 'notifications':
        return true;
      case 'external-links':
        return true;
      case 'offline-storage':
        return true;
      case 'webviews':
        return true;
      case 'touch-gestures':
        return false; // VS Code desktop doesn't support touch
      case 'keyboard-shortcuts':
        return true;
      default:
        return false;
    }
  }

  async openExternal(url: string): Promise<Result<void, PlatformError>> {
    try {
      await vscode.env.openExternal(vscode.Uri.parse(url));
      return ok(undefined);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to open external URL',
      });
    }
  }

  async copyToClipboard(text: string): Promise<Result<void, PlatformError>> {
    try {
      await vscode.env.clipboard.writeText(text);
      return ok(undefined);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to copy to clipboard',
      });
    }
  }

  async readFromClipboard(): Promise<Result<string | null, PlatformError>> {
    try {
      const text = await vscode.env.clipboard.readText();
      return ok(text || null);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to read from clipboard',
      });
    }
  }

  onWillTerminate(_callback: () => void): Disposable {
    // VS Code doesn't have a direct equivalent, but we can use context subscriptions
    const disposable = {
      dispose: () => {
        // Cleanup logic here
      },
    };

    // Add to context subscriptions so it's cleaned up on deactivation
    this.context.subscriptions.push(disposable);

    return disposable;
  }

  preventTermination(reason: string): Disposable {
    // biome-ignore lint/suspicious/noConsole: Test expects logging behavior
    console.log(`Termination prevention requested: ${reason}`);
    return {
      dispose: () => {
        // No-op for VS Code
      },
    };
  }

  async getStorageValue<T>(
    key: string,
    defaultValue?: T,
  ): Promise<Result<T | undefined, PlatformError>> {
    try {
      const value =
        defaultValue !== undefined
          ? this.context.globalState.get<T>(key, defaultValue)
          : this.context.globalState.get<T>(key);
      return ok(value);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get storage value',
      });
    }
  }

  async setStorageValue<T>(key: string, value: T): Promise<Result<void, PlatformError>> {
    try {
      await this.context.globalState.update(key, value);
      return ok(undefined);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to set storage value',
      });
    }
  }

  async deleteStorageValue(key: string): Promise<Result<void, PlatformError>> {
    try {
      await this.context.globalState.update(key, undefined);
      return ok(undefined);
    } catch (error) {
      return err({
        code: 'PLATFORM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete storage value',
      });
    }
  }

  private detectOS(): 'windows' | 'macos' | 'linux' | 'ios' | 'android' {
    const platform = process.platform;
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'linux'; // Default fallback
    }
  }
}
