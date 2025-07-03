import type { ContextType } from '../errors/OrchestrationErrors.js';

export interface IOrchestrationRequest {
  readonly requestId: string;
  readonly contexts: ContextType[];
  readonly priority: Priority;
  readonly timeout?: number;
}

export interface IOrchestrationResult {
  readonly requestId: string;
  readonly success: boolean;
  readonly contextResults: Map<ContextType, ContextResult>;
  readonly executionTime: number;
}

export interface ContextResult {
  readonly context: ContextType;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: Error;
  readonly executionTime: number;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface ProofValidationRequest extends IOrchestrationRequest {
  readonly statements: string[];
  readonly packageDependencies: unknown[];
}

export interface ProofValidationResult extends IOrchestrationResult {
  readonly structuralValid: boolean;
  readonly logicalValid: boolean;
  readonly dependenciesResolved: boolean;
  readonly syncCoordinated: boolean;
  readonly errors: string[];
}

export interface PackageInstallationRequest extends IOrchestrationRequest {
  readonly packageId: string;
  readonly version?: string;
  readonly source: string;
}

export interface PackageInstallationResult extends IOrchestrationResult {
  readonly installed: boolean;
  readonly installedVersion?: string;
  readonly dependenciesInstalled: string[];
}

export interface CrossContextSyncRequest extends IOrchestrationRequest {
  readonly syncType: 'incremental' | 'full';
  readonly deviceId: string;
  readonly changes: unknown[];
}

export interface SyncResult extends IOrchestrationResult {
  readonly synced: boolean;
  readonly conflictsResolved: number;
  readonly syncedChanges: number;
}

export interface ContextConflict {
  readonly conflictId: string;
  readonly contexts: ContextType[];
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly conflictData: unknown;
}

export interface ConflictResolution {
  readonly conflictId: string;
  readonly resolution: 'manual' | 'automatic';
  readonly strategy: string;
  readonly resolvedData: unknown;
}
