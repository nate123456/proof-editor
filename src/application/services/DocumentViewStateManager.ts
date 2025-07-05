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
 * Document-specific view state manager
 *
 * Manages view state per document with proper isolation and URI-based keys.
 * Enables multi-document workflows where each proof file maintains its own
 * viewport, selection, and panel state independently.
 */
export class DocumentViewStateManager {
  private readonly observers = new Set<(event: ViewStateChangeEvent) => void>();

  constructor(
    private readonly storagePort: IViewStatePort,
    private readonly documentUri: string,
  ) {}

  async getSelectionState(): Promise<Result<SelectionState, ValidationError>> {
    return this.loadState('selection', createSelectionState, validateSelectionState);
  }

  async updateSelectionState(state: SelectionState): Promise<Result<void, ValidationError>> {
    return this.saveState('selection', state, validateSelectionState, 'selection-changed');
  }

  async getViewportState(): Promise<Result<ViewportState, ValidationError>> {
    return this.loadState('viewport', createViewportState, validateViewportState);
  }

  async updateViewportState(state: ViewportState): Promise<Result<void, ValidationError>> {
    return this.saveState('viewport', state, validateViewportState, 'viewport-changed');
  }

  async getPanelState(): Promise<Result<PanelState, ValidationError>> {
    return this.loadState('panel', createPanelState, validatePanelState);
  }

  async updatePanelState(state: PanelState): Promise<Result<void, ValidationError>> {
    return this.saveState('panel', state, validatePanelState, 'panel-changed');
  }

  async getThemeState(): Promise<Result<ThemeState, ValidationError>> {
    // Theme state is global, not document-specific
    return this.loadGlobalState('theme', createThemeState, validateThemeState);
  }

  async updateThemeState(state: ThemeState): Promise<Result<void, ValidationError>> {
    // Theme state is global, not document-specific
    return this.saveGlobalState('theme', state, validateThemeState, 'theme-changed');
  }

