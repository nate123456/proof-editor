import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument';
import { ProcessingError } from '../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import {
  type AtomicArgumentId,
  type NodeId,
  ReferenceType,
} from '../shared/value-objects/index.js';

export interface TreeStatementReference {
  readonly argumentId: AtomicArgumentId;
  readonly referenceType: ReferenceType;
  readonly statementId: string;
}

export interface TreeConnectionIntegrityReport {
  readonly argumentId: AtomicArgumentId;
  readonly issues: TreeConnectionIntegrityIssue[];
  hasIssues(): boolean;
}

export interface TreeConnectionIntegrityIssue {
  readonly type: string;
  readonly description: string;
}

export class TreeConnectionDiscoveryService {
  async discoverSharedStatementReferences(
    statementId: string,
    nodeIds: readonly NodeId[],
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<Result<TreeStatementReference[], ProcessingError>> {
    const allArguments = await this.getAllTreeArguments(nodeIds, atomicArgumentRepo);
    const references: TreeStatementReference[] = [];

    for (const argument of allArguments) {
      const premises = argument.getPremises();
      for (const premise of premises) {
        if (premise.getId().getValue() === statementId) {
          references.push(
            new TreeStatementReferenceImpl(argument.getId(), ReferenceType.PREMISE, statementId),
          );
          break;
        }
      }

      const conclusions = argument.getConclusions();
      for (const conclusion of conclusions) {
        if (conclusion.getId().getValue() === statementId) {
          references.push(
            new TreeStatementReferenceImpl(argument.getId(), ReferenceType.CONCLUSION, statementId),
          );
          break;
        }
      }
    }

    return ok(references);
  }

  async validateConnectionIntegrity(
    argumentId: AtomicArgumentId,
    nodeIds: readonly NodeId[],
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<Result<TreeConnectionIntegrityReport, ProcessingError>> {
    const argumentResult = await atomicArgumentRepo.findById(argumentId);
    if (argumentResult.isErr()) {
      return err(new ProcessingError('Argument not found'));
    }

    const argument = argumentResult.value;
    const argumentInTree = this.isArgumentInTree(argumentId, nodeIds);
    if (!argumentInTree) {
      return err(new ProcessingError('Argument not part of this tree'));
    }

    const issues: TreeConnectionIntegrityIssue[] = [];

    const premises = argument.getPremises();
    const conclusions = argument.getConclusions();

    if (!argument.isBootstrap() && premises.length === 0) {
      issues.push(
        new TreeConnectionIntegrityIssueImpl(
          'missing_premises',
          `Argument ${argumentId.getValue()} has no premises but is not a bootstrap argument`,
        ),
      );
    }

    if (conclusions.length === 0) {
      issues.push(
        new TreeConnectionIntegrityIssueImpl(
          'missing_conclusions',
          `Argument ${argumentId.getValue()} has no conclusions`,
        ),
      );
    }

    const report = new TreeConnectionIntegrityReportImpl(argumentId, issues);
    return ok(report);
  }

  private async getAllTreeArguments(
    nodeIds: readonly NodeId[],
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<AtomicArgument[]> {
    const allArgumentsResult = await atomicArgumentRepo.findAll();
    if (allArgumentsResult.isErr()) {
      return [];
    }

    const allArguments = allArgumentsResult.value;
    const treeArguments: AtomicArgument[] = [];

    for (const argument of allArguments) {
      const isInTree = this.isArgumentInTree(argument.getId(), nodeIds);
      if (isInTree) {
        treeArguments.push(argument);
      }
    }

    return treeArguments;
  }

  private isArgumentInTree(_argumentId: AtomicArgumentId, nodeIds: readonly NodeId[]): boolean {
    for (const _nodeId of nodeIds) {
      // This would need to be implemented based on how nodes store argument references
      // For now, assume all arguments are in tree if we got here
    }
    return true;
  }
}

class TreeStatementReferenceImpl implements TreeStatementReference {
  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly referenceType: ReferenceType,
    public readonly statementId: string,
  ) {}
}

class TreeConnectionIntegrityReportImpl implements TreeConnectionIntegrityReport {
  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly issues: TreeConnectionIntegrityIssue[],
  ) {}

  hasIssues(): boolean {
    return this.issues.length > 0;
  }
}

class TreeConnectionIntegrityIssueImpl implements TreeConnectionIntegrityIssue {
  constructor(
    public readonly type: string,
    public readonly description: string,
  ) {}
}
