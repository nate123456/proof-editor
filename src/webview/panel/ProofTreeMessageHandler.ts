import { err, ok, type Result } from 'neverthrow';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import { ValidationError } from '../../domain/shared/result.js';
import { MessageContent } from '../../domain/shared/value-objects/content.js';
import { MessageType } from '../../domain/shared/value-objects/enums.js';
import { WebviewId } from '../../domain/shared/value-objects/identifiers.js';
import { NotificationMessage } from '../../domain/shared/value-objects/ui.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { TreeRenderer } from '../TreeRenderer.js';
import type { ArgumentOperations } from './operations/ArgumentOperations.js';
import type { ProofTreeStateManager } from './ProofTreeStateManager.js';
import * as ProofTreeValidators from './validation/ProofTreeValidators.js';

/**
 * Handles all message passing between webview and extension for ProofTreePanel
 */
export class ProofTreeMessageHandler {
  private readonly webviewId: WebviewId;

  constructor(
    panelId: string,
    private readonly documentUri: string,
    private readonly uiPort: IUIPort,
    private readonly visualizationService: ProofVisualizationService,
    private readonly documentQueryService: DocumentQueryService,
    private readonly renderer: TreeRenderer,
    private readonly stateManager: ProofTreeStateManager,
    private readonly argumentOperations: ArgumentOperations,
    private readonly proofApplicationService: ProofApplicationService,
    private readonly yamlSerializer: YAMLSerializer,
  ) {
    // Create WebviewId from panelId string
    const webviewIdResult = WebviewId.create(panelId);
    if (webviewIdResult.isErr()) {
      throw new Error(`Invalid panel ID: ${webviewIdResult.error.message}`);
    }
    this.webviewId = webviewIdResult.value;
  }

  /**
   * Main message handler
   */
  async handleMessage(message: unknown): Promise<void> {
    try {
      if (!message || typeof message !== 'object') {
        return;
      }

      const msg = message as { type?: string; [key: string]: unknown };

      if (!msg.type) {
        return;
      }

      switch (msg.type) {
        case 'viewportChanged':
          await this.stateManager.handleViewStateUpdate(msg.type, msg.viewport);
          break;
        case 'panelStateChanged':
          await this.stateManager.handleViewStateUpdate(msg.type, msg.panel);
          break;
        case 'selectionChanged':
          await this.stateManager.handleViewStateUpdate(msg.type, msg.selection);
          break;
        case 'createArgument':
          await this.handleCreateArgument(msg);
          break;
        case 'addStatement':
          await this.handleAddStatement(msg);
          break;
        case 'exportProof':
          await this.handleExportProof();
          break;
        case 'showError': {
          const errorMessage = msg.message as string;
          const notificationResult = NotificationMessage.create(errorMessage);
          if (notificationResult.isOk()) {
            this.uiPort.showError(notificationResult.value);
          }
          break;
        }
        case 'editContent':
          await this.handleEditContent(msg);
          break;
        case 'moveStatement':
          await this.handleMoveStatement(msg);
          break;
        case 'moveNode':
          await this.handleMoveNode(msg);
          break;
        case 'createBranchFromSelection':
          await this.handleCreateBranchFromSelection(msg);
          break;
      }
    } catch (_error) {
      // Message handling errors should not crash the panel
      if (process.env.NODE_ENV === 'development') {
        // Could add debug logging here in development
      }
    }
  }

