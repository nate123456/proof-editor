import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import type {
  CreateStatementCommand,
  DeleteStatementCommand,
  UpdateStatementCommand,
} from '../../application/commands/statement-commands.js';
import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type {
  GetStatementQuery,
  ListStatementsQuery,
  StatementDTO,
  StatementFlowDTO,
  TraceStatementFlowQuery,
} from '../../application/queries/statement-queries.js';
import type { CrossContextOrchestrationService } from '../../application/services/CrossContextOrchestrationService.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { IController, ViewResponse } from './IController.js';

// View-specific DTOs (simplified for presentation layer)
export interface StatementViewDTO {
  id: string;
  content: string;
  usageCount: number;
  lastModified: string;
  isUsed: boolean;
  preview: string; // Truncated content for display
}

export interface StatementListViewDTO {
  statements: StatementViewDTO[];
  totalCount: number;
  unusedCount: number;
  searchResults?: {
    query: string;
    matchCount: number;
  };
}

export interface StatementFlowViewDTO {
  statementId: string;
  content: string;
  directUsages: Array<{
    argumentId: string;
    role: 'premise' | 'conclusion';
    contextDescription: string;
  }>;
  flowPaths: Array<{
    description: string;
    length: number;
    endpoints: string[];
  }>;
  dependencyCount: number;
  dependentCount: number;
}

export interface StatementSearchViewDTO {
  query: string;
  results: Array<{
    statement: StatementViewDTO;
    matchScore: number;
    matchHighlights: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  }>;
  totalMatches: number;
}

@injectable()
export class StatementController implements IController {
  constructor(
    @inject(TOKENS.CrossContextOrchestrationService)
    private readonly orchestrationService: CrossContextOrchestrationService,
    @inject(TOKENS.ProofApplicationService)
    private readonly proofApplication: ProofApplicationService,
    @inject(TOKENS.DocumentQueryService) private readonly documentQuery: DocumentQueryService,
    @inject(TOKENS.IPlatformPort) private readonly platform: IPlatformPort,
    @inject(TOKENS.IUIPort) private readonly ui: IUIPort,
  ) {}

  async initialize(): Promise<Result<void, ValidationApplicationError>> {
    // Setup platform-specific statement handling
    return ok(undefined);
  }

  async dispose(): Promise<Result<void, ValidationApplicationError>> {
    // Cleanup resources
    return ok(undefined);
  }

  // =============================
  // STATEMENT COMMANDS
  // =============================

