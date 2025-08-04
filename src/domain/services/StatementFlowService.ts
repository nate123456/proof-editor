import { err, ok, type Result } from 'neverthrow';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import { Statement } from '../entities/Statement.js';
import type {
  IProofTransactionService,
  TransactionError,
} from '../interfaces/IProofTransaction.js';
import {
  type ConnectionRequest,
  CreateConnectionOperation,
} from '../operations/ConnectionOperations.js';
import {
  CreateStatementOperation,
  type CreateStatementRequest,
  DeleteStatementOperation,
  type DeleteStatementRequest,
} from '../operations/StatementOperations.js';
import { ValidationError } from '../shared/result.js';
import type { AtomicArgumentId } from '../shared/value-objects/index.js';

export class StatementFlowService {
  constructor(private readonly transactionService?: IProofTransactionService) {}

  createStatementFromContent(content: string): Result<Statement, ValidationError> {
    return Statement.create(content);
  }

  createAtomicArgumentFromStatements(
    premiseStatements: Statement[],
    conclusionStatements: Statement[],
  ): Result<AtomicArgument, ValidationError> {
    return AtomicArgument.create(premiseStatements, conclusionStatements);
  }

  createBranchFromArgumentConclusion(
    parentArg: AtomicArgument,
    conclusionIndex: number = 0,
  ): Result<AtomicArgument, ValidationError> {
    return parentArg.createBranchFromConclusion(conclusionIndex);
  }

  findDirectlyConnectedArguments(
    argument: AtomicArgument,
    allArguments: Map<AtomicArgumentId, AtomicArgument>,
  ): AtomicArgument[] {
    const connected: AtomicArgument[] = [];

    for (const [id, otherArg] of Array.from(allArguments.entries())) {
      if (id.equals(argument.getId())) {
        continue;
      }

      if (argument.isDirectlyConnectedTo(otherArg)) {
        connected.push(otherArg);
      }
    }

    return connected;
  }

  findAllConnectedArguments(
    startingArgument: AtomicArgument,
    allArguments: Map<AtomicArgumentId, AtomicArgument>,
  ): Set<AtomicArgument> {
    const connected = new Set<AtomicArgument>();
    const toVisit = [startingArgument];
    const visited = new Set<AtomicArgumentId>();

    while (toVisit.length > 0) {
      const current = toVisit.pop();
      if (!current) continue;

      if (visited.has(current.getId())) {
        continue;
      }

      visited.add(current.getId());
      connected.add(current);

      const directlyConnected = this.findDirectlyConnectedArguments(current, allArguments);
      for (const connectedArg of directlyConnected) {
        if (!visited.has(connectedArg.getId())) {
          toVisit.push(connectedArg);
        }
      }
    }

    return connected;
  }

  validateStatementFlow(
    fromArgument: AtomicArgument,
    toArgument: AtomicArgument,
  ): Result<void, ValidationError> {
    // Check if arguments can connect via shared statements
    const fromConclusions = fromArgument.getConclusions();
    const toPremises = toArgument.getPremises();

    // For flow to be valid, at least one conclusion statement from the first argument
    // must match a premise statement in the second argument
    const hasSharedStatement = fromConclusions.some((conclusion) =>
      toPremises.some((premise) => premise.getId().equals(conclusion.getId())),
    );

    if (!hasSharedStatement) {
      return err(new ValidationError('Arguments are not connected by shared statements'));
    }

    return ok(undefined);
  }

  canStatementsFlowBetween(fromArgument: AtomicArgument, toArgument: AtomicArgument): boolean {
    const fromConclusions = fromArgument.getConclusions();
    const toPremises = toArgument.getPremises();

    return fromConclusions.some((conclusion) =>
      toPremises.some((premise) => premise.getId().equals(conclusion.getId())),
    );
  }

  findStatementFlowPath(
    startArgument: AtomicArgument,
    endArgument: AtomicArgument,
    allArguments: Map<AtomicArgumentId, AtomicArgument>,
  ): AtomicArgument[] | null {
    if (startArgument.equals(endArgument)) {
      return [startArgument];
    }

    const visited = new Set<AtomicArgumentId>();
    const queue: { argument: AtomicArgument; path: AtomicArgument[] }[] = [
      { argument: startArgument, path: [startArgument] },
    ];

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const { argument: current, path } = item;

      if (visited.has(current.getId())) {
        continue;
      }

      visited.add(current.getId());

      if (current.equals(endArgument)) {
        return path;
      }

      const directlyConnected = this.findDirectlyConnectedArguments(current, allArguments);
      for (const connected of directlyConnected) {
        if (!visited.has(connected.getId()) && this.canStatementsFlowBetween(current, connected)) {
          queue.push({
            argument: connected,
            path: [...path, connected],
          });
        }
      }
    }

    return null;
  }

  async createStatementWithTransaction(
    request: CreateStatementRequest,
  ): Promise<Result<Statement, TransactionError | ValidationError>> {
    if (!this.transactionService) {
      return err(new ValidationError('Transaction service not available'));
    }

    return this.transactionService.executeInTransaction(async (transaction) => {
      const createOp = new CreateStatementOperation(request);
      transaction.addOperation(createOp);

      const createdStatement = createOp.getCreatedStatement();
      if (!createdStatement) {
        return err(new ValidationError('Statement creation failed'));
      }

      return ok(createdStatement);
    });
  }

  async deleteStatementWithTransaction(
    request: DeleteStatementRequest,
  ): Promise<Result<void, TransactionError | ValidationError>> {
    if (!this.transactionService) {
      return err(new ValidationError('Transaction service not available'));
    }

    return this.transactionService.executeInTransaction(async (transaction) => {
      const deleteOp = new DeleteStatementOperation(request);
      transaction.addOperation(deleteOp);

      return ok(undefined);
    });
  }

  async createComplexArgumentWithTransaction(
    premiseContents: string[],
    conclusionContents: string[],
  ): Promise<Result<AtomicArgument, TransactionError | ValidationError>> {
    if (!this.transactionService) {
      return err(new ValidationError('Transaction service not available'));
    }

    return this.transactionService.executeInTransaction(async (transaction) => {
      const premiseStatements: Statement[] = [];
      const conclusionStatements: Statement[] = [];

      for (const content of premiseContents) {
        const createOp = new CreateStatementOperation({ content });
        transaction.addOperation(createOp);

        const statement = createOp.getCreatedStatement();
        if (!statement) {
          return err(new ValidationError(`Failed to create premise statement: ${content}`));
        }
        premiseStatements.push(statement);
      }

      for (const content of conclusionContents) {
        const createOp = new CreateStatementOperation({ content });
        transaction.addOperation(createOp);

        const statement = createOp.getCreatedStatement();
        if (!statement) {
          return err(new ValidationError(`Failed to create conclusion statement: ${content}`));
        }
        conclusionStatements.push(statement);
      }

      const argumentResult = this.createAtomicArgumentFromStatements(
        premiseStatements,
        conclusionStatements,
      );

      if (argumentResult.isErr()) {
        return err(argumentResult.error);
      }

      return ok(argumentResult.value);
    });
  }
}
