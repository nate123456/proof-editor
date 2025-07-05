import { err, ok, type Result } from 'neverthrow';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import { OrderedSet } from '../entities/OrderedSet.js';
import { Statement } from '../entities/Statement.js';
import { AggregateRoot } from '../events/base-event.js';
import {
  AtomicArgumentCreated,
  AtomicArgumentDeleted,
  AtomicArgumentUpdated,
  OrderedSetBecameShared,
  OrderedSetCreated,
  OrderedSetDeleted,
  ProofDocumentCreated,
  StatementCreated,
  StatementDeleted,
  StatementUpdated,
} from '../events/proof-document-events.js';
import { ValidationError } from '../shared/result.js';
import {
  AtomicArgumentId,
  OrderedSetId,
  ProofDocumentId,
  StatementId,
} from '../shared/value-objects.js';

// Types for connection discovery and validation
export interface SharedOrderedSet {
  orderedSet: OrderedSet;
  usages: Array<{
    argumentId: string;
    role: 'premise' | 'conclusion';
  }>;
}

export interface ArgumentConnection {
  type: 'provides' | 'consumes';
  fromId: AtomicArgumentId;
  toId: AtomicArgumentId;
  viaOrderedSetId: OrderedSetId;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  cycles: ArgumentCycle[];
  orphans: AtomicArgumentId[];
  inconsistencies: ConnectionInconsistency[];
}

export interface ArgumentCycle {
  path: AtomicArgumentId[];
  severity: 'low' | 'medium' | 'high';
}

export interface ConnectionInconsistency {
  type: 'missing_premise' | 'dangling_conclusion' | 'type_mismatch';
  argumentId: AtomicArgumentId;
  details: string;
}

export interface DocumentStats {
  statementCount: number;
  orderedSetCount: number;
  argumentCount: number;
  sharedOrderedSetCount: number;
}

export class ProofDocument extends AggregateRoot {
  private statements: Map<string, Statement> = new Map();
  private orderedSets: Map<string, OrderedSet> = new Map();
  private orderedSetRegistry: Map<string, Set<string>> = new Map(); // Tracks usage
  private atomicArguments: Map<string, AtomicArgument> = new Map();
  private version: number = 0;
  private modifiedAt: Date;

  private constructor(
    private readonly id: ProofDocumentId,
    private readonly createdAt: Date,
  ) {
    super();
    this.modifiedAt = createdAt;
  }

  static create(): ProofDocument {
    const doc = new ProofDocument(ProofDocumentId.generate(), new Date());

    doc.addDomainEvent(
      new ProofDocumentCreated(doc.id.getValue(), { createdAt: doc.createdAt.getTime() }),
    );

    return doc;
  }

  static createBootstrap(id: ProofDocumentId): Result<ProofDocument, ValidationError> {
    const doc = new ProofDocument(id, new Date());

    doc.addDomainEvent(
      new ProofDocumentCreated(doc.id.getValue(), { createdAt: doc.createdAt.getTime() }),
    );

    return ok(doc);
  }

