import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import { YAMLProofDocumentRepository } from './yaml/YAMLProofDocumentRepository.js';

export function createProofDocumentRepository(
  fileSystem: IFileSystemPort,
  basePath: string,
): IProofDocumentRepository {
  // In the future, could support different implementations (JSON, SQLite, etc.)
  return new YAMLProofDocumentRepository(fileSystem, basePath);
}
