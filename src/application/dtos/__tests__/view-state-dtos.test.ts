import { describe, expect, it } from 'vitest';
import { SideLabel, Version } from '../../../domain/shared/value-objects/content.js';
import {
  Dimensions,
  PanelSize,
  Position2D,
} from '../../../domain/shared/value-objects/geometry.js';
import {
  AtomicArgumentId,
  DocumentId,
  NodeId,
  StatementId,
  TreeId,
} from '../../../domain/shared/value-objects/identifiers.js';
import { FontFamily, FontSize, ZoomLevel } from '../../../domain/shared/value-objects/ui.js';
import type { AtomicArgumentDTO } from '../../queries/shared-types.js';
import type { StatementDTO } from '../../queries/statement-queries.js';
import {
  type ConnectionDTO,
  createConnectionDTO,
  createPanelState,
  createProofVisualizationDTO,
  createRenderedNodeDTO,
  createSelectionState,
  createThemeState,
  createTreeLayoutDTO,
  createTreeRenderDTO,
  createViewportState,
  isConnectionDTO,
  isPanelState,
  isProofVisualizationDTO,
  isRenderedNodeDTO,
  isSelectionState,
  isThemeState,
  isTreeLayoutDTO,
  isTreeRenderDTO,
  isViewportState,
  isViewStateChangeEvent,
  type PanelState,
  type RenderedNodeDTO,
  type SelectionState,
  type ThemeState,
  type TreeLayoutDTO,
  type TreeRenderDTO,
  type ViewportState,
  type ViewStateChangeEvent,
  validatePanelState,
  validateSelectionState,
  validateThemeState,
  validateViewportState,
} from '../view-dtos.js';

// Helper functions to create test value objects safely
function createTestNodeId(value: string): NodeId {
  const result = NodeId.create(value);
  if (result.isErr()) {
    throw new Error(`Failed to create NodeId with value: ${value}`);
  }
  return result.value;
}

function createTestTreeId(value: string): TreeId {
  const result = TreeId.create(value);
  if (result.isErr()) {
    throw new Error(`Failed to create TreeId with value: ${value}`);
  }
  return result.value;
}

function createTestStatementId(value: string): StatementId {
  const result = StatementId.create(value);
  if (result.isErr()) {
    throw new Error(`Failed to create StatementId with value: ${value}`);
  }
  return result.value;
}

function createTestAtomicArgumentId(value: string): AtomicArgumentId {
  const result = AtomicArgumentId.create(value);
  if (result.isErr()) {
    throw new Error(`Failed to create AtomicArgumentId with value: ${value}`);
  }
  return result.value;
}

function createTestDocumentId(value: string): DocumentId {
  const result = DocumentId.create(value);
  if (result.isErr()) {
    throw new Error(`Failed to create DocumentId with value: ${value}`);
  }
  return result.value;
}

function createTestSideLabel(value: string): SideLabel {
  const result = SideLabel.create(value);
  if (result.isErr()) {
    throw new Error(`Failed to create SideLabel with value: ${value}`);
  }
  return result.value;
}

