import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';
import { ProcessingError } from '../../domain/errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../domain/repositories/IAtomicArgumentRepository.js';
import type { INodeRepository } from '../../domain/repositories/INodeRepository.js';
import type { ITreeRepository } from '../../domain/repositories/ITreeRepository.js';
import { NodeId, TreeId } from '../../domain/shared/value-objects.js';
import { ProofGraphAdapter } from '../../infrastructure/graph/ProofGraphAdapter.js';
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

    const tree = await this.treeRepository.findById(treeIdResult.value);
    if (!tree) {
      return err(new ProcessingError('Tree not found'));
    }

    // Create graph adapter and build graph
    const graphAdapter = new ProofGraphAdapter(this.nodeRepository, this.argumentRepository);
    const buildResult = await graphAdapter.buildGraphFromTree(tree);
    if (buildResult.isErr()) {
      return err(buildResult.error);
    }

    // Find path
    const fromNodeIdResult = NodeId.create(query.fromNodeId);
    const toNodeIdResult = NodeId.create(query.toNodeId);
    if (fromNodeIdResult.isErr() || toNodeIdResult.isErr()) {
      return err(new ProcessingError('Invalid node ID'));
    }

    const path = graphAdapter.findPath(fromNodeIdResult.value, toNodeIdResult.value);

    // Convert to DTOs
    const pathDTOs: TreeNodeDTO[] = [];
    for (const nodeId of path) {
      const node = await this.nodeRepository.findById(nodeId);
      if (!node) continue;

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
        const argument = await this.argumentRepository.findById(node.getArgumentId());
        if (argument) {
          dto.argument = {
            id: argument.getId().getValue(),
            premiseSetId: argument.getPremiseSet()?.getValue(),
            conclusionSetId: argument.getConclusionSet()?.getValue(),
            sideLabels: argument.getSideLabels
              ? {
                  left: argument.getSideLabels().getLeft(),
                  right: argument.getSideLabels().getRight(),
                }
              : undefined,
          };
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

    const tree = await this.treeRepository.findById(treeIdResult.value);
    if (!tree) {
      return err(new ProcessingError('Tree not found'));
    }

    // Create graph adapter and build graph
    const graphAdapter = new ProofGraphAdapter(this.nodeRepository, this.argumentRepository);
    const buildResult = await graphAdapter.buildGraphFromTree(tree);
    if (buildResult.isErr()) {
      return err(buildResult.error);
    }

    // Get subtree
    const rootNodeIdResult = NodeId.create(query.rootNodeId);
    if (rootNodeIdResult.isErr()) {
      return err(new ProcessingError('Invalid root node ID'));
    }

    const subtreeMap = graphAdapter.getSubtree(rootNodeIdResult.value, query.maxDepth);

    // Build node DTOs
    const nodes: TreeNodeDTO[] = [];
    const nodeIdToDTO = new Map<string, TreeNodeDTO>();

    for (const [_nodeIdStr, { node: nodeId }] of subtreeMap) {
      const node = await this.nodeRepository.findById(nodeId);
      if (!node) continue;

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
        const argument = await this.argumentRepository.findById(node.getArgumentId());
        if (argument) {
          dto.argument = {
            id: argument.getId().getValue(),
            premiseSetId: argument.getPremiseSet()?.getValue(),
            conclusionSetId: argument.getConclusionSet()?.getValue(),
            sideLabels: argument.getSideLabels
              ? {
                  left: argument.getSideLabels().getLeft(),
                  right: argument.getSideLabels().getRight(),
                }
              : undefined,
          };
        }
      }

      nodes.push(dto);
      nodeIdToDTO.set(nodeId.getValue(), dto);
    }

    // Build connections
    const connections: NodeConnectionDTO[] = [];
    for (const [_nodeIdStr, { node: nodeId }] of subtreeMap) {
      const node = await this.nodeRepository.findById(nodeId);
      if (!node || node.isRoot()) continue;

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
    const metrics = graphAdapter.getTreeMetrics(query.treeId);

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

    const tree = await this.treeRepository.findById(treeIdResult.value);
    if (!tree) {
      return err(new ProcessingError('Tree not found'));
    }

    // Create graph adapter and build graph
    const graphAdapter = new ProofGraphAdapter(this.nodeRepository, this.argumentRepository);
    const buildResult = await graphAdapter.buildGraphFromTree(tree);
    if (buildResult.isErr()) {
      return err(buildResult.error);
    }

    // Get all nodes in tree
    const nodes: TreeNodeDTO[] = [];
    const connections: NodeConnectionDTO[] = [];

    for (const nodeId of tree.getNodeIds()) {
      const node = await this.nodeRepository.findById(nodeId);
      if (!node) continue;

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
        const argument = await this.argumentRepository.findById(node.getArgumentId());
        if (argument) {
          dto.argument = {
            id: argument.getId().getValue(),
            premiseSetId: argument.getPremiseSet()?.getValue(),
            conclusionSetId: argument.getConclusionSet()?.getValue(),
            sideLabels: argument.getSideLabels
              ? {
                  left: argument.getSideLabels().getLeft(),
                  right: argument.getSideLabels().getRight(),
                }
              : undefined,
          };
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
    const metrics = graphAdapter.getTreeMetrics(query.treeId);

    return ok({
      treeId: query.treeId,
      nodes,
      connections,
      depth: metrics.depth,
      breadth: metrics.breadth,
    });
  }
}
