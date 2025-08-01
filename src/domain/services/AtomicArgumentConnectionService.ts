import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import { ValidationError } from '../shared/result.js';
import { PremisePosition } from '../shared/value-objects/index.js';

export interface StatementConnection {
  statement: Statement;
  fromConclusionPosition: number;
  toPremisePosition: PremisePosition;
}

export const findConnectionsTo = (
  sourceArgument: AtomicArgument,
  targetArgument: AtomicArgument,
): StatementConnection[] => {
  const connections: StatementConnection[] = [];

  sourceArgument.getConclusions().forEach((conclusion, fromPos) => {
    targetArgument.getPremises().forEach((premise, toPos) => {
      if (conclusion.equals(premise)) {
        const premisePositionResult = PremisePosition.create(toPos);
        if (premisePositionResult.isOk()) {
          connections.push({
            statement: conclusion,
            fromConclusionPosition: fromPos,
            toPremisePosition: premisePositionResult.value,
          });
        }
      }
    });
  });

  return connections;
};

export const canConnectAt = (
  sourceArgument: AtomicArgument,
  conclusionIndex: number,
  targetArgument: AtomicArgument,
  premiseIndex: number,
): boolean => {
  const conclusion = sourceArgument.getConclusionAt(conclusionIndex);
  const premise = targetArgument.getPremiseAt(premiseIndex);

  return conclusion !== undefined && premise !== undefined && conclusion.equals(premise);
};

export const connectConclusionToPremise = (
  sourceArgument: AtomicArgument,
  conclusionIndex: number,
  targetArgument: AtomicArgument,
  premiseIndex: number,
  sharedStatement: Statement,
): Result<void, ValidationError> => {
  if (conclusionIndex < 0 || conclusionIndex >= sourceArgument.getConclusionCount()) {
    return err(new ValidationError('Invalid conclusion position'));
  }

  if (premiseIndex < 0 || premiseIndex >= targetArgument.getPremiseCount()) {
    return err(new ValidationError('Invalid premise position'));
  }

  const setConclusionResult = sourceArgument.setConclusionAt(conclusionIndex, sharedStatement);
  if (setConclusionResult.isErr()) {
    return err(setConclusionResult.error);
  }

  const setPremiseResult = targetArgument.setPremiseAt(premiseIndex, sharedStatement);
  if (setPremiseResult.isErr()) {
    return err(setPremiseResult.error);
  }

  return ok(undefined);
};

export const validateConnectionSafety = (
  sourceArgument: AtomicArgument,
  targetArgument: AtomicArgument,
): Result<boolean, ValidationError> => {
  if (sourceArgument.equals(targetArgument)) {
    return err(new ValidationError('Cannot connect argument to itself'));
  }

  if (sourceArgument.getConclusionCount() === 0) {
    return err(new ValidationError('Source argument has no conclusions'));
  }

  if (targetArgument.getPremiseCount() === 0) {
    return err(new ValidationError('Target argument has no premises'));
  }

  const connections = findConnectionsTo(sourceArgument, targetArgument);
  if (connections.length === 0) {
    return err(new ValidationError('Arguments cannot connect: no matching statements'));
  }

  const reverseConnections = findConnectionsTo(targetArgument, sourceArgument);
  if (reverseConnections.length > 0) {
    return err(new ValidationError('Connection would create direct cycle'));
  }

  return ok(true);
};

export const isDirectlyConnected = (
  sourceArgument: AtomicArgument,
  targetArgument: AtomicArgument,
): boolean => {
  return (
    findConnectionsTo(sourceArgument, targetArgument).length > 0 ||
    findConnectionsTo(targetArgument, sourceArgument).length > 0
  );
};

export const sharesStatementWith = (
  sourceArgument: AtomicArgument,
  targetArgument: AtomicArgument,
): boolean => {
  for (const premise of sourceArgument.getPremises()) {
    if (
      targetArgument.getPremises().some((p) => p.equals(premise)) ||
      targetArgument.getConclusions().some((c) => c.equals(premise))
    ) {
      return true;
    }
  }

  for (const conclusion of sourceArgument.getConclusions()) {
    if (
      targetArgument.getPremises().some((p) => p.equals(conclusion)) ||
      targetArgument.getConclusions().some((c) => c.equals(conclusion))
    ) {
      return true;
    }
  }

  return false;
};
