import { err, type Result } from 'neverthrow';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import { ValidationError } from '../shared/result.js';

export const createBranchFromConclusion = (
  sourceArgument: AtomicArgument,
  conclusionIndex: number,
): Result<AtomicArgument, ValidationError> => {
  const conclusion = sourceArgument.getConclusionAt(conclusionIndex);
  if (!conclusion) {
    return err(new ValidationError('Invalid conclusion index for branching'));
  }

  return AtomicArgument.create([conclusion]);
};

export const createBranchToPremise = (
  targetArgument: AtomicArgument,
  premiseIndex: number,
): Result<AtomicArgument, ValidationError> => {
  const premise = targetArgument.getPremiseAt(premiseIndex);
  if (!premise) {
    return err(new ValidationError('Invalid premise index for branching'));
  }

  return AtomicArgument.create([], [premise]);
};

export const createIndependentBranch = (): AtomicArgument => {
  return AtomicArgument.createBootstrap();
};

export const createBranchWithStatements = (
  premises: Statement[] = [],
  conclusions: Statement[] = [],
): Result<AtomicArgument, ValidationError> => {
  return AtomicArgument.create(premises, conclusions);
};

export const canBranchFromConclusion = (
  sourceArgument: AtomicArgument,
  conclusionIndex: number,
): boolean => {
  return sourceArgument.getConclusionAt(conclusionIndex) !== undefined;
};

export const canBranchToPremise = (
  targetArgument: AtomicArgument,
  premiseIndex: number,
): boolean => {
  return targetArgument.getPremiseAt(premiseIndex) !== undefined;
};
