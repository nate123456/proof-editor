import { err, ok, type Result } from 'neverthrow';

import { type ConflictType } from '../value-objects/ConflictType';
import { DeviceId } from '../value-objects/DeviceId';
import {
  type ConflictResolutionOption,
  type ConflictResolutionStrategy,
  type IConflict,
  type IOperation,
} from './shared-types';

// Re-export types for backward compatibility
export type { ConflictResolutionOption, ConflictResolutionStrategy };

export class Conflict implements IConflict {
  private constructor(
    private readonly id: string,
    private readonly conflictType: ConflictType,
    private readonly targetPath: string,
    private readonly conflictingOperations: readonly IOperation[],
    private readonly detectedAt: Date,
    private readonly resolutionOptions: readonly ConflictResolutionOption[],
    private resolvedAt?: Date,
    private selectedResolution?: ConflictResolutionStrategy,
    private resolutionResult?: unknown
  ) {}

  static create(
    id: string,
    conflictType: ConflictType,
    targetPath: string,
    conflictingOperations: IOperation[]
  ): Result<Conflict, Error> {
    if (!id.trim()) {
      return err(new Error('Conflict ID cannot be empty'));
    }

    if (!targetPath.trim()) {
      return err(new Error('Target path cannot be empty'));
    }

    if (conflictingOperations.length < 2) {
      return err(new Error('Conflict requires at least two operations'));
    }

    const resolutionOptions = Conflict.generateResolutionOptions(
      conflictType,
      conflictingOperations
    );

    return ok(
      new Conflict(
        id,
        conflictType,
        targetPath,
        conflictingOperations,
        new Date(),
        resolutionOptions
      )
    );
  }

  private static generateResolutionOptions(
    conflictType: ConflictType,
    operations: IOperation[]
  ): ConflictResolutionOption[] {
    const options: ConflictResolutionOption[] = [];

    if (conflictType.isStructural()) {
      options.push({
        strategy: 'MERGE_OPERATIONS',
        description: 'Automatically merge structural changes using operational transformation',
        resultPreview: 'Operations will be transformed to preserve all structural changes',
        automaticResolution: true,
      });

      options.push({
        strategy: 'LAST_WRITER_WINS',
        description: 'Keep the most recent change based on vector clock ordering',
        resultPreview: `Use operation from ${Conflict.getLatestOperation(operations).getDeviceId().getValue()}`,
        automaticResolution: true,
      });
    }

    if (conflictType.isSemantic()) {
      // Pure semantic conflicts require manual resolution
      if (conflictType.getValue() === 'SEMANTIC_CONFLICT') {
        options.push({
          strategy: 'USER_DECISION_REQUIRED',
          description: 'Manual resolution required due to semantic conflict',
          resultPreview: 'User must choose how to resolve semantic differences',
          automaticResolution: false,
        });

        options.push({
          strategy: 'LAST_WRITER_WINS',
          description: 'Accept the most recent semantic change',
          resultPreview: `Use content from ${Conflict.getLatestOperation(operations).getDeviceId().getValue()}`,
          automaticResolution: false,
        });
      } else if (conflictType.getValue() === 'CONCURRENT_MODIFICATION') {
        // Concurrent modifications can be automatically resolved, prefer LAST_WRITER_WINS
        options.push({
          strategy: 'LAST_WRITER_WINS',
          description: 'Accept the most recent concurrent modification',
          resultPreview: `Use content from ${Conflict.getLatestOperation(operations).getDeviceId().getValue()}`,
          automaticResolution: true,
        });

        options.push({
          strategy: 'USER_DECISION_REQUIRED',
          description: 'Manual resolution for careful review',
          resultPreview: 'User can manually choose the preferred resolution',
          automaticResolution: false,
        });
      }
    }

    return options;
  }

  private static getLatestOperation(operations: IOperation[]): IOperation {
    return operations.reduce((latest, current) => {
      return current.getVectorClock().happensAfter(latest.getVectorClock()) ? current : latest;
    });
  }

  getId(): string {
    return this.id;
  }

  getConflictType(): ConflictType {
    return this.conflictType;
  }

  // Alias for test compatibility
  getType(): ConflictType {
    return this.conflictType;
  }

  getTargetPath(): string {
    return this.targetPath;
  }

  getConflictingOperations(): readonly IOperation[] {
    return [...this.conflictingOperations];
  }

  // Alias for test compatibility
  getOperations(): readonly IOperation[] {
    return [...this.conflictingOperations];
  }

  getDetectedAt(): Date {
    return this.detectedAt;
  }

  getResolutionOptions(): readonly ConflictResolutionOption[] {
    return this.resolutionOptions;
  }

  isResolved(): boolean {
    return this.resolvedAt !== undefined;
  }

  getResolvedAt(): Date | undefined {
    return this.resolvedAt;
  }

  getSelectedResolution(): ConflictResolutionStrategy | undefined {
    return this.selectedResolution;
  }

  getResolutionResult(): unknown {
    return this.resolutionResult;
  }

  canBeAutomaticallyResolved(): boolean {
    return this.resolutionOptions.some(option => option.automaticResolution);
  }

  getAutomaticResolutionOptions(): ConflictResolutionOption[] {
    return this.resolutionOptions.filter(option => option.automaticResolution);
  }

  requiresUserDecision(): boolean {
    return this.conflictType.isSemantic() || !this.canBeAutomaticallyResolved();
  }

  getInvolvedDevices(): DeviceId[] {
    const deviceIds = new Set<string>();

    for (const operation of this.conflictingOperations) {
      deviceIds.add(operation.getDeviceId().getValue());
    }

    return Array.from(deviceIds)
      .map(deviceId => {
        const result = DeviceId.create(deviceId);
        return result.isOk() ? result.value : null;
      })
      .filter((deviceId): deviceId is DeviceId => deviceId !== null);
  }

  resolveWith(strategy: ConflictResolutionStrategy, result: unknown): Result<Conflict, Error> {
    if (this.isResolved()) {
      return err(new Error('Conflict is already resolved'));
    }

    const validOption = this.resolutionOptions.find(option => option.strategy === strategy);
    if (!validOption) {
      return err(new Error(`Invalid resolution strategy: ${strategy}`));
    }

    return ok(
      new Conflict(
        this.id,
        this.conflictType,
        this.targetPath,
        this.conflictingOperations,
        this.detectedAt,
        this.resolutionOptions,
        new Date(),
        strategy,
        result
      )
    );
  }

  getSeverity(): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (this.conflictType.isSemantic()) {
      return 'HIGH';
    }

    if (this.conflictingOperations.length > 3) {
      return 'MEDIUM';
    }

    return 'LOW';
  }
}
