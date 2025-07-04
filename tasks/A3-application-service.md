# Task A3: Application Service

## Status
- **Phase**: 2 - Application Layer  
- **Priority**: High
- **Estimated Effort**: 6-8 hours (expanded for complete implementation)
- **Dependencies**: A1 (Commands/Queries), A2 (Domain Mappers), D2 (ProofDocument Aggregate)
- **Blocks**: Presentation Layer (P1-P3)

## Goal
Implement a comprehensive, thin application service that orchestrates domain operations through CQRS commands and queries. The service maintains strict CLEAN architecture boundaries, follows DDD principles, uses neverthrow Result patterns, and implements SOLID design principles while providing complete coverage of all user workflows.

## Architectural Principles

### CLEAN Architecture
- **Thin orchestration layer** - No business logic
- **Dependency inversion** - Depends on abstractions (ports)
- **Boundary enforcement** - Uses mappers for all translations

### CQRS (Command Query Responsibility Segregation)
- **Commands** modify state and return minimal data
- **Queries** read state and return rich DTOs
- **Separate handlers** for commands vs queries
- **Event sourcing** through domain events

### DDD (Domain-Driven Design)
- **Aggregate boundaries** respected
- **Domain events** published after persistence
- **Ubiquitous language** in method names
- **Anti-corruption layer** via mappers

### Result Pattern (neverthrow)
- **All operations** return `Result<T, Error>`
- **No exceptions** thrown for business failures
- **Chaining** operations with `andThen`
- **Error context** preserved

### SOLID Principles
- **Single Responsibility** - Each method handles one use case
- **Open/Closed** - Extensible via dependency injection
- **Liskov Substitution** - Interface-based dependencies
- **Interface Segregation** - Minimal, focused interfaces
- **Dependency Inversion** - Depends on abstractions

## Required Implementation

