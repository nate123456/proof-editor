import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';
import { ProcessingError } from '../../domain/errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../domain/repositories/IAtomicArgumentRepository.js';
import type { INodeRepository } from '../../domain/repositories/INodeRepository.js';
import type { ITreeRepository } from '../../domain/repositories/ITreeRepository.js';
import type { IGraphTraversalService } from '../../domain/services/IGraphTraversalService.js';
import { NodeId, TreeId } from '../../domain/shared/value-objects/index.js';
import { atomicArgumentToDTO } from '../mappers/AtomicArgumentMapper.js';
import type {
  FindPathBetweenNodesQuery,
  GetSubtreeQuery,
  GetTreeStructureQuery,
  NodeConnectionDTO,
  TreeNodeDTO,
  TreeStructureDTO,
} from './tree-queries.js';

/**
 * Query service for tree navigation and analysis using graphology.
 * Implements the query patterns expected by the tree navigation tests.
 */
@injectable()
export class ProofTreeQueryService {
  constructor(
    private readonly treeRepository: ITreeRepository,
    private readonly nodeRepository: INodeRepository,
    private readonly argumentRepository: IAtomicArgumentRepository,
    private readonly graphTraversalService: IGraphTraversalService,
  ) {}

  /**
   * Finds the shortest path between two nodes in a tree.
   * Returns the path as an array of TreeNodeDTO objects.
   */
  async findPathBetweenNodes(
    query: FindPathBetweenNodesQuery,
  ): Promise<Result<TreeNodeDTO[], ProcessingError>> {
    // Load tree
    const treeIdResult = TreeId.create(query.treeId);
    if (treeIdResult.isErr()) {
      return err(new ProcessingError('Invalid tree ID'));
    }

    const treeResult = await this.treeRepository.findById(treeIdResult.value);
    if (treeResult.isErr()) {
      return err(new ProcessingError('Tree not found'));
    }

    const tree = treeResult.value;
    // Build graph from tree
    const buildResult = await this.graphTraversalService.buildGraphFromTree(tree);
    if (buildResult.isErr()) {
      return err(buildResult.error);
    }

    // Find path
    const fromNodeIdResult = NodeId.create(query.fromNodeId);
    const toNodeIdResult = NodeId.create(query.toNodeId);
    if (fromNodeIdResult.isErr() || toNodeIdResult.isErr()) {
      return err(new ProcessingError('Invalid node ID'));
    }

    const pathResult = this.graphTraversalService.findPath(
      fromNodeIdResult.value,
      toNodeIdResult.value,
    );
    if (pathResult.isErr()) {
      return err(pathResult.error);
    }

    const path = pathResult.value;

    // Convert to DTOs
    const pathDTOs: TreeNodeDTO[] = [];
    for (const nodeId of path) {
      const nodeResult = await this.nodeRepository.findById(nodeId);
      if (nodeResult.isErr()) continue;

      const node = nodeResult.value;
      const dto: TreeNodeDTO = {
        nodeId: nodeId.getValue(),
        argumentId: node.getArgumentId().getValue(),
        isRoot: node.isRoot(),
      };

      // Add position if available
      const position = node.getPosition?.();
      if (position) {
        dto.position = {
          x: position.getX(),
          y: position.getY(),
        };
      }

      // Add argument details if requested
      if (query.includeArguments) {
        const argumentResult = await this.argumentRepository.findById(node.getArgumentId());
        if (argumentResult.isOk()) {
          dto.argument = atomicArgumentToDTO(argumentResult.value);
        }
      }

      pathDTOs.push(dto);
    }

    return ok(pathDTOs);
  }