  static reconstruct(data: {
    id: string;
    version: number;
    createdAt: Date;
    modifiedAt: Date;
    statements: Record<string, string>;
    orderedSets: Record<string, string[]>;
    atomicArguments: Record<
      string,
      {
        premises: string | null;
        conclusions: string | null;
        sideLabel?: string;
      }
    >;
    trees: Record<
      string,
      {
        offset: { x: number; y: number };
        nodes: Record<string, unknown>;
      }
    >;
  }): Result<ProofDocument, ValidationError> {
    const idResult = ProofDocumentId.create(data.id);
    if (idResult.isErr()) {
      return err(idResult.error);
    }

    const doc = new ProofDocument(idResult.value, data.createdAt);
    doc.version = data.version;
    doc.modifiedAt = data.modifiedAt;

    // Reconstruct statements
    for (const [id, content] of Object.entries(data.statements)) {
      const statementIdResult = StatementId.create(id);
      if (statementIdResult.isErr()) {
        return err(statementIdResult.error);
      }

      const statement = Statement.create(content);
      if (statement.isErr()) {
        return err(statement.error);
      }

      doc.statements.set(statementIdResult.value.getValue(), statement.value);
    }

    // Reconstruct ordered sets
    for (const [id, statementIds] of Object.entries(data.orderedSets)) {
      const orderedSetIdResult = OrderedSetId.create(id);
      if (orderedSetIdResult.isErr()) {
        return err(orderedSetIdResult.error);
      }

      const statementIdResults = statementIds.map((sid) => StatementId.create(sid));
      for (const result of statementIdResults) {
        if (result.isErr()) {
          return err(result.error);
        }
      }

      const validStatementIds = statementIdResults.map((r) => {
        if (r.isErr()) {
          throw new Error('This should not happen as we checked errors above');
        }
        return r.value;
      });

      const orderedSet = OrderedSet.create(validStatementIds);
      if (orderedSet.isErr()) {
        return err(orderedSet.error);
      }

      doc.orderedSets.set(orderedSetIdResult.value.getValue(), orderedSet.value);
      doc.orderedSetRegistry.set(orderedSetIdResult.value.getValue(), new Set());
    }

    // Reconstruct atomic arguments
    for (const [id, argData] of Object.entries(data.atomicArguments)) {
      const argumentIdResult = AtomicArgumentId.create(id);
      if (argumentIdResult.isErr()) {
        return err(argumentIdResult.error);
      }

      const premiseSetId = argData.premises ? OrderedSetId.create(argData.premises) : null;
      const conclusionSetId = argData.conclusions ? OrderedSetId.create(argData.conclusions) : null;

      if (premiseSetId?.isErr()) {
        return err(premiseSetId.error);
      }
      if (conclusionSetId?.isErr()) {
        return err(conclusionSetId.error);
      }

      const validPremiseSetId = premiseSetId?.isOk() ? premiseSetId.value : undefined;
      const validConclusionSetId = conclusionSetId?.isOk() ? conclusionSetId.value : undefined;

      const argument = AtomicArgument.create(validPremiseSetId, validConclusionSetId);
      if (argument.isErr()) {
        return err(argument.error);
      }

      if (argData.sideLabel) {
        const labelResult = argument.value.updateSideLabels({ left: argData.sideLabel });
        if (labelResult.isErr()) {
          return err(labelResult.error);
        }
      }

      doc.atomicArguments.set(argumentIdResult.value.getValue(), argument.value);

      // Register usage
      if (validPremiseSetId) {
        doc.registerOrderedSetUsage(validPremiseSetId, argumentIdResult.value, 'premise');
      }
      if (validConclusionSetId) {
        doc.registerOrderedSetUsage(validConclusionSetId, argumentIdResult.value, 'conclusion');
      }
    }

    // Note: Tree reconstruction would be handled by ProofTreeAggregateRepository
    // We don't reconstruct trees here as they're stored in a separate aggregate

    return ok(doc);
  }

  // Statement operations
  createStatement(content: string): Result<Statement, ValidationError> {
    const statement = Statement.create(content);
    if (statement.isErr()) {
      return err(statement.error);
    }

    this.statements.set(statement.value.getId().getValue(), statement.value);
    this.incrementVersion();

    this.addDomainEvent(
      new StatementCreated(this.id.getValue(), {
        statementId: statement.value.getId().getValue(),
        content: statement.value.getContent(),
      }),
    );

    return ok(statement.value);
  }

  updateStatement(id: StatementId, content: string): Result<Statement, ValidationError> {
    const existing = this.statements.get(id.getValue());
    if (!existing) {
      return err(new ValidationError('Statement not found'));
    }

    // Check if statement is used in any OrderedSet
    if (this.isStatementInUse(id)) {
      return err(new ValidationError('Cannot update statement that is in use'));
    }

    const oldContent = existing.getContent();
    const updateResult = existing.updateContent(content);
    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    this.incrementVersion();

    this.addDomainEvent(
      new StatementUpdated(this.id.getValue(), {
        statementId: id.getValue(),
        oldContent,
        newContent: content,
      }),
    );

    return ok(existing);
  }

