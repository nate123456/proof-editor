import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import type { LogicValidationService } from '../../contexts/language-intelligence/domain/services/LogicValidationService.js';
import type { PatternRecognitionService } from '../../contexts/language-intelligence/domain/services/PatternRecognitionService.js';
import { ValidationLevel } from '../../contexts/language-intelligence/domain/value-objects/ValidationLevel.js';
import type { Package } from '../../contexts/package-ecosystem/domain/entities/Package.js';
import type { DependencyResolutionService } from '../../contexts/package-ecosystem/domain/services/DependencyResolutionService.js';
import type { PackageValidationService } from '../../contexts/package-ecosystem/domain/services/PackageValidationService.js';
import type { PackageDiscoveryService } from '../../contexts/package-ecosystem/domain/services/package-discovery-service.js';
import { Operation } from '../../contexts/synchronization/domain/entities/Operation.js';
import { SyncState } from '../../contexts/synchronization/domain/entities/SyncState.js';
import { VectorClock } from '../../contexts/synchronization/domain/entities/VectorClock.js';
import type { OperationCoordinationService } from '../../contexts/synchronization/domain/services/OperationCoordinationService.js';
import { LogicalTimestamp } from '../../contexts/synchronization/domain/value-objects/LogicalTimestamp.js';
import { OperationId } from '../../contexts/synchronization/domain/value-objects/OperationId.js';
import { OperationPayload } from '../../contexts/synchronization/domain/value-objects/OperationPayload.js';
import { OperationType } from '../../contexts/synchronization/domain/value-objects/OperationType.js';
import type { PathCompletenessService } from '../../domain/services/PathCompletenessService.js';
import type { StatementFlowService } from '../../domain/services/StatementFlowService.js';
import type { TreeStructureService } from '../../domain/services/TreeStructureService.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import {
  type ContextType,
  OrchestrationError,
  OrchestrationTimeoutError,
} from '../errors/OrchestrationErrors.js';
import type {
  ConflictResolution,
  ContextConflict,
  CrossContextSyncRequest,
  PackageInstallationRequest,
  PackageInstallationResult,
  ProofValidationRequest,
  ProofValidationResult,
  SyncResult,
} from '../interfaces/OrchestrationInterfaces.js';

@injectable()
export class CrossContextOrchestrationService {
  constructor(
    @inject(TOKENS.StatementFlowService)
    private readonly statementFlow: StatementFlowService,
    @inject(TOKENS.TreeStructureService)
    private readonly treeStructure: TreeStructureService,
    @inject(TOKENS.PathCompletenessService)
    private readonly pathCompleteness: PathCompletenessService,
    @inject(TOKENS.LogicValidationService)
    private readonly logicValidation: LogicValidationService,
    @inject(TOKENS.PatternRecognitionService)
    private readonly patternRecognition: PatternRecognitionService,
    @inject(TOKENS.PackageValidationService)
    private readonly packageValidation: PackageValidationService,
    @inject(TOKENS.DependencyResolutionService)
    private readonly dependencyResolution: DependencyResolutionService,
    @inject(TOKENS.PackageDiscoveryService)
    private readonly packageDiscovery: PackageDiscoveryService,
    @inject(TOKENS.OperationCoordinationService)
    private readonly operationCoordination: OperationCoordinationService,
  ) {}

