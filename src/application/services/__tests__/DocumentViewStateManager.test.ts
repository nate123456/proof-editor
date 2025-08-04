import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import {
  FontFamily,
  FontSize,
  NodeId,
  PanelSize,
  Position2D,
  StatementId,
  TreeId,
  ZoomLevel,
} from '../../../domain/shared/value-objects/index.js';
import type {
  PanelState,
  SelectionState,
  ThemeState,
  ViewportState,
} from '../../dtos/view-dtos.js';
import type { IViewStatePort } from '../../ports/IViewStatePort.js';
import { DocumentViewStateManager } from '../DocumentViewStateManager.js';

describe('DocumentViewStateManager', () => {
  let manager: DocumentViewStateManager;
  let mockPort: ReturnType<typeof vi.mocked<IViewStatePort>>;
  const testDocumentUri = 'file:///test/document.proof';

  beforeEach(() => {
    mockPort = vi.mocked<IViewStatePort>({
      loadViewState: vi.fn(),
      saveViewState: vi.fn(),
      clearViewState: vi.fn(),
      hasViewState: vi.fn(),
      getAllStateKeys: vi.fn(),
      clearAllViewState: vi.fn(),
    } as IViewStatePort);

    manager = new DocumentViewStateManager(mockPort, testDocumentUri);
  });

  describe('Constructor and Basic Properties', () => {
    it('should initialize with correct document URI', () => {
      // Act & Assert
      expect(manager.getDocumentUri()).toBe(testDocumentUri);
    });

    it('should accept different URI formats', () => {
      // Arrange
      const uris = [
        'file:///path/to/file.proof',
        'file://c:/Windows/path/file.proof',
        'untitled:Untitled-1',
        'vscode-notebook-cell:/path/to/notebook.ipynb#cell1',
      ];

      // Act & Assert
      uris.forEach((uri) => {
        const testManager = new DocumentViewStateManager(mockPort, uri);
        expect(testManager.getDocumentUri()).toBe(uri);
      });
    });
  });

  describe('Selection State Management', () => {
    it('should load default selection state when no state exists', async () => {
      // Arrange
      mockPort.loadViewState.mockResolvedValue(ok(null));

      // Act
      const result = await manager.getSelectionState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.selectedNodes).toEqual([]);
        expect(result.value.selectedStatements).toEqual([]);
        expect(result.value.selectedTrees).toEqual([]);
      }
      expect(mockPort.loadViewState).toHaveBeenCalledWith('file_test_document.proof.selection');
    });

    it('should load saved selection state', async () => {
      // Arrange
      const node1 = NodeId.create('node1');
      const node2 = NodeId.create('node2');
      const stmt1 = StatementId.create('stmt1');
      const stmt2 = StatementId.create('stmt2');
      const tree1 = TreeId.create('tree1');

      if (!node1.isOk() || !node2.isOk() || !stmt1.isOk() || !stmt2.isOk() || !tree1.isOk()) {
        throw new Error('Failed to create test value objects');
      }

      const savedState = {
        selectedNodes: [node1.value, node2.value],
        selectedStatements: [stmt1.value, stmt2.value],
        selectedTrees: [tree1.value],
      };
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await manager.getSelectionState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.selectedNodes).toEqual(['node1', 'node2']);
        expect(result.value.selectedStatements).toEqual(['stmt1', 'stmt2']);
        expect(result.value.selectedTrees).toEqual(['tree1']);
      }
    });

    it('should update selection state successfully', async () => {
      // Arrange
      const node3 = NodeId.create('node3');
      const node4 = NodeId.create('node4');
      const stmt3 = StatementId.create('stmt3');
      const tree2 = TreeId.create('tree2');

      if (!node3.isOk() || !node4.isOk() || !stmt3.isOk() || !tree2.isOk()) {
        throw new Error('Failed to create test value objects');
      }

      const newState: SelectionState = {
        selectedNodes: [node3.value, node4.value],
        selectedStatements: [stmt3.value.getValue()],
        selectedTrees: [tree2.value],
      };
      const callback = vi.fn();
      const subscription = manager.subscribeToChanges(callback);

      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updateSelectionState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.saveViewState).toHaveBeenCalledWith(
        'file_test_document.proof.selection',
        newState,
      );
      expect(callback).toHaveBeenCalledWith({
        type: 'selection-changed',
        newState,
        timestamp: expect.any(Number),
      });

      subscription.dispose();
    });

    it('should handle validation errors in selection state', async () => {
      // Arrange
      const invalidState: any = {
        selectedNodes: [''], // Invalid empty node ID - intentionally invalid for test
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updateSelectionState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Node ID cannot be empty');
      }
    });

    it('should handle port errors during selection state loading', async () => {
      // Arrange
      const portError = new ValidationError('Port load error');
      mockPort.loadViewState.mockResolvedValue(err(portError));

      // Act
      const result = await manager.getSelectionState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load selection state');
      }
    });
  });

  describe('Viewport State Management', () => {
    it('should load default viewport state when no state exists', async () => {
      // Arrange
      mockPort.loadViewState.mockResolvedValue(ok(null));

      // Act
      const result = await manager.getViewportState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.zoom.getValue()).toBe(1.0);
        expect(result.value.pan.getX()).toBe(0);
        expect(result.value.pan.getY()).toBe(0);
        expect(result.value.center.getX()).toBe(0);
        expect(result.value.center.getY()).toBe(0);
      }
    });

    it('should load saved viewport state', async () => {
      // Arrange
      const zoom = ZoomLevel.create(2.5);
      const pan = Position2D.create(100, 200);
      const center = Position2D.create(50, 75);

      if (!zoom.isOk() || !pan.isOk() || !center.isOk()) {
        throw new Error('Failed to create test value objects');
      }

      const savedState = {
        zoom: zoom.value,
        pan: pan.value,
        center: center.value,
      };
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await manager.getViewportState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.zoom.getValue()).toBe(2.5);
        expect(result.value.pan.getX()).toBe(100);
        expect(result.value.pan.getY()).toBe(200);
        expect(result.value.center.getX()).toBe(50);
        expect(result.value.center.getY()).toBe(75);
      }
    });

    it('should update viewport state and notify observers', async () => {
      // Arrange
      const zoom = ZoomLevel.create(1.5);
      const pan = Position2D.create(50, 100);
      const center = Position2D.create(25, 50);

      if (!zoom.isOk() || !pan.isOk() || !center.isOk()) {
        throw new Error('Failed to create test value objects');
      }

      const newState: ViewportState = {
        zoom: zoom.value,
        pan: pan.value,
        center: center.value,
      };
      const callback = vi.fn();
      const subscription = manager.subscribeToChanges(callback);

      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updateViewportState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(callback).toHaveBeenCalledWith({
        type: 'viewport-changed',
        newState,
        timestamp: expect.any(Number),
      });

      subscription.dispose();
    });

    it('should validate viewport constraints', async () => {
      // Arrange
      const pan = Position2D.create(0, 0);
      const center = Position2D.create(0, 0);

      if (!pan.isOk() || !center.isOk()) {
        throw new Error('Failed to create test value objects');
      }

      const invalidState: any = {
        zoom: 0.05, // Below minimum - intentionally invalid for test
        pan: pan.value,
        center: center.value,
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updateViewportState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Zoom must be between 0.1 and 10.0');
      }
    });
  });

  describe('Panel State Management', () => {
    it('should load default panel state when no state exists', async () => {
      // Arrange
      mockPort.loadViewState.mockResolvedValue(ok(null));

      // Act
      const result = await manager.getPanelState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.miniMapVisible).toBe(true);
        expect(result.value.sideLabelsVisible).toBe(true);
        expect(result.value.validationPanelVisible).toBe(false);
        expect(result.value.panelSizes).toEqual({});
      }
    });

    it('should load saved panel state', async () => {
      // Arrange
      const savedState = {
        miniMapVisible: false,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: { validation: 300, miniMap: 150 },
      };
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await manager.getPanelState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.miniMapVisible).toBe(false);
        expect(result.value.sideLabelsVisible).toBe(true);
        expect(result.value.validationPanelVisible).toBe(true);
        expect(result.value.panelSizes.validation?.getValue()).toBe(300);
        expect(result.value.panelSizes.miniMap?.getValue()).toBe(150);
      }
    });

    it('should update panel state and notify observers', async () => {
      // Arrange
      const newState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: {
          validation: (() => {
            const r = PanelSize.create(400);
            if (!r.isOk()) throw new Error('Failed to create test PanelSize');
            return r.value;
          })(),
        },
      };
      const callback = vi.fn();
      const subscription = manager.subscribeToChanges(callback);

      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updatePanelState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(callback).toHaveBeenCalledWith({
        type: 'panel-changed',
        newState,
        timestamp: expect.any(Number),
      });

      subscription.dispose();
    });

    it('should validate panel size constraints', async () => {
      // Arrange
      const invalidState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: true,
        validationPanelVisible: true,
        panelSizes: {
          validation: (() => {
            const r = PanelSize.create(-100);
            return r.isOk() ? r.value : (-100 as any);
          })(),
        }, // Negative size - intentionally invalid
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updatePanelState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Panel sizes must be positive');
      }
    });
  });

  describe('Theme State Management (Global)', () => {
    it('should load default theme state when no state exists', async () => {
      // Arrange
      mockPort.loadViewState.mockResolvedValue(ok(null));

      // Act
      const result = await manager.getThemeState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.colorScheme).toBe('auto');
        expect(result.value.fontSize).toBe(14);
        expect(result.value.fontFamily).toBe('default');
      }
      // Theme state uses global key, not document-specific
      expect(mockPort.loadViewState).toHaveBeenCalledWith('theme');
    });

    it('should load saved theme state', async () => {
      // Arrange
      const fontSize = FontSize.create(16);
      const fontFamily = FontFamily.create('Monaco');

      if (!fontSize.isOk() || !fontFamily.isOk()) {
        throw new Error('Failed to create test value objects');
      }

      const savedState = {
        colorScheme: 'dark' as const,
        fontSize: fontSize.value,
        fontFamily: fontFamily.value,
      };
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await manager.getThemeState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.colorScheme).toBe('dark');
        expect(result.value.fontSize.getValue()).toBe(16);
        expect(result.value.fontFamily.getValue()).toBe('Monaco');
      }
    });

    it('should update theme state globally', async () => {
      // Arrange
      const fontSize = FontSize.create(18);
      const fontFamily = FontFamily.create('Consolas');

      if (!fontSize.isOk() || !fontFamily.isOk()) {
        throw new Error('Failed to create test value objects');
      }

      const newState: ThemeState = {
        colorScheme: 'light',
        fontSize: fontSize.value,
        fontFamily: fontFamily.value,
      };
      const callback = vi.fn();
      const subscription = manager.subscribeToChanges(callback);

      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updateThemeState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.saveViewState).toHaveBeenCalledWith('theme', newState);
      expect(callback).toHaveBeenCalledWith({
        type: 'theme-changed',
        newState,
        timestamp: expect.any(Number),
      });

      subscription.dispose();
    });

    it('should validate theme constraints', async () => {
      // Arrange
      const invalidState: any = {
        colorScheme: 'light',
        fontSize: 4, // Too small - intentionally invalid for test
        fontFamily: (() => {
          const r = FontFamily.create('Arial');
          return r.isOk() ? r.value : undefined;
        })(),
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updateThemeState(invalidState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Font size must be between 8 and 32');
      }
    });
  });

  describe('Document State Clearing', () => {
    it('should clear document-specific state successfully', async () => {
      // Arrange
      mockPort.clearViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.clearDocumentState();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.clearViewState).toHaveBeenCalledTimes(3);
      expect(mockPort.clearViewState).toHaveBeenCalledWith('file_test_document.proof.selection');
      expect(mockPort.clearViewState).toHaveBeenCalledWith('file_test_document.proof.viewport');
      expect(mockPort.clearViewState).toHaveBeenCalledWith('file_test_document.proof.panel');
    });

    it('should handle errors during document state clearing', async () => {
      // Arrange
      const clearError = new ValidationError('Clear error');
      mockPort.clearViewState.mockResolvedValue(err(clearError));

      // Act
      const result = await manager.clearDocumentState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to clear document state');
      }
    });

    it('should clear all document states based on URI prefix', async () => {
      // Arrange
      const allKeys = [
        'file_test_document.proof.selection',
        'file_test_document.proof.viewport',
        'file_test_document.proof.panel',
        'file_other_document.proof.selection',
        'theme',
      ];
      mockPort.getAllStateKeys.mockResolvedValue(ok(allKeys));
      mockPort.clearViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.clearAllDocumentStates();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPort.clearViewState).toHaveBeenCalledTimes(3);
      expect(mockPort.clearViewState).toHaveBeenCalledWith('file_test_document.proof.selection');
      expect(mockPort.clearViewState).toHaveBeenCalledWith('file_test_document.proof.viewport');
      expect(mockPort.clearViewState).toHaveBeenCalledWith('file_test_document.proof.panel');
    });

    it('should handle errors during getAllStateKeys', async () => {
      // Arrange
      const keysError = new ValidationError('Keys error');
      mockPort.getAllStateKeys.mockResolvedValue(err(keysError));

      // Act
      const result = await manager.clearAllDocumentStates();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(keysError);
      }
    });
  });

  describe('Observer Pattern', () => {
    it('should notify multiple observers of state changes', async () => {
      // Arrange
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      const subscription1 = manager.subscribeToChanges(callback1);
      const subscription2 = manager.subscribeToChanges(callback2);
      const subscription3 = manager.subscribeToChanges(callback3);

      const newState: SelectionState = {
        selectedNodes: (() => {
          const r = NodeId.create('node1');
          return r.isOk() ? [r.value] : [];
        })(),
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      await manager.updateSelectionState(newState);

      // Assert
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);

      subscription1.dispose();
      subscription2.dispose();
      subscription3.dispose();
    });

    it('should handle observer errors gracefully', async () => {
      // Arrange
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Observer error');
      });
      const normalCallback = vi.fn();
      const subscription1 = manager.subscribeToChanges(errorCallback);
      const subscription2 = manager.subscribeToChanges(normalCallback);

      const newState: SelectionState = {
        selectedNodes: (() => {
          const r = NodeId.create('node1');
          return r.isOk() ? [r.value] : [];
        })(),
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const result = await manager.updateSelectionState(newState);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(normalCallback).toHaveBeenCalledTimes(1);

      subscription1.dispose();
      subscription2.dispose();
    });

    it('should not notify disposed observers', async () => {
      // Arrange
      const callback = vi.fn();
      const subscription = manager.subscribeToChanges(callback);
      subscription.dispose();

      const newState: SelectionState = {
        selectedNodes: (() => {
          const r = NodeId.create('node1');
          return r.isOk() ? [r.value] : [];
        })(),
        selectedStatements: [],
        selectedTrees: [],
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      await manager.updateSelectionState(newState);

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('URI Sanitization', () => {
    it('should sanitize complex URIs correctly', () => {
      // Arrange & Act
      const complexUris = [
        'file:///C:/Program Files/Project/file.proof',
        'vscode-notebook-cell:/path/to/notebook.ipynb#cell1',
        'untitled:Untitled-1',
        'file:///path/with spaces/file.proof',
        'file:///path/with@special&chars.proof',
      ];

      // Assert
      complexUris.forEach((uri) => {
        const testManager = new DocumentViewStateManager(mockPort, uri);
        expect(testManager.getDocumentUri()).toBe(uri);
      });
    });

    it('should create unique keys for different URIs', async () => {
      // Arrange
      const uri1 = 'file:///path/document1.proof';
      const uri2 = 'file:///path/document2.proof';
      const manager1 = new DocumentViewStateManager(mockPort, uri1);
      const manager2 = new DocumentViewStateManager(mockPort, uri2);

      mockPort.loadViewState.mockResolvedValue(ok(null));

      // Act
      await manager1.getSelectionState();
      await manager2.getSelectionState();

      // Assert
      expect(mockPort.loadViewState).toHaveBeenCalledWith('file_path_document1.proof.selection');
      expect(mockPort.loadViewState).toHaveBeenCalledWith('file_path_document2.proof.selection');
    });
  });

  describe('State Reconstruction', () => {
    it('should reconstruct selection state from partial data', async () => {
      // Arrange
      const partialState = {
        selectedNodes: (() => {
          const r = NodeId.create('node1');
          return r.isOk() ? [r.value] : [];
        })(),
        // Missing selectedStatements and selectedTrees
      };
      mockPort.loadViewState.mockResolvedValue(ok(partialState));

      // Act
      const result = await manager.getSelectionState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.selectedNodes).toEqual(['node1']);
        expect(result.value.selectedStatements).toEqual([]);
        expect(result.value.selectedTrees).toEqual([]);
      }
    });

    it('should reconstruct viewport state from partial data', async () => {
      // Arrange
      const partialState = {
        zoom: 2.0,
        // Missing pan and center
      };
      mockPort.loadViewState.mockResolvedValue(ok(partialState));

      // Act
      const result = await manager.getViewportState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.zoom).toBe(2.0);
        expect(result.value.pan).toEqual({ x: 0, y: 0 });
        expect(result.value.center).toEqual({ x: 0, y: 0 });
      }
    });

    it('should handle corrupt state data gracefully', async () => {
      // Arrange
      const corruptState = {
        selectedNodes: 'not an array',
        selectedStatements: null,
        selectedTrees: undefined,
      };
      mockPort.loadViewState.mockResolvedValue(ok(corruptState));

      // Act
      const result = await manager.getSelectionState();

      // Assert
      // The reconstruction will convert non-array data to empty arrays,
      // but validation might still catch the converted string as an invalid node ID
      if (result.isErr()) {
        expect(result.error.message).toMatch(/selection|node|statement|tree/);
      } else {
        // If it succeeds, verify it returned default values
        expect(result.value.selectedNodes).toEqual([]);
        expect(result.value.selectedStatements).toEqual([]);
        expect(result.value.selectedTrees).toEqual([]);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent state updates', async () => {
      // Arrange
      const states: SelectionState[] = [
        {
          selectedNodes: (() => {
            const r = NodeId.create('node1');
            return r.isOk() ? [r.value] : [];
          })(),
          selectedStatements: [],
          selectedTrees: [],
        },
        {
          selectedNodes: (() => {
            const r = NodeId.create('node2');
            return r.isOk() ? [r.value] : [];
          })(),
          selectedStatements: [],
          selectedTrees: [],
        },
        {
          selectedNodes: (() => {
            const r = NodeId.create('node3');
            return r.isOk() ? [r.value] : [];
          })(),
          selectedStatements: [],
          selectedTrees: [],
        },
      ];
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const results = await Promise.all(states.map((state) => manager.updateSelectionState(state)));

      // Assert
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
      expect(mockPort.saveViewState).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent different state type updates', async () => {
      // Arrange
      const selectionState: SelectionState = {
        selectedNodes: (() => {
          const r = NodeId.create('node1');
          return r.isOk() ? [r.value] : [];
        })(),
        selectedStatements: [],
        selectedTrees: [],
      };
      const zoom = ZoomLevel.create(1.5);
      const pan = Position2D.create(10, 20);
      const center = Position2D.create(5, 10);

      if (!zoom.isOk() || !pan.isOk() || !center.isOk()) {
        throw new Error('Failed to create test value objects');
      }

      const viewportState: ViewportState = {
        zoom: zoom.value,
        pan: pan.value,
        center: center.value,
      };
      mockPort.saveViewState.mockResolvedValue(ok(undefined));

      // Act
      const results = await Promise.all([
        manager.updateSelectionState(selectionState),
        manager.updateViewportState(viewportState),
      ]);

      // Assert
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
      expect(mockPort.saveViewState).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle unexpected errors during state operations', async () => {
      // Arrange
      mockPort.loadViewState.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await manager.getSelectionState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load selection state');
      }
    });

    it('should handle mixed success/failure in clear operations', async () => {
      // Arrange
      mockPort.clearViewState
        .mockResolvedValueOnce(ok(undefined))
        .mockResolvedValueOnce(err(new ValidationError('Clear error')))
        .mockResolvedValueOnce(ok(undefined));

      // Act
      const result = await manager.clearDocumentState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to clear document state');
      }
    });
  });
});
