import { err, ok, type Result } from 'neverthrow';
import * as vscode from 'vscode';
import type {
  Disposable,
  DocumentMetadata,
  FileChangeEvent,
  FileInfo,
  FileSystemCapabilities,
  FileSystemError,
  IFileSystemPort,
  StoredDocument,
} from '../../application/ports/IFileSystemPort.js';

export class VSCodeFileSystemAdapter implements IFileSystemPort {
  private readonly storedDocuments = new Map<string, StoredDocument>();
  private readonly storageKey = 'proof-editor.offline-documents';

  constructor(private readonly context: vscode.ExtensionContext) {
    this.loadStoredDocuments();
  }

  async readFile(path: string): Promise<Result<string, FileSystemError>> {
    try {
      const uri = vscode.Uri.file(path);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder('utf-8').decode(content);
      return ok(text);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  async writeFile(path: string, content: string): Promise<Result<void, FileSystemError>> {
    try {
      const uri = vscode.Uri.file(path);
      const buffer = new TextEncoder().encode(content);
      await vscode.workspace.fs.writeFile(uri, buffer);
      return ok(undefined);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  async exists(path: string): Promise<Result<boolean, FileSystemError>> {
    try {
      const uri = vscode.Uri.file(path);
      const stat = await vscode.workspace.fs.stat(uri);
      return ok(stat !== undefined);
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        return ok(false);
      }
      return err(this.mapError(error, path));
    }
  }

  async delete(path: string): Promise<Result<void, FileSystemError>> {
    try {
      const uri = vscode.Uri.file(path);
      await vscode.workspace.fs.delete(uri, { recursive: false, useTrash: true });
      return ok(undefined);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  async readDirectory(path: string): Promise<Result<FileInfo[], FileSystemError>> {
    try {
      const uri = vscode.Uri.file(path);
      const entries = await vscode.workspace.fs.readDirectory(uri);

      const fileInfos: FileInfo[] = await Promise.all(
        entries.map(async ([name, type]) => {
          const entryUri = vscode.Uri.joinPath(uri, name);
          const stat = await vscode.workspace.fs.stat(entryUri);

          return {
            path: entryUri.fsPath,
            name,
            isDirectory: type === vscode.FileType.Directory,
            size: stat.size,
            modifiedAt: new Date(stat.mtime),
          };
        }),
      );

      return ok(fileInfos);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  async createDirectory(path: string): Promise<Result<void, FileSystemError>> {
    try {
      const uri = vscode.Uri.file(path);
      await vscode.workspace.fs.createDirectory(uri);
      return ok(undefined);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  watch(path: string, callback: (event: FileChangeEvent) => void): Disposable {
    const uri = vscode.Uri.file(path);
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(uri, '**/*'),
    );

    const disposables: vscode.Disposable[] = [];

    disposables.push(
      watcher.onDidCreate((uri) => {
        callback({ type: 'created', path: uri.fsPath });
      }),
    );

    disposables.push(
      watcher.onDidChange((uri) => {
        callback({ type: 'changed', path: uri.fsPath });
      }),
    );

    disposables.push(
      watcher.onDidDelete((uri) => {
        callback({ type: 'deleted', path: uri.fsPath });
      }),
    );

    disposables.push(watcher);

    return {
      dispose: () => {
        disposables.forEach((d) => d.dispose());
      },
    };
  }

  async getStoredDocument(id: string): Promise<Result<StoredDocument | null, FileSystemError>> {
    try {
      const doc = this.storedDocuments.get(id);
      return ok(doc || null);
    } catch (error) {
      return err({
        code: 'UNKNOWN',
        message: `Failed to retrieve stored document: ${error}`,
      });
    }
  }

  async storeDocument(doc: StoredDocument): Promise<Result<void, FileSystemError>> {
    try {
      this.storedDocuments.set(doc.id, doc);
      await this.saveStoredDocuments();
      return ok(undefined);
    } catch (error) {
      return err({
        code: 'QUOTA_EXCEEDED',
        message: `Failed to store document: ${error}`,
      });
    }
  }

  async deleteStoredDocument(id: string): Promise<Result<void, FileSystemError>> {
    try {
      this.storedDocuments.delete(id);
      await this.saveStoredDocuments();
      return ok(undefined);
    } catch (error) {
      return err({
        code: 'UNKNOWN',
        message: `Failed to delete stored document: ${error}`,
      });
    }
  }

  async listStoredDocuments(): Promise<Result<DocumentMetadata[], FileSystemError>> {
    try {
      const metadata = Array.from(this.storedDocuments.values()).map((doc) => doc.metadata);
      return ok(metadata);
    } catch (error) {
      return err({
        code: 'UNKNOWN',
        message: `Failed to list stored documents: ${error}`,
      });
    }
  }

  capabilities(): FileSystemCapabilities {
    return {
      canWatch: true,
      canAccessArbitraryPaths: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      supportsOfflineStorage: true,
      persistence: 'permanent',
    };
  }

  private loadStoredDocuments(): void {
    const stored =
      this.context.globalState?.get<Record<string, StoredDocument>>(this.storageKey, {}) || {};
    this.storedDocuments.clear();
    Object.entries(stored).forEach(([id, doc]) => {
      // Convert stored dates back to Date objects
      doc.metadata.modifiedAt = new Date(doc.metadata.modifiedAt);
      this.storedDocuments.set(id, doc);
    });
  }

  private async saveStoredDocuments(): Promise<void> {
    const toStore = Object.fromEntries(this.storedDocuments.entries());
    await this.context.globalState?.update(this.storageKey, toStore);
  }

  private mapError(error: unknown, path?: string): FileSystemError {
    if (this.isFileNotFoundError(error)) {
      const result: FileSystemError = {
        code: 'NOT_FOUND',
        message: `File not found: ${path}`,
      };
      if (path !== undefined) {
        result.path = path;
      }
      return result;
    }

    if (this.isPermissionError(error)) {
      const result: FileSystemError = {
        code: 'PERMISSION_DENIED',
        message: `Permission denied: ${path}`,
      };
      if (path !== undefined) {
        result.path = path;
      }
      return result;
    }

    if (this.isDiskFullError(error)) {
      const result: FileSystemError = {
        code: 'DISK_FULL',
        message: 'No space left on device',
      };
      if (path !== undefined) {
        result.path = path;
      }
      return result;
    }

    const result: FileSystemError = {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    };
    if (path !== undefined) {
      result.path = path;
    }
    return result;
  }

  private isFileNotFoundError(error: unknown): boolean {
    if (error instanceof vscode.FileSystemError) {
      return error.code === 'FileNotFound' || error.code === 'ENOENT';
    }
    return false;
  }

  private isPermissionError(error: unknown): boolean {
    if (error instanceof vscode.FileSystemError) {
      return error.code === 'NoPermissions' || error.code === 'EACCES';
    }
    return false;
  }

  private isDiskFullError(error: unknown): boolean {
    if (error instanceof vscode.FileSystemError) {
      return error.code === 'ENOSPC';
    }
    return false;
  }
}