  async orchestrateProofValidation(
    request: ProofValidationRequest,
  ): Promise<Result<ProofValidationResult, OrchestrationError>> {
    const startTime = Date.now();
    const errors: string[] = [];
    const contextResults = new Map();

    try {
      const { statements, packageDependencies } = request;

      // 1. Core Domain: Create statement structure
      const statementEntities = statements.map((content) =>
        this.statementFlow.createStatementFromContent(content),
      );

      const validStatements = statementEntities
        .filter((stmt) => stmt.isOk())
        .map((stmt) => stmt.value);

      const structuralValid = validStatements.length === statements.length;
      if (!structuralValid) {
        errors.push('Failed to create all statement entities');
      }

      contextResults.set('core', {
        context: 'core' as ContextType,
        success: structuralValid,
        data: { validStatements: validStatements.length, total: statements.length },
        executionTime: Date.now() - startTime,
      });

      // 2. Package Ecosystem: Validate dependencies
      let dependenciesResolved = true;
      if (packageDependencies && Array.isArray(packageDependencies)) {
        for (const pkg of packageDependencies as Package[]) {
          try {
            const validationResult = await this.packageValidation.validatePackage(pkg);
            if (validationResult.isOk()) {
              const validation = validationResult.value;
              if (!validation.isValid) {
                dependenciesResolved = false;
                errors.push(`Package validation failed: ${pkg.getId().toString()}`);
              }
            } else {
              dependenciesResolved = false;
              errors.push(`Package validation failed: ${pkg.getId().toString()}`);
            }
          } catch (_error) {
            dependenciesResolved = false;
            errors.push(`Package validation failed: ${pkg.getId().toString()}`);
          }
        }
      }

      contextResults.set('package-ecosystem', {
        context: 'package-ecosystem' as ContextType,
        success: dependenciesResolved,
        data: { packagesValidated: packageDependencies?.length || 0 },
        executionTime: Date.now() - startTime,
      });

      // 3. Language Intelligence: Validate logic
      let logicalValid = true;
      if (statements.length >= 2) {
        const premises = statements.slice(0, -1);
        const lastStatement = statements[statements.length - 1];

        if (lastStatement) {
          const conclusions = [lastStatement];

          // Create a minimal language package for validation
          const { LanguageCapabilities } = await import(
            '../../contexts/language-intelligence/domain/value-objects/LanguageCapabilities.js'
          );
          const capabilities = LanguageCapabilities.propositionalOnly();

          const { LanguagePackage } = await import(
            '../../contexts/language-intelligence/domain/entities/LanguagePackage.js'
          );
          const languagePackageResult = LanguagePackage.create(
            'Default Validation Package',
            '1.0.0',
            capabilities,
          );

          if (languagePackageResult.isOk()) {
            const validationResult = this.logicValidation.validateInference(
              premises,
              conclusions,
              languagePackageResult.value,
              ValidationLevel.semantic(),
            );

            if (validationResult.isErr() || !validationResult.value.isValid) {
              logicalValid = false;
              errors.push('Logical validation failed');
            }
          } else {
            logicalValid = false;
            errors.push('Failed to create language package for validation');
          }
        }
      }

      contextResults.set('language-intelligence', {
        context: 'language-intelligence' as ContextType,
        success: logicalValid,
        data: { statementsValidated: statements.length },
        executionTime: Date.now() - startTime,
      });

      // 4. Synchronization: Coordinate validation operation (requires deviceId)
      let syncCoordinated = false;

      // For proof validation, we'll create a default device ID if not provided
      const { DeviceId } = await import(
        '../../contexts/synchronization/domain/value-objects/DeviceId.js'
      );
      const deviceIdResult = DeviceId.create('orchestration-service');

      if (deviceIdResult.isOk()) {
        const deviceId = deviceIdResult.value;
        const vectorClock = VectorClock.create(deviceId);

        if (vectorClock.isOk()) {
          const incrementResult = vectorClock.value.incrementForDevice(deviceId);

          if (incrementResult.isOk()) {
            const operationId = OperationId.create('proof-validation');
            const timestamp = LogicalTimestamp.create(deviceId, Date.now(), incrementResult.value);
            const opType = OperationType.create('UPDATE_METADATA');

            if (opType.isOk()) {
              const payload = OperationPayload.create(
                {
                  key: 'proofValidation',
                  value: {
                    statements,
                    validationResult: { logicalValid, dependenciesResolved },
                  },
                },
                opType.value,
              );

              if (operationId.isOk() && timestamp.isOk() && payload.isOk()) {
                const operation = Operation.create(
                  operationId.value,
                  deviceId,
                  opType.value,
                  '/proof/validation', // targetPath
                  payload.value,
                  incrementResult.value,
                  // parentOperationId is optional
                );

                if (operation.isOk()) {
                  const syncState = SyncState.create(deviceId);
                  if (syncState.isOk()) {
                    const coordinationResult = await this.operationCoordination.applyOperation(
                      operation.value,
                      syncState.value,
                    );
                    syncCoordinated = coordinationResult.isOk();
                  }
                }
              }
            }
          }
        }
      }

      if (!syncCoordinated) {
        errors.push('Synchronization coordination failed');
      }

      contextResults.set('synchronization', {
        context: 'synchronization' as ContextType,
        success: syncCoordinated,
        data: { operationCoordinated: syncCoordinated },
        executionTime: Date.now() - startTime,
      });

      const executionTime = Date.now() - startTime;
      const success = structuralValid && logicalValid && dependenciesResolved && syncCoordinated;

      const result: ProofValidationResult = {
        requestId: request.requestId,
        success,
        contextResults,
        executionTime,
        structuralValid,
        logicalValid,
        dependenciesResolved,
        syncCoordinated,
        errors,
      };

      return ok(result);
    } catch (error) {
      const orchError = new OrchestrationError(
        'Proof validation orchestration failed',
        'core',
        error instanceof Error ? error : new Error(String(error)),
      );
      return err(orchError);
    }
  }

