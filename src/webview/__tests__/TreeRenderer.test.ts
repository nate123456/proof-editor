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
import { TreeRenderer } from '../TreeRenderer.js';

describe('TreeRenderer', () => {
  let renderer: TreeRenderer;
  let mockVisualizationDTO: ProofVisualizationDTO;

  beforeEach(() => {
    renderer = new TreeRenderer();
    mockVisualizationDTO = {
      documentId: 'test-doc-id',
      version: 1,
      trees: [],
      totalDimensions: { width: 400, height: 200 },
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
        id: 'arg1',
        premiseSetId: 'os1',
        conclusionSetId: 'os2',
        sideLabels: { left: 'Modus Ponens' },
      };

      const renderedNode: RenderedNodeDTO = {
        id: 'n1',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: atomicArgument,
        premises: statements,
        conclusions: conclusions,
        sideLabel: 'Modus Ponens',
      };

      const treeLayout: TreeLayoutDTO = {
        nodes: [renderedNode],
        connections: [],
        dimensions: { width: 300, height: 200 },
      };

      const treeRender: TreeRenderDTO = {
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: treeLayout,
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeRender],
        totalDimensions: { width: 500, height: 400 },
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
        id: 'tree1',
        position: { x: 50, y: 100 },
        layout: {
          nodes: [],
          connections: [],
          dimensions: { width: 200, height: 150 },
        },
        bounds: { width: 200, height: 150 },
      };

      const tree2: TreeRenderDTO = {
        id: 'tree2',
        position: { x: 300, y: 200 },
        layout: {
          nodes: [],
          connections: [],
          dimensions: { width: 200, height: 150 },
        },
        bounds: { width: 200, height: 150 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [tree1, tree2],
        totalDimensions: { width: 600, height: 400 },
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
        id: 'emptyTree',
        position: { x: 100, y: 200 },
        layout: {
          nodes: [],
          connections: [],
          dimensions: { width: 100, height: 100 },
        },
        bounds: { width: 100, height: 100 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [emptyTree],
        totalDimensions: { width: 300, height: 400 },
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should handle empty tree with potential node structure', () => {
      // Create tree DTO that represents an empty tree structure
      const emptyTreeWithStructure: TreeRenderDTO = {
        id: 'emptyTreeWithChildren',
        position: { x: 100, y: 200 },
        layout: {
          nodes: [], // No actual nodes but layout structure exists
          connections: [],
          dimensions: { width: 150, height: 100 },
        },
        bounds: { width: 150, height: 100 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [emptyTreeWithStructure],
        totalDimensions: { width: 300, height: 350 },
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
        id: 'n1',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'arg1',
          premiseSetId: 'empty',
          conclusionSetId: 'conclusions',
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
        sideLabel: '',
      };

      const treeWithEmptyPremises: TreeRenderDTO = {
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [emptyPremiseNode],
          connections: [],
          dimensions: { width: 300, height: 200 },
        },
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithEmptyPremises],
        totalDimensions: { width: 500, height: 400 },
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('(empty)');
      expect(result).toContain('font-style="italic"');
    });

    it('should render multiple statements with proper line spacing', () => {
      // Create DTOs with multiple statements
      const multipleStatementsNode: RenderedNodeDTO = {
        id: 'n1',
        position: { x: 50, y: 50 },
        dimensions: { width: 250, height: 150 },
        argument: {
          id: 'arg1',
          premiseSetId: 'premises',
          conclusionSetId: 'conclusions',
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
        sideLabel: '',
      };

      const treeWithMultipleStatements: TreeRenderDTO = {
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [multipleStatementsNode],
          connections: [],
          dimensions: { width: 350, height: 250 },
        },
        bounds: { width: 350, height: 250 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithMultipleStatements],
        totalDimensions: { width: 550, height: 450 },
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
        id: 'parent',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'parentArg',
          premiseSetId: 'parentPremises',
          conclusionSetId: 'shared',
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
        sideLabel: '',
      };

      const childNode: RenderedNodeDTO = {
        id: 'child',
        position: { x: 50, y: 200 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'childArg',
          premiseSetId: 'shared',
          conclusionSetId: 'childConclusions',
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
        sideLabel: '',
      };

      const connection: ConnectionDTO = {
        fromNodeId: 'parent',
        toNodeId: 'child',
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
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [parentNode, childNode],
          connections: [connection],
          dimensions: { width: 300, height: 350 },
        },
        bounds: { width: 300, height: 350 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithConnections],
        totalDimensions: { width: 500, height: 550 },
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
        fromNodeId: 'missingNode1',
        toNodeId: 'missingNode2',
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
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [], // No nodes
          connections: [invalidConnection],
          dimensions: { width: 300, height: 300 },
        },
        bounds: { width: 300, height: 300 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithInvalidConnection],
        totalDimensions: { width: 500, height: 500 },
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
        id: 'n1',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'arg1',
          premiseSetId: 'nonExistent',
          conclusionSetId: 'empty',
          sideLabels: {},
        },
        premises: [], // Empty premises
        conclusions: [], // Empty conclusions
        sideLabel: '',
      };

      const treeWithoutConnections: TreeRenderDTO = {
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [nodeWithoutConnections],
          connections: [], // No connections
          dimensions: { width: 300, height: 200 },
        },
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithoutConnections],
        totalDimensions: { width: 500, height: 400 },
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
        id: 'n1',
        position: { x: 50, y: 50 },
        dimensions: { width: 150, height: 100 }, // Narrow width to force truncation
        argument: {
          id: 'arg1',
          premiseSetId: 'longSet',
          conclusionSetId: 'longSet',
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
        sideLabel: '',
      };

      const treeWithLongText: TreeRenderDTO = {
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [nodeWithLongText],
          connections: [],
          dimensions: { width: 250, height: 200 },
        },
        bounds: { width: 250, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithLongText],
        totalDimensions: { width: 450, height: 400 },
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should contain truncated text with ellipsis
      expect(result).toContain('...');
    });

    it('should escape XML special characters', () => {
      // Use shorter text so special characters aren't truncated
      const nodeWithSpecialChars: RenderedNodeDTO = {
        id: 'n1',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'arg1',
          premiseSetId: 'specialSet',
          conclusionSetId: 'specialSet',
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
        sideLabel: '',
      };

      const treeWithSpecialChars: TreeRenderDTO = {
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [nodeWithSpecialChars],
          connections: [],
          dimensions: { width: 300, height: 200 },
        },
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithSpecialChars],
        totalDimensions: { width: 500, height: 400 },
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
        id: 'tree1',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [],
          connections: [],
          dimensions: { width: 100, height: 100 },
        },
        bounds: { width: 100, height: 100 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [emptyTree],
        totalDimensions: { width: 300, height: 300 },
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
          id: `n${i}`,
          position: { x: (i % 10) * 220, y: Math.floor(i / 10) * 120 },
          dimensions: { width: 200, height: 100 },
          argument: {
            id: `arg${i}`,
            premiseSetId: `premises${i}`,
            conclusionSetId: `conclusions${i}`,
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
          sideLabel: '',
        });
      }

      const largeTree: TreeRenderDTO = {
        id: 'largeTree',
        position: { x: 0, y: 0 },
        layout: {
          nodes,
          connections: [],
          dimensions: { width: 2200, height: 600 },
        },
        bounds: { width: 2200, height: 600 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [largeTree],
        totalDimensions: { width: 2200, height: 600 },
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
        id: 'malformedNode',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'nonExistentArg',
          premiseSetId: 'missingPremises',
          conclusionSetId: 'missingConclusions',
          sideLabels: {},
        },
        premises: [], // Empty but references non-existent set
        conclusions: [], // Empty but references non-existent set
        sideLabel: '',
      };

      const malformedTree: TreeRenderDTO = {
        id: 'malformedTree',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [malformedNode],
          connections: [],
          dimensions: { width: 300, height: 200 },
        },
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [malformedTree],
        totalDimensions: { width: 500, height: 400 },
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
        id: 'dangerousNode',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'dangerousArg',
          premiseSetId: 'dangerousSet',
          conclusionSetId: 'dangerousSet',
          sideLabels: {
            left: '<script>alert("label")</script>',
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
        sideLabel: '<script>alert("label")</script>',
      };

      const dangerousTree: TreeRenderDTO = {
        id: 'dangerousTree',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [dangerousNode],
          connections: [],
          dimensions: { width: 300, height: 200 },
        },
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [dangerousTree],
        totalDimensions: { width: 500, height: 400 },
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
        id: 'extremeNode',
        position: { x: -999999, y: 999999 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'extremeArg',
          premiseSetId: 'extremeSet',
          conclusionSetId: 'extremeSet',
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
        sideLabel: '',
      };

      const extremeTree: TreeRenderDTO = {
        id: 'extremeTree',
        position: { x: -999999, y: 999999 },
        layout: {
          nodes: [extremeNode],
          connections: [],
          dimensions: { width: 2000000, height: 2000000 },
        },
        bounds: { width: 2000000, height: 2000000 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [extremeTree],
        totalDimensions: { width: 2000000, height: 2000000 },
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
        id: 'emptyNode',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'emptyArg',
          premiseSetId: 'empty',
          conclusionSetId: 'empty',
          sideLabels: {},
        },
        premises: [], // No statements
        conclusions: [], // No statements
        sideLabel: '',
      };

      const emptyStructureTree: TreeRenderDTO = {
        id: 'emptyTree',
        position: { x: 0, y: 0 },
        layout: {
          nodes: [emptyStructureNode],
          connections: [],
          dimensions: { width: 300, height: 200 },
        },
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [emptyStructureTree],
        totalDimensions: { width: 300, height: 200 },
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      // Should render empty placeholders
      expect(result).toContain('(empty)');
      expect(result).toContain('font-style: italic');
    });

    it('should handle complex tree hierarchies with deep nesting', () => {
      // Create a complex tree with multiple levels of reasoning
      const parentNode: RenderedNodeDTO = {
        id: 'parent',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'arg1',
          premiseSetId: 'set1',
          conclusionSetId: 'set2',
          sideLabels: { left: 'Rule 1' },
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
        sideLabel: 'Rule 1',
      };

      const childNode: RenderedNodeDTO = {
        id: 'child',
        position: { x: 50, y: 200 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'arg2',
          premiseSetId: 'set2',
          conclusionSetId: 'set3',
          sideLabels: { left: 'Rule 2' },
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
        sideLabel: 'Rule 2',
      };

      const connection: ConnectionDTO = {
        fromNodeId: 'parent',
        toNodeId: 'child',
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
        id: 'hierarchicalTree',
        position: { x: 100, y: 100 },
        layout: {
          nodes: [parentNode, childNode],
          connections: [connection],
          dimensions: { width: 300, height: 350 },
        },
        bounds: { width: 300, height: 350 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [hierarchicalTree],
        totalDimensions: { width: 500, height: 550 },
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
      const nodeWithSideLabel: RenderedNodeDTO = {
        id: 'n1',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'arg1',
          premiseSetId: 'os1',
          conclusionSetId: 'os2',
          sideLabels: {
            left: 'Rule Name',
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
        sideLabel: 'Rule Name',
      };

      const treeWithSideLabel: TreeRenderDTO = {
        id: 'tree1',
        position: { x: 100, y: 200 },
        layout: {
          nodes: [nodeWithSideLabel],
          connections: [],
          dimensions: { width: 300, height: 200 },
        },
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithSideLabel],
        totalDimensions: { width: 500, height: 500 },
        isEmpty: false,
      };

      const result = renderer.generateSVG(mockVisualizationDTO);

      expect(result).toContain('Rule Name');
      expect(result).toContain('side-label');
    });

    it('should handle missing side labels gracefully', () => {
      // Create node without side label
      const nodeWithoutSideLabel: RenderedNodeDTO = {
        id: 'n1',
        position: { x: 50, y: 50 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'arg1',
          premiseSetId: 'os1',
          conclusionSetId: 'os2',
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
        sideLabel: '', // Empty side label
      };

      const treeWithoutSideLabel: TreeRenderDTO = {
        id: 'tree1',
        position: { x: 100, y: 200 },
        layout: {
          nodes: [nodeWithoutSideLabel],
          connections: [],
          dimensions: { width: 300, height: 200 },
        },
        bounds: { width: 300, height: 200 },
      };

      mockVisualizationDTO = {
        documentId: 'test-doc-id',
        version: 1,
        trees: [treeWithoutSideLabel],
        totalDimensions: { width: 500, height: 500 },
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
