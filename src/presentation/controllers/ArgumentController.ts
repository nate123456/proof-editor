import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import type {
  CreateAtomicArgumentCommand,
  DeleteAtomicArgumentCommand,
  UpdateArgumentSideLabelsCommand,
  UpdateAtomicArgumentCommand,
} from '../../application/commands/argument-commands.js';
import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { AtomicArgumentDTO } from '../../application/queries/shared-types.js';
import type { CrossContextOrchestrationService } from '../../application/services/CrossContextOrchestrationService.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { IController, ViewResponse } from './IController.js';

// View-specific DTOs (simplified for presentation layer)
export interface ArgumentViewDTO {
  id: string;
  premiseStatements: string[];
  conclusionStatements: string[];
  sideLabels?: {
    left?: string;
    right?: string;
  };
  isComplete: boolean;
  connectionCount: number;
  lastModified: string;
}

export interface ArgumentListViewDTO {
  arguments: ArgumentViewDTO[];
  totalCount: number;
  incompleteCount: number;
  unconnectedCount: number;
}

export interface ArgumentValidationViewDTO {
  argumentId: string;
  isValid: boolean;
  validationErrors: Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  premiseValidation: {
    isEmpty: boolean;
    hasInvalidStatements: boolean;
    duplicateStatements: string[];
  };
  conclusionValidation: {
    isEmpty: boolean;
    hasInvalidStatements: boolean;
    duplicateStatements: string[];
  };
}

export interface ArgumentConnectionViewDTO {
  argumentId: string;
  incomingConnections: Array<{
    sourceArgumentId: string;
    connectionType: 'premise' | 'conclusion';
    sharedStatements: string[];
  }>;
  outgoingConnections: Array<{
    targetArgumentId: string;
    connectionType: 'premise' | 'conclusion';
    sharedStatements: string[];
  }>;
  isConnected: boolean;
  connectionStrength: number;
}

@injectable()
export class ArgumentController implements IController {
  constructor(
    @inject(TOKENS.CrossContextOrchestrationService)
    private readonly orchestrationService: CrossContextOrchestrationService,
    @inject(TOKENS.IPlatformPort)
    private readonly platform: IPlatformPort,
    @inject(TOKENS.IUIPort)
    private readonly ui: IUIPort,
  ) {}

  async initialize(): Promise<Result<void, ValidationApplicationError>> {
    // Setup platform-specific argument handling
    return ok(undefined);
  }

  async dispose(): Promise<Result<void, ValidationApplicationError>> {
    // Cleanup resources
    return ok(undefined);
  }

  // =============================
  // ARGUMENT COMMANDS
  // =============================

