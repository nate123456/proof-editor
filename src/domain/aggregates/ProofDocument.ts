import { err, ok, type Result } from 'neverthrow';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import { Statement } from '../entities/Statement.js';
import { AggregateRoot } from '../events/base-event.js';
import {
  AtomicArgumentCreated,
  AtomicArgumentDeleted,
  AtomicArgumentUpdated,
  ProofDocumentCreated,
  StatementCreated,
  StatementDeleted,
  StatementUpdated,
} from '../events/proof-document-events.js';
import { ProofDocumentQueryService } from '../queries/ProofDocumentQueryService.js';
import { ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  type NodeId,
  type Position2D,
  ProofDocumentId,
  type ProofTreeId,
  type SideLabel,
  StatementContent,
  type StatementId,
  type Version,
} from '../shared/value-objects/index.js';

// Reconstruction data types using value objects
export interface ProofDocumentReconstructData {
  id: ProofDocumentId;
  version: Version;
  createdAt: Date;
  modifiedAt: Date;
  statements: Map<StatementId, StatementContent>;
  atomicArguments: Map<AtomicArgumentId, AtomicArgumentReconstructData>;
  trees: Map<ProofTreeId, ProofTreeReconstructData>;
}

export interface AtomicArgumentReconstructData {
  premiseIds: StatementId[];
  conclusionIds: StatementId[];
  sideLabels?: {
    left?: SideLabel;
    right?: SideLabel;
  };
}

export interface ProofTreeReconstructData {
  offset: Position2D;
  nodes: Map<NodeId, unknown>; // Node structure to be defined by ProofTreeAggregate
}

export class ProofDocument extends AggregateRoot {
  private statements: Map<StatementId, Statement> = new Map();
  private atomicArguments: Map<AtomicArgumentId, AtomicArgument> = new Map();
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

    doc.addDomainEvent(new ProofDocumentCreated(doc.id, { createdAt: doc.createdAt.getTime() }));

