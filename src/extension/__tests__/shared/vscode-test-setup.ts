/**
 * Shared VS Code mock setup for extension tests
 *
 * This file provides a comprehensive mock of the VS Code API
 * to enable testing of extension functionality without requiring
 * the actual VS Code environment.
 */

import { vi } from 'vitest';
import type { TextDocument, TextDocumentChangeEvent, TextEditor } from 'vscode';
import * as vscode from 'vscode';

export const createVSCodeMock = () => {
  // Mock VS Code module
  vi.mock('vscode', () => ({
    languages: {
      createDiagnosticCollection: vi.fn(),
      registerCompletionItemProvider: vi.fn(),
      registerHoverProvider: vi.fn(),
      registerDefinitionProvider: vi.fn(),
      registerDocumentSymbolProvider: vi.fn(),
      registerWorkspaceSymbolProvider: vi.fn(),
      registerReferenceProvider: vi.fn(),
      registerDocumentHighlightProvider: vi.fn(),
      registerDocumentFormattingProvider: vi.fn(),
      registerDocumentRangeFormattingProvider: vi.fn(),
      registerOnTypeFormattingProvider: vi.fn(),
      registerRenameProvider: vi.fn(),
      registerCodeActionsProvider: vi.fn(),
      registerCodeLensProvider: vi.fn(),
      registerDocumentLinkProvider: vi.fn(),
      registerColorProvider: vi.fn(),
      registerFoldingRangeProvider: vi.fn(),
      registerSelectionRangeProvider: vi.fn(),
      registerCallHierarchyProvider: vi.fn(),
      registerSemanticTokensProvider: vi.fn(),
      registerLinkedEditingRangeProvider: vi.fn(),
      registerTypeDefinitionProvider: vi.fn(),
      registerImplementationProvider: vi.fn(),
      registerDeclarationProvider: vi.fn(),
      registerSignatureHelpProvider: vi.fn(),
      registerDocumentSemanticTokensProvider: vi.fn(),
      registerDocumentRangeSemanticTokensProvider: vi.fn(),
      registerEvaluatableExpressionProvider: vi.fn(),
      registerInlineValuesProvider: vi.fn(),
      setLanguageConfiguration: vi.fn(),
      getLanguages: vi.fn(),
      setTextDocumentLanguage: vi.fn(),
      createLanguageStatusItem: vi.fn(),
    },
    env: {
      clipboard: {
        readText: vi.fn(),
        writeText: vi.fn(),
      },
      openExternal: vi.fn(),
      asExternalUri: vi.fn(),
      machineId: 'test-machine-id',
      sessionId: 'test-session-id',
      language: 'en',
      shell: '/bin/bash',
      appName: 'VS Code',
      appRoot: '/test/app',
      uriScheme: 'vscode',
      isNewAppInstall: false,
      isTelemetryEnabled: false,
      remoteName: undefined,
      uiKind: 1,
      logLevel: 1,
      onDidChangeLogLevel: vi.fn(),
      createTelemetryLogger: vi.fn(),
    },
    commands: {
      registerCommand: vi.fn(),
      executeCommand: vi.fn(),
    },
    window: {
      createWebviewPanel: vi.fn(),
      showInformationMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showInputBox: vi.fn(),
      showQuickPick: vi.fn(),
      showTextDocument: vi.fn(),
      onDidChangeActiveTextEditor: vi.fn(),
      visibleTextEditors: [],
    },
    workspace: {
      onDidOpenTextDocument: vi.fn(),
      onDidChangeTextDocument: vi.fn(),
      onDidCloseTextDocument: vi.fn(),
      openTextDocument: vi.fn(),
      createFileSystemWatcher: vi.fn((_pattern: string) => ({
        onDidChange: vi.fn((_handler) => ({ dispose: vi.fn() })),
        onDidCreate: vi.fn((_handler) => ({ dispose: vi.fn() })),
        onDidDelete: vi.fn((_handler) => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      })),
      textDocuments: [],
    },
    Uri: {
      file: vi.fn().mockImplementation((path: string) => ({
        scheme: 'file',
        path,
        fsPath: path,
        toString: () => `file://${path}`,
      })),
      joinPath: vi.fn().mockImplementation((base: any, ...segments: string[]) => ({
        scheme: 'file',
        path: `${base.path}/${segments.join('/')}`,
        fsPath: `${base.fsPath}/${segments.join('/')}`,
        toString: () => `file://${base.fsPath}/${segments.join('/')}`,
      })),
    },
    Range: vi
      .fn()
      .mockImplementation(
        (startLine: number, startChar: number, endLine: number, endChar: number) => ({
          start: { line: startLine, character: startChar },
          end: { line: endLine, character: endChar },
          isEmpty: startLine === endLine && startChar === endChar,
          isSingleLine: startLine === endLine,
        }),
      ),
    Position: vi.fn().mockImplementation((line: number, character: number) => ({
      line,
      character,
    })),
    Selection: vi
      .fn()
      .mockImplementation(
        (anchorLine: number, anchorChar: number, activeLine: number, activeChar: number) => ({
          anchor: { line: anchorLine, character: anchorChar },
          active: { line: activeLine, character: activeChar },
          start: {
            line: Math.min(anchorLine, activeLine),
            character: anchorLine < activeLine ? anchorChar : activeChar,
          },
          end: {
            line: Math.max(anchorLine, activeLine),
            character: anchorLine > activeLine ? anchorChar : activeChar,
          },
        }),
      ),
    TextEdit: {
      replace: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
    },
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
      WorkspaceFolder: 3,
    },
    ViewColumn: {
      Active: -1,
      Beside: -2,
      One: 1,
      Two: 2,
      Three: 3,
    },
    TextDocumentSaveReason: {
      Manual: 1,
      AfterDelay: 2,
      FocusOut: 3,
    },
    EndOfLine: {
      LF: 1,
      CRLF: 2,
    },
    Disposable: vi.fn(() => ({ dispose: vi.fn() })),
    EventEmitter: vi.fn(() => ({
      event: vi.fn(),
      fire: vi.fn(),
      dispose: vi.fn(),
    })),
    CancellationToken: vi.fn(),
    CancellationTokenSource: vi.fn(),
    version: '1.0.0',
  }));
};

