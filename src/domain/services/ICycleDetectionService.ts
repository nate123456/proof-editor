import type { Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { ProcessingError } from '../errors/DomainErrors.js';
import type { AtomicArgumentId, StatementId } from '../shared/value-objects/index.js';

export interface ICycleDetectionService {
  wouldCreateCycle(
    provider: AtomicArgument,
    consumer: AtomicArgument,
    argumentMap: Map<string, AtomicArgument>,
  ): Result<CycleDetection, ProcessingError>;

  findAllCycles(argumentMap: Map<string, AtomicArgument>): Result<ArgumentCycle[], ProcessingError>;

  analyzeCycleSeverity(
    cycle: ArgumentCycle,
    argumentMap: Map<string, AtomicArgument>,
  ): CycleSeverity;
}

export interface CycleDetection {
  hasCycle: boolean;
  cyclePath?: AtomicArgumentId[];
  description?: string;
}

export interface ArgumentCycle {
  argumentIds: AtomicArgumentId[];
  length: number;
  sharedStatements: StatementId[];
}

export interface CycleSeverity {
  severity: 'low' | 'medium' | 'high';
  isAcceptable: boolean;
  reason: string;
}