### 1. Core Application Service Interface
Create `src/application/services/IProofApplicationService.ts`:
```typescript
import type { Result } from 'neverthrow';
import type { ValidationError } from '../../domain/shared/result.js';

// Import ALL command types
import type {
  CreateStatementCommand,
  UpdateStatementCommand,
  DeleteStatementCommand
} from '../commands/statement-commands.js';
import type {
  CreateOrderedSetCommand
} from '../commands/orderedset-commands.js';
import type {
  CreateAtomicArgumentCommand,
  UpdateArgumentSideLabelsCommand
} from '../commands/argument-commands.js';
import type {
  CreateTreeCommand,
  MoveTreeCommand,
  CreateRootNodeCommand,
  AttachNodeCommand,
  DetachNodeCommand,
  CreateBranchFromSelectionCommand,
  BatchCreateStatementsCommand,
  BatchAttachNodesCommand
} from '../commands/tree-commands.js';
import type {
  CreateDocumentCommand,
  LoadDocumentCommand,
  SaveDocumentCommand,
  ImportDocumentCommand,
  ExportDocumentCommand,
  ValidateDocumentCommand
} from '../commands/document-commands.js';
import type {
  RunCustomValidationScriptCommand,
  ValidateProofPathCommand
} from '../commands/validation-commands.js';
import type {
  InitializeEmptyDocumentCommand,
  CreateBootstrapArgumentCommand,
  PopulateEmptyArgumentCommand
} from '../commands/bootstrap-commands.js';

// Import ALL query types
import type {
  GetStatementQuery,
  ListStatementsQuery,
  TraceStatementFlowQuery,
  GetStatementUsageQuery,
  StatementDTO,
  StatementFlowDTO
} from '../queries/statement-queries.js';
import type {
  FindConnectionsQuery,
  GetConnectionPathsQuery,
  ConnectionDTO,
  ConnectionPathDTO
} from '../queries/connection-queries.js';
import type {
  GetTreeQuery,
  ListTreesQuery,
  GetTreeStructureQuery,
  GetTreeDepthQuery,
  GetTreeBranchesQuery,
  FindPathBetweenNodesQuery,
  GetSubtreeQuery,
  TreeDTO,
  TreeStructureDTO,
  TreeNodeDTO
} from '../queries/tree-queries.js';
import type {
  GetDocumentQuery,
  GetDocumentStateQuery,
  GetValidationReportQuery,
  AnalyzeProofStructureQuery,
  DocumentDTO,
  DocumentStatsDTO
} from '../queries/document-queries.js';
import type {
  GetBootstrapStatusQuery,
  GetBootstrapInstructionsQuery,
  BootstrapStatusDTO,
  BootstrapInstructionsDTO
} from '../queries/bootstrap-queries.js';

// Import ALL result types
import type {
  CreateStatementResult,
  CreateArgumentResult,
  AttachNodeResult,
  BranchCreationResult,
  ValidationResult,
  ImportResult,
  BootstrapResult
} from '../dtos/operation-results.js';

/**
 * Application Service Interface following CQRS and CLEAN Architecture
 * - Commands modify state, return minimal success indicators
 * - Queries read state, return rich DTOs
 * - All operations return Result<T, Error> for consistent error handling
 */
export interface IProofApplicationService {
  // =============================
  // STATEMENT COMMANDS
  // =============================
  createStatement(command: CreateStatementCommand): Promise<Result<CreateStatementResult, ValidationError>>;
  updateStatement(command: UpdateStatementCommand): Promise<Result<void, ValidationError>>;
  deleteStatement(command: DeleteStatementCommand): Promise<Result<void, ValidationError>>;
  
  // =============================
  // ORDERED SET COMMANDS  
  // =============================
  createOrderedSet(command: CreateOrderedSetCommand): Promise<Result<{ orderedSetId: string }, ValidationError>>;
  
  // =============================
  // ARGUMENT COMMANDS
  // =============================
  createAtomicArgument(command: CreateAtomicArgumentCommand): Promise<Result<CreateArgumentResult, ValidationError>>;
  updateArgumentSideLabels(command: UpdateArgumentSideLabelsCommand): Promise<Result<void, ValidationError>>;
  
  // =============================
  // TREE COMMANDS
  // =============================
  createTree(command: CreateTreeCommand): Promise<Result<{ treeId: string; tree: TreeDTO }, ValidationError>>;
  moveTree(command: MoveTreeCommand): Promise<Result<void, ValidationError>>;
  createRootNode(command: CreateRootNodeCommand): Promise<Result<{ nodeId: string }, ValidationError>>;
  attachNode(command: AttachNodeCommand): Promise<Result<AttachNodeResult, ValidationError>>;
  detachNode(command: DetachNodeCommand): Promise<Result<void, ValidationError>>;
  createBranchFromSelection(command: CreateBranchFromSelectionCommand): Promise<Result<BranchCreationResult, ValidationError>>;
  batchCreateStatements(command: BatchCreateStatementsCommand): Promise<Result<{ statementIds: string[] }, ValidationError>>;
  batchAttachNodes(command: BatchAttachNodesCommand): Promise<Result<{ nodeIds: string[] }, ValidationError>>;
  
  // =============================
  // DOCUMENT COMMANDS
  // =============================
  createDocument(command: CreateDocumentCommand): Promise<Result<{ documentId: string }, ValidationError>>;
  loadDocument(command: LoadDocumentCommand): Promise<Result<DocumentDTO, ValidationError>>;
  saveDocument(command: SaveDocumentCommand): Promise<Result<void, ValidationError>>;
  importDocument(command: ImportDocumentCommand): Promise<Result<ImportResult, ValidationError>>;
  exportDocument(command: ExportDocumentCommand): Promise<Result<string, ValidationError>>;
  validateDocument(command: ValidateDocumentCommand): Promise<Result<ValidationResult, ValidationError>>;
  
  // =============================
  // VALIDATION COMMANDS
  // =============================
  runCustomValidationScript(command: RunCustomValidationScriptCommand): Promise<Result<ValidationResult, ValidationError>>;
  validateProofPath(command: ValidateProofPathCommand): Promise<Result<ValidationResult, ValidationError>>;
  
  // =============================
  // BOOTSTRAP COMMANDS
  // =============================
  initializeEmptyDocument(command: InitializeEmptyDocumentCommand): Promise<Result<BootstrapResult, ValidationError>>;
  createBootstrapArgument(command: CreateBootstrapArgumentCommand): Promise<Result<BootstrapResult, ValidationError>>;
  populateEmptyArgument(command: PopulateEmptyArgumentCommand): Promise<Result<BootstrapResult, ValidationError>>;
  
  // =============================
  // STATEMENT QUERIES
  // =============================
  getStatement(query: GetStatementQuery): Promise<Result<StatementDTO, ValidationError>>;
  listStatements(query: ListStatementsQuery): Promise<Result<StatementDTO[], ValidationError>>;
  traceStatementFlow(query: TraceStatementFlowQuery): Promise<Result<StatementFlowDTO, ValidationError>>;
  getStatementUsage(query: GetStatementUsageQuery): Promise<Result<StatementFlowDTO, ValidationError>>;
  
  // =============================
  // CONNECTION QUERIES
  // =============================
  findConnections(query: FindConnectionsQuery): Promise<Result<ConnectionDTO[], ValidationError>>;
  getConnectionPaths(query: GetConnectionPathsQuery): Promise<Result<ConnectionPathDTO[], ValidationError>>;
  
  // =============================
  // TREE QUERIES
  // =============================
  getTree(query: GetTreeQuery): Promise<Result<TreeDTO, ValidationError>>;
  listTrees(query: ListTreesQuery): Promise<Result<TreeDTO[], ValidationError>>;
  getTreeStructure(query: GetTreeStructureQuery): Promise<Result<TreeStructureDTO, ValidationError>>;
  getTreeDepth(query: GetTreeDepthQuery): Promise<Result<{ depth: number }, ValidationError>>;
  getTreeBranches(query: GetTreeBranchesQuery): Promise<Result<TreeNodeDTO[], ValidationError>>;
  findPathBetweenNodes(query: FindPathBetweenNodesQuery): Promise<Result<TreeNodeDTO[], ValidationError>>;
  getSubtree(query: GetSubtreeQuery): Promise<Result<TreeStructureDTO, ValidationError>>;
  
  // =============================
  // DOCUMENT QUERIES
  // =============================
  getDocument(query: GetDocumentQuery): Promise<Result<DocumentDTO, ValidationError>>;
  getDocumentState(query: GetDocumentStateQuery): Promise<Result<DocumentDTO, ValidationError>>;
  getValidationReport(query: GetValidationReportQuery): Promise<Result<ValidationResult, ValidationError>>;
  analyzeProofStructure(query: AnalyzeProofStructureQuery): Promise<Result<DocumentStatsDTO, ValidationError>>;
  
  // =============================
  // BOOTSTRAP QUERIES
  // =============================
  getBootstrapStatus(query: GetBootstrapStatusQuery): Promise<Result<BootstrapStatusDTO, ValidationError>>;
  getBootstrapInstructions(query: GetBootstrapInstructionsQuery): Promise<Result<BootstrapInstructionsDTO, ValidationError>>;
}
```

