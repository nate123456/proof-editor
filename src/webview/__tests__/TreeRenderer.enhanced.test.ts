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
import { Version } from '../../domain/shared/value-objects/content.js';
import {
  AtomicArgumentId,
  Dimensions,
  DocumentId,
  NodeId,
  Position2D,
  SideLabel,
  StatementId,
  TreeId,
} from '../../domain/shared/value-objects/index.js';
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
      expect(svg).toContain('argument-node');
      expect(svg).toContain('implication-line');
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

      expect(svg).toContain('connection-line');
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
                sideLabel: 'Modus Ponens' as any,
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('side-label');
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
                position: (() => {
                  const result = Position2D.create(100, 100);
                  return result.isOk() ? result.value : Position2D.origin();
                })(),
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
      // Check that the visible text content is truncated (appears between > and <)
      expect(svg).toMatch(/>\s*This is a very long st\.\.\.\s*</);
      // The full content should only appear in data attributes, not in visible text
      const textContentRegex = new RegExp(
        `>\\s*${longContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`,
      );
      expect(svg).not.toMatch(textContentRegex);
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
                  position: (() => {
                    const result = Position2D.create(200, 200);
                    return result.isOk() ? result.value : Position2D.origin();
                  })(),
                }),
              ],
              connections: [],
            },
            {
              position: (() => {
                const result = Position2D.create(500, 300);
                return result.isOk() ? result.value : Position2D.origin();
              })(),
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
                position: (() => {
                  const result = Position2D.create(100, 100);
                  return result.isOk() ? result.value : Position2D.origin();
                })(),
                premises: [
                  createStatementDTO('s1', 'All men are mortal'),
                  createStatementDTO('s2', 'Socrates is a man'),
                ],
                conclusions: [createStatementDTO('s3', 'Socrates is mortal')],
                ...(() => {
                  const result = SideLabel.create('Universal Instantiation');
                  return result.isOk() ? { sideLabel: result.value } : {};
                })(),
              }),
              createRenderedNodeDTO({
                id: 'n2',
                position: (() => {
                  const result = Position2D.create(100, 300);
                  return result.isOk() ? result.value : Position2D.origin();
                })(),
                premises: [
                  createStatementDTO('s3', 'Socrates is mortal'),
                  createStatementDTO('s4', 'All mortals die'),
                ],
                conclusions: [createStatementDTO('s5', 'Socrates will die')],
                ...(() => {
                  const result = SideLabel.create('Modus Ponens');
                  return result.isOk() ? { sideLabel: result.value } : {};
                })(),
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
      expect(svg).toContain('connection-line');
    });
  });

  describe('SVG structure validation', () => {
    test('generates valid SVG with proper dimensions', () => {
      const visualization = createProofVisualizationDTO({
        totalDimensions: (() => {
          const result = Dimensions.create(800, 600);
          return result.isOk() ? result.value : Dimensions.fullHD();
        })(),
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
                position: Position2D.origin(),
              }),
            ],
            connections: [],
          }),
        ],
      });

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('class="argument-node-group"');
      expect(svg).toContain('argument-node');
      expect(svg).toContain('implication-line');
      expect(svg).toContain('statement-text');
    });
  });

  describe('error handling and edge cases', () => {
    test('handles visualization with zero dimensions', () => {
      // Since Dimensions doesn't allow zero values, we need to test this differently
      // by creating a custom DTO that bypasses the value object validation
      const visualization = {
        documentId: (() => {
          const result = DocumentId.fromString('test-doc');
          if (result.isErr()) throw new Error('Failed to create DocumentId');
          return result.value;
        })(),
        version: (() => {
          const result = Version.create(1);
          if (result.isErr()) throw new Error('Failed to create Version');
          return result.value;
        })(),
        trees: [],
        totalDimensions: { getWidth: () => 0, getHeight: () => 0 } as any,
        isEmpty: false,
      } as ProofVisualizationDTO;

      const svg = renderer.generateSVG(visualization);

      expect(svg).toContain('width="0"');
      expect(svg).toContain('height="0"');
    });

    test('handles nodes with zero dimensions', () => {
      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO('tree1', {
            nodes: [
              {
                id: (() => {
                  const result = NodeId.fromString('n1');
                  if (result.isErr()) throw new Error('Failed to create NodeId');
                  return result.value;
                })(),
                position: Position2D.origin(),
                dimensions: { getWidth: () => 0, getHeight: () => 0 } as any,
                argument: createAtomicArgumentDTO(),
                premises: [],
                conclusions: [],
              } as RenderedNodeDTO,
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
                position: (() => {
                  const result = Position2D.create(100, 100);
                  return result.isOk() ? result.value : Position2D.origin();
                })(),
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
  const documentIdResult = DocumentId.fromString('test-doc');
  if (documentIdResult.isErr()) {
    throw new Error('Failed to create test DocumentId');
  }

  const dimensionsResult = Dimensions.create(400, 200);
  if (dimensionsResult.isErr()) {
    throw new Error('Failed to create test dimensions');
  }

  const versionResult = Version.create(1);
  if (versionResult.isErr()) {
    throw new Error('Failed to create test Version');
  }

  return {
    documentId: documentIdResult.value,
    version: versionResult.value,
    trees: [],
    totalDimensions: dimensionsResult.value,
    isEmpty: false,
    ...overrides,
  };
}

function createTreeRenderDTO(
  id: string,
  layout: Partial<
    Omit<TreeLayoutDTO, 'dimensions'> & {
      dimensions?: { width: number; height: number } | Dimensions;
    }
  > = {},
  overrides: Partial<
    Omit<TreeRenderDTO, 'position' | 'bounds'> & {
      position?: { x: number; y: number } | Position2D;
      bounds?: { width: number; height: number } | Dimensions;
    }
  > = {},
): TreeRenderDTO {
  const treeIdResult = TreeId.fromString(id);
  if (treeIdResult.isErr()) {
    throw new Error('Failed to create test TreeId');
  }

  const positionResult = Position2D.create(0, 0);
  if (positionResult.isErr()) {
    throw new Error('Failed to create test position');
  }

  const dimensionsResult = Dimensions.create(400, 200);
  if (dimensionsResult.isErr()) {
    throw new Error('Failed to create test dimensions');
  }

  let position: Position2D;
  if (overrides.position) {
    if ('getX' in overrides.position) {
      position = overrides.position as Position2D;
    } else {
      const posResult = Position2D.create(overrides.position.x, overrides.position.y);
      if (posResult.isErr()) {
        throw new Error('Failed to create position from coordinates');
      }
      position = posResult.value;
    }
  } else {
    position = positionResult.value;
  }

  let dimensions: Dimensions;
  if (layout.dimensions) {
    if ('getWidth' in layout.dimensions) {
      dimensions = layout.dimensions as Dimensions;
    } else {
      const dimResult = Dimensions.create(layout.dimensions.width, layout.dimensions.height);
      if (dimResult.isErr()) {
        throw new Error('Failed to create dimensions');
      }
      dimensions = dimResult.value;
    }
  } else {
    dimensions = dimensionsResult.value;
  }

  let bounds: Dimensions;
  if (overrides.bounds) {
    if ('getWidth' in overrides.bounds) {
      bounds = overrides.bounds as Dimensions;
    } else {
      const boundsResult = Dimensions.create(overrides.bounds.width, overrides.bounds.height);
      if (boundsResult.isErr()) {
        throw new Error('Failed to create bounds');
      }
      bounds = boundsResult.value;
    }
  } else {
    bounds = dimensionsResult.value;
  }

  const { position: _, bounds: __, ...restOverrides } = overrides;
  const { dimensions: ___, ...restLayout } = layout;

  return {
    id: treeIdResult.value,
    position,
    layout: {
      nodes: [],
      connections: [],
      dimensions,
      ...restLayout,
    },
    bounds,
    ...restOverrides,
  };
}

function createRenderedNodeDTO(
  overrides: Partial<Omit<RenderedNodeDTO, 'id' | 'position'>> & {
    id?: string | NodeId;
    position?: { x: number; y: number } | Position2D;
  } = {},
): RenderedNodeDTO {
  let nodeId: NodeId;
  if (typeof overrides.id === 'string') {
    const nodeIdResult = NodeId.fromString(overrides.id);
    if (nodeIdResult.isErr()) {
      throw new Error('Failed to create test NodeId');
    }
    nodeId = nodeIdResult.value;
  } else if (overrides.id) {
    nodeId = overrides.id;
  } else {
    const defaultResult = NodeId.fromString('test-node');
    if (defaultResult.isErr()) {
      throw new Error('Failed to create default NodeId');
    }
    nodeId = defaultResult.value;
  }

  let position: Position2D;
  if (overrides.position) {
    if ('getX' in overrides.position) {
      position = overrides.position as Position2D;
    } else {
      const posResult = Position2D.create(overrides.position.x, overrides.position.y);
      if (posResult.isErr()) {
        throw new Error('Failed to create position from coordinates');
      }
      position = posResult.value;
    }
  } else {
    position = Position2D.origin();
  }

  const dimensionsResult = Dimensions.create(220, 120);
  if (dimensionsResult.isErr()) {
    throw new Error('Failed to create test dimensions');
  }

  const {
    id: _,
    position: __,
    dimensions: ___,
    argument: ____,
    premises: _____,
    conclusions: ______,
    sideLabel: _______,
    ...restOverrides
  } = overrides;

  const result: RenderedNodeDTO = {
    id: nodeId,
    position,
    dimensions: overrides.dimensions || dimensionsResult.value,
    argument: overrides.argument || createAtomicArgumentDTO(),
    premises: overrides.premises || [],
    conclusions: overrides.conclusions || [],
    ...restOverrides,
  };

  if (overrides.sideLabel !== undefined) {
    result.sideLabel = overrides.sideLabel;
  }

  return result;
}

function createConnectionDTO(
  overrides: Partial<Omit<ConnectionDTO, 'fromNodeId' | 'toNodeId'>> & {
    fromNodeId?: string | NodeId;
    toNodeId?: string | NodeId;
  } = {},
): ConnectionDTO {
  let fromNodeId: NodeId;
  let toNodeId: NodeId;

  if (typeof overrides.fromNodeId === 'string') {
    const fromNodeIdResult = NodeId.fromString(overrides.fromNodeId);
    if (fromNodeIdResult.isErr()) {
      throw new Error('Failed to create test fromNodeId');
    }
    fromNodeId = fromNodeIdResult.value;
  } else if (overrides.fromNodeId) {
    fromNodeId = overrides.fromNodeId as any;
  } else {
    const defaultResult = NodeId.fromString('n1');
    if (defaultResult.isErr()) {
      throw new Error('Failed to create default fromNodeId');
    }
    fromNodeId = defaultResult.value;
  }

  if (typeof overrides.toNodeId === 'string') {
    const toNodeIdResult = NodeId.fromString(overrides.toNodeId);
    if (toNodeIdResult.isErr()) {
      throw new Error('Failed to create test toNodeId');
    }
    toNodeId = toNodeIdResult.value;
  } else if (overrides.toNodeId) {
    toNodeId = overrides.toNodeId as any;
  } else {
    const defaultResult = NodeId.fromString('n2');
    if (defaultResult.isErr()) {
      throw new Error('Failed to create default toNodeId');
    }
    toNodeId = defaultResult.value;
  }

  const { fromNodeId: _, toNodeId: __, ...restOverrides } = overrides;

  return {
    fromNodeId,
    toNodeId,
    fromPosition: overrides.fromPosition ?? 0,
    toPosition: overrides.toPosition ?? 0,
    coordinates: overrides.coordinates || {
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 100,
    },
    ...restOverrides,
  };
}

function createStatementDTO(id: string | StatementId, content: string): StatementDTO {
  let statementId: StatementId;

  if (typeof id === 'string') {
    const statementIdResult = StatementId.fromString(id);
    if (statementIdResult.isErr()) {
      throw new Error('Failed to create test StatementId');
    }
    statementId = statementIdResult.value;
  } else {
    statementId = id;
  }

  return {
    id: statementId as any,
    content,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

function createAtomicArgumentDTO(): AtomicArgumentDTO {
  const argIdResult = AtomicArgumentId.fromString('test-arg');
  if (argIdResult.isErr()) {
    throw new Error('Failed to create test AtomicArgumentId');
  }

  return {
    id: argIdResult.value,
    premiseIds: [
      (() => {
        const result = StatementId.fromString('stmt-1');
        if (result.isErr()) throw new Error('Failed to create StatementId');
        return result.value;
      })(),
    ],
    conclusionIds: [
      (() => {
        const result = StatementId.fromString('stmt-2');
        if (result.isErr()) throw new Error('Failed to create StatementId');
        return result.value;
      })(),
    ],
  };
}
