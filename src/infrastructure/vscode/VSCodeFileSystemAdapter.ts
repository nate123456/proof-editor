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
import {
  DocumentContent,
  type DocumentId,
  ErrorCode,
  ErrorMessage,
  FileName,
  FilePath,
  FileSize,
  Timestamp,
} from '../../domain/shared/value-objects/index.js';

export class VSCodeFileSystemAdapter implements IFileSystemPort {
  private readonly storedDocuments = new Map<string, StoredDocument>();
  private readonly storageKey = 'proof-editor.offline-documents';

  constructor(private readonly context: vscode.ExtensionContext) {
    if (context) {
      this.loadStoredDocuments();
    }
  }

  async readFile(path: FilePath): Promise<Result<DocumentContent, FileSystemError>> {
    try {
      if (!vscode.workspace?.fs) {
        return err(this.createError('UNKNOWN', 'VS Code workspace.fs is not available', path));
      }
      if (!vscode.Uri?.file) {
        return err(this.createError('UNKNOWN', 'VS Code Uri.file is not available', path));
      }
      const uri = vscode.Uri.file(path.getValue());
      const content = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder('utf-8').decode(content);
      const documentContent = DocumentContent.create(text);
      if (documentContent.isErr()) {
        return err(this.createError('INVALID_CONTENT', documentContent.error.message, path));
      }
      return ok(documentContent.value);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  async writeFile(
    path: FilePath,
    content: DocumentContent,
  ): Promise<Result<void, FileSystemError>> {
    try {
      if (!vscode.workspace?.fs) {
        return err(this.createError('UNKNOWN', 'VS Code workspace.fs is not available', path));
      }
      const uri = vscode.Uri.file(path.getValue());
      const buffer = new TextEncoder().encode(content.getValue());
      await vscode.workspace.fs.writeFile(uri, buffer);
      return ok(undefined);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  async exists(path: FilePath): Promise<Result<boolean, FileSystemError>> {
    try {
      if (!vscode.workspace?.fs) {
        return err(this.createError('UNKNOWN', 'VS Code workspace.fs is not available', path));
      }
      const uri = vscode.Uri.file(path.getValue());
      const stat = await vscode.workspace.fs.stat(uri);
      return ok(stat !== undefined);
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        return ok(false);
      }
      return err(this.mapError(error, path));
    }
  }

  async delete(path: FilePath): Promise<Result<void, FileSystemError>> {
    try {
      if (!vscode.workspace?.fs) {
        return err(this.createError('UNKNOWN', 'VS Code workspace.fs is not available', path));
      }
      const uri = vscode.Uri.file(path.getValue());
      await vscode.workspace.fs.delete(uri, { recursive: false, useTrash: true });
      return ok(undefined);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  async readDirectory(path: FilePath): Promise<Result<FileInfo[], FileSystemError>> {
    try {
      if (!vscode.workspace?.fs) {
        return err(this.createError('UNKNOWN', 'VS Code workspace.fs is not available', path));
      }
      const uri = vscode.Uri.file(path.getValue());
      const entries = await vscode.workspace.fs.readDirectory(uri);

      const fileInfos: FileInfo[] = [];
      for (const [name, type] of entries) {
        try {
          const entryUri = vscode.Uri.joinPath(uri, name);
          const stat = await vscode.workspace.fs.stat(entryUri);

          const filePath = FilePath.create(entryUri.fsPath);
          const fileName = FileName.create(name);
          const fileSize = FileSize.create(stat.size);

          if (filePath.isOk() && fileName.isOk() && fileSize.isOk()) {
            fileInfos.push({
              path: filePath.value,
              name: fileName.value,
              isDirectory: type === vscode.FileType.Directory,
              size: fileSize.value,
              modifiedAt: new Date(stat.mtime),
            });
          }
        } catch {
          // Skip files we can't stat
        }
      }

      return ok(fileInfos);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  async createDirectory(path: FilePath): Promise<Result<void, FileSystemError>> {
    try {
      if (!vscode.workspace?.fs) {
        return err(this.createError('UNKNOWN', 'VS Code workspace.fs is not available', path));
      }
      const uri = vscode.Uri.file(path.getValue());
      await vscode.workspace.fs.createDirectory(uri);
      return ok(undefined);
    } catch (error) {
      return err(this.mapError(error, path));
    }
  }

  watch(path: FilePath, callback: (event: FileChangeEvent) => void): Disposable {
    if (!vscode.workspace?.createFileSystemWatcher) {
      // Return a no-op disposable if workspace is not available
      return {
        dispose: () => {
          // No-op: workspace watcher not available
        },
      };
    }

    const uri = vscode.Uri.file(path.getValue());
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(uri, '**/*'),
    );

    const disposables: vscode.Disposable[] = [];

    disposables.push(
      watcher.onDidCreate((uri) => {
        const filePath = FilePath.create(uri.fsPath);
        if (filePath.isOk()) {
          callback({ type: 'created', path: filePath.value });
        }
      }),
    );

    disposables.push(
      watcher.onDidChange((uri) => {
        const filePath = FilePath.create(uri.fsPath);
        if (filePath.isOk()) {
          callback({ type: 'changed', path: filePath.value });
        }
      }),
    );

    disposables.push(
      watcher.onDidDelete((uri) => {
        const filePath = FilePath.create(uri.fsPath);
        if (filePath.isOk()) {
          callback({ type: 'deleted', path: filePath.value });
        }
      }),
    );

    disposables.push(watcher);

    return {
      dispose: () => {
        disposables.forEach((d) => {
          try {
            d.dispose();
          } catch {
            // Handle disposal errors gracefully
          }
        });
      },
    };
  }

  async getStoredDocument(id: DocumentId): Promise<Result<StoredDocument | null, FileSystemError>> {
    try {
      const doc = this.storedDocuments.get(id.getValue());
      return ok(doc || null);
    } catch (error) {
      return err(this.createError('UNKNOWN', `Failed to retrieve stored document: ${error}`));
    }
  }

  async storeDocument(doc: StoredDocument): Promise<Result<void, FileSystemError>> {
    try {
      this.storedDocuments.set(doc.id.getValue(), doc);
      await this.saveStoredDocuments();
      return ok(undefined);
    } catch (error) {
      return err(this.createError('QUOTA_EXCEEDED', `Failed to store document: ${error}`));
    }
  }

  async deleteStoredDocument(id: DocumentId): Promise<Result<void, FileSystemError>> {
    try {
      this.storedDocuments.delete(id.getValue());
      await this.saveStoredDocuments();
      return ok(undefined);
    } catch (error) {
      return err(this.createError('UNKNOWN', `Failed to delete stored document: ${error}`));
    }
  }

  async listStoredDocuments(): Promise<Result<DocumentMetadata[], FileSystemError>> {
    try {
      const metadata = Array.from(this.storedDocuments.values()).map((doc) => doc.metadata);
      return ok(metadata);
    } catch (error) {
      return err(this.createError('UNKNOWN', `Failed to list stored documents: ${error}`));
    }
  }

  capabilities(): FileSystemCapabilities {
    const maxFileSizeResult = FileSize.create(100 * 1024 * 1024); // 100MB
    const result: FileSystemCapabilities = {
      canWatch: true,
      canAccessArbitraryPaths: true,
      supportsOfflineStorage: true,
      persistence: 'permanent',
    };

    if (maxFileSizeResult.isOk()) {
      result.maxFileSize = maxFileSizeResult.value;
    }

    return result;
  }

  private loadStoredDocuments(): void {
    try {
      if (!this.context?.globalState) {
        // Handle case where context or globalState is undefined
        this.storedDocuments.clear();
        return;
      }

      const stored =
        this.context.globalState.get<Record<string, StoredDocument>>(this.storageKey, {}) || {};
      this.storedDocuments.clear();
      Object.entries(stored).forEach(([id, doc]) => {
        // Convert stored dates back to Timestamp objects
        // Handle both serialized Timestamp objects and raw numbers
        const modifiedAt = doc.metadata.modifiedAt as unknown;
        const timestampValue =
          typeof modifiedAt === 'object' &&
          modifiedAt !== null &&
          'value' in modifiedAt &&
          typeof (modifiedAt as { value: unknown }).value === 'number'
            ? (modifiedAt as { value: number }).value
            : typeof modifiedAt === 'number'
              ? modifiedAt
              : Date.now();
        const timestamp = Timestamp.fromDate(new Date(timestampValue));
        doc.metadata.modifiedAt = timestamp;
        this.storedDocuments.set(id, doc);
      });
    } catch (_error) {
      // Handle corrupted storage gracefully
      this.storedDocuments.clear();
    }
  }

  private async saveStoredDocuments(): Promise<void> {
    if (!this.context?.globalState) {
      // Handle case where context or globalState is undefined
      return;
    }

    const toStore = Object.fromEntries(this.storedDocuments.entries());
    await this.context.globalState.update(this.storageKey, toStore);
  }

  private mapError(error: unknown, path?: FilePath): FileSystemError {
    if (this.isFileNotFoundError(error)) {
      return this.createError('NOT_FOUND', `File not found: ${path?.getValue()}`, path);
    }

    if (this.isPermissionError(error)) {
      return this.createError('PERMISSION_DENIED', `Permission denied: ${path?.getValue()}`, path);
    }

    if (this.isDiskFullError(error)) {
      return this.createError('DISK_FULL', 'No space left on device', path);
    }

    return this.createError(
      'UNKNOWN',
      error instanceof Error ? error.message : String(error),
      path,
    );
  }

  private createError(code: string, message: string, path?: FilePath): FileSystemError {
    const errorCode = ErrorCode.create(code);
    const errorMessage = ErrorMessage.create(message);

    if (errorCode.isErr()) {
      // Fallback to basic error if value objects fail
      const fallbackCode = ErrorCode.create('UNKNOWN');
      const fallbackMessage = ErrorMessage.create('Unknown error');
      if (fallbackCode.isErr() || fallbackMessage.isErr()) {
        // Ultimate fallback - create minimal valid value objects
        const minimalCode = ErrorCode.create('U');
        const minimalMessage = ErrorMessage.create('Error');
        const error: FileSystemError = {
          code: minimalCode.isOk() ? minimalCode.value : ({} as ErrorCode),
          message: minimalMessage.isOk() ? minimalMessage.value : ({} as ErrorMessage),
        };
        if (path) {
          error.path = path;
        }
        return error;
      }
      const error: FileSystemError = {
        code: fallbackCode.value,
        message: fallbackMessage.value,
      };
      if (path) {
        error.path = path;
      }
      return error;
    }

    if (errorMessage.isErr()) {
      // Truncate or fix message if it's invalid
      const truncatedMessage = message.substring(0, 200);
      const fallbackMessage = ErrorMessage.create(truncatedMessage);
      if (fallbackMessage.isErr()) {
        const minimalMessage = ErrorMessage.create('Error');
        const error: FileSystemError = {
          code: errorCode.value,
          message: minimalMessage.isOk() ? minimalMessage.value : ({} as ErrorMessage),
        };
        if (path) {
          error.path = path;
        }
        return error;
      }
      const error: FileSystemError = {
        code: errorCode.value,
        message: fallbackMessage.value,
      };
      if (path) {
        error.path = path;
      }
      return error;
    }

    const error: FileSystemError = {
      code: errorCode.value,
      message: errorMessage.value,
    };
    if (path) {
      error.path = path;
    }
    return error;
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
