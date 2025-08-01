/**
 * Shared test utilities for system-e2e integration tests
 *
 * Contains common imports, interfaces, mock factories, and test data generators
 * used across all system-e2e test suites.
 */

import { err } from 'neverthrow';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock vscode module for system-e2e tests
vi.mock('vscode', () => ({
  version: '1.85.0',
  workspace: {
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
      stat: vi.fn(),
    },
    createFileSystemWatcher: vi.fn(),
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    onDidSaveTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChangeTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidCloseTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidOpenTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    openTextDocument: vi.fn(),
    workspaceFolders: [],
  },
  window: {
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    createWebviewPanel: vi.fn(),
    withProgress: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    showTextDocument: vi.fn(),
    activeTextEditor: undefined,
  },
  commands: {
    registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    executeCommand: vi.fn(),
  },
  Uri: {
    file: vi.fn(),
    joinPath: vi.fn(),
  },
  FileType: {
    File: 1,
    Directory: 2,
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
    Active: -1,
    Beside: -2,
  },
}));

import * as vscode from 'vscode';
import type { IFileSystemPort } from '../../../application/ports/IFileSystemPort.js';
import type { IUIPort } from '../../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../../../application/services/DocumentQueryService.js';
import type { ProofVisualizationService } from '../../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../../application/services/ViewStateManager.js';
import { ProofTransactionService } from '../../../domain/services/ProofTransactionService.js';
import { StatementFlowService } from '../../../domain/services/StatementFlowService.js';
import { TreeStructureService } from '../../../domain/services/TreeStructureService.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { activate, deactivate } from '../../../extension/extension.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
} from '../../../infrastructure/di/container.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../../presentation/controllers/BootstrapController.js';
import type { DocumentController } from '../../../presentation/controllers/DocumentController.js';
import type { ValidationController } from '../../../validation/ValidationController.js';
import { ProofTreePanelManager } from '../../../webview/ProofTreePanelManager.js';
import type { TreeRenderer } from '../../../webview/TreeRenderer.js';

// Re-export commonly used test utilities
export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  vscode,
  err,
  ValidationError,
  activate,
  deactivate,
  getContainer,
  initializeContainer,
  TOKENS,
  ProofTreePanelManager,
  ProofTransactionService,
  StatementFlowService,
  TreeStructureService,
};

// Type exports
export type {
  ApplicationContainer,
  IFileSystemPort,
  IUIPort,
  IViewStatePort,
  DocumentQueryService,
  ProofVisualizationService,
  ViewStateManager,
  YAMLSerializer,
  BootstrapController,
  DocumentController,
  ValidationController,
  TreeRenderer,
};

// Performance and memory tracking
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  operationCount: number;
  errorCount: number;
}

// Test data generators
export const generateComplexProofDocument = (
  statementCount: number,
  argumentCount: number,
): string => {
  const statements: Record<string, string> = {};
  const proofArguments: Record<string, any> = {};
  const trees: any[] = [];

  // Generate statements
  for (let i = 1; i <= statementCount; i++) {
    statements[`s${i}`] =
      `Statement ${i}: This is a test statement with sufficient complexity for testing.`;
  }

  // Generate arguments with realistic connections
  for (let i = 1; i <= argumentCount; i++) {
    const premiseStart = Math.max(1, i - 2);
    const premiseCount = Math.min(3, i);
    const premises = Array.from({ length: premiseCount }, (_, j) => `s${premiseStart + j}`);
    const conclusion = `s${statementCount + i}`;

    statements[conclusion] = `Conclusion ${i}: Derived from premises ${premises.join(', ')}`;

    proofArguments[`arg${i}`] = {
      premises,
      conclusions: [conclusion],
      metadata: {
        rule: `Rule${i}`,
        confidence: 0.95,
        created: new Date().toISOString(),
      },
    };
  }

  // Generate tree structure
  if (argumentCount > 0) {
    const nodes: Record<string, any> = {};
    nodes.n1 = { arg: 'arg1' };

    for (let i = 2; i <= argumentCount; i++) {
      const parentNode = `n${Math.max(1, i - 1)}`;
      nodes[`n${i}`] = { [parentNode]: `arg${i}`, on: 0 };
    }

    trees.push({
      id: 'tree1',
      offset: { x: 100, y: 100 },
      nodes,
    });
  }

  return `# Generated Complex Proof Document
# ${statementCount} statements, ${argumentCount} arguments

statements:
${Object.entries(statements)
  .map(([id, content]) => `  ${id}: "${content}"`)
  .join('\n')}

arguments:
${Object.entries(proofArguments)
  .map(
    ([id, arg]) =>
      `  ${id}:
    premises: [${arg.premises.join(', ')}]
    conclusions: [${arg.conclusions.join(', ')}]
    metadata:
      rule: "${arg.metadata.rule}"
      confidence: ${arg.metadata.confidence}
      created: "${arg.metadata.created}"`,
  )
  .join('\n')}

trees:
${trees
  .map(
    (tree) =>
      `- id: ${tree.id}
    offset:
      x: ${tree.offset.x}
      y: ${tree.offset.y}
    nodes:
${Object.entries(tree.nodes)
  .map(([nodeId, nodeData]) => {
    if (!nodeData || typeof nodeData !== 'object') {
      return `      ${nodeId}: {arg: unknown}`;
    }
    if ('arg' in nodeData) {
      return `      ${nodeId}: {arg: ${(nodeData as any).arg}}`;
    } else {
      const parentKey = Object.keys(nodeData as Record<string, any>).find((k) => k !== 'on');
      return `      ${nodeId}: {${parentKey || 'unknown'}: ${(nodeData as any)[parentKey || 'unknown']}, on: ${(nodeData as any).on}}`;
    }
  })
  .join('\n')}`,
  )
  .join('\n')}

metadata:
  title: "Complex Test Proof"
  created: "${new Date().toISOString()}"
  version: "1.0.0"
  complexity: "high"
  statementCount: ${statementCount}
  argumentCount: ${argumentCount}
`;
};