### 2. Complete Application Service Implementation
Create `src/application/services/ProofApplicationService.ts`:
```typescript
import { Result, ok, err } from 'neverthrow';
import type { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import type { IDomainEventBus } from '../../domain/interfaces/IDomainEventBus.js';
import type { IFileSystemPort } from '../ports/IFileSystemPort.js';
import type { IPlatformPort } from '../ports/IPlatformPort.js';
import type { IUIPort } from '../ports/IUIPort.js';
import type { ValidationError } from '../../domain/shared/result.js';
import { ProofDocumentId } from '../../domain/shared/value-objects.js';

// Import ALL mappers
import {
  statementToDTO,
  validateStatementContent,
  statementFlowToDTO
} from '../mappers/StatementMapper.js';
import {
  orderedSetToDTO,
  validateStatementIds
} from '../mappers/OrderedSetMapper.js';
import {
  atomicArgumentToDTO,
  validateSideLabels
} from '../mappers/AtomicArgumentMapper.js';
import {
  treeToDTO,
  treeToStructureDTO,
  validatePosition,
  validatePremisePosition
} from '../mappers/TreeMapper.js';
import {
  documentToDTO,
  documentStatsToDTO
} from '../mappers/DocumentMapper.js';
import {
  validationErrorToDTO,
  createValidationErrorDTO
} from '../mappers/ValidationMapper.js';
import {
  bootstrapStatusToDTO,
  bootstrapInstructionsToDTO,
  bootstrapResultToDTO
} from '../mappers/BootstrapMapper.js';
import {
  connectionToDTO,
  connectionsToDTOs,
  connectionPathToDTO,
  connectionPathsToDTOs
} from '../mappers/ConnectionMapper.js';

// Import ALL interfaces
import type { IProofApplicationService } from './IProofApplicationService.js';

export class ProofApplicationService implements IProofApplicationService {
  constructor(
    private readonly documentRepository: IProofDocumentRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly fileSystem: IFileSystemPort,
    private readonly platform: IPlatformPort,
    private readonly ui: IUIPort
  ) {}

  // =============================
  // STATEMENT COMMANDS
  // =============================

  async createStatement(command: CreateStatementCommand): Promise<Result<CreateStatementResult, ValidationError>> {
    // 1. Validate command (Application layer responsibility)
    const contentValidation = validateStatementContent(command.content);
    if (contentValidation.isErr()) {
      return err(contentValidation.error);
    }

    // 2. Load aggregate root
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    // 3. Execute domain operation
    const statementResult = document.value.createStatement(contentValidation.value);
    if (statementResult.isErr()) {
      return err(statementResult.error);
    }

    // 4. Persist and publish events
    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // 5. Return result DTO
    return ok({
      statementId: statementResult.value.getId().getValue(),
      statement: statementToDTO(statementResult.value)
    });
  }

  async updateStatement(command: UpdateStatementCommand): Promise<Result<void, ValidationError>> {
    const contentValidation = validateStatementContent(command.content);
    if (contentValidation.isErr()) {
      return err(contentValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const updateResult = document.value.updateStatement(command.statementId, contentValidation.value);
    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    return this.saveAndPublishEvents(document.value);
  }

  async deleteStatement(command: DeleteStatementCommand): Promise<Result<void, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const deleteResult = document.value.deleteStatement(command.statementId);
    if (deleteResult.isErr()) {
      return err(deleteResult.error);
    }

    return this.saveAndPublishEvents(document.value);
  }

  // =============================
  // ORDERED SET COMMANDS
  // =============================

  async createOrderedSet(command: CreateOrderedSetCommand): Promise<Result<{ orderedSetId: string }, ValidationError>> {
    const idsValidation = validateStatementIds(command.statementIds);
    if (idsValidation.isErr()) {
      return err(idsValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const orderedSetResult = document.value.createOrderedSet(idsValidation.value);
    if (orderedSetResult.isErr()) {
      return err(orderedSetResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      orderedSetId: orderedSetResult.value.getId().getValue()
    });
  }

  // =============================
  // ARGUMENT COMMANDS
  // =============================

  async createAtomicArgument(command: CreateAtomicArgumentCommand): Promise<Result<CreateArgumentResult, ValidationError>> {
    // Validate inputs
    const sideLabelsValidation = validateSideLabels(command.sideLabel);
    if (sideLabelsValidation.isErr()) {
      return err(sideLabelsValidation.error);
    }

    const premiseIdsValidation = validateStatementIds(command.premiseStatementIds);
    if (premiseIdsValidation.isErr()) {
      return err(premiseIdsValidation.error);
    }

    const conclusionIdsValidation = validateStatementIds(command.conclusionStatementIds);
    if (conclusionIdsValidation.isErr()) {
      return err(conclusionIdsValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const argumentResult = document.value.createAtomicArgument(
      premiseIdsValidation.value,
      conclusionIdsValidation.value,
      sideLabelsValidation.value
    );
    if (argumentResult.isErr()) {
      return err(argumentResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      argumentId: argumentResult.value.argument.getId().getValue(),
      argument: atomicArgumentToDTO(argumentResult.value.argument),
      createdOrderedSets: argumentResult.value.createdOrderedSets?.map(os => os.getId().getValue())
    });
  }

  async updateArgumentSideLabels(command: UpdateArgumentSideLabelsCommand): Promise<Result<void, ValidationError>> {
    const sideLabelsValidation = validateSideLabels(command.sideLabels);
    if (sideLabelsValidation.isErr()) {
      return err(sideLabelsValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const updateResult = document.value.updateArgumentSideLabels(command.argumentId, sideLabelsValidation.value);
    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    return this.saveAndPublishEvents(document.value);
  }

  // =============================
  // TREE COMMANDS
  // =============================

  async createTree(command: CreateTreeCommand): Promise<Result<{ treeId: string; tree: TreeDTO }, ValidationError>> {
    const positionValidation = validatePosition(command.position);
    if (positionValidation.isErr()) {
      return err(positionValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const treeResult = document.value.createTree(positionValidation.value);
    if (treeResult.isErr()) {
      return err(treeResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      treeId: treeResult.value.getId().getValue(),
      tree: treeToDTO(treeResult.value)
    });
  }

  async moveTree(command: MoveTreeCommand): Promise<Result<void, ValidationError>> {
    const positionValidation = validatePosition(command.position);
    if (positionValidation.isErr()) {
      return err(positionValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const moveResult = document.value.moveTree(command.treeId, positionValidation.value);
    if (moveResult.isErr()) {
      return err(moveResult.error);
    }

    return this.saveAndPublishEvents(document.value);
  }

  async createRootNode(command: CreateRootNodeCommand): Promise<Result<{ nodeId: string }, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const nodeResult = document.value.createRootNode(command.treeId, command.argumentId);
    if (nodeResult.isErr()) {
      return err(nodeResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      nodeId: nodeResult.value.getId().getValue()
    });
  }

  async attachNode(command: AttachNodeCommand): Promise<Result<AttachNodeResult, ValidationError>> {
    const positionValidation = validatePremisePosition(command.premisePosition);
    if (positionValidation.isErr()) {
      return err(positionValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const attachResult = document.value.attachNode(
      command.treeId,
      command.argumentId,
      command.parentNodeId,
      positionValidation.value,
      command.fromPosition
    );
    if (attachResult.isErr()) {
      return err(attachResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      nodeId: attachResult.value.nodeId.getValue(),
      treeStructure: treeToStructureDTO(attachResult.value.tree)
    });
  }

  async detachNode(command: DetachNodeCommand): Promise<Result<void, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const detachResult = document.value.detachNode(command.treeId, command.nodeId);
    if (detachResult.isErr()) {
      return err(detachResult.error);
    }

    return this.saveAndPublishEvents(document.value);
  }

  async createBranchFromSelection(command: CreateBranchFromSelectionCommand): Promise<Result<BranchCreationResult, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const branchResult = document.value.createBranchFromSelection(
      command.sourceArgumentId,
      command.selectedText,
      command.position,
      command.newTreeId
    );
    if (branchResult.isErr()) {
      return err(branchResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      newStatement: statementToDTO(branchResult.value.newStatement),
      newArgument: atomicArgumentToDTO(branchResult.value.newArgument),
      connectionPoint: {
        sourceArgumentId: branchResult.value.connectionPoint.sourceArgumentId.getValue(),
        targetArgumentId: branchResult.value.connectionPoint.targetArgumentId.getValue(),
        sharedOrderedSetId: branchResult.value.connectionPoint.sharedOrderedSetId.getValue()
      },
      newTreeId: branchResult.value.newTreeId?.getValue()
    });
  }

  async batchCreateStatements(command: BatchCreateStatementsCommand): Promise<Result<{ statementIds: string[] }, ValidationError>> {
    // Validate all contents
    for (const stmt of command.statements) {
      const validation = validateStatementContent(stmt.content);
      if (validation.isErr()) {
        return err(validation.error);
      }
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const batchResult = document.value.batchCreateStatements(command.statements);
    if (batchResult.isErr()) {
      return err(batchResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      statementIds: batchResult.value.map(stmt => stmt.getId().getValue())
    });
  }

  async batchAttachNodes(command: BatchAttachNodesCommand): Promise<Result<{ nodeIds: string[] }, ValidationError>> {
    // Validate all premise positions
    for (const attachment of command.attachments) {
      const validation = validatePremisePosition(attachment.premisePosition);
      if (validation.isErr()) {
        return err(validation.error);
      }
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const batchResult = document.value.batchAttachNodes(command.treeId, command.attachments);
    if (batchResult.isErr()) {
      return err(batchResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      nodeIds: batchResult.value.map(node => node.getId().getValue())
    });
  }

  // =============================
  // DOCUMENT COMMANDS
  // =============================

  async createDocument(command: CreateDocumentCommand): Promise<Result<{ documentId: string }, ValidationError>> {
    const documentId = this.documentRepository.nextIdentity();
    const createResult = await ProofDocument.create(documentId.getValue());
    if (createResult.isErr()) {
      return err(createResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(createResult.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok({
      documentId: documentId.getValue()
    });
  }

  async loadDocument(command: LoadDocumentCommand): Promise<Result<DocumentDTO, ValidationError>> {
    const loadResult = await this.fileSystem.readFile(command.path);
    if (loadResult.isErr()) {
      return err(new ValidationError(`Failed to load document: ${loadResult.error.message}`));
    }

    const parseResult = await this.parseYAMLDocument(loadResult.value);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    // Save to repository
    const saveResult = await this.documentRepository.save(parseResult.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(documentToDTO(parseResult.value));
  }

  async saveDocument(command: SaveDocumentCommand): Promise<Result<void, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const yamlContent = this.serializeDocumentToYAML(document.value);
    const path = command.path || await this.platform.showSaveDialog();
    
    return this.fileSystem.writeFile(path, yamlContent);
  }

  async importDocument(command: ImportDocumentCommand): Promise<Result<ImportResult, ValidationError>> {
    const parseResult = await this.parseYAMLDocument(command.yamlContent);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    const saveResult = await this.documentRepository.save(parseResult.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    if (command.path) {
      const fileResult = await this.fileSystem.writeFile(command.path, command.yamlContent);
      if (fileResult.isErr()) {
        return err(fileResult.error);
      }
    }

    const stats = parseResult.value.getStatistics();
    return ok({
      documentId: parseResult.value.getId().getValue(),
      stats: {
        statementsImported: stats.statementCount,
        argumentsImported: stats.argumentCount,
        treesImported: stats.treeCount,
        errors: []
      }
    });
  }

  async exportDocument(command: ExportDocumentCommand): Promise<Result<string, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    switch (command.format) {
      case 'yaml':
        return ok(this.serializeDocumentToYAML(document.value));
      case 'json':
        return ok(JSON.stringify(documentToDTO(document.value), null, 2));
      case 'svg':
        return this.generateSVGExport(document.value);
      default:
        return err(new ValidationError(`Unsupported export format: ${command.format}`));
    }
  }

  async validateDocument(command: ValidateDocumentCommand): Promise<Result<ValidationResult, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const validationResult = document.value.validateDocument();
    const customScriptResults = command.includeCustomScripts ? 
      await this.runCustomValidationScripts(document.value) : [];

    return ok({
      isValid: validationResult.isOk(),
      errors: validationResult.isErr() ? [validationErrorToDTO(validationResult.error)] : [],
      warnings: [],
      customScriptResults
    });
  }

  // =============================
  // VALIDATION COMMANDS
  // =============================

  async runCustomValidationScript(command: RunCustomValidationScriptCommand): Promise<Result<ValidationResult, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    // Run custom script via platform validation runtime
    const scriptResult = await this.platform.executeValidationScript(
      command.scriptContent, 
      documentToDTO(document.value),
      command.scriptId
    );

    if (scriptResult.isErr()) {
      return err(scriptResult.error);
    }

    return ok({
      isValid: scriptResult.value.passed,
      errors: scriptResult.value.errors.map(error => createValidationErrorDTO(error.message, error.code)),
      warnings: scriptResult.value.warnings.map(warning => createValidationErrorDTO(warning.message, warning.code, 'warning')),
      customScriptResults: [{
        scriptId: command.scriptId || 'custom',
        passed: scriptResult.value.passed,
        messages: scriptResult.value.messages
      }]
    });
  }

  async validateProofPath(command: ValidateProofPathCommand): Promise<Result<ValidationResult, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const pathValidation = document.value.validateProofPath(command.fromNodeId, command.toNodeId);
    
    return ok({
      isValid: pathValidation.isOk(),
      errors: pathValidation.isErr() ? [validationErrorToDTO(pathValidation.error)] : [],
      warnings: []
    });
  }

  // =============================
  // BOOTSTRAP COMMANDS
  // =============================

  async initializeEmptyDocument(command: InitializeEmptyDocumentCommand): Promise<Result<BootstrapResult, ValidationError>> {
    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const bootstrapResult = document.value.initializeForBootstrap();
    if (bootstrapResult.isErr()) {
      return err(bootstrapResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(bootstrapResultToDTO(bootstrapResult.value));
  }

  async createBootstrapArgument(command: CreateBootstrapArgumentCommand): Promise<Result<BootstrapResult, ValidationError>> {
    const positionValidation = command.position ? validatePosition(command.position) : ok(undefined);
    if (positionValidation.isErr()) {
      return err(positionValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const bootstrapResult = document.value.createBootstrapArgument(command.treeId, positionValidation.value);
    if (bootstrapResult.isErr()) {
      return err(bootstrapResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(bootstrapResultToDTO(bootstrapResult.value));
  }

  async populateEmptyArgument(command: PopulateEmptyArgumentCommand): Promise<Result<BootstrapResult, ValidationError>> {
    // Validate all contents
    for (const content of [...command.premiseContents, ...command.conclusionContents]) {
      const validation = validateStatementContent(content);
      if (validation.isErr()) {
        return err(validation.error);
      }
    }

    const sideLabelsValidation = validateSideLabels(command.sideLabels);
    if (sideLabelsValidation.isErr()) {
      return err(sideLabelsValidation.error);
    }

    const document = await this.loadDocument(command.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const populateResult = document.value.populateEmptyArgument(
      command.argumentId,
      command.premiseContents,
      command.conclusionContents,
      sideLabelsValidation.value
    );
    if (populateResult.isErr()) {
      return err(populateResult.error);
    }

    const saveResult = await this.saveAndPublishEvents(document.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(bootstrapResultToDTO(populateResult.value));
  }

  // =============================
  // STATEMENT QUERIES
  // =============================

  async getStatement(query: GetStatementQuery): Promise<Result<StatementDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const statementResult = document.value.getStatement(query.statementId);
    if (statementResult.isErr()) {
      return err(statementResult.error);
    }

    return ok(statementToDTO(statementResult.value));
  }

  async listStatements(query: ListStatementsQuery): Promise<Result<StatementDTO[], ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const statements = document.value.listStatements(query.filter);
    return ok(statements.map(statementToDTO));
  }

  async traceStatementFlow(query: TraceStatementFlowQuery): Promise<Result<StatementFlowDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const flowResult = document.value.traceStatementFlow(query.statementId, query.maxDepth);
    if (flowResult.isErr()) {
      return err(flowResult.error);
    }

    return ok(statementFlowToDTO(flowResult.value));
  }

  async getStatementUsage(query: GetStatementUsageQuery): Promise<Result<StatementFlowDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const usageResult = document.value.getStatementUsage(query.statementId);
    if (usageResult.isErr()) {
      return err(usageResult.error);
    }

    return ok(statementFlowToDTO(usageResult.value));
  }

  // =============================
  // CONNECTION QUERIES
  // =============================

  async findConnections(query: FindConnectionsQuery): Promise<Result<ConnectionDTO[], ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const connections = document.value.findConnections(query.argumentId, query.orderedSetId);
    return ok(connectionsToDTOs(connections));
  }

  async getConnectionPaths(query: GetConnectionPathsQuery): Promise<Result<ConnectionPathDTO[], ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const paths = document.value.getConnectionPaths(query.fromArgumentId, query.toArgumentId, query.maxDepth);
    return ok(connectionPathsToDTOs(paths));
  }

  // =============================
  // TREE QUERIES
  // =============================

  async getTree(query: GetTreeQuery): Promise<Result<TreeDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const treeResult = document.value.getTree(query.treeId);
    if (treeResult.isErr()) {
      return err(treeResult.error);
    }

    return ok(treeToDTO(treeResult.value));
  }

  async listTrees(query: ListTreesQuery): Promise<Result<TreeDTO[], ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const trees = document.value.getAllTrees();
    return ok(trees.map(treeToDTO));
  }

  async getTreeStructure(query: GetTreeStructureQuery): Promise<Result<TreeStructureDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const treeResult = document.value.getTree(query.treeId);
    if (treeResult.isErr()) {
      return err(treeResult.error);
    }

    return ok(treeToStructureDTO(treeResult.value, query.includeArguments));
  }

  async getTreeDepth(query: GetTreeDepthQuery): Promise<Result<{ depth: number }, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const treeResult = document.value.getTree(query.treeId);
    if (treeResult.isErr()) {
      return err(treeResult.error);
    }

    const depth = document.value.calculateTreeDepth(treeResult.value);
    return ok({ depth });
  }

  async getTreeBranches(query: GetTreeBranchesQuery): Promise<Result<TreeNodeDTO[], ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const branchesResult = document.value.getTreeBranches(query.treeId, query.fromNodeId);
    if (branchesResult.isErr()) {
      return err(branchesResult.error);
    }

    return ok(branchesResult.value.map(node => ({
      nodeId: node.getId().getValue(),
      argumentId: node.getArgumentId().getValue(),
      isRoot: node.isRoot()
    })));
  }

  async findPathBetweenNodes(query: FindPathBetweenNodesQuery): Promise<Result<TreeNodeDTO[], ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const pathResult = document.value.findPathBetweenNodes(query.treeId, query.fromNodeId, query.toNodeId);
    if (pathResult.isErr()) {
      return err(pathResult.error);
    }

    return ok(pathResult.value.map(node => ({
      nodeId: node.getId().getValue(),
      argumentId: node.getArgumentId().getValue(),
      isRoot: node.isRoot()
    })));
  }

  async getSubtree(query: GetSubtreeQuery): Promise<Result<TreeStructureDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const subtreeResult = document.value.getSubtree(query.treeId, query.rootNodeId, query.maxDepth);
    if (subtreeResult.isErr()) {
      return err(subtreeResult.error);
    }

    return ok(treeToStructureDTO(subtreeResult.value));
  }

  // =============================
  // DOCUMENT QUERIES
  // =============================

  async getDocument(query: GetDocumentQuery): Promise<Result<DocumentDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    return ok(documentToDTO(document.value));
  }

  async getDocumentState(query: GetDocumentStateQuery): Promise<Result<DocumentDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    return ok(documentToDTO(document.value, query.includeStats));
  }

  async getValidationReport(query: GetValidationReportQuery): Promise<Result<ValidationResult, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const validationResult = document.value.validateDocument();
    const customScriptResults = query.includeCustomScripts ? 
      await this.runCustomValidationScripts(document.value) : [];

    return ok({
      isValid: validationResult.isOk(),
      errors: validationResult.isErr() ? [validationErrorToDTO(validationResult.error)] : [],
      warnings: [],
      customScriptResults
    });
  }

  async analyzeProofStructure(query: AnalyzeProofStructureQuery): Promise<Result<DocumentStatsDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const analysisResult = document.value.analyzeProofStructure(query.analysisType);
    if (analysisResult.isErr()) {
      return err(analysisResult.error);
    }

    return ok(documentStatsToDTO(analysisResult.value));
  }

  // =============================
  // BOOTSTRAP QUERIES
  // =============================

  async getBootstrapStatus(query: GetBootstrapStatusQuery): Promise<Result<BootstrapStatusDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const status = document.value.getBootstrapStatus();
    return ok(bootstrapStatusToDTO(status));
  }

  async getBootstrapInstructions(query: GetBootstrapInstructionsQuery): Promise<Result<BootstrapInstructionsDTO, ValidationError>> {
    const document = await this.loadDocument(query.documentId);
    if (document.isErr()) {
      return err(document.error);
    }

    const instructions = document.value.getBootstrapInstructions(query.context);
    return ok(bootstrapInstructionsToDTO(instructions));
  }

  // =============================
  // PRIVATE HELPERS (CLEAN ARCHITECTURE)
  // =============================

  private async loadDocument(documentId: string): Promise<Result<ProofDocument, ValidationError>> {
    const id = ProofDocumentId.create(documentId);
    if (id.isErr()) {
      return err(id.error);
    }

    const document = await this.documentRepository.findById(id.value);
    if (!document) {
      return err(new ValidationError(`Document not found: ${documentId}`));
    }

    return ok(document);
  }

  private async saveAndPublishEvents(document: ProofDocument): Promise<Result<void, ValidationError>> {
    // Save aggregate
    const saveResult = await this.documentRepository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.pullEvents();
    if (events.length > 0) {
      const publishResult = await this.eventBus.publishMany(events);
      if (publishResult.isErr()) {
        return err(publishResult.error);
      }
    }

    return ok(undefined);
  }

  private async parseYAMLDocument(yamlContent: string): Promise<Result<ProofDocument, ValidationError>> {
    // Implementation would use YAML parser and domain reconstruction
    // This is a placeholder for the actual implementation
    return err(new ValidationError('YAML parsing not yet implemented'));
  }

  private serializeDocumentToYAML(document: ProofDocument): string {
    // Implementation would serialize domain model to YAML
    // This is a placeholder for the actual implementation
    return '';
  }

  private async generateSVGExport(document: ProofDocument): Promise<Result<string, ValidationError>> {
    // Implementation would generate SVG representation
    // This is a placeholder for the actual implementation
    return err(new ValidationError('SVG export not yet implemented'));
  }

  private async runCustomValidationScripts(document: ProofDocument): Promise<any[]> {
    // Implementation would run custom validation scripts
    // This is a placeholder for the actual implementation
    return [];
  }
}
```