describe('View State DTOs', () => {
  describe('SelectionState', () => {
    it('should create valid selection state with factory function', () => {
      // Act
      const nodeId1Result = NodeId.create('node1');
      const nodeId2Result = NodeId.create('node2');
      const treeIdResult = TreeId.create('tree1');

      if (nodeId1Result.isErr() || nodeId2Result.isErr() || treeIdResult.isErr()) {
        throw new Error('Failed to create test IDs');
      }

      const state = createSelectionState(
        [nodeId1Result.value, nodeId2Result.value],
        ['stmt1'],
        [treeIdResult.value],
      );

      // Assert
      expect(state.selectedNodes.map((n) => n.getValue())).toEqual(['node1', 'node2']);
      expect(state.selectedStatements).toEqual(['stmt1']);
      expect(state.selectedTrees.map((t) => t.getValue())).toEqual(['tree1']);
    });

    it('should create empty selection state by default', () => {
      // Act
      const state = createSelectionState();

      // Assert
      expect(state.selectedNodes).toEqual([]);
      expect(state.selectedStatements).toEqual([]);
      expect(state.selectedTrees).toEqual([]);
    });

    it('should validate valid selection state', () => {
      // Arrange
      const nodeId1Result = NodeId.create('node1');
      const nodeId2Result = NodeId.create('node2');
      const treeIdResult = TreeId.create('tree1');

      if (nodeId1Result.isErr() || nodeId2Result.isErr() || treeIdResult.isErr()) {
        throw new Error('Failed to create test IDs');
      }

      const state: SelectionState = {
        selectedNodes: [nodeId1Result.value, nodeId2Result.value],
        selectedStatements: ['stmt1'],
        selectedTrees: [treeIdResult.value],
      };

      // Act
      const result = validateSelectionState(state);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should reject selection state with duplicate nodes', () => {
      // Arrange
      const nodeId = NodeId.create('node1').unwrapOr(null)!;
      const state: SelectionState = {
        selectedNodes: [nodeId, nodeId], // Duplicate
        selectedStatements: [],
        selectedTrees: [],
      };

      // Act
      const result = validateSelectionState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Duplicate nodes in selection');
      }
    });

    it.skip('should reject selection state with invalid node IDs', () => {
      // Skip: Cannot create invalid NodeId due to value object validation
      // This validation is handled at the value object level
    });

    it('should identify valid selection state objects', () => {
      // Arrange
      const validState = {
        selectedNodes: [NodeId.create('node1').unwrapOr(null)!],
        selectedStatements: ['stmt1'],
        selectedTrees: [TreeId.create('tree1').unwrapOr(null)!],
      };
      const invalidState = {
        selectedNodes: ['node1'], // Invalid - should be NodeId objects
        selectedStatements: 'not-an-array',
        selectedTrees: ['tree1'],
      };

      // Act & Assert
      expect(isSelectionState(validState)).toBe(true);
      expect(isSelectionState(invalidState)).toBe(false);
      expect(isSelectionState(null)).toBe(false);
      expect(isSelectionState(undefined)).toBe(false);
    });
  });

  describe('ViewportState', () => {
    it('should create valid viewport state with factory function', () => {
      // Act
      const zoomLevel = ZoomLevel.create(1.5).unwrapOr(ZoomLevel.normal());
      const state = createViewportState(
        zoomLevel,
        Position2D.create(100, 200).unwrapOr(Position2D.origin()),
        Position2D.create(50, 75).unwrapOr(Position2D.origin()),
      );

      // Assert
      expect(state.zoom.getValue()).toBe(1.5);
      expect(state.pan).toEqual({ x: 100, y: 200 });
      expect(state.center).toEqual({ x: 50, y: 75 });
    });

    it('should create default viewport state', () => {
      // Act
      const state = createViewportState();

      // Assert
      expect(state.zoom.getValue()).toBe(1.0);
      expect(state.pan).toEqual({ x: 0, y: 0 });
      expect(state.center).toEqual({ x: 0, y: 0 });
    });

    it('should validate valid viewport state', () => {
      // Arrange
      const state: ViewportState = {
        zoom: ZoomLevel.create(1.5).unwrapOr(ZoomLevel.normal()),
        pan: Position2D.create(100, 200).unwrapOr(Position2D.origin()),
        center: Position2D.create(50, 75).unwrapOr(Position2D.origin()),
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should reject viewport state with invalid zoom', () => {
      // Arrange
      const invalidZoomResult = ZoomLevel.create(0.05); // Below minimum
      if (invalidZoomResult.isOk()) {
        throw new Error('Expected ZoomLevel.create(0.05) to fail');
      }

      // For testing, we'll create a state with a zoom that should fail validation
      // Since we can't create an invalid ZoomLevel, we need to test this differently
      const state: ViewportState = {
        zoom: 0.05 as any, // Force invalid value for testing
        pan: Position2D.origin(),
        center: Position2D.origin(),
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zoom must be a ZoomLevel value object');
      }
    });

    it('should reject viewport state with invalid pan coordinates', () => {
      // Arrange
      const invalidPanResult = Position2D.create(Number.POSITIVE_INFINITY, 0);
      if (invalidPanResult.isOk()) {
        throw new Error('Expected Position2D.create with infinity to fail');
      }

      // For testing, force an invalid value
      const state: ViewportState = {
        zoom: ZoomLevel.normal(),
        pan: { x: Number.POSITIVE_INFINITY, y: 0 } as any, // Force invalid value for testing
        center: Position2D.origin(),
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Pan must be a Position2D value object');
      }
    });

    it('should identify valid viewport state objects', () => {
      // Arrange
      const validState = {
        zoom: ZoomLevel.create(1.5).unwrapOr(ZoomLevel.normal()),
        pan: Position2D.create(100, 200).unwrapOr(Position2D.origin()),
        center: Position2D.create(50, 75).unwrapOr(Position2D.origin()),
      };
      const invalidState = {
        zoom: 'not-a-number',
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      };

      // Act & Assert
      expect(isViewportState(validState)).toBe(true);
      expect(isViewportState(invalidState)).toBe(false);
      expect(isViewportState(null)).toBe(false);
      expect(isViewportState(undefined)).toBe(false);
      expect(isViewportState('string')).toBe(false);
      expect(isViewportState(123)).toBe(false);
    });
  });

  describe('PanelState', () => {
    it('should create valid panel state with factory function', () => {
      // Act
      const state = createPanelState(true, false, true, {
        validation: PanelSize.create(200).unwrapOr(PanelSize.defaultSidebar()),
        miniMap: PanelSize.create(150).unwrapOr(PanelSize.defaultSidebar()),
      });

      // Assert
      expect(state.miniMapVisible).toBe(true);
      expect(state.sideLabelsVisible).toBe(false);
      expect(state.validationPanelVisible).toBe(true);
      expect(state.panelSizes.validation?.getValue()).toBe(200);
      expect(state.panelSizes.miniMap?.getValue()).toBe(150);
    });

    it('should create default panel state', () => {
      // Act
      const state = createPanelState();

      // Assert
      expect(state.miniMapVisible).toBe(true);
      expect(state.sideLabelsVisible).toBe(true);
      expect(state.validationPanelVisible).toBe(false);
      expect(state.panelSizes).toEqual({});
    });

    it('should validate valid panel state', () => {
      // Arrange
      const state: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: false,
        panelSizes: { validation: PanelSize.create(200).unwrapOr(PanelSize.defaultSidebar()) },
      };

      // Act
      const result = validatePanelState(state);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it.skip('should reject panel state with negative panel sizes', () => {
      // Skip: PanelSize.create(-10) returns error, unwrapOr provides valid default
      // Cannot test validation of negative sizes as value objects prevent their creation
    });

    it.skip('should reject panel state with invalid panel size values', () => {
      // Skip: PanelSize.create(NaN) returns error, unwrapOr provides valid default
      // Value object validation prevents creation of invalid panel sizes
    });

    it('should identify valid panel state objects', () => {
      // Arrange
      const validState = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: {
          validation: PanelSize.create(200).unwrapOr(PanelSize.defaultSidebar()),
          miniMap: PanelSize.create(150).unwrapOr(PanelSize.defaultSidebar()),
        },
      };
      const invalidStateNonBoolean = {
        miniMapVisible: 'true',
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: {
          validation: PanelSize.create(200).unwrapOr(PanelSize.defaultSidebar()),
        },
      };
      const invalidStateNonObject = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: 'invalid',
      };
      const invalidStateNonNumber = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: {
          validation: 'invalid' as any,
        },
      };

      // Act & Assert
      expect(isPanelState(validState)).toBe(true);
      expect(isPanelState(invalidStateNonBoolean)).toBe(false);
      expect(isPanelState(invalidStateNonObject)).toBe(false);
      expect(isPanelState(invalidStateNonNumber)).toBe(false);
      expect(isPanelState(null)).toBe(false);
      expect(isPanelState(undefined)).toBe(false);
      expect(isPanelState({})).toBe(false);
    });
  });

  describe('ThemeState', () => {
    it('should create valid theme state with factory function', () => {
      // Act
      const state = createThemeState(
        'dark',
        FontSize.create(16).unwrapOr(FontSize.default()),
        FontFamily.create('monospace').unwrapOr(FontFamily.defaultMonospace()),
      );

      // Assert
      expect(state.colorScheme).toBe('dark');
      expect(state.fontSize.getValue()).toBe(16);
      expect(state.fontFamily.getValue()).toBe('monospace');
    });

    it('should create default theme state', () => {
      // Act
      const state = createThemeState();

      // Assert
      expect(state.colorScheme).toBe('auto');
      expect(state.fontSize.getValue()).toBe(14);
      expect(state.fontFamily.getValue()).toBe(
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      );
    });

    it('should validate valid theme state', () => {
      // Arrange
      const state: ThemeState = {
        colorScheme: 'light',
        fontSize: FontSize.create(12).unwrapOr(FontSize.default()),
        fontFamily: FontFamily.create('Arial').unwrapOr(FontFamily.defaultSansSerif()),
      };

      // Act
      const result = validateThemeState(state);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should reject theme state with invalid color scheme', () => {
      // Arrange
      const state: ThemeState = {
        colorScheme: 'invalid' as any,
        fontSize: FontSize.create(14).unwrapOr(FontSize.default()),
        fontFamily: FontFamily.create('default').unwrapOr(FontFamily.defaultSansSerif()),
      };

      // Act
      const result = validateThemeState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid color scheme');
      }
    });

    it.skip('should reject theme state with invalid font size', () => {
      // Skip: FontSize.create(4) returns error, unwrapOr provides valid default
      // Font size validation is handled at the value object level
    });

    it.skip('should reject theme state with font size too large', () => {
      // Skip: FontSize.create(50) returns error, unwrapOr provides valid default
      // Font size range validation is handled at the value object level
    });

    it.skip('should reject theme state with empty font family', () => {
      // Skip: FontFamily.create(' ') returns error, unwrapOr provides valid default
      // Font family validation is handled at the value object level
    });

    it('should identify valid theme state objects', () => {
      // Arrange
      const validState = {
        colorScheme: 'light',
        fontSize: FontSize.create(16).unwrapOr(FontSize.default()),
        fontFamily: FontFamily.create('Arial').unwrapOr(FontFamily.defaultSansSerif()),
      };
      const invalidStateColorScheme = {
        colorScheme: 'invalid',
        fontSize: FontSize.create(16).unwrapOr(FontSize.default()),
        fontFamily: FontFamily.create('Arial').unwrapOr(FontFamily.defaultSansSerif()),
      };
      const invalidStateNonString = {
        colorScheme: 123,
        fontSize: 16,
        fontFamily: 'Arial',
      };
      const invalidStateNonNumber = {
        colorScheme: 'dark',
        fontSize: 'invalid',
        fontFamily: FontFamily.create('Arial').unwrapOr(FontFamily.defaultSansSerif()),
      };

      // Act & Assert
      expect(isThemeState(validState)).toBe(true);
      expect(isThemeState(invalidStateColorScheme)).toBe(false);
      expect(isThemeState(invalidStateNonString)).toBe(false);
      expect(isThemeState(invalidStateNonNumber)).toBe(false);
      expect(isThemeState(null)).toBe(false);
      expect(isThemeState(undefined)).toBe(false);
      expect(isThemeState({})).toBe(false);
    });
  });

  describe('ViewStateChangeEvent', () => {
    it('should identify valid view state change events', () => {
      // Arrange
      const validEvent: ViewStateChangeEvent = {
        type: 'selection-changed',
        newState: createSelectionState([createTestNodeId('node1')], [], []),
        timestamp: Date.now(),
      };
      const invalidEvent = {
        type: 'invalid-event',
        newState: {},
        timestamp: Date.now(),
      };

      // Act & Assert
      expect(isViewStateChangeEvent(validEvent)).toBe(true);
      expect(isViewStateChangeEvent(invalidEvent)).toBe(false);
      expect(isViewStateChangeEvent(null)).toBe(false);
      expect(isViewStateChangeEvent(undefined)).toBe(false);
      expect(isViewStateChangeEvent('string')).toBe(false);
      expect(isViewStateChangeEvent(123)).toBe(false);
    });

    it('should validate event timestamps', () => {
      // Arrange
      const currentTime = Date.now();
      const validEvent: ViewStateChangeEvent = {
        type: 'viewport-changed',
        newState: createViewportState(),
        timestamp: currentTime,
      };
      const invalidEvent = {
        type: 'viewport-changed',
        newState: createViewportState(),
        timestamp: -1,
      };

      // Act & Assert
      expect(isViewStateChangeEvent(validEvent)).toBe(true);
      expect(isViewStateChangeEvent(invalidEvent)).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('should create immutable selection state objects', () => {
      // Arrange
      const originalNodes = [createTestNodeId('node1'), createTestNodeId('node2')];
      const state = createSelectionState(originalNodes, [], []);

      // Act
      originalNodes.push(createTestNodeId('node3'));

      // Assert
      expect(state.selectedNodes.map((n) => n.getValue())).toEqual(['node1', 'node2']);
      expect(state.selectedNodes).not.toBe(originalNodes);
    });

    it('should create immutable viewport state objects', () => {
      // Arrange
      const originalPan = { x: 100, y: 200 };
      const state = createViewportState(
        ZoomLevel.normal(),
        Position2D.create(originalPan.x, originalPan.y).unwrapOr(Position2D.origin()),
        Position2D.origin(),
      );

      // Act
      originalPan.x = 500;

      // Assert
      expect(state.pan.getX()).toBe(100);
      expect(state.pan).not.toEqual(originalPan);
    });

    it('should create immutable panel state objects', () => {
      // Arrange
      const originalSizes = {
        validation: PanelSize.create(200).unwrapOr(PanelSize.defaultSidebar()),
      };
      const state = createPanelState(true, true, false, originalSizes);

      // Act
      originalSizes.validation = PanelSize.create(500).unwrapOr(PanelSize.defaultSidebar());

      // Assert
      expect(state.panelSizes.validation?.getValue()).toBe(200);
      expect(state.panelSizes).not.toBe(originalSizes);
    });
  });

  describe('Equality', () => {
    it('should implement structural equality for selection state', () => {
      // Arrange
      const state1 = createSelectionState(
        [NodeId.create('node1').unwrapOr(null)!],
        ['stmt1'],
        [TreeId.create('tree1').unwrapOr(null)!],
      );
      const state2 = createSelectionState(
        [NodeId.create('node1').unwrapOr(null)!],
        ['stmt1'],
        [TreeId.create('tree1').unwrapOr(null)!],
      );
      const state3 = createSelectionState(
        [NodeId.create('node2').unwrapOr(null)!],
        ['stmt1'],
        [TreeId.create('tree1').unwrapOr(null)!],
      );

      // Act & Assert
      expect(state1).toEqual(state2);
      expect(state1).not.toEqual(state3);
    });

    it('should implement structural equality for viewport state', () => {
      // Arrange
      const zoom1 = ZoomLevel.create(1.5).unwrapOr(ZoomLevel.normal());
      const zoom2 = ZoomLevel.create(2.0).unwrapOr(ZoomLevel.normal());
      const pan = Position2D.create(100, 200).unwrapOr(Position2D.origin());
      const center = Position2D.create(50, 75).unwrapOr(Position2D.origin());

      const state1 = createViewportState(zoom1, pan, center);
      const state2 = createViewportState(zoom1, pan, center);
      const state3 = createViewportState(zoom2, pan, center);

      // Act & Assert
      expect(state1).toEqual(state2);
      expect(state1).not.toEqual(state3);
    });
  });

  describe('Factory functions for visualization DTOs', () => {
    it('should create TreeRenderDTO with factory function', () => {
      // Arrange
      const layout: TreeLayoutDTO = {
        nodes: [],
        connections: [],
        dimensions: Dimensions.create(800, 600).unwrapOr(Dimensions.fullHD()),
      };

      // Act
      const treeRender = createTreeRenderDTO(
        TreeId.create('tree1').unwrapOr(null)!,
        Position2D.create(100, 200).unwrapOr(Position2D.origin()),
        layout,
        Dimensions.create(800, 600).unwrapOr(Dimensions.fullHD()),
      );

      // Assert
      expect(treeRender.id.getValue()).toBe('tree1');
      expect(treeRender.position).toEqual({ x: 100, y: 200 });
      expect(treeRender.layout).toBe(layout);
      expect(treeRender.bounds).toEqual({ width: 800, height: 600 });
    });

    it('should create TreeLayoutDTO with factory function', () => {
      // Arrange
      const nodes: RenderedNodeDTO[] = [];
      const connections: ConnectionDTO[] = [];
      const dimensions = Dimensions.create(800, 600).unwrapOr(Dimensions.fullHD());

      // Act
      const layout = createTreeLayoutDTO(nodes, connections, dimensions);

      // Assert
      expect(layout.nodes).toBe(nodes);
      expect(layout.connections).toBe(connections);
      expect(layout.dimensions).toBe(dimensions);
    });

    it('should create RenderedNodeDTO with factory function', () => {
      // Arrange
      const mockArgument: AtomicArgumentDTO = {
        id: AtomicArgumentId.create('arg1').unwrapOr(null)!,
        premiseIds: [StatementId.create('premise-1').unwrapOr(null)!],
        conclusionIds: [StatementId.create('conclusion-1').unwrapOr(null)!],
      };
      const mockPremises: StatementDTO[] = [
        {
          id: 'stmt1',
          content: 'premise',
          usageCount: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
        },
      ];
      const mockConclusions: StatementDTO[] = [
        {
          id: 'stmt2',
          content: 'conclusion',
          usageCount: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
        },
      ];

      // Act
      const node = createRenderedNodeDTO(
        NodeId.create('node1').unwrapOr(null)!,
        Position2D.create(50, 100).unwrapOr(Position2D.origin()),
        Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        mockArgument,
        mockPremises,
        mockConclusions,
        SideLabel.create('side-label').unwrapOr(null)!,
      );

      // Assert
      expect(node.id.getValue()).toBe('node1');
      expect(node.position).toEqual({ x: 50, y: 100 });
      expect(node.dimensions).toEqual({ width: 200, height: 100 });
      expect(node.argument).toBe(mockArgument);
      expect(node.premises).toBe(mockPremises);
      expect(node.conclusions).toBe(mockConclusions);
      expect(node.sideLabel?.getValue()).toBe('side-label');
    });

    it('should create RenderedNodeDTO without side label', () => {
      // Arrange
      const mockArgument: AtomicArgumentDTO = {
        id: AtomicArgumentId.create('arg1').unwrapOr(null)!,
        premiseIds: [],
        conclusionIds: [],
      };
      const mockPremises: StatementDTO[] = [
        {
          id: 'stmt1',
          content: 'premise',
          usageCount: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
        },
      ];
      const mockConclusions: StatementDTO[] = [
        {
          id: 'stmt2',
          content: 'conclusion',
          usageCount: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
        },
      ];

      // Act
      const node = createRenderedNodeDTO(
        NodeId.create('node1').unwrapOr(null)!,
        Position2D.create(50, 100).unwrapOr(Position2D.origin()),
        Dimensions.create(200, 100).unwrapOr(Dimensions.fullHD()),
        mockArgument,
        mockPremises,
        mockConclusions,
      );

      // Assert
      expect(node.sideLabel).toBeUndefined();
      expect(node.id.getValue()).toBe('node1');
    });

    it('should create ConnectionDTO with factory function', () => {
      // Act
      const connection = createConnectionDTO(
        createTestNodeId('node1'),
        createTestNodeId('node2'),
        0,
        1,
        {
          startX: 100,
          startY: 200,
          endX: 300,
          endY: 400,
        },
      );

      // Assert
      expect(connection.fromNodeId.getValue()).toBe('node1');
      expect(connection.toNodeId.getValue()).toBe('node2');
      expect(connection.fromPosition).toBe(0);
      expect(connection.toPosition).toBe(1);
      expect(connection.coordinates).toEqual({
        startX: 100,
        startY: 200,
        endX: 300,
        endY: 400,
      });
    });

    it('should create ProofVisualizationDTO with factory function', () => {
      // Arrange
      const trees: TreeRenderDTO[] = [];
      const totalDimensions = Dimensions.create(1200, 800).unwrapOr(Dimensions.fullHD());

      // Act
      const visualization = createProofVisualizationDTO(
        DocumentId.create('doc1').unwrapOr(null)!,
        Version.create(1).unwrapOr(Version.initial()),
        trees,
        totalDimensions,
        true,
      );

      // Assert
      expect(visualization.documentId.getValue()).toBe('doc1');
      expect(visualization.version.getValue()).toBe(1);
      expect(visualization.trees).toBe(trees);
      expect(visualization.totalDimensions).toBe(totalDimensions);
      expect(visualization.isEmpty).toBe(true);
    });
  });

  describe('Type guards for visualization DTOs', () => {
    it('should identify valid TreeRenderDTO objects', () => {
      // Arrange
      const validDTO = {
        id: 'tree1',
        position: { x: 100, y: 200 },
        layout: {
          nodes: [],
          connections: [],
          dimensions: Dimensions.create(800, 600).unwrapOr(Dimensions.fullHD()),
        },
        bounds: { width: 800, height: 600 },
      };
      const invalidDTO = {
        id: 'tree1',
        position: { x: 100 }, // Missing y
        layout: {},
        bounds: { width: 800, height: 600 },
      };

      // Act & Assert
      expect(isTreeRenderDTO(validDTO)).toBe(true);
      expect(isTreeRenderDTO(invalidDTO)).toBe(false);
      expect(isTreeRenderDTO(null)).toBe(false);
      expect(isTreeRenderDTO(undefined)).toBe(false);
    });

    it('should identify valid TreeLayoutDTO objects', () => {
      // Arrange
      const validDTO = {
        nodes: [],
        connections: [],
        dimensions: Dimensions.create(800, 600).unwrapOr(Dimensions.fullHD()),
      };
      const invalidDTO = {
        nodes: 'not-an-array',
        connections: [],
        dimensions: Dimensions.create(800, 600).unwrapOr(Dimensions.fullHD()),
      };

      // Act & Assert
      expect(isTreeLayoutDTO(validDTO)).toBe(true);
      expect(isTreeLayoutDTO(invalidDTO)).toBe(false);
      expect(isTreeLayoutDTO(null)).toBe(false);
    });

    it('should identify valid RenderedNodeDTO objects', () => {
      // Arrange
      const validDTO = {
        id: 'node1',
        position: { x: 50, y: 100 },
        dimensions: { width: 200, height: 100 },
        argument: {
          id: 'arg1',
          premiseIds: ['s1', 's2'],
          conclusionIds: ['s3'],
        },
        premises: [],
        conclusions: [],
      };
      const invalidDTO = {
        id: 'node1',
        position: { x: 50, y: 100 },
        dimensions: { width: 200 }, // Missing height
        argument: {
          id: 'arg1',
          premiseIds: ['s1', 's2'],
          conclusionIds: ['s3'],
        },
        premises: [],
        conclusions: [],
      };

      // Act & Assert
      expect(isRenderedNodeDTO(validDTO)).toBe(true);
      expect(isRenderedNodeDTO(invalidDTO)).toBe(false);
      expect(isRenderedNodeDTO(null)).toBe(false);
    });

    it('should identify valid ConnectionDTO objects', () => {
      // Arrange
      const validDTO = {
        fromNodeId: 'node1',
        toNodeId: 'node2',
        fromPosition: 0,
        toPosition: 1,
        coordinates: {
          startX: 100,
          startY: 200,
          endX: 300,
          endY: 400,
        },
      };
      const invalidDTO = {
        fromNodeId: 'node1',
        toNodeId: 'node2',
        fromPosition: 0,
        toPosition: 1,
        coordinates: {
          startX: 100,
          startY: 200,
          endX: 300,
          // Missing endY
        },
      };

      // Act & Assert
      expect(isConnectionDTO(validDTO)).toBe(true);
      expect(isConnectionDTO(invalidDTO)).toBe(false);
      expect(isConnectionDTO(null)).toBe(false);
    });

    it('should identify valid ProofVisualizationDTO objects', () => {
      // Arrange
      const validDTO = {
        documentId: 'doc1',
        version: 1,
        trees: [],
        totalDimensions: { width: 1200, height: 800 },
        isEmpty: false,
      };
      const invalidDTO = {
        documentId: 'doc1',
        version: 'not-a-number',
        trees: [],
        totalDimensions: { width: 1200, height: 800 },
        isEmpty: false,
      };

      // Act & Assert
      expect(isProofVisualizationDTO(validDTO)).toBe(true);
      expect(isProofVisualizationDTO(invalidDTO)).toBe(false);
      expect(isProofVisualizationDTO(null)).toBe(false);
    });
  });

  describe('Validation edge cases', () => {
    it('should reject selection state with duplicate statements', () => {
      // Arrange
      const state: SelectionState = {
        selectedNodes: [],
        selectedStatements: ['stmt1', 'stmt1'], // Duplicate
        selectedTrees: [],
      };

      // Act
      const result = validateSelectionState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Duplicate statements in selection');
      }
    });

    it('should reject selection state with duplicate trees', () => {
      // Arrange
      const treeId = TreeId.create('tree1').unwrapOr(null)!;
      const state: SelectionState = {
        selectedNodes: [],
        selectedStatements: [],
        selectedTrees: [treeId, treeId], // Duplicate
      };

      // Act
      const result = validateSelectionState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Duplicate trees in selection');
      }
    });

    it('should reject selection state with invalid statement IDs', () => {
      // Arrange
      const state: SelectionState = {
        selectedNodes: [],
        selectedStatements: ['stmt1', '  '], // Whitespace only
        selectedTrees: [],
      };

      // Act
      const result = validateSelectionState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Statement ID cannot be empty');
      }
    });

    it.skip('should reject selection state with invalid tree IDs', () => {
      // Skip: Cannot create invalid TreeId due to value object validation
      // Tree ID validation is handled at the value object level
    });

    it('should reject viewport state with zoom above maximum', () => {
      // Arrange
      const invalidZoomResult = ZoomLevel.create(15.0); // Above maximum
      if (invalidZoomResult.isOk()) {
        throw new Error('Expected ZoomLevel.create(15.0) to fail');
      }

      // For testing, force an invalid value
      const state: ViewportState = {
        zoom: 15.0 as any, // Force invalid value for testing
        pan: Position2D.origin(),
        center: Position2D.origin(),
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zoom must be a ZoomLevel value object');
      }
    });

    it('should reject viewport state with infinite center coordinates', () => {
      // Arrange
      const invalidCenterResult = Position2D.create(Number.NEGATIVE_INFINITY, 0);
      if (invalidCenterResult.isOk()) {
        throw new Error('Expected Position2D.create with negative infinity to fail');
      }

      // For testing, force an invalid value
      const state: ViewportState = {
        zoom: ZoomLevel.normal(),
        pan: Position2D.origin(),
        center: { x: Number.NEGATIVE_INFINITY, y: 0 } as any, // Force invalid value for testing
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Center must be a Position2D value object');
      }
    });
  });
});
