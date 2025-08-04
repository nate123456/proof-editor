import type { DomainEvent, DomainEventHandler } from '../../domain/events/base-event.js';
import type {
  AtomicArgumentCreated,
  AtomicArgumentDeleted,
  AtomicArgumentUpdated,
  StatementCreated,
  StatementDeleted,
} from '../../domain/events/proof-document-events.js';

/**
 * Tracks statement usage counts across the document.
 * This is a read model that gets updated by domain events.
 */
export class StatementUsageTracker {
  private usageCounts = new Map<string, number>();
  private statementContent = new Map<string, string>();

  /**
   * Handle StatementCreated events
   */
  handleStatementCreated(event: StatementCreated): void {
    try {
      const statementId = event.eventData.statementId.getValue();
      this.usageCounts.set(statementId, 0);
      this.statementContent.set(statementId, event.eventData.content.getValue());
    } catch (_error) {
      // Silently ignore errors in event handlers to prevent cascading failures
      // Event handlers should be resilient to malformed data
    }
  }

  /**
   * Handle StatementDeleted events
   */
  handleStatementDeleted(event: StatementDeleted): void {
    try {
      const statementId = event.eventData.statementId.getValue();
      this.usageCounts.delete(statementId);
      this.statementContent.delete(statementId);
    } catch (_error) {
      // Silently ignore errors in event handlers to prevent cascading failures
      // Event handlers should be resilient to malformed data
    }
  }

  /**
   * Handle AtomicArgumentCreated events to increment usage counts
   */
  handleAtomicArgumentCreated(event: AtomicArgumentCreated): void {
    try {
      const premiseIds = event.eventData.premiseIds || [];
      const conclusionIds = event.eventData.conclusionIds || [];
      const allStatementIds = [...premiseIds, ...conclusionIds];

      for (const statementId of allStatementIds) {
        // Get the string value from the StatementId object
        const id = statementId.getValue();
        const current = this.usageCounts.get(id) || 0;
        this.usageCounts.set(id, current + 1);
      }
    } catch (_error) {
      // Silently ignore errors in event handlers to prevent cascading failures
      // Event handlers should be resilient to malformed data
    }
  }

  /**
   * Handle AtomicArgumentDeleted events to decrement usage counts
   */
  handleAtomicArgumentDeleted(event: AtomicArgumentDeleted): void {
    try {
      const premiseIds = event.eventData.premiseIds || [];
      const conclusionIds = event.eventData.conclusionIds || [];
      const allStatementIds = [...premiseIds, ...conclusionIds];

      for (const statementId of allStatementIds) {
        const id = statementId.getValue();
        const current = this.usageCounts.get(id) || 0;
        this.usageCounts.set(id, Math.max(0, current - 1));
      }
    } catch (_error) {
      // Silently ignore errors in event handlers to prevent cascading failures
      // Event handlers should be resilient to malformed data
    }
  }

  /**
   * Handle AtomicArgumentUpdated events to update usage counts
   */
  handleAtomicArgumentUpdated(_event: AtomicArgumentUpdated): void {
    // For simplicity, we'll treat updates as delete + create
    // In a real system, we'd need the old statement IDs to properly update counts
    // This is a limitation of the current event design
  }

  /**
   * Get usage count for a specific statement
   */
  getUsageCount(statementId: string): number {
    return this.usageCounts.get(statementId) || 0;
  }

  /**
   * Get content for a specific statement
   */
  getStatementContent(statementId: string): string | undefined {
    return this.statementContent.get(statementId);
  }

  /**
   * Get all unused statements (usage count = 0)
   */
  getUnusedStatements(): Array<{ id: string; content: string }> {
    const unused: Array<{ id: string; content: string }> = [];

    for (const [statementId, count] of this.usageCounts.entries()) {
      if (count === 0) {
        const content = this.statementContent.get(statementId);
        if (content) {
          unused.push({ id: statementId, content });
        }
      }
    }

    return unused;
  }