  async coordinatePackageInstallation(
    request: PackageInstallationRequest,
  ): Promise<Result<PackageInstallationResult, OrchestrationError>> {
    const startTime = Date.now();
    const contextResults = new Map();

    try {
      // This is a simplified implementation - in a real system this would
      // coordinate between package discovery, dependency resolution, and installation
      const { packageId, version, source } = request;

      // Convert string packageId to PackageId value object
      const { PackageId } = await import(
        '../../contexts/package-ecosystem/domain/value-objects/package-id.js'
      );
      const packageIdResult = PackageId.create(packageId);

      if (packageIdResult.isErr()) {
        return err(
          new OrchestrationError(
            `Invalid package ID: ${packageIdResult.error.message}`,
            'package-ecosystem',
            packageIdResult.error,
          ),
        );
      }

      // Package discovery and validation
      const discoveryResult = await this.packageDiscovery.findPackageById(packageIdResult.value);
      const installed = discoveryResult.isOk();

      contextResults.set('package-ecosystem', {
        context: 'package-ecosystem' as ContextType,
        success: installed,
        data: { packageId, version, source },
        executionTime: Date.now() - startTime,
      });

      const executionTime = Date.now() - startTime;

      const result: PackageInstallationResult = {
        requestId: request.requestId,
        success: installed,
        contextResults,
        executionTime,
        installed,
        ...(version && { installedVersion: version }),
        dependenciesInstalled: [],
      };

      return ok(result);
    } catch (error) {
      const orchError = new OrchestrationError(
        'Package installation orchestration failed',
        'package-ecosystem',
        error instanceof Error ? error : new Error(String(error)),
      );
      return err(orchError);
    }
  }

  async synchronizeAcrossContexts(
    request: CrossContextSyncRequest,
  ): Promise<Result<SyncResult, OrchestrationError>> {
    const startTime = Date.now();
    const contextResults = new Map();

    try {
      const { syncType, deviceId: deviceIdStr, changes } = request;

      const { DeviceId } = await import(
        '../../contexts/synchronization/domain/value-objects/DeviceId.js'
      );
      const deviceIdResult = DeviceId.create(deviceIdStr);

      if (deviceIdResult.isErr()) {
        return err(new OrchestrationError('Invalid device ID', 'synchronization'));
      }

      const deviceId = deviceIdResult.value;
      const syncState = SyncState.create(deviceId);

      if (syncState.isErr()) {
        return err(new OrchestrationError('Failed to create sync state', 'synchronization'));
      }

      // Simulate synchronization process
      const synced = true;
      const conflictsResolved = 0;
      const syncedChanges = changes.length;

      contextResults.set('synchronization', {
        context: 'synchronization' as ContextType,
        success: synced,
        data: { syncType, changesCount: changes.length },
        executionTime: Date.now() - startTime,
      });

      const executionTime = Date.now() - startTime;

      const result: SyncResult = {
        requestId: request.requestId,
        success: synced,
        contextResults,
        executionTime,
        synced,
        conflictsResolved,
        syncedChanges,
      };

      return ok(result);
    } catch (error) {
      const orchError = new OrchestrationError(
        'Cross-context synchronization failed',
        'synchronization',
        error instanceof Error ? error : new Error(String(error)),
      );
      return err(orchError);
    }
  }

  async handleCrossContextConflict(
    conflict: ContextConflict,
  ): Promise<Result<ConflictResolution, OrchestrationError>> {
    try {
      // Simplified conflict resolution - in a real system this would implement
      // sophisticated conflict resolution strategies
      const resolution: ConflictResolution = {
        conflictId: conflict.conflictId,
        resolution: 'automatic',
        strategy: 'last-write-wins',
        resolvedData: conflict.conflictData,
      };

      return ok(resolution);
    } catch (error) {
      const orchError = new OrchestrationError(
        'Conflict resolution failed',
        'core',
        error instanceof Error ? error : new Error(String(error)),
      );
      return err(orchError);
    }
  }

  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    context: ContextType,
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new OrchestrationTimeoutError(context, timeoutMs)), timeoutMs),
      ),
    ]);
  }

  private async checkContextAvailability(_context: ContextType): Promise<boolean> {
    // Simplified availability check - in a real system this would implement
    // health checks for each context
    return true;
  }
}
