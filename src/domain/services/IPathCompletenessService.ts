import type { Result } from 'neverthrow';
import type { ProcessingError } from '../errors/DomainErrors.js';
import type { AtomicArgumentId } from '../shared/value-objects.js';

export interface IPathCompletenessService {
  validatePathCompleteness(
    argumentSet: AtomicArgumentId[],
  ): Promise<Result<PathCompletenessValidationResult, ProcessingError>>;

  ensurePathCompleteness(
    startArgumentId: AtomicArgumentId,
    endArgumentId: AtomicArgumentId,
  ): Promise<Result<PathCompleteArgumentSet, ProcessingError>>;

  findRequiredIntermediateArguments(
    partialArgumentSet: AtomicArgumentId[],
  ): Promise<Result<RequiredIntermediateArguments, ProcessingError>>;

  validateArgumentChainIntegrity(
    argumentChain: AtomicArgumentId[],
  ): Promise<Result<ChainIntegrityValidationResult, ProcessingError>>;

  computeMinimalPathCompleteSet(
    requiredArguments: AtomicArgumentId[],
  ): Promise<Result<MinimalPathCompleteSet, ProcessingError>>;

  analyzeArgumentDependencies(
    targetArgumentId: AtomicArgumentId,
  ): Promise<Result<ArgumentDependencyAnalysis, ProcessingError>>;
}

export interface PathCompletenessValidationResult {
  isComplete: boolean;
  argumentSet: AtomicArgumentId[];
  missingArguments: AtomicArgumentId[];
}

export interface PathCompleteArgumentSet {
  startArgument: AtomicArgumentId;
  endArgument: AtomicArgumentId;
  allRequiredArguments: AtomicArgumentId[];
  allPaths: AtomicArgumentId[][];
}

export interface RequiredIntermediateArguments {
  originalSet: AtomicArgumentId[];
  requiredArguments: AtomicArgumentId[];
  gaps: ConnectionGap[];
}

export interface ChainIntegrityValidationResult {
  isIntact: boolean;
  integrityIssues: ChainIntegrityIssue[];
  brokenLinks: BrokenLink[];
}

export interface MinimalPathCompleteSet {
  minimalArguments: AtomicArgumentId[];
  redundantArguments: AtomicArgumentId[];
}

export interface ArgumentDependencyAnalysis {
  targetArgument: AtomicArgumentId;
  directDependencies: AtomicArgumentId[];
  transitiveDependencies: AtomicArgumentId[];
  dependencyLevels: Map<AtomicArgumentId, number>;
}

export interface ArgumentConnection {
  from: AtomicArgumentId;
  to: AtomicArgumentId;
  type: 'direct' | 'transitive';
}

export interface ConnectedPair {
  from: AtomicArgumentId;
  to: AtomicArgumentId;
}

export interface ConnectionGap {
  from: AtomicArgumentId;
  to: AtomicArgumentId;
}

export interface ChainIntegrityIssue {
  type: string;
  description: string;
  position: number;
}

export interface BrokenLink {
  from: AtomicArgumentId;
  to: AtomicArgumentId;
  reason: string;
}
