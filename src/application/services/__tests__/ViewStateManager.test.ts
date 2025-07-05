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
  let mockPort: ReturnType<typeof vi.mocked<IViewStatePort>>;

  beforeEach(() => {
    mockPort = vi.mocked<IViewStatePort>({
      loadViewState: vi.fn(),
      saveViewState: vi.fn(),
      clearViewState: vi.fn(),
      hasViewState: vi.fn(),
      getAllStateKeys: vi.fn(),
      clearAllViewState: vi.fn(),
    } as IViewStatePort);
    viewStateManager = new ViewStateManager(mockPort);
  });

  describe('Selection State Management', () => {
    it('should return default selection state when no state exists', async () => {
      // Arrange
      mockPort.loadViewState.mockResolvedValue(ok(null));

      // Act
      const result = await viewStateManager.getSelectionState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.selectedNodes).toEqual([]);
        expect(result.value.selectedStatements).toEqual([]);
        expect(result.value.selectedTrees).toEqual([]);
      }
    });

    it('should return saved selection state when exists', async () => {
      // Arrange
      const savedState = {
        selectedNodes: ['node1', 'node2'],
        selectedStatements: ['stmt1'],
        selectedTrees: ['tree1'],
      };
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await viewStateManager.getSelectionState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.selectedNodes).toEqual(['node1', 'node2']);
        expect(result.value.selectedStatements).toEqual(['stmt1']);
        expect(result.value.selectedTrees).toEqual(['tree1']);
      }
    });

    it('should handle port load errors gracefully', async () => {
      // Arrange
      mockPort.loadViewState.mockResolvedValue(err(new Error('Storage error')));

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
      mockPort.loadViewState.mockResolvedValue(ok(invalidStoredState));

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
      const invalidState: SelectionState = {
        selectedNodes: [''], // Invalid empty node ID
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateSelectionState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should save selection state successfully', async () => {
      // Arrange
      const newState: SelectionState = {
        selectedNodes: ['node1', 'node2'],
        selectedStatements: ['stmt1'],
        selectedTrees: ['tree1'],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateSelectionState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.saveViewState).toHaveBeenCalledWith('selection', newState);
    });

    it('should handle port save errors gracefully', async () => {
      // Arrange
      const newState: SelectionState = {
        selectedNodes: ['node1'],
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(err(new Error('Save failed')));

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
      mockPort.loadViewState.mockResolvedValue(ok(null));

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
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

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
      mockPort.loadViewState.mockResolvedValue(ok(invalidStoredState));

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
      const invalidState: ViewportState = {
        zoom: 0.05, // Below minimum
        pan: { x: 0, y: 0 },
        center: { x: 0, y: 0 },
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateViewportState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zoom must be between 0.1 and 10.0');
      }
    });

    it('should save valid viewport state successfully', async () => {
      // Arrange
      const validState: ViewportState = {
        zoom: 1.5,
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      mockPort.loadViewState.mockResolvedValue(ok(null));

      // Act
      const result = await viewStateManager.getPanelState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.miniMapVisible).toBe(true);
        expect(result.value.sideLabelsVisible).toBe(true);
        expect(result.value.validationPanelVisible).toBe(false);
        expect(result.value.panelSizes).toEqual({});
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
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await viewStateManager.getPanelState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.miniMapVisible).toBe(false);
        expect(result.value.sideLabelsVisible).toBe(false);
        expect(result.value.validationPanelVisible).toBe(true);
        expect(result.value.panelSizes).toEqual({
          validation: 300,
          miniMap: 200,
        });
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
      mockPort.loadViewState.mockResolvedValue(ok(invalidStoredState));

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
      const invalidState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: {
          validation: -10, // Invalid negative size
        },
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updatePanelState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Panel sizes must be positive');
      }
    });

    it('should save valid panel state successfully', async () => {
      // Arrange
      const validState: PanelState = {
        miniMapVisible: false,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: {
          validation: 250,
          miniMap: 150,
        },
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      mockPort.loadViewState.mockResolvedValue(ok(null));

      // Act
      const result = await viewStateManager.getThemeState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.colorScheme).toBe('auto');
        expect(result.value.fontSize).toBe(14);
        expect(result.value.fontFamily).toBe('default');
      }
    });

    it('should return saved theme state when exists', async () => {
      // Arrange
      const savedState = {
        colorScheme: 'dark',
        fontSize: 16,
        fontFamily: 'Monaco',
      };
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await viewStateManager.getThemeState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.colorScheme).toBe('dark');
        expect(result.value.fontSize).toBe(16);
        expect(result.value.fontFamily).toBe('Monaco');
      }
    });

    it('should handle invalid stored theme state', async () => {
      // Arrange
      const invalidStoredState = {
        colorScheme: 'light',
        fontSize: 40, // Above maximum
        fontFamily: 'Arial',
      };
      mockPort.loadViewState.mockResolvedValue(ok(invalidStoredState));

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
      const invalidState: ThemeState = {
        colorScheme: 'dark',
        fontSize: 6, // Too small
        fontFamily: 'Arial',
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await viewStateManager.updateThemeState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Font size must be between 8 and 32');
      }
    });

    it('should save valid theme state successfully', async () => {
      // Arrange
      const validState: ThemeState = {
        colorScheme: 'light',
        fontSize: 18,
        fontFamily: 'Consolas',
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);
      const newState: SelectionState = {
        selectedNodes: ['node1'],
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);
      const newState: ViewportState = {
        zoom: 2.0,
        pan: { x: 10, y: 20 },
        center: { x: 5, y: 10 },
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);
      const newState: PanelState = {
        miniMapVisible: false,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: 250 },
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      const callback = vi.fn();
      const subscription = viewStateManager.subscribeToChanges(callback);
      const newState: ThemeState = {
        colorScheme: 'dark',
        fontSize: 16,
        fontFamily: 'Monaco',
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const subscription1 = viewStateManager.subscribeToChanges(callback1);
      const subscription2 = viewStateManager.subscribeToChanges(callback2);
      const newState: SelectionState = {
        selectedNodes: ['node1'],
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      mockPort.loadViewState.mockRejectedValue(new Error('Unexpected error'));

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
      const newState: SelectionState = {
        selectedNodes: ['node1'],
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockRejectedValue(new Error('Unexpected error'));

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
      mockPort.loadViewState.mockRejectedValue(new Error('Viewport storage error'));

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
      const newState: ViewportState = {
        zoom: 1.5,
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      };
      mockPort.saveViewState.mockRejectedValue(new Error('Viewport save error'));

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
      mockPort.loadViewState.mockRejectedValue(new Error('Panel storage error'));

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
      const newState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: 200 },
      };
      mockPort.saveViewState.mockRejectedValue(new Error('Panel save error'));

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
      mockPort.loadViewState.mockRejectedValue(new Error('Theme storage error'));

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
      const newState: ThemeState = {
        colorScheme: 'dark',
        fontSize: 16,
        fontFamily: 'Arial',
      };
      mockPort.saveViewState.mockRejectedValue(new Error('Theme save error'));

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
      mockPort.loadViewState.mockResolvedValue(err(new Error('Port error')));

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
      const newState: ViewportState = {
        zoom: 1.5,
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      };
      mockPort.saveViewState.mockResolvedValue(err(new Error('Port save error')));

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
      mockPort.loadViewState.mockResolvedValue(err(new Error('Port error')));

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
      const newState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: 200 },
      };
      mockPort.saveViewState.mockResolvedValue(err(new Error('Port save error')));

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
      mockPort.loadViewState.mockResolvedValue(err(new Error('Port error')));

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
      const newState: ThemeState = {
        colorScheme: 'dark',
        fontSize: 16,
        fontFamily: 'Arial',
      };
      mockPort.saveViewState.mockResolvedValue(err(new Error('Port save error')));

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
      mockPort.clearViewState.mockResolvedValueOnce(ok(undefined));
      mockPort.clearViewState.mockResolvedValueOnce(err(new Error('Clear error')));

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
      mockPort.clearViewState.mockRejectedValue(new Error('Unexpected clear error'));

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

      viewStateManager.subscribeToChanges(errorCallback);
      viewStateManager.subscribeToChanges(normalCallback);

      const newState: SelectionState = {
        selectedNodes: ['node1'],
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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

      viewStateManager.subscribeToChanges(errorCallback);

      const newState: SelectionState = {
        selectedNodes: ['node1'],
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

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
      mockPort.saveViewState.mockResolvedValue(ok(undefined));
      const states: SelectionState[] = [
        { selectedNodes: ['node1'], selectedStatements: [], selectedTrees: [] },
        { selectedNodes: ['node2'], selectedStatements: [], selectedTrees: [] },
        { selectedNodes: ['node3'], selectedStatements: [], selectedTrees: [] },
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
      mockPort.clearViewState.mockResolvedValue(ok(undefined));

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
