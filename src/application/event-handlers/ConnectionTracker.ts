import type { DomainEvent, DomainEventHandler } from '../../domain/events/base-event.js';
import type { AtomicArgumentCreated } from '../../domain/events/proof-construction-events.js';

/**
 * Tracks connections between atomic arguments via shared Statements.
 * This is a read model that gets updated by domain events.
 * In the Statement-level paradigm, connections are established through Statement identity.
 */
export class ConnectionTracker implements DomainEventHandler<AtomicArgumentCreated> {
  private argumentStatements = new Map<string, { premises: string[]; conclusions: string[] }>();

  /**
   * Handle AtomicArgumentCreated events to track potential connections
   */
  handle(event: AtomicArgumentCreated): void {
    this.argumentStatements.set(event.argumentId.getValue(), {
      premises: event.premiseIds.map((id) => id.getValue()),
      conclusions: event.conclusionIds.map((id) => id.getValue()),
    });
  }

  /**
   * Type guard to determine if this handler can process the event
   */
  canHandle(event: DomainEvent): event is AtomicArgumentCreated {
    return event.eventType === 'AtomicArgumentCreated';
  }

  /**
   * Find all arguments that share statements with the given argument
   */
  findConnectedArguments(argumentId: string): Array<{
    argumentId: string;
    sharedStatements: string[];
    connectionType: 'premise-to-conclusion' | 'conclusion-to-premise' | 'bidirectional';
  }> {
    const targetArg = this.argumentStatements.get(argumentId);
    if (!targetArg) return [];

    const connected: Array<{
      argumentId: string;
      sharedStatements: string[];
      connectionType: 'premise-to-conclusion' | 'conclusion-to-premise' | 'bidirectional';
    }> = [];

    for (const [otherArgId, otherArg] of this.argumentStatements.entries()) {
      if (otherArgId === argumentId) continue;

      const premiseToConclusion = targetArg.conclusions.filter((c) =>
        otherArg.premises.includes(c),
      );
      const conclusionToPremise = targetArg.premises.filter((p) =>
        otherArg.conclusions.includes(p),
      );

      if (premiseToConclusion.length > 0 || conclusionToPremise.length > 0) {
        const allShared = [...premiseToConclusion, ...conclusionToPremise];
        const connectionType =
          premiseToConclusion.length > 0 && conclusionToPremise.length > 0
            ? 'bidirectional'
            : premiseToConclusion.length > 0
              ? 'premise-to-conclusion'
              : 'conclusion-to-premise';

        connected.push({
          argumentId: otherArgId,
          sharedStatements: allShared,
          connectionType,
        });
      }
    }

    return connected;
  }

  /**
   * Get all arguments that use a specific statement
   */
  getArgumentsUsingStatement(statementId: string): Array<{
    argumentId: string;
    usage: 'premise' | 'conclusion' | 'both';
  }> {
    const users: Array<{
      argumentId: string;
      usage: 'premise' | 'conclusion' | 'both';
    }> = [];

    for (const [argId, arg] of this.argumentStatements.entries()) {
      const inPremises = arg.premises.includes(statementId);
      const inConclusions = arg.conclusions.includes(statementId);

      if (inPremises || inConclusions) {
        users.push({
          argumentId: argId,
          usage: inPremises && inConclusions ? 'both' : inPremises ? 'premise' : 'conclusion',
        });
      }
    }

    return users;
  }

  /**
   * Check if a statement is shared between multiple arguments
   */
  isStatementShared(statementId: string): boolean {
    return this.getArgumentsUsingStatement(statementId).length > 1;
  }

  /**
   * Clear all tracked connections (useful for testing)
   */
  clear(): void {
    this.argumentStatements.clear();
  }

  /**
   * Get summary statistics about connections
   */
  getConnectionStats(): {
    totalArguments: number;
    totalConnectedArguments: number;
    totalSharedStatements: number;
    averageConnectionsPerArgument: number;
  } {
    const totalArguments = this.argumentStatements.size;
    const connectedArgs = new Set<string>();
    const sharedStatements = new Set<string>();

    let totalConnections = 0;

    for (const [argId] of this.argumentStatements.entries()) {
      const connections = this.findConnectedArguments(argId);
      if (connections.length > 0) {
        connectedArgs.add(argId);
        totalConnections += connections.length;

        for (const conn of connections) {
          conn.sharedStatements.forEach((s) => sharedStatements.add(s));
        }
      }
    }

    return {
      totalArguments,
      totalConnectedArguments: connectedArgs.size,
      totalSharedStatements: sharedStatements.size,
      averageConnectionsPerArgument: totalArguments > 0 ? totalConnections / totalArguments : 0,
    };
  }
}
