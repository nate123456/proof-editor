import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import {
  FontFamily,
  FontSize,
  NodeId,
  PanelSize,
  Position2D,
  TreeId,
  ZoomLevel,
} from '../../domain/shared/value-objects/index.js';
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
      case 'selection': {
        const nodeIds: NodeId[] = [];
        const treeIds: TreeId[] = [];

        // Reconstruct NodeId value objects
        const storedNodeIds = (stored.selectedNodes as string[]) || [];
        for (const id of storedNodeIds) {
          const nodeIdResult = NodeId.create(id);
          if (nodeIdResult.isOk()) {
            nodeIds.push(nodeIdResult.value);
          }
        }

        // Reconstruct TreeId value objects
        const storedTreeIds = (stored.selectedTrees as string[]) || [];
        for (const id of storedTreeIds) {
          const treeIdResult = TreeId.create(id);
          if (treeIdResult.isOk()) {
            treeIds.push(treeIdResult.value);
          }
        }

        return createSelectionState(
          nodeIds,
          (stored.selectedStatements as string[]) || [],
          treeIds,
        ) as T;
      }
      case 'viewport': {
        // Reconstruct ZoomLevel
        const storedZoom = (stored.zoom as number) || 1.0;
        const zoomResult = ZoomLevel.create(storedZoom);
        const zoom = zoomResult.isOk() ? zoomResult.value : ZoomLevel.normal();

        // Reconstruct Position2D for pan
        const storedPan = (stored.pan as { x: number; y: number }) || { x: 0, y: 0 };
        const panResult = Position2D.create(storedPan.x, storedPan.y);
        const pan = panResult.isOk() ? panResult.value : Position2D.origin();

        // Reconstruct Position2D for center
        const storedCenter = (stored.center as { x: number; y: number }) || { x: 0, y: 0 };
        const centerResult = Position2D.create(storedCenter.x, storedCenter.y);
        const center = centerResult.isOk() ? centerResult.value : Position2D.origin();

        return createViewportState(zoom, pan, center) as T;
      }
      case 'panel': {
        // Reconstruct PanelSize value objects
        const panelSizes: Record<string, PanelSize> = {};
        const storedSizes = (stored.panelSizes as Record<string, number>) || {};

        for (const [key, value] of Object.entries(storedSizes)) {
          const sizeResult = PanelSize.create(value);
          if (sizeResult.isOk()) {
            panelSizes[key] = sizeResult.value;
          }
        }

        return createPanelState(
          (stored.miniMapVisible as boolean) ?? true,
          (stored.sideLabelsVisible as boolean) ?? true,
          (stored.validationPanelVisible as boolean) ?? false,
          panelSizes,
        ) as T;
      }
      case 'theme': {
        // Reconstruct FontSize
        const storedFontSize = (stored.fontSize as number) || 14;
        const fontSizeResult = FontSize.create(storedFontSize);
        const fontSize = fontSizeResult.isOk() ? fontSizeResult.value : FontSize.default();

        // Reconstruct FontFamily
        const storedFontFamily = (stored.fontFamily as string) || 'default';
        const fontFamilyResult = FontFamily.create(storedFontFamily);
        const fontFamily = fontFamilyResult.isOk()
          ? fontFamilyResult.value
          : FontFamily.defaultSansSerif();

        return createThemeState(
          (stored.colorScheme as 'light' | 'dark' | 'auto') || 'auto',
          fontSize,
          fontFamily,
        ) as T;
      }
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