  async createAtomicArgument(
    documentId: string,
    premiseStatementIds: string[],
    conclusionStatementIds: string[],
    sideLabels?: { left?: string; right?: string },
  ): Promise<Result<ViewResponse<ArgumentViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!Array.isArray(premiseStatementIds)) {
        return err(new ValidationApplicationError('Premise statement IDs must be an array'));
      }

      if (!Array.isArray(conclusionStatementIds)) {
        return err(new ValidationApplicationError('Conclusion statement IDs must be an array'));
      }

      // Validate statement IDs
      const invalidPremiseIds = premiseStatementIds.filter((id) => !id || id.trim().length === 0);
      if (invalidPremiseIds.length > 0) {
        return err(new ValidationApplicationError('All premise statement IDs must be non-empty'));
      }

      const invalidConclusionIds = conclusionStatementIds.filter(
        (id) => !id || id.trim().length === 0,
      );
      if (invalidConclusionIds.length > 0) {
        return err(
          new ValidationApplicationError('All conclusion statement IDs must be non-empty'),
        );
      }

      const command: CreateAtomicArgumentCommand = {
        documentId: documentId.trim(),
        premiseStatementIds: premiseStatementIds.map((id) => id.trim()),
        conclusionStatementIds: conclusionStatementIds.map((id) => id.trim()),
      };

      if (sideLabels) {
        command.sideLabel = sideLabels;
      }

      // Mock implementation - would normally delegate to orchestration service
      const argumentViewDTO: ArgumentViewDTO = {
        id: `arg-${Date.now()}`,
        premiseStatements: command.premiseStatementIds,
        conclusionStatements: command.conclusionStatementIds,
        isComplete:
          command.premiseStatementIds.length > 0 && command.conclusionStatementIds.length > 0,
        connectionCount: 0,
        lastModified: new Date().toISOString(),
        ...(command.sideLabel && { sideLabels: command.sideLabel }),
      };

      return ok({
        data: argumentViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'create-atomic-argument',
          source: 'user',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to create atomic argument: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async updateAtomicArgument(
    documentId: string,
    argumentId: string,
    premiseSetId?: string | null,
    conclusionSetId?: string | null,
  ): Promise<Result<ViewResponse<ArgumentViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!argumentId || argumentId.trim().length === 0) {
        return err(new ValidationApplicationError('Argument ID cannot be empty'));
      }

      if (!premiseSetId && !conclusionSetId) {
        return err(
          new ValidationApplicationError(
            'At least one of premise set ID or conclusion set ID must be provided',
          ),
        );
      }

      const _command: UpdateAtomicArgumentCommand = {
        documentId: documentId.trim(),
        argumentId: argumentId.trim(),
        premiseSetId: premiseSetId?.trim() || null,
        conclusionSetId: conclusionSetId?.trim() || null,
      };

      // Mock implementation
      const argumentViewDTO: ArgumentViewDTO = {
        id: argumentId.trim(),
        premiseStatements: premiseSetId ? ['stmt-1', 'stmt-2'] : [],
        conclusionStatements: conclusionSetId ? ['stmt-3'] : [],
        isComplete: !!premiseSetId && !!conclusionSetId,
        connectionCount: 1,
        lastModified: new Date().toISOString(),
      };

      return ok({
        data: argumentViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'update-atomic-argument',
          source: 'user',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to update atomic argument: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async updateArgumentSideLabels(
    documentId: string,
    argumentId: string,
    sideLabels: { left?: string; right?: string },
  ): Promise<Result<ViewResponse<ArgumentViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!argumentId || argumentId.trim().length === 0) {
        return err(new ValidationApplicationError('Argument ID cannot be empty'));
      }

      if (!sideLabels || typeof sideLabels !== 'object') {
        return err(new ValidationApplicationError('Side labels must be provided as an object'));
      }

      const command: UpdateArgumentSideLabelsCommand = {
        documentId: documentId.trim(),
        argumentId: argumentId.trim(),
        sideLabels: {
          ...(sideLabels.left && { left: sideLabels.left.trim() }),
          ...(sideLabels.right && { right: sideLabels.right.trim() }),
        },
      };

      // Mock implementation
      const argumentViewDTO: ArgumentViewDTO = {
        id: argumentId.trim(),
        premiseStatements: ['stmt-1'],
        conclusionStatements: ['stmt-2'],
        sideLabels: command.sideLabels,
        isComplete: true,
        connectionCount: 2,
        lastModified: new Date().toISOString(),
      };

      return ok({
        data: argumentViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'update-argument-side-labels',
          source: 'user',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to update argument side labels: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async deleteAtomicArgument(
    documentId: string,
    argumentId: string,
  ): Promise<Result<ViewResponse<void>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!argumentId || argumentId.trim().length === 0) {
        return err(new ValidationApplicationError('Argument ID cannot be empty'));
      }

      const _command: DeleteAtomicArgumentCommand = {
        documentId: documentId.trim(),
        argumentId: argumentId.trim(),
      };

      // Mock implementation - check if argument is connected
      const mockConnectionCount = 0; // Would come from application layer

      if (mockConnectionCount > 0) {
        return err(
          new ValidationApplicationError(
            `Cannot delete argument: currently connected to ${mockConnectionCount} other argument(s)`,
          ),
        );
      }

      return ok({
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'delete-atomic-argument',
          source: 'user',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to delete atomic argument: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  // =============================
  // ARGUMENT QUERIES
  // =============================

  async getArgument(
    documentId: string,
    argumentId: string,
  ): Promise<Result<ViewResponse<ArgumentViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!argumentId || argumentId.trim().length === 0) {
        return err(new ValidationApplicationError('Argument ID cannot be empty'));
      }

      // Mock implementation
      const mockAtomicArgumentDTO: AtomicArgumentDTO = {
        id: argumentId.trim(),
        premiseSetId: 'set-1',
        conclusionSetId: 'set-2',
        sideLabels: {
          left: 'Modus Ponens',
          right: 'Classical Logic',
        },
      };

      const argumentViewDTO = this.mapAtomicArgumentToViewDTO(mockAtomicArgumentDTO);

      return ok({
        data: argumentViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'get-argument',
          source: 'query',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to get argument: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async listArguments(
    documentId: string,
    options?: {
      incomplete?: boolean;
      unconnected?: boolean;
    },
  ): Promise<Result<ViewResponse<ArgumentListViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      // Mock implementation
      const mockArguments: AtomicArgumentDTO[] = [
        {
          id: 'arg-1',
          premiseSetId: 'set-1',
          conclusionSetId: 'set-2',
          sideLabels: { left: 'Modus Ponens' },
        },
        {
          id: 'arg-2',
          premiseSetId: 'set-3',
          conclusionSetId: null, // Incomplete
        },
        {
          id: 'arg-3',
          premiseSetId: null,
          conclusionSetId: 'set-4',
        },
      ];

      // Apply filters
      let filteredArguments = mockArguments;
      if (options?.incomplete) {
        filteredArguments = mockArguments.filter((a) => !a.premiseSetId || !a.conclusionSetId);
      }
      if (options?.unconnected) {
        // Mock: consider args without connections as unconnected
        filteredArguments = filteredArguments.filter((a) => a.id === 'arg-3'); // Mock filter
      }

      const viewArguments = filteredArguments.map((a) => this.mapAtomicArgumentToViewDTO(a));
      const incompleteCount = mockArguments.filter(
        (a) => !a.premiseSetId || !a.conclusionSetId,
      ).length;
      const unconnectedCount = 1; // Mock count

      const listViewDTO: ArgumentListViewDTO = {
        arguments: viewArguments,
        totalCount: mockArguments.length,
        incompleteCount,
        unconnectedCount,
      };

      return ok({
        data: listViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'list-arguments',
          source: 'query',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to list arguments: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async validateArgument(
    documentId: string,
    argumentId: string,
  ): Promise<Result<ViewResponse<ArgumentValidationViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!argumentId || argumentId.trim().length === 0) {
        return err(new ValidationApplicationError('Argument ID cannot be empty'));
      }

      // Mock implementation
      const validationViewDTO: ArgumentValidationViewDTO = {
        argumentId: argumentId.trim(),
        isValid: true,
        validationErrors: [],
        premiseValidation: {
          isEmpty: false,
          hasInvalidStatements: false,
          duplicateStatements: [],
        },
        conclusionValidation: {
          isEmpty: false,
          hasInvalidStatements: false,
          duplicateStatements: [],
        },
      };

      return ok({
        data: validationViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'validate-argument',
          source: 'validation',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to validate argument: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getArgumentConnections(
    documentId: string,
    argumentId: string,
  ): Promise<Result<ViewResponse<ArgumentConnectionViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!argumentId || argumentId.trim().length === 0) {
        return err(new ValidationApplicationError('Argument ID cannot be empty'));
      }

      // Mock implementation
      const connectionViewDTO: ArgumentConnectionViewDTO = {
        argumentId: argumentId.trim(),
        incomingConnections: [
          {
            sourceArgumentId: 'arg-prev',
            connectionType: 'conclusion',
            sharedStatements: ['stmt-1'],
          },
        ],
        outgoingConnections: [
          {
            targetArgumentId: 'arg-next',
            connectionType: 'premise',
            sharedStatements: ['stmt-2'],
          },
        ],
        isConnected: true,
        connectionStrength: 0.8,
      };

      return ok({
        data: connectionViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'get-argument-connections',
          source: 'analysis',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to get argument connections: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  // =============================
  // PRIVATE MAPPING HELPERS
  // =============================

  private mapAtomicArgumentToViewDTO(atomicArgumentDto: AtomicArgumentDTO): ArgumentViewDTO {
    return {
      id: atomicArgumentDto.id,
      premiseStatements: atomicArgumentDto.premiseSetId ? ['stmt-1', 'stmt-2'] : [], // Mock data
      conclusionStatements: atomicArgumentDto.conclusionSetId ? ['stmt-3'] : [], // Mock data
      isComplete: !!atomicArgumentDto.premiseSetId && !!atomicArgumentDto.conclusionSetId,
      connectionCount: 1, // Mock count
      lastModified: new Date().toISOString(),
      ...(atomicArgumentDto.sideLabels && { sideLabels: atomicArgumentDto.sideLabels }),
    };
  }
}
