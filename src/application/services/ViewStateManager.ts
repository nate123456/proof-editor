import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import type {
  Disposable,
  PanelState,
  SelectionState,
  ThemeState,
  ViewportState,
  ViewStateChangeEvent,
} from '../dtos/view-dtos.js';
import {
  createPanelState,
  createSelectionState,
  createThemeState,
  createViewportState,
  validatePanelState,
  validateSelectionState,
  validateThemeState,
  validateViewportState,
} from '../dtos/view-dtos.js';
import type { IViewStatePort } from '../ports/IViewStatePort.js';

/**
 * Central state management service for presentation layer
 *
 * Manages selection, viewport, panel, and theme state with validation,
 * persistence, and reactive updates following CLEAN architecture principles.
 */
export class ViewStateManager {
  private readonly observers = new Set<(event: ViewStateChangeEvent) => void>();

  constructor(private readonly storagePort: IViewStatePort) {}

  async getSelectionState(): Promise<Result<SelectionState, ValidationError>> {
    try {
      const loadResult = await this.storagePort.loadViewState('selection');
      if (loadResult.isErr()) {
        return err(
          new ValidationError(`Failed to load selection state: ${loadResult.error.message}`),
        );
      }

      if (loadResult.value === null) {
        return ok(createSelectionState());
      }

      // Type-safe reconstruction from stored data
      const stored = loadResult.value as Record<string, unknown>;

      // Validate types before reconstruction
      if (stored.selectedNodes !== undefined && !Array.isArray(stored.selectedNodes)) {
        return err(new ValidationError('selectedNodes must be an array'));
      }
      if (stored.selectedStatements !== undefined && !Array.isArray(stored.selectedStatements)) {
        return err(new ValidationError('selectedStatements must be an array'));
      }
      if (stored.selectedTrees !== undefined && !Array.isArray(stored.selectedTrees)) {
        return err(new ValidationError('selectedTrees must be an array'));
      }

      const state = createSelectionState(
        (stored.selectedNodes as string[]) || [],
        (stored.selectedStatements as string[]) || [],
        (stored.selectedTrees as string[]) || [],
      );

      const validationResult = validateSelectionState(state);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      return ok(state);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to load selection state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async updateSelectionState(state: SelectionState): Promise<Result<void, ValidationError>> {
    const validationResult = validateSelectionState(state);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    try {
      const saveResult = await this.storagePort.saveViewState('selection', state);
      if (saveResult.isErr()) {
        return err(
          new ValidationError(`Failed to save selection state: ${saveResult.error.message}`),
        );
      }

      this.notifyObservers({
        type: 'selection-changed',
        newState: state,
        timestamp: Date.now(),
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to save selection state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getViewportState(): Promise<Result<ViewportState, ValidationError>> {
    try {
      const loadResult = await this.storagePort.loadViewState('viewport');
      if (loadResult.isErr()) {
        return err(
          new ValidationError(`Failed to load viewport state: ${loadResult.error.message}`),
        );
      }

      if (loadResult.value === null) {
        return ok(createViewportState());
      }

      // Type-safe reconstruction from stored data
      const stored = loadResult.value as Record<string, unknown>;
      const state = createViewportState(
        (stored.zoom as number) || 1.0,
        (stored.pan as { x: number; y: number }) || { x: 0, y: 0 },
        (stored.center as { x: number; y: number }) || { x: 0, y: 0 },
      );

      const validationResult = validateViewportState(state);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      return ok(state);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to load viewport state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async updateViewportState(state: ViewportState): Promise<Result<void, ValidationError>> {
    const validationResult = validateViewportState(state);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    try {
      const saveResult = await this.storagePort.saveViewState('viewport', state);
      if (saveResult.isErr()) {
        return err(
          new ValidationError(`Failed to save viewport state: ${saveResult.error.message}`),
        );
      }

      this.notifyObservers({
        type: 'viewport-changed',
        newState: state,
        timestamp: Date.now(),
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to save viewport state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getPanelState(): Promise<Result<PanelState, ValidationError>> {
    try {
      const loadResult = await this.storagePort.loadViewState('panel');
      if (loadResult.isErr()) {
        return err(new ValidationError(`Failed to load panel state: ${loadResult.error.message}`));
      }

      if (loadResult.value === null) {
        return ok(createPanelState());
      }

      // Type-safe reconstruction from stored data
      const stored = loadResult.value as Record<string, unknown>;
      const state = createPanelState(
        (stored.miniMapVisible as boolean) ?? true,
        (stored.sideLabelsVisible as boolean) ?? true,
        (stored.validationPanelVisible as boolean) ?? false,
        (stored.panelSizes as Record<string, number>) || {},
      );

      const validationResult = validatePanelState(state);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      return ok(state);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to load panel state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async updatePanelState(state: PanelState): Promise<Result<void, ValidationError>> {
    const validationResult = validatePanelState(state);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    try {
      const saveResult = await this.storagePort.saveViewState('panel', state);
      if (saveResult.isErr()) {
        return err(new ValidationError(`Failed to save panel state: ${saveResult.error.message}`));
      }

      this.notifyObservers({
        type: 'panel-changed',
        newState: state,
        timestamp: Date.now(),
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to save panel state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getThemeState(): Promise<Result<ThemeState, ValidationError>> {
    try {
      const loadResult = await this.storagePort.loadViewState('theme');
      if (loadResult.isErr()) {
        return err(new ValidationError(`Failed to load theme state: ${loadResult.error.message}`));
      }

      if (loadResult.value === null) {
        return ok(createThemeState());
      }

      // Type-safe reconstruction from stored data
      const stored = loadResult.value as Record<string, unknown>;
      const state = createThemeState(
        (stored.colorScheme as 'light' | 'dark' | 'auto') || 'auto',
        (stored.fontSize as number) || 14,
        (stored.fontFamily as string) || 'default',
      );

      const validationResult = validateThemeState(state);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      return ok(state);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to load theme state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async updateThemeState(state: ThemeState): Promise<Result<void, ValidationError>> {
    const validationResult = validateThemeState(state);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    try {
      const saveResult = await this.storagePort.saveViewState('theme', state);
      if (saveResult.isErr()) {
        return err(new ValidationError(`Failed to save theme state: ${saveResult.error.message}`));
      }

      this.notifyObservers({
        type: 'theme-changed',
        newState: state,
        timestamp: Date.now(),
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to save theme state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async clearAllState(): Promise<Result<void, ValidationError>> {
    try {
      const clearResults = await Promise.all([
        this.storagePort.clearViewState('selection'),
        this.storagePort.clearViewState('viewport'),
        this.storagePort.clearViewState('panel'),
        this.storagePort.clearViewState('theme'),
      ]);

      for (const result of clearResults) {
        if (result.isErr()) {
          return err(new ValidationError(`Failed to clear view state: ${result.error.message}`));
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to clear view state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  subscribeToChanges(callback: (event: ViewStateChangeEvent) => void): Disposable {
    this.observers.add(callback);

    return {
      dispose: () => {
        this.observers.delete(callback);
      },
    };
  }

  private notifyObservers(event: ViewStateChangeEvent): void {
    for (const observer of this.observers) {
      try {
        observer(event);
      } catch (_error) {
        // Swallow observer errors to prevent cascade failures
        // Log error in development/debug mode only
        if (process.env.NODE_ENV === 'development') {
          // Could add debug logging here in development
        }
      }
    }
  }
}
