import { beforeEach, describe, expect, it } from 'vitest';

import type {
  ConnectionDTO,
  ProofVisualizationDTO,
  RenderedNodeDTO,
  TreeLayoutDTO,
  TreeRenderDTO,
} from '../../application/dtos/view-dtos.js';
import type { AtomicArgumentDTO } from '../../application/queries/shared-types.js';
import type { StatementDTO } from '../../application/queries/statement-queries.js';
import { SideLabel, Version } from '../../domain/shared/value-objects/content.js';
import { Dimensions, Position2D } from '../../domain/shared/value-objects/geometry.js';
import {
  AtomicArgumentId,
  DocumentId,
  NodeId,
  StatementId,
  TreeId,
} from '../../domain/shared/value-objects/identifiers.js';
import { TreeRenderer } from '../TreeRenderer.js';

describe('TreeRenderer', () => {
  let renderer: TreeRenderer;
  let mockVisualizationDTO: ProofVisualizationDTO;

  beforeEach(() => {
    renderer = new TreeRenderer();
    mockVisualizationDTO = {
      documentId: DocumentId.create('test-doc-id').match(
        (id) => id,
        () => {
          throw new Error('Failed to create DocumentId');
        },
      ),
      version: Version.create(1).unwrapOr(Version.initial()),
      trees: [],
      totalDimensions: Dimensions.create(400, 200).match(
        (dims) => dims,
        () => Dimensions.fullHD(),
      ),
      isEmpty: true,
    };
  });

  describe('generateSVG', () => {
    it('should create a TreeRenderer instance', () => {
      expect(renderer).toBeInstanceOf(TreeRenderer);
    });

    it('should generate empty message when no trees exist', () => {
      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('No proof trees to display');
      expect(result).toContain('color: var(--vscode-descriptionForeground)');
      expect(result).toContain('<div');
    });

    it('should include proper styling', () => {
      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('display: flex');
      expect(result).toContain('align-items: center');
      expect(result).toContain('justify-content: center');
    });

    it('should be valid HTML structure for empty state', () => {
      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toMatch(/<div[^>]*>[\s\S]*<\/div>/);
      expect(result).toContain('font-style: italic');
    });

    it('should include proper VS Code styling variables', () => {
      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('var(--vscode-descriptionForeground)');
    });

    it('should handle different viewport scenarios', () => {
      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('height: 200px');
      expect(result).toContain('No proof trees to display');
    });

    it('should generate SVG with tree content when proof document has data', () => {
      // Create test DTOs
      const statements: StatementDTO[] = [
        {
          id: 's1',
          content: 'All men are mortal',
          usageCount: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
        {
          id: 's2',
          content: 'Socrates is a man',
          usageCount: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      ];

      const conclusions: StatementDTO[] = [
        {
          id: 's3',
          content: 'Socrates is mortal',
          usageCount: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      ];

      const atomicArgument: AtomicArgumentDTO = {
        id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
        premiseIds: [
          StatementId.create('s1').unwrapOr(StatementId.generate()),
          StatementId.create('s2').unwrapOr(StatementId.generate()),
        ],
        conclusionIds: [StatementId.create('s3').unwrapOr(StatementId.generate())],
        sideLabels: {
          left: SideLabel.create('Modus Ponens').match(
            (label) => label,
            () => {
              throw new Error('Failed to create SideLabel');
            },
          ),
        },
      };

      const modusSideLabel = SideLabel.create('Modus Ponens').match(
        (label) => label,
        () => {
          throw new Error('Failed to create SideLabel');
        },
      );
      const renderedNode: RenderedNodeDTO = {
        id: NodeId.create('n1').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: atomicArgument,
        premises: statements,
        conclusions: conclusions,
        sideLabel: modusSideLabel,
      };

      const treeLayout: TreeLayoutDTO = {
        nodes: [renderedNode],
        connections: [],
        dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      const treeRender: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: treeLayout,
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeRender],
        totalDimensions: Dimensions.create(500, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      // Generate SVG
      const result = renderer.generateSVG(mockVisualizationDTO);

      // Verify SVG structure
      expect(result).toContain('<svg');
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(result).toContain('All men are mortal');
      expect(result).toContain('Socrates is a man');
      expect(result).toContain('Socrates is mortal');
      expect(result).toContain('Modus Ponens');

      // Also verify it's a complete SVG with proper dimensions
      expect(result).toMatch(/<svg[^>]*width="[^"]*"[^>]*height="[^"]*"/);
      expect(result).toContain('</svg>');
      expect(result).toContain('class="argument-node-group"');
      expect(result).toContain('class="implication-line"');
    });
  });

  describe('calculateTreeLayouts', () => {
    it('should handle multiple trees with different positions', () => {
      // Create multiple tree DTOs with different positions
      const tree1: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(50, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [],
          connections: [],
          dimensions: Dimensions.create(200, 150).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(200, 150).unwrapOr(Dimensions.fullHD()),
      };

      const tree2: TreeRenderDTO = {
        id: TreeId.create('tree2').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(300, 200).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [],
          connections: [],
          dimensions: Dimensions.create(200, 150).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(200, 150).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [tree1, tree2],
        totalDimensions: Dimensions.create(600, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('<svg');
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
      // Should have proper dimensions for multiple trees
      expect(result).toMatch(/height="[^"]*"/);
      expect(result).toMatch(/width="[^"]*"/);
    });

    it('should handle empty trees in layout calculation', () => {
      // Create empty tree DTO
      const emptyTree: TreeRenderDTO = {
        id: TreeId.create('emptyTree').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 200).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [],
          connections: [],
          dimensions: Dimensions.create(100, 100).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(100, 100).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [emptyTree],
        totalDimensions: Dimensions.create(300, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should handle empty tree with potential node structure', () => {
      // Create tree DTO that represents an empty tree structure
      const emptyTreeWithStructure: TreeRenderDTO = {
        id: TreeId.create('emptyTreeWithChildren').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 200).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [], // No actual nodes but layout structure exists
          connections: [],
          dimensions: Dimensions.create(150, 100).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(150, 100).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [emptyTreeWithStructure],
        totalDimensions: Dimensions.create(300, 350).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      // Should render empty tree layout correctly
      expect(result).toMatch(/width="\d+"/);
      expect(result).toMatch(/height="\d+"/);
    });
  });

  describe('renderStatements', () => {
    it('should render empty statements with italic placeholder', () => {
      // Create a node with empty premise statements
      const emptyPremiseNode: RenderedNodeDTO = {
        id: NodeId.create('n1').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [],
          conclusionIds: [StatementId.create('c1').unwrapOr(StatementId.generate())],
          sideLabels: {},
        },
        premises: [], // Empty premises
        conclusions: [
          {
            id: 'c1',
            content: 'Some conclusion',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
      };

      const treeWithEmptyPremises: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [emptyPremiseNode],
          connections: [],
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithEmptyPremises],
        totalDimensions: Dimensions.create(500, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('(empty)');
      expect(result).toContain('font-style="italic"');
    });

    it('should render multiple statements with proper line spacing', () => {
      // Create DTOs with multiple statements
      const multipleStatementsNode: RenderedNodeDTO = {
        id: NodeId.create('n1').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(250, 150).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [
            StatementId.create('s1').unwrapOr(StatementId.generate()),
            StatementId.create('s2').unwrapOr(StatementId.generate()),
            StatementId.create('s3').unwrapOr(StatementId.generate()),
          ],
          conclusionIds: [StatementId.create('c1').unwrapOr(StatementId.generate())],
          sideLabels: {},
        },
        premises: [
          {
            id: 's1',
            content: 'First premise statement',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
          {
            id: 's2',
            content: 'Second premise statement',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
          {
            id: 's3',
            content: 'Third premise statement',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 'c1',
            content: 'Conclusion statement',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
      };

      const treeWithMultipleStatements: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [multipleStatementsNode],
          connections: [],
          dimensions: Dimensions.create(350, 250).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(350, 250).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithMultipleStatements],
        totalDimensions: Dimensions.create(550, 450).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('First premise statement');
      expect(result).toContain('Second premise statement');
      expect(result).toContain('Third premise statement');
      expect(result).toContain('Conclusion statement');
      expect(result).toContain('statement-text');
    });
  });

  describe('renderConnections', () => {
    it('should render connections between parent and child nodes', () => {
      // Create parent and child nodes with a connection
      const parentNode: RenderedNodeDTO = {
        id: NodeId.create('parent').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('parentArg').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('pp').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('shared').unwrapOr(StatementId.generate())],
          sideLabels: {},
        },
        premises: [
          {
            id: 'pp',
            content: 'Parent premise',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 'shared',
            content: 'Shared statement',
            usageCount: 2,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
      };

      const childNode: RenderedNodeDTO = {
        id: NodeId.create('child').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 200).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('childArg').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('shared').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('cc').unwrapOr(StatementId.generate())],
          sideLabels: {},
        },
        premises: [
          {
            id: 'shared',
            content: 'Shared statement',
            usageCount: 2,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 'cc',
            content: 'Child conclusion',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
      };

      const connection: ConnectionDTO = {
        fromNodeId: NodeId.create('parent').unwrapOr(NodeId.generate()),
        toNodeId: NodeId.create('child').unwrapOr(NodeId.generate()),
        fromPosition: 0,
        toPosition: 0,
        coordinates: {
          startX: 150,
          startY: 150,
          endX: 150,
          endY: 200,
        },
      };

      const treeWithConnections: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [parentNode, childNode],
          connections: [connection],
          dimensions: Dimensions.create(300, 350).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 350).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithConnections],
        totalDimensions: Dimensions.create(500, 550).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('connection-line');
      expect(result).toContain('<line');
      expect(result).toContain('x1=');
      expect(result).toContain('y1=');
      expect(result).toContain('x2=');
      expect(result).toContain('y2=');
    });

    it('should handle missing nodes in connections gracefully', () => {
      // Create a connection that references non-existent nodes
      const invalidConnection: ConnectionDTO = {
        fromNodeId: NodeId.create('missingNode1').unwrapOr(NodeId.generate()),
        toNodeId: NodeId.create('missingNode2').unwrapOr(NodeId.generate()),
        fromPosition: 0,
        toPosition: 0,
        coordinates: {
          startX: 100,
          startY: 100,
          endX: 200,
          endY: 200,
        },
      };

      const treeWithInvalidConnection: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [], // No nodes
          connections: [invalidConnection],
          dimensions: Dimensions.create(300, 300).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 300).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithInvalidConnection],
        totalDimensions: Dimensions.create(500, 500).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should not crash and should generate valid SVG
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should handle empty connections gracefully', () => {
      // Create a tree with no connections
      const nodeWithoutConnections: RenderedNodeDTO = {
        id: NodeId.create('n1').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [],
          conclusionIds: [],
          sideLabels: {},
        },
        premises: [], // Empty premises
        conclusions: [], // Empty conclusions
      };

      const treeWithoutConnections: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [nodeWithoutConnections],
          connections: [], // No connections
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithoutConnections],
        totalDimensions: Dimensions.create(500, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should handle missing ordered set gracefully
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      expect(result).toContain('(empty)'); // Non-existent ordered set should render as empty
    });
  });

  describe('utility methods', () => {
    it('should truncate long text properly', () => {
      // Create a node with long statement content
      const nodeWithLongText: RenderedNodeDTO = {
        id: NodeId.create('n1').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(150, 100).unwrapOr(Dimensions.fullHD()), // Narrow width to force truncation
        argument: {
          id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('long').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('long').unwrapOr(StatementId.generate())],
          sideLabels: {},
        },
        premises: [
          {
            id: 'long',
            content:
              'This is a very long statement that should be truncated when rendered in the tree visualization because it exceeds the maximum length',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 'long',
            content:
              'This is a very long statement that should be truncated when rendered in the tree visualization because it exceeds the maximum length',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
      };

      const treeWithLongText: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [nodeWithLongText],
          connections: [],
          dimensions: Dimensions.create(250, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(250, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithLongText],
        totalDimensions: Dimensions.create(450, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should contain truncated text with ellipsis
      expect(result).toContain('...');
    });

    it('should escape XML special characters', () => {
      // Use shorter text so special characters aren't truncated
      const nodeWithSpecialChars: RenderedNodeDTO = {
        id: NodeId.create('n1').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('special').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('special').unwrapOr(StatementId.generate())],
          sideLabels: {},
        },
        premises: [
          {
            id: 'special',
            content: '<>&"\'',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 'special',
            content: '<>&"\'',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
      };

      const treeWithSpecialChars: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [nodeWithSpecialChars],
          connections: [],
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithSpecialChars],
        totalDimensions: Dimensions.create(500, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should contain escaped XML characters
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
    });

    it('should handle empty trees gracefully', () => {
      const emptyTree: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [],
          connections: [],
          dimensions: Dimensions.create(100, 100).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(100, 100).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [emptyTree],
        totalDimensions: Dimensions.create(300, 300).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should not crash
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });
  });

  describe('advanced rendering scenarios', () => {
    it('should handle extremely large tree structures', () => {
      // Create a tree with many nodes to test performance
      const nodes: RenderedNodeDTO[] = [];

      // Create 50 nodes with statements
      for (let i = 0; i < 50; i++) {
        nodes.push({
          id: NodeId.create(`n${i}`).unwrapOr(NodeId.generate()),
          position: Position2D.create((i % 10) * 220, Math.floor(i / 10) * 120).unwrapOr(
            Position2D.origin(),
          ),
          dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
          argument: {
            id: AtomicArgumentId.create(`arg${i}`).unwrapOr(AtomicArgumentId.generate()),
            premiseIds: [StatementId.create(`s${i}`).unwrapOr(StatementId.generate())],
            conclusionIds: [StatementId.create(`c${i}`).unwrapOr(StatementId.generate())],
            sideLabels: {},
          },
          premises: [
            {
              id: `s${i}`,
              content: `Statement ${i}`,
              usageCount: 1,
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
            },
          ],
          conclusions: [
            {
              id: `c${i}`,
              content: `Conclusion ${i}`,
              usageCount: 1,
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
            },
          ],
        });
      }

      const largeTree: TreeRenderDTO = {
        id: TreeId.create('largeTree').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(0, 0).unwrapOr(Position2D.origin()),
        layout: {
          nodes,
          connections: [],
          dimensions: Dimensions.create(2200, 600).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(2200, 600).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [largeTree],
        totalDimensions: Dimensions.create(2200, 600).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const startTime = Date.now();
      const result = renderer.generateSVG(mockVisualizationDTO);
      const endTime = Date.now();

      expect(result).toContain('<svg');
      expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('should handle malformed tree data gracefully', () => {
      // Create tree with problematic node data
      const malformedNode: RenderedNodeDTO = {
        id: NodeId.create('malformedNode').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('nonExistentArg').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [],
          conclusionIds: [],
          sideLabels: {},
        },
        premises: [], // Empty but references non-existent set
        conclusions: [], // Empty but references non-existent set
      };

      const malformedTree: TreeRenderDTO = {
        id: TreeId.create('malformedTree').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [malformedNode],
          connections: [],
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [malformedTree],
        totalDimensions: Dimensions.create(500, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      // Should not crash
      const result = renderer.generateSVG(mockVisualizationDTO);
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should handle statement content with dangerous characters', () => {
      // Test XSS prevention and XML escaping
      const dangerousContent = '<script>&\'alert("xss")</script>"<>\n\t';
      const dangerousNode: RenderedNodeDTO = {
        id: NodeId.create('dangerousNode').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('dangerousArg').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('dangerous').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('dangerous').unwrapOr(StatementId.generate())],
          sideLabels: {
            left: SideLabel.create('<script>alert("label")</script>').match(
              (label) => label,
              () => {
                throw new Error('Failed to create SideLabel');
              },
            ),
          },
        },
        premises: [
          {
            id: 'dangerous',
            content: dangerousContent,
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 'dangerous',
            content: dangerousContent,
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        ...(() => {
          const label = SideLabel.create('<script>alert("label")</script>').match(
            (label) => label,
            () => undefined,
          );
          return label ? { sideLabel: label } : {};
        })(),
      };

      const dangerousTree: TreeRenderDTO = {
        id: TreeId.create('dangerousTree').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [dangerousNode],
          connections: [],
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [dangerousTree],
        totalDimensions: Dimensions.create(500, 400).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should escape dangerous characters
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
    });

    it('should handle extreme coordinate values in tree positioning', () => {
      // Test with extreme coordinate values
      const extremeNode: RenderedNodeDTO = {
        id: NodeId.create('extremeNode').unwrapOr(NodeId.generate()),
        position: Position2D.create(-999999, 999999).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('extremeArg').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('extreme').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('extreme').unwrapOr(StatementId.generate())],
          sideLabels: {},
        },
        premises: [
          {
            id: 'extreme',
            content: 'Extreme position test',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 'extreme',
            content: 'Extreme position test',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
      };

      const extremeTree: TreeRenderDTO = {
        id: TreeId.create('extremeTree').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(-999999, 999999).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [extremeNode],
          connections: [],
          dimensions: Dimensions.create(2000000, 2000000).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(2000000, 2000000).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [extremeTree],
        totalDimensions: Dimensions.create(2000000, 2000000).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should handle extreme coordinates without breaking
      expect(result).toContain('<svg');
      expect(result).toMatch(/width="\d+"/);
      expect(result).toMatch(/height="\d+"/);
    });

    it('should handle rendering with no statements but existing structure', () => {
      // Create structure without any actual statement content
      const emptyStructureNode: RenderedNodeDTO = {
        id: NodeId.create('emptyNode').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('emptyArg').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [],
          conclusionIds: [],
          sideLabels: {},
        },
        premises: [], // No statements
        conclusions: [], // No statements
      };

      const emptyStructureTree: TreeRenderDTO = {
        id: TreeId.create('emptyTree').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(0, 0).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [emptyStructureNode],
          connections: [],
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [emptyStructureTree],
        totalDimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should render empty placeholders
      expect(result).toContain('(empty)');
      expect(result).toContain('font-style: italic');
    });

    it('should handle complex tree hierarchies with deep nesting', () => {
      // Create a complex tree with multiple levels of reasoning
      const sideLabel = SideLabel.create('Rule 1').match(
        (label) => label,
        () => undefined,
      );
      const parentNode: RenderedNodeDTO = {
        id: NodeId.create('parent').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('s0').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('s1').unwrapOr(StatementId.generate())],
          sideLabels: {
            left: SideLabel.create('Rule 1').match(
              (label) => label,
              () => {
                throw new Error('Failed to create SideLabel');
              },
            ),
          },
        },
        premises: [
          {
            id: 's0',
            content: 'Root premise',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 's1',
            content: 'Mid conclusion',
            usageCount: 2,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        ...(sideLabel && { sideLabel }),
      };

      const childSideLabel = SideLabel.create('Rule 2').match(
        (label) => label,
        () => undefined,
      );
      const childNode: RenderedNodeDTO = {
        id: NodeId.create('child').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 200).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('arg2').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('s1').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('s2').unwrapOr(StatementId.generate())],
          sideLabels: {
            left: SideLabel.create('Rule 2').match(
              (label) => label,
              () => {
                throw new Error('Failed to create SideLabel');
              },
            ),
          },
        },
        premises: [
          {
            id: 's1',
            content: 'Mid conclusion',
            usageCount: 2,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 's2',
            content: 'Final conclusion',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        ...(childSideLabel && { sideLabel: childSideLabel }),
      };

      const connection: ConnectionDTO = {
        fromNodeId: NodeId.create('parent').unwrapOr(NodeId.generate()),
        toNodeId: NodeId.create('child').unwrapOr(NodeId.generate()),
        fromPosition: 0,
        toPosition: 0,
        coordinates: {
          startX: 150,
          startY: 150,
          endX: 150,
          endY: 200,
        },
      };

      const hierarchicalTree: TreeRenderDTO = {
        id: TreeId.create('hierarchicalTree').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [parentNode, childNode],
          connections: [connection],
          dimensions: Dimensions.create(300, 350).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 350).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [hierarchicalTree],
        totalDimensions: Dimensions.create(500, 550).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should contain all content and structure
      expect(result).toContain('Root premise');
      expect(result).toContain('Mid conclusion');
      expect(result).toContain('Final conclusion');
      expect(result).toContain('Rule 1');
      expect(result).toContain('Rule 2');
      expect(result).toContain('connection-line');
    });
  });

  describe('side labels', () => {
    it('should render side labels when present', () => {
      // Create node with side label
      const ruleSideLabel = SideLabel.create('Rule Name').match(
        (label) => label,
        () => undefined,
      );
      const nodeWithSideLabel: RenderedNodeDTO = {
        id: NodeId.create('n1').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('s1').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('s2').unwrapOr(StatementId.generate())],
          sideLabels: {
            left: SideLabel.create('Rule Name').match(
              (label) => label,
              () => {
                throw new Error('Failed to create SideLabel');
              },
            ),
          },
        },
        premises: [
          {
            id: 's1',
            content: 'Premise',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 's2',
            content: 'Conclusion',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        ...(ruleSideLabel && { sideLabel: ruleSideLabel }),
      };

      const treeWithSideLabel: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 200).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [nodeWithSideLabel],
          connections: [],
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithSideLabel],
        totalDimensions: Dimensions.create(500, 500).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('Rule Name');
      expect(result).toContain('side-label');
    });

    it('should handle missing side labels gracefully', () => {
      // Create node without side label
      const nodeWithoutSideLabel: RenderedNodeDTO = {
        id: NodeId.create('n1').unwrapOr(NodeId.generate()),
        position: Position2D.create(50, 50).unwrapOr(Position2D.origin()),
        dimensions: Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        argument: {
          id: AtomicArgumentId.create('arg1').unwrapOr(AtomicArgumentId.generate()),
          premiseIds: [StatementId.create('s1').unwrapOr(StatementId.generate())],
          conclusionIds: [StatementId.create('s2').unwrapOr(StatementId.generate())],
          sideLabels: {}, // No side labels
        },
        premises: [
          {
            id: 's1',
            content: 'Premise without label',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        conclusions: [
          {
            id: 's2',
            content: 'Simple conclusion',
            usageCount: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          },
        ],
        // No sideLabel property when empty
      };

      const treeWithoutSideLabel: TreeRenderDTO = {
        id: TreeId.create('tree1').match(
          (id) => id,
          () => {
            throw new Error('Failed to create TreeId');
          },
        ),
        position: Position2D.create(100, 200).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [nodeWithoutSideLabel],
          connections: [],
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      };

      mockVisualizationDTO = {
        documentId: DocumentId.create('test-doc-id').match(
          (id) => id,
          () => {
            throw new Error('Failed to create DocumentId');
          },
        ),
        version: Version.create(1).unwrapOr(Version.initial()),
        trees: [treeWithoutSideLabel],
        totalDimensions: Dimensions.create(500, 500).unwrapOr(Dimensions.fullHD()),
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should not contain side label elements when no label is present
      expect(result).not.toContain('class="side-label"');
      expect(result).toContain('Premise without label');
      expect(result).toContain('Simple conclusion');
    });
  });
});
