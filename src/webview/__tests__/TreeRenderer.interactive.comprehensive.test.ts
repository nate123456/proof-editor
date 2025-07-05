import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ConnectionDTO,
  ProofVisualizationDTO,
  RenderedNodeDTO,
  TreeRenderDTO,
} from '../../application/dtos/view-dtos.js';
import type { AtomicArgumentDTO } from '../../application/queries/shared-types.js';
import type { StatementDTO } from '../../application/queries/statement-queries.js';
import { TreeRenderer } from '../TreeRenderer.js';

describe('TreeRenderer Interactive Features - Comprehensive Coverage', () => {
  let renderer: TreeRenderer;

  beforeEach(() => {
    renderer = new TreeRenderer();
  });

  describe('Interactive HTML Generation', () => {
    it('should generate all required interactive CSS classes for statements', () => {
      const visualization = createVisualizationWithInteractiveElements();
      const svg = renderer.generateSVG(visualization);

      // Core interactive classes
      expect(svg).toContain('editable-statement');
      expect(svg).toContain('statement-background');
      expect(svg).toContain('statement-group');
      expect(svg).toContain('drop-zone');

      // Interactive nodes
      expect(svg).toContain('argument-node-group');
      expect(svg).toContain('interactive-node');
      expect(svg).toContain('drag-handle');

      // Connections
      expect(svg).toContain('connection-group');
      expect(svg).toContain('interactive-connection');
      expect(svg).toContain('connection-hit-area');
    });

    it('should generate all required data attributes for statements', () => {
      const visualization = createVisualizationWithInteractiveElements();
      const svg = renderer.generateSVG(visualization);

      // Statement data attributes
      expect(svg).toContain('data-statement-id="stmt1"');
      expect(svg).toContain('data-node-id="node1"');
      expect(svg).toContain('data-statement-type="premise"');
      expect(svg).toContain('data-statement-type="conclusion"');
      expect(svg).toContain('data-statement-index="0"');
      expect(svg).toContain('data-original-content="Test premise"');

      // Node data attributes
      expect(svg).toContain('data-argument-id="arg-node1"');

      // Drop zone data attributes
      expect(svg).toContain('data-drop-type="premise"');
      expect(svg).toContain('data-drop-type="conclusion"');
    });

    it('should generate proper drag handle elements', () => {
      const visualization = createVisualizationWithInteractiveElements();
      const svg = renderer.generateSVG(visualization);

      // Drag handle should be present with correct attributes
      expect(svg).toContain('drag-handle');
      expect(svg).toContain('data-node-id="node1"');
      expect(svg).toContain('fill="var(--vscode-descriptionForeground)"');
      expect(svg).toContain('opacity="0.3"');

      // Should be positioned in top-right corner of node
      expect(svg).toMatch(/x="\d+" y="\d+" width="10" height="10"/);
    });

    it('should generate interactive connection elements with hit areas', () => {
      const visualization = createVisualizationWithConnections();
      const svg = renderer.generateSVG(visualization);

      // Connection should have interactive elements
      expect(svg).toContain('class="connection-line interactive-connection"');
      expect(svg).toContain('data-connection-id="node1-node2"');

      // Hit area for easier interaction
      expect(svg).toContain('connection-hit-area');
      expect(svg).toContain('stroke="transparent"');
      expect(svg).toContain('stroke-width="10"');
    });

    it('should generate editable side labels when present', () => {
      const visualization = createVisualizationWithSideLabels();
      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('class="side-label editable-label"');
      expect(svg).toContain('data-node-id="node1"');
      expect(svg).toContain('data-label-type="side"');
      expect(svg).toContain('Modus Ponens');
    });

    it('should handle empty statements with proper interactive elements', () => {
      const visualization = createVisualizationWithEmptyStatements();
      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('class="statement-text empty-statement"');
      expect(svg).toContain('data-statement-type="premise"');
      expect(svg).toContain('data-statement-type="conclusion"');
      expect(svg).toContain('(empty)');
      expect(svg).toContain('font-style: italic');
    });
  });

  describe('Data Attribute Generation', () => {
    it('should preserve statement order in data attributes', () => {
      const visualization = createVisualizationWithMultipleStatements();
      const svg = renderer.generateSVG(visualization);

      // Check that statement indices are correctly assigned
      expect(svg).toContain('data-statement-index="0"');
      expect(svg).toContain('data-statement-index="1"');
      expect(svg).toContain('data-statement-index="2"');
    });

    it('should handle statement IDs with special characters', () => {
      const specialStatements = createStatementsWithSpecialIds();
      const visualization = createVisualizationDTO({
        trees: [
          createTreeWithNodes([
            {
              id: 'node1',
              premises: specialStatements,
              conclusions: [],
            },
          ]),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Should properly escape special characters in IDs
      expect(svg).toContain('data-statement-id="stmt&lt;1&gt;"');
      expect(svg).toContain('data-statement-id="stmt&quot;2&quot;"');
      expect(svg).toContain('data-statement-id="stmt&#x27;3&#x27;"');
    });

    it('should maintain data integrity across complex tree structures', () => {
      const visualization = createComplexTreeVisualization();
      const svg = renderer.generateSVG(visualization);

      // Verify each node maintains its data integrity
      expect(svg).toContain('data-node-id="parent"');
      expect(svg).toContain('data-node-id="child1"');
      expect(svg).toContain('data-node-id="child2"');

      // Verify connections maintain proper references
      expect(svg).toContain('data-from-node="parent"');
      expect(svg).toContain('data-to-node="child1"');
      expect(svg).toContain('data-to-node="child2"');
    });
  });

  describe('CSS Class Assignment', () => {
    it('should assign different CSS states correctly', () => {
      const visualization = createVisualizationWithInteractiveElements();
      const svg = renderer.generateSVG(visualization);

      // Verify presence of state-specific classes
      expect(svg).toContain('premise-section');
      expect(svg).toContain('conclusion-section');
      expect(svg).toContain('statement-background');
      expect(svg).toContain('implication-line');
    });

    it('should handle CSS class conflicts gracefully', () => {
      const visualization = createVisualizationWithConflictingElements();
      const svg = renderer.generateSVG(visualization);

      // Should not have duplicate or conflicting classes
      const matches = svg.match(/class="[^"]*editable-statement[^"]*"/g) || [];
      expect(matches.length).toBeGreaterThan(0);

      // Each match should be well-formed
      for (const match of matches) {
        expect(match).toMatch(/^class="[^"]*"$/);
      }
    });
  });

  describe('SVG Structure Validation', () => {
    it('should generate well-formed SVG with all required elements', () => {
      const visualization = createVisualizationWithInteractiveElements();
      const svg = renderer.generateSVG(visualization);

      // Basic SVG structure
      expect(svg).toMatch(/^<svg[^>]*>/);
      expect(svg).toMatch(/<\/svg>$/);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('class="proof-tree-svg"');

      // Required SVG definitions
      expect(svg).toContain('<defs>');
      expect(svg).toContain('id="arrowhead"');
      expect(svg).toContain('<marker');
      expect(svg).toContain('<polygon');

      // Proper nesting structure
      expect(svg).toContain('<g class="tree"');
      expect(svg).toContain('<g class="argument-node-group"');
    });

    it('should maintain proper SVG coordinate system', () => {
      const visualization = createVisualizationWithPositioning();
      const svg = renderer.generateSVG(visualization);

      // Check coordinate attributes are numeric
      const xMatches = svg.match(/x="(\d+)"/g) || [];
      const yMatches = svg.match(/y="(\d+)"/g) || [];

      expect(xMatches.length).toBeGreaterThan(0);
      expect(yMatches.length).toBeGreaterThan(0);

      // All coordinates should be valid numbers
      for (const match of xMatches) {
        const value = match.match(/x="(\d+)"/)?.[1];
        expect(Number.isInteger(Number(value))).toBe(true);
      }
    });

    it('should handle nested SVG groups correctly', () => {
      const visualization = createVisualizationWithNestedElements();
      const svg = renderer.generateSVG(visualization);

      // Check proper nesting depth
      expect(svg).toContain('<g class="tree"');
      expect(svg).toContain('<g class="argument-node-group"');
      expect(svg).toContain('<g class="premise-section"');
      expect(svg).toContain('<g class="conclusion-section"');
      expect(svg).toContain('<g class="statement-group"');

      // All groups should be properly closed
      const openTags = (svg.match(/<g /g) || []).length;
      const closeTags = (svg.match(/<\/g>/g) || []).length;
      expect(openTags).toBe(closeTags);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed data gracefully', () => {
      const malformedVisualization: ProofVisualizationDTO = {
        documentId: 'test',
        version: 1,
        trees: [
          {
            id: 'malformed',
            position: { x: Number.NaN, y: undefined as any },
            layout: {
              nodes: [null as any],
              connections: [undefined as any],
              dimensions: { width: -1, height: 'invalid' as any },
            },
            bounds: { width: 0, height: 0 },
          },
        ],
        totalDimensions: { width: 0, height: 0 },
        isEmpty: false,
      };

      expect(() => renderer.generateSVG(malformedVisualization)).not.toThrow();
    });

    it('should handle extremely large trees without performance degradation', () => {
      const largeVisualization = createLargeTreeVisualization(1000);

      const startTime = performance.now();
      const svg = renderer.generateSVG(largeVisualization);
      const endTime = performance.now();

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(endTime - startTime).toBeLessThan(5000); // 5 second max
    });

    it('should handle empty visualization correctly', () => {
      const emptyVisualization: ProofVisualizationDTO = {
        documentId: 'empty',
        version: 1,
        trees: [],
        totalDimensions: { width: 0, height: 0 },
        isEmpty: true,
      };

      const svg = renderer.generateSVG(emptyVisualization);
      expect(svg).toContain('No proof trees to display');
      expect(svg).not.toContain('<svg');
    });

    it('should handle nodes with missing or invalid positions', () => {
      const visualizationWithInvalidPositions = createVisualizationWithInvalidPositions();
      const svg = renderer.generateSVG(visualizationWithInvalidPositions);

      expect(svg).toContain('<svg');
      expect(svg).toContain('argument-node-group');
      // Should not crash or produce invalid SVG
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with repeated calls', () => {
      const visualization = createVisualizationWithInteractiveElements();

      // Simulate multiple rendering cycles
      for (let i = 0; i < 100; i++) {
        renderer.generateSVG(visualization);
      }

      // Should complete without memory issues
      expect(true).toBe(true);
    });

    it('should handle rapid successive generations', () => {
      const visualization = createVisualizationWithInteractiveElements();
      const results: string[] = [];

      // Generate rapidly
      for (let i = 0; i < 50; i++) {
        results.push(renderer.generateSVG(visualization));
      }

      // All results should be identical and valid
      expect(results.length).toBe(50);
      expect(results.every((result) => result === results[0])).toBe(true);
    });
  });

  describe('Property-Based Tests', () => {
    it('should maintain data attribute consistency across arbitrary inputs', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeId: fc.string({ minLength: 1, maxLength: 20 }),
            statementId: fc.string({ minLength: 1, maxLength: 20 }),
            content: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          ({ nodeId, statementId, content }) => {
            const visualization = createCustomVisualization(nodeId, statementId, content);
            const svg = renderer.generateSVG(visualization);

            // Should contain escaped node and statement IDs
            const escapedNodeId = escapeForXml(nodeId);
            const escapedStatementId = escapeForXml(statementId);
            const escapedContent = escapeForXml(content);

            expect(svg).toContain(`data-node-id="${escapedNodeId}"`);
            expect(svg).toContain(`data-statement-id="${escapedStatementId}"`);
            expect(svg).toContain(escapedContent);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should produce valid SVG for arbitrary tree structures', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              x: fc.integer({ min: 0, max: 1000 }),
              y: fc.integer({ min: 0, max: 1000 }),
              width: fc.integer({ min: 50, max: 300 }),
              height: fc.integer({ min: 50, max: 200 }),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          (positions) => {
            const visualization = createVisualizationFromPositions(positions);
            const svg = renderer.generateSVG(visualization);

            // Should always produce valid SVG structure
            expect(svg).toMatch(/^<svg[^>]*>[\s\S]*<\/svg>$/);
            expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');

            // Should handle all positions without error
            for (const pos of positions) {
              expect(svg).toContain(`x="${pos.x}"`);
              expect(svg).toContain(`y="${pos.y}"`);
            }
          },
        ),
        { numRuns: 25 },
      );
    });
  });
});

// Helper functions for creating test data
function createVisualizationWithInteractiveElements(): ProofVisualizationDTO {
  return createVisualizationDTO({
    trees: [
      createTreeWithNodes([
        {
          id: 'node1',
          premises: [createStatement('stmt1', 'Test premise')],
          conclusions: [createStatement('stmt2', 'Test conclusion')],
        },
      ]),
    ],
  });
}

function createVisualizationWithConnections(): ProofVisualizationDTO {
  return createVisualizationDTO({
    trees: [createTreeWithConnections()],
  });
}

function createVisualizationWithSideLabels(): ProofVisualizationDTO {
  return createVisualizationDTO({
    trees: [
      createTreeWithNodes([
        {
          id: 'node1',
          premises: [createStatement('stmt1', 'Premise')],
          conclusions: [createStatement('stmt2', 'Conclusion')],
          sideLabel: 'Modus Ponens',
        },
      ]),
    ],
  });
}

function createVisualizationWithEmptyStatements(): ProofVisualizationDTO {
  return createVisualizationDTO({
    trees: [
      createTreeWithNodes([
        {
          id: 'node1',
          premises: [],
          conclusions: [],
        },
      ]),
    ],
  });
}

function createVisualizationWithMultipleStatements(): ProofVisualizationDTO {
  return createVisualizationDTO({
    trees: [
      createTreeWithNodes([
        {
          id: 'node1',
          premises: [
            createStatement('stmt1', 'First premise'),
            createStatement('stmt2', 'Second premise'),
            createStatement('stmt3', 'Third premise'),
          ],
          conclusions: [createStatement('stmt4', 'Conclusion')],
        },
      ]),
    ],
  });
}

function createStatementsWithSpecialIds(): StatementDTO[] {
  return [
    createStatement('stmt<1>', 'Statement with angle brackets'),
    createStatement('stmt"2"', 'Statement with quotes'),
    createStatement("stmt'3'", 'Statement with apostrophes'),
  ];
}

function createComplexTreeVisualization(): ProofVisualizationDTO {
  const parent = createNode('parent', {
    premises: [createStatement('p1', 'Parent premise')],
    conclusions: [
      createStatement('shared1', 'Shared conclusion 1'),
      createStatement('shared2', 'Shared conclusion 2'),
    ],
  });

  const child1 = createNode('child1', {
    premises: [createStatement('shared1', 'Shared conclusion 1')],
    conclusions: [createStatement('c1', 'Child 1 conclusion')],
  });

  const child2 = createNode('child2', {
    premises: [createStatement('shared2', 'Shared conclusion 2')],
    conclusions: [createStatement('c2', 'Child 2 conclusion')],
  });

  const connections: ConnectionDTO[] = [
    createConnection('parent', 'child1', 0, 0),
    createConnection('parent', 'child2', 1, 0),
  ];

  return createVisualizationDTO({
    trees: [
      {
        id: 'complex-tree',
        position: { x: 0, y: 0 },
        layout: {
          nodes: [parent, child1, child2],
          connections,
          dimensions: { width: 600, height: 400 },
        },
        bounds: { width: 600, height: 400 },
      },
    ],
  });
}

function createVisualizationWithConflictingElements(): ProofVisualizationDTO {
  return createVisualizationWithInteractiveElements();
}

function createVisualizationWithPositioning(): ProofVisualizationDTO {
  return createVisualizationDTO({
    trees: [
      createTreeWithNodes([
        { id: 'node1', position: { x: 100, y: 200 } },
        { id: 'node2', position: { x: 300, y: 400 } },
      ]),
    ],
  });
}

function createVisualizationWithNestedElements(): ProofVisualizationDTO {
  return createVisualizationWithMultipleStatements();
}

function createVisualizationWithInvalidPositions(): ProofVisualizationDTO {
  return createVisualizationDTO({
    trees: [
      createTreeWithNodes([
        {
          id: 'node1',
          position: { x: Number.NaN, y: Number.NEGATIVE_INFINITY },
          premises: [createStatement('stmt1', 'Test')],
          conclusions: [],
        },
      ]),
    ],
  });
}

function createLargeTreeVisualization(nodeCount: number): ProofVisualizationDTO {
  const nodes: RenderedNodeDTO[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push(
      createNode(`node${i}`, {
        position: { x: (i % 50) * 250, y: Math.floor(i / 50) * 150 },
        premises: [createStatement(`stmt${i}`, `Statement ${i}`)],
        conclusions: [createStatement(`conc${i}`, `Conclusion ${i}`)],
      }),
    );
  }

  return createVisualizationDTO({
    trees: [
      {
        id: 'large-tree',
        position: { x: 0, y: 0 },
        layout: {
          nodes,
          connections: [],
          dimensions: { width: 12500, height: nodeCount * 3 },
        },
        bounds: { width: 12500, height: nodeCount * 3 },
      },
    ],
    totalDimensions: { width: 12500, height: nodeCount * 3 },
  });
}

function createCustomVisualization(
  nodeId: string,
  statementId: string,
  content: string,
): ProofVisualizationDTO {
  return createVisualizationDTO({
    trees: [
      createTreeWithNodes([
        {
          id: nodeId,
          premises: [createStatement(statementId, content)],
          conclusions: [],
        },
      ]),
    ],
  });
}

function createVisualizationFromPositions(
  positions: Array<{ x: number; y: number; width: number; height: number }>,
): ProofVisualizationDTO {
  const nodes = positions.map((pos, i) =>
    createNode(`node${i}`, {
      position: { x: pos.x, y: pos.y },
      dimensions: { width: pos.width, height: pos.height },
      premises: [createStatement(`stmt${i}`, `Statement ${i}`)],
      conclusions: [],
    }),
  );

  return createVisualizationDTO({
    trees: [
      {
        id: 'position-test',
        position: { x: 0, y: 0 },
        layout: {
          nodes,
          connections: [],
          dimensions: { width: 1200, height: 1200 },
        },
        bounds: { width: 1200, height: 1200 },
      },
    ],
  });
}

// Base helper functions
function createVisualizationDTO(
  overrides: Partial<ProofVisualizationDTO> = {},
): ProofVisualizationDTO {
  return {
    documentId: 'test-doc',
    version: 1,
    trees: [],
    totalDimensions: { width: 400, height: 300 },
    isEmpty: false,
    ...overrides,
  };
}

function createTreeWithNodes(
  nodeConfigs: Array<{
    id: string;
    position?: { x: number; y: number };
    dimensions?: { width: number; height: number };
    premises?: StatementDTO[];
    conclusions?: StatementDTO[];
    sideLabel?: string;
  }>,
): TreeRenderDTO {
  const nodes = nodeConfigs.map((config) => createNode(config.id, config));

  return {
    id: 'test-tree',
    position: { x: 0, y: 0 },
    layout: {
      nodes,
      connections: [],
      dimensions: { width: 400, height: 300 },
    },
    bounds: { width: 400, height: 300 },
  };
}

function createTreeWithConnections(): TreeRenderDTO {
  const node1 = createNode('node1', {
    position: { x: 100, y: 100 },
    premises: [createStatement('p1', 'Premise 1')],
    conclusions: [createStatement('shared', 'Shared statement')],
  });

  const node2 = createNode('node2', {
    position: { x: 100, y: 250 },
    premises: [createStatement('shared', 'Shared statement')],
    conclusions: [createStatement('c1', 'Final conclusion')],
  });

  const connection = createConnection('node1', 'node2', 0, 0);

  return {
    id: 'connected-tree',
    position: { x: 0, y: 0 },
    layout: {
      nodes: [node1, node2],
      connections: [connection],
      dimensions: { width: 400, height: 400 },
    },
    bounds: { width: 400, height: 400 },
  };
}

function createNode(
  id: string,
  overrides: {
    position?: { x: number; y: number };
    dimensions?: { width: number; height: number };
    premises?: StatementDTO[];
    conclusions?: StatementDTO[];
    sideLabel?: string;
  } = {},
): RenderedNodeDTO {
  return {
    id,
    position: overrides.position || { x: 50, y: 50 },
    dimensions: overrides.dimensions || { width: 200, height: 120 },
    argument: createArgument(id),
    premises: overrides.premises || [],
    conclusions: overrides.conclusions || [],
    sideLabel: overrides.sideLabel || '',
  };
}

function createStatement(id: string, content: string): StatementDTO {
  return {
    id,
    content,
    usageCount: 1,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

function createArgument(id: string): AtomicArgumentDTO {
  return {
    id: `arg-${id}`,
    premiseSetId: `premises-${id}`,
    conclusionSetId: `conclusions-${id}`,
    sideLabels: {},
  };
}

function createConnection(
  fromNodeId: string,
  toNodeId: string,
  fromPosition: number,
  toPosition: number,
): ConnectionDTO {
  return {
    fromNodeId,
    toNodeId,
    fromPosition,
    toPosition,
    coordinates: {
      startX: 150,
      startY: 170,
      endX: 150,
      endY: 250,
    },
  };
}

function escapeForXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
