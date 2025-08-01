import { err, ok, type Result } from 'neverthrow';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import { ValidationError } from '../shared/result.js';
import {
  AtomicArgumentId,
  SideLabels,
  StatementCollection,
  Timestamp,
} from '../shared/value-objects/index.js';

export const createAtomicArgument = (
  premises: Statement[] = [],
  conclusions: Statement[] = [],
  sideLabels: SideLabels = SideLabels.empty(),
): Result<AtomicArgument, ValidationError> => {
  const premisesCollectionResult = StatementCollection.create(premises);
  if (premisesCollectionResult.isErr()) {
    return err(premisesCollectionResult.error);
  }

  const conclusionsCollectionResult = StatementCollection.create(conclusions);
  if (conclusionsCollectionResult.isErr()) {
    return err(conclusionsCollectionResult.error);
  }

  const now = Timestamp.now();
  const id = AtomicArgumentId.generate();

  return createAtomicArgumentInternal(
    id,
    premisesCollectionResult.value,
    conclusionsCollectionResult.value,
    now,
    now,
    sideLabels,
  );
};

export const createBootstrapAtomicArgument = (): Result<AtomicArgument, ValidationError> => {
  const now = Timestamp.now();
  const id = AtomicArgumentId.generate();

  return createAtomicArgumentInternal(
    id,
    StatementCollection.empty(),
    StatementCollection.empty(),
    now,
    now,
    SideLabels.empty(),
  );
};

export const reconstructAtomicArgument = (
  id: AtomicArgumentId,
  premises: Statement[],
  conclusions: Statement[],
  createdAt: number,
  modifiedAt: number,
  sideLabels: { left?: string; right?: string } = {},
): Result<AtomicArgument, ValidationError> => {
  const timestampCreatedResult = Timestamp.create(createdAt);
  if (timestampCreatedResult.isErr()) {
    return err(timestampCreatedResult.error);
  }

  const timestampModifiedResult = Timestamp.create(modifiedAt);
  if (timestampModifiedResult.isErr()) {
    return err(timestampModifiedResult.error);
  }

  if (timestampModifiedResult.value.isBefore(timestampCreatedResult.value)) {
    return err(new ValidationError('modified timestamp cannot be before created timestamp'));
  }

  const sideLabelsResult = SideLabels.fromStrings(sideLabels);
  if (sideLabelsResult.isErr()) {
    return err(sideLabelsResult.error);
  }

  const premisesCollectionResult = StatementCollection.create(premises);
  if (premisesCollectionResult.isErr()) {
    return err(premisesCollectionResult.error);
  }

  const conclusionsCollectionResult = StatementCollection.create(conclusions);
  if (conclusionsCollectionResult.isErr()) {
    return err(conclusionsCollectionResult.error);
  }

  return createAtomicArgumentInternal(
    id,
    premisesCollectionResult.value,
    conclusionsCollectionResult.value,
    timestampCreatedResult.value,
    timestampModifiedResult.value,
    sideLabelsResult.value,
  );
};

const createAtomicArgumentInternal = (
  id: AtomicArgumentId,
  premises: StatementCollection,
  conclusions: StatementCollection,
  createdAt: Timestamp,
  modifiedAt: Timestamp,
  sideLabels: SideLabels,
): Result<AtomicArgument, ValidationError> => {
  try {
    const atomicArgument = AtomicArgument.fromFactory(
      id,
      premises,
      conclusions,
      createdAt,
      modifiedAt,
      sideLabels,
    );
    return ok(atomicArgument);
  } catch (error) {
    return err(error as ValidationError);
  }
};
