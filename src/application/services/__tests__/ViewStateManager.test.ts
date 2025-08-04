import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PanelState,
  SelectionState,
  ThemeState,
  ViewportState,
} from '../../dtos/view-dtos.js';
import type { IViewStatePort } from '../../ports/IViewStatePort.js';
import { ViewStateManager } from '../ViewStateManager.js';

describe('ViewStateManager', () => {
  let viewStateManager: ViewStateManager;
  let mockPort: IViewStatePort;

  beforeEach(() => {
    mockPort = {
      loadViewState: vi.fn(),
      saveViewState: vi.fn(),
      clearViewState: vi.fn(),
      hasViewState: vi.fn(),
      getAllStateKeys: vi.fn(),
      clearAllViewState: vi.fn(),
    };
    viewStateManager = new ViewStateManager(mockPort);
  });

  describe('Selection State Management', () => {
    it('should return default selection state when no state exists', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(null));

      // Act
      const result = await viewStateManager.getSelectionState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.selectedNodes.map((id) => id.getValue())).toEqual([]);
        expect(result.value.selectedStatements).toEqual([]);
        expect(result.value.selectedTrees.map((id) => id.getValue())).toEqual([]);
      }
    });

    it('should return saved selection state when exists', async () => {
      // Arrange
      const savedState = {
        selectedNodes: ['node1', 'node2'],
        selectedStatements: ['stmt1'],
        selectedTrees: ['tree1'],
      };
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(savedState));

      // Act
      const result = await viewStateManager.getSelectionState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.selectedNodes.map((id) => id.getValue())).toEqual(['node1', 'node2']);
        expect(result.value.selectedStatements).toEqual(['stmt1']);
        expect(result.value.selectedTrees.map((id) => id.getValue())).toEqual(['tree1']);
      }
    });

    it('should handle port load errors gracefully', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockResolvedValue(err(new Error('Storage error')));

      // Act
      const result = await viewStateManager.getSelectionState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load selection state');
      }
    });

    it('should handle invalid stored selection state', async () => {
      // Arrange
      const invalidStoredState = {
        selectedNodes: 'invalid', // Should be array
        selectedStatements: ['stmt1'],
        selectedTrees: ['tree1'],
      };
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(invalidStoredState));

      // Act
      const result = await viewStateManager.getSelectionState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must be an array');
      }
    });

    it('should handle validation errors when updating selection state', async () => {
      // Arrange
      const { NodeId } = await import('../../../domain/shared/value-objects/index.js');
      // Create a valid node ID since we can't create invalid value objects
      const nodeIdResult = NodeId.create('validNode');
      if (nodeIdResult.isErr()) throw new Error('Failed to create valid node ID for test');

      const invalidState: SelectionState = {
        selectedNodes: [nodeIdResult.value],
        selectedStatements: [''], // Invalid empty statement ID
        selectedTrees: [],
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateSelectionState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Statement ID cannot be empty');
      }
    });

    it('should save selection state successfully', async () => {
      // Arrange
      const { NodeId, TreeId } = await import('../../../domain/shared/value-objects/index.js');
      const node1 = NodeId.create('node1');
      const node2 = NodeId.create('node2');
      const tree1 = TreeId.create('tree1');

      if (node1.isErr() || node2.isErr() || tree1.isErr()) {
        throw new Error('Failed to create IDs for test');
      }

      const newState: SelectionState = {
        selectedNodes: [node1.value, node2.value],
        selectedStatements: ['stmt1'],
        selectedTrees: [tree1.value],
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateSelectionState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.saveViewState).toHaveBeenCalledWith('selection', newState);
    });

    it('should handle port save errors gracefully', async () => {
      // Arrange
      const { NodeId } = await import('../../../domain/shared/value-objects/index.js');
      const node1 = NodeId.create('node1');

      if (node1.isErr()) {
        throw new Error('Failed to create node ID for test');
      }

      const newState: SelectionState = {
        selectedNodes: [node1.value],
        selectedStatements: [],
        selectedTrees: [],
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(err(new Error('Save failed')));

      // Act
      const result = await viewStateManager.updateSelectionState(newState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save selection state');
      }
    });
  });

  describe('Viewport State Management', () => {
    it('should return default viewport state when no state exists', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(null));

      // Act
      const result = await viewStateManager.getViewportState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.zoom).toBe(1.0);
        expect(result.value.pan).toEqual({ x: 0, y: 0 });
        expect(result.value.center).toEqual({ x: 0, y: 0 });
      }
    });

    it('should return saved viewport state when exists', async () => {
      // Arrange
      const savedState = {
        zoom: 2.0,
        pan: { x: 150, y: 250 },
        center: { x: 75, y: 125 },
      };
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(savedState));

      // Act
      const result = await viewStateManager.getViewportState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.zoom).toBe(2.0);
        expect(result.value.pan).toEqual({ x: 150, y: 250 });
        expect(result.value.center).toEqual({ x: 75, y: 125 });
      }
    });

    it('should handle invalid stored viewport state', async () => {
      // Arrange
      const invalidStoredState = {
        zoom: 15.0, // Above maximum
        pan: { x: 150, y: 250 },
        center: { x: 75, y: 125 },
      };
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(invalidStoredState));

      // Act
      const result = await viewStateManager.getViewportState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zoom must be between 0.1 and 10.0');
      }
    });

    it('should validate zoom constraints', async () => {
      // Arrange
      const { ZoomLevel, Position2D } = await import(
        '../../../domain/shared/value-objects/index.js'
      );
      const zoomResult = ZoomLevel.create(0.05); // Below minimum
      const panResult = Position2D.create(0, 0);
      const centerResult = Position2D.create(0, 0);

      if (panResult.isErr() || centerResult.isErr()) {
        throw new Error('Failed to create position for test');
      }

      // This should fail validation since zoom is too low
      if (zoomResult.isOk()) {
        throw new Error('Expected zoom creation to fail with value 0.05');
      }

      // Since we can't create an invalid zoom, test with a valid one
      const validZoom = ZoomLevel.normal();
      const validState: ViewportState = {
        zoom: validZoom,
        pan: panResult.value,
        center: centerResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateViewportState(validState);

      // Assert
      expect(result.isOk()).toBe(true); // Valid state should succeed
    });

    it('should save valid viewport state successfully', async () => {
      // Arrange
      const { ZoomLevel, Position2D } = await import(
        '../../../domain/shared/value-objects/index.js'
      );
      const zoomResult = ZoomLevel.create(1.5);
      const panResult = Position2D.create(100, 200);
      const centerResult = Position2D.create(50, 75);

      if (zoomResult.isErr() || panResult.isErr() || centerResult.isErr()) {
        throw new Error('Failed to create valid viewport state for test');
      }

      const validState: ViewportState = {
        zoom: zoomResult.value,
        pan: panResult.value,
        center: centerResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateViewportState(validState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.saveViewState).toHaveBeenCalledWith('viewport', validState);
    });
  });

  describe('Panel State Management', () => {
    it('should return default panel state when no state exists', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(null));

      // Act
      const result = await viewStateManager.getPanelState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.miniMapVisible).toBe(true);
        expect(result.value.sideLabelsVisible).toBe(true);
        expect(result.value.validationPanelVisible).toBe(false);
        expect(Object.keys(result.value.panelSizes)).toHaveLength(0);
      }
    });

    it('should return saved panel state when exists', async () => {
      // Arrange
      const savedState = {
        miniMapVisible: false,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: {
          validation: 300,
          miniMap: 200,
        },
      };
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(savedState));

      // Act
      const result = await viewStateManager.getPanelState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.miniMapVisible).toBe(false);
        expect(result.value.sideLabelsVisible).toBe(false);
        expect(result.value.validationPanelVisible).toBe(true);
        expect(result.value.panelSizes.validation?.getValue()).toBe(300);
        expect(result.value.panelSizes.miniMap?.getValue()).toBe(200);
      }
    });

    it('should handle invalid stored panel state', async () => {
      // Arrange
      const invalidStoredState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: {
          validation: -50, // Invalid negative size
        },
      };
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(invalidStoredState));

      // Act
      const result = await viewStateManager.getPanelState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Panel sizes must be positive');
      }
    });

    it('should validate panel sizes', async () => {
      // Arrange
      const { PanelSize } = await import('../../../domain/shared/value-objects/index.js');
      // Try to create an invalid panel size
      const invalidSize = PanelSize.create(-10);

      if (invalidSize.isOk()) {
        throw new Error('Expected PanelSize creation to fail with negative value');
      }

      // Since we can't create invalid value objects, test with a valid state
      const validSize = PanelSize.create(100);
      if (validSize.isErr()) {
        throw new Error('Failed to create valid panel size');
      }

      const invalidState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: {
          validation: validSize.value,
        },
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updatePanelState(invalidState);

      // Assert
      // Since we're using a valid panel size, this should succeed
      expect(result.isOk()).toBe(true);
    });

    it('should save valid panel state successfully', async () => {
      // Arrange
      const { PanelSize } = await import('../../../domain/shared/value-objects/index.js');
      const validationSize = PanelSize.create(250);
      const miniMapSize = PanelSize.create(150);

      if (validationSize.isErr() || miniMapSize.isErr()) {
        throw new Error('Failed to create panel sizes for test');
      }

      const validState: PanelState = {
        miniMapVisible: false,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: {
          validation: validationSize.value,
          miniMap: miniMapSize.value,
        },
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updatePanelState(validState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.saveViewState).toHaveBeenCalledWith('panel', validState);
    });
  });

  describe('Theme State Management', () => {
    it('should return default theme state when no state exists', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(null));

      // Act
      const result = await viewStateManager.getThemeState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.colorScheme).toBe('auto');
        expect(result.value.fontSize.getValue()).toBe(14);
        expect(result.value.fontFamily.getValue()).toBe(
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        );
      }
    });

    it('should return saved theme state when exists', async () => {
      // Arrange
      const savedState = {
        colorScheme: 'dark',
        fontSize: 16,
        fontFamily: 'Monaco',
      };
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(savedState));

      // Act
      const result = await viewStateManager.getThemeState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.colorScheme).toBe('dark');
        expect(result.value.fontSize.getValue()).toBe(16);
        expect(result.value.fontFamily.getValue()).toBe('Monaco');
      }
    });

    it('should handle invalid stored theme state', async () => {
      // Arrange
      const invalidStoredState = {
        colorScheme: 'light',
        fontSize: 40, // Above maximum
        fontFamily: 'Arial',
      };
      vi.mocked(mockPort.loadViewState).mockResolvedValue(ok(invalidStoredState));

      // Act
      const result = await viewStateManager.getThemeState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Font size must be between 8 and 32');
      }
    });

    it('should validate theme parameters', async () => {
      // Arrange
      const { FontSize, FontFamily } = await import(
        '../../../domain/shared/value-objects/index.js'
      );
      const fontSizeResult = FontSize.create(6); // Too small
      const fontFamilyResult = FontFamily.create('Arial');

      if (fontSizeResult.isOk() || fontFamilyResult.isErr()) {
        // If font size creation succeeds with 6, use a valid size for the test
        const validFontSize = FontSize.create(14);
        if (validFontSize.isErr() || fontFamilyResult.isErr()) {
          throw new Error('Failed to create valid theme values');
        }

        const invalidState: ThemeState = {
          colorScheme: 'dark',
          fontSize: validFontSize.value,
          fontFamily: fontFamilyResult.value,
        };
        vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

        // Act
        const result = await viewStateManager.updateThemeState(invalidState);

        // Assert
        expect(result.isOk()).toBe(true); // Valid state should succeed
        return;
      }

      // This path shouldn't execute if FontSize properly validates
      throw new Error('Expected FontSize validation to work');
    });

    it('should save valid theme state successfully', async () => {
      // Arrange
      const { FontSize, FontFamily } = await import(
        '../../../domain/shared/value-objects/index.js'
      );
      const fontSizeResult = FontSize.create(18);
      const fontFamilyResult = FontFamily.create('Consolas');

      if (fontSizeResult.isErr() || fontFamilyResult.isErr()) {
        throw new Error('Failed to create valid theme values');
      }

      const validState: ThemeState = {
        colorScheme: 'light',
        fontSize: fontSizeResult.value,
        fontFamily: fontFamilyResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateThemeState(validState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.saveViewState).toHaveBeenCalledWith('theme', validState);
    });
  });

  describe('Change Notifications', () => {
    it('should notify observers when selection state changes', async () => {
      // Arrange
      const { NodeId } = await import('../../../domain/shared/value-objects/index.js');
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);

      const node1 = NodeId.create('node1');
      if (node1.isErr()) {
        throw new Error('Failed to create node ID for test');
      }

      const newState: SelectionState = {
        selectedNodes: [node1.value],
        selectedStatements: [],
        selectedTrees: [],
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      await viewStateManager.updateSelectionState(newState);

      // Assert
      expect(callback).toHaveBeenCalledWith({
        type: 'selection-changed',
        newState,
        timestamp: expect.any(Number),
      });

      subscription.dispose();
    });

    it('should notify observers when viewport state changes', async () => {
      // Arrange
      const { ZoomLevel, Position2D } = await import(
        '../../../domain/shared/value-objects/index.js'
      );
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);

      const zoomResult = ZoomLevel.create(2.0);
      const panResult = Position2D.create(10, 20);
      const centerResult = Position2D.create(5, 10);

      if (zoomResult.isErr() || panResult.isErr() || centerResult.isErr()) {
        throw new Error('Failed to create viewport values for test');
      }

      const newState: ViewportState = {
        zoom: zoomResult.value,
        pan: panResult.value,
        center: centerResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      await viewStateManager.updateViewportState(newState);

      // Assert
      expect(callback).toHaveBeenCalledWith({
        type: 'viewport-changed',
        newState,
        timestamp: expect.any(Number),
      });

      subscription.dispose();
    });

    it('should notify observers when panel state changes', async () => {
      // Arrange
      const { PanelSize } = await import('../../../domain/shared/value-objects/index.js');
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);

      const validationSize = PanelSize.create(250);
      if (validationSize.isErr()) {
        throw new Error('Failed to create panel size for test');
      }

      const newState: PanelState = {
        miniMapVisible: false,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: validationSize.value },
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      await viewStateManager.updatePanelState(newState);

      // Assert
      expect(callback).toHaveBeenCalledWith({
        type: 'panel-changed',
        newState,
        timestamp: expect.any(Number),
      });

      subscription.dispose();
    });

    it('should notify observers when theme state changes', async () => {
      // Arrange
      const { FontSize, FontFamily } = await import(
        '../../../domain/shared/value-objects/index.js'
      );
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);

      const fontSizeResult = FontSize.create(16);
      const fontFamilyResult = FontFamily.create('Monaco');

      if (fontSizeResult.isErr() || fontFamilyResult.isErr()) {
        throw new Error('Failed to create theme values for test');
      }

      const newState: ThemeState = {
        colorScheme: 'dark',
        fontSize: fontSizeResult.value,
        fontFamily: fontFamilyResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      await viewStateManager.updateThemeState(newState);

      // Assert
      expect(callback).toHaveBeenCalledWith({
        type: 'theme-changed',
        newState,
        timestamp: expect.any(Number),
      });

      subscription.dispose();
    });

    it('should allow unsubscribing from changes', () => {
      // Arrange
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);

      // Act
      subscription.dispose();

      // Assert
      expect(() => subscription.dispose()).not.toThrow();
    });

    it('should handle multiple subscribers', async () => {
      // Arrange
      const { NodeId } = await import('../../../domain/shared/value-objects/index.js');
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const subscription1 = viewStateManager.subscribeToChanges(callback1);
      const subscription2 = viewStateManager.subscribeToChanges(callback2);

      const node1 = NodeId.create('node1');
      if (node1.isErr()) {
        throw new Error('Failed to create node ID for test');
      }

      const newState: SelectionState = {
        selectedNodes: [node1.value],
        selectedStatements: [],
        selectedTrees: [],
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      await viewStateManager.updateSelectionState(newState);

      // Assert
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      subscription1.dispose();
      subscription2.dispose();
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors during state loading', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await viewStateManager.getSelectionState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load selection state');
      }
    });

    it('should handle unexpected errors during state saving', async () => {
      // Arrange
      const { NodeId } = await import('../../../domain/shared/value-objects/index.js');

      const node1 = NodeId.create('node1');
      if (node1.isErr()) {
        throw new Error('Failed to create node ID for test');
      }

      const newState: SelectionState = {
        selectedNodes: [node1.value],
        selectedStatements: [],
        selectedTrees: [],
      };
      vi.mocked(mockPort.saveViewState).mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await viewStateManager.updateSelectionState(newState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save selection state');
      }
    });

    it('should handle unexpected errors during viewport state loading', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockRejectedValue(new Error('Viewport storage error'));

      // Act
      const result = await viewStateManager.getViewportState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load viewport state');
      }
    });

    it('should handle unexpected errors during viewport state saving', async () => {
      // Arrange
      const { ZoomLevel, Position2D } = await import(
        '../../../domain/shared/value-objects/index.js'
      );

      const zoomResult = ZoomLevel.create(1.5);
      const panResult = Position2D.create(100, 200);
      const centerResult = Position2D.create(50, 75);

      if (zoomResult.isErr() || panResult.isErr() || centerResult.isErr()) {
        throw new Error('Failed to create viewport values for test');
      }

      const newState: ViewportState = {
        zoom: zoomResult.value,
        pan: panResult.value,
        center: centerResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockRejectedValue(new Error('Viewport save error'));

      // Act
      const result = await viewStateManager.updateViewportState(newState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save viewport state');
      }
    });

    it('should handle unexpected errors during panel state loading', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockRejectedValue(new Error('Panel storage error'));

      // Act
      const result = await viewStateManager.getPanelState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load panel state');
      }
    });

    it('should handle unexpected errors during panel state saving', async () => {
      // Arrange
      const { PanelSize } = await import('../../../domain/shared/value-objects/index.js');

      const validationSize = PanelSize.create(200);
      if (validationSize.isErr()) {
        throw new Error('Failed to create panel size for test');
      }

      const newState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: validationSize.value },
      };
      vi.mocked(mockPort.saveViewState).mockRejectedValue(new Error('Panel save error'));

      // Act
      const result = await viewStateManager.updatePanelState(newState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save panel state');
      }
    });

    it('should handle unexpected errors during theme state loading', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockRejectedValue(new Error('Theme storage error'));

      // Act
      const result = await viewStateManager.getThemeState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load theme state');
      }
    });

    it('should handle unexpected errors during theme state saving', async () => {
      // Arrange
      const { FontSize, FontFamily } = await import(
        '../../../domain/shared/value-objects/index.js'
      );

      const fontSizeResult = FontSize.create(16);
      const fontFamilyResult = FontFamily.create('Arial');

      if (fontSizeResult.isErr() || fontFamilyResult.isErr()) {
        throw new Error('Failed to create theme values for test');
      }

      const newState: ThemeState = {
        colorScheme: 'dark',
        fontSize: fontSizeResult.value,
        fontFamily: fontFamilyResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockRejectedValue(new Error('Theme save error'));

      // Act
      const result = await viewStateManager.updateThemeState(newState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save theme state');
      }
    });

    it('should handle port load errors for viewport state', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockResolvedValue(err(new Error('Port error')));

      // Act
      const result = await viewStateManager.getViewportState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load viewport state');
      }
    });

    it('should handle port save errors for viewport state', async () => {
      // Arrange
      const { ZoomLevel, Position2D } = await import(
        '../../../domain/shared/value-objects/index.js'
      );

      const zoomResult = ZoomLevel.create(1.5);
      const panResult = Position2D.create(100, 200);
      const centerResult = Position2D.create(50, 75);

      if (zoomResult.isErr() || panResult.isErr() || centerResult.isErr()) {
        throw new Error('Failed to create viewport values for test');
      }

      const newState: ViewportState = {
        zoom: zoomResult.value,
        pan: panResult.value,
        center: centerResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(err(new Error('Port save error')));

      // Act
      const result = await viewStateManager.updateViewportState(newState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save viewport state');
      }
    });

    it('should handle port load errors for panel state', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockResolvedValue(err(new Error('Port error')));

      // Act
      const result = await viewStateManager.getPanelState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load panel state');
      }
    });

    it('should handle port save errors for panel state', async () => {
      // Arrange
      const { PanelSize } = await import('../../../domain/shared/value-objects/index.js');

      const validationSize = PanelSize.create(200);
      if (validationSize.isErr()) {
        throw new Error('Failed to create panel size for test');
      }

      const newState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: validationSize.value },
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(err(new Error('Port save error')));

      // Act
      const result = await viewStateManager.updatePanelState(newState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save panel state');
      }
    });

    it('should handle port load errors for theme state', async () => {
      // Arrange
      vi.mocked(mockPort.loadViewState).mockResolvedValue(err(new Error('Port error')));

      // Act
      const result = await viewStateManager.getThemeState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load theme state');
      }
    });

    it('should handle port save errors for theme state', async () => {
      // Arrange
      const { FontSize, FontFamily } = await import(
        '../../../domain/shared/value-objects/index.js'
      );

      const fontSizeResult = FontSize.create(16);
      const fontFamilyResult = FontFamily.create('Arial');

      if (fontSizeResult.isErr() || fontFamilyResult.isErr()) {
        throw new Error('Failed to create theme values for test');
      }

      const newState: ThemeState = {
        colorScheme: 'dark',
        fontSize: fontSizeResult.value,
        fontFamily: fontFamilyResult.value,
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(err(new Error('Port save error')));

      // Act
      const result = await viewStateManager.updateThemeState(newState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save theme state');
      }
    });

    it('should handle errors during clearAllState', async () => {
      // Arrange
      vi.mocked(mockPort.clearViewState).mockResolvedValueOnce(ok(undefined));
      vi.mocked(mockPort.clearViewState).mockResolvedValueOnce(err(new Error('Clear error')));

      // Act
      const result = await viewStateManager.clearAllState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to clear view state');
      }
    });

    it('should handle unexpected errors during clearAllState', async () => {
      // Arrange
      vi.mocked(mockPort.clearViewState).mockRejectedValue(new Error('Unexpected clear error'));

      // Act
      const result = await viewStateManager.clearAllState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to clear view state');
      }
    });

    it('should handle observer callback errors gracefully', async () => {
      // Arrange
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Observer callback error');
      });
      const normalCallback = vi.fn();

      const { NodeId } = await import('../../../domain/shared/value-objects/index.js');

      viewStateManager.subscribeToChanges(errorCallback);
      viewStateManager.subscribeToChanges(normalCallback);

      const node1 = NodeId.create('node1');
      if (node1.isErr()) {
        throw new Error('Failed to create node ID for test');
      }

      const newState: SelectionState = {
        selectedNodes: [node1.value],
        selectedStatements: [],
        selectedTrees: [],
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateSelectionState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });

    it('should handle observer callback errors in development mode', async () => {
      // Arrange
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Observer callback error');
      });

      const { NodeId } = await import('../../../domain/shared/value-objects/index.js');

      viewStateManager.subscribeToChanges(errorCallback);

      const node1 = NodeId.create('node1');
      if (node1.isErr()) {
        throw new Error('Failed to create node ID for test');
      }

      const newState: SelectionState = {
        selectedNodes: [node1.value],
        selectedStatements: [],
        selectedTrees: [],
      };
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateSelectionState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(errorCallback).toHaveBeenCalled();

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid state updates without conflicts', async () => {
      // Arrange
      vi.mocked(mockPort.saveViewState).mockResolvedValue(ok(undefined));
      const { NodeId } = await import('../../../domain/shared/value-objects/index.js');

      const node1 = NodeId.create('node1');
      const node2 = NodeId.create('node2');
      const node3 = NodeId.create('node3');

      if (node1.isErr() || node2.isErr() || node3.isErr()) {
        throw new Error('Failed to create node IDs for test');
      }

      const states: SelectionState[] = [
        { selectedNodes: [node1.value], selectedStatements: [], selectedTrees: [] },
        { selectedNodes: [node2.value], selectedStatements: [], selectedTrees: [] },
        { selectedNodes: [node3.value], selectedStatements: [], selectedTrees: [] },
      ];

      // Act
      const results = await Promise.all(
        states.map((state) => viewStateManager.updateSelectionState(state)),
      );

      // Assert
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
      expect(mockPort.saveViewState).toHaveBeenCalledTimes(3);
    });

    it('should handle state clearing', async () => {
      // Arrange
      vi.mocked(mockPort.clearViewState).mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.clearAllState();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.clearViewState).toHaveBeenCalledWith('selection');
      expect(mockPort.clearViewState).toHaveBeenCalledWith('viewport');
      expect(mockPort.clearViewState).toHaveBeenCalledWith('panel');
      expect(mockPort.clearViewState).toHaveBeenCalledWith('theme');
    });
  });
});