// Mock VS Code environment with full feature support
export const createVSCodeMocks = () => {
  const mockDisposable = { dispose: vi.fn() };

  const mockWebview = {
    html: '',
    options: { enableScripts: true },
    onDidReceiveMessage: vi.fn(() => mockDisposable),
    postMessage: vi.fn().mockResolvedValue(true),
    asWebviewUri: vi.fn(),
    cspSource: 'vscode-webview:',
  };

  const mockWebviewPanel = {
    webview: mockWebview,
    title: 'Test Proof Tree',
    viewType: 'proofTreeVisualization',
    viewColumn: vscode.ViewColumn.Two,
    active: true,
    visible: true,
    options: { retainContextWhenHidden: true },
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidDispose: vi.fn(() => mockDisposable),
    onDidChangeViewState: vi.fn(() => mockDisposable),
  };

  const mockDocument = {
    fileName: '/test/test.proof',
    languageId: 'proof',
    version: 1,
    isDirty: false,
    isClosed: false,
    isUntitled: false,
    uri: {
      scheme: 'file',
      authority: '',
      path: '/test/test.proof',
      query: '',
      fragment: '',
      fsPath: '/test/test.proof',
      toString: () => 'file:///test/test.proof',
      toJSON: () => ({ scheme: 'file', path: '/test/test.proof' }),
      with: vi.fn(),
    },
    getText: vi.fn(() => ''),
    save: vi.fn().mockResolvedValue(true),
    lineAt: vi.fn(),
    lineCount: 1,
    offsetAt: vi.fn().mockReturnValue(0),
    positionAt: vi.fn(),
    getWordRangeAtPosition: vi.fn(),
    validateRange: vi.fn(),
    validatePosition: vi.fn(),
    eol: 1,
    encoding: 'utf8',
  };

  const mockTextEditor = {
    document: mockDocument,
    viewColumn: vscode.ViewColumn.One,
    selection: { active: { line: 0, character: 0 }, anchor: { line: 0, character: 0 } },
    selections: [],
    visibleRanges: [],
    options: { tabSize: 2, insertSpaces: true },
    edit: vi.fn().mockResolvedValue(true),
    insertSnippet: vi.fn().mockResolvedValue(true),
    setDecorations: vi.fn(),
    revealRange: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  };

  return {
    mockWebview,
    mockWebviewPanel,
    mockDocument,
    mockTextEditor,
    mockDisposable,
  };
};

