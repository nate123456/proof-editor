import type { FileSystemError } from '../../../application/ports/IFileSystemPort.js';
import type { RepositoryError } from '../../../domain/repositories/IProofAggregateRepository.js';

export function createRepositoryError(
  message: string,
  code: string,
  cause?: Error,
): RepositoryError {
  const error = new Error(message) as RepositoryError;
  error.name = 'RepositoryError';
  error.code = code;
  if (cause !== undefined) {
    error.cause = cause;
  }
  return error;
}

export function mapFileSystemErrorToRepositoryError(fsError: FileSystemError): RepositoryError {
  const codeMap: Record<FileSystemError['code'], string> = {
    NOT_FOUND: 'ENTITY_NOT_FOUND',
    PERMISSION_DENIED: 'ACCESS_DENIED',
    DISK_FULL: 'STORAGE_FULL',
    INVALID_PATH: 'INVALID_IDENTIFIER',
    QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
    UNKNOWN: 'UNKNOWN_ERROR',
  };

  return createRepositoryError(
    fsError.message,
    codeMap[fsError.code] || 'UNKNOWN_ERROR',
    new Error(fsError.message),
  );
}
