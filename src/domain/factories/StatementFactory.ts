import { err, ok, type Result } from 'neverthrow';
import { Statement } from '../entities/Statement.js';
import type { ValidationError } from '../shared/result.js';
import {
  StatementContent,
  StatementId,
  Timestamp,
  UsageCount,
} from '../shared/value-objects/index.js';

export const createStatement = (content: string): Result<Statement, ValidationError> => {
  const contentResult = StatementContent.create(content);
  if (contentResult.isErr()) {
    return err(contentResult.error);
  }

  const now = Timestamp.now();
  const id = StatementId.generate();
  const usageCount = UsageCount.zero();

  return createStatementInternal(id, contentResult.value, now, now, usageCount);
};

export const createStatementWithContent = (
  content: StatementContent,
): Result<Statement, ValidationError> => {
  const now = Timestamp.now();
  const id = StatementId.generate();
  const usageCount = UsageCount.zero();

  return createStatementInternal(id, content, now, now, usageCount);
};

export const createPlaceholderStatement = (): Result<Statement, ValidationError> => {
  return createStatement('[Enter text]');
};

export const reconstructStatement = (
  id: StatementId,
  content: string,
  createdAt: number,
  modifiedAt: number,
  usageCount = 0,
): Result<Statement, ValidationError> => {
  const contentResult = StatementContent.create(content);
  if (contentResult.isErr()) {
    return err(contentResult.error);
  }

  const timestampCreatedResult = Timestamp.create(createdAt);
  if (timestampCreatedResult.isErr()) {
    return err(timestampCreatedResult.error);
  }

  const timestampModifiedResult = Timestamp.create(modifiedAt);
  if (timestampModifiedResult.isErr()) {
    return err(timestampModifiedResult.error);
  }

  const usageCountResult = UsageCount.create(usageCount);
  if (usageCountResult.isErr()) {
    return err(usageCountResult.error);
  }

  return createStatementInternal(
    id,
    contentResult.value,
    timestampCreatedResult.value,
    timestampModifiedResult.value,
    usageCountResult.value,
  );
};

const createStatementInternal = (
  id: StatementId,
  content: StatementContent,
  createdAt: Timestamp,
  modifiedAt: Timestamp,
  usageCount: UsageCount,
): Result<Statement, ValidationError> => {
  try {
    const statement = Statement.fromFactory(id, content, createdAt, modifiedAt, usageCount);
    return ok(statement);
  } catch (error) {
    return err(error as ValidationError);
  }
};
