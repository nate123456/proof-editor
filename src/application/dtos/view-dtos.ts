import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import {
  Dimensions,
  DocumentId,
  FontFamily,
  FontSize,
  Margin,
  type MaxNodeCount,
  type MaxTreeCount,
  NodeDimension,
  type NodeId,
  PanelSize,
  Position2D,
  type SideLabel,
  Spacing,
  TreeId,
  Version,
  ZoomLevel,
} from '../../domain/shared/value-objects/index.js';
import type { AtomicArgumentDTO } from '../queries/shared-types.js';
import type { StatementDTO } from '../queries/statement-queries.js';

/**
 * DTO for rendered tree with calculated layout and positioning
 */
export interface TreeRenderDTO {
  id: TreeId;
  position: Position2D;
  layout: TreeLayoutDTO;
  bounds: Dimensions;
}

/**
 * DTO for tree layout containing positioned nodes and connections
 */
export interface TreeLayoutDTO {
  nodes: RenderedNodeDTO[];
  connections: ConnectionDTO[];
  dimensions: Dimensions;
}

/**
 * DTO for rendered node with position, dimensions, and content
 */
export interface RenderedNodeDTO {
  id: NodeId;
  position: Position2D;
  dimensions: Dimensions;
  argument: AtomicArgumentDTO;
  premises: StatementDTO[];
  conclusions: StatementDTO[];
  sideLabel?: SideLabel;
}

/**
 * DTO for connection between nodes with calculated coordinates
 */
export interface ConnectionDTO {
  fromNodeId: NodeId;
  toNodeId: NodeId;
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
  documentId: DocumentId;
  version: Version;
  trees: TreeRenderDTO[];
  totalDimensions: Dimensions;
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
 * Strongly-typed configuration for tree layout calculations
 */
export class TypedTreeLayoutConfig {
  private constructor(
    private readonly nodeWidth: NodeDimension,
    private readonly nodeHeight: NodeDimension,
    private readonly verticalSpacing: Spacing,
    private readonly horizontalSpacing: Spacing,
    private readonly treeSpacing: Spacing,
    private readonly canvasMargin: Margin,
  ) {}

  static create(config: {
    nodeWidth: number;
    nodeHeight: number;
    verticalSpacing: number;
    horizontalSpacing: number;
    treeSpacing: number;
    canvasMargin: number;
  }): Result<TypedTreeLayoutConfig, ValidationError> {
    const nodeWidthResult = NodeDimension.create(config.nodeWidth);
    if (nodeWidthResult.isErr()) {
      return nodeWidthResult;
    }

    const nodeHeightResult = NodeDimension.create(config.nodeHeight);
    if (nodeHeightResult.isErr()) {
      return nodeHeightResult;
    }

    const verticalSpacingResult = Spacing.create(config.verticalSpacing);
    if (verticalSpacingResult.isErr()) {
      return verticalSpacingResult;
    }

    const horizontalSpacingResult = Spacing.create(config.horizontalSpacing);
    if (horizontalSpacingResult.isErr()) {
      return horizontalSpacingResult;
    }

    const treeSpacingResult = Spacing.create(config.treeSpacing);
    if (treeSpacingResult.isErr()) {
      return treeSpacingResult;
    }

    const canvasMarginResult = Margin.create(config.canvasMargin);
    if (canvasMarginResult.isErr()) {
      return canvasMarginResult;
    }

    return ok(
      new TypedTreeLayoutConfig(
        nodeWidthResult.value,
        nodeHeightResult.value,
        verticalSpacingResult.value,
        horizontalSpacingResult.value,
        treeSpacingResult.value,
        canvasMarginResult.value,
      ),
    );
  }

  static default(): TypedTreeLayoutConfig {
    return new TypedTreeLayoutConfig(
      NodeDimension.fromNumber(220).value,
      NodeDimension.fromNumber(120).value,
      Spacing.fromNumber(180).value,
      Spacing.fromNumber(280).value,
      Spacing.fromNumber(150).value,
      Margin.fromNumber(50).value,
    );
  }

  getNodeWidth(): NodeDimension {
    return this.nodeWidth;
  }

  getNodeHeight(): NodeDimension {
    return this.nodeHeight;
  }

  getVerticalSpacing(): Spacing {
    return this.verticalSpacing;
  }

