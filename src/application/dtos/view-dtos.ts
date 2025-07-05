import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import type { AtomicArgumentDTO } from '../queries/shared-types.js';
import type { StatementDTO } from '../queries/statement-queries.js';

/**
 * DTO for rendered tree with calculated layout and positioning
 */
export interface TreeRenderDTO {
  id: string;
  position: { x: number; y: number };
  layout: TreeLayoutDTO;
  bounds: { width: number; height: number };
}

/**
 * DTO for tree layout containing positioned nodes and connections
 */
export interface TreeLayoutDTO {
  nodes: RenderedNodeDTO[];
  connections: ConnectionDTO[];
  dimensions: { width: number; height: number };
}

/**
 * DTO for rendered node with position, dimensions, and content
 */
export interface RenderedNodeDTO {
  id: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  argument: AtomicArgumentDTO;
  premises: StatementDTO[];
  conclusions: StatementDTO[];
  sideLabel?: string;
}

/**
 * DTO for connection between nodes with calculated coordinates
 */
export interface ConnectionDTO {
  fromNodeId: string;
  toNodeId: string;
  fromPosition: number;
  toPosition: number;
  coordinates: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
}

/**
 * DTO for complete proof visualization with all trees and metadata
 */
export interface ProofVisualizationDTO {
  documentId: string;
  version: number;
  trees: TreeRenderDTO[];
  totalDimensions: { width: number; height: number };
  isEmpty: boolean;
}

/**
 * Configuration for tree layout calculations
 */
export interface TreeLayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  verticalSpacing: number;
  horizontalSpacing: number;
  treeSpacing: number;
  canvasMargin: number;
}

/**
 * Internal data structure for tree node relationships
 */
export interface TreeNodeData {
  nodeId: string;
  argumentId: string;
  parentId?: string;
  premisePosition?: number;
}

// Type guards for view DTOs
export function isTreeRenderDTO(obj: unknown): obj is TreeRenderDTO {
  if (typeof obj !== 'object' || obj === null) return false;

  const dto = obj as Record<string, unknown>;
  return (
    typeof dto.id === 'string' &&
    typeof dto.position === 'object' &&
    dto.position !== null &&
    typeof (dto.position as Record<string, unknown>).x === 'number' &&
    typeof (dto.position as Record<string, unknown>).y === 'number' &&
    typeof dto.layout === 'object' &&
    dto.layout !== null &&
    typeof dto.bounds === 'object' &&
    dto.bounds !== null &&
    typeof (dto.bounds as Record<string, unknown>).width === 'number' &&
    typeof (dto.bounds as Record<string, unknown>).height === 'number'
  );
}

export function isTreeLayoutDTO(obj: unknown): obj is TreeLayoutDTO {
  if (typeof obj !== 'object' || obj === null) return false;

  const dto = obj as Record<string, unknown>;
  return (
    Array.isArray(dto.nodes) &&
    Array.isArray(dto.connections) &&
    typeof dto.dimensions === 'object' &&
    dto.dimensions !== null &&
    typeof (dto.dimensions as Record<string, unknown>).width === 'number' &&
    typeof (dto.dimensions as Record<string, unknown>).height === 'number'
  );
}

export function isRenderedNodeDTO(obj: unknown): obj is RenderedNodeDTO {
  if (typeof obj !== 'object' || obj === null) return false;

  const dto = obj as Record<string, unknown>;
  return (
    typeof dto.id === 'string' &&
    typeof dto.position === 'object' &&
    dto.position !== null &&
    typeof (dto.position as Record<string, unknown>).x === 'number' &&
    typeof (dto.position as Record<string, unknown>).y === 'number' &&
    typeof dto.dimensions === 'object' &&
    dto.dimensions !== null &&
    typeof (dto.dimensions as Record<string, unknown>).width === 'number' &&
    typeof (dto.dimensions as Record<string, unknown>).height === 'number' &&
    typeof dto.argument === 'object' &&
    dto.argument !== null &&
    Array.isArray(dto.premises) &&
    Array.isArray(dto.conclusions)
  );
}

