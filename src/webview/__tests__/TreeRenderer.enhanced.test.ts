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

describe('TreeRenderer (DTO-based)', () => {
  let renderer: TreeRenderer;

  beforeEach(() => {
    renderer = new TreeRenderer();
  });

  describe('generateSVG', () => {
    test('renders empty visualization', () => {
      const emptyVisualization = createProofVisualizationDTO({
        isEmpty: true,
        trees: [],
      });

      const svg = renderer.generateSVG(emptyVisualization);

      expect(svg).toContain('No proof trees to display');
      expect(svg).toContain('div style=');
    });

    test('renders single tree with nodes', () => {
      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                premises: [createStatementDTO('s1', 'Premise 1')],
                conclusions: [createStatementDTO('s2', 'Conclusion 1')],
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('<svg');
      expect(svg).toContain('class="argument-node"');
      expect(svg).toContain('class="implication-line"');
      expect(svg).toContain('Premise 1');
      expect(svg).toContain('Conclusion 1');
    });

    test('renders connections between nodes', () => {
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

      expect(svg).toContain('class="connection-line"');
      expect(svg).toContain('x1="100"');
      expect(svg).toContain('y1="100"');
      expect(svg).toContain('x2="200"');
      expect(svg).toContain('y2="200"');
    });

    test('renders side labels when present', () => {
      const visualization = createProofVisualizationDTO({
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

      expect(svg).toContain('class="side-label"');
      expect(svg).toContain('Modus Ponens');
    });

    test('handles empty statements gracefully', () => {
      const visualization = createProofVisualizationDTO({
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

      expect(svg).toContain('(empty)');
      expect(svg).toContain('font-style: italic');
    });

    test('truncates long statement text', () => {
      const longContent =
        'This is a very long statement that should be truncated to prevent overflow in the visualization display area';

      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                premises: [createStatementDTO('s1', longContent)],
                conclusions: [],
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('...');
      expect(svg).not.toContain(longContent);
    });

    test('escapes XML special characters', () => {
      const contentWithSpecialChars = 'A<B&C"D\'E';

      const visualization = createProofVisualizationDTO({
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

      expect(svg).toContain('A&lt;B&amp;C&quot;D&#x27;E');
    });

    test('renders multiple trees with positioning', () => {
      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO(
            'tree1',
            {
              nodes: [
                createRenderedNodeDTO({
                  id: 'n1',
                  position: { x: 100, y: 100 },
                }),
              ],
              connections: [],
              dimensions: { width: 200, height: 200 },
            },
            {
              position: { x: 0, y: 0 },
              bounds: { width: 200, height: 200 },
            },
          ),
          createTreeRenderDTO(
            'tree2',
            {
              nodes: [
                createRenderedNodeDTO({
                  id: 'n2',
                  position: { x: 200, y: 200 },
                }),
              ],
              connections: [],
            },
            {
              position: { x: 500, y: 300 },
            },
          ),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('transform="translate(0, 0)"');
      expect(svg).toContain('transform="translate(500, 300)"');
    });

    test('includes arrow markers for connections', () => {
      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [],
            connections: [
              createConnectionDTO({
                fromNodeId: 'n1',
                toNodeId: 'n2',
                coordinates: { startX: 0, startY: 0, endX: 100, endY: 100 },
              }),
            ],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('<defs>');
      expect(svg).toContain('<marker id="arrowhead"');
      expect(svg).toContain('<polygon points="0 0, 10 3.5, 0 7"');
    });

    test('renders complex argument structure', () => {
      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 100, y: 100 },
                premises: [
                  createStatementDTO('s1', 'All men are mortal'),
                  createStatementDTO('s2', 'Socrates is a man'),
                ],
                conclusions: [createStatementDTO('s3', 'Socrates is mortal')],
                sideLabel: 'Universal Instantiation',
              }),
              createRenderedNodeDTO({
                id: 'n2',
                position: { x: 100, y: 300 },
                premises: [
                  createStatementDTO('s3', 'Socrates is mortal'),
                  createStatementDTO('s4', 'All mortals die'),
                ],
                conclusions: [createStatementDTO('s5', 'Socrates will die')],
                sideLabel: 'Modus Ponens',
              }),
            ],
            connections: [
              createConnectionDTO({
                fromNodeId: 'n1',
                toNodeId: 'n2',
                coordinates: { startX: 210, startY: 220, endX: 210, endY: 300 },
              }),
            ],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('All men are mortal');
      expect(svg).toContain('Socrates is a man');
      expect(svg).toContain('Socrates is mortal');
      expect(svg).toContain('Universal Instantiation');
      expect(svg).toContain('Modus Ponens');
      expect(svg).toContain('class="connection-line"');
    });
  });

  describe('SVG structure validation', () => {
    test('generates valid SVG with proper dimensions', () => {
      const visualization = createProofVisualizationDTO({
        totalDimensions: { width: 800, height: 600 },
        trees: [],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('width="800"');
      expect(svg).toContain('height="600"');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');
    });

    test('properly nests SVG groups for trees', () => {
      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('<g class="tree"');
      expect(svg).toContain('</g>');
    });

    test('generates well-formed CSS classes', () => {
      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 0, y: 0 },
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('class="argument-node-group"');
      expect(svg).toContain('class="argument-node"');
      expect(svg).toContain('class="implication-line"');
      expect(svg).toContain('class="statement-text"');
    });
  });

  describe('error handling and edge cases', () => {
    test('handles visualization with zero dimensions', () => {
      const visualization = createProofVisualizationDTO({
        totalDimensions: { width: 0, height: 0 },
        trees: [],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('width="0"');
      expect(svg).toContain('height="0"');
    });

    test('handles nodes with zero dimensions', () => {
      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              createRenderedNodeDTO({
                id: 'n1',
                position: { x: 0, y: 0 },
                dimensions: { width: 0, height: 0 },
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('width="0"');
      expect(svg).toContain('height="0"');
    });

    test('handles empty statement arrays without errors', () => {
      const visualization = createProofVisualizationDTO({
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

      expect(() => {
        renderer.generateSVG(visualization);
      }).not.toThrow();
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
    premiseSetId: 'os1',
    conclusionSetId: 'os2',
  };
}
