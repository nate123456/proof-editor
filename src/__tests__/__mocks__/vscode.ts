/**
 * VSCode API Mock for Testing
 *
 * Provides mock implementations of VSCode API interfaces
 * for use in unit and integration tests.
 */

import { vi } from 'vitest';

// URI Mock
export class Uri {
  constructor(
    public scheme: string,
    public authority: string,
    public path: string,
    public query: string,
    public fragment: string,
  ) {}

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string): Uri {
    return new Uri('file', '', value, '', '');
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}${this.query ? `?${this.query}` : ''}${this.fragment ? `#${this.fragment}` : ''}`;
  }

  /**
   * The file system path of this URI.
   */
  get fsPath(): string {
    return this.path;
  }

  /**
   * Derive a new Uri from this Uri.
   */
  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return new Uri(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment,
    );
  }

  /**
   * Returns a JSON representation of this Uri.
   */
  toJSON(): object {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
    };
  }
}

// Range Mock
export class Range {
  constructor(
    public start: Position,
    public end: Position,
  ) {}
}

// Position Mock
export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}
}

// ViewColumn enum
export enum ViewColumn {
  One = 1,
  Two = 2,
  Three = 3,
  Active = -1,
  Beside = -2,
}

// Commands API Mock
export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

// Window API Mock
export const window = {
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  createWebviewPanel: vi.fn(),
  activeTextEditor: null as TextEditor | null,
  showTextDocument: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
};

// Workspace API Mock
export const workspace = {
  getConfiguration: vi.fn(),
  onDidChangeConfiguration: vi.fn(),
  workspaceFolders: [] as Array<{ uri: Uri; name: string; index: number }>,
  onDidSaveTextDocument: vi.fn(),
  onDidChangeTextDocument: vi.fn(),
  openTextDocument: vi.fn(),
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
};

// Extension Context Mock
export class ExtensionContext {
  subscriptions: Array<{ dispose(): void }> = [];
  extensionPath: string = '/mock/extension/path';
  globalState = {
    get: vi.fn(),
    update: vi.fn(),
  };
  workspaceState = {
    get: vi.fn(),
    update: vi.fn(),
  };
  asAbsolutePath = vi.fn();
  storagePath?: string;
  globalStoragePath: string = '/mock/global/storage';
  logPath: string = '/mock/log/path';
}

// Webview Mock
export class Webview {
  html: string = '';
  onDidReceiveMessage = vi.fn();
  postMessage = vi.fn();
  cspSource: string = '';
  asWebviewUri = vi.fn();
}

// WebviewPanel Mock
export class WebviewPanel {
  webview: Webview = new Webview();
  title: string = '';
  reveal = vi.fn();
  dispose = vi.fn();
  onDidDispose = vi.fn();
  onDidChangeViewState = vi.fn();
  active: boolean = true;
  visible: boolean = true;
  viewColumn?: ViewColumn;
}

// Configuration Mock
export class WorkspaceConfiguration {
  private _config: Record<string, unknown> = {};

  get<T>(section: string, defaultValue?: T): T {
    return (this._config[section] ?? defaultValue) as T;
  }

  update(section: string, value: unknown): Promise<void> {
    this._config[section] = value;
    return Promise.resolve();
  }
}

// TextEditor interface for proper typing
export interface TextEditor {
  document: TextDocument;
  selection: Selection;
  selections: Selection[];
  viewColumn?: ViewColumn;
  options: unknown;
  edit: unknown;
  insertSnippet: unknown;
  setDecorations: unknown;
  revealRange: unknown;
  show: unknown;
  hide: unknown;
}

// TextDocument interface for proper typing
export interface TextDocument {
  uri: Uri;
  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  save(): Thenable<boolean>;
  eol: number;
  lineCount: number;
  lineAt(line: number): TextLine;
  lineAt(position: Position): TextLine;
  offsetAt(position: Position): number;
  positionAt(offset: number): Position;
  getText(range?: Range): string;
  getWordRangeAtPosition(position: Position, regex?: RegExp): Range | undefined;
  validateRange(range: Range): Range;
  validatePosition(position: Position): Position;
}

// TextLine interface for proper typing
export interface TextLine {
  lineNumber: number;
  text: string;
  range: Range;
  rangeIncludingLineBreak: Range;
  firstNonWhitespaceCharacterIndex: number;
  isEmptyOrWhitespace: boolean;
}

// Selection class for proper typing
export class Selection extends Range {
  constructor(
    public anchor: Position,
    public active: Position,
  ) {
    super(anchor, active);
  }

  get isReversed(): boolean {
    return (
      this.anchor.line > this.active.line ||
      (this.anchor.line === this.active.line && this.anchor.character > this.active.character)
    );
  }
}

// Default exports for compatibility
export default {
  Uri,
  Range,
  Position,
  ViewColumn,
  commands,
  window,
  workspace,
  ExtensionContext,
  Webview,
  WebviewPanel,
  WorkspaceConfiguration,
};
