import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
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
      const savedState = {
        selectedNodes: ['node1', 'node2'],
        selectedStatements: ['stmt1', 'stmt2'],
        selectedTrees: ['tree1'],
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
      const newState: SelectionState = {
        selectedNodes: ['node3', 'node4'],
        selectedStatements: ['stmt3'],
        selectedTrees: ['tree2'],
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
      const invalidState: SelectionState = {
        selectedNodes: [''], // Invalid empty node ID
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
        expect(result.value.zoom).toBe(1.0);
        expect(result.value.pan).toEqual({ x: 0, y: 0 });
        expect(result.value.center).toEqual({ x: 0, y: 0 });
      }
    });

    it('should load saved viewport state', async () => {
      // Arrange
      const savedState = {
        zoom: 2.5,
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      };
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await manager.getViewportState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.zoom).toBe(2.5);
        expect(result.value.pan).toEqual({ x: 100, y: 200 });
        expect(result.value.center).toEqual({ x: 50, y: 75 });
      }
    });

    it('should update viewport state and notify observers', async () => {
      // Arrange
      const newState: ViewportState = {
        zoom: 1.5,
        pan: { x: 50, y: 100 },
        center: { x: 25, y: 50 },
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
      const invalidState: ViewportState = {
        zoom: 0.05, // Below minimum
        pan: { x: 0, y: 0 },
        center: { x: 0, y: 0 },
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
        expect(result.value.panelSizes).toEqual({ validation: 300, miniMap: 150 });
      }
    });

    it('should update panel state and notify observers', async () => {
      // Arrange
      const newState: PanelState = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: { validation: 400 },
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
        panelSizes: { validation: -100 }, // Negative size
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
      const savedState = {
        colorScheme: 'dark' as const,
        fontSize: 16,
        fontFamily: 'Monaco',
      };
      mockPort.loadViewState.mockResolvedValue(ok(savedState));

      // Act
      const result = await manager.getThemeState();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.colorScheme).toBe('dark');
        expect(result.value.fontSize).toBe(16);
        expect(result.value.fontFamily).toBe('Monaco');
      }
    });

    it('should update theme state globally', async () => {
      // Arrange
      const newState: ThemeState = {
        colorScheme: 'light',
        fontSize: 18,
        fontFamily: 'Consolas',
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
      const invalidState: ThemeState = {
        colorScheme: 'light',
        fontSize: 4, // Too small
        fontFamily: 'Arial',
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
        selectedNodes: ['node1'],
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
        selectedNodes: ['node1'],
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
        selectedNodes: ['node1'],
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
        selectedNodes: ['node1'],
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
        { selectedNodes: ['node1'], selectedStatements: [], selectedTrees: [] },
        { selectedNodes: ['node2'], selectedStatements: [], selectedTrees: [] },
        { selectedNodes: ['node3'], selectedStatements: [], selectedTrees: [] },
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
        selectedNodes: ['node1'],
        selectedStatements: [],
        selectedTrees: [],
      };
      const viewportState: ViewportState = {
        zoom: 1.5,
        pan: { x: 10, y: 20 },
        center: { x: 5, y: 10 },
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
