import { ok, type Result } from 'neverthrow';

import type { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import type { ValidationError } from '../../domain/shared/result.js';
import {
  type AtomicArgumentId,
  SideLabel,
  type StatementId,
} from '../../domain/shared/value-objects/index.js';
import type { AtomicArgumentDTO } from '../queries/shared-types.js';

/**
 * Converts an AtomicArgument domain entity to an AtomicArgumentDTO
 */
export function atomicArgumentToDTO(argument: AtomicArgument): AtomicArgumentDTO {
  const sideLabelsStrings = argument.getSideLabels();

  const dto: AtomicArgumentDTO = {
    id: argument.getId(),
    premiseIds: argument.getPremises().map((stmt) => stmt.getId()),
    conclusionIds: argument.getConclusions().map((stmt) => stmt.getId()),
  };

  // Convert string labels to SideLabel value objects if present
  if (sideLabelsStrings.left || sideLabelsStrings.right) {
    const sideLabels: { left?: SideLabel; right?: SideLabel } = {};

    if (sideLabelsStrings.left) {
      const leftResult = SideLabel.create(sideLabelsStrings.left);
      if (leftResult.isOk()) {
        sideLabels.left = leftResult.value;
      }
    }

    if (sideLabelsStrings.right) {
      const rightResult = SideLabel.create(sideLabelsStrings.right);
      if (rightResult.isOk()) {
        sideLabels.right = rightResult.value;
      }
    }

    if (sideLabels.left || sideLabels.right) {
      dto.sideLabels = sideLabels;
    }
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
  sideLabels: { left?: string; right?: string };
}

/**
 * Converts an AtomicArgumentDTO to reconstruction data
 */
export function atomicArgumentFromDTO(
  dto: AtomicArgumentDTO,
): Result<AtomicArgumentReconstructionData, ValidationError> {
  // DTO already contains value objects, so we don't need to create them
  const id = dto.id;
  const premiseIds = dto.premiseIds;
  const conclusionIds = dto.conclusionIds;

  // Convert SideLabel value objects back to strings for reconstruction
  const sideLabels: { left?: string; right?: string } = {};
  if (dto.sideLabels?.left !== undefined) {
    sideLabels.left = dto.sideLabels.left.getValue();
  }
  if (dto.sideLabels?.right !== undefined) {
    sideLabels.right = dto.sideLabels.right.getValue();
  }

  return ok({
    id,
    premiseIds,
    conclusionIds,
    sideLabels,
  });
}