  deleteStatement(id: StatementId): Result<void, ValidationError> {
    const existing = this.statements.get(id.getValue());
    if (!existing) {
      return err(new ValidationError('Statement not found'));
    }

    if (this.isStatementInUse(id)) {
      return err(new ValidationError('Cannot delete statement that is in use'));
    }

    this.statements.delete(id.getValue());
    this.incrementVersion();

    this.addDomainEvent(
      new StatementDeleted(this.id.getValue(), {
        statementId: id.getValue(),
        content: existing.getContent(),
      }),
    );

    return ok(undefined);
  }

  // OrderedSet operations - Critical for connections!
  createOrderedSet(statementIds: StatementId[]): Result<OrderedSet, ValidationError> {
    // Validate all statements exist
    for (const stmtId of statementIds) {
      if (!this.statements.has(stmtId.getValue())) {
        return err(new ValidationError(`Statement ${stmtId.getValue()} not found`));
      }
    }

    // Check if identical OrderedSet already exists
    const existing = this.findOrderedSetByContent(statementIds);
    if (existing) {
      return ok(existing); // Return existing to maintain identity
    }

    const orderedSet = OrderedSet.create(statementIds);
    if (orderedSet.isErr()) {
      return err(orderedSet.error);
    }

    this.orderedSets.set(orderedSet.value.getId().getValue(), orderedSet.value);
    this.orderedSetRegistry.set(orderedSet.value.getId().getValue(), new Set());
    this.incrementVersion();

    this.addDomainEvent(
      new OrderedSetCreated(this.id.getValue(), {
        orderedSetId: orderedSet.value.getId().getValue(),
        statementIds: statementIds.map((id) => id.getValue()),
      }),
    );

    return ok(orderedSet.value);
  }

  deleteOrderedSet(id: OrderedSetId): Result<void, ValidationError> {
    const existing = this.orderedSets.get(id.getValue());
    if (!existing) {
      return err(new ValidationError('OrderedSet not found'));
    }

    if (existing.isReferencedByAtomicArguments()) {
      return err(
        new ValidationError('Cannot delete OrderedSet that is referenced by atomic arguments'),
      );
    }

    this.orderedSets.delete(id.getValue());
    this.orderedSetRegistry.delete(id.getValue());
    this.incrementVersion();

    this.addDomainEvent(
      new OrderedSetDeleted(this.id.getValue(), {
        orderedSetId: id.getValue(),
        statementIds: existing.getStatementIds().map((id) => id.getValue()),
      }),
    );

    return ok(undefined);
  }

  // Create atomic argument and track OrderedSet usage
  createAtomicArgument(
    premiseSet: OrderedSet | null,
    conclusionSet: OrderedSet | null,
  ): Result<AtomicArgument, ValidationError> {
    // Validate OrderedSets belong to this document
    if (premiseSet && !this.orderedSets.has(premiseSet.getId().getValue())) {
      return err(new ValidationError('Premise OrderedSet not in document'));
    }
    if (conclusionSet && !this.orderedSets.has(conclusionSet.getId().getValue())) {
      return err(new ValidationError('Conclusion OrderedSet not in document'));
    }

    const argument = AtomicArgument.create(
      premiseSet ? premiseSet.getId() : undefined,
      conclusionSet ? conclusionSet.getId() : undefined,
    );
    if (argument.isErr()) {
      return err(argument.error);
    }

    this.atomicArguments.set(argument.value.getId().getValue(), argument.value);

    // Register OrderedSet usage - this tracks connections!
    if (premiseSet) {
      this.registerOrderedSetUsage(premiseSet.getId(), argument.value.getId(), 'premise');
    }
    if (conclusionSet) {
      this.registerOrderedSetUsage(conclusionSet.getId(), argument.value.getId(), 'conclusion');
    }

    this.incrementVersion();

    this.addDomainEvent(
      new AtomicArgumentCreated(this.id.getValue(), {
        argumentId: argument.value.getId().getValue(),
        premiseSetId: premiseSet?.getId().getValue() || null,
        conclusionSetId: conclusionSet?.getId().getValue() || null,
      }),
    );

    return ok(argument.value);
  }

