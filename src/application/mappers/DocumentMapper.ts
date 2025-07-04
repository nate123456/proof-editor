import { err, ok, type Result } from 'neverthrow';
import { ProofAggregate } from '../../domain/aggregates/ProofAggregate.js';
import { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import type { OrderedSet } from '../../domain/entities/OrderedSet.js';
import type { Tree } from '../../domain/entities/Tree.js';
import { ValidationError } from '../../domain/shared/result.js';
import { ProofId } from '../../domain/shared/value-objects.js';
import type { DocumentDTO, DocumentStatsDTO } from '../queries/document-queries.js';
import { atomicArgumentFromDTO, atomicArgumentToDTO } from './AtomicArgumentMapper.js';
import { orderedSetFromDTO, orderedSetToDTO } from './OrderedSetMapper.js';
import { statementToDomain, statementToDTO } from './StatementMapper.js';
import { treeToDTO } from './TreeMapper.js';

/**
 * Converts a ProofAggregate (document) to a DocumentDTO
 * @param aggregate The proof aggregate
 * @param trees The trees associated with the document
 * @param includeStats Whether to include statistics
 */
export function documentToDTO(
  aggregate: ProofAggregate,
  trees: Tree[] = [],
  includeStats = false,
): DocumentDTO {
  // Convert statements to DTOs
  const statementDTOs: Record<string, ReturnType<typeof statementToDTO>> = {};
  for (const [id, statement] of aggregate.getStatements()) {
    statementDTOs[id.getValue()] = statementToDTO(statement);
  }

  // Convert ordered sets to DTOs
  const orderedSetDTOs: Record<string, ReturnType<typeof orderedSetToDTO>> = {};
  for (const [id, orderedSet] of aggregate.getOrderedSets()) {
    orderedSetDTOs[id.getValue()] = orderedSetToDTO(orderedSet);
  }

  // Convert atomic arguments to DTOs
  const atomicArgumentDTOs: Record<string, ReturnType<typeof atomicArgumentToDTO>> = {};
  for (const [id, argument] of aggregate.getArguments()) {
    atomicArgumentDTOs[id.getValue()] = atomicArgumentToDTO(argument);
  }

  // Convert trees to DTOs
  const treeDTOs: Record<string, ReturnType<typeof treeToDTO>> = {};
  for (const tree of trees) {
    treeDTOs[tree.getId().getValue()] = treeToDTO(tree);
  }

  const dto: DocumentDTO = {
    id: aggregate.getId().getValue(),
    version: aggregate.getVersion(),
    createdAt: new Date().toISOString(), // ProofAggregate doesn't track timestamps currently
    modifiedAt: new Date().toISOString(), // ProofAggregate doesn't track timestamps currently
    statements: statementDTOs,
    orderedSets: orderedSetDTOs,
    atomicArguments: atomicArgumentDTOs,
    trees: treeDTOs,
  };

  if (includeStats) {
    dto.stats = createDocumentStats(aggregate, trees);
  }

  return dto;
}

/**
 * Converts a DocumentDTO to a ProofAggregate and Trees
 * @param dto The DocumentDTO to convert
 * @returns Result containing the ProofAggregate and associated Trees
 */
export function documentFromDTO(
  dto: DocumentDTO,
): Result<{ aggregate: ProofAggregate; trees: Tree[] }, ValidationError> {
  try {
    // Parse the document ID
    const docIdResult = ProofId.create(dto.id);
    if (docIdResult.isErr()) {
      return err(docIdResult.error);
    }

    // Convert statements from DTOs
    const statements = new Map();
    for (const [id, statementDTO] of Object.entries(dto.statements)) {
      const statementResult = statementToDomain(statementDTO);
      if (statementResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to convert statement ${id}: ${statementResult.error.message}`,
          ),
        );
      }
      statements.set(statementResult.value.getId(), statementResult.value);
    }

    // Convert ordered sets from DTOs
    const orderedSets = new Map();
    for (const [id, orderedSetDTO] of Object.entries(dto.orderedSets)) {
      const orderedSetResult = orderedSetFromDTO(orderedSetDTO);
      if (orderedSetResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to convert ordered set ${id}: ${orderedSetResult.error.message}`,
          ),
        );
      }
      orderedSets.set(orderedSetResult.value.getId(), orderedSetResult.value);
    }

    // Validate that all statement references in ordered sets exist
    for (const [_id, orderedSet] of orderedSets) {
      for (const statementId of orderedSet.getStatementIds()) {
        // Check if any statement has the same ID value
        let found = false;
        for (const [stmtId, _stmt] of statements) {
          if (stmtId.getValue() === statementId.getValue()) {
            found = true;
            break;
          }
        }
        if (!found) {
          return err(
            new ValidationError(`Statement reference not found: ${statementId.getValue()}`),
          );
        }
      }
    }

    // Convert atomic arguments from DTOs
    const atomicArguments = new Map();
    for (const [id, argumentDTO] of Object.entries(dto.atomicArguments)) {
      const argumentDataResult = atomicArgumentFromDTO(argumentDTO);
      if (argumentDataResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to convert atomic argument ${id}: ${argumentDataResult.error.message}`,
          ),
        );
      }

      const argumentData = argumentDataResult.value;

      // Validate that referenced ordered sets exist and resolve them
      let premiseSet: OrderedSet | null = null;
      let conclusionSet: OrderedSet | null = null;

      if (argumentData.premiseSetId) {
        // Find the OrderedSetId in the Map that matches this string value
        for (const [osId, orderedSetEntity] of orderedSets) {
          if (osId.getValue() === argumentData.premiseSetId.getValue()) {
            premiseSet = orderedSetEntity;
            break;
          }
        }
        if (!premiseSet) {
          return err(
            new ValidationError(
              `OrderedSet reference not found: ${argumentData.premiseSetId.getValue()}`,
            ),
          );
        }
      }

      if (argumentData.conclusionSetId) {
        // Find the OrderedSetId in the Map that matches this string value
        for (const [osId, orderedSetEntity] of orderedSets) {
          if (osId.getValue() === argumentData.conclusionSetId.getValue()) {
            conclusionSet = orderedSetEntity;
            break;
          }
        }
        if (!conclusionSet) {
          return err(
            new ValidationError(
              `OrderedSet reference not found: ${argumentData.conclusionSetId.getValue()}`,
            ),
          );
        }
      }

      // Create the actual AtomicArgument with resolved OrderedSet IDs
      const now = Date.now();
      const argumentResult = AtomicArgument.reconstruct(
        argumentData.id,
        premiseSet?.getId() || null,
        conclusionSet?.getId() || null,
        now,
        now,
        argumentData.sideLabels,
      );

      if (argumentResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to reconstruct atomic argument ${id}: ${argumentResult.error.message}`,
          ),
        );
      }

      atomicArguments.set(argumentData.id, argumentResult.value);
    }

    // Reconstruct the ProofAggregate
    const aggregateResult = ProofAggregate.reconstruct(
      docIdResult.value,
      statements,
      atomicArguments,
      orderedSets,
      dto.version,
    );

    if (aggregateResult.isErr()) {
      return err(
        new ValidationError(
          `Failed to reconstruct proof aggregate: ${aggregateResult.error.message}`,
        ),
      );
    }

    // For now, trees are not reconstructed from DTOs since we don't have a treeFromDTO function
    // In a complete implementation, we would need to implement tree reconstruction
    const trees: Tree[] = [];

    return ok({
      aggregate: aggregateResult.value,
      trees,
    });
  } catch (error) {
    return err(
      new ValidationError(
        `Unexpected error during DTO conversion: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

/**
 * Creates document statistics
 */
function createDocumentStats(aggregate: ProofAggregate, trees: Tree[]): DocumentStatsDTO {
  // Find unused statements
  const unusedStatements: string[] = [];
  for (const [id, statement] of aggregate.getStatements()) {
    if (statement.getUsageCount() === 0) {
      unusedStatements.push(id.getValue());
    }
  }

  // Find unconnected arguments (not part of any tree)
  const unconnectedArguments: string[] = [];
  const argumentsInTrees = new Set<string>();

  // For now, we'll consider all arguments as potentially unconnected
  // In a real implementation, we'd check which arguments are referenced by nodes in trees
  for (const [id] of aggregate.getArguments()) {
    if (!argumentsInTrees.has(id.getValue())) {
      unconnectedArguments.push(id.getValue());
    }
  }

  return {
    statementCount: aggregate.getStatements().size,
    argumentCount: aggregate.getArguments().size,
    treeCount: trees.length,
    connectionCount: aggregate.getOrderedSets().size, // Approximate - shared OrderedSets represent connections
    unusedStatements,
    unconnectedArguments,
    cyclesDetected: [], // Would need cycle detection service
    validationStatus: {
      isValid: true, // Would need validation service
      errors: [],
    },
  };
}
