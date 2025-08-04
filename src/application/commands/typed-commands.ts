import { err, ok, type Result } from 'neverthrow';
import type { ValidationError } from '../../domain/shared/result.js';
import {
  AtomicArgumentId,
  DocumentId,
  NodeId,
  Position2D,
  PremisePosition,
  SideLabel,
  SideLabels,
  StatementContent,
  StatementId,
  TreeId,
} from '../../domain/shared/value-objects/index.js';

export class TypedSideLabels {
  private constructor(
    private readonly left?: SideLabel,
    private readonly right?: SideLabel,
  ) {}

  static create(labels: {
    left?: string;
    right?: string;
  }): Result<TypedSideLabels, ValidationError> {
    let leftLabel: SideLabel | undefined;
    let rightLabel: SideLabel | undefined;

    if (labels.left !== undefined) {
      const leftResult = SideLabel.create(labels.left);
      if (leftResult.isErr()) {
        return err(leftResult.error);
      }
      leftLabel = leftResult.value;
    }

    if (labels.right !== undefined) {
      const rightResult = SideLabel.create(labels.right);
      if (rightResult.isErr()) {
        return err(rightResult.error);
      }
      rightLabel = rightResult.value;
    }

    return ok(new TypedSideLabels(leftLabel, rightLabel));
  }

  static empty(): TypedSideLabels {
    return new TypedSideLabels();
  }

  toDomain(): SideLabels {
    return SideLabels.create(this.left, this.right);
  }

  getLeft(): SideLabel | undefined {
    return this.left;
  }

  getRight(): SideLabel | undefined {
    return this.right;
  }
}

export class StatementIdCollection {
  private constructor(private readonly statementIds: readonly StatementId[]) {}

  static create(ids: string[]): Result<StatementIdCollection, ValidationError> {
    const validatedIds: StatementId[] = [];

    for (const id of ids) {
      const idResult = StatementId.create(id);
      if (idResult.isErr()) {
        return err(idResult.error);
      }
      validatedIds.push(idResult.value);
    }

    return ok(new StatementIdCollection(validatedIds));
  }

  static empty(): StatementIdCollection {
    return new StatementIdCollection([]);
  }

  toArray(): readonly StatementId[] {
    return this.statementIds;
  }

  size(): number {
    return this.statementIds.length;
  }

  isEmpty(): boolean {
    return this.statementIds.length === 0;
  }
}

export class CreateAtomicArgumentCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly premiseStatementIds: StatementIdCollection,
    private readonly conclusionStatementIds: StatementIdCollection,
    private readonly sideLabels: TypedSideLabels,
  ) {}

  static create(params: {
    documentId: string;
    premiseStatementIds: string[];
    conclusionStatementIds: string[];
    sideLabels?: {
      left?: string;
      right?: string;
    };
  }): Result<CreateAtomicArgumentCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const premiseIdsResult = StatementIdCollection.create(params.premiseStatementIds);
    if (premiseIdsResult.isErr()) {
      return err(premiseIdsResult.error);
    }

    const conclusionIdsResult = StatementIdCollection.create(params.conclusionStatementIds);
    if (conclusionIdsResult.isErr()) {
      return err(conclusionIdsResult.error);
    }

    const sideLabelsResult = params.sideLabels
      ? TypedSideLabels.create(params.sideLabels)
      : ok(TypedSideLabels.empty());
    if (sideLabelsResult.isErr()) {
      return err(sideLabelsResult.error);
    }

    return ok(
      new CreateAtomicArgumentCommand(
        documentIdResult.value,
        premiseIdsResult.value,
        conclusionIdsResult.value,
        sideLabelsResult.value,
      ),
    );
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getPremiseStatementIds(): StatementIdCollection {
    return this.premiseStatementIds;
  }

  getConclusionStatementIds(): StatementIdCollection {
    return this.conclusionStatementIds;
  }

  getSideLabels(): TypedSideLabels {
    return this.sideLabels;
  }
}

export class UpdateAtomicArgumentCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly argumentId: AtomicArgumentId,
    private readonly premiseStatementIds?: StatementIdCollection,
    private readonly conclusionStatementIds?: StatementIdCollection,
  ) {}

  static create(params: {
    documentId: string;
    argumentId: string;
    premiseStatementIds?: string[];
    conclusionStatementIds?: string[];
  }): Result<UpdateAtomicArgumentCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const argumentIdResult = AtomicArgumentId.create(params.argumentId);
    if (argumentIdResult.isErr()) {
      return err(argumentIdResult.error);
    }

    let premiseIds: StatementIdCollection | undefined;
    if (params.premiseStatementIds !== undefined) {
      const premiseIdsResult = StatementIdCollection.create(params.premiseStatementIds);
      if (premiseIdsResult.isErr()) {
        return err(premiseIdsResult.error);
      }
      premiseIds = premiseIdsResult.value;
    }

    let conclusionIds: StatementIdCollection | undefined;
    if (params.conclusionStatementIds !== undefined) {
      const conclusionIdsResult = StatementIdCollection.create(params.conclusionStatementIds);
      if (conclusionIdsResult.isErr()) {
        return err(conclusionIdsResult.error);
      }
      conclusionIds = conclusionIdsResult.value;
    }

    return ok(
      new UpdateAtomicArgumentCommand(
        documentIdResult.value,
        argumentIdResult.value,
        premiseIds,
        conclusionIds,
      ),
    );
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getArgumentId(): AtomicArgumentId {
    return this.argumentId;
  }

  getPremiseStatementIds(): StatementIdCollection | undefined {
    return this.premiseStatementIds;
  }

  getConclusionStatementIds(): StatementIdCollection | undefined {
    return this.conclusionStatementIds;
  }
}

export class UpdateArgumentSideLabelsCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly argumentId: AtomicArgumentId,
    private readonly sideLabels: TypedSideLabels,
  ) {}

  static create(params: {
    documentId: string;
    argumentId: string;
    sideLabels: {
      left?: string;
      right?: string;
    };
  }): Result<UpdateArgumentSideLabelsCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const argumentIdResult = AtomicArgumentId.create(params.argumentId);
    if (argumentIdResult.isErr()) {
      return err(argumentIdResult.error);
    }

    const sideLabelsResult = TypedSideLabels.create(params.sideLabels);
    if (sideLabelsResult.isErr()) {
      return err(sideLabelsResult.error);
    }

    return ok(
      new UpdateArgumentSideLabelsCommand(
        documentIdResult.value,
        argumentIdResult.value,
        sideLabelsResult.value,
      ),
    );
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getArgumentId(): AtomicArgumentId {
    return this.argumentId;
  }

  getSideLabels(): TypedSideLabels {
    return this.sideLabels;
  }
}

export class DeleteAtomicArgumentCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly argumentId: AtomicArgumentId,
  ) {}

  static create(params: {
    documentId: string;
    argumentId: string;
  }): Result<DeleteAtomicArgumentCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const argumentIdResult = AtomicArgumentId.create(params.argumentId);
    if (argumentIdResult.isErr()) {
      return err(argumentIdResult.error);
    }

    return ok(new DeleteAtomicArgumentCommand(documentIdResult.value, argumentIdResult.value));
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getArgumentId(): AtomicArgumentId {
    return this.argumentId;
  }
}

export class CreateTreeCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly position: Position2D,
  ) {}

  static create(params: {
    documentId: string;
    position: {
      x: number;
      y: number;
    };
  }): Result<CreateTreeCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const positionResult = Position2D.create(params.position.x, params.position.y);
    if (positionResult.isErr()) {
      return err(positionResult.error);
    }

    return ok(new CreateTreeCommand(documentIdResult.value, positionResult.value));
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getPosition(): Position2D {
    return this.position;
  }
}

export class MoveTreeCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly treeId: TreeId,
    private readonly position: Position2D,
  ) {}

  static create(params: {
    documentId: string;
    treeId: string;
    position: {
      x: number;
      y: number;
    };
  }): Result<MoveTreeCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const treeIdResult = TreeId.create(params.treeId);
    if (treeIdResult.isErr()) {
      return err(treeIdResult.error);
    }

    const positionResult = Position2D.create(params.position.x, params.position.y);
    if (positionResult.isErr()) {
      return err(positionResult.error);
    }

    return ok(
      new MoveTreeCommand(documentIdResult.value, treeIdResult.value, positionResult.value),
    );
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getTreeId(): TreeId {
    return this.treeId;
  }

  getPosition(): Position2D {
    return this.position;
  }
}

