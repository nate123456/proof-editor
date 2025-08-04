import { err, ok, type Result } from 'neverthrow';
import { ProofAggregate } from '../../domain/aggregates/ProofAggregate.js';
import type { ProofDocument } from '../../domain/aggregates/ProofDocument.js';
import type { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import {
  AtomicArgumentId,
  Dimensions,
  NodeCount,
  Position2D,
  ProofDocumentId,
  ProofId,
  SideLabel,
  TreeId,
} from '../../domain/shared/value-objects/index.js';
import type { ProofFileParser } from '../../parser/ProofFileParser.js';
import { ValidationApplicationError } from '../dtos/operation-results.js';
import { documentToDTO } from '../mappers/DocumentMapper.js';
import type { DocumentDTO } from '../queries/document-queries.js';

/**
 * Service for querying document data and converting to DTOs
 * Provides abstraction layer between views and domain repositories
 */
export class DocumentQueryService {
  constructor(
    private readonly documentRepository: IProofDocumentRepository,
    private readonly parser: ProofFileParser,
  ) {}

  /**
   * Get document by ID as DTO
   */
  async getDocumentById(
    documentId: string,
  ): Promise<Result<DocumentDTO, ValidationApplicationError>> {
    try {
      const docIdResult = ProofDocumentId.create(documentId);
      if (docIdResult.isErr()) {
        return err(new ValidationApplicationError(docIdResult.error.message));
      }

      const documentResult = await this.documentRepository.findById(docIdResult.value);
      if (documentResult.isErr()) {
        return err(new ValidationApplicationError(`Document not found: ${documentId}`));
      }
      const document = documentResult.value;

      // Convert ProofDocument to ProofAggregate
      const aggregateResult = this.convertProofDocumentToAggregate(document);
      if (aggregateResult.isErr()) {
        return err(aggregateResult.error);
      }

      // Convert to DTO (trees would be retrieved from tree repository)
      // For now, we pass an empty array for trees since we don't have tree repository integration
      const dto = documentToDTO(aggregateResult.value, [], false);
      return ok(dto);
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to retrieve document: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Get document with detailed statistics
   */
  async getDocumentWithStats(
    documentId: string,
  ): Promise<Result<DocumentDTO, ValidationApplicationError>> {
    try {
      const docIdResult = ProofDocumentId.create(documentId);
      if (docIdResult.isErr()) {
        return err(new ValidationApplicationError(docIdResult.error.message));
      }

      const documentResult = await this.documentRepository.findById(docIdResult.value);
      if (documentResult.isErr()) {
        return err(new ValidationApplicationError(`Document not found: ${documentId}`));
      }
      const document = documentResult.value;

      // Convert ProofDocument to ProofAggregate
      const aggregateResult = this.convertProofDocumentToAggregate(document);
      if (aggregateResult.isErr()) {
        return err(aggregateResult.error);
      }

      // Convert to DTO with statistics included
      const dto = documentToDTO(aggregateResult.value, [], true);
      return ok(dto);
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to retrieve document with stats: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Parse document content and return as DTO
   */
  async parseDocumentContent(
    content: string,
  ): Promise<Result<DocumentDTO, ValidationApplicationError>> {
    try {
      // Parse the content using the ProofFileParser
      const parseResult = this.parser.parseProofFile(content);
      if (parseResult.isErr()) {
        return err(new ValidationApplicationError(`Parse error: ${parseResult.error.message}`));
      }

      const proofDocument = parseResult.value;

      // Convert the parsed ProofDocument to DocumentDTO
      // We need to extract the aggregate and trees from the ProofDocument
      const dto = this.convertProofDocumentToDTO(proofDocument);
      return ok(dto);
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to parse document content: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Validate document content without full parsing
   */
  async validateDocumentContent(content: string): Promise<
    Result<
      {
        isValid: boolean;
        errors: Array<{ message: string; line?: number; section?: string }>;
      },
      ValidationApplicationError
    >
  > {
    try {
      // Use the parser's validation functionality
      const parseResult = this.parser.parseProofFile(content);

      if (parseResult.isOk()) {
        return ok({
          isValid: true,
          errors: [],
        });
      }

      // Extract validation errors from parse failure
      const error = parseResult.error;
      return ok({
        isValid: false,
        errors: error.errors.map((err) => ({
          message: err.message,
          ...(err.line !== undefined && { line: err.line }),
          ...(err.section !== undefined && { section: err.section }),
        })),
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to validate document content: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Get document metadata without full content
   */
  async getDocumentMetadata(documentId: string): Promise<
    Result<
      {
        id: string;
        version: number;
        createdAt: string;
        modifiedAt: string;
        statementCount: number;
        argumentCount: number;
        treeCount: number;
      },
      ValidationApplicationError
    >
  > {
    try {
      const docIdResult = ProofDocumentId.create(documentId);
      if (docIdResult.isErr()) {
        return err(new ValidationApplicationError(docIdResult.error.message));
      }

      const documentResult = await this.documentRepository.findById(docIdResult.value);
      if (documentResult.isErr()) {
        return err(new ValidationApplicationError(`Document not found: ${documentId}`));
      }
      const document = documentResult.value;

      const queryService = document.createQueryService();
      return ok({
        id: queryService.getId().getValue(),
        version: queryService.getVersion(),
        createdAt: new Date().toISOString(), // ProofAggregate doesn't track timestamps currently
        modifiedAt: new Date().toISOString(), // ProofAggregate doesn't track timestamps currently
        statementCount: queryService.getAllStatements().length,
        argumentCount: queryService.getAllAtomicArguments().length,
        treeCount: 0, // Would need tree repository integration
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to retrieve document metadata: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Check if document exists
   */
  async documentExists(documentId: string): Promise<Result<boolean, ValidationApplicationError>> {
    try {
      const docIdResult = ProofDocumentId.create(documentId);
      if (docIdResult.isErr()) {
        return err(new ValidationApplicationError(docIdResult.error.message));
      }

      const documentResult = await this.documentRepository.findById(docIdResult.value);
      return ok(documentResult.isOk());
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to check document existence: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Convert ProofDocument to DocumentDTO
   * This is a simplified conversion - in reality, we'd need proper tree extraction
   */
  private convertProofDocumentToDTO(
    proofDocument: import('../../parser/ProofDocument.js').ProofDocument,
  ): DocumentDTO {
    // Convert statements
    const statementDTOs: Record<string, import('../queries/statement-queries.js').StatementDTO> =
      {};
    for (const [id, statement] of proofDocument.statements) {
      statementDTOs[id] = {
        id: id,
        content: statement.getContent(),
        usageCount: statement.getUsageCount(),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
    }

    // OrderedSets are internal to the domain and not exposed in DTOs

    // Convert atomic arguments
    const atomicArgumentDTOs: Record<
      string,
      import('../queries/shared-types.js').AtomicArgumentDTO
    > = {};
    for (const [id, argument] of proofDocument.atomicArguments) {
      // Create AtomicArgumentId value object
      const argumentIdResult = AtomicArgumentId.create(id);
      if (argumentIdResult.isErr()) {
        continue; // Skip invalid IDs
      }

      const dto: import('../queries/shared-types.js').AtomicArgumentDTO = {
        id: argumentIdResult.value,
        premiseIds: argument.getPremises().map((stmt) => stmt.getId()),
        conclusionIds: argument.getConclusions().map((stmt) => stmt.getId()),
      };

      // Convert side labels if present
      const sideLabelsStrings = argument.getSideLabels();
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

      atomicArgumentDTOs[id] = dto;
    }

    // Convert trees
    const treeDTOs: Record<string, import('../queries/shared-types.js').TreeDTO> = {};
    for (const [id, tree] of proofDocument.trees) {
      const position = tree.getPosition();
      const physicalProps = tree.getPhysicalProperties();

      // Create TreeId value object
      const treeIdResult = TreeId.create(id);
      if (treeIdResult.isErr()) {
        continue; // Skip invalid IDs
      }

      // Create Position2D value object
      const position2DResult = Position2D.create(position.getX(), position.getY());
      if (position2DResult.isErr()) {
        continue; // Skip invalid positions
      }

      // Create Dimensions value object
      const dimensionsResult = Dimensions.create(
        physicalProps.getMinWidth(),
        physicalProps.getMinHeight(),
      );
      if (dimensionsResult.isErr()) {
        continue; // Skip invalid dimensions
      }

      // Create NodeCount value object
      const nodeCountResult = NodeCount.create(tree.getNodeCount());
      if (nodeCountResult.isErr()) {
        continue; // Skip invalid node counts
      }

      treeDTOs[id] = {
        id: treeIdResult.value,
        position: position2DResult.value,
        bounds: dimensionsResult.value,
        nodeCount: nodeCountResult.value,
        rootNodeIds: [...tree.getNodeIds()], // Create a mutable copy
      };
    }

    return {
      id: 'parsed-document', // Would need proper ID generation
      version: 1,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      statements: statementDTOs,
      orderedSets: {}, // TODO: Implement OrderedSet parsing when supported
      atomicArguments: atomicArgumentDTOs,
      trees: treeDTOs,
    };
  }

  /**
   * Parse content with detailed error reporting
   */
  async parseWithDetailedErrors(content: string): Promise<
    Result<
      DocumentDTO,
      {
        errors: Array<{
          message: string;
          line?: number;
          column?: number;
          section?: string;
          severity: 'error' | 'warning' | 'info';
        }>;
        partialResult?: Partial<DocumentDTO>;
      }
    >
  > {
    try {
      const parseResult = this.parser.parseProofFile(content);

      if (parseResult.isOk()) {
        const dto = this.convertProofDocumentToDTO(parseResult.value);
        return ok(dto);
      }

      // Convert parse error to detailed error format
      const error = parseResult.error;
      return err({
        errors: error.errors.map((err) => ({
          message: err.message,
          severity: 'error' as const,
          ...(err.line !== undefined && { line: err.line }),
          ...(err.column !== undefined && { column: err.column }),
          ...(err.section !== undefined && { section: err.section }),
        })),
        // Don't set optional properties to undefined - omit them instead
      });
    } catch (error) {
      return err({
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
            severity: 'error' as const,
          },
        ],
      });
    }
  }

  /**
   * Convert ProofDocument to ProofAggregate
   * This is necessary because the repository returns ProofDocument but the mapper expects ProofAggregate
   */
  private convertProofDocumentToAggregate(
    document: ProofDocument,
  ): Result<ProofAggregate, ValidationApplicationError> {
    try {
      // Create a new ProofId from the document ID
      const queryService = document.createQueryService();
      const proofIdResult = ProofId.create(queryService.getId().getValue());
      if (proofIdResult.isErr()) {
        return err(new ValidationApplicationError(proofIdResult.error.message));
      }

      // Convert statements to Map<StatementId, Statement>
      const statements = new Map();
      for (const statement of queryService.getAllStatements()) {
        statements.set(statement.getId(), statement);
      }

      // Convert atomic arguments to Map<AtomicArgumentId, AtomicArgument>
      const atomicArguments = new Map();
      for (const argument of queryService.getAllAtomicArguments()) {
        atomicArguments.set(argument.getId(), argument);
      }

      // OrderedSets are not directly accessible - would need to be extracted from arguments
      const _orderedSets = new Map();

      // Reconstruct the ProofAggregate
      const aggregateResult = ProofAggregate.reconstruct(
        proofIdResult.value,
        statements,
        atomicArguments,
        queryService.getVersion(),
      );

      if (aggregateResult.isErr()) {
        return err(
          new ValidationApplicationError(
            `Failed to convert ProofDocument to ProofAggregate: ${aggregateResult.error.message}`,
          ),
        );
      }

      return ok(aggregateResult.value);
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Error converting ProofDocument to ProofAggregate: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
