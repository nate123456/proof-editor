/**
 * Helper utilities for creating branded types in tests
 *
 * These helpers ensure proper type creation without type errors
 * while maintaining test clarity and readability.
 */

import type { Result } from 'neverthrow';
import type { ValidationError } from '../../../../domain/shared/result.js';
import {
  AtomicArgumentId,
  Dimensions,
  DocumentId,
  ErrorCode,
  ErrorMessage,
  NodeCount,
  NodeId,
  Position2D,
  StatementId,
  TreeId,
} from '../../../../domain/shared/value-objects/index.js';

/**
 * Creates a StatementId for testing, with proper error handling
 */
export function createTestStatementId(id: string): StatementId {
  const result = StatementId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create StatementId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an AtomicArgumentId for testing, with proper error handling
 */
export function createTestAtomicArgumentId(id: string): AtomicArgumentId {
  const result = AtomicArgumentId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create AtomicArgumentId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a NodeId for testing, with proper error handling
 */
export function createTestNodeId(id: string): NodeId {
  const result = NodeId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create NodeId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a TreeId for testing, with proper error handling
 */
export function createTestTreeId(id: string): TreeId {
  const result = TreeId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create TreeId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a DocumentId for testing, with proper error handling
 */
export function createTestDocumentId(id: string): DocumentId {
  const result = DocumentId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create DocumentId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an ErrorCode for testing, with proper error handling
 */
export function createTestErrorCode(code: string): ErrorCode {
  const result = ErrorCode.create(code);
  if (result.isErr()) {
    throw new Error(`Failed to create ErrorCode: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an ErrorMessage for testing, with proper error handling
 */
export function createTestErrorMessage(message: string): ErrorMessage {
  const result = ErrorMessage.create(message);
  if (result.isErr()) {
    throw new Error(`Failed to create ErrorMessage: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Helper function to unwrap a Result for testing
 * @throws Error if Result is an error
 */
export function unwrapResult<T, E extends ValidationError>(result: Result<T, E>): T {
  if (result.isErr()) {
    throw new Error(`Result unwrap failed: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an array of StatementIds for testing
 */
export function createTestStatementIds(...ids: string[]): StatementId[] {
  return ids.map(createTestStatementId);
}

/**
 * Creates an array of NodeIds for testing
 */
export function createTestNodeIds(...ids: string[]): NodeId[] {
  return ids.map(createTestNodeId);
}

/**
 * Creates a Position2D for testing, with proper error handling
 */
export function createTestPosition2D(x: number, y: number): Position2D {
  const result = Position2D.create(x, y);
  if (result.isErr()) {
    throw new Error(`Failed to create Position2D: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a Dimensions for testing, with proper error handling
 */
export function createTestDimensions(width: number, height: number): Dimensions {
  const result = Dimensions.create(width, height);
  if (result.isErr()) {
    throw new Error(`Failed to create Dimensions: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a NodeCount for testing, with proper error handling
 */
export function createTestNodeCount(count: number): NodeCount {
  const result = NodeCount.create(count);
  if (result.isErr()) {
    throw new Error(`Failed to create NodeCount: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Type guard to handle Result union types
 */
export function getValueOrThrow<T>(resultOrValue: Result<T, ValidationError> | T, fallback: T): T {
  if (isResult(resultOrValue)) {
    return resultOrValue.isOk() ? resultOrValue.value : fallback;
  }
  return resultOrValue;
}

/**
 * Type guard to check if value is a Result
 */
function isResult<T, E>(value: unknown): value is Result<T, E> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isOk' in value &&
    'isErr' in value &&
    typeof (value as any).isOk === 'function' &&
    typeof (value as any).isErr === 'function'
  );
}
