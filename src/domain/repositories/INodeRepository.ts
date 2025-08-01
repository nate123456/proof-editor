import type { Result } from 'neverthrow';
import type { Node } from '../entities/Node';
import type { RepositoryError } from '../errors/DomainErrors';
import type { NodeId, TreeId } from '../shared/value-objects/index.js';

export interface INodeRepository {
  save(node: Node): Promise<Result<void, RepositoryError>>;
  findById(id: NodeId): Promise<Result<Node, RepositoryError>>;
  findByTree(treeId: TreeId): Promise<Result<Node[], RepositoryError>>;
  delete(id: NodeId): Promise<Result<void, RepositoryError>>;
}
