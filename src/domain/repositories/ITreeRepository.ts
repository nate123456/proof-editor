import { TreeEntity } from '../entities/TreeEntity';
import { TreeId, DocumentId } from '../shared/value-objects.js';
import type { Result } from '../shared/result.js';
import { RepositoryError } from '../errors/DomainErrors';

export interface ITreeRepository {
  save(tree: TreeEntity): Promise<Result<void, RepositoryError>>;
  findById(id: TreeId): Promise<TreeEntity | null>;
  findByDocument(documentId: DocumentId): Promise<TreeEntity[]>;
  delete(id: TreeId): Promise<Result<void, RepositoryError>>;
}