  getHorizontalSpacing(): Spacing {
    return this.horizontalSpacing;
  }

  getTreeSpacing(): Spacing {
    return this.treeSpacing;
  }

  getCanvasMargin(): Margin {
    return this.canvasMargin;
  }

  toRaw(): TreeLayoutConfig {
    return {
      nodeWidth: this.nodeWidth.getValue(),
      nodeHeight: this.nodeHeight.getValue(),
      verticalSpacing: this.verticalSpacing.getValue(),
      horizontalSpacing: this.horizontalSpacing.getValue(),
      treeSpacing: this.treeSpacing.getValue(),
      canvasMargin: this.canvasMargin.getValue(),
    };
  }

  withNodeDimensions(width: NodeDimension, height: NodeDimension): TypedTreeLayoutConfig {
    return new TypedTreeLayoutConfig(
      width,
      height,
      this.verticalSpacing,
      this.horizontalSpacing,
      this.treeSpacing,
      this.canvasMargin,
    );
  }

  withSpacing(vertical: Spacing, horizontal: Spacing): TypedTreeLayoutConfig {
    return new TypedTreeLayoutConfig(
      this.nodeWidth,
      this.nodeHeight,
      vertical,
      horizontal,
      this.treeSpacing,
      this.canvasMargin,
    );
  }
}

/**
 * Internal data structure for tree node relationships
 */
export interface TreeNodeData {
  nodeId: NodeId;
  argumentId: string;
  parentId?: NodeId;
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
  id: TreeId,
  position: Position2D,
  layout: TreeLayoutDTO,
  bounds: Dimensions,
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
  dimensions: Dimensions,
): TreeLayoutDTO {
  return {
    nodes,
    connections,
    dimensions,
  };
}

export function createRenderedNodeDTO(
  id: NodeId,
  position: Position2D,
  dimensions: Dimensions,
  argument: AtomicArgumentDTO,
  premises: StatementDTO[],
  conclusions: StatementDTO[],
  sideLabel?: SideLabel,
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
  fromNodeId: NodeId,
  toNodeId: NodeId,
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
  documentId: DocumentId,
  version: Version,
  trees: TreeRenderDTO[],
  totalDimensions: Dimensions,
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
    maxTreesRendered: MaxTreeCount;
    maxNodesPerTree: MaxNodeCount;
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
  selectedNodes: NodeId[];
  selectedStatements: string[];
  selectedTrees: TreeId[];
}

/**
 * Viewport state for zoom, pan, and center position
 */
export interface ViewportState {
  zoom: ZoomLevel;
  pan: Position2D;
  center: Position2D;
}

/**
 * Panel state for UI panel visibility and sizes
 */
export interface PanelState {
  miniMapVisible: boolean;
  sideLabelsVisible: boolean;
  validationPanelVisible: boolean;
  panelSizes: Record<string, PanelSize>;
}

/**
 * Theme state for color scheme and font preferences
 */
export interface ThemeState {
  colorScheme: 'light' | 'dark' | 'auto';
  fontSize: FontSize;
  fontFamily: FontFamily;
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
  selectedNodes: NodeId[] = [],
  selectedStatements: string[] = [],
  selectedTrees: TreeId[] = [],
): SelectionState {
  return {
    selectedNodes: [...selectedNodes],
    selectedStatements: [...selectedStatements],
    selectedTrees: [...selectedTrees],
  };
}

export function createViewportState(
  zoom: ZoomLevel = ZoomLevel.normal(),
  pan: Position2D = Position2D.origin(),
  center: Position2D = Position2D.origin(),
): ViewportState {
  return {
    zoom,
    pan,
    center,
  };
}

export function createPanelState(
  miniMapVisible: boolean = true,
  sideLabelsVisible: boolean = true,
  validationPanelVisible: boolean = false,
  panelSizes: Record<string, PanelSize> = {},
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
  fontSize: FontSize = FontSize.default(),
  fontFamily: FontFamily = FontFamily.defaultSansSerif(),
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
  const uniqueNodes = new Set(state.selectedNodes.map((id) => id.getValue()));
  if (uniqueNodes.size !== state.selectedNodes.length) {
    return err(new ValidationError('Duplicate nodes in selection'));
  }

  // Check for duplicate statements
  const uniqueStatements = new Set(state.selectedStatements);
  if (uniqueStatements.size !== state.selectedStatements.length) {
    return err(new ValidationError('Duplicate statements in selection'));
  }

  // Check for duplicate trees
  const uniqueTrees = new Set(state.selectedTrees.map((id) => id.getValue()));
  if (uniqueTrees.size !== state.selectedTrees.length) {
    return err(new ValidationError('Duplicate trees in selection'));
  }

  // Check for valid node IDs - value objects handle their own validation
  if (state.selectedNodes.some((id) => !id || id.getValue().trim() === '')) {
    return err(new ValidationError('Node ID cannot be empty'));
  }

  // Check for valid statement IDs
  if (state.selectedStatements.some((id) => !id || id.trim() === '')) {
    return err(new ValidationError('Statement ID cannot be empty'));
  }

  // Check for valid tree IDs - value objects handle their own validation
  if (state.selectedTrees.some((id) => !id || id.getValue().trim() === '')) {
    return err(new ValidationError('Tree ID cannot be empty'));
  }

  return ok(undefined);
}

export function validateViewportState(state: ViewportState): Result<void, ValidationError> {
  // Value objects handle their own validation, so we just need to check they exist
  if (!(state.zoom instanceof ZoomLevel)) {
    return err(new ValidationError('Zoom must be a ZoomLevel value object'));
  }

  if (!(state.pan instanceof Position2D)) {
    return err(new ValidationError('Pan must be a Position2D value object'));
  }

  if (!(state.center instanceof Position2D)) {
    return err(new ValidationError('Center must be a Position2D value object'));
  }

  return ok(undefined);
}

export function validatePanelState(state: PanelState): Result<void, ValidationError> {
  // Check panel sizes are value objects
  for (const [panel, size] of Object.entries(state.panelSizes)) {
    if (!(size instanceof PanelSize)) {
      return err(new ValidationError(`Panel sizes must be PanelSize value objects: ${panel}`));
    }
  }

  return ok(undefined);
}

export function validateThemeState(state: ThemeState): Result<void, ValidationError> {
  // Check color scheme
  if (!['light', 'dark', 'auto'].includes(state.colorScheme)) {
    return err(new ValidationError('Invalid color scheme'));
  }

  // Check font size is value object
  if (!(state.fontSize instanceof FontSize)) {
    return err(new ValidationError('Font size must be a FontSize value object'));
  }

  // Check font family is value object
  if (!(state.fontFamily instanceof FontFamily)) {
    return err(new ValidationError('Font family must be a FontFamily value object'));
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
    state.selectedNodes.every((id) => id && typeof id.getValue === 'function') &&
    state.selectedStatements.every((id) => typeof id === 'string') &&
    state.selectedTrees.every((id) => id && typeof id.getValue === 'function')
  );
}

export function isViewportState(obj: unknown): obj is ViewportState {
  if (typeof obj !== 'object' || obj === null) return false;

  const state = obj as Record<string, unknown>;
  return (
    state.zoom instanceof ZoomLevel &&
    state.pan instanceof Position2D &&
    state.center instanceof Position2D
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
      (size) => size instanceof PanelSize,
    )
  );
}

