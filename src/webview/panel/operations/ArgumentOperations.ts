import { err, ok, type Result } from 'neverthrow';
import type { CreateStatementCommand } from '../../../application/commands/statement-commands.js';
import type { IExportService } from '../../../application/ports/IExportService.js';
import type { IUIPort } from '../../../application/ports/IUIPort.js';
import type { DocumentDTO } from '../../../application/queries/document-queries.js';
import type { IDocumentIdService } from '../../../application/services/DocumentIdService.js';
import type { ProofApplicationService } from '../../../application/services/ProofApplicationService.js';
import { ValidationError } from '../../../domain/shared/result.js';
import type { BootstrapController } from '../../../presentation/controllers/BootstrapController.js';

/**
 * Handles argument-specific operations for ProofTreePanel
 */
export class ArgumentOperations {
  constructor(
    private readonly proofApplicationService: ProofApplicationService,
    private readonly bootstrapController: BootstrapController,
    private readonly exportService: IExportService,
    private readonly documentIdService: IDocumentIdService,
    private readonly uiPort: IUIPort,
    private readonly panelId: string,
    private readonly documentUri: string,
  ) {}

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
      this.uiPort.showError('Could not determine document ID');
      return err(new ValidationError('Could not determine document ID'));
    }

    // First create an empty bootstrap argument
    const createResult = await this.bootstrapController.createBootstrapArgument(documentId);
    if (createResult.isErr()) {
      this.uiPort.showError(createResult.error.message);
      return createResult;
    }

    const argumentId = createResult.value.data?.argumentId;
    if (!argumentId) {
      this.uiPort.showError('Failed to get argument ID from created argument');
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
      this.uiPort.showError(result.error.message);
      return result;
    }

    // Notify webview of success
    this.uiPort.postMessageToWebview(this.panelId, {
      type: 'argumentCreated',
      argumentId: result.value.data?.argumentId,
    });

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
      this.uiPort.showError('Could not determine document ID');
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
      this.uiPort.showError(result.error.message);
      return result;
    }

    // Notify webview of success
    this.uiPort.postMessageToWebview(this.panelId, {
      type: 'statementAdded',
      statementType,
      statementId: result.value.id,
      content: result.value.content,
    });

    // Show success message
    this.uiPort.showInformation(
      `${statementType === 'premise' ? 'Premise' : 'Conclusion'} added successfully`,
    );

    return result;
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
      this.uiPort.showError('Could not determine document ID');
      return err(new ValidationError('Could not determine document ID'));
    }

    const result = await this.proofApplicationService.updateStatement({
      documentId,
      statementId,
      content: newContent,
    });

    if (result.isErr()) {
      this.uiPort.showError(`Failed to update statement: ${result.error.message}`);
      return result;
    }

    this.uiPort.showInformation('Statement updated successfully');
    return result;
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
      this.uiPort.showError('Could not determine document ID');
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
      this.uiPort.showError(`Failed to update label: ${result.error.message}`);
      return result;
    }

    this.uiPort.showInformation('Label updated successfully');
    return result;
  }

  /**
   * Export proof to file
   */
  async exportProof(): Promise<Result<void, ValidationError>> {
    const documentId = this.extractDocumentIdFromUri();
    if (!documentId) {
      this.uiPort.showError('Could not determine document ID');
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
      {
        title: 'Select Export Format',
        placeHolder: 'Choose the format for exporting your proof',
      },
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
      this.uiPort.showError('Invalid export format selected');
      return err(new ValidationError('Invalid export format selected'));
    }

    // Export and save the document
    const exportResult = await this.exportService.saveToFile(documentId, {
      format: selectedFormat,
      includeMetadata: true,
      includeVisualization: selectedFormat === 'pdf' || selectedFormat === 'svg',
    });

    if (exportResult.isErr()) {
      this.uiPort.showError(`Export failed: ${exportResult.error.message}`);
      return exportResult;
    }

    // Show success message
    this.uiPort.showInformation(`Successfully exported proof to ${exportResult.value.filePath}`);

    // Post export completion message to webview
    this.uiPort.postMessageToWebview(this.panelId, {
      type: 'exportCompleted',
      format: selectedFormat,
      filePath: exportResult.value.filePath,
      success: exportResult.value.savedSuccessfully,
    });

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
      this.uiPort.showError('Could not determine document ID');
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
      this.uiPort.showError(`Failed to create branch: ${branchResult.error.message}`);
      return branchResult;
    }

    const newArgument = branchResult.value;

    // Notify webview of successful branch creation
    this.uiPort.postMessageToWebview(this.panelId, {
      type: 'branchCreated',
      newArgumentId: newArgument.id,
      sourceArgumentId,
      selectedText,
      position,
      premises: newArgument.premiseIds,
      conclusions: newArgument.conclusionIds,
    });

    this.uiPort.showInformation(
      `Successfully created ${position === 'conclusion' ? 'forward' : 'backward'} branch`,
    );

    return branchResult.map(() => undefined);
  }

  /**
   * Find which arguments contain a specific statement
   */
  findArgumentsContainingStatement(document: DocumentDTO, statementId: string): string[] {
    const argumentIds: string[] = [];
    for (const [argumentId, argument] of Object.entries(document.atomicArguments)) {
      if (
        argument.premiseIds.includes(statementId) ||
        argument.conclusionIds.includes(statementId)
      ) {
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
      // Check if this node is one of the root nodes
      if (tree.rootNodeIds.includes(nodeId)) {
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
