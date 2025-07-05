/**
 * Shared types for query DTOs to avoid circular dependencies
 */

export interface OrderedSetDTO {
  id: string;
  statementIds: string[];
  usageCount: number;
  usedBy: Array<{
    argumentId: string;
    usage: 'premise' | 'conclusion';
  }>;
}

export interface AtomicArgumentDTO {
  id: string;
  premiseSetId: string | null;
  conclusionSetId: string | null;
  sideLabels?: {
    left?: string;
    right?: string;
  };
}

export interface TreeDTO {
  id: string;
  position: {
    x: number;
    y: number;
  };
  bounds?: {
    width: number;
    height: number;
  };
  nodeCount: number;
  rootNodeIds: string[];
}

export interface ValidationErrorDTO {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    treeId?: string;
    nodeId?: string;
    argumentId?: string;
  };
}

// Type guards and validation utilities
export function isValidUsageType(usage: unknown): usage is 'premise' | 'conclusion' {
  return typeof usage === 'string' && (usage === 'premise' || usage === 'conclusion');
}

export function isOrderedSetDTO(obj: unknown): obj is OrderedSetDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  return (
    typeof dto.id === 'string' &&
    dto.id.length > 0 &&
    Array.isArray(dto.statementIds) &&
    dto.statementIds.every((id: unknown) => typeof id === 'string' && id.length > 0) &&
    typeof dto.usageCount === 'number' &&
    dto.usageCount >= 0 &&
    Array.isArray(dto.usedBy) &&
    dto.usedBy.every(
      (usage: unknown) =>
        typeof usage === 'object' &&
        usage !== null &&
        'argumentId' in usage &&
        typeof (usage as Record<string, unknown>).argumentId === 'string' &&
        'usage' in usage &&
        isValidUsageType((usage as Record<string, unknown>).usage),
    )
  );
}

export function isAtomicArgumentDTO(obj: unknown): obj is AtomicArgumentDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  const hasValidId = typeof dto.id === 'string' && dto.id.length > 0;
  const hasValidPremiseSetId =
    dto.premiseSetId === null ||
    (typeof dto.premiseSetId === 'string' && dto.premiseSetId.length > 0);
  const hasValidConclusionSetId =
    dto.conclusionSetId === null ||
    (typeof dto.conclusionSetId === 'string' && dto.conclusionSetId.length > 0);

  if (!hasValidId || !hasValidPremiseSetId || !hasValidConclusionSetId) {
    return false;
  }

  if ('sideLabels' in dto) {
    const labels = dto.sideLabels as Record<string, unknown>;
    if (typeof labels !== 'object' || labels === null) {
      return false;
    }

    if ('left' in labels && typeof labels.left !== 'string') {
      return false;
    }

    if ('right' in labels && typeof labels.right !== 'string') {
      return false;
    }
  }

  return true;
}

export function isValidPosition(position: unknown): position is { x: number; y: number } {
  return (
    typeof position === 'object' &&
    position !== null &&
    'x' in position &&
    typeof (position as Record<string, unknown>).x === 'number' &&
    'y' in position &&
    typeof (position as Record<string, unknown>).y === 'number' &&
    Number.isFinite((position as Record<string, unknown>).x as number) &&
    Number.isFinite((position as Record<string, unknown>).y as number)
  );
}

export function isValidBounds(bounds: unknown): bounds is { width: number; height: number } {
  return (
    typeof bounds === 'object' &&
    bounds !== null &&
    'width' in bounds &&
    typeof (bounds as Record<string, unknown>).width === 'number' &&
    'height' in bounds &&
    typeof (bounds as Record<string, unknown>).height === 'number' &&
    ((bounds as Record<string, unknown>).width as number) >= 0 &&
    ((bounds as Record<string, unknown>).height as number) >= 0 &&
    Number.isFinite((bounds as Record<string, unknown>).width as number) &&
    Number.isFinite((bounds as Record<string, unknown>).height as number)
  );
}

export function isTreeDTO(obj: unknown): obj is TreeDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  const hasValidId = typeof dto.id === 'string' && dto.id.length > 0;
  const hasValidPosition = isValidPosition(dto.position);
  const hasValidNodeCount =
    typeof dto.nodeCount === 'number' && dto.nodeCount >= 0 && Number.isInteger(dto.nodeCount);
  const hasValidRootNodeIds =
    Array.isArray(dto.rootNodeIds) &&
    dto.rootNodeIds.every((id: unknown) => typeof id === 'string' && id.length > 0);

  if (!hasValidId || !hasValidPosition || !hasValidNodeCount || !hasValidRootNodeIds) {
    return false;
  }

  if ('bounds' in dto) {
    return isValidBounds(dto.bounds);
  }

  return true;
}

export function isValidSeverity(severity: unknown): severity is 'error' | 'warning' | 'info' {
  const validSeverities = ['error', 'warning', 'info'];
  return typeof severity === 'string' && validSeverities.includes(severity);
}

export function isValidationErrorDTO(obj: unknown): obj is ValidationErrorDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  const hasValidCode = typeof dto.code === 'string' && dto.code.length > 0;
  const hasValidMessage = typeof dto.message === 'string' && dto.message.length > 0;
  const hasValidSeverity = isValidSeverity(dto.severity);

  if (!hasValidCode || !hasValidMessage || !hasValidSeverity) {
    return false;
  }

  if ('location' in dto) {
    const location = dto.location as Record<string, unknown>;
    if (typeof location !== 'object' || location === null) {
      return false;
    }

    // Check optional location fields
    if ('treeId' in location && typeof location.treeId !== 'string') {
      return false;
    }
    if ('nodeId' in location && typeof location.nodeId !== 'string') {
      return false;
    }
    if ('argumentId' in location && typeof location.argumentId !== 'string') {
      return false;
    }
  }

  return true;
}

