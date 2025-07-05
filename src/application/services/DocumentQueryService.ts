import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import { ProofAggregate } from '../../domain/aggregates/ProofAggregate.js';
import type { ProofDocument } from '../../domain/aggregates/ProofDocument.js';
import type { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import { ProofDocumentId, ProofId } from '../../domain/shared/value-objects.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { ProofFileParser } from '../../parser/ProofFileParser.js';
import { ValidationApplicationError } from '../dtos/operation-results.js';
import { documentToDTO } from '../mappers/DocumentMapper.js';
import type { DocumentDTO } from '../queries/document-queries.js';

/**
 * Service for querying document data and converting to DTOs
 * Provides abstraction layer between views and domain repositories
 */
@injectable()
export class DocumentQueryService {
  constructor(
    @inject(TOKENS.IProofDocumentRepository)
    private readonly documentRepository: IProofDocumentRepository,
    @inject(TOKENS.ProofFileParser)
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

      const document = await this.documentRepository.findById(docIdResult.value);
      if (!document) {
        return err(new ValidationApplicationError(`Document not found: ${documentId}`));
      }

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

      const document = await this.documentRepository.findById(docIdResult.value);
      if (!document) {
        return err(new ValidationApplicationError(`Document not found: ${documentId}`));
      }

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
        errors: [
          {
            message: error.message,
            // Don't set optional properties to undefined - omit them instead
          },
        ],
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

      const document = await this.documentRepository.findById(docIdResult.value);
      if (!document) {
        return err(new ValidationApplicationError(`Document not found: ${documentId}`));
      }

      return ok({
        id: document.getId().getValue(),
        version: document.getVersion(),
        createdAt: new Date().toISOString(), // ProofAggregate doesn't track timestamps currently
        modifiedAt: new Date().toISOString(), // ProofAggregate doesn't track timestamps currently
        statementCount: document.getAllStatements().length,
        argumentCount: document.getAllAtomicArguments().length,
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

      const document = await this.documentRepository.findById(docIdResult.value);
      return ok(document !== null);
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

    // Convert ordered sets
    const orderedSetDTOs: Record<string, import('../queries/shared-types.js').OrderedSetDTO> = {};
    for (const [id, orderedSet] of proofDocument.orderedSets) {
      orderedSetDTOs[id] = {
        id: id,
        statementIds: orderedSet.getStatementIds().map((sid) => sid.getValue()),
        usageCount: 0, // Would need to calculate usage
        usedBy: [], // Would need to calculate usage
      };
    }

    // Convert atomic arguments
    const atomicArgumentDTOs: Record<
      string,
      import('../queries/shared-types.js').AtomicArgumentDTO
    > = {};
    for (const [id, argument] of proofDocument.atomicArguments) {
      atomicArgumentDTOs[id] = {
        id: id,
        premiseSetId: argument.getPremiseSet()?.getValue() || null,
        conclusionSetId: argument.getConclusionSet()?.getValue() || null,
        sideLabels: argument.getSideLabels(),
      };
    }

    // Convert trees
    const treeDTOs: Record<string, import('../queries/shared-types.js').TreeDTO> = {};
    for (const [id, tree] of proofDocument.trees) {
      const position = tree.getPosition();
      const physicalProps = tree.getPhysicalProperties();

      treeDTOs[id] = {
        id: id,
        position: {
          x: position.getX(),
          y: position.getY(),
        },
        bounds: {
          width: physicalProps.getMinWidth(),
          height: physicalProps.getMinHeight(),
        },
        nodeCount: tree.getNodeCount(),
        rootNodeIds: tree.getNodeIds().map((nid) => nid.getValue()),
      };
    }

    return {
      id: 'parsed-document', // Would need proper ID generation
      version: 1,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      statements: statementDTOs,
      orderedSets: orderedSetDTOs,
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
        errors: [
          {
            message: error.message,
            severity: 'error' as const,
            // Don't set optional properties to undefined - omit them instead
          },
        ],
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
      const proofIdResult = ProofId.create(document.getId().getValue());
      if (proofIdResult.isErr()) {
        return err(new ValidationApplicationError(proofIdResult.error.message));
      }

      // Convert statements to Map<StatementId, Statement>
      const statements = new Map();
      for (const statement of document.getAllStatements()) {
        statements.set(statement.getId(), statement);
      }

      // Convert atomic arguments to Map<AtomicArgumentId, AtomicArgument>
      const atomicArguments = new Map();
      for (const argument of document.getAllAtomicArguments()) {
        atomicArguments.set(argument.getId(), argument);
      }

      // Convert ordered sets to Map<OrderedSetId, OrderedSet>
      const orderedSets = new Map();
      for (const orderedSet of document.getAllOrderedSets()) {
        orderedSets.set(orderedSet.getId(), orderedSet);
      }

      // Reconstruct the ProofAggregate
      const aggregateResult = ProofAggregate.reconstruct(
        proofIdResult.value,
        statements,
        atomicArguments,
        orderedSets,
        document.getVersion(),
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
