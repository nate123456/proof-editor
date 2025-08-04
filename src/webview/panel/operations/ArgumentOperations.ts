import { err, ok, type Result } from 'neverthrow';
import type { CreateStatementCommand } from '../../../application/commands/statement-commands.js';
import type { IExportService } from '../../../application/ports/IExportService.js';
import type { IUIPort, QuickPickOptions } from '../../../application/ports/IUIPort.js';
import type { DocumentDTO } from '../../../application/queries/document-queries.js';
import type { IDocumentIdService } from '../../../application/services/DocumentIdService.js';
import type { ProofApplicationService } from '../../../application/services/ProofApplicationService.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { EventData } from '../../../domain/shared/value-objects/content.js';
import { MessageType } from '../../../domain/shared/value-objects/enums.js';
import {
  NodeId,
  StatementId,
  WebviewId,
} from '../../../domain/shared/value-objects/identifiers.js';
import {
  DialogTitle,
  NotificationMessage,
  PlaceholderText,
} from '../../../domain/shared/value-objects/ui.js';
import type { BootstrapController } from '../../../presentation/controllers/BootstrapController.js';

/**
 * Handles argument-specific operations for ProofTreePanel
 */
export class ArgumentOperations {
  private readonly webviewId: WebviewId;

  constructor(
    private readonly proofApplicationService: ProofApplicationService,
    private readonly bootstrapController: BootstrapController,
    private readonly exportService: IExportService,
    private readonly documentIdService: IDocumentIdService,
    private readonly uiPort: IUIPort,
    panelId: string,
    private readonly documentUri: string,
  ) {
    // Create WebviewId from panelId string
    const webviewIdResult = WebviewId.create(panelId);
    if (webviewIdResult.isErr()) {
      throw new Error(`Invalid panel ID: ${webviewIdResult.error.message}`);
    }
    this.webviewId = webviewIdResult.value;
  }

  /**
   * Extract document ID from URI
   */
  private extractDocumentIdFromUri(): string | null {
    const result = this.documentIdService.extractFromUriWithFallback(this.documentUri);
    return result.isOk() ? result.value : null;
  }

  /**
   * Create a new argument
   */
  async createArgument(
    premises: string[],
    conclusions: string[],
    ruleName?: string,
  ): Promise<Result<{ argumentId: string }, ValidationError>> {
    const documentId = this.extractDocumentIdFromUri();
    if (!documentId) {
      const errorMsg = NotificationMessage.create('Could not determine document ID');
      if (errorMsg.isOk()) {
        this.uiPort.showError(errorMsg.value);
      }
      return err(new ValidationError('Could not determine document ID'));
    }

    // First create an empty bootstrap argument
    const createResult = await this.bootstrapController.createBootstrapArgument(documentId);
    if (createResult.isErr()) {
      const notificationResult = NotificationMessage.create(createResult.error.message);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError(createResult.error.message));
    }

