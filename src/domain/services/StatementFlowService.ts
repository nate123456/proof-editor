import type { Result } from "../shared/result.js";
import { ValidationError, createSuccess, createFailure } from "../shared/result.js";
import { 
  StatementId, 
  OrderedSetId, 
  AtomicArgumentId,
  StatementEntity,
  OrderedSetEntity,
  AtomicArgumentEntity
} from "../index.js";

export class StatementFlowService {
  
  createStatementFromContent(content: string): Result<StatementEntity, ValidationError> {
    return StatementEntity.create(content);
  }

  createOrderedSetFromStatements(statements: StatementEntity[]): Result<OrderedSetEntity, ValidationError> {
    const statementIds = statements.map(statement => statement.getId());
    return OrderedSetEntity.create(statementIds);
  }

  createEmptyOrderedSet(): Result<OrderedSetEntity, ValidationError> {
    return OrderedSetEntity.create();
  }

  addStatementToOrderedSet(
    orderedSet: OrderedSetEntity,
    statement: StatementEntity
  ): Result<void, ValidationError> {
    const addResult = orderedSet.addStatement(statement.getId());
    if (addResult.success) {
      statement.incrementUsage();
    }
    return addResult;
  }

  removeStatementFromOrderedSet(
    orderedSet: OrderedSetEntity,
    statement: StatementEntity
  ): Result<void, ValidationError> {
    const removeResult = orderedSet.removeStatement(statement.getId());
    if (removeResult.success) {
      return statement.decrementUsage();
    }
    return removeResult;
  }

  createAtomicArgumentWithSets(
    premiseSet?: OrderedSetEntity,
    conclusionSet?: OrderedSetEntity
  ): Result<AtomicArgumentEntity, ValidationError> {
    const argument = AtomicArgumentEntity.create(
      premiseSet?.getId(),
      conclusionSet?.getId()
    );

    if (argument.success) {
      const argumentEntity = argument.data;
      
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
    parentArg: AtomicArgumentEntity,
    childArg: AtomicArgumentEntity,
    sharedSet: OrderedSetEntity
  ): Result<void, ValidationError> {
    const parentConclusionRef = parentArg.getConclusionSetRef();
    const childPremiseRef = childArg.getPremiseSetRef();

    if (!parentConclusionRef || !childPremiseRef) {
      return createFailure(new ValidationError("Both arguments must have the relevant ordered sets"));
    }

    if (!parentConclusionRef.equals(sharedSet.getId()) || 
        !childPremiseRef.equals(sharedSet.getId())) {
      return createFailure(new ValidationError("Shared set must match both argument references"));
    }

    return createSuccess(undefined);
  }

  createBranchFromArgumentConclusion(
    parentArg: AtomicArgumentEntity,
    conclusionSet: OrderedSetEntity
  ): Result<AtomicArgumentEntity, ValidationError> {
    if (!parentArg.getConclusionSetRef()?.equals(conclusionSet.getId())) {
      return createFailure(new ValidationError("Conclusion set must match parent argument"));
    }

    const childArgResult = parentArg.createBranchFromConclusion();
    if (!childArgResult.success) {
      return childArgResult;
    }

    const childArg = childArgResult.data;
    conclusionSet.addAtomicArgumentReference(childArg.getId(), 'premise');

    return createSuccess(childArg);
  }

  findDirectlyConnectedArguments(
    argument: AtomicArgumentEntity,
    allArguments: Map<AtomicArgumentId, AtomicArgumentEntity>
  ): AtomicArgumentEntity[] {
    const connected: AtomicArgumentEntity[] = [];

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
    startingArgument: AtomicArgumentEntity,
    allArguments: Map<AtomicArgumentId, AtomicArgumentEntity>
  ): Set<AtomicArgumentEntity> {
    const connected = new Set<AtomicArgumentEntity>();
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
    fromArgument: AtomicArgumentEntity,
    toArgument: AtomicArgumentEntity,
    orderedSets: Map<OrderedSetId, OrderedSetEntity>
  ): Result<void, ValidationError> {
    const fromConclusionRef = fromArgument.getConclusionSetRef();
    const toPremiseRef = toArgument.getPremiseSetRef();

    if (!fromConclusionRef || !toPremiseRef) {
      return createFailure(new ValidationError("Both arguments must have relevant ordered sets for flow"));
    }

    if (!fromConclusionRef.equals(toPremiseRef)) {
      return createFailure(new ValidationError("Arguments are not connected by shared ordered set"));
    }

    const sharedSet = orderedSets.get(fromConclusionRef);
    if (!sharedSet) {
      return createFailure(new ValidationError("Shared ordered set not found"));
    }

    if (sharedSet.isEmpty()) {
      return createFailure(new ValidationError("Cannot flow through empty ordered set"));
    }

    return createSuccess(undefined);
  }

  canStatementsFlowBetween(
    fromArgument: AtomicArgumentEntity,
    toArgument: AtomicArgumentEntity
  ): boolean {
    const fromConclusionRef = fromArgument.getConclusionSetRef();
    const toPremiseRef = toArgument.getPremiseSetRef();

    return fromConclusionRef !== null && 
           toPremiseRef !== null && 
           fromConclusionRef.equals(toPremiseRef);
  }

  findStatementFlowPath(
    startArgument: AtomicArgumentEntity,
    endArgument: AtomicArgumentEntity,
    allArguments: Map<AtomicArgumentId, AtomicArgumentEntity>
  ): AtomicArgumentEntity[] | null {
    if (startArgument.equals(endArgument)) {
      return [startArgument];
    }

    const visited = new Set<AtomicArgumentId>();
    const queue: { argument: AtomicArgumentEntity; path: AtomicArgumentEntity[] }[] = [
      { argument: startArgument, path: [startArgument] }
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
            path: [...path, connected]
          });
        }
      }
    }

    return null;
  }
}