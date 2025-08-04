/**
 * Shared types for query DTOs to avoid circular dependencies
 */
import {
  type AtomicArgumentId,
  Dimensions,
  ErrorCode,
  ErrorMessage,
  ErrorSeverity,
  NodeCount,
  type NodeId,
  Position2D,
  type SideLabel,
  type StatementId,
  type TreeId,
} from '../../domain/shared/value-objects/index.js';

export interface AtomicArgumentDTO {
  id: AtomicArgumentId;
  premiseIds: StatementId[];
  conclusionIds: StatementId[];
  sideLabels?: {
    left?: SideLabel;
    right?: SideLabel;
  };
}

export interface TreeDTO {
  id: TreeId;
  position: Position2D;
  bounds?: Dimensions;
  nodeCount: NodeCount;
  rootNodeIds: NodeId[];
}

export interface ValidationErrorDTO {
  code: ErrorCode;
  message: ErrorMessage;
  severity: ErrorSeverity;
  location?: {
    treeId?: TreeId;
    nodeId?: NodeId;
    argumentId?: AtomicArgumentId;
  };
}

// Type guards and validation utilities
export function isValidUsageType(usage: unknown): usage is 'premise' | 'conclusion' {
  return typeof usage === 'string' && (usage === 'premise' || usage === 'conclusion');
}

export function isAtomicArgumentDTO(obj: unknown): obj is AtomicArgumentDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  const hasValidId =
    dto.id &&
    typeof dto.id === 'object' &&
    dto.id !== null &&
    typeof (dto.id as any).getValue === 'function';
  const hasValidPremiseIds =
    Array.isArray(dto.premiseIds) &&
    dto.premiseIds.every(
      (id: unknown) => id && typeof (id as { getValue?: () => string }).getValue === 'function',
    );
  const hasValidConclusionIds =
    Array.isArray(dto.conclusionIds) &&
    dto.conclusionIds.every(
      (id: unknown) => id && typeof (id as { getValue?: () => string }).getValue === 'function',
    );

  if (!hasValidId || !hasValidPremiseIds || !hasValidConclusionIds) {
    return false;
  }

  if ('sideLabels' in dto) {
    const labels = dto.sideLabels as Record<string, unknown>;
    if (typeof labels !== 'object' || labels === null) {
      return false;
    }

    if (
      'left' in labels &&
      labels.left &&
      typeof (labels.left as { getValue?: () => string }).getValue !== 'function'
    ) {
      return false;
    }

    if (
      'right' in labels &&
      labels.right &&
      typeof (labels.right as { getValue?: () => string }).getValue !== 'function'
    ) {
      return false;
    }
  }

  return true;
}

export function isValidPosition(position: unknown): position is Position2D {
  return position instanceof Position2D;
}

export function isValidBounds(bounds: unknown): bounds is Dimensions {
  return bounds instanceof Dimensions;
}

export function isTreeDTO(obj: unknown): obj is TreeDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  const hasValidId =
    dto.id &&
    typeof dto.id === 'object' &&
    dto.id !== null &&
    typeof (dto.id as any).getValue === 'function';
  const hasValidPosition = isValidPosition(dto.position);
  const hasValidNodeCount = dto.nodeCount instanceof NodeCount;
  const hasValidRootNodeIds =
    Array.isArray(dto.rootNodeIds) &&
    dto.rootNodeIds.every(
      (id: unknown) => id && typeof (id as { getValue?: () => string }).getValue === 'function',
    );

  if (!hasValidId || !hasValidPosition || !hasValidNodeCount || !hasValidRootNodeIds) {
    return false;
  }

  if ('bounds' in dto) {
    return isValidBounds(dto.bounds);
  }

  return true;
}

export function isValidSeverity(severity: unknown): severity is ErrorSeverity {
  return Object.values(ErrorSeverity).includes(severity as ErrorSeverity);
}

export function isValidationErrorDTO(obj: unknown): obj is ValidationErrorDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  const hasValidCode = dto.code instanceof ErrorCode;
  const hasValidMessage = dto.message instanceof ErrorMessage;
  const hasValidSeverity = isValidSeverity(dto.severity);

  if (!hasValidCode || !hasValidMessage || !hasValidSeverity) {
    return false;
  }

  if ('location' in dto) {
    const location = dto.location as Record<string, unknown>;
    if (typeof location !== 'object' || location === null) {
      return false;
    }

    // Check optional location fields - now value objects
    if (
      'treeId' in location &&
      location.treeId &&
      typeof (location.treeId as { getValue?: () => string }).getValue !== 'function'
    ) {
      return false;
    }
    if (
      'nodeId' in location &&
      location.nodeId &&
      typeof (location.nodeId as { getValue?: () => string }).getValue !== 'function'
    ) {
      return false;
    }
    if (
      'argumentId' in location &&
      location.argumentId &&
      typeof (location.argumentId as { getValue?: () => string }).getValue !== 'function'
    ) {
      return false;
    }
  }

  return true;
}

