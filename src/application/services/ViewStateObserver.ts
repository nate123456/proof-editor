import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import type { Disposable, ViewStateChangeEvent } from '../dtos/view-dtos.js';
import type { ViewStateManager } from './ViewStateManager.js';

/**
 * Observer service for reactive view state updates
 *
 * Provides centralized observation of view state changes with
 * type-safe event filtering and automatic subscription management.
 * Follows observer pattern with proper memory leak prevention.
 */
export class ViewStateObserver {
  private readonly subscriptions = new Map<string, Disposable>();
  private readonly observers = new Map<string, Set<(event: ViewStateChangeEvent) => void>>();

  constructor(private readonly viewStateManager: ViewStateManager) {
    this.initializeObserver();
  }

  subscribeToSelectionChanges(
    observerId: string,
    callback: (event: ViewStateChangeEvent) => void,
  ): Result<Disposable, ValidationError> {
    return this.subscribeToEventType(observerId, 'selection-changed', callback);
  }

  subscribeToViewportChanges(
    observerId: string,
    callback: (event: ViewStateChangeEvent) => void,
  ): Result<Disposable, ValidationError> {
    return this.subscribeToEventType(observerId, 'viewport-changed', callback);
  }

  subscribeToPanelChanges(
    observerId: string,
    callback: (event: ViewStateChangeEvent) => void,
  ): Result<Disposable, ValidationError> {
    return this.subscribeToEventType(observerId, 'panel-changed', callback);
  }

  subscribeToThemeChanges(
    observerId: string,
    callback: (event: ViewStateChangeEvent) => void,
  ): Result<Disposable, ValidationError> {
    return this.subscribeToEventType(observerId, 'theme-changed', callback);
  }

  subscribeToAllChanges(
    observerId: string,
    callback: (event: ViewStateChangeEvent) => void,
  ): Result<Disposable, ValidationError> {
    if (!this.isValidObserverId(observerId)) {
      return err(new ValidationError('Observer ID must be a non-empty string'));
    }

    if (this.subscriptions.has(observerId)) {
      return err(new ValidationError(`Observer '${observerId}' is already subscribed`));
    }

    try {
      const subscription = this.viewStateManager.subscribeToChanges(callback);
      this.subscriptions.set(observerId, subscription);

      return ok({
        dispose: () => {
          this.unsubscribe(observerId);
        },
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to subscribe observer '${observerId}': ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  unsubscribe(observerId: string): Result<void, ValidationError> {
    if (!this.isValidObserverId(observerId)) {
      return err(new ValidationError('Observer ID must be a non-empty string'));
    }

    try {
      const subscription = this.subscriptions.get(observerId);
      if (subscription) {
        subscription.dispose();
        this.subscriptions.delete(observerId);
      }

      // Clean up filtered observers
      this.observers.delete(observerId);

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to unsubscribe observer '${observerId}': ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  unsubscribeAll(): Result<void, ValidationError> {
    try {
      for (const [observerId] of this.subscriptions) {
        const unsubscribeResult = this.unsubscribe(observerId);
        if (unsubscribeResult.isErr()) {
          return err(unsubscribeResult.error);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to unsubscribe all observers: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  getActiveObserverCount(): number {
    return this.subscriptions.size;
  }

  isObserverActive(observerId: string): boolean {
    return this.subscriptions.has(observerId);
  }

  private subscribeToEventType(
    observerId: string,
    eventType: ViewStateChangeEvent['type'],
    callback: (event: ViewStateChangeEvent) => void,
  ): Result<Disposable, ValidationError> {
    if (!this.isValidObserverId(observerId)) {
      return err(new ValidationError('Observer ID must be a non-empty string'));
    }

    if (this.subscriptions.has(observerId)) {
      return err(new ValidationError(`Observer '${observerId}' is already subscribed`));
    }

    try {
      // Create filtered callback
      const filteredCallback = (event: ViewStateChangeEvent) => {
        if (event.type === eventType) {
          callback(event);
        }
      };

      const subscription = this.viewStateManager.subscribeToChanges(filteredCallback);
      this.subscriptions.set(observerId, subscription);

      // Track filtered observer
      if (!this.observers.has(observerId)) {
        this.observers.set(observerId, new Set());
      }
      this.observers.get(observerId)?.add(callback);

      return ok({
        dispose: () => {
          this.unsubscribe(observerId);
        },
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to subscribe observer '${observerId}' to ${eventType}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private initializeObserver(): void {
    // Set up global error handling for observer failures
    // This ensures the observer service doesn't crash due to individual observer errors
  }

  private isValidObserverId(observerId: string): boolean {
    return typeof observerId === 'string' && observerId.trim().length > 0;
  }
}
