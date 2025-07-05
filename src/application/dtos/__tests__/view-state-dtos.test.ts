import { describe, expect, it } from 'vitest';
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

describe('View State DTOs', () => {
  describe('SelectionState', () => {
    it('should create valid selection state with factory function', () => {
      // Act
      const state = createSelectionState(['node1', 'node2'], ['stmt1'], ['tree1']);

      // Assert
      expect(state.selectedNodes).toEqual(['node1', 'node2']);
      expect(state.selectedStatements).toEqual(['stmt1']);
      expect(state.selectedTrees).toEqual(['tree1']);
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
      const state: SelectionState = {
        selectedNodes: ['node1', 'node2'],
        selectedStatements: ['stmt1'],
        selectedTrees: ['tree1'],
      };

      // Act
      const result = validateSelectionState(state);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should reject selection state with duplicate nodes', () => {
      // Arrange
      const state: SelectionState = {
        selectedNodes: ['node1', 'node1'], // Duplicate
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

    it('should reject selection state with invalid node IDs', () => {
      // Arrange
      const state: SelectionState = {
        selectedNodes: ['', 'node1'], // Empty ID
        selectedStatements: [],
        selectedTrees: [],
      };

      // Act
      const result = validateSelectionState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Node ID cannot be empty');
      }
    });

    it('should identify valid selection state objects', () => {
      // Arrange
      const validState = {
        selectedNodes: ['node1'],
        selectedStatements: ['stmt1'],
        selectedTrees: ['tree1'],
      };
      const invalidState = {
        selectedNodes: ['node1'],
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
      const state = createViewportState(1.5, { x: 100, y: 200 }, { x: 50, y: 75 });

      // Assert
      expect(state.zoom).toBe(1.5);
      expect(state.pan).toEqual({ x: 100, y: 200 });
      expect(state.center).toEqual({ x: 50, y: 75 });
    });

    it('should create default viewport state', () => {
      // Act
      const state = createViewportState();

      // Assert
      expect(state.zoom).toBe(1.0);
      expect(state.pan).toEqual({ x: 0, y: 0 });
      expect(state.center).toEqual({ x: 0, y: 0 });
    });

    it('should validate valid viewport state', () => {
      // Arrange
      const state: ViewportState = {
        zoom: 1.5,
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should reject viewport state with invalid zoom', () => {
      // Arrange
      const state: ViewportState = {
        zoom: 0.05, // Below minimum
        pan: { x: 0, y: 0 },
        center: { x: 0, y: 0 },
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zoom must be between 0.1 and 10.0');
      }
    });

    it('should reject viewport state with invalid pan coordinates', () => {
      // Arrange
      const state: ViewportState = {
        zoom: 1.0,
        pan: { x: Number.POSITIVE_INFINITY, y: 0 },
        center: { x: 0, y: 0 },
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Pan coordinates must be finite');
      }
    });

    it('should identify valid viewport state objects', () => {
      // Arrange
      const validState = {
        zoom: 1.5,
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
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
      const state = createPanelState(true, false, true, { validation: 200, miniMap: 150 });

      // Assert
      expect(state.miniMapVisible).toBe(true);
      expect(state.sideLabelsVisible).toBe(false);
      expect(state.validationPanelVisible).toBe(true);
      expect(state.panelSizes).toEqual({ validation: 200, miniMap: 150 });
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
        panelSizes: { validation: 200 },
      };

      // Act
      const result = validatePanelState(state);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should reject panel state with negative panel sizes', () => {
      // Arrange
      const state: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: -10 },
      };

      // Act
      const result = validatePanelState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Panel sizes must be positive');
      }
    });

    it('should reject panel state with invalid panel size values', () => {
      // Arrange
      const state: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: Number.NaN },
      };

      // Act
      const result = validatePanelState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Panel sizes must be finite numbers');
      }
    });

    it('should identify valid panel state objects', () => {
      // Arrange
      const validState = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: { validation: 200, miniMap: 150 },
      };
      const invalidStateNonBoolean = {
        miniMapVisible: 'true',
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: { validation: 200 },
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
        panelSizes: { validation: 'invalid' },
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
      const state = createThemeState('dark', 16, 'monospace');

      // Assert
      expect(state.colorScheme).toBe('dark');
      expect(state.fontSize).toBe(16);
      expect(state.fontFamily).toBe('monospace');
    });

    it('should create default theme state', () => {
      // Act
      const state = createThemeState();

      // Assert
      expect(state.colorScheme).toBe('auto');
      expect(state.fontSize).toBe(14);
      expect(state.fontFamily).toBe('default');
    });

    it('should validate valid theme state', () => {
      // Arrange
      const state: ThemeState = {
        colorScheme: 'light',
        fontSize: 12,
        fontFamily: 'Arial',
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
        fontSize: 14,
        fontFamily: 'default',
      };

      // Act
      const result = validateThemeState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid color scheme');
      }
    });

    it('should reject theme state with invalid font size', () => {
      // Arrange
      const state: ThemeState = {
        colorScheme: 'dark',
        fontSize: 4, // Too small
        fontFamily: 'default',
      };

      // Act
      const result = validateThemeState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Font size must be between 8 and 32');
      }
    });

    it('should reject theme state with font size too large', () => {
      // Arrange
      const state: ThemeState = {
        colorScheme: 'light',
        fontSize: 50, // Too large
        fontFamily: 'default',
      };

      // Act
      const result = validateThemeState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Font size must be between 8 and 32');
      }
    });

    it('should reject theme state with empty font family', () => {
      // Arrange
      const state: ThemeState = {
        colorScheme: 'auto',
        fontSize: 14,
        fontFamily: ' ', // Whitespace only
      };

      // Act
      const result = validateThemeState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Font family cannot be empty');
      }
    });

    it('should identify valid theme state objects', () => {
      // Arrange
      const validState = {
        colorScheme: 'light',
        fontSize: 16,
        fontFamily: 'Arial',
      };
      const invalidStateColorScheme = {
        colorScheme: 'invalid',
        fontSize: 16,
        fontFamily: 'Arial',
      };
      const invalidStateNonString = {
        colorScheme: 123,
        fontSize: 16,
        fontFamily: 'Arial',
      };
      const invalidStateNonNumber = {
        colorScheme: 'dark',
        fontSize: 'invalid',
        fontFamily: 'Arial',
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
        newState: createSelectionState(['node1'], [], []),
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
      const originalNodes = ['node1', 'node2'];
      const state = createSelectionState(originalNodes, [], []);

      // Act
      originalNodes.push('node3');

      // Assert
      expect(state.selectedNodes).toEqual(['node1', 'node2']);
      expect(state.selectedNodes).not.toBe(originalNodes);
    });

    it('should create immutable viewport state objects', () => {
      // Arrange
      const originalPan = { x: 100, y: 200 };
      const state = createViewportState(1.0, originalPan, { x: 0, y: 0 });

      // Act
      originalPan.x = 500;

      // Assert
      expect(state.pan.x).toBe(100);
      expect(state.pan).not.toBe(originalPan);
    });

    it('should create immutable panel state objects', () => {
      // Arrange
      const originalSizes = { validation: 200 };
      const state = createPanelState(true, true, false, originalSizes);

      // Act
      originalSizes.validation = 500;

      // Assert
      expect(state.panelSizes.validation).toBe(200);
      expect(state.panelSizes).not.toBe(originalSizes);
    });
  });

  describe('Equality', () => {
    it('should implement structural equality for selection state', () => {
      // Arrange
      const state1 = createSelectionState(['node1'], ['stmt1'], ['tree1']);
      const state2 = createSelectionState(['node1'], ['stmt1'], ['tree1']);
      const state3 = createSelectionState(['node2'], ['stmt1'], ['tree1']);

      // Act & Assert
      expect(state1).toEqual(state2);
      expect(state1).not.toEqual(state3);
    });

    it('should implement structural equality for viewport state', () => {
      // Arrange
      const state1 = createViewportState(1.5, { x: 100, y: 200 }, { x: 50, y: 75 });
      const state2 = createViewportState(1.5, { x: 100, y: 200 }, { x: 50, y: 75 });
      const state3 = createViewportState(2.0, { x: 100, y: 200 }, { x: 50, y: 75 });

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
        dimensions: { width: 800, height: 600 },
      };

      // Act
      const treeRender = createTreeRenderDTO('tree1', { x: 100, y: 200 }, layout, {
        width: 800,
        height: 600,
      });

      // Assert
      expect(treeRender.id).toBe('tree1');
      expect(treeRender.position).toEqual({ x: 100, y: 200 });
      expect(treeRender.layout).toBe(layout);
      expect(treeRender.bounds).toEqual({ width: 800, height: 600 });
    });

    it('should create TreeLayoutDTO with factory function', () => {
      // Arrange
      const nodes: RenderedNodeDTO[] = [];
      const connections: ConnectionDTO[] = [];
      const dimensions = { width: 800, height: 600 };

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
        id: 'arg1',
        premiseSetId: 'premise-set-1',
        conclusionSetId: 'conclusion-set-1',
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
        'node1',
        { x: 50, y: 100 },
        { width: 200, height: 100 },
        mockArgument,
        mockPremises,
        mockConclusions,
        'side-label',
      );

      // Assert
      expect(node.id).toBe('node1');
      expect(node.position).toEqual({ x: 50, y: 100 });
      expect(node.dimensions).toEqual({ width: 200, height: 100 });
      expect(node.argument).toBe(mockArgument);
      expect(node.premises).toBe(mockPremises);
      expect(node.conclusions).toBe(mockConclusions);
      expect(node.sideLabel).toBe('side-label');
    });

    it('should create RenderedNodeDTO without side label', () => {
      // Arrange
      const mockArgument: AtomicArgumentDTO = {
        id: 'arg1',
        premiseSetId: null,
        conclusionSetId: null,
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
        'node1',
        { x: 50, y: 100 },
        { width: 200, height: 100 },
        mockArgument,
        mockPremises,
        mockConclusions,
      );

      // Assert
      expect(node.sideLabel).toBeUndefined();
      expect(node.id).toBe('node1');
    });

    it('should create ConnectionDTO with factory function', () => {
      // Act
      const connection = createConnectionDTO('node1', 'node2', 0, 1, {
        startX: 100,
        startY: 200,
        endX: 300,
        endY: 400,
      });

      // Assert
      expect(connection.fromNodeId).toBe('node1');
      expect(connection.toNodeId).toBe('node2');
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
      const totalDimensions = { width: 1200, height: 800 };

      // Act
      const visualization = createProofVisualizationDTO('doc1', 1, trees, totalDimensions, true);

      // Assert
      expect(visualization.documentId).toBe('doc1');
      expect(visualization.version).toBe(1);
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
          dimensions: { width: 800, height: 600 },
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
        dimensions: { width: 800, height: 600 },
      };
      const invalidDTO = {
        nodes: 'not-an-array',
        connections: [],
        dimensions: { width: 800, height: 600 },
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
          premiseSetId: 'premise-set-1',
          conclusionSetId: 'conclusion-set-1',
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
          premiseSetId: 'premise-set-1',
          conclusionSetId: 'conclusion-set-1',
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
      const state: SelectionState = {
        selectedNodes: [],
        selectedStatements: [],
        selectedTrees: ['tree1', 'tree1'], // Duplicate
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

    it('should reject selection state with invalid tree IDs', () => {
      // Arrange
      const state: SelectionState = {
        selectedNodes: [],
        selectedStatements: [],
        selectedTrees: ['tree1', ''], // Empty ID
      };

      // Act
      const result = validateSelectionState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Tree ID cannot be empty');
      }
    });

    it('should reject viewport state with zoom above maximum', () => {
      // Arrange
      const state: ViewportState = {
        zoom: 15.0, // Above maximum
        pan: { x: 0, y: 0 },
        center: { x: 0, y: 0 },
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zoom must be between 0.1 and 10.0');
      }
    });

    it('should reject viewport state with infinite center coordinates', () => {
      // Arrange
      const state: ViewportState = {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        center: { x: Number.NEGATIVE_INFINITY, y: 0 },
      };

      // Act
      const result = validateViewportState(state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Center coordinates must be finite');
      }
    });
  });
});