// Factory functions

export function createAtomicArgumentDTO(
  id: AtomicArgumentId,
  premiseIds: StatementId[],
  conclusionIds: StatementId[],
  sideLabels?: { left?: SideLabel; right?: SideLabel },
): AtomicArgumentDTO {
  if (!id) {
    throw new Error('Argument ID cannot be empty');
  }

  if (!Array.isArray(premiseIds)) {
    throw new Error('Premise IDs must be an array');
  }

  if (!Array.isArray(conclusionIds) || conclusionIds.length === 0) {
    throw new Error('Conclusion IDs must be a non-empty array');
  }

  const dto: AtomicArgumentDTO = {
    id,
    premiseIds: [...premiseIds],
    conclusionIds: [...conclusionIds],
  };

  if (sideLabels) {
    dto.sideLabels = {};
    if (sideLabels.left) dto.sideLabels.left = sideLabels.left;
    if (sideLabels.right) dto.sideLabels.right = sideLabels.right;
  }

  return dto;
}

export function createTreeDTO(
  id: TreeId,
  position: Position2D,
  nodeCount: NodeCount,
  rootNodeIds: NodeId[],
  bounds?: Dimensions,
): TreeDTO {
  if (!id) {
    throw new Error('Tree ID cannot be empty');
  }

  if (!isValidPosition(position)) {
    throw new Error('Invalid position coordinates');
  }

  if (!(nodeCount instanceof NodeCount)) {
    throw new Error('Node count must be a NodeCount value object');
  }

  if (!Array.isArray(rootNodeIds)) {
    throw new Error('Root node IDs must be an array');
  }

  const dto: TreeDTO = {
    id,
    position,
    nodeCount,
    rootNodeIds: [...rootNodeIds],
  };

  if (bounds) {
    if (!isValidBounds(bounds)) {
      throw new Error('Invalid bounds dimensions');
    }
    dto.bounds = bounds;
  }

  return dto;
}

export function createValidationErrorDTO(
  code: ErrorCode,
  message: ErrorMessage,
  severity: ErrorSeverity,
  location?: { treeId?: TreeId; nodeId?: NodeId; argumentId?: AtomicArgumentId },
): ValidationErrorDTO {
  if (!(code instanceof ErrorCode)) {
    throw new Error('Code must be an ErrorCode value object');
  }

  if (!(message instanceof ErrorMessage)) {
    throw new Error('Message must be an ErrorMessage value object');
  }

  if (!isValidSeverity(severity)) {
    throw new Error('Invalid severity level');
  }

  const dto: ValidationErrorDTO = {
    code,
    message,
    severity,
  };

  if (location) {
    dto.location = {};
    if (location.treeId) dto.location.treeId = location.treeId;
    if (location.nodeId) dto.location.nodeId = location.nodeId;
    if (location.argumentId) dto.location.argumentId = location.argumentId;
  }

  return dto;
}

// Validation helpers

export function validateAtomicArgumentDTO(dto: unknown): string[] {
  const errors: string[] = [];

  if (!isAtomicArgumentDTO(dto)) {
    errors.push('Invalid AtomicArgumentDTO structure');
    return errors;
  }

  if (dto.premiseIds.length === 0 && dto.conclusionIds.length === 0) {
    errors.push('Atomic argument must have at least one premise or conclusion');
  }

  return errors;
}

export function validateTreeDTO(dto: unknown): string[] {
  const errors: string[] = [];

  if (!isTreeDTO(dto)) {
    errors.push('Invalid TreeDTO structure');
    return errors;
  }

  if (dto.nodeCount.getValue() === 0 && dto.rootNodeIds.length > 0) {
    errors.push('Tree with zero nodes cannot have root node IDs');
  }

  if (dto.nodeCount.getValue() > 0 && dto.rootNodeIds.length === 0) {
    errors.push('Tree with nodes must have at least one root node');
  }

  return errors;
}
