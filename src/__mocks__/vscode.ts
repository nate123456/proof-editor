import { type Mock, vi } from 'vitest';

// Mock VS Code API for testing
export const languages = {
  createDiagnosticCollection: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  })),
};

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
} as const;

export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}
}

export class Range {
  constructor(
    public start: Position,
    public end: Position,
  ) {}
}

export class Diagnostic {
  public source?: string;
  public code?: string;

  constructor(
    public range: Range,
    public message: string,
    public severity?: number,
  ) {}
}

// Create mock event emitters
const mockEventEmitter = () => ({ dispose: vi.fn() });

// Mock workspace methods as mutable for testing
class MockWorkspace {
  public textDocuments: TextDocument[] = [];

  public onDidOpenTextDocument = vi.fn(() => mockEventEmitter());
  public onDidChangeTextDocument = vi.fn(() => mockEventEmitter());
  public onDidCloseTextDocument = vi.fn(() => mockEventEmitter());
}

const mockWorkspace = new MockWorkspace();

// Mock window methods as mutable for testing
class MockWindow {
  public activeTextEditor: TextEditor | undefined = undefined;

  public onDidChangeActiveTextEditor = vi.fn(() => mockEventEmitter());
  public showInformationMessage = vi.fn();
  public showWarningMessage = vi.fn();
  public showErrorMessage = vi.fn();
  public createWebviewPanel = vi.fn();
}

const mockWindow = new MockWindow();

// Mock commands
class MockCommands {
  public registerCommand = vi.fn();
}

const mockCommands = new MockCommands();

export const workspace = mockWorkspace;

export const window = mockWindow;

export const commands = mockCommands;

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
} as const;

export class Uri {
  private constructor(
    public scheme: string,
    public authority: string,
    public path: string,
    public query: string,
    public fragment: string,
  ) {}

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}`;
  }

  static parse(value: string): Uri {
    return new Uri('file', '', value, '', '');
  }

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    return new Uri(
      base.scheme,
      base.authority,
      `${base.path}/${pathSegments.join('/')}`,
      base.query,
      base.fragment,
    );
  }

  with(
    change: Partial<{
      scheme: string;
      authority: string;
      path: string;
      query: string;
      fragment: string;
    }>,
  ): Uri {
    return new Uri(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment,
    );
  }

  get fsPath() {
    return this.path;
  }
}

// Mock types that are used in type annotations
export interface TextLine {
  text: string;
  lineNumber: number;
  range: Range;
  rangeIncludingLineBreak: Range;
  firstNonWhitespaceCharacterIndex: number;
  isEmptyOrWhitespace: boolean;
}

export interface TextDocument {
  languageId: string;
  uri: Uri;
  getText(): string;
  lineCount: number;
  lineAt(line: number): TextLine;
  lineAt(position: Position): TextLine;
  fileName: string;
  isUntitled: boolean;
  encoding: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  save(): Thenable<boolean>;
  eol: number;
  getWordRangeAtPosition(position: Position, regex?: RegExp): Range | undefined;
  validateRange(range: Range): Range;
  validatePosition(position: Position): Position;
  offsetAt(position: Position): number;
  positionAt(offset: number): Position;
}

export interface TextDocumentChangeEvent {
  document: TextDocument;
  contentChanges: unknown[];
  reason: number;
}

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

export interface TextEditor {
  document: TextDocument;
  viewColumn?: number;
  selection: Selection;
  selections: Selection[];
  visibleRanges: Range[];
  options: unknown;
  edit: unknown;
  insertSnippet: unknown;
  setDecorations: unknown;
  revealRange: unknown;
  show: unknown;
  hide: unknown;
}

export interface WebviewPanel {
  viewType: string;
  title: string;
  options: unknown;
  viewColumn?: number;
  active: boolean;
  visible: boolean;
  onDidChangeViewState: Mock;
  reveal: Mock;
  dispose: Mock;
  onDidDispose: Mock;
  webview: {
    html: string;
    postMessage: Mock;
    options: unknown;
    onDidReceiveMessage: Mock;
    asWebviewUri: Mock;
    cspSource: string;
  };
}

export interface ExtensionContext {
  subscriptions: Disposable[];
  extensionUri: Uri;
  workspaceState: {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): Thenable<void>;
    keys(): readonly string[];
  };
  globalState: {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): Thenable<void>;
    setKeysForSync(keys: readonly string[]): void;
    keys(): readonly string[];
  };
  secrets: {
    get(key: string): Thenable<string | undefined>;
    store(key: string, value: string): Thenable<void>;
    delete(key: string): Thenable<void>;
    onDidChange: unknown;
  };
  extensionPath: string;
  extensionMode: number;
  globalStorageUri: Uri;
  globalStoragePath: string;
  logUri: Uri;
  logPath: string;
  storageUri?: Uri;
  storagePath?: string;
  asAbsolutePath(relativePath: string): string;
  environmentVariableCollection: unknown;
  extension: {
    id: string;
    extensionUri: Uri;
    extensionPath: string;
    isActive: boolean;
    packageJSON: unknown;
    exports: unknown;
    activate(): Thenable<unknown>;
    extensionKind: number;
  };
  languageModelAccessInformation: unknown;
}

export interface Disposable {
  dispose(): void;
}
