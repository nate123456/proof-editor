import type { Result } from 'neverthrow';
import type { Tree } from '../entities/Tree';
import type { RepositoryError } from '../errors/DomainErrors';
import type { DocumentId, TreeId } from '../shared/value-objects/index.js';

export interface ITreeRepository {
  save(tree: Tree): Promise<Result<void, RepositoryError>>;
  findById(id: TreeId): Promise<Result<Tree, RepositoryError>>;
  findByDocument(documentId: DocumentId): Promise<Result<Tree[], RepositoryError>>;
  delete(id: TreeId): Promise<Result<void, RepositoryError>>;
}