    const argumentId = createResult.value.data?.argumentId;
    if (!argumentId) {
      const notificationResult = NotificationMessage.create(
        'Failed to get argument ID from created argument',
      );
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError('Failed to get argument ID from created argument'));
    }

    // Then populate it with the provided premises and conclusions
    const result = await this.bootstrapController.populateEmptyArgument(
      documentId,
      argumentId,
      premises,
      conclusions,
      ruleName ? { left: ruleName } : undefined,
    );

    if (result.isErr()) {
      const notificationResult = NotificationMessage.create(result.error.message);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError(result.error.message));
    }

    // Notify webview of success
    const eventData = EventData.create({
      argumentId: result.value.data?.argumentId,
    });
    if (eventData.isOk()) {
      this.uiPort.postMessageToWebview(this.webviewId, {
        type: MessageType.ARGUMENT_CREATED,
        data: eventData.value,
      });
    }

    return result.map(() => ({ argumentId }));
  }

  /**
   * Add a statement to the document
   */
  async addStatement(
    statementType: 'premise' | 'conclusion',
    content: string,
  ): Promise<Result<{ statementId: string; content: string }, ValidationError>> {
    const documentId = this.extractDocumentIdFromUri();
    if (!documentId) {
      const errorMsg = NotificationMessage.create('Could not determine document ID');
      if (errorMsg.isOk()) {
        this.uiPort.showError(errorMsg.value);
      }
      return err(new ValidationError('Could not determine document ID'));
    }

    // Create statement command
    const command: CreateStatementCommand = {
      documentId,
      content,
    };

    // Execute command through ProofApplicationService
    const result = await this.proofApplicationService.createStatement(command);

    if (result.isErr()) {
      const notificationResult = NotificationMessage.create(result.error.message);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError(result.error.message));
    }

    // Notify webview of success
    const eventData = EventData.create({
      statementType,
      statementId: result.value.id,
      content: result.value.content,
    });
    if (eventData.isOk()) {
      this.uiPort.postMessageToWebview(this.webviewId, {
        type: MessageType.STATEMENT_ADDED,
        data: eventData.value,
      });
    }

    // Show success message
    const successMessage = `${statementType === 'premise' ? 'Premise' : 'Conclusion'} added successfully`;
    const notificationResult = NotificationMessage.create(successMessage);
    if (notificationResult.isOk()) {
      this.uiPort.showInformation(notificationResult.value);
    }

    return ok({ statementId: result.value.id, content: result.value.content });
  }

  /**
   * Update statement content
   */
  async updateStatementContent(
    statementId: string,
    newContent: string,
  ): Promise<Result<void, ValidationError>> {
    const documentId = this.extractDocumentIdFromUri();
    if (!documentId) {
      const errorMsg = NotificationMessage.create('Could not determine document ID');
      if (errorMsg.isOk()) {
        this.uiPort.showError(errorMsg.value);
      }
      return err(new ValidationError('Could not determine document ID'));
    }

    const result = await this.proofApplicationService.updateStatement({
      documentId,
      statementId,
      content: newContent,
    });

    if (result.isErr()) {
      const errorMessage = `Failed to update statement: ${result.error.message}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError(result.error.message));
    }

    const notificationResult = NotificationMessage.create('Statement updated successfully');
    if (notificationResult.isOk()) {
      this.uiPort.showInformation(notificationResult.value);
    }
    return ok(undefined);
  }

  /**
   * Update argument label
   */
  async updateArgumentLabel(
    nodeId: string,
    labelType: string,
    newContent: string,
  ): Promise<Result<void, ValidationError>> {
    const documentId = this.extractDocumentIdFromUri();
    if (!documentId) {
      const errorMsg = NotificationMessage.create('Could not determine document ID');
      if (errorMsg.isOk()) {
        this.uiPort.showError(errorMsg.value);
      }
      return err(new ValidationError('Could not determine document ID'));
    }

    const result = await this.proofApplicationService.updateArgumentLabel({
      documentId,
      argumentId: nodeId,
      sideLabels: {
        [labelType || 'left']: newContent,
      },
    });

    if (result.isErr()) {
      const errorMessage = `Failed to update label: ${result.error.message}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError(result.error.message));
    }

    const notificationResult = NotificationMessage.create('Label updated successfully');
    if (notificationResult.isOk()) {
      this.uiPort.showInformation(notificationResult.value);
    }
    return ok(undefined);
  }

  /**
   * Export proof to file
   */
  async exportProof(): Promise<Result<void, ValidationError>> {
    const documentId = this.extractDocumentIdFromUri();
    if (!documentId) {
      const errorMsg = NotificationMessage.create('Could not determine document ID');
      if (errorMsg.isOk()) {
        this.uiPort.showError(errorMsg.value);
      }
      return err(new ValidationError('Could not determine document ID'));
    }

    // Show export format selection dialog
    const formatResult = await this.uiPort.showQuickPick(
      [
        { label: 'YAML (.proof)', description: 'Export as YAML proof file' },
        { label: 'JSON (.json)', description: 'Export as structured JSON data' },
        { label: 'PDF (.pdf)', description: 'Export as printable PDF document' },
        { label: 'SVG (.svg)', description: 'Export as vector graphics diagram' },
      ],
      (() => {
        const titleResult = DialogTitle.create('Select Export Format');
        const placeholderResult = PlaceholderText.create(
          'Choose the format for exporting your proof',
        );
        const options: QuickPickOptions = {};
        if (titleResult.isOk()) {
          options.title = titleResult.value;
        }
        if (placeholderResult.isOk()) {
          options.placeHolder = placeholderResult.value;
        }
        return options;
      })(),
    );

    if (formatResult.isErr() || !formatResult.value) {
      return ok(undefined); // User cancelled
    }

    // Determine export format from selection
    const formatMap: Record<string, 'yaml' | 'json' | 'pdf' | 'svg'> = {
      'YAML (.proof)': 'yaml',
      'JSON (.json)': 'json',
      'PDF (.pdf)': 'pdf',
      'SVG (.svg)': 'svg',
    };

    const selectedFormat = formatMap[formatResult.value.label];
    if (!selectedFormat) {
      const notificationResult = NotificationMessage.create('Invalid export format selected');
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError('Invalid export format selected'));
    }

    // Export and save the document
    const exportResult = await this.exportService.saveToFile(documentId, {
      format: selectedFormat,
      includeMetadata: true,
      includeVisualization: selectedFormat === 'pdf' || selectedFormat === 'svg',
    });

    if (exportResult.isErr()) {
      const errorMessage = `Export failed: ${exportResult.error.message}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError(exportResult.error.message));
    }

    // Show success message
    const successMessage = `Successfully exported proof to ${exportResult.value.filePath}`;
    const notificationResult = NotificationMessage.create(successMessage);
    if (notificationResult.isOk()) {
      this.uiPort.showInformation(notificationResult.value);
    }

    // Post export completion message to webview
    const eventData = EventData.create({
      format: selectedFormat,
      filePath: exportResult.value.filePath,
      success: exportResult.value.savedSuccessfully,
    });
    if (eventData.isOk()) {
      this.uiPort.postMessageToWebview(this.webviewId, {
        type: MessageType.EXPORT_COMPLETED,
        data: eventData.value,
      });
    }

    return exportResult.map(() => undefined);
  }

  /**
   * Create branch from selected text
   */
  async createBranchFromSelection(
    sourceArgumentId: string,
    selectedText: string,
    position: 'premise' | 'conclusion',
  ): Promise<Result<void, ValidationError>> {
    const documentId = this.extractDocumentIdFromUri();
    if (!documentId) {
      const errorMsg = NotificationMessage.create('Could not determine document ID');
      if (errorMsg.isOk()) {
        this.uiPort.showError(errorMsg.value);
      }
      return err(new ValidationError('Could not determine document ID'));
    }

    // Create the branch through application service
    const branchResult = await this.proofApplicationService.createBranchFromSelection({
      documentId,
      sourceArgumentId,
      selectedText,
      position,
    });

    if (branchResult.isErr()) {
      const errorMessage = `Failed to create branch: ${branchResult.error.message}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return err(new ValidationError(branchResult.error.message));
    }

    const newArgument = branchResult.value;

    // Notify webview of successful branch creation
    const eventData = EventData.create({
      newArgumentId: newArgument.id,
      sourceArgumentId,
      selectedText,
      position,
      premises: newArgument.premiseIds,
      conclusions: newArgument.conclusionIds,
    });
    if (eventData.isOk()) {
      this.uiPort.postMessageToWebview(this.webviewId, {
        type: MessageType.BRANCH_CREATED,
        data: eventData.value,
      });
    }

    const successMessage = `Successfully created ${position === 'conclusion' ? 'forward' : 'backward'} branch`;
    const notificationResult = NotificationMessage.create(successMessage);
    if (notificationResult.isOk()) {
      this.uiPort.showInformation(notificationResult.value);
    }

    return branchResult.map(() => undefined);
  }

  /**
   * Find which arguments contain a specific statement
   */
  findArgumentsContainingStatement(document: DocumentDTO, statementId: string): string[] {
    const argumentIds: string[] = [];

    for (const [argumentId, argument] of Object.entries(document.atomicArguments)) {
      // Create StatementId from the string parameter
      const statementIdResult = StatementId.create(statementId);
      if (statementIdResult.isErr()) {
        continue;
      }

      // Check if the argument contains this statement
      const containsPremise = argument.premiseIds.some((id) => {
        return id.getValue() === statementIdResult.value.getValue();
      });

      const containsConclusion = argument.conclusionIds.some((id) => {
        return id.getValue() === statementIdResult.value.getValue();
      });

      if (containsPremise || containsConclusion) {
        argumentIds.push(argumentId);
      }
    }
    return argumentIds;
  }

  /**
   * Find which tree contains a specific node
   */
  findTreeForNode(document: DocumentDTO, nodeId: string): string | null {
    // For now, we'll use a simple heuristic based on tree root nodes
    // In a real implementation, this would involve traversing the tree structure
    for (const [treeId, tree] of Object.entries(document.trees)) {
      // Create NodeId from the string parameter
      const nodeIdResult = NodeId.create(nodeId);
      if (nodeIdResult.isErr()) {
        continue;
      }

      // Check if this node is one of the root nodes
      const isRootNode = tree.rootNodeIds.some((id) => {
        return id.getValue() === nodeIdResult.value.getValue();
      });

      if (isRootNode) {
        return treeId;
      }
    }

    // If not found in root nodes, we need a different approach
    // For now, we'll assume the first tree if we can't determine the exact tree
    const treeIds = Object.keys(document.trees);
    if (treeIds.length === 1) {
      const firstTreeId = treeIds[0];
      return firstTreeId ?? null;
    }

    // In a more sophisticated implementation, we would:
    // 1. Query the tree structure service to find which tree contains the node
    // 2. Or maintain a node-to-tree mapping in the document structure
    return null;
  }
}
