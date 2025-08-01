import { err, ok, type Result } from 'neverthrow';
import { Statement } from '../../domain/entities/Statement.js';
import { ValidationError } from '../../domain/shared/result.js';
import { StatementId } from '../../domain/shared/value-objects/index.js';
import type { StatementDTO } from '../queries/statement-queries.js';

/**
 * Converts a Statement domain entity to a StatementDTO
 */
export function statementToDTO(statement: Statement): StatementDTO {
  return {
    id: statement.getId().getValue(),
    content: statement.getContent(),
    usageCount: statement.getUsageCount(),
    createdAt: new Date(statement.getCreatedAt()).toISOString(),
    modifiedAt: new Date(statement.getModifiedAt()).toISOString(),
  };
}

/**
 * Converts a StatementDTO to a Statement domain entity
 */
export function statementToDomain(dto: StatementDTO): Result<Statement, ValidationError> {
  // Parse the statement ID
  const statementIdResult = StatementId.create(dto.id);
  if (statementIdResult.isErr()) {
    return err(statementIdResult.error);
  }

  // Parse timestamps
  const createdAt = new Date(dto.createdAt).getTime();
  const modifiedAt = new Date(dto.modifiedAt).getTime();

  if (Number.isNaN(createdAt)) {
    return err(new ValidationError('Invalid createdAt timestamp'));
  }

  if (Number.isNaN(modifiedAt)) {
    return err(new ValidationError('Invalid modifiedAt timestamp'));
  }

  // Reconstruct the statement
  return Statement.reconstruct(
    statementIdResult.value,
    dto.content,
    createdAt,
    modifiedAt,
    dto.usageCount,
  );
}

/**
 * Converts multiple Statements to DTOs
 */
export function statementsToDTOs(statements: Statement[]): StatementDTO[] {
  return statements.map((statement) => statementToDTO(statement));
}

/**
 * Converts multiple DTOs to Statements
 */
export function statementsToDomains(dtos: StatementDTO[]): Result<Statement[], ValidationError> {
  const statements: Statement[] = [];

  for (const dto of dtos) {
    const result = statementToDomain(dto);
    if (result.isErr()) {
      return err(result.error);
    }
    statements.push(result.value);
  }

  return ok(statements);
}
