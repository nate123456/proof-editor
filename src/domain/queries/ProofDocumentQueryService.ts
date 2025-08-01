import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import type {
  AtomicArgumentId,
  ProofDocumentId,
  StatementId,
} from '../shared/value-objects/index.js';

export class ProofDocumentQueryService {
  constructor(
    private readonly id: ProofDocumentId,
    private readonly version: number,
    private readonly createdAt: Date,
    private readonly modifiedAt: Date,
    private readonly statements: Map<StatementId, Statement>,
    private readonly atomicArguments: Map<AtomicArgumentId, AtomicArgument>,
  ) {}

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

  getStatement(id: StatementId): Statement | null {
    return this.statements.get(id) || null;
  }

  getArgument(id: AtomicArgumentId): AtomicArgument | null {
    return this.atomicArguments.get(id) || null;
  }

  getAllStatements(): Statement[] {
    return Array.from(this.statements.values());
  }

  getAllAtomicArguments(): AtomicArgument[] {
    return Array.from(this.atomicArguments.values());
  }

  isStatementInUse(statementId: StatementId): boolean {
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
}