// Factory functions
export function createOrderedSetDTO(
  id: string,
  statementIds: string[],
  usageCount: number,
  usedBy: Array<{ argumentId: string; usage: 'premise' | 'conclusion' }>,
): OrderedSetDTO {
  if (!id || id.trim().length === 0) {
    throw new Error('OrderedSet ID cannot be empty');
  }

  if (!Array.isArray(statementIds) || statementIds.some((id) => !id || id.trim().length === 0)) {
    throw new Error('Statement IDs must be non-empty strings');
  }

  if (usageCount < 0 || !Number.isInteger(usageCount)) {
    throw new Error('Usage count must be a non-negative integer');
  }

  if (!Array.isArray(usedBy) || usedBy.some((usage) => !isValidUsageType(usage.usage))) {
    throw new Error('Invalid usage information');
  }

  return {
    id: id.trim(),
    statementIds: statementIds.map((id) => id.trim()),
    usageCount,
    usedBy,
  };
}

export function createAtomicArgumentDTO(
  id: string,
  premiseSetId: string | null,
  conclusionSetId: string | null,
  sideLabels?: { left?: string; right?: string },
): AtomicArgumentDTO {
  if (!id || id.trim().length === 0) {
    throw new Error('Argument ID cannot be empty');
  }

  const dto: AtomicArgumentDTO = {
    id: id.trim(),
    premiseSetId: premiseSetId?.trim() || null,
    conclusionSetId: conclusionSetId?.trim() || null,
  };

  if (sideLabels) {
    dto.sideLabels = {};
    if (sideLabels.left) dto.sideLabels.left = sideLabels.left.trim();
    if (sideLabels.right) dto.sideLabels.right = sideLabels.right.trim();
  }

  return dto;
}

export function createTreeDTO(
  id: string,
  position: { x: number; y: number },
  nodeCount: number,
  rootNodeIds: string[],
  bounds?: { width: number; height: number },
): TreeDTO {
  if (!id || id.trim().length === 0) {
    throw new Error('Tree ID cannot be empty');
  }

  if (!isValidPosition(position)) {
    throw new Error('Invalid position coordinates');
  }

  if (nodeCount < 0 || !Number.isInteger(nodeCount)) {
    throw new Error('Node count must be a non-negative integer');
  }

  if (!Array.isArray(rootNodeIds) || rootNodeIds.some((id) => !id || id.trim().length === 0)) {
    throw new Error('Root node IDs must be non-empty strings');
  }

  const dto: TreeDTO = {
    id: id.trim(),
    position,
    nodeCount,
    rootNodeIds: rootNodeIds.map((id) => id.trim()),
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
  code: string,
  message: string,
  severity: 'error' | 'warning' | 'info',
  location?: { treeId?: string; nodeId?: string; argumentId?: string },
): ValidationErrorDTO {
  if (!code || code.trim().length === 0) {
    throw new Error('Error code cannot be empty');
  }

  if (!message || message.trim().length === 0) {
    throw new Error('Error message cannot be empty');
  }

  if (!isValidSeverity(severity)) {
    throw new Error('Invalid severity level');
  }

  const dto: ValidationErrorDTO = {
    code: code.trim(),
    message: message.trim(),
    severity,
  };

  if (location) {
    dto.location = {};
    if (location.treeId) dto.location.treeId = location.treeId.trim();
    if (location.nodeId) dto.location.nodeId = location.nodeId.trim();
    if (location.argumentId) dto.location.argumentId = location.argumentId.trim();
  }

  return dto;
}

// Validation helpers
export function validateOrderedSetDTO(dto: unknown): string[] {
  const errors: string[] = [];

  if (!isOrderedSetDTO(dto)) {
    errors.push('Invalid OrderedSetDTO structure');
    return errors;
  }

  if (dto.usageCount !== dto.usedBy.length) {
    errors.push('Usage count does not match usedBy array length');
  }

  const uniqueStatementIds = new Set(dto.statementIds);
  if (uniqueStatementIds.size !== dto.statementIds.length) {
    errors.push('Duplicate statement IDs found');
  }

  return errors;
}

export function validateAtomicArgumentDTO(dto: unknown): string[] {
  const errors: string[] = [];

  if (!isAtomicArgumentDTO(dto)) {
    errors.push('Invalid AtomicArgumentDTO structure');
    return errors;
  }

  if (!dto.premiseSetId && !dto.conclusionSetId) {
    errors.push('Atomic argument must have at least premise or conclusion set');
  }

  return errors;
}

export function validateTreeDTO(dto: unknown): string[] {
  const errors: string[] = [];

  if (!isTreeDTO(dto)) {
    errors.push('Invalid TreeDTO structure');
    return errors;
  }

  if (dto.nodeCount === 0 && dto.rootNodeIds.length > 0) {
    errors.push('Tree with zero nodes cannot have root node IDs');
  }

  if (dto.nodeCount > 0 && dto.rootNodeIds.length === 0) {
    errors.push('Tree with nodes must have at least one root node');
  }

  return errors;
}
