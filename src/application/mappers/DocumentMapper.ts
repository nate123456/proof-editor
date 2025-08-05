import { err, ok, type Result } from 'neverthrow';
import { ProofAggregate } from '../../domain/aggregates/ProofAggregate.js';
import { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import type { Statement } from '../../domain/entities/Statement.js';
import type { Tree } from '../../domain/entities/Tree.js';
import { ValidationError } from '../../domain/shared/result.js';
import { ProofId } from '../../domain/shared/value-objects/index.js';
import type { DocumentDTO, DocumentStatsDTO } from '../queries/document-queries.js';
import { atomicArgumentFromDTO, atomicArgumentToDTO } from './AtomicArgumentMapper.js';
import { statementToDomain, statementToDTO } from './StatementMapper.js';
import { treeToDomain, treeToDTO } from './TreeMapper.js';

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
  // Create query service from the aggregate
  const queryService = aggregate.createQueryService();

  // Convert statements to DTOs
  const statementDTOs: Record<string, ReturnType<typeof statementToDTO>> = {};
  for (const [id, statement] of queryService.getStatements()) {
    statementDTOs[id.getValue()] = statementToDTO(statement);
  }

  // Convert atomic arguments to DTOs
  const atomicArgumentDTOs: Record<string, ReturnType<typeof atomicArgumentToDTO>> = {};
  for (const [id, argument] of queryService.getArguments()) {
    atomicArgumentDTOs[id.getValue()] = atomicArgumentToDTO(argument);
  }

  // Convert trees to DTOs
  const treeDTOs: Record<string, ReturnType<typeof treeToDTO>> = {};
  for (const tree of trees) {
    treeDTOs[tree.getId().getValue()] = treeToDTO(tree);
  }

  const dto: DocumentDTO = {
    id: queryService.getId().getValue(),
    version: queryService.getVersion(),
    createdAt: new Date().toISOString(), // ProofAggregate doesn't track timestamps currently
    modifiedAt: new Date().toISOString(), // ProofAggregate doesn't track timestamps currently
    statements: statementDTOs,
    orderedSets: {}, // TODO: Implement OrderedSet mapping when domain model supports it
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

      // Resolve statement references to actual Statement objects
      const premises: Statement[] = [];
      const conclusions: Statement[] = [];

      // Convert premise IDs to Statement objects
      for (const premiseId of argumentData.premiseIds || []) {
        let found = false;
        for (const [stmtId, stmt] of statements) {
          if (stmtId.getValue() === premiseId.getValue()) {
            premises.push(stmt);
            found = true;
            break;
          }
        }
        if (!found) {
          return err(new ValidationError(`Premise statement not found: ${premiseId.getValue()}`));
        }
      }

      // Convert conclusion IDs to Statement objects
      for (const conclusionId of argumentData.conclusionIds || []) {
        let found = false;
        for (const [stmtId, stmt] of statements) {
          if (stmtId.getValue() === conclusionId.getValue()) {
            conclusions.push(stmt);
            found = true;
            break;
          }
        }
        if (!found) {
          return err(
            new ValidationError(`Conclusion statement not found: ${conclusionId.getValue()}`),
          );
        }
      }

      // Create the actual AtomicArgument with Statement arrays
      const now = Date.now();
      const argumentResult = AtomicArgument.reconstruct(
        argumentData.id,
        premises,
        conclusions,
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
      dto.version,
    );

    if (aggregateResult.isErr()) {
      return err(
        new ValidationError(
          `Failed to reconstruct proof aggregate: ${aggregateResult.error.message}`,
        ),
      );
    }

    // Reconstruct trees from DTOs
    const trees: Tree[] = [];
    for (const [_id, treeDTO] of Object.entries(dto.trees)) {
      const treeResult = treeToDomain(treeDTO, dto.id);
      if (treeResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to reconstruct tree ${treeDTO.id}: ${treeResult.error.message}`,
          ),
        );
      }
      trees.push(treeResult.value);
    }

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
  // Create query service from the aggregate
  const queryService = aggregate.createQueryService();

  // Find unused statements
  const unusedStatements: string[] = [];
  for (const [id, statement] of queryService.getStatements()) {
    if (statement.getUsageCount() === 0) {
      unusedStatements.push(id.getValue());
    }
  }

  // Find unconnected arguments (not part of any tree)
  const unconnectedArguments: string[] = [];
  const argumentsInTrees = new Set<string>();

  // For now, we'll consider all arguments as potentially unconnected
  // In a real implementation, we'd check which arguments are referenced by nodes in trees
  for (const [id] of queryService.getArguments()) {
    if (!argumentsInTrees.has(id.getValue())) {
      unconnectedArguments.push(id.getValue());
    }
  }

  // Count connections by finding arguments that share statements
  let connectionCount = 0;
  const argumentList = Array.from(queryService.getArguments().values());
  for (let i = 0; i < argumentList.length; i++) {
    for (let j = i + 1; j < argumentList.length; j++) {
      const arg1 = argumentList[i];
      const arg2 = argumentList[j];
      if (!arg1 || !arg2) continue;

      // Check if arg1's conclusions appear in arg2's premises
      const arg1Conclusions = arg1.getConclusions();
      const arg2Premises = arg2.getPremises();

      for (const conclusion of arg1Conclusions) {
        for (const premise of arg2Premises) {
          if (conclusion.getId().equals(premise.getId())) {
            connectionCount++;
          }
        }
      }
    }
  }

  return {
    statementCount: queryService.getStatements().size,
    argumentCount: queryService.getArguments().size,
    treeCount: trees.length,
    connectionCount,
    unusedStatements,
    unconnectedArguments,
    cyclesDetected: [], // Would need cycle detection service
    validationStatus: {
      isValid: true, // Would need validation service
      errors: [],
    },
  };
}
