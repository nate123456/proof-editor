import { err, ok, type Result } from 'neverthrow';

import type { DeviceId } from './DeviceId';

export type ConflictResolutionStrategy =
  | 'LAST_WRITER_WINS'
  | 'FIRST_WRITER_WINS'
  | 'MERGE_OPERATIONS'
  | 'USER_DECISION_REQUIRED'
  | 'THREE_WAY_MERGE'
  | 'OPERATIONAL_TRANSFORM'
  | 'MANUAL_SELECTION';

export type ResolutionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ResolutionContext {
  readonly conflictId: string;
  readonly involvedDevices: DeviceId[];
  readonly conflictType: string;
  readonly targetPath: string;
  readonly detectedAt: Date;
  readonly operationCount: number;
}

export interface UserSelection {
  readonly selectedOperationId: string;
  readonly customData?: unknown;
  readonly rationale?: string;
}

export class ConflictResolution {
  private constructor(
    private readonly strategy: ConflictResolutionStrategy,
    private readonly confidence: ResolutionConfidence,
    private readonly resolvedAt: Date,
    private readonly resolvedBy: DeviceId,
    private readonly context: ResolutionContext,
    private readonly resultData: unknown,
    private readonly userSelection?: UserSelection,
    private readonly automaticResolution = true,
  ) {}

  static createAutomatic(
    strategy: ConflictResolutionStrategy,
    confidence: ResolutionConfidence,
    resolvedBy: DeviceId,
    context: ResolutionContext,
    resultData: unknown,
  ): Result<ConflictResolution, Error> {
    if (!ConflictResolution.isAutomaticStrategy(strategy)) {
      return err(new Error(`Strategy ${strategy} is not suitable for automatic resolution`));
    }

    return ok(
      new ConflictResolution(
        strategy,
        confidence,
        new Date(),
        resolvedBy,
        context,
        resultData,
        undefined,
        true,
      ),
    );
  }

  static createManual(
    strategy: ConflictResolutionStrategy,
    resolvedBy: DeviceId,
    context: ResolutionContext,
    resultData: unknown,
    userSelection: UserSelection,
  ): Result<ConflictResolution, Error> {
    if (ConflictResolution.isAutomaticStrategy(strategy)) {
      return err(new Error(`Strategy ${strategy} should be used for automatic resolution`));
    }

    return ok(
      new ConflictResolution(
        strategy,
        'HIGH', // Manual resolutions always have high confidence
        new Date(),
        resolvedBy,
        context,
        resultData,
        userSelection,
        false,
      ),
    );
  }

  static createMerged(
    resolvedBy: DeviceId,
    context: ResolutionContext,
    mergeResult: unknown,
    mergeStrategy: 'OPERATIONAL_TRANSFORM' | 'THREE_WAY_MERGE' = 'OPERATIONAL_TRANSFORM',
  ): Result<ConflictResolution, Error> {
    const confidence = ConflictResolution.calculateMergeConfidence(context, mergeResult);

    return ok(
      new ConflictResolution(
        mergeStrategy,
        confidence,
        new Date(),
        resolvedBy,
        context,
        mergeResult,
        undefined,
        true,
      ),
    );
  }

  private static isAutomaticStrategy(strategy: ConflictResolutionStrategy): boolean {
    const automaticStrategies: ConflictResolutionStrategy[] = [
      'LAST_WRITER_WINS',
      'FIRST_WRITER_WINS',
      'MERGE_OPERATIONS',
      'OPERATIONAL_TRANSFORM',
      'THREE_WAY_MERGE',
    ];

    return automaticStrategies.includes(strategy);
  }

  private static calculateMergeConfidence(
    context: ResolutionContext,
    mergeResult: unknown,
  ): ResolutionConfidence {
    if (context.operationCount > 5) {
      return 'LOW';
    }

    if (context.conflictType === 'SEMANTIC_CONFLICT') {
      return 'MEDIUM';
    }

    if (mergeResult === null || mergeResult === undefined) {
      return 'LOW';
    }

    return 'HIGH';
  }

  getStrategy(): ConflictResolutionStrategy {
    return this.strategy;
  }

  getConfidence(): ResolutionConfidence {
    return this.confidence;
  }

  getResolvedAt(): Date {
    return this.resolvedAt;
  }

  getResolvedBy(): DeviceId {
    return this.resolvedBy;
  }

  getContext(): ResolutionContext {
    return this.context;
  }

  getResultData(): unknown {
    return this.resultData;
  }

  getUserSelection(): UserSelection | undefined {
    return this.userSelection;
  }

  isAutomaticResolution(): boolean {
    return this.automaticResolution;
  }