export class AttachNodeCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly treeId: TreeId,
    private readonly argumentId: AtomicArgumentId,
    private readonly parentNodeId: NodeId,
    private readonly premisePosition: PremisePosition,
    private readonly fromPosition?: PremisePosition,
  ) {}

  static create(params: {
    documentId: string;
    treeId: string;
    argumentId: string;
    parentNodeId: string;
    premisePosition: number;
    fromPosition?: number;
  }): Result<AttachNodeCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const treeIdResult = TreeId.create(params.treeId);
    if (treeIdResult.isErr()) {
      return err(treeIdResult.error);
    }

    const argumentIdResult = AtomicArgumentId.create(params.argumentId);
    if (argumentIdResult.isErr()) {
      return err(argumentIdResult.error);
    }

    const parentNodeIdResult = NodeId.create(params.parentNodeId);
    if (parentNodeIdResult.isErr()) {
      return err(parentNodeIdResult.error);
    }

    const premisePositionResult = PremisePosition.create(params.premisePosition);
    if (premisePositionResult.isErr()) {
      return err(premisePositionResult.error);
    }

    let fromPosition: PremisePosition | undefined;
    if (params.fromPosition !== undefined) {
      const fromPositionResult = PremisePosition.create(params.fromPosition);
      if (fromPositionResult.isErr()) {
        return err(fromPositionResult.error);
      }
      fromPosition = fromPositionResult.value;
    }

    return ok(
      new AttachNodeCommand(
        documentIdResult.value,
        treeIdResult.value,
        argumentIdResult.value,
        parentNodeIdResult.value,
        premisePositionResult.value,
        fromPosition,
      ),
    );
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getTreeId(): TreeId {
    return this.treeId;
  }

  getArgumentId(): AtomicArgumentId {
    return this.argumentId;
  }

  getParentNodeId(): NodeId {
    return this.parentNodeId;
  }

  getPremisePosition(): PremisePosition {
    return this.premisePosition;
  }

  getFromPosition(): PremisePosition | undefined {
    return this.fromPosition;
  }
}

export class CreateStatementCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly content: StatementContent,
  ) {}

  static create(params: {
    documentId: string;
    content: string;
  }): Result<CreateStatementCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const contentResult = StatementContent.create(params.content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    return ok(new CreateStatementCommand(documentIdResult.value, contentResult.value));
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getContent(): StatementContent {
    return this.content;
  }
}

export class UpdateStatementCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly statementId: StatementId,
    private readonly content: StatementContent,
  ) {}

  static create(params: {
    documentId: string;
    statementId: string;
    content: string;
  }): Result<UpdateStatementCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const statementIdResult = StatementId.create(params.statementId);
    if (statementIdResult.isErr()) {
      return err(statementIdResult.error);
    }

    const contentResult = StatementContent.create(params.content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    return ok(
      new UpdateStatementCommand(
        documentIdResult.value,
        statementIdResult.value,
        contentResult.value,
      ),
    );
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getStatementId(): StatementId {
    return this.statementId;
  }

  getContent(): StatementContent {
    return this.content;
  }
}

export class DeleteStatementCommand {
  private constructor(
    private readonly documentId: DocumentId,
    private readonly statementId: StatementId,
  ) {}

  static create(params: {
    documentId: string;
    statementId: string;
  }): Result<DeleteStatementCommand, ValidationError> {
    const documentIdResult = DocumentId.create(params.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const statementIdResult = StatementId.create(params.statementId);
    if (statementIdResult.isErr()) {
      return err(statementIdResult.error);
    }

    return ok(new DeleteStatementCommand(documentIdResult.value, statementIdResult.value));
  }

  getDocumentId(): DocumentId {
    return this.documentId;
  }

  getStatementId(): StatementId {
    return this.statementId;
  }
}