// Common test setup helper
export const createTestSetup = () => {
  let mockContext: any;
  let container: ApplicationContainer;
  let performanceMetrics: PerformanceMetrics;
  const { mockWebview, mockWebviewPanel, mockDocument, mockTextEditor } = createVSCodeMocks();

  const setup = async () => {
    // Setup VS Code mocks first - configure the mocked createFileSystemWatcher
    const mockFileWatcher = {
      onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockFileWatcher as any);

    // Initialize performance tracking
    performanceMetrics = {
      startTime: Date.now(),
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      },
      operationCount: 0,
      errorCount: 0,
    };

    // Setup mock VS Code context
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn(() => []),
      },
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn(() => []),
        setKeysForSync: vi.fn(),
      },
      secrets: {
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: vi.fn(),
      },
      extensionPath: '/test/extension',
      extensionUri: {
        scheme: 'file',
        authority: '',
        path: '/test/extension',
        query: '',
        fragment: '',
        fsPath: '/test/extension',
        toString: () => 'file:///test/extension',
        toJSON: () => ({ scheme: 'file', path: '/test/extension' }),
        with: vi.fn(),
      },
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/logs',
      logUri: {
        scheme: 'file',
        path: '/test/logs',
        toString: () => 'file:///test/logs',
        toJSON: () => ({ scheme: 'file', path: '/test/logs' }),
        with: vi.fn(),
      },
      storageUri: {
        scheme: 'file',
        path: '/test/storage',
        toString: () => 'file:///test/storage',
        toJSON: () => ({ scheme: 'file', path: '/test/storage' }),
        with: vi.fn(),
      },
      globalStorageUri: {
        scheme: 'file',
        path: '/test/global-storage',
        toString: () => 'file:///test/global-storage',
        toJSON: () => ({ scheme: 'file', path: '/test/global-storage' }),
        with: vi.fn(),
      },
      environmentVariableCollection: {
        persistent: true,
        description: 'Test environment variables',
        replace: vi.fn(),
        append: vi.fn(),
        prepend: vi.fn(),
        get: vi.fn(),
        forEach: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        [Symbol.iterator]: vi.fn(),
      },
      extension: {
        id: 'test.proof-editor',
        extensionUri: {
          scheme: 'file',
          path: '/test/extension',
          toString: () => 'file:///test/extension',
          toJSON: () => ({ scheme: 'file', path: '/test/extension' }),
          with: vi.fn(),
        },
        extensionPath: '/test/extension',
        isActive: true,
        packageJSON: {
          name: 'proof-editor',
          version: '1.0.0',
          engines: { vscode: '^1.60.0' },
        },
        extensionKind: 1,
        exports: {},
        activate: vi.fn(),
      },
      asAbsolutePath: vi.fn((relativePath: string) => `/test/extension/${relativePath}`),
      languageModelAccessInformation: {
        canSendRequest: vi.fn(() => true),
        onDidChange: vi.fn(),
      },
    };

    // Initialize container
    container = await initializeContainer();

    // Setup VS Code API mocks - these should already be mocked by the mock file
    // but we ensure they have the right return values for our tests

    // Mock configuration
    vscode.workspace.getConfiguration = vi.fn().mockReturnValue({
      get: vi.fn((key: string) => {
        switch (key) {
          case 'proof-editor.enableAutoValidation':
            return true;
          case 'proof-editor.maxStatements':
            return 1000;
          case 'proof-editor.theme':
            return 'default';
          default:
            return undefined;
        }
      }),
      has: vi.fn(() => true),
      inspect: vi.fn(),
      update: vi.fn(),
    });

    // Mock document operations
    vscode.workspace.openTextDocument = vi.fn().mockResolvedValue(mockDocument);
    vscode.window.showTextDocument = vi.fn().mockResolvedValue(mockTextEditor);
    vscode.window.createWebviewPanel = vi.fn().mockReturnValue(mockWebviewPanel);

    // Mock command registration
    vscode.commands.registerCommand = vi.fn().mockReturnValue({ dispose: vi.fn() });

    // Mock event handlers using Object.defineProperty for readonly properties
    Object.defineProperty(vscode.workspace, 'onDidSaveTextDocument', {
      value: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      writable: true,
    });
    Object.defineProperty(vscode.workspace, 'onDidChangeTextDocument', {
      value: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      writable: true,
    });
    Object.defineProperty(vscode.workspace, 'onDidCloseTextDocument', {
      value: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      writable: true,
    });
    Object.defineProperty(vscode.workspace, 'onDidOpenTextDocument', {
      value: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      writable: true,
    });
    Object.defineProperty(vscode.window, 'onDidChangeActiveTextEditor', {
      value: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      writable: true,
    });

    // Mock additional methods used in tests
    vscode.window.showInputBox = vi.fn();
    vscode.window.showInformationMessage = vi.fn();

    // Mock file system watcher (moved to setup function)

    // Note: Don't call vi.clearAllMocks() here as it would clear the mock implementations we just set up
  };

  const teardown = async () => {
    performanceMetrics.endTime = Date.now();

    try {
      await deactivate();
    } catch (_error) {
      // Ignore deactivation errors in tests
    }

    vi.clearAllMocks();
    vi.restoreAllMocks();
  };

  return {
    setup,
    teardown,
    get mockContext() {
      return mockContext;
    },
    get container() {
      return container;
    },
    get performanceMetrics() {
      return performanceMetrics;
    },
    get mockWebview() {
      return mockWebview;
    },
    get mockWebviewPanel() {
      return mockWebviewPanel;
    },
    get mockDocument() {
      return mockDocument;
    },
    get mockTextEditor() {
      return mockTextEditor;
    },
  };
};
