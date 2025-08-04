import type { ProofAggregate } from '../aggregates/ProofAggregate.js';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import type { AtomicArgumentId, ProofId, StatementId } from '../shared/value-objects/index.js';

export class ProofQueryService {
  private readonly queryService;

  constructor(private readonly proof: ProofAggregate) {
    this.queryService = proof.createQueryService();
  }

  getId(): ProofId {
    return this.queryService.getId();
  }

  getVersion(): number {
    return this.queryService.getVersion();
  }

  getStatements(): ReadonlyMap<StatementId, Statement> {
    return this.queryService.getStatements();
  }

  getArguments(): ReadonlyMap<AtomicArgumentId, AtomicArgument> {
    return this.queryService.getArguments();
  }

  getStatementById(id: StatementId): Statement | undefined {
    return this.queryService.getStatement(id) ?? undefined;
  }

  getArgumentById(id: AtomicArgumentId): AtomicArgument | undefined {
    return this.queryService.getArgument(id) ?? undefined;
  }

  getStatementCount(): number {
    return this.queryService.getStatementCount();
  }

  getArgumentCount(): number {
    return this.queryService.getArgumentCount();
  }

  hasStatement(id: StatementId): boolean {
    return this.queryService.hasStatement(id);
  }

  hasArgument(id: AtomicArgumentId): boolean {
    return this.queryService.hasArgument(id);
  }

  findArgumentsUsingStatement(statementId: StatementId): AtomicArgument[] {
    return this.queryService.findArgumentsUsingStatement(statementId);
  }

  toSerializableData(): {
    id: string;
    version: number;
    statements: Array<{ id: string; content: string }>;
    arguments: Array<{
      id: string;
      premises: string[];
      conclusions: string[];
    }>;
  } {
    const statements = Array.from(this.getStatements().values()).map((stmt) => ({
      id: stmt.getId().getValue(),
      content: stmt.getContent(),
    }));

    const argumentsData = Array.from(this.getArguments().values()).map((arg) => ({
      id: arg.getId().getValue(),
      premises: arg.getPremises().map((p) => p.getId().getValue()),
      conclusions: arg.getConclusions().map((c) => c.getId().getValue()),
    }));

    return {
      id: this.getId().getValue(),
      version: this.getVersion(),
      statements,
      arguments: argumentsData,
    };
  }
}
