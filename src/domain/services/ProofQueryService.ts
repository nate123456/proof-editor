import type { ProofAggregate } from '../aggregates/ProofAggregate.js';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import type { AtomicArgumentId, ProofId, StatementId } from '../shared/value-objects/index.js';

export class ProofQueryService {
  constructor(private readonly proof: ProofAggregate) {}

  getId(): ProofId {
    return this.proof.getAggregateId();
  }

  getVersion(): number {
    return this.proof.getAggregateVersion();
  }

  getStatements(): ReadonlyMap<StatementId, Statement> {
    return this.proof.getAggregateStatements();
  }

  getArguments(): ReadonlyMap<AtomicArgumentId, AtomicArgument> {
    return this.proof.getAggregateArguments();
  }
}