  async createStatement(
    documentId: string,
    content: string,
  ): Promise<Result<ViewResponse<StatementViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!content || content.trim().length === 0) {
        return err(new ValidationApplicationError('Statement content cannot be empty'));
      }

      const command: CreateStatementCommand = {
        documentId: documentId.trim(),
        content: content.trim(),
      };

      // Use ProofApplicationService to create the statement
      const createResult = await this.proofApplication.createStatement(command);
      if (createResult.isErr()) {
        return err(new ValidationApplicationError(createResult.error.message));
      }

      const statementDto = createResult.value;
      const viewDto = this.mapStatementToViewDTO(statementDto);

      return ok({
        data: viewDto,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'create-statement',
          source: 'user',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to create statement: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async updateStatement(
    documentId: string,
    statementId: string,
    content: string,
  ): Promise<Result<ViewResponse<StatementViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!statementId || statementId.trim().length === 0) {
        return err(new ValidationApplicationError('Statement ID cannot be empty'));
      }

      if (!content || content.trim().length === 0) {
        return err(new ValidationApplicationError('Statement content cannot be empty'));
      }

      const command: UpdateStatementCommand = {
        documentId: documentId.trim(),
        statementId: statementId.trim(),
        content: content.trim(),
      };

      // Use ProofApplicationService to update the statement
      const updateResult = await this.proofApplication.updateStatement(command);
      if (updateResult.isErr()) {
        return err(new ValidationApplicationError(updateResult.error.message));
      }

      const statementDto = updateResult.value;
      const viewDto = this.mapStatementToViewDTO(statementDto);

      return ok({
        data: viewDto,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'update-statement',
          source: 'user',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to update statement: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async deleteStatement(
    documentId: string,
    statementId: string,
  ): Promise<Result<ViewResponse<void>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!statementId || statementId.trim().length === 0) {
        return err(new ValidationApplicationError('Statement ID cannot be empty'));
      }

      const command: DeleteStatementCommand = {
        documentId: documentId.trim(),
        statementId: statementId.trim(),
      };

      // Use ProofApplicationService to delete the statement
      const deleteResult = await this.proofApplication.deleteStatement(command);
      if (deleteResult.isErr()) {
        return err(new ValidationApplicationError(deleteResult.error.message));
      }

      return ok({
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'delete-statement',
          source: 'user',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to delete statement: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  // =============================
  // STATEMENT QUERIES
  // =============================

  async getStatement(
    documentId: string,
    statementId: string,
  ): Promise<Result<ViewResponse<StatementViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!statementId || statementId.trim().length === 0) {
        return err(new ValidationApplicationError('Statement ID cannot be empty'));
      }

      const _query: GetStatementQuery = {
        documentId: documentId.trim(),
        statementId: statementId.trim(),
      };

      // Get the document from DocumentQueryService
      const documentResult = await this.documentQuery.getDocumentById(documentId.trim());
      if (documentResult.isErr()) {
        return err(documentResult.error);
      }

      const document = documentResult.value;

      // Find the statement in the document
      const statementDto = document.statements?.[statementId.trim()];
      if (!statementDto) {
        return err(new ValidationApplicationError(`Statement not found: ${statementId}`));
      }

      const viewDto = this.mapStatementToViewDTO(statementDto);

      return ok({
        data: viewDto,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'get-statement',
          source: 'query',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to get statement: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async listStatements(
    documentId: string,
    options?: {
      unused?: boolean;
      searchText?: string;
    },
  ): Promise<Result<ViewResponse<StatementListViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      const _query: ListStatementsQuery = {
        documentId: documentId.trim(),
        ...(options && { filter: options }),
      };

      // Get the document from DocumentQueryService
      const documentResult = await this.documentQuery.getDocumentById(documentId.trim());
      if (documentResult.isErr()) {
        return err(documentResult.error);
      }

      const document = documentResult.value;

      // Convert statements from document to array
      const statements = Object.values(document.statements || {});

      // Apply filters
      let filteredStatements = statements;
      if (options?.unused) {
        filteredStatements = statements.filter((s) => s.usageCount === 0);
      }
      if (options?.searchText) {
        const searchLower = options.searchText.toLowerCase();
        filteredStatements = filteredStatements.filter((s) =>
          s.content.toLowerCase().includes(searchLower),
        );
      }

      const viewStatements = filteredStatements.map((s) => this.mapStatementToViewDTO(s));
      const unusedCount = statements.filter((s) => s.usageCount === 0).length;

      const listViewDTO: StatementListViewDTO = {
        statements: viewStatements,
        totalCount: statements.length,
        unusedCount,
        ...(options?.searchText && {
          searchResults: {
            query: options.searchText,
            matchCount: filteredStatements.length,
          },
        }),
      };

      return ok({
        data: listViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'list-statements',
          source: 'query',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to list statements: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async traceStatementFlow(
    documentId: string,
    statementId: string,
    maxDepth?: number,
  ): Promise<Result<ViewResponse<StatementFlowViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!statementId || statementId.trim().length === 0) {
        return err(new ValidationApplicationError('Statement ID cannot be empty'));
      }

      if (maxDepth !== undefined && (maxDepth < 1 || maxDepth > 10)) {
        return err(new ValidationApplicationError('Max depth must be between 1 and 10'));
      }

      const _query: TraceStatementFlowQuery = {
        documentId: documentId.trim(),
        statementId: statementId.trim(),
        ...(maxDepth !== undefined && { maxDepth }),
      };

      // Mock implementation
      const mockFlowDTO: StatementFlowDTO = {
        statementId: statementId.trim(),
        usedIn: [
          {
            orderedSetId: 'set-1',
            argumentId: 'arg-1',
            role: 'premise',
          },
        ],
        flowPaths: [
          {
            path: ['stmt-1', 'arg-1', 'stmt-2'],
            distance: 2,
          },
        ],
      };

      const flowViewDTO: StatementFlowViewDTO = {
        statementId: statementId.trim(),
        content: `Mock statement content for ${statementId}`,
        directUsages: mockFlowDTO.usedIn.map((usage) => ({
          argumentId: usage.argumentId,
          role: usage.role,
          contextDescription: `Used as ${usage.role} in argument ${usage.argumentId}`,
        })),
        flowPaths: mockFlowDTO.flowPaths.map((path) => ({
          description: `Flow path through ${path.path.length} steps`,
          length: path.distance,
          endpoints: [path.path[0] || '', path.path[path.path.length - 1] || ''],
        })),
        dependencyCount: 1,
        dependentCount: 1,
      };

      return ok({
        data: flowViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'trace-statement-flow',
          source: 'analysis',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to trace statement flow: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async searchStatements(
    documentId: string,
    searchQuery: string,
  ): Promise<Result<ViewResponse<StatementSearchViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!searchQuery || searchQuery.trim().length === 0) {
        return err(new ValidationApplicationError('Search query cannot be empty'));
      }

      if (searchQuery.trim().length < 2) {
        return err(new ValidationApplicationError('Search query must be at least 2 characters'));
      }

      // Mock implementation
      const mockStatements: StatementDTO[] = [
        {
          id: 'stmt-1',
          content: 'All humans are mortal beings',
          usageCount: 3,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      ];

      const searchResults = mockStatements
        .filter((s) => s.content.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((s) => {
          const content = s.content.toLowerCase();
          const query = searchQuery.toLowerCase();
          const startIndex = content.indexOf(query);

          return {
            statement: this.mapStatementToViewDTO(s),
            matchScore: 0.8,
            matchHighlights:
              startIndex >= 0
                ? [
                    {
                      start: startIndex,
                      end: startIndex + query.length,
                      text: s.content.substring(startIndex, startIndex + query.length),
                    },
                  ]
                : [],
          };
        });

      const searchViewDTO: StatementSearchViewDTO = {
        query: searchQuery.trim(),
        results: searchResults,
        totalMatches: searchResults.length,
      };

      return ok({
        data: searchViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'search-statements',
          source: 'search',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to search statements: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  // =============================
  // PRIVATE MAPPING HELPERS
  // =============================

  private mapStatementToViewDTO(statementDto: StatementDTO): StatementViewDTO {
    const maxPreviewLength = 100;
    const preview =
      statementDto.content.length > maxPreviewLength
        ? `${statementDto.content.substring(0, maxPreviewLength)}...`
        : statementDto.content;

    return {
      id: statementDto.id,
      content: statementDto.content,
      usageCount: statementDto.usageCount,
      lastModified: statementDto.modifiedAt,
      isUsed: statementDto.usageCount > 0,
      preview,
    };
  }
}
