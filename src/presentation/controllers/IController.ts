import type { Result } from 'neverthrow';
import type { ValidationApplicationError } from '../../application/dtos/operation-results.js';

/**
 * Base controller interface following CLEAN Architecture
 * - Thin presentation layer handling user input
 * - No business logic (delegates to application layer)
 * - Returns Result<T, Error> for consistent error handling
 */
export interface IController {
  /**
   * Initialize controller with platform-specific dependencies
   */
  initialize(): Promise<Result<void, ValidationApplicationError>>;

  /**
   * Cleanup resources when controller is disposed
   */
  dispose(): Promise<Result<void, ValidationApplicationError>>;
}

/**
 * Base view DTO for all controller responses
 * NOTE: This is for successful operations only.
 * Business failures should return err(ValidationApplicationError)
 */
export interface ViewResponse<T = unknown> {
  data?: T;
  warnings?: ViewWarningDTO[];
  metadata?: ViewMetadata;
}

export interface ViewWarningDTO {
  code: string;
  message: string;
  field?: string;
}

export interface ViewMetadata {
  timestamp: string;
  operationId: string;
  source: string;
}
