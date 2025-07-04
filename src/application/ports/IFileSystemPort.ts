import type { Result } from 'neverthrow';

export interface IFileSystemPort {
  // Basic file operations
  readFile(path: string): Promise<Result<string, FileSystemError>>;
  writeFile(path: string, content: string): Promise<Result<void, FileSystemError>>;
  exists(path: string): Promise<Result<boolean, FileSystemError>>;
  delete(path: string): Promise<Result<void, FileSystemError>>;

  // Directory operations
  readDirectory(path: string): Promise<Result<FileInfo[], FileSystemError>>;
  createDirectory(path: string): Promise<Result<void, FileSystemError>>;

  // Watch operations (optional - not all platforms support)
  watch?(path: string, callback: (event: FileChangeEvent) => void): Disposable;

  // Offline storage operations (for mobile support)
  getStoredDocument(id: string): Promise<Result<StoredDocument | null, FileSystemError>>;
  storeDocument(doc: StoredDocument): Promise<Result<void, FileSystemError>>;
  deleteStoredDocument(id: string): Promise<Result<void, FileSystemError>>;
  listStoredDocuments(): Promise<Result<DocumentMetadata[], FileSystemError>>;

  // Platform capabilities
  capabilities(): FileSystemCapabilities;
}

export interface FileInfo {
  path: string;
  name: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
}

export interface FileChangeEvent {
  type: 'created' | 'changed' | 'deleted';
  path: string;
}

export interface StoredDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  version: number;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  modifiedAt: Date;
  size: number;
  syncStatus?: 'local' | 'synced' | 'conflict';
}

export interface FileSystemCapabilities {
  canWatch: boolean;
  canAccessArbitraryPaths: boolean; // false on mobile
  maxFileSize?: number;
  supportsOfflineStorage: boolean;
  persistence: 'memory' | 'session' | 'permanent';
}

export interface FileSystemError {
  code:
    | 'NOT_FOUND'
    | 'PERMISSION_DENIED'
    | 'DISK_FULL'
    | 'INVALID_PATH'
    | 'QUOTA_EXCEEDED'
    | 'UNKNOWN';
  message: string;
  path?: string;
}

export interface Disposable {
  dispose(): void;
}
