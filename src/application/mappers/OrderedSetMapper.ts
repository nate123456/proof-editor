import { err, ok, type Result } from 'neverthrow';
import { OrderedSet } from '../../domain/entities/OrderedSet.js';
import { ValidationError } from '../../domain/shared/result.js';
import { AtomicArgumentId, OrderedSetId, StatementId } from '../../domain/shared/value-objects.js';
import type { OrderedSetDTO } from '../queries/shared-types.js';

/**
 * Converts an OrderedSet domain entity to an OrderedSetDTO
 * @param orderedSet The OrderedSet entity
 * @param usages Optional usage information to include
 */
export function orderedSetToDTO(
  orderedSet: OrderedSet,
  usages?: Array<{ argumentId: string; usage: 'premise' | 'conclusion' }>,
): OrderedSetDTO {
  // If usages not provided, derive from the OrderedSet's internal tracking
  const usedBy = usages || [
    ...orderedSet.getReferencedByAsPremise().map((argId) => ({
      argumentId: argId.getValue(),
      usage: 'premise' as const,
    })),
    ...orderedSet.getReferencedByAsConclusion().map((argId) => ({
      argumentId: argId.getValue(),
      usage: 'conclusion' as const,
    })),
  ];

  return {
    id: orderedSet.getId().getValue(),
    statementIds: orderedSet.getStatementIds().map((id) => id.getValue()),
    usageCount: orderedSet.getTotalReferenceCount(),
    usedBy,
  };
}

/**
 * Converts multiple OrderedSets to DTOs
 */
export function orderedSetsToDTOs(
  orderedSets: OrderedSet[],
  usageMap?: Map<string, Array<{ argumentId: string; usage: 'premise' | 'conclusion' }>>,
): OrderedSetDTO[] {
  return orderedSets.map((orderedSet) => {
    const usages = usageMap?.get(orderedSet.getId().getValue());
    return orderedSetToDTO(orderedSet, usages);
  });
}

/**
 * Creates usage information from AtomicArgumentIds
 */
export function createUsageInfo(
  argumentIds: AtomicArgumentId[],
  usage: 'premise' | 'conclusion',
): Array<{ argumentId: string; usage: 'premise' | 'conclusion' }> {
  return argumentIds.map((argId) => ({
    argumentId: argId.getValue(),
    usage,
  }));
}

/**
 * Converts an OrderedSetDTO to an OrderedSet domain entity
 */
export function orderedSetFromDTO(dto: OrderedSetDTO): Result<OrderedSet, ValidationError> {
  // Parse the ordered set ID
  const orderedSetIdResult = OrderedSetId.create(dto.id);
  if (orderedSetIdResult.isErr()) {
    return err(orderedSetIdResult.error);
  }

  // Parse statement IDs
  const statementIds: StatementId[] = [];
  for (const statementIdStr of dto.statementIds) {
    const statementIdResult = StatementId.create(statementIdStr);
    if (statementIdResult.isErr()) {
      return err(
        new ValidationError(
          `Invalid statement ID in ordered set: ${statementIdResult.error.message}`,
          { statementId: statementIdStr },
        ),
      );
    }
    statementIds.push(statementIdResult.value);
  }

  // Parse usage information into references
  const referencedBy: {
    asPremise: AtomicArgumentId[];
    asConclusion: AtomicArgumentId[];
  } = {
    asPremise: [],
    asConclusion: [],
  };

  for (const usage of dto.usedBy) {
    const argumentIdResult = AtomicArgumentId.create(usage.argumentId);
    if (argumentIdResult.isErr()) {
      return err(
        new ValidationError(`Invalid argument ID in usage: ${argumentIdResult.error.message}`, {
          argumentId: usage.argumentId,
        }),
      );
    }

    if (usage.usage === 'premise') {
      referencedBy.asPremise.push(argumentIdResult.value);
    } else {
      referencedBy.asConclusion.push(argumentIdResult.value);
    }
  }

  // Reconstruct the ordered set with current timestamp as both created and modified
  const now = Date.now();
  return OrderedSet.reconstruct(orderedSetIdResult.value, statementIds, now, now, referencedBy);
}

/**
 * Converts multiple OrderedSetDTOs to OrderedSets
 */
export function orderedSetsFromDTOs(dtos: OrderedSetDTO[]): Result<OrderedSet[], ValidationError> {
  const orderedSets: OrderedSet[] = [];

  for (const dto of dtos) {
    const result = orderedSetFromDTO(dto);
    if (result.isErr()) {
      return err(result.error);
    }
    orderedSets.push(result.value);
  }

  return ok(orderedSets);
}
