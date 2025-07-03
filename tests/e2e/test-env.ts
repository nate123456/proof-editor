import { test as base } from '@playwright/test';
import * as path from 'path';

// Mock VS Code extension context for testing
export interface ExtensionMockContext {
  extensionPath: string;
  globalState: {
    get: (key: string) => any;
    update: (key: string, value: any) => void;
  };
  workspaceState: {
    get: (key: string) => any;
    update: (key: string, value: any) => void;
  };
}

// Test utilities for VS Code extension testing
export interface TestUtils {
  mockExtensionContext: ExtensionMockContext;
  loadTestProofFile: (filename: string) => Promise<string>;
  createMockWebviewPanel: () => MockWebviewPanel;
}

export interface MockWebviewPanel {
  webview: {
    html: string;
    postMessage: (message: any) => void;
    asWebviewUri: (uri: any) => string;
  };
  reveal: (column?: any) => void;
  dispose: () => void;
  onDidDispose: (callback: () => void) => void;
}

export const test = base.extend<TestUtils>({
  mockExtensionContext: async ({}, use) => {
    const mockContext: ExtensionMockContext = {
      extensionPath: path.join(__dirname, '../../'),
      globalState: {
        get: (key: string) => null,
        update: (key: string, value: any) => {},
      },
      workspaceState: {
        get: (key: string) => null,
        update: (key: string, value: any) => {},
      },
    };
    await use(mockContext);
  },

  loadTestProofFile: async ({}, use) => {
    const loader = async (filename: string) => {
      const fs = await import('fs/promises');
      const testFilePath = path.join(__dirname, '../../examples', filename);
      return await fs.readFile(testFilePath, 'utf-8');
    };
    await use(loader);
  },

  createMockWebviewPanel: async ({}, use) => {
    const factory = () => {
      let htmlContent = '';
      const mockPanel: MockWebviewPanel = {
        webview: {
          html: '',
          postMessage: (message: any) => {
            // Mock postMessage functionality
            console.log('Mock webview message:', message);
          },
          asWebviewUri: (uri: any) => uri?.toString() || '',
        },
        reveal: (column?: any) => {},
        dispose: () => {},
        onDidDispose: (callback: () => void) => {},
      };

      // Intercept HTML assignment
      Object.defineProperty(mockPanel.webview, 'html', {
        get: () => htmlContent,
        set: (value: string) => {
          htmlContent = value;
        },
      });

      return mockPanel;
    };
    await use(factory);
  },
});

export { expect } from '@playwright/test';