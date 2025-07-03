import { injectable } from 'tsyringe';

import { AtomicArgument } from '../entities/AtomicArgument.js';
import { OrderedSet } from '../entities/OrderedSet.js';
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
import { err, ok, type Result, ValidationError } from '../shared/result.js';
import type { AtomicArgumentId, OrderedSetId } from '../shared/value-objects.js';

@injectable()
export class StatementFlowService {
  constructor(private readonly transactionService?: IProofTransactionService) {}
  createStatementFromContent(content: string): Result<Statement, ValidationError> {
    return Statement.create(content);
  }

  createOrderedSetFromStatements(statements: Statement[]): Result<OrderedSet, ValidationError> {
    const statementIds = statements.map((statement) => statement.getId());
    return OrderedSet.create(statementIds);
  }

  createEmptyOrderedSet(): Result<OrderedSet, ValidationError> {
    return OrderedSet.create();
  }

  addStatementToOrderedSet(
    orderedSet: OrderedSet,
    statement: Statement,
  ): Result<void, ValidationError> {
    const addResult = orderedSet.addStatement(statement.getId());
    if (addResult.isOk()) {
      statement.incrementUsage();
    }
    return addResult;
  }

  removeStatementFromOrderedSet(
    orderedSet: OrderedSet,
    statement: Statement,
  ): Result<void, ValidationError> {
    const removeResult = orderedSet.removeStatement(statement.getId());
    if (removeResult.isOk()) {
      return statement.decrementUsage();
    }
    return removeResult;
  }

  createAtomicArgumentWithSets(
    premiseSet?: OrderedSet,
    conclusionSet?: OrderedSet,
  ): Result<AtomicArgument, ValidationError> {
    const argument = AtomicArgument.create(premiseSet?.getId(), conclusionSet?.getId());

    if (argument.isOk()) {
      const argumentEntity = argument.value;

      if (premiseSet) {
        premiseSet.addAtomicArgumentReference(argumentEntity.getId(), 'premise');
      }

      if (conclusionSet) {
        conclusionSet.addAtomicArgumentReference(argumentEntity.getId(), 'conclusion');
      }
    }

    return argument;
  }

  connectAtomicArgumentsBySharedSet(
    parentArg: AtomicArgument,
    childArg: AtomicArgument,
    sharedSet: OrderedSet,
  ): Result<void, ValidationError> {
    const parentConclusionRef = parentArg.getConclusionSetRef();
    const childPremiseRef = childArg.getPremiseSetRef();

    if (!parentConclusionRef || !childPremiseRef) {
      return err(new ValidationError('Both arguments must have the relevant ordered sets'));
    }

    if (
      !parentConclusionRef.equals(sharedSet.getId()) ||
      !childPremiseRef.equals(sharedSet.getId())
    ) {
      return err(new ValidationError('Shared set must match both argument references'));
    }

    return ok(undefined);
  }

  createBranchFromArgumentConclusion(
    parentArg: AtomicArgument,
    conclusionSet: OrderedSet,
  ): Result<AtomicArgument, ValidationError> {
    if (!parentArg.getConclusionSetRef()?.equals(conclusionSet.getId())) {
      return err(new ValidationError('Conclusion set must match parent argument'));
    }

    const childArgResult = parentArg.createBranchFromConclusion();
    if (childArgResult.isErr()) {
      return childArgResult;
    }

    const childArg = childArgResult.value;
    conclusionSet.addAtomicArgumentReference(childArg.getId(), 'premise');

    return ok(childArg);
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
    orderedSets: Map<OrderedSetId, OrderedSet>,
  ): Result<void, ValidationError> {
    const fromConclusionRef = fromArgument.getConclusionSetRef();
    const toPremiseRef = toArgument.getPremiseSetRef();

    if (!fromConclusionRef || !toPremiseRef) {
      return err(new ValidationError('Both arguments must have relevant ordered sets for flow'));
    }

    if (!fromConclusionRef.equals(toPremiseRef)) {
      return err(new ValidationError('Arguments are not connected by shared ordered set'));
    }

    const sharedSet = orderedSets.get(fromConclusionRef);
    if (!sharedSet) {
      return err(new ValidationError('Shared ordered set not found'));
    }

    if (sharedSet.isEmpty()) {
      return err(new ValidationError('Cannot flow through empty ordered set'));
    }

    return ok(undefined);
  }

  canStatementsFlowBetween(fromArgument: AtomicArgument, toArgument: AtomicArgument): boolean {
    const fromConclusionRef = fromArgument.getConclusionSetRef();
    const toPremiseRef = toArgument.getPremiseSetRef();

    return (
      fromConclusionRef !== null && toPremiseRef !== null && fromConclusionRef.equals(toPremiseRef)
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

  async createAtomicConnectionWithTransaction(
    request: ConnectionRequest,
  ): Promise<Result<void, TransactionError | ValidationError>> {
    if (!this.transactionService) {
      return err(new ValidationError('Transaction service not available'));
    }

    return this.transactionService.executeInTransaction(async (transaction) => {
      const validationResult = this.connectAtomicArgumentsBySharedSet(
        request.parentArgument,
        request.childArgument,
        request.sharedSet,
      );

      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      const createOp = new CreateConnectionOperation(request);
      transaction.addOperation(createOp);

      return ok(undefined);
    });
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

      const premiseSetResult = this.createOrderedSetFromStatements(premiseStatements);
      if (premiseSetResult.isErr()) {
        return err(premiseSetResult.error);
      }

      const conclusionSetResult = this.createOrderedSetFromStatements(conclusionStatements);
      if (conclusionSetResult.isErr()) {
        return err(conclusionSetResult.error);
      }

      const argumentResult = this.createAtomicArgumentWithSets(
        premiseSetResult.value,
        conclusionSetResult.value,
      );

      if (argumentResult.isErr()) {
        return err(argumentResult.error);
      }

      return ok(argumentResult.value);
    });
  }
}
