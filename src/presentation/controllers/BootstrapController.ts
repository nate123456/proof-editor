import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import type { CreateAtomicArgumentCommand } from '../../application/commands/argument-commands.js';
import type {
  CreateBootstrapArgumentCommand,
  InitializeEmptyDocumentCommand,
  PopulateEmptyArgumentCommand,
} from '../../application/commands/bootstrap-commands.js';
import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { DocumentOrchestrationService } from '../../application/services/DocumentOrchestrationService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import { ProofDocument } from '../../domain/aggregates/ProofDocument.js';
import type { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import { ProofDocumentId } from '../../domain/shared/value-objects/index.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { IController, ViewResponse } from './IController.js';

// View-specific DTOs (simplified for presentation layer)
export interface BootstrapDocumentViewDTO {
  documentId: string;
  created: boolean;
  hasBootstrapArgument: boolean;
  firstTreeId?: string;
  firstArgumentId?: string;
  nextSteps: Array<{
    step: string;
    description: string;
    action: 'populate' | 'branch' | 'validate';
  }>;
}

export interface BootstrapArgumentViewDTO {
  argumentId: string;
  treeId: string;
  nodeId: string;
  isEmpty: boolean;
  position: { x: number; y: number };
  readyForPopulation: boolean;
  workflow: {
    currentStep: 'created' | 'ready_for_premises' | 'ready_for_conclusions' | 'complete';
    nextAction: string;
    canBranch: boolean;
  };
}

export interface PopulatedArgumentViewDTO {
  argumentId: string;
  premises: string[];
  conclusions: string[];
  sideLabels?: {
    left?: string;
    right?: string;
  };
  isComplete: boolean;
  canCreateConnections: boolean;
  branchingOptions: Array<{
    fromText: string;
    position: 'premise' | 'conclusion';
    suggestedBranches: string[];
  }>;
}

export interface BootstrapWorkflowViewDTO {
  documentId: string;
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    completed: boolean;
    current: boolean;
    actions: Array<{
      type: 'create' | 'populate' | 'branch' | 'connect';
      label: string;
      enabled: boolean;
    }>;
  }>;
  canAdvance: boolean;
  suggestions: string[];
}

export interface EmptyImplicationLineViewDTO {
  argumentId: string;
  displayFormat: {
    premiseLines: string[];
    horizontalLine: string;
    conclusionLines: string[];
  };
  editableAreas: Array<{
    id: string;
    type: 'premise' | 'conclusion' | 'side_label';
    position: { line: number; char: number };
    placeholder: string;
  }>;
  userInstructions: string;
}

@injectable()
export class BootstrapController implements IController {
  constructor(
    @inject(TOKENS.DocumentOrchestrationService)
    private readonly documentOrchestration: DocumentOrchestrationService,
    @inject(TOKENS.ProofApplicationService)
    private readonly proofApplication: ProofApplicationService,
    @inject(TOKENS.IProofDocumentRepository)
    private readonly repository: IProofDocumentRepository,
    @inject(TOKENS.IPlatformPort)
    private readonly platform: IPlatformPort,
    @inject(TOKENS.IUIPort)
    private readonly ui: IUIPort,
  ) {}

  async initialize(): Promise<Result<void, ValidationApplicationError>> {
    // Setup platform-specific bootstrap handling
    return ok(undefined);
  }

  async dispose(): Promise<Result<void, ValidationApplicationError>> {
    // Cleanup resources
    return ok(undefined);
  }

  // =============================
  // BOOTSTRAP COMMANDS
  // =============================