export function isConnectionDTO(obj: unknown): obj is ConnectionDTO {
  if (typeof obj !== 'object' || obj === null) return false;

  const dto = obj as Record<string, unknown>;
  return (
    typeof dto.fromNodeId === 'string' &&
    typeof dto.toNodeId === 'string' &&
    typeof dto.fromPosition === 'number' &&
    typeof dto.toPosition === 'number' &&
    typeof dto.coordinates === 'object' &&
    dto.coordinates !== null &&
    typeof (dto.coordinates as Record<string, unknown>).startX === 'number' &&
    typeof (dto.coordinates as Record<string, unknown>).startY === 'number' &&
    typeof (dto.coordinates as Record<string, unknown>).endX === 'number' &&
    typeof (dto.coordinates as Record<string, unknown>).endY === 'number'
  );
}

export function isProofVisualizationDTO(obj: unknown): obj is ProofVisualizationDTO {
  if (typeof obj !== 'object' || obj === null) return false;

  const dto = obj as Record<string, unknown>;
  return (
    typeof dto.documentId === 'string' &&
    typeof dto.version === 'number' &&
    Array.isArray(dto.trees) &&
    typeof dto.totalDimensions === 'object' &&
    dto.totalDimensions !== null &&
    typeof (dto.totalDimensions as Record<string, unknown>).width === 'number' &&
    typeof (dto.totalDimensions as Record<string, unknown>).height === 'number' &&
    typeof dto.isEmpty === 'boolean'
  );
}

// Factory functions for view DTOs
export function createTreeRenderDTO(
  id: string,
  position: { x: number; y: number },
  layout: TreeLayoutDTO,
  bounds: { width: number; height: number },
): TreeRenderDTO {
  return {
    id,
    position,
    layout,
    bounds,
  };
}

export function createTreeLayoutDTO(
  nodes: RenderedNodeDTO[],
  connections: ConnectionDTO[],
  dimensions: { width: number; height: number },
): TreeLayoutDTO {
  return {
    nodes,
    connections,
    dimensions,
  };
}

export function createRenderedNodeDTO(
  id: string,
  position: { x: number; y: number },
  dimensions: { width: number; height: number },
  argument: AtomicArgumentDTO,
  premises: StatementDTO[],
  conclusions: StatementDTO[],
  sideLabel?: string,
): RenderedNodeDTO {
  const node: RenderedNodeDTO = {
    id,
    position,
    dimensions,
    argument,
    premises,
    conclusions,
  };

  if (sideLabel !== undefined) {
    node.sideLabel = sideLabel;
  }

  return node;
}

export function createConnectionDTO(
  fromNodeId: string,
  toNodeId: string,
  fromPosition: number,
  toPosition: number,
  coordinates: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  },
): ConnectionDTO {
  return {
    fromNodeId,
    toNodeId,
    fromPosition,
    toPosition,
    coordinates,
  };
}

export function createProofVisualizationDTO(
  documentId: string,
  version: number,
  trees: TreeRenderDTO[],
  totalDimensions: { width: number; height: number },
  isEmpty: boolean,
): ProofVisualizationDTO {
  return {
    documentId,
    version,
    trees,
    totalDimensions,
    isEmpty,
  };
}

/**
 * Configuration options for proof visualization
 */
export interface ProofVisualizationConfig {
  layout: TreeLayoutConfig;
  performance: {
    maxTreesRendered: number;
    maxNodesPerTree: number;
    enableVirtualization: boolean;
  };
  visual: {
    showConnectionLabels: boolean;
    highlightCriticalPath: boolean;
    showValidationErrors: boolean;
  };
}

// P3 View State Management DTOs

/**
 * Selection state for nodes, statements, and trees
 */
export interface SelectionState {
  selectedNodes: string[];
  selectedStatements: string[];
  selectedTrees: string[];
}

/**
 * Viewport state for zoom, pan, and center position
 */
export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
  center: { x: number; y: number };
}

/**
 * Panel state for UI panel visibility and sizes
 */