  updateAtomicArgument(
    argumentId: AtomicArgumentId,
    premiseSet: OrderedSet | null,
    conclusionSet: OrderedSet | null,
  ): Result<AtomicArgument, ValidationError> {
    const existing = this.atomicArguments.get(argumentId.getValue());
    if (!existing) {
      return err(new ValidationError('Atomic argument not found'));
    }

    // Validate OrderedSets belong to this document
    if (premiseSet && !this.orderedSets.has(premiseSet.getId().getValue())) {
      return err(new ValidationError('Premise OrderedSet not in document'));
    }
    if (conclusionSet && !this.orderedSets.has(conclusionSet.getId().getValue())) {
      return err(new ValidationError('Conclusion OrderedSet not in document'));
    }

    // Unregister old usage
    const oldPremiseSetId = existing.getPremiseSet();
    const oldConclusionSetId = existing.getConclusionSet();

    if (oldPremiseSetId) {
      this.unregisterOrderedSetUsage(oldPremiseSetId, argumentId, 'premise');
    }
    if (oldConclusionSetId) {
      this.unregisterOrderedSetUsage(oldConclusionSetId, argumentId, 'conclusion');
    }

    // Update the argument
    existing.setPremiseSetRef(premiseSet?.getId() ?? null);
    existing.setConclusionSetRef(conclusionSet?.getId() ?? null);

    // Register new usage
    if (premiseSet) {
      this.registerOrderedSetUsage(premiseSet.getId(), argumentId, 'premise');
    }
    if (conclusionSet) {
      this.registerOrderedSetUsage(conclusionSet.getId(), argumentId, 'conclusion');
    }

    this.incrementVersion();

    this.addDomainEvent(
      new AtomicArgumentUpdated(this.id.getValue(), {
        argumentId: argumentId.getValue(),
        premiseSetId: premiseSet?.getId().getValue() || null,
        conclusionSetId: conclusionSet?.getId().getValue() || null,
      }),
    );

    return ok(existing);
  }

  deleteAtomicArgument(id: AtomicArgumentId): Result<void, ValidationError> {
    const existing = this.atomicArguments.get(id.getValue());
    if (!existing) {
      return err(new ValidationError('Atomic argument not found'));
    }

    // Unregister OrderedSet usage
    const premiseSetId = existing.getPremiseSet();
    const conclusionSetId = existing.getConclusionSet();

    if (premiseSetId) {
      this.unregisterOrderedSetUsage(premiseSetId, id, 'premise');
    }
    if (conclusionSetId) {
      this.unregisterOrderedSetUsage(conclusionSetId, id, 'conclusion');
    }

    this.atomicArguments.delete(id.getValue());
    this.incrementVersion();

    this.addDomainEvent(
      new AtomicArgumentDeleted(this.id.getValue(), {
        argumentId: id.getValue(),
        premiseSetId: premiseSetId?.getValue() || null,
        conclusionSetId: conclusionSetId?.getValue() || null,
      }),
    );

    return ok(undefined);
  }

  // Connection discovery operations
  findConnectionsForArgument(argumentId: AtomicArgumentId): ArgumentConnection[] {
    const connections: ArgumentConnection[] = [];
    const argument = this.atomicArguments.get(argumentId.getValue());
    if (!argument) return connections;

    // Find arguments that can provide premises
    const premiseSetId = argument.getPremiseSet();
    if (premiseSetId) {
      const providers = this.findArgumentsProvidingOrderedSet(premiseSetId);
      for (const provider of providers) {
        if (provider.getId().getValue() !== argumentId.getValue()) {
          connections.push({
            type: 'consumes',
            fromId: provider.getId(),
            toId: argumentId,
            viaOrderedSetId: premiseSetId,
          });
        }
      }
    }

    // Find arguments that can consume conclusions
    const conclusionSetId = argument.getConclusionSet();
    if (conclusionSetId) {
      const consumers = this.findArgumentsConsumingOrderedSet(conclusionSetId);
      for (const consumer of consumers) {
        if (consumer.getId().getValue() !== argumentId.getValue()) {
          connections.push({
            type: 'provides',
            fromId: argumentId,
            toId: consumer.getId(),
            viaOrderedSetId: conclusionSetId,
          });
        }
      }
    }

    return connections;
  }

