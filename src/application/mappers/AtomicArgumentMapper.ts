import { err, ok, type Result } from 'neverthrow';

import type { AtomicArgument, SideLabels } from '../../domain/entities/AtomicArgument.js';
import type { ValidationError } from '../../domain/shared/result.js';
import { AtomicArgumentId, OrderedSetId } from '../../domain/shared/value-objects.js';
import type { AtomicArgumentDTO } from '../queries/shared-types.js';

/**
 * Converts an AtomicArgument domain entity to an AtomicArgumentDTO
 */
export function atomicArgumentToDTO(argument: AtomicArgument): AtomicArgumentDTO {
  const sideLabels = argument.getSideLabels();

  const dto: AtomicArgumentDTO = {
    id: argument.getId().getValue(),
    premiseSetId: argument.getPremiseSet()?.getValue() ?? null,
    conclusionSetId: argument.getConclusionSet()?.getValue() ?? null,
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
 * Represents an AtomicArgument with OrderedSetId references for intermediate processing
 */
export interface AtomicArgumentReconstructionData {
  id: AtomicArgumentId;
  premiseSetId: OrderedSetId | null;
  conclusionSetId: OrderedSetId | null;
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

  // Validate and create OrderedSetId for premise set (if not null)
  let premiseSetRef: OrderedSetId | null = null;
  if (dto.premiseSetId !== null) {
    const premiseSetIdResult = OrderedSetId.create(dto.premiseSetId);
    if (premiseSetIdResult.isErr()) {
      return err(premiseSetIdResult.error);
    }
    premiseSetRef = premiseSetIdResult.value;
  }

  // Validate and create OrderedSetId for conclusion set (if not null)
  let conclusionSetRef: OrderedSetId | null = null;
  if (dto.conclusionSetId !== null) {
    const conclusionSetIdResult = OrderedSetId.create(dto.conclusionSetId);
    if (conclusionSetIdResult.isErr()) {
      return err(conclusionSetIdResult.error);
    }
    conclusionSetRef = conclusionSetIdResult.value;
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
    premiseSetId: premiseSetRef,
    conclusionSetId: conclusionSetRef,
    sideLabels,
  });
}