export interface PanelState {
  miniMapVisible: boolean;
  sideLabelsVisible: boolean;
  validationPanelVisible: boolean;
  panelSizes: Record<string, number>;
}

/**
 * Theme state for color scheme and font preferences
 */
export interface ThemeState {
  colorScheme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
}

/**
 * View state change event for reactive updates
 */
export interface ViewStateChangeEvent {
  type: 'selection-changed' | 'viewport-changed' | 'panel-changed' | 'theme-changed';
  newState: SelectionState | ViewportState | PanelState | ThemeState;
  timestamp: number;
}

/**
 * Disposable for managing subscriptions
 */
export interface Disposable {
  dispose(): void;
}

// Factory functions for immutable state creation

export function createSelectionState(
  selectedNodes: string[] = [],
  selectedStatements: string[] = [],
  selectedTrees: string[] = [],
): SelectionState {
  return {
    selectedNodes: [...selectedNodes],
    selectedStatements: [...selectedStatements],
    selectedTrees: [...selectedTrees],
  };
}

export function createViewportState(
  zoom: number = 1.0,
  pan: { x: number; y: number } = { x: 0, y: 0 },
  center: { x: number; y: number } = { x: 0, y: 0 },
): ViewportState {
  return {
    zoom,
    pan: { ...pan },
    center: { ...center },
  };
}

export function createPanelState(
  miniMapVisible: boolean = true,
  sideLabelsVisible: boolean = true,
  validationPanelVisible: boolean = false,
  panelSizes: Record<string, number> = {},
): PanelState {
  return {
    miniMapVisible,
    sideLabelsVisible,
    validationPanelVisible,
    panelSizes: { ...panelSizes },
  };
}

export function createThemeState(
  colorScheme: 'light' | 'dark' | 'auto' = 'auto',
  fontSize: number = 14,
  fontFamily: string = 'default',
): ThemeState {
  return {
    colorScheme,
    fontSize,
    fontFamily,
  };
}

// Validation functions

export function validateSelectionState(state: SelectionState): Result<void, ValidationError> {
  // Check types first
  if (!Array.isArray(state.selectedNodes)) {
    return err(new ValidationError('selectedNodes must be an array'));
  }
  if (!Array.isArray(state.selectedStatements)) {
    return err(new ValidationError('selectedStatements must be an array'));
  }
  if (!Array.isArray(state.selectedTrees)) {
    return err(new ValidationError('selectedTrees must be an array'));
  }

  // Check for duplicate nodes
  const uniqueNodes = new Set(state.selectedNodes);
  if (uniqueNodes.size !== state.selectedNodes.length) {
    return err(new ValidationError('Duplicate nodes in selection'));
  }

  // Check for duplicate statements
  const uniqueStatements = new Set(state.selectedStatements);
  if (uniqueStatements.size !== state.selectedStatements.length) {
    return err(new ValidationError('Duplicate statements in selection'));
  }

  // Check for duplicate trees
  const uniqueTrees = new Set(state.selectedTrees);
  if (uniqueTrees.size !== state.selectedTrees.length) {
    return err(new ValidationError('Duplicate trees in selection'));
  }

  // Check for valid node IDs
  if (state.selectedNodes.some((id) => !id || id.trim() === '')) {
    return err(new ValidationError('Node ID cannot be empty'));
  }

  // Check for valid statement IDs
  if (state.selectedStatements.some((id) => !id || id.trim() === '')) {
    return err(new ValidationError('Statement ID cannot be empty'));
  }

  // Check for valid tree IDs
  if (state.selectedTrees.some((id) => !id || id.trim() === '')) {
    return err(new ValidationError('Tree ID cannot be empty'));
  }

  return ok(undefined);
}

export function validateViewportState(state: ViewportState): Result<void, ValidationError> {
  // Check zoom constraints
  if (state.zoom < 0.1 || state.zoom > 10.0) {
    return err(new ValidationError('Zoom must be between 0.1 and 10.0'));
  }

  // Check pan coordinates are finite
  if (!Number.isFinite(state.pan.x) || !Number.isFinite(state.pan.y)) {
    return err(new ValidationError('Pan coordinates must be finite'));
  }

  // Check center coordinates are finite
  if (!Number.isFinite(state.center.x) || !Number.isFinite(state.center.y)) {
    return err(new ValidationError('Center coordinates must be finite'));
  }

  return ok(undefined);
}

