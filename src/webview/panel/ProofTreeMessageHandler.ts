import { err, ok, type Result } from 'neverthrow';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import { ValidationError } from '../../domain/shared/result.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { TreeRenderer } from '../TreeRenderer.js';
import type { ArgumentOperations } from './operations/ArgumentOperations.js';
import type { ProofTreeStateManager } from './ProofTreeStateManager.js';
import { ProofTreeValidators } from './validation/ProofTreeValidators.js';

/**
 * Handles all message passing between webview and extension for ProofTreePanel
 */
export class ProofTreeMessageHandler {
  constructor(
    private readonly panelId: string,
    private readonly documentUri: string,
    private readonly uiPort: IUIPort,
    private readonly visualizationService: ProofVisualizationService,
    private readonly documentQueryService: DocumentQueryService,
    private readonly renderer: TreeRenderer,
    private readonly stateManager: ProofTreeStateManager,
    private readonly argumentOperations: ArgumentOperations,
    private readonly proofApplicationService: ProofApplicationService,
    private readonly yamlSerializer: YAMLSerializer,
  ) {}

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
        case 'panelStateChanged':
        case 'selectionChanged':
          await this.stateManager.handleViewStateUpdate(msg.type, msg);
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
          this.uiPort.showError(errorMessage);
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
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'updateTree',
        content: svgContent,
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
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'showError',
        content: errorContent,
      });

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
      this.uiPort.postMessageToWebview(this.panelId, {
        type: 'updateTree',
        content: svgContent,
      });
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
        this.uiPort.showError(validationResult.error.message);
        return;
      }

      const result = await this.argumentOperations.createArgument(premises, conclusions, ruleName);
      if (result.isErr()) {
        return;
      }

      // Refresh the content to show the new argument
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to create argument: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleAddStatement(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const statementType = msg.statementType as 'premise' | 'conclusion';
      const content = msg.content as string;

      const contentValidation = ProofTreeValidators.validateStatementContent(content);
      if (contentValidation.isErr()) {
        this.uiPort.showError(contentValidation.error.message);
        return;
      }

      const result = await this.argumentOperations.addStatement(
        statementType,
        contentValidation.value,
      );
      if (result.isErr()) {
        return;
      }

      // Refresh the content to show the new statement
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to add statement: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleExportProof(): Promise<void> {
    try {
      await this.argumentOperations.exportProof();
    } catch (error) {
      this.uiPort.showError(
        `Failed to export proof: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleEditContent(msg: { [key: string]: unknown }): Promise<void> {
    try {
      const validationResult = ProofTreeValidators.validateEditContentMetadata(
        msg.metadata,
        msg.newContent,
      );
      if (validationResult.isErr()) {
        this.uiPort.showError(validationResult.error.message);
        return;
      }

      const { metadata, newContent } = validationResult.value;

      if (metadata.type === 'statement' && metadata.statementId) {
        await this.argumentOperations.updateStatementContent(metadata.statementId, newContent);
      } else if (metadata.type === 'label' && metadata.nodeId) {
        await this.argumentOperations.updateArgumentLabel(
          metadata.nodeId,
          metadata.labelType || 'left',
          newContent,
        );
      }

      // Refresh content to show changes
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to edit content: ${error instanceof Error ? error.message : String(error)}`,
      );
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
        this.uiPort.showError(validationResult.error.message);
        return;
      }

      const { sourceData, targetStatementId } = validationResult.value;

      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      // Get the current document to find ordered sets
      const document = await this.documentQueryService.getDocumentById(documentId);
      if (document.isErr()) {
        this.uiPort.showError(`Failed to get document: ${document.error.message}`);
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
        this.uiPort.showError('Could not find source statement in any argument');
        return;
      }

      if (targetArgumentIds.length === 0) {
        this.uiPort.showError('Could not find target statement in any argument');
        return;
      }

      // Check if they share any common arguments
      const sharedArguments = sourceArgumentIds.filter((id) => targetArgumentIds.includes(id));
      if (sharedArguments.length > 0) {
        this.uiPort.showInformation(
          'Statement reordering within the same argument is not yet implemented',
        );
        await this.refreshContent();
        return;
      }

      // TODO: Implement statement movement after OrderedSet elimination
      // This functionality needs to be redesigned to work with direct statement references
      this.uiPort.showError('Statement movement is not yet implemented after OrderedSet removal');
      return;
    } catch (error) {
      this.uiPort.showError(
        `Failed to move statement: ${error instanceof Error ? error.message : String(error)}`,
      );
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
        this.uiPort.showError(validationResult.error.message);
        return;
      }

      const { nodeId, deltaX, deltaY } = validationResult.value;

      const documentId = this.extractDocumentIdFromUri();
      if (!documentId) {
        this.uiPort.showError('Could not determine document ID');
        return;
      }

      // Get the current document to find which tree contains the node
      const document = await this.documentQueryService.getDocumentById(documentId);
      if (document.isErr()) {
        this.uiPort.showError(`Failed to get document: ${document.error.message}`);
        return;
      }

      // Find the tree that contains this node
      const treeId = this.argumentOperations.findTreeForNode(document.value, nodeId);
      if (!treeId) {
        this.uiPort.showError('Could not find tree containing the node');
        return;
      }

      const tree = document.value.trees[treeId];
      if (!tree) {
        this.uiPort.showError('Tree not found');
        return;
      }

      // Calculate new position by adding delta to current position
      const newPosition = {
        x: tree.position.x + deltaX,
        y: tree.position.y + deltaY,
      };

      // Move the tree to the new position
      const moveResult = await this.proofApplicationService.moveTree({
        documentId,
        treeId,
        position: newPosition,
      });

      if (moveResult.isErr()) {
        this.uiPort.showError(`Failed to move tree: ${moveResult.error.message}`);
        return;
      }

      this.uiPort.showInformation('Node position updated successfully');

      // Refresh content to show changes
      await this.refreshContent();
    } catch (error) {
      this.uiPort.showError(
        `Failed to move node: ${error instanceof Error ? error.message : String(error)}`,
      );
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
        this.uiPort.showError(validationResult.error.message);
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
      this.uiPort.showError(
        `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
