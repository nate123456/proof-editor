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
      const nodeId = NodeId.create('n1').unwrapOr(NodeId.generate());
      const statementId1 = StatementId.create('s1').unwrapOr(StatementId.generate());
      const statementId2 = StatementId.create('s2').unwrapOr(StatementId.generate());
      const treeId = TreeId.create('tree1').unwrapOr(
        TreeId.create('tree1').unwrapOr(null) as TreeId,
      );
      const position = Position2D.create(100, 100).unwrapOr(Position2D.origin());

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO(treeId.getValue(), {
            nodes: [
              createRenderedNodeDTO({
                id: nodeId,
                position: position,
                premises: [createStatementDTO(statementId1.getValue(), 'Test premise')],
                conclusions: [createStatementDTO(statementId2.getValue(), 'Test conclusion')],
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
      const nodeId = NodeId.create('n1').unwrapOr(NodeId.generate());
      const treeId = TreeId.create('tree1').unwrapOr(
        TreeId.create('tree1').unwrapOr(null) as TreeId,
      );
      const position = Position2D.create(100, 100).unwrapOr(Position2D.origin());

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO(treeId.getValue(), {
            nodes: [
              createRenderedNodeDTO({
                id: nodeId,
                position: position,
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
      expect(svg).toContain('drag-handle');
    });

    test('generates interactive connection elements', () => {
      const nodeId1 = NodeId.create('n1').unwrapOr(NodeId.generate());
      const nodeId2 = NodeId.create('n2').unwrapOr(NodeId.generate());
      const treeId = TreeId.create('tree1').unwrapOr(
        TreeId.create('tree1').unwrapOr(null) as TreeId,
      );
      const position1 = Position2D.create(100, 100).unwrapOr(Position2D.origin());
      const position2 = Position2D.create(200, 200).unwrapOr(Position2D.origin());

      const visualization = createProofVisualizationDTO({
        trees: [
          createTreeRenderDTO(treeId.getValue(), {
            nodes: [
              createRenderedNodeDTO({
                id: nodeId1,
                position: position1,
              }),
              createRenderedNodeDTO({
                id: nodeId2,
                position: position2,
              }),
            ],
            connections: [
              createConnectionDTO({
                fromNodeId: nodeId1,
                toNodeId: nodeId2,
                coordinates: {
                  startX: position1.getX(),
                  startY: position1.getY(),
                  endX: position2.getX(),
                  endY: position2.getY(),
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
      const nodeId = NodeId.create('n1').unwrapOr(NodeId.generate());
      const statementId = StatementId.create('s1').unwrapOr(StatementId.generate());
      const treeId = TreeId.create('tree1').unwrapOr(
        TreeId.create('tree1').unwrapOr(null) as TreeId,
      );
      const position = Position2D.create(100, 100).unwrapOr(Position2D.origin());

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO(treeId.getValue(), {
            nodes: [
              createRenderedNodeDTO({
                id: nodeId,
                position: position,
                premises: [createStatementDTO(statementId.getValue(), 'Test premise')],
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
      const nodeId = NodeId.create('n1').unwrapOr(NodeId.generate());
      const treeId = TreeId.create('tree1').unwrapOr(
        TreeId.create('tree1').unwrapOr(null) as TreeId,
      );
      const position = Position2D.create(100, 100).unwrapOr(Position2D.origin());

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO(treeId.getValue(), {
            nodes: [
              createRenderedNodeDTO({
                id: nodeId,
                position: position,
                sideLabel: SideLabel.create('Modus Ponens').unwrapOr(
                  SideLabel.create('Modus Ponens').unwrapOr(null) as SideLabel,
                ),
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
      const nodeId = NodeId.create('n1').unwrapOr(NodeId.generate());
      const treeId = TreeId.create('tree1').unwrapOr(
        TreeId.create('tree1').unwrapOr(null) as TreeId,
      );
      const position = Position2D.create(100, 100).unwrapOr(Position2D.origin());

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO(treeId.getValue(), {
            nodes: [
              createRenderedNodeDTO({
                id: nodeId,
                position: position,
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

      const nodeId = NodeId.create('n1').unwrapOr(NodeId.generate());
      const statementId = StatementId.create('s1').unwrapOr(StatementId.generate());
      const treeId = TreeId.create('tree1').unwrapOr(
        TreeId.create('tree1').unwrapOr(null) as TreeId,
      );
      const position = Position2D.create(100, 100).unwrapOr(Position2D.origin());

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO(treeId.getValue(), {
            nodes: [
              createRenderedNodeDTO({
                id: nodeId,
                position: position,
                premises: [createStatementDTO(statementId.getValue(), contentWithSpecialChars)],
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

      const nodeId = NodeId.create('n1').unwrapOr(NodeId.generate());
      const treeId = TreeId.create('tree1').unwrapOr(
        TreeId.create('tree1').unwrapOr(null) as TreeId,
      );
      const position = Position2D.create(100, 100).unwrapOr(Position2D.origin());

      const visualization = createProofVisualizationDTO({
        isEmpty: false,
        trees: [
          createTreeRenderDTO(treeId.getValue(), {
            nodes: [
              createRenderedNodeDTO({
                id: nodeId,
                position: position,
                sideLabel: SideLabel.create(labelWithSpecialChars).unwrapOr(
                  SideLabel.create(labelWithSpecialChars).unwrapOr(null) as SideLabel,
                ),
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
  const documentId = DocumentId.create('test-doc').unwrapOr(
    DocumentId.create('test-doc').unwrapOr(null) as DocumentId,
  );
  return {
    documentId: documentId,
    version: Version.create(1).unwrapOr(Version.create(1).unwrapOr(null) as Version),
    trees: [],
    totalDimensions: Dimensions.create(400, 200).unwrapOr(
      Dimensions.create(400, 200).unwrapOr(null) as Dimensions,
    ),
    isEmpty: false,
    ...overrides,
  };
}

function createTreeRenderDTO(
  id: string,
  layout: Partial<TreeLayoutDTO> = {},
  overrides: Partial<TreeRenderDTO> = {},
): TreeRenderDTO {
  const treeId = TreeId.create(id).unwrapOr(TreeId.create(id).unwrapOr(null) as TreeId);
  const position = Position2D.origin();
  const dimensions = Dimensions.create(400, 200).unwrapOr(
    Dimensions.create(400, 200).unwrapOr(null) as Dimensions,
  );
  return {
    id: treeId,
    position: position,
    layout: {
      nodes: [],
      connections: [],
      dimensions: dimensions,
      ...layout,
    },
    bounds: dimensions,
    ...overrides,
  };
}

function createRenderedNodeDTO(overrides: Partial<RenderedNodeDTO> = {}): RenderedNodeDTO {
  const nodeId = NodeId.create('test-node').unwrapOr(NodeId.generate());
  const position = Position2D.origin();
  const dimensions = Dimensions.create(220, 120).unwrapOr(
    Dimensions.create(220, 120).unwrapOr(null) as Dimensions,
  );
  return {
    id: nodeId,
    position: position,
    dimensions: dimensions,
    argument: createAtomicArgumentDTO(),
    premises: [],
    conclusions: [],
    ...overrides,
  };
}

function createConnectionDTO(overrides: Partial<ConnectionDTO> = {}): ConnectionDTO {
  const nodeId1 = NodeId.create('n1').unwrapOr(NodeId.generate());
  const nodeId2 = NodeId.create('n2').unwrapOr(NodeId.generate());
  return {
    fromNodeId: nodeId1,
    toNodeId: nodeId2,
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
  const statementId = StatementId.create(id).unwrapOr(StatementId.generate());
  return {
    id: statementId.getValue(),
    content,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

function createAtomicArgumentDTO(): AtomicArgumentDTO {
  const argumentId = AtomicArgumentId.create('test-arg').unwrapOr(AtomicArgumentId.generate());
  const premiseId = StatementId.create('os1').unwrapOr(StatementId.generate());
  const conclusionId = StatementId.create('os2').unwrapOr(StatementId.generate());
  return {
    id: argumentId,
    premiseIds: [premiseId],
    conclusionIds: [conclusionId],
  };
}