export function validatePanelState(state: PanelState): Result<void, ValidationError> {
  // Check panel sizes are positive
  for (const [panel, size] of Object.entries(state.panelSizes)) {
    if (!Number.isFinite(size)) {
      return err(new ValidationError(`Panel sizes must be finite numbers: ${panel}`));
    }
    if (size < 0) {
      return err(new ValidationError(`Panel sizes must be positive: ${panel}`));
    }
  }

  return ok(undefined);
}

export function validateThemeState(state: ThemeState): Result<void, ValidationError> {
  // Check color scheme
  if (!['light', 'dark', 'auto'].includes(state.colorScheme)) {
    return err(new ValidationError('Invalid color scheme'));
  }

  // Check font size
  if (state.fontSize < 8 || state.fontSize > 32) {
    return err(new ValidationError('Font size must be between 8 and 32'));
  }

  // Check font family is not empty
  if (!state.fontFamily || state.fontFamily.trim() === '') {
    return err(new ValidationError('Font family cannot be empty'));
  }

  return ok(undefined);
}

// Type guards

export function isSelectionState(obj: unknown): obj is SelectionState {
  if (typeof obj !== 'object' || obj === null) return false;

  const state = obj as Record<string, unknown>;
  return (
    Array.isArray(state.selectedNodes) &&
    Array.isArray(state.selectedStatements) &&
    Array.isArray(state.selectedTrees) &&
    state.selectedNodes.every((id) => typeof id === 'string') &&
    state.selectedStatements.every((id) => typeof id === 'string') &&
    state.selectedTrees.every((id) => typeof id === 'string')
  );
}

export function isViewportState(obj: unknown): obj is ViewportState {
  if (typeof obj !== 'object' || obj === null) return false;

  const state = obj as Record<string, unknown>;
  return (
    typeof state.zoom === 'number' &&
    typeof state.pan === 'object' &&
    state.pan !== null &&
    typeof (state.pan as Record<string, unknown>).x === 'number' &&
    typeof (state.pan as Record<string, unknown>).y === 'number' &&
    typeof state.center === 'object' &&
    state.center !== null &&
    typeof (state.center as Record<string, unknown>).x === 'number' &&
    typeof (state.center as Record<string, unknown>).y === 'number'
  );
}

export function isPanelState(obj: unknown): obj is PanelState {
  if (typeof obj !== 'object' || obj === null) return false;

  const state = obj as Record<string, unknown>;
  return (
    typeof state.miniMapVisible === 'boolean' &&
    typeof state.sideLabelsVisible === 'boolean' &&
    typeof state.validationPanelVisible === 'boolean' &&
    typeof state.panelSizes === 'object' &&
    state.panelSizes !== null &&
    Object.values(state.panelSizes as Record<string, unknown>).every(
      (size) => typeof size === 'number',
    )
  );
}

export function isThemeState(obj: unknown): obj is ThemeState {
  if (typeof obj !== 'object' || obj === null) return false;

  const state = obj as Record<string, unknown>;
  return (
    typeof state.colorScheme === 'string' &&
    ['light', 'dark', 'auto'].includes(state.colorScheme) &&
    typeof state.fontSize === 'number' &&
    typeof state.fontFamily === 'string'
  );
}

export function isViewStateChangeEvent(obj: unknown): obj is ViewStateChangeEvent {
  if (typeof obj !== 'object' || obj === null) return false;

  const event = obj as Record<string, unknown>;
  return (
    typeof event.type === 'string' &&
    ['selection-changed', 'viewport-changed', 'panel-changed', 'theme-changed'].includes(
      event.type,
    ) &&
    typeof event.newState === 'object' &&
    event.newState !== null &&
    typeof event.timestamp === 'number' &&
    event.timestamp > 0
  );
}