  private findArgumentsProvidingOrderedSet(setId: OrderedSetId): AtomicArgument[] {
    const providers: AtomicArgument[] = [];
    for (const arg of Array.from(this.atomicArguments.values())) {
      const conclusionSetId = arg.getConclusionSet();
      if (conclusionSetId && conclusionSetId.getValue() === setId.getValue()) {
        providers.push(arg);
      }
    }
    return providers;
  }

  private findArgumentsConsumingOrderedSet(setId: OrderedSetId): AtomicArgument[] {
    const consumers: AtomicArgument[] = [];
    for (const arg of Array.from(this.atomicArguments.values())) {
      const premiseSetId = arg.getPremiseSet();
      if (premiseSetId && premiseSetId.getValue() === setId.getValue()) {
        consumers.push(arg);
      }
    }
    return consumers;
  }

  // Connection queries
  findSharedOrderedSets(): SharedOrderedSet[] {
    const shared: SharedOrderedSet[] = [];

    for (const [setId, usages] of Array.from(this.orderedSetRegistry.entries())) {
      if (usages.size > 1) {
        const orderedSet = this.orderedSets.get(setId);
        if (orderedSet) {
          shared.push({
            orderedSet,
            usages: Array.from(usages).map((usage) => {
              const usageStr = String(usage);
              const [argId, role] = usageStr.split(':');
              if (!argId || !role) {
                return { argumentId: usageStr, role: 'premise' as 'premise' | 'conclusion' };
              }
              return { argumentId: argId, role: role as 'premise' | 'conclusion' };
            }),
          });
        }
      }
    }

    return shared;
  }

  // Private helper methods
  private incrementVersion(): void {
    this.version++;
    this.modifiedAt = new Date();
  }

  private registerOrderedSetUsage(
    setId: OrderedSetId,
    argumentId: AtomicArgumentId,
    role: 'premise' | 'conclusion',
  ): void {
    const registry = this.orderedSetRegistry.get(setId.getValue());
    if (!registry) return;

    const usage = `${argumentId.getValue()}:${role}`;
    const wasShared = registry.size > 1;
    registry.add(usage);
    const isNowShared = registry.size > 1;

    // Emit event when OrderedSet becomes shared
    if (!wasShared && isNowShared) {
      this.addDomainEvent(
        new OrderedSetBecameShared(this.id.getValue(), {
          orderedSetId: setId.getValue(),
          usages: Array.from(registry),
        }),
      );
    }
  }

  private unregisterOrderedSetUsage(
    setId: OrderedSetId,
    argumentId: AtomicArgumentId,
    role: 'premise' | 'conclusion',
  ): void {
    const registry = this.orderedSetRegistry.get(setId.getValue());
    if (!registry) return;

    const usage = `${argumentId.getValue()}:${role}`;
    registry.delete(usage);
  }

  private isStatementInUse(statementId: StatementId): boolean {
    for (const orderedSet of Array.from(this.orderedSets.values())) {
      if (orderedSet.containsStatement(statementId)) {
        return true;
      }
    }
    return false;
  }

  private findOrderedSetByContent(statementIds: StatementId[]): OrderedSet | null {
    for (const orderedSet of Array.from(this.orderedSets.values())) {
      const candidate = OrderedSet.create(statementIds);
      if (candidate.isOk() && orderedSet.orderedEquals(candidate.value)) {
        return orderedSet;
      }
    }
    return null;
  }

  // Validation operations
  validateConnections(): ConnectionValidationResult {
    const cycles = this.detectCycles();
    const orphans = this.findOrphanedArguments();
    const inconsistencies = this.findInconsistentConnections();

    return {
      isValid: cycles.length === 0 && inconsistencies.length === 0,
      cycles,
      orphans,
      inconsistencies,
    };
  }