  async initializeEmptyDocument(
    documentId?: string,
  ): Promise<Result<ViewResponse<BootstrapDocumentViewDTO>, ValidationApplicationError>> {
    try {
      const targetDocumentId = documentId?.trim() || `doc-${Date.now()}`;

      const command: InitializeEmptyDocumentCommand = {
        documentId: targetDocumentId,
      };

      // Create bootstrap document using domain service
      const documentIdResult = ProofDocumentId.create(command.documentId);
      if (documentIdResult.isErr()) {
        return err(
          new ValidationApplicationError(`Invalid document ID: ${documentIdResult.error.message}`),
        );
      }

      const bootstrapDocument = ProofDocument.createBootstrap(documentIdResult.value);
      if (bootstrapDocument.isErr()) {
        return err(
          new ValidationApplicationError(
            `Failed to create bootstrap document: ${bootstrapDocument.error.message}`,
          ),
        );
      }

      // Save the document
      const saveResult = await this.repository.save(bootstrapDocument.value);
      if (saveResult.isErr()) {
        return err(
          new ValidationApplicationError(`Failed to save document: ${saveResult.error.message}`),
        );
      }

      // Check if document has any arguments (should be empty for bootstrap)
      const hasBootstrapArgument = false; // Bootstrap documents start empty

      const bootstrapDocumentViewDTO: BootstrapDocumentViewDTO = {
        documentId: command.documentId,
        created: true,
        hasBootstrapArgument,
        nextSteps: [
          {
            step: 'Create First Argument',
            description: 'Create an empty atomic argument to begin building your proof',
            action: 'populate',
          },
          {
            step: 'Populate Argument',
            description: 'Add premises and conclusions to your first argument',
            action: 'populate',
          },
          {
            step: 'Create Branches',
            description: 'Branch from selected text to build argument trees',
            action: 'branch',
          },
        ],
      };

      return ok({
        data: bootstrapDocumentViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'initialize-empty-document',
          source: 'bootstrap',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to initialize empty document: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async createBootstrapArgument(
    documentId: string,
    position?: { x: number; y: number },
  ): Promise<Result<ViewResponse<BootstrapArgumentViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      const defaultPosition = { x: 200, y: 150 };
      const argumentPosition = position || defaultPosition;

      if (!this.isValidPosition(argumentPosition)) {
        return err(new ValidationApplicationError('Invalid position coordinates'));
      }

      const command: CreateBootstrapArgumentCommand = {
        documentId: documentId.trim(),
        treeId: `bootstrap-tree-${Date.now()}`,
        ...(argumentPosition && { position: argumentPosition }),
      };

      // Load the document
      const documentIdResult = ProofDocumentId.create(command.documentId);
      if (documentIdResult.isErr()) {
        return err(
          new ValidationApplicationError(`Invalid document ID: ${documentIdResult.error.message}`),
        );
      }

      const document = await this.repository.findById(documentIdResult.value);
      if (!document) {
        return err(new ValidationApplicationError('Document not found'));
      }

      // Create bootstrap atomic argument (empty premises and conclusions)
      const addArgumentResult = document.createAtomicArgument(null, null);
      if (addArgumentResult.isErr()) {
        return err(
          new ValidationApplicationError(
            `Failed to add argument to document: ${addArgumentResult.error.message}`,
          ),
        );
      }

      const bootstrapArgument = addArgumentResult.value;

      // Save the updated document
      const saveResult = await this.repository.save(document);
      if (saveResult.isErr()) {
        return err(
          new ValidationApplicationError(`Failed to save document: ${saveResult.error.message}`),
        );
      }

      const bootstrapArgumentViewDTO: BootstrapArgumentViewDTO = {
        argumentId: bootstrapArgument.getId().getValue(),
        treeId: command.treeId,
        nodeId: `node-${bootstrapArgument.getId().getValue()}`,
        isEmpty: true,
        position: argumentPosition,
        readyForPopulation: true,
        workflow: {
          currentStep: 'created',
          nextAction: 'Add premises and conclusions to begin building your argument',
          canBranch: false,
        },
      };

      return ok({
        data: bootstrapArgumentViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'create-bootstrap-argument',
          source: 'bootstrap',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to create bootstrap argument: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async populateEmptyArgument(
    documentId: string,
    argumentId: string,
    premiseContents: string[],
    conclusionContents: string[],
    sideLabels?: { left?: string; right?: string },
  ): Promise<Result<ViewResponse<PopulatedArgumentViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!argumentId || argumentId.trim().length === 0) {
        return err(new ValidationApplicationError('Argument ID cannot be empty'));
      }

      if (!Array.isArray(premiseContents) || premiseContents.length === 0) {
        return err(new ValidationApplicationError('At least one premise is required'));
      }

      if (!Array.isArray(conclusionContents) || conclusionContents.length === 0) {
        return err(new ValidationApplicationError('At least one conclusion is required'));
      }

      // Validate content
      const invalidPremises = premiseContents.filter(
        (content) => !content || content.trim().length === 0,
      );
      if (invalidPremises.length > 0) {
        return err(new ValidationApplicationError('All premise contents must be non-empty'));
      }

      const invalidConclusions = conclusionContents.filter(
        (content) => !content || content.trim().length === 0,
      );
      if (invalidConclusions.length > 0) {
        return err(new ValidationApplicationError('All conclusion contents must be non-empty'));
      }

      const command: PopulateEmptyArgumentCommand = {
        documentId: documentId.trim(),
        argumentId: argumentId.trim(),
        premiseContents: premiseContents.map((content) => content.trim()),
        conclusionContents: conclusionContents.map((content) => content.trim()),
        ...(sideLabels && { sideLabels }),
      };

      // Use ProofApplicationService to create statements and populate the argument
      const premiseStatements = [];
      for (const content of command.premiseContents) {
        const statementResult = await this.proofApplication.createStatement({
          documentId: command.documentId,
          content,
        });
        if (statementResult.isErr()) {
          return err(
            new ValidationApplicationError(
              `Failed to create premise statement: ${statementResult.error.message}`,
            ),
          );
        }
        premiseStatements.push(statementResult.value.id);
      }

      const conclusionStatements = [];
      for (const content of command.conclusionContents) {
        const statementResult = await this.proofApplication.createStatement({
          documentId: command.documentId,
          content,
        });
        if (statementResult.isErr()) {
          return err(
            new ValidationApplicationError(
              `Failed to create conclusion statement: ${statementResult.error.message}`,
            ),
          );
        }
        conclusionStatements.push(statementResult.value.id);
      }

      // Create the atomic argument with the statements
      const createArgCommand: CreateAtomicArgumentCommand = {
        documentId: command.documentId,
        premiseStatementIds: premiseStatements,
        conclusionStatementIds: conclusionStatements,
      };

      if (command.sideLabels) {
        createArgCommand.sideLabel = command.sideLabels;
      }

      const argumentResult = await this.proofApplication.createAtomicArgument(createArgCommand);

      if (argumentResult.isErr()) {
        return err(
          new ValidationApplicationError(
            `Failed to create atomic argument: ${argumentResult.error.message}`,
          ),
        );
      }

      const populatedArgumentViewDTO: PopulatedArgumentViewDTO = {
        argumentId: argumentResult.value.id,
        premises: command.premiseContents,
        conclusions: command.conclusionContents,
        isComplete: true,
        canCreateConnections: true,
        branchingOptions: command.premiseContents
          .concat(command.conclusionContents)
          .map((content) => ({
            fromText: content,
            position: command.premiseContents.includes(content)
              ? ('premise' as const)
              : ('conclusion' as const),
            suggestedBranches: [
              `Supporting evidence for: ${content}`,
              `Alternative interpretation of: ${content}`,
            ],
          })),
        ...(command.sideLabels && { sideLabels: command.sideLabels }),
      };

      return ok({
        data: populatedArgumentViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'populate-empty-argument',
          source: 'bootstrap',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to populate empty argument: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  // =============================
  // BOOTSTRAP QUERIES & WORKFLOWS
  // =============================

  async getBootstrapWorkflow(
    documentId: string,
  ): Promise<Result<ViewResponse<BootstrapWorkflowViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      // Mock workflow state analysis
      const workflowViewDTO: BootstrapWorkflowViewDTO = {
        documentId: documentId.trim(),
        currentStep: 1,
        totalSteps: 5,
        steps: [
          {
            stepNumber: 1,
            title: 'Create Document',
            description: 'Initialize an empty proof document',
            completed: true,
            current: false,
            actions: [],
          },
          {
            stepNumber: 2,
            title: 'Create First Argument',
            description: 'Add an empty atomic argument to begin your proof',
            completed: false,
            current: true,
            actions: [
              {
                type: 'create',
                label: 'Create Empty Argument',
                enabled: true,
              },
            ],
          },
          {
            stepNumber: 3,
            title: 'Populate Argument',
            description: 'Add premises and conclusions to your argument',
            completed: false,
            current: false,
            actions: [
              {
                type: 'populate',
                label: 'Add Premises & Conclusions',
                enabled: false,
              },
            ],
          },
          {
            stepNumber: 4,
            title: 'Create Connections',
            description: 'Branch from selected text to create connected arguments',
            completed: false,
            current: false,
            actions: [
              {
                type: 'branch',
                label: 'Create Branch',
                enabled: false,
              },
            ],
          },
          {
            stepNumber: 5,
            title: 'Validate Proof',
            description: 'Ensure your proof structure is logically sound',
            completed: false,
            current: false,
            actions: [
              {
                type: 'connect',
                label: 'Validate Proof',
                enabled: false,
              },
            ],
          },
        ],
        canAdvance: false,
        suggestions: [
          'Start by creating your first argument to establish the foundation of your proof',
          'Consider what you want to prove (your main conclusion) and work backwards',
          'Use clear, precise language in your statements',
        ],
      };

      return ok({
        data: workflowViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'get-bootstrap-workflow',
          source: 'workflow',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to get bootstrap workflow: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async createEmptyImplicationLine(
    documentId: string,
    treeId: string,
    position?: { x: number; y: number },
  ): Promise<Result<ViewResponse<EmptyImplicationLineViewDTO>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      if (!treeId || treeId.trim().length === 0) {
        return err(new ValidationApplicationError('Tree ID cannot be empty'));
      }

      const defaultPosition = { x: 200, y: 150 };
      const linePosition = position || defaultPosition;

      if (!this.isValidPosition(linePosition)) {
        return err(new ValidationApplicationError('Invalid position coordinates'));
      }

      // Create empty argument and return implication line representation
      const createResult = await this.createBootstrapArgument(documentId, linePosition);
      if (createResult.isErr()) {
        return err(createResult.error);
      }

      const argumentId = createResult.value.data?.argumentId;
      if (!argumentId) {
        return err(
          new ValidationApplicationError('Failed to create argument for implication line'),
        );
      }

      // Mock empty implication line display
      const emptyImplicationLineViewDTO: EmptyImplicationLineViewDTO = {
        argumentId,
        displayFormat: {
          premiseLines: ['[Click to add premise]', '[Click to add premise]'],
          horizontalLine: '─'.repeat(40),
          conclusionLines: ['[Click to add conclusion]'],
        },
        editableAreas: [
          {
            id: 'premise-1',
            type: 'premise',
            position: { line: 0, char: 0 },
            placeholder: 'Enter your first premise here...',
          },
          {
            id: 'premise-2',
            type: 'premise',
            position: { line: 1, char: 0 },
            placeholder: 'Enter additional premise (optional)...',
          },
          {
            id: 'conclusion-1',
            type: 'conclusion',
            position: { line: 3, char: 0 },
            placeholder: 'Enter your conclusion here...',
          },
          {
            id: 'side-label-left',
            type: 'side_label',
            position: { line: 2, char: -10 },
            placeholder: 'Rule name...',
          },
        ],
        userInstructions:
          'Click on any placeholder to start building your argument. The horizontal line represents the logical inference from premises to conclusion.',
      };

      return ok({
        data: emptyImplicationLineViewDTO,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'create-empty-implication-line',
          source: 'bootstrap',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to create empty implication line: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getBootstrapSuggestions(
    documentId: string,
    context?: {
      hasArguments?: boolean;
      hasStatements?: boolean;
      currentStep?: string;
    },
  ): Promise<Result<ViewResponse<string[]>, ValidationApplicationError>> {
    try {
      if (!documentId || documentId.trim().length === 0) {
        return err(new ValidationApplicationError('Document ID cannot be empty'));
      }

      // Mock context-aware suggestions
      let suggestions: string[] = [];

      if (!context?.hasArguments) {
        suggestions = [
          'Start with a simple argument: premise → conclusion',
          'Think about what you want to prove, then identify what you need to prove it',
          'Use the empty implication line to visualize your logical structure',
          'Consider familiar logical patterns like modus ponens: If P then Q, P, therefore Q',
        ];
      } else if (!context?.hasStatements) {
        suggestions = [
          'Add clear, specific statements to your argument',
          'Each premise should support your conclusion',
          'Use precise language to avoid ambiguity',
          'Consider whether you need additional premises',
        ];
      } else {
        suggestions = [
          'Select text from existing statements to create branches',
          'Look for opportunities to support your premises with sub-arguments',
          'Consider alternative conclusions that could follow from your premises',
          'Use the validation tools to check your logical structure',
        ];
      }

      return ok({
        data: suggestions,
        metadata: {
          timestamp: new Date().toISOString(),
          operationId: 'get-bootstrap-suggestions',
          source: 'guidance',
        },
      });
    } catch (error) {
      return err(
        new ValidationApplicationError(
          `Failed to get bootstrap suggestions: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  // =============================
  // PRIVATE HELPERS
  // =============================

  private isValidPosition(position: { x: number; y: number }): boolean {
    return (
      typeof position === 'object' &&
      position !== null &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y)
    );
  }
}
