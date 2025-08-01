import { err, ok, type Result } from 'neverthrow';

import type { AtomicArgument, SideLabels } from '../../domain/entities/AtomicArgument.js';
import type { ValidationError } from '../../domain/shared/result.js';
import { AtomicArgumentId, StatementId } from '../../domain/shared/value-objects/index.js';
import type { AtomicArgumentDTO } from '../queries/shared-types.js';

/**
 * Converts an AtomicArgument domain entity to an AtomicArgumentDTO
 */
export function atomicArgumentToDTO(argument: AtomicArgument): AtomicArgumentDTO {
  const sideLabels = argument.getSideLabels();

  const dto: AtomicArgumentDTO = {
    id: argument.getId().getValue(),
    premiseIds: argument.getPremises().map((stmt) => stmt.getId().getValue()),
    conclusionIds: argument.getConclusions().map((stmt) => stmt.getId().getValue()),
  };

  if (sideLabels.left || sideLabels.right) {
    dto.sideLabels = {
      ...(sideLabels.left && { left: sideLabels.left }),
      ...(sideLabels.right && { right: sideLabels.right }),
    };
  }

  return dto;
}

/**
 * Converts multiple AtomicArguments to DTOs
 */
export function atomicArgumentsToDTOs(atomicArguments: AtomicArgument[]): AtomicArgumentDTO[] {
  return atomicArguments.map((argument) => atomicArgumentToDTO(argument));
}

/**
 * Represents an AtomicArgument with StatementId references for intermediate processing
 */
export interface AtomicArgumentReconstructionData {
  id: AtomicArgumentId;
  premiseIds: StatementId[];
  conclusionIds: StatementId[];
  sideLabels: SideLabels;
}

/**
 * Converts an AtomicArgumentDTO to reconstruction data
 */
export function atomicArgumentFromDTO(
  dto: AtomicArgumentDTO,
): Result<AtomicArgumentReconstructionData, ValidationError> {
  // Validate and create AtomicArgumentId
  const idResult = AtomicArgumentId.create(dto.id);
  if (idResult.isErr()) {
    return err(idResult.error);
  }

  // Validate and create StatementIds for premises
  const premiseIds: StatementId[] = [];
  for (const premiseId of dto.premiseIds) {
    const statementIdResult = StatementId.create(premiseId);
    if (statementIdResult.isErr()) {
      return err(statementIdResult.error);
    }
    premiseIds.push(statementIdResult.value);
  }

  // Validate and create StatementIds for conclusions
  const conclusionIds: StatementId[] = [];
  for (const conclusionId of dto.conclusionIds) {
    const statementIdResult = StatementId.create(conclusionId);
    if (statementIdResult.isErr()) {
      return err(statementIdResult.error);
    }
    conclusionIds.push(statementIdResult.value);
  }

  // Process side labels, filtering out undefined values
  const sideLabels: SideLabels = {};
  if (dto.sideLabels?.left !== undefined) {
    sideLabels.left = dto.sideLabels.left;
  }
  if (dto.sideLabels?.right !== undefined) {
    sideLabels.right = dto.sideLabels.right;
  }

  return ok({
    id: idResult.value,
    premiseIds,
    conclusionIds,
    sideLabels,
  });
}