  /**
   * Get statements with highest usage counts
   */
  getMostUsedStatements(limit = 10): Array<{
    id: string;
    content: string;
    usageCount: number;
  }> {
    const statements: Array<{
      id: string;
      content: string;
      usageCount: number;
    }> = [];

    for (const [statementId, count] of this.usageCounts.entries()) {
      const content = this.statementContent.get(statementId);
      if (content && count > 0) {
        statements.push({
          id: statementId,
          content,
          usageCount: count,
        });
      }
    }

    return statements.sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    totalStatements: number;
    usedStatements: number;
    unusedStatements: number;
    averageUsage: number;
    maxUsage: number;
    totalUsages: number;
  } {
    const totalStatements = this.usageCounts.size;
    let usedStatements = 0;
    let totalUsages = 0;
    let maxUsage = 0;

    for (const count of this.usageCounts.values()) {
      if (count > 0) {
        usedStatements++;
      }
      totalUsages += count;
      maxUsage = Math.max(maxUsage, count);
    }

    return {
      totalStatements,
      usedStatements,
      unusedStatements: totalStatements - usedStatements,
      averageUsage: totalStatements > 0 ? totalUsages / totalStatements : 0,
      maxUsage,
      totalUsages,
    };
  }

  /**
   * Check if a statement is used
   */
  isStatementUsed(statementId: string): boolean {
    return (this.usageCounts.get(statementId) || 0) > 0;
  }

  /**
   * Find statements by content pattern
   */
  findStatementsByContent(pattern: string): Array<{
    id: string;
    content: string;
    usageCount: number;
  }> {
    const matches: Array<{
      id: string;
      content: string;
      usageCount: number;
    }> = [];

    const lowerPattern = pattern.toLowerCase();

    for (const [statementId, content] of this.statementContent.entries()) {
      if (content.toLowerCase().includes(lowerPattern)) {
        matches.push({
          id: statementId,
          content,
          usageCount: this.usageCounts.get(statementId) || 0,
        });
      }
    }

    return matches.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get all statements with their usage counts
   */
  getAllStatementsWithUsage(): Array<{
    id: string;
    content: string;
    usageCount: number;
  }> {
    const statements: Array<{
      id: string;
      content: string;
      usageCount: number;
    }> = [];

    for (const [statementId, content] of this.statementContent.entries()) {
      statements.push({
        id: statementId,
        content,
        usageCount: this.usageCounts.get(statementId) || 0,
      });
    }

    return statements.sort((a, b) => a.content.localeCompare(b.content));
  }

  /**
   * Clear all tracked usage data (useful for testing)
   */
  clear(): void {
    this.usageCounts.clear();
    this.statementContent.clear();
  }

  /**
   * Export usage data for persistence or analysis
   */
  export(): {
    usageCounts: Record<string, number>;
    statementContent: Record<string, string>;
  } {
    return {
      usageCounts: Object.fromEntries(this.usageCounts),
      statementContent: Object.fromEntries(this.statementContent),
    };
  }

  /**
   * Import usage data from persistence
   */
  import(data: {
    usageCounts: Record<string, number>;
    statementContent: Record<string, string>;
  }): void {
    this.usageCounts = new Map(Object.entries(data.usageCounts));
    this.statementContent = new Map(Object.entries(data.statementContent));
  }
}

/**
 * Multi-event handler that implements DomainEventHandler for each event type
 */
export class StatementUsageEventHandler
  implements
    DomainEventHandler<
      | StatementCreated
      | StatementDeleted
      | AtomicArgumentCreated
      | AtomicArgumentDeleted
      | AtomicArgumentUpdated
    >
{
  constructor(private readonly tracker: StatementUsageTracker) {}

  handle(
    event:
      | StatementCreated
      | StatementDeleted
      | AtomicArgumentCreated
      | AtomicArgumentDeleted
      | AtomicArgumentUpdated,
  ): void {
    switch (event.eventType) {
      case 'StatementCreated':
        this.tracker.handleStatementCreated(event as StatementCreated);
        break;
      case 'StatementDeleted':
        this.tracker.handleStatementDeleted(event as StatementDeleted);
        break;
      case 'AtomicArgumentCreated':
        this.tracker.handleAtomicArgumentCreated(event as AtomicArgumentCreated);
        break;
      case 'AtomicArgumentDeleted':
        this.tracker.handleAtomicArgumentDeleted(event as AtomicArgumentDeleted);
        break;
      case 'AtomicArgumentUpdated':
        this.tracker.handleAtomicArgumentUpdated(event as AtomicArgumentUpdated);
        break;
    }
  }

  canHandle(
    event: DomainEvent,
  ): event is
    | StatementCreated
    | StatementDeleted
    | AtomicArgumentCreated
    | AtomicArgumentDeleted
    | AtomicArgumentUpdated {
    return [
      'StatementCreated',
      'StatementDeleted',
      'AtomicArgumentCreated',
      'AtomicArgumentDeleted',
      'AtomicArgumentUpdated',
    ].includes(event.eventType);
  }
}
