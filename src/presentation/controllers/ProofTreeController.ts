import { err, ok, type Result } from 'neverthrow';
import type {
  AtomicArgumentCreatedEvent,
  StatementCreatedEvent,
  StatementDeletedEvent,
  StatementUpdatedEvent,
} from '../../application/dtos/event-dtos.js';
import { mapToApplicationEvent } from '../../application/dtos/event-dtos.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { DomainEvent } from '../../domain/events/base-event.js';
import type { Disposable, EventBus } from '../../infrastructure/events/EventBus.js';

/**
 * Interface for tree view rendering - abstracts the actual UI implementation
 */
export interface ITreeViewRenderer {
  addStatement(statementId: string, content: string): Promise<void>;
  updateStatement(statementId: string, oldContent: string, newContent: string): Promise<void>;
  removeStatement(statementId: string): Promise<void>;
  highlightConnections(connections: Array<{ argumentId: string; role: string }>): Promise<void>;
  refreshTree(): Promise<void>;
  showConnectionVisualization(
    sharedStatementId: string,
    connectedArguments: string[],
  ): Promise<void>;
  clearHighlights(): Promise<void>;
}

/**
 * Presentation layer controller that reacts to domain events.
 * Handles UI updates in response to domain changes.
 * Uses UI abstraction for platform-independent operation.
 */
export class ProofTreeController {
  private subscriptions: Disposable[] = [];

  constructor(
    private readonly uiPort: IUIPort,
    private readonly eventBus?: EventBus,
    private readonly viewRenderer?: ITreeViewRenderer,
  ) {
    if (this.eventBus) {
      this.subscribeToEvents();
    }
  }

  /**
   * Show proof tree for document content - coordinate with UI layer
   */
  async showProofTreeForDocument(_content: string): Promise<Result<void, Error>> {
    try {
      // This replaces direct ProofTreePanel usage
      // No business logic here - just coordinate between UI and application layer

      // For now, show a status message
      this.uiPort.showInformation('Displaying proof tree visualization...');

      // Create webview panel using UI abstraction
      const _panel = this.uiPort.createWebviewPanel({
        id: 'proof-tree-view',
        title: 'Proof Tree',
        viewType: 'proofEditor.treeView',
        enableScripts: true,
        retainContextWhenHidden: true,
      });

      // Set up webview content (delegated to application layer in real implementation)
      // Application layer would handle actual tree rendering logic

      // Update the tree view if renderer is available
      if (this.viewRenderer) {
        await this.viewRenderer.refreshTree();
      }

      return ok(undefined);
    } catch (error) {
      this.uiPort.showError('Failed to display proof tree');
      // Error: ProofTreeController.showProofTreeForDocument
      return err(error as Error);
    }
  }

  /**
   * Convert DomainEvent to ApplicationEvent format
   */
  private convertToApplicationEvent(domainEvent: DomainEvent) {
    return mapToApplicationEvent({
      eventType: domainEvent.eventType,
      aggregateId: domainEvent.aggregateId,
      eventData: domainEvent.eventData,
      timestamp: domainEvent.occurredAt?.getValue() || Date.now(),
    });
  }

  /**
   * Subscribe to all relevant domain events
   */
  private subscribeToEvents(): void {
    if (!this.eventBus) {
      return;
    }

    // React to statement changes
    this.subscriptions.push(
      this.eventBus?.subscribe('StatementCreated', async (event) => {
        const appEvent = this.convertToApplicationEvent(event) as unknown as StatementCreatedEvent;
        await this.handleStatementCreated(appEvent);
      }),
    );

    this.subscriptions.push(
      this.eventBus?.subscribe('StatementUpdated', async (event) => {
        const appEvent = this.convertToApplicationEvent(event) as unknown as StatementUpdatedEvent;
        await this.handleStatementUpdated(appEvent);
      }),
    );

    this.subscriptions.push(
      this.eventBus?.subscribe('StatementDeleted', async (event) => {
        const appEvent = this.convertToApplicationEvent(event) as unknown as StatementDeletedEvent;
        await this.handleStatementDeleted(appEvent);
      }),
    );

    // Note: OrderedSetBecameShared events are obsolete in Statement-level paradigm
    // Connections are now tracked through direct statement references

    // React to argument changes
    this.subscriptions.push(
      this.eventBus?.subscribe('AtomicArgumentCreated', async (event) => {
        const appEvent = this.convertToApplicationEvent(
          event,
        ) as unknown as AtomicArgumentCreatedEvent;
        await this.handleArgumentCreated(appEvent);
      }),
    );
  }

  /**
   * Handle StatementCreated events
   */
  private async handleStatementCreated(event: StatementCreatedEvent): Promise<void> {
    try {
      // Update view with new statement
      if (this.viewRenderer) {
        await this.viewRenderer.addStatement(event.eventData.statementId, event.eventData.content);
      }
    } catch (_error) {
      // Error handling StatementCreated event
    }
  }