  private detectCycles(): ArgumentCycle[] {
    // Basic cycle detection - could be enhanced with proper graph algorithms
    const cycles: ArgumentCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const argument of Array.from(this.atomicArguments.values())) {
      if (!visited.has(argument.getId().getValue())) {
        this.detectCyclesHelper(argument.getId(), visited, recursionStack, [], cycles);
      }
    }

    return cycles;
  }

  private detectCyclesHelper(
    argumentId: AtomicArgumentId,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: AtomicArgumentId[],
    cycles: ArgumentCycle[],
  ): void {
    const argIdStr = argumentId.getValue();
    visited.add(argIdStr);
    recursionStack.add(argIdStr);
    path.push(argumentId);

    const connections = this.findConnectionsForArgument(argumentId);
    for (const connection of connections) {
      if (connection.type === 'provides') {
        const nextArgIdStr = connection.toId.getValue();
        if (!visited.has(nextArgIdStr)) {
          this.detectCyclesHelper(connection.toId, visited, recursionStack, path, cycles);
        } else if (recursionStack.has(nextArgIdStr)) {
          // Found a cycle
          const cycleStartIndex = path.findIndex((id) => id.getValue() === nextArgIdStr);
          if (cycleStartIndex >= 0) {
            cycles.push({
              path: path.slice(cycleStartIndex),
              severity: 'medium',
            });
          }
        }
      }
    }

    path.pop();
    recursionStack.delete(argIdStr);
  }

  private findOrphanedArguments(): AtomicArgumentId[] {
    const orphans: AtomicArgumentId[] = [];
    for (const arg of Array.from(this.atomicArguments.values())) {
      const connections = this.findConnectionsForArgument(arg.getId());
      if (connections.length === 0 && !arg.isBootstrap()) {
        orphans.push(arg.getId());
      }
    }
    return orphans;
  }

  private findInconsistentConnections(): ConnectionInconsistency[] {
    const inconsistencies: ConnectionInconsistency[] = [];

    for (const arg of Array.from(this.atomicArguments.values())) {
      // Check for missing premises
      const premiseSetId = arg.getPremiseSet();
      if (premiseSetId) {
        const premiseSet = this.orderedSets.get(premiseSetId.getValue());
        if (premiseSet?.isEmpty()) {
          inconsistencies.push({
            type: 'missing_premise',
            argumentId: arg.getId(),
            details: 'Argument has empty premise set',
          });
        }
      }

      // Check for dangling conclusions
      const conclusionSetId = arg.getConclusionSet();
      if (conclusionSetId) {
        const consumers = this.findArgumentsConsumingOrderedSet(conclusionSetId);
        if (consumers.length === 0) {
          inconsistencies.push({
            type: 'dangling_conclusion',
            argumentId: arg.getId(),
            details: 'Conclusion set is not consumed by any other argument',
          });
        }
      }
    }

    return inconsistencies;
  }

  // Getters
  getId(): ProofDocumentId {
    return this.id;
  }
  getVersion(): number {
    return this.version;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }
  getModifiedAt(): Date {
    return this.modifiedAt;
  }

  // For queries
  getStatement(id: StatementId): Statement | null {
    return this.statements.get(id.getValue()) || null;
  }

  getOrderedSet(id: OrderedSetId): OrderedSet | null {
    return this.orderedSets.get(id.getValue()) || null;
  }

  getArgument(id: AtomicArgumentId): AtomicArgument | null {
    return this.atomicArguments.get(id.getValue()) || null;
  }

  getStats(): DocumentStats {
    return {
      statementCount: this.statements.size,
      orderedSetCount: this.orderedSets.size,
      argumentCount: this.atomicArguments.size,
      sharedOrderedSetCount: this.findSharedOrderedSets().length,
    };
  }

  // Collection getters for queries
  getAllStatements(): Statement[] {
    return Array.from(this.statements.values());
  }

  getAllOrderedSets(): OrderedSet[] {
    return Array.from(this.orderedSets.values());
  }

  getAllAtomicArguments(): AtomicArgument[] {
    return Array.from(this.atomicArguments.values());
  }
}
