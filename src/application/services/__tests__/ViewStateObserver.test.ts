import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeId, Position2D, ZoomLevel } from '../../../domain/shared/value-objects/index.js';
import type { ViewStateChangeEvent } from '../../dtos/view-dtos.js';
import type { ViewStateManager } from '../ViewStateManager.js';
import { ViewStateObserver } from '../ViewStateObserver.js';

describe('ViewStateObserver', () => {
  let viewStateObserver: ViewStateObserver;
  let mockViewStateManager: ViewStateManager;

  beforeEach(() => {
    mockViewStateManager = {
      subscribeToChanges: vi.fn(),
      getSelectionState: vi.fn(),
      updateSelectionState: vi.fn(),
      getViewportState: vi.fn(),
      updateViewportState: vi.fn(),
      getPanelState: vi.fn(),
      updatePanelState: vi.fn(),
      getThemeState: vi.fn(),
      updateThemeState: vi.fn(),
      clearAllState: vi.fn(),
    } as unknown as ViewStateManager;
    viewStateObserver = new ViewStateObserver(mockViewStateManager);
  });

  afterEach(() => {
    // Clean up all subscriptions after each test
    viewStateObserver.unsubscribeAll();
  });

  describe('Selection Change Subscriptions', () => {
    it('should subscribe to selection changes only', async () => {
      // Arrange
      const callback = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDisposable,
      );

      // Act
      const result = viewStateObserver.subscribeToSelectionChanges('test-observer', callback);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockViewStateManager.subscribeToChanges).toHaveBeenCalledWith(expect.any(Function));
      expect(viewStateObserver.isObserverActive('test-observer')).toBe(true);
    });

    it('should filter events to selection changes only', async () => {
      // Arrange
      const callback = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      let capturedCallback: ((event: ViewStateChangeEvent) => void) | undefined;

      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockImplementation(
        (cb) => {
          capturedCallback = cb;
          return mockDisposable;
        },
      );

      viewStateObserver.subscribeToSelectionChanges('test-observer', callback);

      // Act - send selection change event
      const nodeId = NodeId.create('node1');
      const selectionEvent: ViewStateChangeEvent = {
        type: 'selection-changed',
        newState: {
          selectedNodes: nodeId.isOk() ? [nodeId.value] : [],
          selectedStatements: [],
          selectedTrees: [],
        },
        timestamp: Date.now(),
      };
      capturedCallback?.(selectionEvent);

      // Act - send viewport change event (should be filtered out)
      const zoomLevel = ZoomLevel.create(1.5);
      const panPosition = Position2D.create(0, 0);
      const centerPosition = Position2D.create(0, 0);
      const viewportEvent: ViewStateChangeEvent = {
        type: 'viewport-changed',
        newState: {
          zoom: zoomLevel.isOk() ? zoomLevel.value : ZoomLevel.normal(),
          pan: panPosition.isOk() ? panPosition.value : Position2D.origin(),
          center: centerPosition.isOk() ? centerPosition.value : Position2D.origin(),
        },
        timestamp: Date.now(),
      };
      capturedCallback?.(viewportEvent);

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(selectionEvent);
    });
  });

  describe('Viewport Change Subscriptions', () => {
    it('should subscribe to viewport changes only', async () => {
      // Arrange
      const callback = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDisposable,
      );

      // Act
      const result = viewStateObserver.subscribeToViewportChanges('test-observer', callback);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(viewStateObserver.isObserverActive('test-observer')).toBe(true);
    });
  });

  describe('All Changes Subscription', () => {
    it('should subscribe to all change types', async () => {
      // Arrange
      const callback = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDisposable,
      );

      // Act
      const result = viewStateObserver.subscribeToAllChanges('test-observer', callback);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockViewStateManager.subscribeToChanges).toHaveBeenCalledWith(callback);
    });

    it('should receive all change types without filtering', async () => {
      // Arrange
      const callback = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      let capturedCallback: ((event: ViewStateChangeEvent) => void) | undefined;

      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockImplementation(
        (cb) => {
          capturedCallback = cb;
          return mockDisposable;
        },
      );

      viewStateObserver.subscribeToAllChanges('test-observer', callback);

      // Act - send multiple event types
      const events: ViewStateChangeEvent[] = [
        {
          type: 'selection-changed',
          newState: { selectedNodes: [], selectedStatements: [], selectedTrees: [] },
          timestamp: Date.now(),
        },
        {
          type: 'viewport-changed',
          newState: {
            zoom: ZoomLevel.normal(),
            pan: Position2D.origin(),
            center: Position2D.origin(),
          },
          timestamp: Date.now(),
        },
        {
          type: 'panel-changed',
          newState: {
            miniMapVisible: true,
            sideLabelsVisible: true,
            validationPanelVisible: false,
            panelSizes: {},
          },
          timestamp: Date.now(),
        },
      ];

      events.forEach((event) => capturedCallback?.(event));

      // Assert
      expect(callback).toHaveBeenCalledTimes(3);
      events.forEach((event) => {
        expect(callback).toHaveBeenCalledWith(event);
      });
    });
  });

  describe('Subscription Management', () => {
    it('should prevent duplicate observer IDs', async () => {
      // Arrange
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDisposable,
      );

      // Act
      const result1 = viewStateObserver.subscribeToAllChanges('duplicate-id', callback1);
      const result2 = viewStateObserver.subscribeToAllChanges('duplicate-id', callback2);

      // Assert
      expect(result1.isOk()).toBe(true);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.message).toContain('already subscribed');
      }
    });

    it('should unsubscribe observers correctly', async () => {
      // Arrange
      const callback = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDisposable,
      );

      viewStateObserver.subscribeToAllChanges('test-observer', callback);

      // Act
      const result = viewStateObserver.unsubscribe('test-observer');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockDisposable.dispose).toHaveBeenCalled();
      expect(viewStateObserver.isObserverActive('test-observer')).toBe(false);
    });

    it('should handle unsubscribing non-existent observers gracefully', async () => {
      // Act
      const result = viewStateObserver.unsubscribe('non-existent');

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should unsubscribe all observers', async () => {
      // Arrange
      const mockDisposable1 = { dispose: vi.fn() };
      const mockDisposable2 = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockDisposable1)
        .mockReturnValueOnce(mockDisposable2);

      viewStateObserver.subscribeToAllChanges('observer1', vi.fn());
      viewStateObserver.subscribeToSelectionChanges('observer2', vi.fn());

      // Act
      const result = viewStateObserver.unsubscribeAll();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockDisposable1.dispose).toHaveBeenCalled();
      expect(mockDisposable2.dispose).toHaveBeenCalled();
      expect(viewStateObserver.getActiveObserverCount()).toBe(0);
    });
  });

  describe('Observer Information', () => {
    it('should track active observer count correctly', async () => {
      // Arrange
      const mockDisposable = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDisposable,
      );

      // Act & Assert
      expect(viewStateObserver.getActiveObserverCount()).toBe(0);

      viewStateObserver.subscribeToAllChanges('observer1', vi.fn());
      expect(viewStateObserver.getActiveObserverCount()).toBe(1);

      viewStateObserver.subscribeToSelectionChanges('observer2', vi.fn());
      expect(viewStateObserver.getActiveObserverCount()).toBe(2);

      viewStateObserver.unsubscribe('observer1');
      expect(viewStateObserver.getActiveObserverCount()).toBe(1);
    });

    it('should check observer active status correctly', async () => {
      // Arrange
      const mockDisposable = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDisposable,
      );

      // Act & Assert
      expect(viewStateObserver.isObserverActive('test-observer')).toBe(false);

      viewStateObserver.subscribeToAllChanges('test-observer', vi.fn());
      expect(viewStateObserver.isObserverActive('test-observer')).toBe(true);

      viewStateObserver.unsubscribe('test-observer');
      expect(viewStateObserver.isObserverActive('test-observer')).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should reject empty observer IDs', async () => {
      // Act
      const result = viewStateObserver.subscribeToAllChanges('', vi.fn());

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('non-empty string');
      }
    });

    it('should reject whitespace-only observer IDs', async () => {
      // Act
      const result = viewStateObserver.subscribeToAllChanges('   ', vi.fn());

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('non-empty string');
      }
    });
  });

  describe('Disposable Pattern', () => {
    it('should provide working disposable from subscription', async () => {
      // Arrange
      const callback = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDisposable,
      );

      const subscriptionResult = viewStateObserver.subscribeToAllChanges('test-observer', callback);
      expect(subscriptionResult.isOk()).toBe(true);

      // Act
      if (subscriptionResult.isOk()) {
        subscriptionResult.value.dispose();
      }

      // Assert
      expect(viewStateObserver.isObserverActive('test-observer')).toBe(false);
      expect(mockDisposable.dispose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle ViewStateManager subscription errors', async () => {
      // Arrange
      (mockViewStateManager.subscribeToChanges as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw new Error('Subscription failed');
        },
      );

      // Act
      const result = viewStateObserver.subscribeToAllChanges('test-observer', vi.fn());

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to subscribe observer');
      }
    });
  });
});
