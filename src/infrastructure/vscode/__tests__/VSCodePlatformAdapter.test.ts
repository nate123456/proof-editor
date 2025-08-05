import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { VSCodePlatformAdapter } from '../VSCodePlatformAdapter.js';

// Mock vscode module
vi.mock('vscode', () => ({
  version: '1.74.0',
  env: {
    openExternal: vi.fn(),
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn(),
    },
  },
  Uri: {
    parse: vi.fn().mockImplementation((url: string) => ({
      scheme: 'https',
      authority: 'example.com',
      path: '/',
      query: '',
      fragment: '',
      toString: () => url,
    })),
  },
  window: {
    activeColorTheme: { kind: 1 },
  },
  ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
}));

// Mock process.platform and process.arch
const originalPlatform = process.platform;
const originalArch = process.arch;
const originalEnv = process.env;

describe('VSCodePlatformAdapter', () => {
  let adapter: VSCodePlatformAdapter;
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
      },
      subscriptions: [],
    };
    adapter = new VSCodePlatformAdapter(mockContext);
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    Object.defineProperty(process, 'arch', { value: originalArch });
    process.env = originalEnv;
  });

  describe('getPlatformInfo', () => {
    test('returns VS Code platform info', () => {
      const info = adapter.getPlatformInfo();

      expect(info.type).toBe('vscode');
      expect(info.version.getValue()).toBe('1.74.0');
      expect(info.os).toMatch(/windows|macos|linux/);
      expect(info.arch.getValue()).toBeTruthy();
      expect(info.isDebug).toBe(false);
    });

    test('detects Windows platform correctly', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const adapter = new VSCodePlatformAdapter(mockContext);

      const info = adapter.getPlatformInfo();
      expect(info.os).toBe('windows');
    });

    test('detects macOS platform correctly', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const adapter = new VSCodePlatformAdapter(mockContext);

      const info = adapter.getPlatformInfo();
      expect(info.os).toBe('macos');
    });

    test('detects Linux platform correctly', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const adapter = new VSCodePlatformAdapter(mockContext);

      const info = adapter.getPlatformInfo();
      expect(info.os).toBe('linux');
    });

    test('defaults to linux for unknown platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'unknown' });
      const adapter = new VSCodePlatformAdapter(mockContext);

      const info = adapter.getPlatformInfo();
      expect(info.os).toBe('linux');
    });

    test('detects debug mode from NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      const adapter = new VSCodePlatformAdapter(mockContext);

      const info = adapter.getPlatformInfo();
      expect(info.isDebug).toBe(true);
    });
  });

  describe('getInputCapabilities', () => {
    test('returns desktop input capabilities', () => {
      const caps = adapter.getInputCapabilities();

      expect(caps.hasKeyboard).toBe(true);
      expect(caps.hasMouse).toBe(true);
      expect(caps.hasTouch).toBe(false);
      expect(caps.hasPen).toBe(false);
      expect(caps.primaryInput).toBe('keyboard');
    });
  });

  describe('getDisplayCapabilities', () => {
    test('returns default display capabilities', () => {
      const caps = adapter.getDisplayCapabilities();

      expect(caps.screenDimensions.getWidth()).toBe(1920);
      expect(caps.screenDimensions.getHeight()).toBe(1080);
      expect(caps.devicePixelRatio).toBe(1);
      expect(caps.colorDepth).toBe(24);
      expect(typeof caps.isHighContrast).toBe('boolean');
      expect(caps.prefersReducedMotion).toBe(false);
    });

    test('detects high contrast theme', async () => {
      const vscode = await import('vscode');

      // Temporarily modify the mock's activeColorTheme to use high contrast
      const originalKind = vscode.window.activeColorTheme.kind;
      Object.defineProperty(vscode.window.activeColorTheme, 'kind', {
        value: 3, // HighContrast = 3
        writable: true,
        configurable: true,
      });

      const adapter = new VSCodePlatformAdapter(mockContext);

      const caps = adapter.getDisplayCapabilities();
      expect(caps.isHighContrast).toBe(true);

      // Restore original value
      Object.defineProperty(vscode.window.activeColorTheme, 'kind', {
        value: originalKind,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('isFeatureAvailable', () => {
    test('returns true for supported features', () => {
      expect(adapter.isFeatureAvailable('file-system')).toBe(true);
      expect(adapter.isFeatureAvailable('clipboard')).toBe(true);
      expect(adapter.isFeatureAvailable('notifications')).toBe(true);
      expect(adapter.isFeatureAvailable('external-links')).toBe(true);
      expect(adapter.isFeatureAvailable('offline-storage')).toBe(true);
      expect(adapter.isFeatureAvailable('webviews')).toBe(true);
      expect(adapter.isFeatureAvailable('keyboard-shortcuts')).toBe(true);
    });

    test('returns false for unsupported features', () => {
      expect(adapter.isFeatureAvailable('touch-gestures')).toBe(false);
    });

    test('returns false for unknown features', () => {
      expect(adapter.isFeatureAvailable('unknown-feature' as any)).toBe(false);
    });
  });

  describe('openExternal', () => {
    test('opens external URL successfully', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.openExternal).mockResolvedValue(true);

      const result = await adapter.openExternal('https://example.com');

      expect(result.isOk()).toBe(true);
      expect(vscode.Uri.parse).toHaveBeenCalledWith('https://example.com');
      expect(vscode.env.openExternal).toHaveBeenCalledWith(expect.objectContaining({}));
    });

    test('returns error when opening external URL fails', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.openExternal).mockRejectedValue(new Error('Failed to open'));

      const result = await adapter.openExternal('https://example.com');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
        expect(result.error.message.getValue()).toBe('Failed to open');
      }
    });
  });

  describe('copyToClipboard', () => {
    test('copies text successfully', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.clipboard.writeText).mockResolvedValue(undefined);

      const result = await adapter.copyToClipboard('test text');

      expect(result.isOk()).toBe(true);
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('test text');
    });

    test('returns error when copy fails', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.clipboard.writeText).mockRejectedValue(new Error('Copy failed'));

      const result = await adapter.copyToClipboard('test text');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
        expect(result.error.message.getValue()).toBe('Copy failed');
      }
    });
  });

  describe('readFromClipboard', () => {
    test('reads text successfully', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('clipboard content');

      const result = await adapter.readFromClipboard();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('clipboard content');
      }
    });

    test('returns null for empty clipboard', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.clipboard.readText).mockResolvedValue('');

      const result = await adapter.readFromClipboard();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(null);
      }
    });

    test('returns error when read fails', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.clipboard.readText).mockRejectedValue(new Error('Read failed'));

      const result = await adapter.readFromClipboard();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
        expect(result.error.message.getValue()).toBe('Read failed');
      }
    });
  });

  describe('onWillTerminate', () => {
    test('registers termination callback', () => {
      const callback = vi.fn();

      const disposable = adapter.onWillTerminate(callback);

      expect(disposable).toHaveProperty('dispose');
      expect(mockContext.subscriptions).toContain(disposable);
    });

    test('disposable can be disposed', () => {
      const callback = vi.fn();

      const disposable = adapter.onWillTerminate(callback);

      expect(() => disposable.dispose()).not.toThrow();
    });
  });

  describe('preventTermination', () => {
    test('logs reason and returns disposable', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Mock implementation for test
      });

      const disposable = adapter.preventTermination('test reason');

      expect(disposable).toHaveProperty('dispose');
      expect(() => disposable.dispose()).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('storage operations', () => {
    test('gets storage value successfully', async () => {
      mockContext.globalState.get.mockReturnValue('stored value');

      const result = await adapter.getStorageValue('test-key');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('stored value');
      }
      expect(mockContext.globalState.get).toHaveBeenCalledWith('test-key');
    });

    test('gets storage value with default', async () => {
      mockContext.globalState.get.mockReturnValue('default value');

      const result = await adapter.getStorageValue('test-key', 'default value');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('default value');
      }
      expect(mockContext.globalState.get).toHaveBeenCalledWith('test-key', 'default value');
    });

    test('returns error when get storage fails', async () => {
      mockContext.globalState.get.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await adapter.getStorageValue('test-key');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
        expect(result.error.message.getValue()).toBe('Storage error');
      }
    });

    test('sets storage value successfully', async () => {
      mockContext.globalState.update.mockResolvedValue(undefined);

      const result = await adapter.setStorageValue('test-key', 'new value');

      expect(result.isOk()).toBe(true);
      expect(mockContext.globalState.update).toHaveBeenCalledWith('test-key', 'new value');
    });

    test('returns error when set storage fails', async () => {
      mockContext.globalState.update.mockRejectedValue(new Error('Update failed'));

      const result = await adapter.setStorageValue('test-key', 'new value');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
        expect(result.error.message.getValue()).toBe('Update failed');
      }
    });

    test('deletes storage value successfully', async () => {
      mockContext.globalState.update.mockResolvedValue(undefined);

      const result = await adapter.deleteStorageValue('test-key');

      expect(result.isOk()).toBe(true);
      expect(mockContext.globalState.update).toHaveBeenCalledWith('test-key', undefined);
    });

    test('returns error when delete storage fails', async () => {
      mockContext.globalState.update.mockRejectedValue(new Error('Delete failed'));

      const result = await adapter.deleteStorageValue('test-key');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code.getValue()).toBe('PLATFORM_ERROR');
        expect(result.error.message.getValue()).toBe('Delete failed');
      }
    });
  });

  describe('detectOS method', () => {
    test('handles all platform cases', () => {
      // Test each platform directly by creating new instances
      Object.defineProperty(process, 'platform', { value: 'win32' });
      let adapter = new VSCodePlatformAdapter(mockContext);
      expect(adapter.getPlatformInfo().os).toBe('windows');

      Object.defineProperty(process, 'platform', { value: 'darwin' });
      adapter = new VSCodePlatformAdapter(mockContext);
      expect(adapter.getPlatformInfo().os).toBe('macos');

      Object.defineProperty(process, 'platform', { value: 'linux' });
      adapter = new VSCodePlatformAdapter(mockContext);
      expect(adapter.getPlatformInfo().os).toBe('linux');

      Object.defineProperty(process, 'platform', { value: 'freebsd' });
      adapter = new VSCodePlatformAdapter(mockContext);
      expect(adapter.getPlatformInfo().os).toBe('linux'); // fallback
    });
  });

  describe('error handling', () => {
    test('handles non-Error objects in clipboard operations', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.clipboard.writeText).mockRejectedValue('string error');

      const result = await adapter.copyToClipboard('test');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message.getValue()).toBe('Failed to copy to clipboard');
      }
    });

    test('handles non-Error objects in external URL opening', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.openExternal).mockRejectedValue('string error');

      const result = await adapter.openExternal('https://example.com');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message.getValue()).toBe('Failed to open external URL');
      }
    });

    test('handles non-Error objects in storage operations', async () => {
      mockContext.globalState.update.mockRejectedValue('string error');

      const result = await adapter.setStorageValue('key', 'value');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message.getValue()).toBe('Failed to set storage value');
      }
    });
  });
});
