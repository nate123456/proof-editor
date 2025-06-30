import { NodeEntity } from '../entities/NodeEntity';
import { NodeId, TreeId } from '../shared/value-objects.js';
import type { Result } from '../shared/result.js';
import { RepositoryError } from '../errors/DomainErrors';

export interface INodeRepository {
  save(node: NodeEntity): Promise<Result<void, RepositoryError>>;
  findById(id: NodeId): Promise<NodeEntity | null>;
  findByTree(treeId: TreeId): Promise<NodeEntity[]>;
  delete(id: NodeId): Promise<Result<void, RepositoryError>>;
}