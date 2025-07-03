import type { Node } from '../entities/Node';
import type { RepositoryError } from '../errors/DomainErrors';
import type { Result } from '../shared/result.js';
import type { NodeId, TreeId } from '../shared/value-objects.js';

export interface INodeRepository {
  save(node: Node): Promise<Result<void, RepositoryError>>;
  findById(id: NodeId): Promise<Node | null>;
  findByTree(treeId: TreeId): Promise<Node[]>;
  delete(id: NodeId): Promise<Result<void, RepositoryError>>;
}