    return doc;
  }

  static createBootstrap(id: ProofDocumentId): Result<ProofDocument, ValidationError> {
    const doc = new ProofDocument(id, new Date());

    doc.addDomainEvent(new ProofDocumentCreated(doc.id, { createdAt: doc.createdAt.getTime() }));

    return ok(doc);
  }

  static reconstruct(data: ProofDocumentReconstructData): Result<ProofDocument, ValidationError> {
    const doc = new ProofDocument(data.id, data.createdAt);
    doc.version = data.version.getValue();
    doc.modifiedAt = data.modifiedAt;

    // Reconstruct statements
    for (const [id, content] of data.statements) {
      const statementResult = Statement.createWithContent(content);
      if (statementResult.isErr()) {
        return err(statementResult.error);
      }

      doc.statements.set(id, statementResult.value);
    }

    // Reconstruct atomic arguments
    for (const [argumentId, argData] of data.atomicArguments) {
      // Convert premise IDs to Statement objects
      const premises: Statement[] = [];
      for (const premiseId of argData.premiseIds) {
        const statement = doc.statements.get(premiseId);
        if (!statement) {
          return err(new ValidationError(`Statement ${premiseId.getValue()} not found`));
        }
        premises.push(statement);
      }

      // Convert conclusion IDs to Statement objects
      const conclusions: Statement[] = [];
      for (const conclusionId of argData.conclusionIds) {
        const statement = doc.statements.get(conclusionId);
        if (!statement) {
          return err(new ValidationError(`Statement ${conclusionId.getValue()} not found`));
        }
        conclusions.push(statement);
      }

      // Convert SideLabel value objects to strings for AtomicArgument.reconstruct
      const sideLabels: { left?: string; right?: string } = {};
      if (argData.sideLabels?.left) {
        sideLabels.left = argData.sideLabels.left.getValue();
      }
      if (argData.sideLabels?.right) {
        sideLabels.right = argData.sideLabels.right.getValue();
      }

      const argumentResult = AtomicArgument.reconstruct(
        argumentId,
        premises,
        conclusions,
        data.createdAt.getTime(),
        data.modifiedAt.getTime(),
        sideLabels,
      );
      if (argumentResult.isErr()) {
        return err(argumentResult.error);
      }

      doc.atomicArguments.set(argumentId, argumentResult.value);
    }

    // Note: Tree reconstruction would be handled by ProofTreeAggregateRepository
    // We don't reconstruct trees here as they're stored in a separate aggregate

    return ok(doc);
  }

  // Statement operations
  createStatement(content: StatementContent): Result<Statement, ValidationError> {
    const statement = Statement.createWithContent(content);
    if (statement.isErr()) {
      return err(statement.error);
    }

    this.statements.set(statement.value.getId(), statement.value);
    this.incrementVersion();

    this.addDomainEvent(
      new StatementCreated(this.id, {
        statementId: statement.value.getId(),
        content: statement.value.getContentObject(),
      }),
    );

    return ok(statement.value);
  }

  // Convenience method for string input
  createStatementFromString(content: string): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }
    return this.createStatement(contentResult.value);
  }

  updateStatement(id: StatementId, content: StatementContent): Result<Statement, ValidationError> {
    const existing = this.statements.get(id);
    if (!existing) {
      return err(new ValidationError('Statement not found'));
    }

    // Check if statement is used in any argument
    if (this.isStatementInUse(id)) {
      return err(new ValidationError('Cannot update statement that is in use'));
    }

    const oldContent = existing.getContentObject();
    const updateResult = existing.updateContent(content.getValue());
    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    this.incrementVersion();

    this.addDomainEvent(
      new StatementUpdated(this.id, {
        statementId: id,
        oldContent,
        newContent: existing.getContentObject(),
      }),
    );

    return ok(existing);
  }

  // Convenience method for string input
  updateStatementFromString(id: StatementId, content: string): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }
    return this.updateStatement(id, contentResult.value);
  }

  deleteStatement(id: StatementId): Result<void, ValidationError> {
    const existing = this.statements.get(id);
    if (!existing) {
      return err(new ValidationError('Statement not found'));
    }

    if (this.isStatementInUse(id)) {
      return err(new ValidationError('Cannot delete statement that is in use'));
    }

    this.statements.delete(id);
    this.incrementVersion();

    this.addDomainEvent(
      new StatementDeleted(this.id, {
        statementId: id,
        content: existing.getContentObject(),
      }),
    );

    return ok(undefined);
  }

  // Create atomic argument with Statement arrays
  createAtomicArgument(
    premises: Statement[] = [],
    conclusions: Statement[] = [],
  ): Result<AtomicArgument, ValidationError> {
    // Validate all statements belong to this document
    for (const stmt of premises) {
      if (!this.statements.has(stmt.getId())) {
        return err(
          new ValidationError(`Premise statement ${stmt.getId().getValue()} not in document`),
        );
      }
    }
    for (const stmt of conclusions) {
      if (!this.statements.has(stmt.getId())) {
        return err(
          new ValidationError(`Conclusion statement ${stmt.getId().getValue()} not in document`),
        );
      }
    }

    const argument = AtomicArgument.create(premises, conclusions);
    if (argument.isErr()) {
      return err(argument.error);
    }

    this.atomicArguments.set(argument.value.getId(), argument.value);
    this.incrementVersion();

    this.addDomainEvent(
      new AtomicArgumentCreated(this.id, {
        argumentId: argument.value.getId(),
        premiseIds: premises.map((s) => s.getId()),
        conclusionIds: conclusions.map((s) => s.getId()),
      }),
    );

    return ok(argument.value);
  }

  updateAtomicArgument(
    argumentId: AtomicArgumentId,
    premises: Statement[],
    conclusions: Statement[],
  ): Result<AtomicArgument, ValidationError> {
    const existing = this.atomicArguments.get(argumentId);
    if (!existing) {
      return err(new ValidationError('Atomic argument not found'));
    }

    // Validate all statements belong to this document
    for (const stmt of premises) {
      if (!this.statements.has(stmt.getId())) {
        return err(
          new ValidationError(`Premise statement ${stmt.getId().getValue()} not in document`),
        );
      }
    }
    for (const stmt of conclusions) {
      if (!this.statements.has(stmt.getId())) {
        return err(
          new ValidationError(`Conclusion statement ${stmt.getId().getValue()} not in document`),
        );
      }
    }

    // Create new argument with updated statements
    const updatedArgument = AtomicArgument.reconstruct(
      argumentId,
      premises,
      conclusions,
      existing.getCreatedAt(),
      Date.now(),
      existing.getSideLabels(),
    );
    if (updatedArgument.isErr()) {
      return err(updatedArgument.error);
    }

    this.atomicArguments.set(argumentId, updatedArgument.value);
    this.incrementVersion();

    this.addDomainEvent(
      new AtomicArgumentUpdated(this.id, {
        argumentId: argumentId,
        premiseIds: premises.map((s) => s.getId()),
        conclusionIds: conclusions.map((s) => s.getId()),
      }),
    );

    return ok(updatedArgument.value);
  }

  deleteAtomicArgument(id: AtomicArgumentId): Result<void, ValidationError> {
    const existing = this.atomicArguments.get(id);
    if (!existing) {
      return err(new ValidationError('Atomic argument not found'));
    }

    this.atomicArguments.delete(id);
    this.incrementVersion();

    this.addDomainEvent(
      new AtomicArgumentDeleted(this.id, {
        argumentId: id,
        premiseIds: existing.getPremises().map((s) => s.getId()),
        conclusionIds: existing.getConclusions().map((s) => s.getId()),
      }),
    );

    return ok(undefined);
  }

  // Private helper methods
  private incrementVersion(): void {
    this.version++;
    this.modifiedAt = new Date();
  }

  private isStatementInUse(statementId: StatementId): boolean {
    for (const argument of this.atomicArguments.values()) {
      for (const premise of argument.getPremises()) {
        if (premise.getId().equals(statementId)) {
          return true;
        }
      }
      for (const conclusion of argument.getConclusions()) {
        if (conclusion.getId().equals(statementId)) {
          return true;
        }
      }
    }
    return false;
  }

  // Query service factory method
  createQueryService(): ProofDocumentQueryService {
    return new ProofDocumentQueryService(
      this.id,
      this.version,
      this.createdAt,
      this.modifiedAt,
      new Map(this.statements),
      new Map(this.atomicArguments),
    );
  }
}