  /**
   * Gets a subtree starting from a specified node with optional depth limit.
   * Returns the subtree structure including nodes and connections.
   */
  async getSubtree(query: GetSubtreeQuery): Promise<Result<TreeStructureDTO, ProcessingError>> {
    // Load tree
    const treeIdResult = TreeId.create(query.treeId);
    if (treeIdResult.isErr()) {
      return err(new ProcessingError('Invalid tree ID'));
    }

    const treeResult = await this.treeRepository.findById(treeIdResult.value);
    if (treeResult.isErr()) {
      return err(new ProcessingError('Tree not found'));
    }

    const tree = treeResult.value;
    // Build graph from tree
    const buildResult = await this.graphTraversalService.buildGraphFromTree(tree);
    if (buildResult.isErr()) {
      return err(buildResult.error);
    }

    // Get subtree
    const rootNodeIdResult = NodeId.create(query.rootNodeId);
    if (rootNodeIdResult.isErr()) {
      return err(new ProcessingError('Invalid root node ID'));
    }

    const subtreeResult = this.graphTraversalService.getSubtree(
      rootNodeIdResult.value,
      query.maxDepth,
    );
    if (subtreeResult.isErr()) {
      return err(subtreeResult.error);
    }

    const subtreeMap = subtreeResult.value;

    // Build node DTOs
    const nodes: TreeNodeDTO[] = [];
    const nodeIdToDTO = new Map<string, TreeNodeDTO>();

    for (const [_nodeIdStr, { node: nodeId }] of subtreeMap) {
      const nodeResult = await this.nodeRepository.findById(nodeId);
      if (nodeResult.isErr()) continue;

      const node = nodeResult.value;
      const dto: TreeNodeDTO = {
        nodeId: nodeId.getValue(),
        argumentId: node.getArgumentId().getValue(),
        isRoot: node.isRoot(),
      };

      // Add position if available
      const position = node.getPosition?.();
      if (position) {
        dto.position = {
          x: position.getX(),
          y: position.getY(),
        };
      }

      // Add argument details if requested
      if (query.includeArguments) {
        const argumentResult = await this.argumentRepository.findById(node.getArgumentId());
        if (argumentResult.isOk()) {
          dto.argument = atomicArgumentToDTO(argumentResult.value);
        }
      }

      nodes.push(dto);
      nodeIdToDTO.set(nodeId.getValue(), dto);
    }

    // Build connections
    const connections: NodeConnectionDTO[] = [];
    for (const [_nodeIdStr, { node: nodeId }] of subtreeMap) {
      const nodeResult = await this.nodeRepository.findById(nodeId);
      if (nodeResult.isErr()) continue;

      const node = nodeResult.value;
      if (node.isRoot()) continue;

      const parentId = node.getParentNodeId();
      if (!parentId || !nodeIdToDTO.has(parentId.getValue())) continue;

      const attachment = node.getAttachment();
      if (!attachment) continue;

      connections.push({
        fromNodeId: nodeId.getValue(),
        toNodeId: parentId.getValue(),
        premisePosition: attachment.getPremisePosition(),
        fromPosition: attachment.getFromPosition(),
      });
    }

    // Calculate metrics
    const metricsResult = this.graphTraversalService.getTreeMetrics(treeIdResult.value);
    if (metricsResult.isErr()) {
      return err(metricsResult.error);
    }

    const metrics = metricsResult.value;

    return ok({
      treeId: query.treeId,
      nodes,
      connections,
      depth: metrics.depth,
      breadth: metrics.breadth,
    });
  }

  /**
   * Gets the complete structure of a tree.
   * This is similar to getSubtree but starts from all root nodes.
   */
  async getTreeStructure(
    query: GetTreeStructureQuery,
  ): Promise<Result<TreeStructureDTO, ProcessingError>> {
    // Load tree
    const treeIdResult = TreeId.create(query.treeId);
    if (treeIdResult.isErr()) {
      return err(new ProcessingError('Invalid tree ID'));
    }

    const treeResult = await this.treeRepository.findById(treeIdResult.value);
    if (treeResult.isErr()) {
      return err(new ProcessingError('Tree not found'));
    }

    const tree = treeResult.value;
    // Build graph from tree
    const buildResult = await this.graphTraversalService.buildGraphFromTree(tree);
    if (buildResult.isErr()) {
      return err(buildResult.error);
    }

    // Get all nodes in tree
    const nodes: TreeNodeDTO[] = [];
    const connections: NodeConnectionDTO[] = [];

    for (const nodeId of tree.getNodeIds()) {
      const nodeResult = await this.nodeRepository.findById(nodeId);
      if (nodeResult.isErr()) continue;

      const node = nodeResult.value;
      const dto: TreeNodeDTO = {
        nodeId: nodeId.getValue(),
        argumentId: node.getArgumentId().getValue(),
        isRoot: node.isRoot(),
      };

      // Add position if available
      const position = node.getPosition?.();
      if (position) {
        dto.position = {
          x: position.getX(),
          y: position.getY(),
        };
      }

      // Add argument details if requested
      if (query.includeArguments) {
        const argumentResult = await this.argumentRepository.findById(node.getArgumentId());
        if (argumentResult.isOk()) {
          dto.argument = atomicArgumentToDTO(argumentResult.value);
        }
      }

      nodes.push(dto);

      // Add connections for child nodes
      if (node.isChild()) {
        const parentId = node.getParentNodeId();
        const attachment = node.getAttachment();
        if (parentId && attachment) {
          connections.push({
            fromNodeId: nodeId.getValue(),
            toNodeId: parentId.getValue(),
            premisePosition: attachment.getPremisePosition(),
            fromPosition: attachment.getFromPosition(),
          });
        }
      }
    }

    // Calculate metrics
    const metricsResult = this.graphTraversalService.getTreeMetrics(treeIdResult.value);
    if (metricsResult.isErr()) {
      return err(metricsResult.error);
    }

    const metrics = metricsResult.value;

    return ok({
      treeId: query.treeId,
      nodes,
      connections,
      depth: metrics.depth,
      breadth: metrics.breadth,
    });
  }
}
