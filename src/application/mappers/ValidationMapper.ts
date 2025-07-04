import type { ValidationError } from '../../domain/shared/result.js';
import type { ValidationErrorDTO } from '../queries/shared-types.js';

/**
 * Converts a ValidationError to a ValidationErrorDTO
 */
export function validationErrorToDTO(error: ValidationError): ValidationErrorDTO {
  const location = extractLocation(error);

  return {
    code: getErrorCode(error),
    message: error.message,
    severity: getSeverity(error),
    ...(location && { location }),
  };
}

/**
 * Converts multiple ValidationErrors to DTOs
 */
export function validationErrorsToDTOs(errors: ValidationError[]): ValidationErrorDTO[] {
  return errors.map((error) => validationErrorToDTO(error));
}

/**
 * Maps domain error types to error codes
 */
function getErrorCode(error: ValidationError): string {
  // Map error message patterns to codes
  const message = error.message.toLowerCase();

  if (message.includes('statement')) {
    if (message.includes('empty')) return 'EMPTY_STATEMENT';
    if (message.includes('not found')) return 'STATEMENT_NOT_FOUND';
    if (message.includes('in use')) return 'STATEMENT_IN_USE';
    return 'STATEMENT_ERROR';
  }

  if (message.includes('ordered set')) {
    if (message.includes('duplicate')) return 'DUPLICATE_IN_ORDERED_SET';
    if (message.includes('not found')) return 'ORDERED_SET_NOT_FOUND';
    return 'ORDERED_SET_ERROR';
  }

  if (message.includes('argument')) {
    if (message.includes('cycle')) return 'CYCLE_DETECTED';
    if (message.includes('not found')) return 'ARGUMENT_NOT_FOUND';
    if (message.includes('connection')) return 'CONNECTION_ERROR';
    return 'ARGUMENT_ERROR';
  }

  if (message.includes('tree')) {
    if (message.includes('node')) return 'TREE_NODE_ERROR';
    if (message.includes('position')) return 'TREE_POSITION_ERROR';
    return 'TREE_ERROR';
  }

  if (message.includes('bootstrap')) {
    return 'BOOTSTRAP_ERROR';
  }

  return 'VALIDATION_ERROR';
}

/**
 * Determines severity based on error type
 */
function getSeverity(error: ValidationError): 'error' | 'warning' | 'info' {
  const message = error.message.toLowerCase();

  // Critical errors
  if (
    message.includes('cycle') ||
    message.includes('not found') ||
    message.includes('invalid') ||
    message.includes('cannot')
  ) {
    return 'error';
  }

  // Warnings
  if (message.includes('unused') || message.includes('empty') || message.includes('should')) {
    return 'warning';
  }

  // Info
  return 'info';
}

/**
 * Extracts location information from error if available
 */
function extractLocation(error: ValidationError): ValidationErrorDTO['location'] {
  // In a real implementation, ValidationError might include location metadata
  // For now, we'll try to parse it from the message
  const message = error.message;

  // Try to extract IDs from the message using common patterns
  const treeIdMatch = message.match(/tree[:\s]+(\w+)/i);
  const nodeIdMatch = message.match(/node[:\s]+(\w+)/i);
  const argumentIdMatch = message.match(/argument[:\s]+(\w+)/i);

  if (treeIdMatch || nodeIdMatch || argumentIdMatch) {
    const location: { treeId?: string; nodeId?: string; argumentId?: string } = {};

    if (treeIdMatch?.[1]) {
      location.treeId = treeIdMatch[1];
    }
    if (nodeIdMatch?.[1]) {
      location.nodeId = nodeIdMatch[1];
    }
    if (argumentIdMatch?.[1]) {
      location.argumentId = argumentIdMatch[1];
    }

    return location;
  }

  return undefined;
}

/**
 * Groups validation errors by type
 */
export function groupErrorsByType(errors: ValidationError[]): Map<string, ValidationErrorDTO[]> {
  const grouped = new Map<string, ValidationErrorDTO[]>();

  for (const error of errors) {
    const dto = validationErrorToDTO(error);
    const code = dto.code;

    if (!grouped.has(code)) {
      grouped.set(code, []);
    }

    grouped.get(code)?.push(dto);
  }

  return grouped;
}

/**
 * Filters errors by severity
 */
export function filterErrorsBySeverity(
  errors: ValidationErrorDTO[],
  severity: 'error' | 'warning' | 'info',
): ValidationErrorDTO[] {
  return errors.filter((error) => error.severity === severity);
}
