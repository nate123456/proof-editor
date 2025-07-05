import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { VSCodeViewStateAdapter } from '../VSCodeViewStateAdapter.js';

// Mock the entire vscode module
vi.mock('vscode', () => ({
  ExtensionContext: vi.fn(),
  Memento: vi.fn(),
}));

describe('VSCodeViewStateAdapter', () => {
  let adapter: VSCodeViewStateAdapter;
  let mockContext: ReturnType<typeof vi.mocked<vscode.ExtensionContext>>;
  let mockGlobalState: ReturnType<typeof vi.mocked<vscode.Memento>>;
  let mockWorkspaceState: ReturnType<typeof vi.mocked<vscode.Memento>>;

  beforeEach(() => {
    mockGlobalState = vi.mocked<vscode.Memento>({
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn(),
    } as unknown as vscode.Memento);

    mockWorkspaceState = vi.mocked<vscode.Memento>({
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn(),
    } as unknown as vscode.Memento);

    mockContext = vi.mocked<vscode.ExtensionContext>({
      globalState: mockGlobalState,
      workspaceState: mockWorkspaceState,
    } as unknown as vscode.ExtensionContext);

    adapter = new VSCodeViewStateAdapter(mockContext);
  });

  describe('saveViewState', () => {
    it('should save state to global storage by default', async () => {
      // Arrange
      const key = 'test-key';
      const state = { data: 'test-value' };
      mockGlobalState.update.mockResolvedValue(undefined);

      // Act
      const result = await adapter.saveViewState(key, state);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.test-key',
        state,
      );
    });

    it('should save state to workspace storage when configured', async () => {
      // Arrange
      const workspaceAdapter = new VSCodeViewStateAdapter(mockContext, 'workspace');
      const key = 'test-key';
      const state = { data: 'test-value' };
      mockWorkspaceState.update.mockResolvedValue(undefined);

      // Act
      const result = await workspaceAdapter.saveViewState(key, state);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockWorkspaceState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.test-key',
        state,
      );
    });

    it('should handle VS Code storage errors', async () => {
      // Arrange
      const key = 'test-key';
      const state = { data: 'test-value' };
      const error = new Error('Storage failure');
      mockGlobalState.update.mockRejectedValue(error);

      // Act
      const result = await adapter.saveViewState(key, state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save view state');
        expect(result.error.message).toContain('Storage failure');
      }
    });

    it('should validate key format', async () => {
      // Arrange
      const invalidKey = '';
      const state = { data: 'test-value' };

      // Act
      const result = await adapter.saveViewState(invalidKey, state);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid key');
      }
    });

    it('should handle undefined state gracefully', async () => {
      // Arrange
      const key = 'test-key';
      const state = undefined;
      mockGlobalState.update.mockResolvedValue(undefined);

      // Act
      const result = await adapter.saveViewState(key, state);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.test-key',
        undefined,
      );
    });
  });

  describe('loadViewState', () => {
    it('should load state from global storage by default', async () => {
      // Arrange
      const key = 'test-key';
      const expectedState = { data: 'test-value' };
      mockGlobalState.get.mockReturnValue(expectedState);

      // Act
      const result = await adapter.loadViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(expectedState);
      }
      expect(mockGlobalState.get).toHaveBeenCalledWith('proof-editor.view-state.test-key', null);
    });

    it('should load state from workspace storage when configured', async () => {
      // Arrange
      const workspaceAdapter = new VSCodeViewStateAdapter(mockContext, 'workspace');
      const key = 'test-key';
      const expectedState = { data: 'test-value' };
      mockWorkspaceState.get.mockReturnValue(expectedState);

      // Act
      const result = await workspaceAdapter.loadViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(expectedState);
      }
      expect(mockWorkspaceState.get).toHaveBeenCalledWith('proof-editor.view-state.test-key', null);
    });

    it('should return null when state does not exist', async () => {
      // Arrange
      const key = 'nonexistent-key';
      mockGlobalState.get.mockReturnValue(null);

      // Act
      const result = await adapter.loadViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it('should handle synchronous VS Code get errors', async () => {
      // Arrange
      const key = 'test-key';
      mockGlobalState.get.mockImplementation(() => {
        throw new Error('Storage read failure');
      });

      // Act
      const result = await adapter.loadViewState(key);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to load view state');
        expect(result.error.message).toContain('Storage read failure');
      }
    });

    it('should validate key format', async () => {
      // Arrange
      const invalidKey = '';

      // Act
      const result = await adapter.loadViewState(invalidKey);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid key');
      }
    });
  });

  describe('clearViewState', () => {
    it('should clear state from global storage by default', async () => {
      // Arrange
      const key = 'test-key';
      mockGlobalState.update.mockResolvedValue(undefined);

      // Act
      const result = await adapter.clearViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.test-key',
        undefined,
      );
    });

    it('should clear state from workspace storage when configured', async () => {
      // Arrange
      const workspaceAdapter = new VSCodeViewStateAdapter(mockContext, 'workspace');
      const key = 'test-key';
      mockWorkspaceState.update.mockResolvedValue(undefined);

      // Act
      const result = await workspaceAdapter.clearViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockWorkspaceState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.test-key',
        undefined,
      );
    });

    it('should handle VS Code clear errors', async () => {
      // Arrange
      const key = 'test-key';
      const error = new Error('Clear failure');
      mockGlobalState.update.mockRejectedValue(error);

      // Act
      const result = await adapter.clearViewState(key);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to clear view state');
        expect(result.error.message).toContain('Clear failure');
      }
    });
  });

  describe('hasViewState', () => {
    it('should return true when state exists', async () => {
      // Arrange
      const key = 'test-key';
      mockGlobalState.get.mockReturnValue({ data: 'value' });

      // Act
      const result = await adapter.hasViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false when state does not exist', async () => {
      // Arrange
      const key = 'nonexistent-key';
      mockGlobalState.get.mockReturnValue(null);

      // Act
      const result = await adapter.hasViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    it('should return false when state is undefined', async () => {
      // Arrange
      const key = 'undefined-key';
      mockGlobalState.get.mockReturnValue(undefined);

      // Act
      const result = await adapter.hasViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('getAllStateKeys', () => {
    it('should return empty array when no keys exist', async () => {
      // Arrange
      mockGlobalState.keys.mockReturnValue([]);

      // Act
      const result = await adapter.getAllStateKeys();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should filter and return only view state keys', async () => {
      // Arrange
      const allKeys = [
        'proof-editor.view-state.selection',
        'proof-editor.view-state.viewport',
        'proof-editor.other-setting',
        'other-extension.setting',
        'proof-editor.view-state.panel',
      ];
      mockGlobalState.keys.mockReturnValue(allKeys);

      // Act
      const result = await adapter.getAllStateKeys();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(['selection', 'viewport', 'panel']);
      }
    });

    it('should handle VS Code keys() errors', async () => {
      // Arrange
      mockGlobalState.keys.mockImplementation(() => {
        throw new Error('Keys enumeration failed');
      });

      // Act
      const result = await adapter.getAllStateKeys();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to get state keys');
        expect(result.error.message).toContain('Keys enumeration failed');
      }
    });
  });

  describe('clearAllViewState', () => {
    it('should clear all view state keys', async () => {
      // Arrange
      mockGlobalState.keys.mockReturnValue([
        'proof-editor.view-state.selection',
        'proof-editor.view-state.viewport',
        'proof-editor.view-state.panel',
        'proof-editor.other-setting',
      ]);
      mockGlobalState.update.mockResolvedValue(undefined);

      // Act
      const result = await adapter.clearAllViewState();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledTimes(3);
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.selection',
        undefined,
      );
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.viewport',
        undefined,
      );
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.panel',
        undefined,
      );
    });

    it('should handle partial clear failures', async () => {
      // Arrange
      mockGlobalState.keys.mockReturnValue([
        'proof-editor.view-state.selection',
        'proof-editor.view-state.viewport',
      ]);
      mockGlobalState.update
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Clear failed'));

      // Act
      const result = await adapter.clearAllViewState();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to clear all view state');
      }
    });
  });

  describe('Key namespacing', () => {
    it('should use custom namespace when provided', async () => {
      // Arrange
      const customAdapter = new VSCodeViewStateAdapter(mockContext, 'global', 'custom-namespace');
      const key = 'test-key';
      const state = { data: 'value' };
      mockGlobalState.update.mockResolvedValue(undefined);

      // Act
      const result = await customAdapter.saveViewState(key, state);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'custom-namespace.view-state.test-key',
        state,
      );
    });

    it('should handle nested key structures', async () => {
      // Arrange
      const key = 'panel.validation.size';
      const state = 200;
      mockGlobalState.update.mockResolvedValue(undefined);

      // Act
      const result = await adapter.saveViewState(key, state);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.view-state.panel.validation.size',
        state,
      );
    });
  });

  describe('Error resilience', () => {
    it('should handle unexpected VS Code API changes gracefully', async () => {
      // Arrange
      const key = 'test-key';
      mockGlobalState.get.mockReturnValue({ __proto__: null }); // Prototypeless object

      // Act
      const result = await adapter.loadViewState(key);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ __proto__: null });
      }
    });

    it('should handle circular reference serialization errors', async () => {
      // Arrange
      const key = 'test-key';
      const circularState: any = { data: 'value' };
      circularState.self = circularState;
      mockGlobalState.update.mockRejectedValue(new Error('Converting circular structure to JSON'));

      // Act
      const result = await adapter.saveViewState(key, circularState);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save view state');
      }
    });
  });
});
