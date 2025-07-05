import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Disposable, ViewStateChangeEvent } from '../../dtos/view-dtos.js';
import type { ViewStateManager } from '../ViewStateManager.js';
import { ViewStateObserver } from '../ViewStateObserver.js';

describe('ViewStateObserver - Enhanced Coverage', () => {
  let observer: ViewStateObserver;
  let mockViewStateManager: ViewStateManager;
  let mockDisposable: Disposable;

  beforeEach(() => {
    mockDisposable = {
      dispose: vi.fn(),
    };

    mockViewStateManager = {
      subscribeToChanges: vi.fn().mockReturnValue(mockDisposable),
      updateViewState: vi.fn(),
      getViewState: vi.fn(),
      clearViewState: vi.fn(),
      hasViewState: vi.fn(),
      getViewStateKeys: vi.fn(),
    } as any;

    observer = new ViewStateObserver(mockViewStateManager);
  });

  describe('subscribeToSelectionChanges edge cases', () => {
    test('rejects empty observer ID', () => {
      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('', callback);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Observer ID must be a non-empty string');
      }
    });

    test('rejects whitespace-only observer ID', () => {
      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('   \t\n  ', callback);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Observer ID must be a non-empty string');
      }
    });

    test('rejects duplicate observer IDs', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const result1 = observer.subscribeToSelectionChanges('observer1', callback1);
      expect(result1.isOk()).toBe(true);

      const result2 = observer.subscribeToSelectionChanges('observer1', callback2);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.message).toContain('already subscribed');
      }
    });

    test('handles ViewStateManager throwing exception', () => {
      vi.mocked(mockViewStateManager.subscribeToChanges).mockImplementation(() => {
        throw new Error('ViewStateManager failure');
      });

      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('observer1', callback);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to subscribe observer');
        expect(result.error.message).toContain('ViewStateManager failure');
      }
    });

    test('creates filtered callback that only responds to selection changes', () => {
      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      // Get the callback passed to ViewStateManager
      const registeredCallback = vi.mocked(mockViewStateManager.subscribeToChanges).mock
        .calls[0]?.[0];
      expect(registeredCallback).toBeDefined();

      if (registeredCallback) {
        // Test that it filters correctly
        const selectionEvent: ViewStateChangeEvent = {
          type: 'selection-changed',
          timestamp: Date.now(),
          newState: { selectedNodeIds: ['node1'] } as any,
        };

        const viewportEvent: ViewStateChangeEvent = {
          type: 'viewport-changed',
          timestamp: Date.now(),
          newState: { x: 100, y: 200, zoom: 1.5 } as any,
        };

        registeredCallback(selectionEvent);
        expect(callback).toHaveBeenCalledWith(selectionEvent);

        callback.mockClear();
        registeredCallback(viewportEvent);
        expect(callback).not.toHaveBeenCalled(); // Should be filtered out
      }
    });

    test('returns disposable that properly unsubscribes', () => {
      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(observer.getActiveObserverCount()).toBe(1);
        expect(observer.isObserverActive('observer1')).toBe(true);

        result.value.dispose();

        expect(observer.getActiveObserverCount()).toBe(0);
        expect(observer.isObserverActive('observer1')).toBe(false);
        expect(mockDisposable.dispose).toHaveBeenCalled();
      }
    });
  });

  describe('subscribeToViewportChanges edge cases', () => {
    test('follows same validation patterns as selection changes', () => {
      const callback = vi.fn();

      // Test empty ID
      const emptyResult = observer.subscribeToViewportChanges('', callback);
      expect(emptyResult.isErr()).toBe(true);

      // Test duplicate
      const result1 = observer.subscribeToViewportChanges('observer1', callback);
      expect(result1.isOk()).toBe(true);

      const result2 = observer.subscribeToViewportChanges('observer1', callback);
      expect(result2.isErr()).toBe(true);
    });

    test('filters viewport events correctly', () => {
      const callback = vi.fn();
      const result = observer.subscribeToViewportChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      const registeredCallback = vi.mocked(mockViewStateManager.subscribeToChanges).mock
        .calls[0]?.[0];
      expect(registeredCallback).toBeDefined();

      if (registeredCallback) {
        const viewportEvent: ViewStateChangeEvent = {
          type: 'viewport-changed',
          timestamp: Date.now(),
          newState: { x: 100, y: 200, zoom: 1.5 } as any,
        };

        const selectionEvent: ViewStateChangeEvent = {
          type: 'selection-changed',
          timestamp: Date.now(),
          newState: { selectedNodeIds: ['node1'] } as any,
        };

        registeredCallback(viewportEvent);
        expect(callback).toHaveBeenCalledWith(viewportEvent);

        callback.mockClear();
        registeredCallback(selectionEvent);
        expect(callback).not.toHaveBeenCalled(); // Should be filtered out
      }
    });
  });

  describe('subscribeToPanelChanges edge cases', () => {
    test('filters panel events correctly', () => {
      const callback = vi.fn();
      const result = observer.subscribeToPanelChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      const registeredCallback = vi.mocked(mockViewStateManager.subscribeToChanges).mock
        .calls[0]?.[0];

      if (registeredCallback) {
        const panelEvent: ViewStateChangeEvent = {
          type: 'panel-changed',
          timestamp: Date.now(),
          newState: { panelType: 'properties', isVisible: true } as any,
        };

        const themeEvent: ViewStateChangeEvent = {
          type: 'theme-changed',
          timestamp: Date.now(),
          newState: { theme: 'dark' } as any,
        };

        registeredCallback(panelEvent);
        expect(callback).toHaveBeenCalledWith(panelEvent);

        callback.mockClear();
        registeredCallback(themeEvent);
        expect(callback).not.toHaveBeenCalled();
      }
    });
  });

  describe('subscribeToThemeChanges edge cases', () => {
    test('filters theme events correctly', () => {
      const callback = vi.fn();
      const result = observer.subscribeToThemeChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      const registeredCallback = vi.mocked(mockViewStateManager.subscribeToChanges).mock
        .calls[0]?.[0];

      if (registeredCallback) {
        const themeEvent: ViewStateChangeEvent = {
          type: 'theme-changed',
          timestamp: Date.now(),
          newState: { theme: 'dark' } as any,
        };

        const panelEvent: ViewStateChangeEvent = {
          type: 'panel-changed',
          timestamp: Date.now(),
          newState: { panelType: 'properties', isVisible: true } as any,
        };

        registeredCallback(themeEvent);
        expect(callback).toHaveBeenCalledWith(themeEvent);

        callback.mockClear();
        registeredCallback(panelEvent);
        expect(callback).not.toHaveBeenCalled();
      }
    });
  });

  describe('subscribeToAllChanges edge cases', () => {
    test('rejects invalid observer IDs', () => {
      const callback = vi.fn();

      const invalidIds = ['', '   ', '\t\n', null as any, undefined as any];

      for (const invalidId of invalidIds) {
        const result = observer.subscribeToAllChanges(invalidId, callback);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Observer ID must be a non-empty string');
        }
      }
    });

    test('rejects duplicate observer IDs', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const result1 = observer.subscribeToAllChanges('observer1', callback1);
      expect(result1.isOk()).toBe(true);

      const result2 = observer.subscribeToAllChanges('observer1', callback2);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.message).toContain('already subscribed');
      }
    });

    test('handles ViewStateManager throwing exception', () => {
      vi.mocked(mockViewStateManager.subscribeToChanges).mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      const callback = vi.fn();
      const result = observer.subscribeToAllChanges('observer1', callback);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to subscribe observer');
        expect(result.error.message).toContain('Subscription failed');
      }
    });

    test('handles non-Error exceptions', () => {
      vi.mocked(mockViewStateManager.subscribeToChanges).mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const callback = vi.fn();
      const result = observer.subscribeToAllChanges('observer1', callback);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('String error');
      }
    });

    test('passes through all event types without filtering', () => {
      const callback = vi.fn();
      const result = observer.subscribeToAllChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      const registeredCallback = vi.mocked(mockViewStateManager.subscribeToChanges).mock
        .calls[0]?.[0];
      expect(registeredCallback).toBe(callback); // Should be the original callback, not filtered
    });

    test('creates working disposable', () => {
      const callback = vi.fn();
      const result = observer.subscribeToAllChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        result.value.dispose();
        expect(observer.isObserverActive('observer1')).toBe(false);
      }
    });
  });

  describe('unsubscribe edge cases', () => {
    test('rejects invalid observer IDs', () => {
      const invalidIds = ['', '   ', '\t\n'];

      for (const invalidId of invalidIds) {
        const result = observer.unsubscribe(invalidId);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Observer ID must be a non-empty string');
        }
      }
    });

    test('succeeds for non-existent observer ID', () => {
      const result = observer.unsubscribe('nonexistent');
      expect(result.isOk()).toBe(true);
    });

    test('properly cleans up subscription and filtered observers', () => {
      const callback = vi.fn();
      const subscribeResult = observer.subscribeToSelectionChanges('observer1', callback);
      expect(subscribeResult.isOk()).toBe(true);

      expect(observer.isObserverActive('observer1')).toBe(true);

      const unsubscribeResult = observer.unsubscribe('observer1');
      expect(unsubscribeResult.isOk()).toBe(true);

      expect(observer.isObserverActive('observer1')).toBe(false);
      expect(mockDisposable.dispose).toHaveBeenCalled();
    });

    test('handles dispose throwing exception', () => {
      vi.mocked(mockDisposable.dispose).mockImplementation(() => {
        throw new Error('Dispose failed');
      });

      const callback = vi.fn();
      const subscribeResult = observer.subscribeToSelectionChanges('observer1', callback);
      expect(subscribeResult.isOk()).toBe(true);

      const unsubscribeResult = observer.unsubscribe('observer1');
      expect(unsubscribeResult.isErr()).toBe(true);
      if (unsubscribeResult.isErr()) {
        expect(unsubscribeResult.error.message).toContain('Failed to unsubscribe observer');
        expect(unsubscribeResult.error.message).toContain('Dispose failed');
      }
    });

    test('handles non-Error exceptions during disposal', () => {
      vi.mocked(mockDisposable.dispose).mockImplementation(() => {
        throw 'Disposal error string';
      });

      const callback = vi.fn();
      const subscribeResult = observer.subscribeToSelectionChanges('observer1', callback);
      expect(subscribeResult.isOk()).toBe(true);

      const unsubscribeResult = observer.unsubscribe('observer1');
      expect(unsubscribeResult.isErr()).toBe(true);
      if (unsubscribeResult.isErr()) {
        expect(unsubscribeResult.error.message).toContain('Disposal error string');
      }
    });
  });

  describe('unsubscribeAll edge cases', () => {
    test('succeeds when no observers are active', () => {
      const result = observer.unsubscribeAll();
      expect(result.isOk()).toBe(true);
    });

    test('unsubscribes multiple observers successfully', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      observer.subscribeToSelectionChanges('observer1', callback1);
      observer.subscribeToViewportChanges('observer2', callback2);
      observer.subscribeToAllChanges('observer3', callback3);

      expect(observer.getActiveObserverCount()).toBe(3);

      const result = observer.unsubscribeAll();
      expect(result.isOk()).toBe(true);
      expect(observer.getActiveObserverCount()).toBe(0);
    });

    test('returns error if any individual unsubscribe fails', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      observer.subscribeToSelectionChanges('observer1', callback1);
      observer.subscribeToViewportChanges('observer2', callback2);

      // Mock dispose to fail for one observer
      let disposeCallCount = 0;
      vi.mocked(mockDisposable.dispose).mockImplementation(() => {
        disposeCallCount++;
        if (disposeCallCount === 1) {
          throw new Error('First dispose failed');
        }
      });

      const result = observer.unsubscribeAll();
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to unsubscribe observer');
      }
    });

    test('handles exception thrown during iteration', () => {
      const callback = vi.fn();
      observer.subscribeToSelectionChanges('observer1', callback);

      // Mock the Symbol.iterator to throw
      vi.spyOn((observer as any).subscriptions, Symbol.iterator as any).mockImplementation(() => {
        throw new Error('Iterator failed');
      });

      const result = observer.unsubscribeAll();
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to unsubscribe all observers');
        expect(result.error.message).toContain('Iterator failed');
      }
    });
  });

  describe('observer state management', () => {
    test('getActiveObserverCount returns correct count', () => {
      expect(observer.getActiveObserverCount()).toBe(0);

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      observer.subscribeToSelectionChanges('observer1', callback1);
      expect(observer.getActiveObserverCount()).toBe(1);

      observer.subscribeToViewportChanges('observer2', callback2);
      expect(observer.getActiveObserverCount()).toBe(2);

      observer.subscribeToAllChanges('observer3', callback3);
      expect(observer.getActiveObserverCount()).toBe(3);

      observer.unsubscribe('observer2');
      expect(observer.getActiveObserverCount()).toBe(2);

      observer.unsubscribeAll();
      expect(observer.getActiveObserverCount()).toBe(0);
    });

    test('isObserverActive returns correct status', () => {
      const callback = vi.fn();

      expect(observer.isObserverActive('observer1')).toBe(false);

      observer.subscribeToSelectionChanges('observer1', callback);
      expect(observer.isObserverActive('observer1')).toBe(true);

      observer.unsubscribe('observer1');
      expect(observer.isObserverActive('observer1')).toBe(false);
    });

    test('isObserverActive handles non-string inputs', () => {
      expect(observer.isObserverActive(null as any)).toBe(false);
      expect(observer.isObserverActive(undefined as any)).toBe(false);
      expect(observer.isObserverActive(123 as any)).toBe(false);
      expect(observer.isObserverActive({} as any)).toBe(false);
    });
  });

  describe('multiple subscription types', () => {
    test('can have different observers for different event types', () => {
      const selectionCallback = vi.fn();
      const viewportCallback = vi.fn();
      const panelCallback = vi.fn();
      const themeCallback = vi.fn();
      const allCallback = vi.fn();

      observer.subscribeToSelectionChanges('selection-observer', selectionCallback);
      observer.subscribeToViewportChanges('viewport-observer', viewportCallback);
      observer.subscribeToPanelChanges('panel-observer', panelCallback);
      observer.subscribeToThemeChanges('theme-observer', themeCallback);
      observer.subscribeToAllChanges('all-observer', allCallback);

      expect(observer.getActiveObserverCount()).toBe(5);
      expect(observer.isObserverActive('selection-observer')).toBe(true);
      expect(observer.isObserverActive('viewport-observer')).toBe(true);
      expect(observer.isObserverActive('panel-observer')).toBe(true);
      expect(observer.isObserverActive('theme-observer')).toBe(true);
      expect(observer.isObserverActive('all-observer')).toBe(true);
    });

    test('cannot reuse observer ID across different subscription types', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const result1 = observer.subscribeToSelectionChanges('observer1', callback1);
      expect(result1.isOk()).toBe(true);

      const result2 = observer.subscribeToViewportChanges('observer1', callback2);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.message).toContain('already subscribed');
      }
    });
  });

  describe('memory leak prevention', () => {
    test('properly cleans up filtered callback references', () => {
      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      // Verify that the observer is tracked
      expect((observer as any).observers.has('observer1')).toBe(true);
      expect((observer as any).observers.get('observer1')?.has(callback)).toBe(true);

      observer.unsubscribe('observer1');

      // Verify cleanup
      expect((observer as any).observers.has('observer1')).toBe(false);
    });

    test('disposable from subscribeToEventType properly cleans up', () => {
      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(observer.isObserverActive('observer1')).toBe(true);
        expect((observer as any).observers.has('observer1')).toBe(true);

        result.value.dispose();

        expect(observer.isObserverActive('observer1')).toBe(false);
        expect((observer as any).observers.has('observer1')).toBe(false);
      }
    });
  });

  describe('edge cases in event filtering', () => {
    test('handles malformed events gracefully', () => {
      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      const registeredCallback = vi.mocked(mockViewStateManager.subscribeToChanges).mock
        .calls[0]?.[0];

      if (registeredCallback) {
        // Test with malformed event
        const malformedEvent = {
          type: 'selection-changed',
          // Missing required fields
        } as ViewStateChangeEvent;

        expect(() => registeredCallback(malformedEvent)).not.toThrow();
        expect(callback).toHaveBeenCalledWith(malformedEvent);
      }
    });

    test('handles event with undefined type', () => {
      const callback = vi.fn();
      const result = observer.subscribeToSelectionChanges('observer1', callback);
      expect(result.isOk()).toBe(true);

      const registeredCallback = vi.mocked(mockViewStateManager.subscribeToChanges).mock
        .calls[0]?.[0];

      if (registeredCallback) {
        const eventWithUndefinedType = {
          type: undefined,
          timestamp: Date.now(),
          newState: {} as any,
        } as any;

        expect(() => registeredCallback(eventWithUndefinedType)).not.toThrow();
        expect(callback).not.toHaveBeenCalled(); // Should be filtered out
      }
    });

    test('handles callback throwing exception', () => {
      const throwingCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback failed');
      });

      const result = observer.subscribeToSelectionChanges('observer1', throwingCallback);
      expect(result.isOk()).toBe(true);

      const registeredCallback = vi.mocked(mockViewStateManager.subscribeToChanges).mock
        .calls[0]?.[0];

      if (registeredCallback) {
        const event: ViewStateChangeEvent = {
          type: 'selection-changed',
          timestamp: Date.now(),
          newState: { selectedNodeIds: ['node1'] } as any,
        };

        // The exception should not prevent the filtering logic from working
        expect(() => registeredCallback(event)).toThrow('Callback failed');
        expect(throwingCallback).toHaveBeenCalledWith(event);
      }
    });
  });

  describe('isValidObserverId edge cases', () => {
    test('correctly validates various observer ID formats', () => {
      const validIds = [
        'observer1',
        'observer-with-dashes',
        'observer_with_underscores',
        'observer.with.dots',
        'observer123',
        'UPPERCASE_OBSERVER',
        'MixedCase-Observer_123.test',
        'observer with spaces', // Even spaces are considered valid
        'observer\twith\ttabs',
        '123numeric',
        'unicode-字符',
      ];

      const invalidIds = ['', '   ', '\t', '\n', '  \t\n  '];

      for (const validId of validIds) {
        expect((observer as any).isValidObserverId(validId)).toBe(true);
      }

      for (const invalidId of invalidIds) {
        expect((observer as any).isValidObserverId(invalidId)).toBe(false);
      }
    });

    test('handles non-string types', () => {
      const nonStringInputs = [
        null,
        undefined,
        123,
        true,
        false,
        {},
        [],
        () => {
          /* empty function */
        },
      ];

      for (const input of nonStringInputs) {
        expect((observer as any).isValidObserverId(input as any)).toBe(false);
      }
    });
  });
});
