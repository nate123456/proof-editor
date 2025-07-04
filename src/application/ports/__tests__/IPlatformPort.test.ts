import { err, ok } from 'neverthrow';
import { describe, expect, test, vi } from 'vitest';
import type {
  DisplayCapabilities,
  Disposable,
  InputCapabilities,
  IPlatformPort,
  PlatformError,
  PlatformFeature,
  PlatformInfo,
} from '../IPlatformPort.js';

// Helper function to create a mock IPlatformPort
function createMockPlatformPort(): IPlatformPort {
  return {
    getPlatformInfo: vi.fn(),
    getInputCapabilities: vi.fn(),
    getDisplayCapabilities: vi.fn(),
    isFeatureAvailable: vi.fn(),
    openExternal: vi.fn(),
    copyToClipboard: vi.fn(),
    readFromClipboard: vi.fn(),
    onWillTerminate: vi.fn(),
    preventTermination: vi.fn(),
    getStorageValue: vi.fn(),
    setStorageValue: vi.fn(),
    deleteStorageValue: vi.fn(),
  } as IPlatformPort;
}

describe('IPlatformPort Interface Contract', () => {
  describe('Platform Information', () => {
    test('getPlatformInfo returns PlatformInfo', () => {
      const mockPort = createMockPlatformPort();
      const platformInfo: PlatformInfo = {
        type: 'vscode',
        version: '1.85.0',
        os: 'macos',
        arch: 'arm64',
        isDebug: false,
      };

      vi.mocked(mockPort.getPlatformInfo).mockReturnValue(platformInfo);

      const result = mockPort.getPlatformInfo();
      expect(result.type).toBe('vscode');
      expect(result.version).toBe('1.85.0');
      expect(result.os).toBe('macos');
      expect(result.arch).toBe('arm64');
      expect(result.isDebug).toBe(false);
    });

    test('getPlatformInfo handles all platform types', () => {
      const mockPort = createMockPlatformPort();
      const platformTypes: Array<'vscode' | 'mobile' | 'web' | 'desktop'> = [
        'vscode',
        'mobile',
        'web',
        'desktop',
      ];

      platformTypes.forEach((type) => {
        const platformInfo: PlatformInfo = {
          type,
          version: '1.0.0',
          os: type === 'mobile' ? 'ios' : 'linux',
          arch: 'x64',
          isDebug: true,
        };

        vi.mocked(mockPort.getPlatformInfo).mockReturnValue(platformInfo);
        const result = mockPort.getPlatformInfo();
        expect(result.type).toBe(type);
      });
    });

    test('getPlatformInfo handles all OS types', () => {
      const mockPort = createMockPlatformPort();
      const osTypes: Array<'windows' | 'macos' | 'linux' | 'ios' | 'android'> = [
        'windows',
        'macos',
        'linux',
        'ios',
        'android',
      ];

      osTypes.forEach((os) => {
        const platformInfo: PlatformInfo = {
          type: 'desktop',
          version: '1.0.0',
          os,
          arch: 'x64',
          isDebug: false,
        };

        vi.mocked(mockPort.getPlatformInfo).mockReturnValue(platformInfo);
        const result = mockPort.getPlatformInfo();
        expect(result.os).toBe(os);
      });
    });
  });

  describe('Input Capabilities', () => {
    test('getInputCapabilities returns InputCapabilities', () => {
      const mockPort = createMockPlatformPort();
      const inputCapabilities: InputCapabilities = {
        hasKeyboard: true,
        hasMouse: true,
        hasTouch: false,
        hasPen: false,
        primaryInput: 'keyboard',
      };

      vi.mocked(mockPort.getInputCapabilities).mockReturnValue(inputCapabilities);

      const result = mockPort.getInputCapabilities();
      expect(result.hasKeyboard).toBe(true);
      expect(result.hasMouse).toBe(true);
      expect(result.hasTouch).toBe(false);
      expect(result.hasPen).toBe(false);
      expect(result.primaryInput).toBe('keyboard');
    });

    test('getInputCapabilities handles all primary input types', () => {
      const mockPort = createMockPlatformPort();
      const primaryInputs: Array<'keyboard' | 'touch' | 'mouse'> = ['keyboard', 'touch', 'mouse'];

      primaryInputs.forEach((primaryInput) => {
        const inputCapabilities: InputCapabilities = {
          hasKeyboard: primaryInput === 'keyboard',
          hasMouse: primaryInput === 'mouse',
          hasTouch: primaryInput === 'touch',
          hasPen: false,
          primaryInput,
        };

        vi.mocked(mockPort.getInputCapabilities).mockReturnValue(inputCapabilities);
        const result = mockPort.getInputCapabilities();
        expect(result.primaryInput).toBe(primaryInput);
      });
    });

    test('getInputCapabilities handles mobile input patterns', () => {
      const mockPort = createMockPlatformPort();
      const mobileInputCapabilities: InputCapabilities = {
        hasKeyboard: false,
        hasMouse: false,
        hasTouch: true,
        hasPen: true,
        primaryInput: 'touch',
      };

      vi.mocked(mockPort.getInputCapabilities).mockReturnValue(mobileInputCapabilities);

      const result = mockPort.getInputCapabilities();
      expect(result.hasTouch).toBe(true);
      expect(result.primaryInput).toBe('touch');
      expect(result.hasKeyboard).toBe(false);
      expect(result.hasMouse).toBe(false);
    });
  });

  describe('Display Capabilities', () => {
    test('getDisplayCapabilities returns DisplayCapabilities', () => {
      const mockPort = createMockPlatformPort();
      const displayCapabilities: DisplayCapabilities = {
        screenWidth: 1920,
        screenHeight: 1080,
        devicePixelRatio: 2.0,
        colorDepth: 24,
        isHighContrast: false,
        prefersReducedMotion: false,
      };

      vi.mocked(mockPort.getDisplayCapabilities).mockReturnValue(displayCapabilities);

      const result = mockPort.getDisplayCapabilities();
      expect(result.screenWidth).toBe(1920);
      expect(result.screenHeight).toBe(1080);
      expect(result.devicePixelRatio).toBe(2.0);
      expect(result.colorDepth).toBe(24);
      expect(result.isHighContrast).toBe(false);
      expect(result.prefersReducedMotion).toBe(false);
    });

    test('getDisplayCapabilities handles high DPI displays', () => {
      const mockPort = createMockPlatformPort();
      const highDpiCapabilities: DisplayCapabilities = {
        screenWidth: 2560,
        screenHeight: 1600,
        devicePixelRatio: 3.0,
        colorDepth: 32,
        isHighContrast: false,
        prefersReducedMotion: false,
      };

      vi.mocked(mockPort.getDisplayCapabilities).mockReturnValue(highDpiCapabilities);

      const result = mockPort.getDisplayCapabilities();
      expect(result.devicePixelRatio).toBe(3.0);
      expect(result.colorDepth).toBe(32);
    });

    test('getDisplayCapabilities handles accessibility settings', () => {
      const mockPort = createMockPlatformPort();
      const accessibilityCapabilities: DisplayCapabilities = {
        screenWidth: 1024,
        screenHeight: 768,
        devicePixelRatio: 1.0,
        colorDepth: 24,
        isHighContrast: true,
        prefersReducedMotion: true,
      };

      vi.mocked(mockPort.getDisplayCapabilities).mockReturnValue(accessibilityCapabilities);

      const result = mockPort.getDisplayCapabilities();
      expect(result.isHighContrast).toBe(true);
      expect(result.prefersReducedMotion).toBe(true);
    });
  });

  describe('Feature Detection', () => {
    test('isFeatureAvailable returns boolean for each feature', () => {
      const mockPort = createMockPlatformPort();
      const features: PlatformFeature[] = [
        'file-system',
        'clipboard',
        'notifications',
        'external-links',
        'offline-storage',
        'webviews',
        'touch-gestures',
        'keyboard-shortcuts',
      ];

      features.forEach((feature, index) => {
        const isAvailable = index % 2 === 0; // Alternate true/false
        vi.mocked(mockPort.isFeatureAvailable).mockReturnValue(isAvailable);

        const result = mockPort.isFeatureAvailable(feature);
        expect(typeof result).toBe('boolean');
        expect(result).toBe(isAvailable);
      });
    });

    test('isFeatureAvailable handles desktop vs mobile feature differences', () => {
      const mockPort = createMockPlatformPort();

      // Desktop features
      vi.mocked(mockPort.isFeatureAvailable).mockImplementation((feature: PlatformFeature) => {
        const desktopFeatures = new Set([
          'file-system',
          'clipboard',
          'notifications',
          'external-links',
          'webviews',
          'keyboard-shortcuts',
        ]);
        return desktopFeatures.has(feature);
      });

      expect(mockPort.isFeatureAvailable('file-system')).toBe(true);
      expect(mockPort.isFeatureAvailable('keyboard-shortcuts')).toBe(true);
      expect(mockPort.isFeatureAvailable('touch-gestures')).toBe(false);

      // Mobile features
      vi.mocked(mockPort.isFeatureAvailable).mockImplementation((feature: PlatformFeature) => {
        const mobileFeatures = new Set(['notifications', 'offline-storage', 'touch-gestures']);
        return mobileFeatures.has(feature);
      });

      expect(mockPort.isFeatureAvailable('touch-gestures')).toBe(true);
      expect(mockPort.isFeatureAvailable('offline-storage')).toBe(true);
      expect(mockPort.isFeatureAvailable('file-system')).toBe(false);
    });
  });

  describe('Platform-Specific Operations', () => {
    test('openExternal returns Result<void, PlatformError>', async () => {
      const mockPort = createMockPlatformPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: 'NOT_SUPPORTED',
        message: 'External links not supported',
      } as PlatformError);

      vi.mocked(mockPort.openExternal).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.openExternal).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.openExternal('https://example.com');
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.openExternal('https://blocked.com');
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe('NOT_SUPPORTED');
      }
    });

    test('copyToClipboard returns Result<void, PlatformError>', async () => {
      const mockPort = createMockPlatformPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: 'PERMISSION_DENIED',
        message: 'Clipboard access denied',
      } as PlatformError);

      vi.mocked(mockPort.copyToClipboard).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.copyToClipboard).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.copyToClipboard('text to copy');
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.copyToClipboard('restricted text');
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe('PERMISSION_DENIED');
      }
    });

    test('readFromClipboard returns Result<string | null, PlatformError>', async () => {
      const mockPort = createMockPlatformPort();
      const successResult = ok('clipboard content');
      const emptyResult = ok(null);
      const errorResult = err({
        code: 'PLATFORM_ERROR',
        message: 'Clipboard read error',
      } as PlatformError);

      vi.mocked(mockPort.readFromClipboard).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.readFromClipboard).mockResolvedValueOnce(emptyResult);
      vi.mocked(mockPort.readFromClipboard).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.readFromClipboard();
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe('clipboard content');
      }

      const result2 = await mockPort.readFromClipboard();
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBeNull();
      }

      const result3 = await mockPort.readFromClipboard();
      expect(result3.isErr()).toBe(true);
    });
  });

  describe('Application Lifecycle', () => {
    test('onWillTerminate returns Disposable', () => {
      const mockPort = createMockPlatformPort();
      const mockDisposable = { dispose: vi.fn() } as Disposable;

      vi.mocked(mockPort.onWillTerminate).mockReturnValue(mockDisposable);

      let _terminationCalled = false;
      const callback = () => {
        _terminationCalled = true;
      };

      const disposable = mockPort.onWillTerminate(callback);
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeDefined();

      // Verify the callback was registered
      expect(mockPort.onWillTerminate).toHaveBeenCalledWith(callback);
    });

    test('preventTermination returns Disposable', () => {
      const mockPort = createMockPlatformPort();
      const mockDisposable = { dispose: vi.fn() } as Disposable;

      vi.mocked(mockPort.preventTermination).mockReturnValue(mockDisposable);

      const disposable = mockPort.preventTermination('Saving document...');
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeDefined();

      expect(mockPort.preventTermination).toHaveBeenCalledWith('Saving document...');
    });
  });

  describe('Key-Value Storage', () => {
    test('getStorageValue returns Result<T | undefined, PlatformError>', async () => {
      const mockPort = createMockPlatformPort();
      const successResult = ok('stored value');
      const defaultResult = ok('default value');
      const undefinedResult = ok(undefined);
      const errorResult = err({
        code: 'PLATFORM_ERROR',
        message: 'Storage error',
      } as PlatformError);

      vi.mocked(mockPort.getStorageValue).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.getStorageValue).mockResolvedValueOnce(defaultResult);
      vi.mocked(mockPort.getStorageValue).mockResolvedValueOnce(undefinedResult);
      vi.mocked(mockPort.getStorageValue).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.getStorageValue('existing-key');
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe('stored value');
      }

      const result2 = await mockPort.getStorageValue('missing-key', 'default value');
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe('default value');
      }

      const result3 = await mockPort.getStorageValue('another-missing-key');
      expect(result3.isOk()).toBe(true);
      if (result3.isOk()) {
        expect(result3.value).toBeUndefined();
      }

      const result4 = await mockPort.getStorageValue('error-key');
      expect(result4.isErr()).toBe(true);
    });

    test('setStorageValue returns Result<void, PlatformError>', async () => {
      const mockPort = createMockPlatformPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: 'PLATFORM_ERROR',
        message: 'Storage write error',
      } as PlatformError);

      vi.mocked(mockPort.setStorageValue).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.setStorageValue).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.setStorageValue('key1', 'value1');
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.setStorageValue('key2', 'value2');
      expect(result2.isErr()).toBe(true);
    });

    test('deleteStorageValue returns Result<void, PlatformError>', async () => {
      const mockPort = createMockPlatformPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: 'PLATFORM_ERROR',
        message: 'Storage delete error',
      } as PlatformError);

      vi.mocked(mockPort.deleteStorageValue).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.deleteStorageValue).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.deleteStorageValue('key1');
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.deleteStorageValue('key2');
      expect(result2.isErr()).toBe(true);
    });

    test('storage operations handle different value types', async () => {
      const mockPort = createMockPlatformPort();

      // Test with string
      vi.mocked(mockPort.getStorageValue).mockResolvedValueOnce(ok('string value'));
      const stringResult = await mockPort.getStorageValue<string>('string-key');
      expect(stringResult.isOk()).toBe(true);

      // Test with number
      vi.mocked(mockPort.getStorageValue).mockResolvedValueOnce(ok(42));
      const numberResult = await mockPort.getStorageValue<number>('number-key');
      expect(numberResult.isOk()).toBe(true);

      // Test with object
      const objectValue = { test: 'value' };
      vi.mocked(mockPort.getStorageValue).mockResolvedValueOnce(ok(objectValue));
      const objectResult = await mockPort.getStorageValue<typeof objectValue>('object-key');
      expect(objectResult.isOk()).toBe(true);

      // Test with boolean
      vi.mocked(mockPort.getStorageValue).mockResolvedValueOnce(ok(true));
      const booleanResult = await mockPort.getStorageValue<boolean>('boolean-key');
      expect(booleanResult.isOk()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('PlatformError has all required error codes', () => {
      const errorCodes = ['NOT_SUPPORTED', 'PERMISSION_DENIED', 'PLATFORM_ERROR'] as const;

      errorCodes.forEach((code) => {
        const error: PlatformError = {
          code,
          message: `Test error: ${code}`,
        };

        expect(error.code).toBe(code);
        expect(error.message).toBeDefined();
      });
    });

    test('PlatformError message is always required', () => {
      const error: PlatformError = {
        code: 'PLATFORM_ERROR',
        message: 'Required message',
      };

      expect(error.message).toBe('Required message');
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('desktop platforms have full feature support', () => {
      const mockPort = createMockPlatformPort();

      // Mock desktop platform
      vi.mocked(mockPort.getPlatformInfo).mockReturnValue({
        type: 'vscode',
        version: '1.85.0',
        os: 'windows',
        arch: 'x64',
        isDebug: false,
      });

      vi.mocked(mockPort.getInputCapabilities).mockReturnValue({
        hasKeyboard: true,
        hasMouse: true,
        hasTouch: false,
        hasPen: false,
        primaryInput: 'keyboard',
      });

      vi.mocked(mockPort.isFeatureAvailable).mockReturnValue(true);

      const platformInfo = mockPort.getPlatformInfo();
      const inputCapabilities = mockPort.getInputCapabilities();

      expect(platformInfo.type).toBe('vscode');
      expect(inputCapabilities.hasKeyboard).toBe(true);
      expect(inputCapabilities.hasMouse).toBe(true);
      expect(mockPort.isFeatureAvailable('file-system')).toBe(true);
    });

    test('mobile platforms have touch-first capabilities', () => {
      const mockPort = createMockPlatformPort();

      // Mock mobile platform
      vi.mocked(mockPort.getPlatformInfo).mockReturnValue({
        type: 'mobile',
        version: '1.0.0',
        os: 'ios',
        arch: 'arm64',
        isDebug: false,
      });

      vi.mocked(mockPort.getInputCapabilities).mockReturnValue({
        hasKeyboard: false,
        hasMouse: false,
        hasTouch: true,
        hasPen: false,
        primaryInput: 'touch',
      });

      vi.mocked(mockPort.isFeatureAvailable).mockImplementation((feature: PlatformFeature) => {
        const mobileFeatures = new Set(['touch-gestures', 'offline-storage']);
        return mobileFeatures.has(feature);
      });

      const platformInfo = mockPort.getPlatformInfo();
      const inputCapabilities = mockPort.getInputCapabilities();

      expect(platformInfo.type).toBe('mobile');
      expect(inputCapabilities.hasTouch).toBe(true);
      expect(inputCapabilities.primaryInput).toBe('touch');
      expect(mockPort.isFeatureAvailable('touch-gestures')).toBe(true);
      expect(mockPort.isFeatureAvailable('file-system')).toBe(false);
    });

    test('web platforms have limited capabilities', () => {
      const mockPort = createMockPlatformPort();

      // Mock web platform
      vi.mocked(mockPort.getPlatformInfo).mockReturnValue({
        type: 'web',
        version: '1.0.0',
        os: 'linux',
        arch: 'x64',
        isDebug: false,
      });

      vi.mocked(mockPort.isFeatureAvailable).mockImplementation((feature: PlatformFeature) => {
        const webFeatures = new Set(['clipboard', 'notifications']);
        return webFeatures.has(feature);
      });

      const platformInfo = mockPort.getPlatformInfo();

      expect(platformInfo.type).toBe('web');
      expect(mockPort.isFeatureAvailable('clipboard')).toBe(true);
      expect(mockPort.isFeatureAvailable('file-system')).toBe(false);
      expect(mockPort.isFeatureAvailable('external-links')).toBe(false);
    });
  });
});