  /**
   * Handle StatementUpdated events
   */
  private async handleStatementUpdated(event: StatementUpdatedEvent): Promise<void> {
    try {
      // Update statement content in view
      if (this.viewRenderer) {
        await this.viewRenderer.updateStatement(
          event.eventData.statementId,
          event.eventData.oldContent,
          event.eventData.newContent,
        );
      }
    } catch (_error) {
      // Error handling StatementUpdated event
    }
  }

  /**
   * Handle StatementDeleted events
   */
  private async handleStatementDeleted(event: StatementDeletedEvent): Promise<void> {
    try {
      // Remove statement from view
      if (this.viewRenderer) {
        await this.viewRenderer.removeStatement(event.eventData.statementId);
      }
    } catch (_error) {
      // Error handling StatementDeleted event
    }
  }

  /**
   * Handle statement connections in the new paradigm
   */
  private async handleStatementConnection(
    statementId: string,
    connectedArguments: string[],
  ): Promise<void> {
    try {
      if (!this.viewRenderer) {
        return;
      }

      // Highlight shared connections
      const connections = connectedArguments.map((argumentId) => {
        return { argumentId, role: 'statement-connection' };
      });

      await this.viewRenderer.highlightConnections(connections);

      // Show connection visualization
      await this.viewRenderer.showConnectionVisualization(statementId, connectedArguments);
    } catch (_error) {
      // Error handling statement connection visualization
    }
  }

  /**
   * Handle AtomicArgumentCreated events
   */
  private async handleArgumentCreated(_event: AtomicArgumentCreatedEvent): Promise<void> {
    try {
      // Update tree structure - this might be a significant change
      if (this.viewRenderer) {
        await this.viewRenderer.refreshTree();
      }
    } catch (_error) {
      // Error handling AtomicArgumentCreated event
    }
  }

  /**
   * Manually refresh the entire view (useful for initialization)
   */
  async refresh(): Promise<void> {
    try {
      if (this.viewRenderer) {
        await this.viewRenderer.refreshTree();
      }
    } catch (_error) {
      // Error refreshing tree view
    }
  }

  /**
   * Clear all visual highlights
   */
  async clearHighlights(): Promise<void> {
    try {
      if (this.viewRenderer) {
        await this.viewRenderer.clearHighlights();
      }
    } catch (_error) {
      // Error clearing highlights
    }
  }

  /**
   * Get subscription count for debugging
   */
  getSubscriptionCount(): number {
    return this.subscriptions.length;
  }

  /**
   * Check if controller is properly initialized
   */
  isInitialized(): boolean {
    return this.subscriptions.length > 0;
  }

  /**
   * Clean up all subscriptions when controller is no longer needed
   */
  dispose(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach((sub) => sub.dispose());
    this.subscriptions = [];
  }
}

/**
 * Mock renderer for testing purposes
 */
export class MockTreeViewRenderer implements ITreeViewRenderer {
  public readonly operations: Array<{
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
  }> = [];

  async addStatement(statementId: string, content: string): Promise<void> {
    this.operations.push({
      type: 'addStatement',
      data: { statementId, content },
      timestamp: Date.now(),
    });
  }

  async updateStatement(
    statementId: string,
    oldContent: string,
    newContent: string,
  ): Promise<void> {
    this.operations.push({
      type: 'updateStatement',
      data: { statementId, oldContent, newContent },
      timestamp: Date.now(),
    });
  }

  async removeStatement(statementId: string): Promise<void> {
    this.operations.push({
      type: 'removeStatement',
      data: { statementId },
      timestamp: Date.now(),
    });
  }

  async highlightConnections(
    connections: Array<{ argumentId: string; role: string }>,
  ): Promise<void> {
    this.operations.push({
      type: 'highlightConnections',
      data: { connections },
      timestamp: Date.now(),
    });
  }

  async refreshTree(): Promise<void> {
    this.operations.push({
      type: 'refreshTree',
      data: {},
      timestamp: Date.now(),
    });
  }

  async showConnectionVisualization(
    sharedStatementId: string,
    connectedArguments: string[],
  ): Promise<void> {
    this.operations.push({
      type: 'showConnectionVisualization',
      data: { sharedStatementId, connectedArguments },
      timestamp: Date.now(),
    });
  }

  async clearHighlights(): Promise<void> {
    this.operations.push({
      type: 'clearHighlights',
      data: {},
      timestamp: Date.now(),
    });
  }

  /**
   * Get the last operation of a specific type
   */
  getLastOperation(
    type: string,
  ): { type: string; data: Record<string, unknown>; timestamp: number } | undefined {
    return this.operations.filter((op) => op.type === type).pop();
  }

  /**
   * Get all operations of a specific type
   */
  getOperations(
    type: string,
  ): Array<{ type: string; data: Record<string, unknown>; timestamp: number }> {
    return this.operations.filter((op) => op.type === type);
  }

  /**
   * Clear all recorded operations
   */
  clear(): void {
    this.operations.length = 0;
  }
}
