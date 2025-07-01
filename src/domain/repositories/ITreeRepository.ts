import { type Tree } from '../entities/Tree';
import { type RepositoryError } from '../errors/DomainErrors';
import { type Result } from '../shared/result.js';
import { type DocumentId, type TreeId } from '../shared/value-objects.js';

export interface ITreeRepository {
  save(tree: Tree): Promise<Result<void, RepositoryError>>;
  findById(id: TreeId): Promise<Tree | null>;
  findByDocument(documentId: DocumentId): Promise<Tree[]>;
  delete(id: TreeId): Promise<Result<void, RepositoryError>>;
}