## Testing Requirements

### Comprehensive Service Tests
```typescript
describe('ProofApplicationService', () => {
  let service: ProofApplicationService;
  let mockRepository: MockProofDocumentRepository;
  let mockEventBus: MockDomainEventBus;
  let mockFileSystem: MockFileSystemPort;

  beforeEach(() => {
    mockRepository = new MockProofDocumentRepository();
    mockEventBus = new MockDomainEventBus();
    mockFileSystem = new MockFileSystemPort();
    
    service = new ProofApplicationService(
      mockRepository,
      mockEventBus,
      mockFileSystem,
      mockPlatform,
      mockUI
    );
  });

  describe('CQRS Command Handling', () => {
    test('createStatement follows proper Result pattern', async () => {
      const document = createTestDocument();
      const statement = createTestStatement();
      
      mockRepository.findById.mockResolvedValue(document);
      document.createStatement = jest.fn().mockReturnValue(ok(statement));
      
      const command = { documentId: 'doc1', content: 'Test statement' };
      const result = await service.createStatement(command);
      
      expect(result.isOk()).toBe(true);
      expect(result.value.statementId).toBe(statement.getId().getValue());
      expect(mockRepository.save).toHaveBeenCalledWith(document);
      expect(mockEventBus.publishMany).toHaveBeenCalled();
    });

    test('validates command inputs before domain operation', async () => {
      const command = { documentId: 'doc1', content: '' };
      const result = await service.createStatement(command);
      
      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('cannot be empty');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('CQRS Query Handling', () => {
    test('getStatement returns proper DTO', async () => {
      const document = createTestDocument();
      const statement = createTestStatement();
      
      mockRepository.findById.mockResolvedValue(document);
      document.getStatement = jest.fn().mockReturnValue(ok(statement));
      
      const query = { documentId: 'doc1', statementId: 'stmt1' };
      const result = await service.getStatement(query);
      
      expect(result.isOk()).toBe(true);
      expect(result.value.id).toBe(statement.getId().getValue());
      expect(mockEventBus.publishMany).not.toHaveBeenCalled(); // Queries don't publish events
    });
  });

  describe('Error Handling', () => {
    test('propagates domain errors properly', async () => {
      const document = createTestDocument();
      const domainError = new ValidationError('Domain validation failed');
      
      mockRepository.findById.mockResolvedValue(document);
      document.createStatement = jest.fn().mockReturnValue(err(domainError));
      
      const command = { documentId: 'doc1', content: 'Valid content' };
      const result = await service.createStatement(command);
      
      expect(result.isErr()).toBe(true);
      expect(result.error.message).toBe('Domain validation failed');
    });
  });
});
```