  /**
   * Handle content update
   */
  async updateContent(content: string): Promise<Result<void, ValidationError>> {
    try {
      // Parse content through application service
      const parseResult = await this.documentQueryService.parseDocumentContent(content);
      if (parseResult.isErr()) {
        const errorResult = this.showParseErrors([{ message: parseResult.error.message }]);
        if (errorResult.isErr()) {
          return errorResult;
        }
        return parseResult.map(() => undefined);
      }

      // Generate visualization through application service
      const visualizationResult = this.visualizationService.generateVisualization(
        parseResult.value,
      );
      if (visualizationResult.isErr()) {
        const errorResult = this.showParseErrors([{ message: visualizationResult.error.message }]);
        if (errorResult.isErr()) {
          return errorResult;
        }
        return visualizationResult.map(() => undefined);
      }

      // Render visualization (view-only operation)
      const svgContent = this.renderer.generateSVG(visualizationResult.value);

      // Send update through platform abstraction
      const contentResult = MessageContent.create(svgContent);
      if (contentResult.isErr()) {
        return err(contentResult.error);
      }
      this.uiPort.postMessageToWebview(this.webviewId, {
        type: MessageType.UPDATE_TREE,
        content: contentResult.value,
      });

      return visualizationResult.map(() => undefined);
    } catch (error) {
      // For unexpected errors, we return an error Result instead of just showing it
      return err(
        new ValidationError(
          `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Show parse errors in the webview
   */
  showParseErrors(
    errors: readonly { message: string; line?: number; section?: string }[],
  ): Result<void, ValidationError> {
    try {
      const errorMessages = errors
        .map((error) => `${error.section ? `[${error.section}] ` : ''}${error.message}`)
        .join('\n');

      const errorContent = `
        <div class="error-container">
          <h3>Parse Errors</h3>
          <pre class="error-text">${this.escapeHtml(errorMessages)}</pre>
        </div>
      `;

      // Send error through platform abstraction
      const errorContentResult = MessageContent.create(errorContent);
      if (errorContentResult.isOk()) {
        this.uiPort.postMessageToWebview(this.webviewId, {
          type: MessageType.SHOW_ERROR,
          content: errorContentResult.value,
        });
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to show parse errors: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Refresh content from document
   */
  async refreshContent(): Promise<void> {
    try {
      // Extract document ID from URI
      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        // Silently fail if we can't determine document ID during refresh
        return;
      }

      // Get updated document content
      const documentResult = await this.documentQueryService.getDocumentById(documentId);
      if (documentResult.isErr()) {
        // Silently fail during refresh to avoid disrupting user experience
        return;
      }

      // Generate updated visualization
      const visualizationResult = this.visualizationService.generateVisualization(
        documentResult.value,
      );

      if (visualizationResult.isErr()) {
        // Silently fail during refresh
        return;
      }

      const svgContent = this.renderer.generateSVG(visualizationResult.value);

      // Update webview content
      const contentResult = MessageContent.create(svgContent);
      if (contentResult.isOk()) {
        this.uiPort.postMessageToWebview(this.webviewId, {
          type: MessageType.UPDATE_TREE,
          content: contentResult.value,
        });
      }
    } catch (_error) {
      // Ignore refresh errors to avoid disrupting user experience
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private extractDocumentIdFromUri(): string | null {
    // Extract document ID from URI - this duplicates logic from ArgumentOperations
    // but avoids exposing the private method
    const parts = this.documentUri.split('/');
    const fileName = parts[parts.length - 1];
    if (fileName) {
      const baseName = fileName.replace(/\.(proof|yaml|yml)$/i, '');
      return baseName || null;
    }
    return null;
  }

  private async handleCreateArgument(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const premises = msg.premises as string[];
      const conclusions = msg.conclusions as string[];
      const ruleName = msg.ruleName as string | undefined;

      const validationResult = ProofTreeValidators.validateCreateArgumentInput(
        premises,
        conclusions,
      );
      if (validationResult.isErr()) {
        const notificationResult = NotificationMessage.create(validationResult.error.message);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      const result = await this.argumentOperations.createArgument(premises, conclusions, ruleName);
      if (result.isErr()) {
        return;
      }

      // ArgumentOperations already sends the argumentCreated message
      // Refresh the content to show the new argument
      await this.refreshContent();
    } catch (error) {
      const errorMessage = `Failed to create argument: ${error instanceof Error ? error.message : String(error)}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
    }
  }

  private async handleAddStatement(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const statementType = msg.statementType as 'premise' | 'conclusion';
      const content = msg.content as string;

      const contentValidation = ProofTreeValidators.validateStatementContent(content);
      if (contentValidation.isErr()) {
        const notificationResult = NotificationMessage.create(contentValidation.error.message);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      const result = await this.argumentOperations.addStatement(
        statementType,
        contentValidation.value,
      );
      if (result.isErr()) {
        return;
      }

      // Send statementAdded message to webview
      if (result.value && result.value.statementId) {
        const contentResult = MessageContent.create(
          JSON.stringify({
            statementType,
            statementId: result.value.statementId,
            content: result.value.content,
          }),
        );
        if (contentResult.isOk()) {
          this.uiPort.postMessageToWebview(this.webviewId, {
            type: MessageType.STATEMENT_ADDED,
            content: contentResult.value,
          });
        }
      }

      // Show success notification
      const successMessage =
        statementType === 'premise'
          ? 'Premise added successfully'
          : 'Conclusion added successfully';
      const notificationResult = NotificationMessage.create(successMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showInformation(notificationResult.value);
      }

      // Refresh the content to show the new statement
      await this.refreshContent();
    } catch (error) {
      const errorMessage = `Failed to add statement: ${error instanceof Error ? error.message : String(error)}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
    }
  }

  private async handleExportProof(): Promise<void> {
    try {
      await this.argumentOperations.exportProof();
    } catch (error) {
      const errorMessage = `Failed to export proof: ${error instanceof Error ? error.message : String(error)}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
    }
  }

  private async handleEditContent(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = ProofTreeValidators.validateEditContentMetadata(
        msg.metadata,
        msg.newContent,
      );
      if (validationResult.isErr()) {
        const notificationResult = NotificationMessage.create(validationResult.error.message);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      const { metadata, newContent } = validationResult.value;

      if (metadata.type === 'statement' && metadata.statementId) {
        const result = await this.argumentOperations.updateStatementContent(
          metadata.statementId,
          newContent,
        );
        if (result.isOk()) {
          const successMsg = NotificationMessage.create('Statement updated successfully');
          if (successMsg.isOk()) {
            this.uiPort.showInformation(successMsg.value);
          }
        }
      } else if (metadata.type === 'label' && metadata.nodeId) {
        const result = await this.argumentOperations.updateArgumentLabel(
          metadata.nodeId,
          metadata.labelType || 'left',
          newContent,
        );
        if (result.isOk()) {
          const successMsg = NotificationMessage.create('Label updated successfully');
          if (successMsg.isOk()) {
            this.uiPort.showInformation(successMsg.value);
          }
        }
      }

      // Refresh content to show changes
      await this.refreshContent();
    } catch (error) {
      const errorMessage = `Failed to edit content: ${error instanceof Error ? error.message : String(error)}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
    }
  }

  private async handleMoveStatement(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = ProofTreeValidators.validateMoveStatementInput(
        msg.sourceData,
        msg.targetStatementId,
        msg.dropType,
      );
      if (validationResult.isErr()) {
        const notificationResult = NotificationMessage.create(validationResult.error.message);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      const { sourceData, targetStatementId } = validationResult.value;

      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        const notificationResult = NotificationMessage.create('Could not determine document ID');
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      // Get the current document to find ordered sets
      const document = await this.documentQueryService.getDocumentById(documentId);
      if (document.isErr()) {
        const errorMessage = `Failed to get document: ${document.error.message}`;
        const notificationResult = NotificationMessage.create(errorMessage);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      // Find the arguments containing source and target statements
      const sourceArgumentIds = this.argumentOperations.findArgumentsContainingStatement(
        document.value,
        sourceData.statementId,
      );
      const targetArgumentIds = this.argumentOperations.findArgumentsContainingStatement(
        document.value,
        targetStatementId,
      );

      if (sourceArgumentIds.length === 0) {
        const notificationResult = NotificationMessage.create(
          'Could not find source statement in any argument',
        );
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      if (targetArgumentIds.length === 0) {
        const notificationResult = NotificationMessage.create(
          'Could not find target statement in any argument',
        );
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      // Check if they share any common arguments
      const sharedArguments = sourceArgumentIds.filter((id) => targetArgumentIds.includes(id));
      if (sharedArguments.length > 0) {
        const notificationResult = NotificationMessage.create(
          'Statement reordering within the same argument is not yet implemented',
        );
        if (notificationResult.isOk()) {
          this.uiPort.showInformation(notificationResult.value);
        }
        await this.refreshContent();
        return;
      }

      // TODO: Implement statement movement after OrderedSet elimination
      // This functionality needs to be redesigned to work with direct statement references
      const notificationResult = NotificationMessage.create(
        'Statement movement is not yet implemented after OrderedSet removal',
      );
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
      return;
    } catch (error) {
      const errorMessage = `Failed to move statement: ${error instanceof Error ? error.message : String(error)}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
    }
  }

  private async handleMoveNode(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = ProofTreeValidators.validateMoveNodeInput(
        msg.nodeId,
        msg.deltaX,
        msg.deltaY,
      );
      if (validationResult.isErr()) {
        const notificationResult = NotificationMessage.create(validationResult.error.message);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      const { nodeId, deltaX, deltaY } = validationResult.value;

      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        const notificationResult = NotificationMessage.create('Could not determine document ID');
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      // Get the current document to find which tree contains the node
      const document = await this.documentQueryService.getDocumentById(documentId);
      if (document.isErr()) {
        const errorMessage = `Failed to get document: ${document.error.message}`;
        const notificationResult = NotificationMessage.create(errorMessage);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      // Find the tree that contains this node
      const treeId = this.argumentOperations.findTreeForNode(document.value, nodeId);
      if (!treeId) {
        const notificationResult = NotificationMessage.create(
          'Could not find tree containing the node',
        );
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      const tree = document.value.trees[treeId];
      if (!tree) {
        const notificationResult = NotificationMessage.create('Tree not found');
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      // Calculate new position by adding delta to current position
      const newPosition = {
        x: tree.position.getX() + deltaX,
        y: tree.position.getY() + deltaY,
      };

      // Move the tree to the new position
      const moveResult = await this.proofApplicationService.moveTree({
        documentId,
        treeId,
        position: newPosition,
      });

      if (moveResult.isErr()) {
        const errorMessage = `Failed to move tree: ${moveResult.error.message}`;
        const notificationResult = NotificationMessage.create(errorMessage);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      const notificationResult = NotificationMessage.create('Node position updated successfully');
      if (notificationResult.isOk()) {
        this.uiPort.showInformation(notificationResult.value);
      }

      // Refresh content to show changes
      await this.refreshContent();
    } catch (error) {
      const errorMessage = `Failed to move node: ${error instanceof Error ? error.message : String(error)}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
    }
  }

  private async handleCreateBranchFromSelection(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = ProofTreeValidators.validateBranchInput(
        msg.sourceArgumentId,
        msg.selectedText,
        msg.position,
      );
      if (validationResult.isErr()) {
        const notificationResult = NotificationMessage.create(validationResult.error.message);
        if (notificationResult.isOk()) {
          this.uiPort.showError(notificationResult.value);
        }
        return;
      }

      const { sourceArgumentId, selectedText, position } = validationResult.value;

      await this.argumentOperations.createBranchFromSelection(
        sourceArgumentId,
        selectedText,
        position,
      );

      // Refresh content to show the new branch
      await this.refreshContent();
    } catch (error) {
      const errorMessage = `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`;
      const notificationResult = NotificationMessage.create(errorMessage);
      if (notificationResult.isOk()) {
        this.uiPort.showError(notificationResult.value);
      }
    }
  }
}