export function isThemeState(obj: unknown): obj is ThemeState {
  if (typeof obj !== 'object' || obj === null) return false;

  const state = obj as Record<string, unknown>;
  return (
    typeof state.colorScheme === 'string' &&
    ['light', 'dark', 'auto'].includes(state.colorScheme) &&
    state.fontSize instanceof FontSize &&
    state.fontFamily instanceof FontFamily
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

// Boundary conversion functions for external API compatibility

/**
 * Raw DTO interfaces for external APIs that expect primitive types
 */
export interface RawTreeRenderDTO {
  id: string;
  position: { x: number; y: number };
  layout: TreeLayoutDTO;
  bounds: { width: number; height: number };
}

export interface RawRenderedNodeDTO {
  id: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  argument: {
    id: string;
    premiseIds: string[];
    conclusionIds: string[];
    sideLabels?: {
      left?: string;
      right?: string;
    };
  };
  premises: unknown[];
  conclusions: unknown[];
  sideLabel?: string;
}

export interface RawConnectionDTO {
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

export interface RawProofVisualizationDTO {
  documentId: string;
  version: number;
  trees: RawTreeRenderDTO[];
  totalDimensions: { width: number; height: number };
  isEmpty: boolean;
}

/**
 * Convert typed DTO to raw primitive DTO for external APIs
 */
export function toRawTreeRenderDTO(dto: TreeRenderDTO): RawTreeRenderDTO {
  return {
    id: dto.id.getValue(),
    position: { x: dto.position.getX(), y: dto.position.getY() },
    layout: dto.layout,
    bounds: { width: dto.bounds.getWidth(), height: dto.bounds.getHeight() },
  };
}

export function toRawRenderedNodeDTO(dto: RenderedNodeDTO): RawRenderedNodeDTO {
  return {
    id: dto.id.getValue(),
    position: { x: dto.position.getX(), y: dto.position.getY() },
    dimensions: { width: dto.dimensions.getWidth(), height: dto.dimensions.getHeight() },
    argument: {
      id: dto.argument.id.getValue(),
      premiseIds: dto.argument.premiseIds.map((id) => id.getValue()),
      conclusionIds: dto.argument.conclusionIds.map((id) => id.getValue()),
      sideLabels: dto.argument.sideLabels
        ? {
            left: dto.argument.sideLabels.left?.getValue(),
            right: dto.argument.sideLabels.right?.getValue(),
          }
        : undefined,
    },
    premises: dto.premises,
    conclusions: dto.conclusions,
    sideLabel: dto.sideLabel?.getValue(),
  };
}

export function toRawConnectionDTO(dto: ConnectionDTO): RawConnectionDTO {
  return {
    fromNodeId: dto.fromNodeId.getValue(),
    toNodeId: dto.toNodeId.getValue(),
    fromPosition: dto.fromPosition,
    toPosition: dto.toPosition,
    coordinates: dto.coordinates,
  };
}

export function toRawProofVisualizationDTO(dto: ProofVisualizationDTO): RawProofVisualizationDTO {
  return {
    documentId: dto.documentId.getValue(),
    version: dto.version.getValue(),
    trees: dto.trees.map(toRawTreeRenderDTO),
    totalDimensions: {
      width: dto.totalDimensions.getWidth(),
      height: dto.totalDimensions.getHeight(),
    },
    isEmpty: dto.isEmpty,
  };
}

/**
 * Convert raw primitive DTO to typed DTO from external APIs
 */
export function fromRawTreeRenderDTO(
  raw: RawTreeRenderDTO,
): Result<TreeRenderDTO, ValidationError> {
  const treeIdResult = TreeId.create(raw.id);
  if (treeIdResult.isErr()) {
    return err(treeIdResult.error);
  }

  const positionResult = Position2D.create(raw.position.x, raw.position.y);
  if (positionResult.isErr()) {
    return err(positionResult.error);
  }

  const boundsResult = Dimensions.create(raw.bounds.width, raw.bounds.height);
  if (boundsResult.isErr()) {
    return err(boundsResult.error);
  }

  return ok({
    id: treeIdResult.value,
    position: positionResult.value,
    layout: raw.layout,
    bounds: boundsResult.value,
  });
}

export function fromRawProofVisualizationDTO(
  raw: RawProofVisualizationDTO,
): Result<ProofVisualizationDTO, ValidationError> {
  const documentIdResult = DocumentId.create(raw.documentId);
  if (documentIdResult.isErr()) {
    return err(documentIdResult.error);
  }

  const versionResult = Version.create(raw.version);
  if (versionResult.isErr()) {
    return err(versionResult.error);
  }

  const totalDimensionsResult = Dimensions.create(
    raw.totalDimensions.width,
    raw.totalDimensions.height,
  );
  if (totalDimensionsResult.isErr()) {
    return err(totalDimensionsResult.error);
  }

  // Convert trees
  const trees: TreeRenderDTO[] = [];
  for (const rawTree of raw.trees) {
    const treeResult = fromRawTreeRenderDTO(rawTree);
    if (treeResult.isErr()) {
      return err(treeResult.error);
    }
    trees.push(treeResult.value);
  }

  return ok({
    documentId: documentIdResult.value,
    version: versionResult.value,
    trees,
    totalDimensions: totalDimensionsResult.value,
    isEmpty: raw.isEmpty,
  });
}