## Success Criteria

### Architectural Compliance
- [ ] **CLEAN Architecture**: Thin orchestration, no business logic
- [ ] **CQRS**: Separate command/query handling
- [ ] **DDD**: Aggregate boundaries respected, domain events published
- [ ] **Result Pattern**: All operations return `Result<T, Error>`
- [ ] **SOLID**: Single responsibility, dependency inversion

### Functional Completeness
- [ ] **ALL command handlers implemented** (100% coverage)
- [ ] **ALL query handlers implemented** (100% coverage)
- [ ] **Bootstrap operations** fully supported
- [ ] **Branch creation workflow** implemented
- [ ] **File operations** (load/save/import/export) implemented
- [ ] **Validation operations** implemented

### Quality Assurance
- [ ] **100% test coverage** for all handlers
- [ ] **Error handling** consistent and comprehensive
- [ ] **Event publishing** after all state changes
- [ ] **Mapper usage** for all DTO translations
- [ ] **Port abstractions** for all external dependencies

## Notes
- Service must remain stateless (follows SOLID principles)
- All business logic stays in domain layer (CLEAN architecture)
- Events published after successful persistence (DDD)
- Error context preserved through layers (Result pattern)
- Mappers handle all DTO conversions (boundary enforcement)
- Repository and event bus abstracted via interfaces (dependency inversion)
- Bootstrap operations enable empty document workflows
- Branch creation supports core user workflow
- File operations enable document persistence
- Custom validation scripts support user-defined rules