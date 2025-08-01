import { beforeEach, describe, expect, test } from 'vitest';
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

describe('TreeRenderer Interactive Features', () => {
  let renderer: TreeRenderer;

  beforeEach(() => {
    renderer = new TreeRenderer();
  });

  describe('Enhanced SVG Generation', () => {
    test('includes interactive CSS class for SVG', () => {
      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('class="proof-tree-svg"');
    });

    test('generates interactive statement elements', () => {
      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                premises: [createStatementDTO('s1', 'Test premise')],
                conclusions: [createStatementDTO('s2', 'Test conclusion')],
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Check for interactive elements
      expect(svg).toContain('editable-statement');
      expect(svg).toContain('data-statement-id="s1"');
      expect(svg).toContain('data-statement-id="s2"');
      expect(svg).toContain('data-node-id="n1"');
      expect(svg).toContain('data-statement-type="premise"');
      expect(svg).toContain('data-statement-type="conclusion"');
    });

    test('generates interactive node elements', () => {
      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                premises: [],
                conclusions: [],
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Check for interactive node elements
      expect(svg).toContain('interactive-node');
      expect(svg).toContain('data-node-id="n1"');
      expect(svg).toContain('class="drag-handle"');
    });

    test('generates interactive connection elements', () => {
      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
              }),
              createRenderedNodeDTO({
                id: 'n2',
                position: { x: 200, y: 200 },
              }),
            ],
            connections: [
              createConnectionDTO({
                fromNodeId: 'n1',
                toNodeId: 'n2',
                coordinates: {
                  startX: 100,
                  startY: 100,
                  endX: 200,
                  endY: 200,
                },
              }),
            ],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Check for interactive connection elements
      expect(svg).toContain('interactive-connection');
      expect(svg).toContain('class="connection-hit-area"');
      expect(svg).toContain('data-from-node="n1"');
      expect(svg).toContain('data-to-node="n2"');
    });

    test('generates drop zone elements', () => {
      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                premises: [createStatementDTO('s1', 'Test premise')],
                conclusions: [],
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Check for drop zone elements
      expect(svg).toContain('class="drop-zone"');
      expect(svg).toContain('data-drop-type="premise"');
    });

    test('generates editable side labels', () => {
      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                sideLabel: 'Modus Ponens',
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Check for editable side label
      expect(svg).toContain('editable-label');
      expect(svg).toContain('data-label-type="side"');
      expect(svg).toContain('Modus Ponens');
    });

    test('handles empty statements with proper data attributes', () => {
      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                premises: [],
                conclusions: [],
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Check for empty statement handling
      expect(svg).toContain('empty-statement');
      expect(svg).toContain('data-node-id="n1"');
      expect(svg).toContain('(empty)');
    });
  });

  describe('XML Security', () => {
    test('properly escapes XML special characters in statements', () => {
      const contentWithSpecialChars = 'A<B&C"D\'E';

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                premises: [createStatementDTO('s1', contentWithSpecialChars)],
                conclusions: [],
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Should escape XML entities
      expect(svg).toContain('A&lt;B&amp;C&quot;D&#x27;E');
      expect(svg).not.toContain(contentWithSpecialChars);
    });

    test('properly escapes XML special characters in side labels', () => {
      const labelWithSpecialChars = 'Rule<&>"\'';

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                sideLabel: labelWithSpecialChars,
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      // Should escape XML entities
      expect(svg).toContain('Rule&lt;&amp;&gt;&quot;&#x27;');
      expect(svg).not.toContain(labelWithSpecialChars);
    });
  });
});

// Helper functions for creating test data
function createProofVisualizationDTO(
  overrides: Partial<ProofVisualizationDTO> = {},
): ProofVisualizationDTO {
  return {
    documentId: 'test-doc',
    version: 1,
    trees: [],
    totalDimensions: { width: 400, height: 200 },
    isEmpty: false,
    ...overrides,
  };
}

function createTreeRenderDTO(
  id: string,
  layout: Partial<TreeLayoutDTO> = {},
  overrides: Partial<TreeRenderDTO> = {},
): TreeRenderDTO {
  return {
    id,
    position: { x: 0, y: 0 },
    layout: {
      nodes: [],
      connections: [],
      dimensions: { width: 400, height: 200 },
      ...layout,
    },
    bounds: { width: 400, height: 200 },
    ...overrides,
  };
}

function createRenderedNodeDTO(overrides: Partial<RenderedNodeDTO> = {}): RenderedNodeDTO {
  return {
    id: 'test-node',
    position: { x: 0, y: 0 },
    dimensions: { width: 220, height: 120 },
    argument: createAtomicArgumentDTO(),
    premises: [],
    conclusions: [],
    ...overrides,
  };
}

function createConnectionDTO(overrides: Partial<ConnectionDTO> = {}): ConnectionDTO {
  return {
    fromNodeId: 'n1',
    toNodeId: 'n2',
    fromPosition: 0,
    toPosition: 0,
    coordinates: {
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 100,
    },
    ...overrides,
  };
}

function createStatementDTO(id: string, content: string): StatementDTO {
  return {
    id,
    content,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

function createAtomicArgumentDTO(): AtomicArgumentDTO {
  return {
    id: 'test-arg',
    premiseIds: 'os1',
    conclusionIds: 'os2',
  };
}
