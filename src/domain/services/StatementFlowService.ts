import { AtomicArgument } from '../entities/AtomicArgument.js';
import { OrderedSet } from '../entities/OrderedSet.js';
import { Statement } from '../entities/Statement.js';
import { err, ok, type Result, ValidationError } from '../shared/result.js';
import { type AtomicArgumentId, type OrderedSetId } from '../shared/value-objects.js';

export class StatementFlowService {
  createStatementFromContent(content: string): Result<Statement, ValidationError> {
    return Statement.create(content);
  }

  createOrderedSetFromStatements(statements: Statement[]): Result<OrderedSet, ValidationError> {
    const statementIds = statements.map(statement => statement.getId());
    return OrderedSet.create(statementIds);
  }

  createEmptyOrderedSet(): Result<OrderedSet, ValidationError> {
    return OrderedSet.create();
  }

  addStatementToOrderedSet(
    orderedSet: OrderedSet,
    statement: Statement
  ): Result<void, ValidationError> {
    const addResult = orderedSet.addStatement(statement.getId());
    if (addResult.isOk()) {
      statement.incrementUsage();
    }
    return addResult;
  }

  removeStatementFromOrderedSet(
    orderedSet: OrderedSet,
    statement: Statement
  ): Result<void, ValidationError> {
    const removeResult = orderedSet.removeStatement(statement.getId());
    if (removeResult.isOk()) {
      return statement.decrementUsage();
    }
    return removeResult;
  }

  createAtomicArgumentWithSets(
    premiseSet?: OrderedSet,
    conclusionSet?: OrderedSet
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
    sharedSet: OrderedSet
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
    conclusionSet: OrderedSet
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
    allArguments: Map<AtomicArgumentId, AtomicArgument>
  ): AtomicArgument[] {
    const connected: AtomicArgument[] = [];

    for (const [id, otherArg] of allArguments) {
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
    allArguments: Map<AtomicArgumentId, AtomicArgument>
  ): Set<AtomicArgument> {
    const connected = new Set<AtomicArgument>();
    const toVisit = [startingArgument];
    const visited = new Set<AtomicArgumentId>();

    while (toVisit.length > 0) {
      const current = toVisit.pop()!;

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
    orderedSets: Map<OrderedSetId, OrderedSet>
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
    allArguments: Map<AtomicArgumentId, AtomicArgument>
  ): AtomicArgument[] | null {
    if (startArgument.equals(endArgument)) {
      return [startArgument];
    }

    const visited = new Set<AtomicArgumentId>();
    const queue: { argument: AtomicArgument; path: AtomicArgument[] }[] = [
      { argument: startArgument, path: [startArgument] },
    ];

    while (queue.length > 0) {
      const { argument: current, path } = queue.shift()!;

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
}
