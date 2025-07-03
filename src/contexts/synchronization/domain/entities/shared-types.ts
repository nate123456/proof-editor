/**
 * Shared types and interfaces for synchronization entities
 * Used to break circular dependencies between Operation and Conflict
 */

import type { Result } from 'neverthrow';

import type { ConflictType } from '../value-objects/ConflictType';
import type { DeviceId } from '../value-objects/DeviceId';
import type { LogicalTimestamp } from '../value-objects/LogicalTimestamp';
import type { OperationId } from '../value-objects/OperationId';
import type { OperationPayload } from '../value-objects/OperationPayload';
import type { OperationType } from '../value-objects/OperationType';
import type { VectorClock } from './VectorClock';

/**
 * Interface representing the essential properties of an Operation
 * Used by Conflict to work with operations without importing the full Operation class
 */
export interface IOperation {
  getId(): OperationId;
  getDeviceId(): DeviceId;
  getOperationType(): OperationType;
  getTargetPath(): string;
  getPayload(): OperationPayload;
  getVectorClock(): VectorClock;
  getTimestamp(): LogicalTimestamp;
  getParentOperationId(): OperationId | undefined;
  isStructuralOperation(): boolean;
  isSemanticOperation(): boolean;
  isConcurrentWith(otherOperation: IOperation): boolean;
  hasCausalDependencyOn(otherOperation: IOperation): boolean;
}

/**
 * Factory interface for creating Conflict instances
 * Used by Operation to create conflicts without importing the full Conflict class
 */
export interface IConflictFactory {
  create(
    id: string,
    conflictType: ConflictType,
    targetPath: string,
    conflictingOperations: IOperation[],
  ): Result<IConflict, Error>;
}

/**
 * Interface representing the essential properties of a Conflict
 * Used for type safety without circular dependencies
 */
export interface IConflict {
  getId(): string;
  getConflictType(): ConflictType;
  getTargetPath(): string;
  getConflictingOperations(): readonly IOperation[];
  isResolved(): boolean;
  canBeAutomaticallyResolved(): boolean;
  requiresUserDecision(): boolean;
}

/**
 * Resolution strategy for conflicts
 */
export type ConflictResolutionStrategy =
  | 'LAST_WRITER_WINS'
  | 'FIRST_WRITER_WINS'
  | 'MERGE_OPERATIONS'
  | 'USER_DECISION_REQUIRED';

/**
 * Resolution option for conflicts
 */
export interface ConflictResolutionOption {
  readonly strategy: ConflictResolutionStrategy;
  readonly description: string;
  readonly resultPreview: string;
  readonly automaticResolution: boolean;
}