  isManualResolution(): boolean {
    return !this.automaticResolution;
  }

  isHighConfidence(): boolean {
    return this.confidence === 'HIGH';
  }

  isMergeResolution(): boolean {
    return (
      this.strategy === 'MERGE_OPERATIONS' ||
      this.strategy === 'OPERATIONAL_TRANSFORM' ||
      this.strategy === 'THREE_WAY_MERGE'
    );
  }

  requiresUserValidation(): boolean {
    return (
      this.confidence === 'LOW' ||
      this.strategy === 'USER_DECISION_REQUIRED' ||
      (this.isMergeResolution() && this.context.conflictType === 'SEMANTIC_CONFLICT')
    );
  }

  getResolutionSummary(): string {
    const strategyDescription = this.getStrategyDescription();
    const confidenceLevel = this.confidence.toLowerCase();
    const deviceId = this.resolvedBy.getShortId();

    if (this.isManualResolution()) {
      return `Manual resolution by ${deviceId} using ${strategyDescription}`;
    }

    return `Automatic resolution using ${strategyDescription} (${confidenceLevel} confidence)`;
  }

  private getStrategyDescription(): string {
    switch (this.strategy) {
      case 'LAST_WRITER_WINS':
        return 'last writer wins';
      case 'FIRST_WRITER_WINS':
        return 'first writer wins';
      case 'MERGE_OPERATIONS':
        return 'operation merging';
      case 'OPERATIONAL_TRANSFORM':
        return 'operational transformation';
      case 'THREE_WAY_MERGE':
        return 'three-way merge';
      case 'USER_DECISION_REQUIRED':
        return 'user decision';
      case 'MANUAL_SELECTION':
        return 'manual selection';
      default:
        return 'unknown strategy';
    }
  }

  getResolutionMetrics(): {
    resolutionTimeMs: number;
    operationsInvolved: number;
    devicesInvolved: number;
    wasAutomated: boolean;
    confidence: ResolutionConfidence;
  } {
    const resolutionTimeMs = this.resolvedAt.getTime() - this.context.detectedAt.getTime();

    return {
      resolutionTimeMs,
      operationsInvolved: this.context.operationCount,
      devicesInvolved: this.context.involvedDevices.length,
      wasAutomated: this.automaticResolution,
      confidence: this.confidence,
    };
  }

  validateResolution(): Result<void, Error> {
    if (this.resultData === null || this.resultData === undefined) {
      return err(new Error('Resolution result data cannot be null or undefined'));
    }

    if (this.isManualResolution() && !this.userSelection) {
      return err(new Error('Manual resolution must include user selection'));
    }

    if (this.userSelection) {
      const selectionResult = this.validateUserSelection(this.userSelection);
      if (selectionResult.isErr()) {
        return selectionResult;
      }
    }

    return ok(undefined);
  }

  private validateUserSelection(selection: UserSelection): Result<void, Error> {
    if (!selection.selectedOperationId || selection.selectedOperationId.trim().length === 0) {
      return err(new Error('User selection must include a valid operation ID'));
    }

    return ok(undefined);
  }

  equals(other: ConflictResolution): boolean {
    return (
      this.strategy === other.strategy &&
      this.context.conflictId === other.context.conflictId &&
      this.resolvedBy.equals(other.resolvedBy) &&
      JSON.stringify(this.resultData) === JSON.stringify(other.resultData)
    );
  }

  clone(): Result<ConflictResolution, Error> {
    try {
      return ok(
        new ConflictResolution(
          this.strategy,
          this.confidence,
          new Date(this.resolvedAt.getTime()),
          this.resolvedBy,
          { ...this.context },
          JSON.parse(JSON.stringify(this.resultData)),
          this.userSelection ? { ...this.userSelection } : undefined,
          this.automaticResolution,
        ),
      );
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to clone conflict resolution'));
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      strategy: this.strategy,
      confidence: this.confidence,
      resolvedAt: this.resolvedAt.toISOString(),
      resolvedBy: this.resolvedBy.getValue(),
      context: this.context,
      resultData: this.resultData,
      userSelection: this.userSelection,
      automaticResolution: this.automaticResolution,
    };
  }

  toString(): string {
    return `ConflictResolution(${this.strategy}, ${this.confidence}, ${this.resolvedBy.getShortId()})`;
  }

  isExpired(maxAgeMs: number): boolean {
    const age = Date.now() - this.resolvedAt.getTime();
    return age > maxAgeMs;
  }

  getAgeMs(): number {
    return Date.now() - this.resolvedAt.getTime();
  }

  canBeUndone(): boolean {
    return this.isManualResolution() || this.confidence === 'LOW';
  }
}
