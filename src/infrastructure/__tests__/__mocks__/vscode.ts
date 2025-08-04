import { vi } from 'vitest';

// Mock vscode module - export as named exports to match how vscode module works
export const workspace = {
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
    delete: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
  },
  createFileSystemWatcher: vi.fn().mockReturnValue({
    onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    dispose: vi.fn(),
  }),
};

export const Uri = {
  file: (path: string) => ({ fsPath: path }),
  joinPath: (uri: any, name: string) => ({ fsPath: `${uri.fsPath}/${name}` }),
  parse: (url: string) => ({ toString: () => url }),
};

export class FileSystemError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.code = code;
  }
}

export const FileType = {
  Directory: 2,
  File: 1,
};

export const window = {
  createWebviewPanel: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  withProgress: vi.fn(),
  setStatusBarMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  activeColorTheme: { kind: 1 },
};

export const ViewColumn = { One: 1 };
export const ProgressLocation = { Notification: 1 };
export const ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3 };

export const env = {
  openExternal: vi.fn(),
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
};

export class RelativePattern {
  constructor(
    public base: any,
    public pattern: string,
  ) {}
}

export const version = '1.0.0';

// Also export as default for compatibility
const vscode = {
  workspace,
  Uri,
  FileSystemError,
  FileType,
  window,
  ViewColumn,
  ProgressLocation,
  ColorThemeKind,
  env,
  RelativePattern,
  version,
};

export default vscode;