export const createMockTextDocument = (overrides?: Partial<TextDocument>): TextDocument =>
  ({
    uri: vscode.Uri.file('/test/test.proof'),
    fileName: '/test/test.proof',
    isUntitled: false,
    languageId: 'proof',
    version: 1,
    isDirty: false,
    isClosed: false,
    save: vi.fn(),
    eol: 1,
    lineCount: 1,
    getText: vi.fn().mockReturnValue('mock proof content'),
    getWordRangeAtPosition: vi.fn(),
    validateRange: vi.fn(),
    validatePosition: vi.fn(),
    offsetAt: vi.fn(),
    positionAt: vi.fn(),
    lineAt: vi.fn(),
    ...overrides,
  }) as unknown as TextDocument;

export const createMockTextEditor = (document?: TextDocument): TextEditor =>
  ({
    document: document || createMockTextDocument(),
    selection: new vscode.Selection(0, 0, 0, 0),
    selections: [new vscode.Selection(0, 0, 0, 0)],
    visibleRanges: [new vscode.Range(0, 0, 0, 0)],
    options: {
      cursorStyle: 1,
      insertSpaces: true,
      indentSize: 2,
      tabSize: 2,
      lineNumbers: 1,
    },
    viewColumn: 1,
    edit: vi.fn(),
    insertSnippet: vi.fn(),
    setDecorations: vi.fn(),
    revealRange: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  }) as unknown as TextEditor;

export const createMockWebviewPanel = (): vscode.WebviewPanel =>
  ({
    title: 'Test Panel',
    iconPath: undefined,
    viewType: 'testView',
    active: true,
    visible: true,
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidDispose: vi.fn(),
    onDidChangeViewState: vi.fn(),
    webview: {
      html: '',
      postMessage: vi.fn(),
      options: {},
      onDidReceiveMessage: vi.fn(),
      asWebviewUri: vi.fn(),
      cspSource: 'test',
    },
  }) as unknown as vscode.WebviewPanel;

export const createMockChangeEvent = (document?: TextDocument): TextDocumentChangeEvent => ({
  document: document || createMockTextDocument(),
  contentChanges: [],
  reason: 1,
});

export const createMockExtensionContext = (): vscode.ExtensionContext =>
  ({
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn().mockReturnValue([]),
    },
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn().mockReturnValue([]),
      setKeysForSync: vi.fn(),
    },
    secrets: {
      get: vi.fn(),
      store: vi.fn(),
      delete: vi.fn(),
      onDidChange: vi.fn(),
    },
    extensionPath: '/test/extension',
    storagePath: '/test/storage',
    globalStoragePath: '/test/global-storage',
    logPath: '/test/logs',
    logUri: vscode.Uri.file('/test/logs'),
    globalStorageUri: vscode.Uri.file('/test/global-storage'),
    storageUri: vscode.Uri.file('/test/storage'),
    languageModelAccessInformation: {
      onDidChange: vi.fn(),
      canSendRequest: vi.fn(),
    },
    asAbsolutePath: vi.fn().mockImplementation((path: string) => `/test/extension/${path}`),
    extensionMode: 1,
    environmentVariableCollection: {
      replace: vi.fn(),
      append: vi.fn(),
      prepend: vi.fn(),
      get: vi.fn(),
      forEach: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      getScoped: vi.fn(),
    },
  }) as unknown as vscode.ExtensionContext;