  async clearDocumentState(): Promise<Result<void, ValidationError>> {
    try {
      const clearResults = await Promise.all([
        this.storagePort.clearViewState(this.buildDocumentKey('selection')),
        this.storagePort.clearViewState(this.buildDocumentKey('viewport')),
        this.storagePort.clearViewState(this.buildDocumentKey('panel')),
      ]);

      for (const result of clearResults) {
        if (result.isErr()) {
          return err(
            new ValidationError(`Failed to clear document state: ${result.error.message}`),
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to clear document state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async clearAllDocumentStates(): Promise<Result<void, ValidationError>> {
    try {
      // Get all state keys and filter for this document
      const allKeysResult = await this.storagePort.getAllStateKeys();
      if (allKeysResult.isErr()) {
        return err(allKeysResult.error);
      }

      const documentPrefix = this.sanitizeDocumentUri(this.documentUri);
      const documentKeys = allKeysResult.value.filter((key) => key.startsWith(documentPrefix));

      const clearPromises = documentKeys.map((key) => this.storagePort.clearViewState(key));
      const clearResults = await Promise.all(clearPromises);

      for (const result of clearResults) {
        if (result.isErr()) {
          return err(
            new ValidationError(`Failed to clear document states: ${result.error.message}`),
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to clear all document states: ${error instanceof Error ? error.message : String(error)}`,
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

  getDocumentUri(): string {
    return this.documentUri;
  }

  private async loadState<T>(
    stateType: string,
    createDefault: () => T,
    validate: (state: T) => Result<void, ValidationError>,
  ): Promise<Result<T, ValidationError>> {
    try {
      const key = this.buildDocumentKey(stateType);
      const loadResult = await this.storagePort.loadViewState(key);
      if (loadResult.isErr()) {
        return err(
          new ValidationError(`Failed to load ${stateType} state: ${loadResult.error.message}`),
        );
      }

      if (loadResult.value === null) {
        return ok(createDefault());
      }

      // Type-safe reconstruction from stored data
      const stored = loadResult.value as Record<string, unknown>;
      const state = this.reconstructState(stateType, stored, createDefault);

      const validationResult = validate(state);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      return ok(state);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to load ${stateType} state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private async loadGlobalState<T>(
    stateType: string,
    createDefault: () => T,
    validate: (state: T) => Result<void, ValidationError>,
  ): Promise<Result<T, ValidationError>> {
    try {
      const loadResult = await this.storagePort.loadViewState(stateType);
      if (loadResult.isErr()) {
        return err(
          new ValidationError(`Failed to load ${stateType} state: ${loadResult.error.message}`),
        );
      }

      if (loadResult.value === null) {
        return ok(createDefault());
      }

      // Type-safe reconstruction from stored data
      const stored = loadResult.value as Record<string, unknown>;
      const state = this.reconstructState(stateType, stored, createDefault);

      const validationResult = validate(state);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      return ok(state);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to load ${stateType} state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private async saveState<T extends SelectionState | ViewportState | PanelState | ThemeState>(
    stateType: string,
    state: T,
    validate: (state: T) => Result<void, ValidationError>,
    eventType: ViewStateChangeEvent['type'],
  ): Promise<Result<void, ValidationError>> {
    const validationResult = validate(state);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    try {
      const key = this.buildDocumentKey(stateType);
      const saveResult = await this.storagePort.saveViewState(key, state);
      if (saveResult.isErr()) {
        return err(
          new ValidationError(`Failed to save ${stateType} state: ${saveResult.error.message}`),
        );
      }

      this.notifyObservers({
        type: eventType,
        newState: state,
        timestamp: Date.now(),
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to save ${stateType} state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private async saveGlobalState<T extends SelectionState | ViewportState | PanelState | ThemeState>(
    stateType: string,
    state: T,
    validate: (state: T) => Result<void, ValidationError>,
    eventType: ViewStateChangeEvent['type'],
  ): Promise<Result<void, ValidationError>> {
    const validationResult = validate(state);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    try {
      const saveResult = await this.storagePort.saveViewState(stateType, state);
      if (saveResult.isErr()) {
        return err(
          new ValidationError(`Failed to save ${stateType} state: ${saveResult.error.message}`),
        );
      }

      this.notifyObservers({
        type: eventType,
        newState: state,
        timestamp: Date.now(),
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to save ${stateType} state: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private reconstructState<T>(
    stateType: string,
    stored: Record<string, unknown>,
    createDefault: () => T,
  ): T {
    switch (stateType) {
      case 'selection':
        return createSelectionState(
          (stored.selectedNodes as string[]) || [],
          (stored.selectedStatements as string[]) || [],
          (stored.selectedTrees as string[]) || [],
        ) as T;
      case 'viewport':
        return createViewportState(
          (stored.zoom as number) || 1.0,
          (stored.pan as { x: number; y: number }) || { x: 0, y: 0 },
          (stored.center as { x: number; y: number }) || { x: 0, y: 0 },
        ) as T;
      case 'panel':
        return createPanelState(
          (stored.miniMapVisible as boolean) ?? true,
          (stored.sideLabelsVisible as boolean) ?? true,
          (stored.validationPanelVisible as boolean) ?? false,
          (stored.panelSizes as Record<string, number>) || {},
        ) as T;
      case 'theme':
        return createThemeState(
          (stored.colorScheme as 'light' | 'dark' | 'auto') || 'auto',
          (stored.fontSize as number) || 14,
          (stored.fontFamily as string) || 'default',
        ) as T;
      default:
        return createDefault();
    }
  }

  private buildDocumentKey(stateType: string): string {
    const sanitizedUri = this.sanitizeDocumentUri(this.documentUri);
    return `${sanitizedUri}.${stateType}`;
  }

  private sanitizeDocumentUri(uri: string): string {
    // Convert URI to a safe storage key by replacing problematic characters
    return uri
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars with underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  private notifyObservers(event: ViewStateChangeEvent): void {
    for (const observer of this.observers) {
      try {
        observer(event);
      } catch (_error) {
        // Swallow observer errors to prevent cascade failures
        if (process.env.NODE_ENV === 'development') {
          // Could add debug logging here in development
        }
      }
    }
  }
}
