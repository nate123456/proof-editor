import type { Result } from 'neverthrow';
import type {
  DocumentContent,
  DocumentId,
  DocumentVersion,
  ErrorCode,
  ErrorMessage,
  FileName,
  FilePath,
  FileSize,
  Timestamp,
  Title,
} from '../../domain/shared/value-objects/index.js';

export interface IFileSystemPort {
  // Basic file operations
  readFile(path: FilePath): Promise<Result<DocumentContent, FileSystemError>>;
  writeFile(path: FilePath, content: DocumentContent): Promise<Result<void, FileSystemError>>;
  exists(path: FilePath): Promise<Result<boolean, FileSystemError>>;
  delete(path: FilePath): Promise<Result<void, FileSystemError>>;

  // Directory operations
  readDirectory(path: FilePath): Promise<Result<FileInfo[], FileSystemError>>;
  createDirectory(path: FilePath): Promise<Result<void, FileSystemError>>;

  // Watch operations (optional - not all platforms support)
  watch?(path: FilePath, callback: (event: FileChangeEvent) => void): Disposable;

  // Offline storage operations (for mobile support)
  getStoredDocument(id: DocumentId): Promise<Result<StoredDocument | null, FileSystemError>>;
  storeDocument(doc: StoredDocument): Promise<Result<void, FileSystemError>>;
  deleteStoredDocument(id: DocumentId): Promise<Result<void, FileSystemError>>;
  listStoredDocuments(): Promise<Result<DocumentMetadata[], FileSystemError>>;

  // Platform capabilities
  capabilities(): FileSystemCapabilities;
}

export interface FileInfo {
  path: FilePath;
  name: FileName;
  isDirectory: boolean;
  size?: FileSize;
  modifiedAt?: Date;
}

export interface FileChangeEvent {
  type: 'created' | 'changed' | 'deleted';
  path: FilePath;
}

export interface StoredDocument {
  id: DocumentId;
  content: DocumentContent;
  metadata: DocumentMetadata;
  version: DocumentVersion;
}

export interface DocumentMetadata {
  id: DocumentId;
  title: Title;
  modifiedAt: Timestamp;
  size: FileSize;
  syncStatus?: 'local' | 'synced' | 'conflict';
}

export interface FileSystemCapabilities {
  canWatch: boolean;
  canAccessArbitraryPaths: boolean; // false on mobile
  maxFileSize?: FileSize;
  supportsOfflineStorage: boolean;
  persistence: 'memory' | 'session' | 'permanent';
}

export interface FileSystemError {
  code: ErrorCode;
  message: ErrorMessage;
  path?: FilePath;
}

export interface Disposable {
  dispose(): void;
}
