import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../shared/result.js';
import {
  AtomicArgumentId,
  SideLabel,
  SideLabels,
  StatementCollection,
  Timestamp,
} from '../shared/value-objects/index.js';
import type { Statement } from './Statement.js';

export class AtomicArgument {
  private constructor(
    private readonly id: AtomicArgumentId,
    private premises: StatementCollection,
    private conclusions: StatementCollection,
    private readonly createdAt: Timestamp,
    private modifiedAt: Timestamp,
    private sideLabels: SideLabels = SideLabels.empty(),
  ) {}

  /**
   * @deprecated Use AtomicArgumentFactory.create() instead
   */
  static create(
    premises: Statement[] = [],
    conclusions: Statement[] = [],
    sideLabels: SideLabels = SideLabels.empty(),
  ): Result<AtomicArgument, ValidationError> {
    const premisesCollectionResult = StatementCollection.create(premises);
    if (premisesCollectionResult.isErr()) {
      return err(premisesCollectionResult.error);
    }

    const conclusionsCollectionResult = StatementCollection.create(conclusions);
    if (conclusionsCollectionResult.isErr()) {
      return err(conclusionsCollectionResult.error);
    }

    const now = Timestamp.now();

    return ok(
      new AtomicArgument(
        AtomicArgumentId.generate(),
        premisesCollectionResult.value,
        conclusionsCollectionResult.value,
        now,
        now,
        sideLabels,
      ),
    );
  }

  /**
   * @deprecated Use AtomicArgumentFactory.createBootstrap() instead
   */
  static createBootstrap(): AtomicArgument {
    const now = Timestamp.now();
    return new AtomicArgument(
      AtomicArgumentId.generate(),
      StatementCollection.empty(),
      StatementCollection.empty(),
      now,
      now,
      SideLabels.empty(),
    );
  }

  static reconstruct(
    id: AtomicArgumentId,
    premises: Statement[],
    conclusions: Statement[],
    createdAt: number,
    modifiedAt: number,
    sideLabels: { left?: string; right?: string } = {},
  ): Result<AtomicArgument, ValidationError> {
    const timestampCreatedResult = Timestamp.create(createdAt);
    if (timestampCreatedResult.isErr()) {
      return err(timestampCreatedResult.error);
    }

    const timestampModifiedResult = Timestamp.create(modifiedAt);
    if (timestampModifiedResult.isErr()) {
      return err(timestampModifiedResult.error);
    }

    if (timestampModifiedResult.value.isBefore(timestampCreatedResult.value)) {
      return err(new ValidationError('modified timestamp cannot be before created timestamp'));
    }

    const sideLabelsResult = SideLabels.fromStrings(sideLabels);
    if (sideLabelsResult.isErr()) {
      return err(sideLabelsResult.error);
    }

    const premisesCollectionResult = StatementCollection.create(premises);
    if (premisesCollectionResult.isErr()) {
      return err(premisesCollectionResult.error);
    }

    const conclusionsCollectionResult = StatementCollection.create(conclusions);
    if (conclusionsCollectionResult.isErr()) {
      return err(conclusionsCollectionResult.error);
    }

    return ok(
      new AtomicArgument(
        id,
        premisesCollectionResult.value,
        conclusionsCollectionResult.value,
        timestampCreatedResult.value,
        timestampModifiedResult.value,
        sideLabelsResult.value,
      ),
    );
  }

  getPremises(): readonly Statement[] {
    return this.premises.toArray();
  }

  getConclusions(): readonly Statement[] {
    return this.conclusions.toArray();
  }

  getPremiseAt(index: number): Statement | undefined {
    return this.premises.getAt(index);
  }

  getConclusionAt(index: number): Statement | undefined {
    return this.conclusions.getAt(index);
  }

  getPremiseCount(): number {
    return this.premises.size();
  }

  getConclusionCount(): number {
    return this.conclusions.size();
  }

  getId(): AtomicArgumentId {
    return this.id;
  }

  getCreatedAt(): number {
    return this.createdAt.getValue();
  }

  getModifiedAt(): number {
    return this.modifiedAt.getValue();
  }

  getSideLabels(): { left?: string; right?: string } {
    return this.sideLabels.toStrings();
  }

  addPremise(statement: Statement): Result<void, ValidationError> {
    const result = this.premises.add(statement);
    if (result.isErr()) {
      return err(result.error);
    }
    this.premises = result.value;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  addConclusion(statement: Statement): Result<void, ValidationError> {
    const result = this.conclusions.add(statement);
    if (result.isErr()) {
      return err(result.error);
    }
    this.conclusions = result.value;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  setPremiseAt(index: number, statement: Statement): Result<void, ValidationError> {
    const result = this.premises.replace(index, statement);
    if (result.isErr()) {
      return err(new ValidationError('Invalid premise position'));
    }
    this.premises = result.value;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  setConclusionAt(index: number, statement: Statement): Result<void, ValidationError> {
    const result = this.conclusions.replace(index, statement);
    if (result.isErr()) {
      return err(new ValidationError('Invalid conclusion position'));
    }
    this.conclusions = result.value;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  removePremiseAt(index: number): Result<Statement, ValidationError> {
    const statement = this.premises.getAt(index);
    if (!statement) {
      return err(new ValidationError('Invalid premise position'));
    }

    const result = this.premises.remove(statement.getId());
    if (result.isErr()) {
      return err(new ValidationError('Failed to remove premise'));
    }

    this.premises = result.value;
    this.modifiedAt = Timestamp.now();
    return ok(statement);
  }

  removeConclusionAt(index: number): Result<Statement, ValidationError> {
    const statement = this.conclusions.getAt(index);
    if (!statement) {
      return err(new ValidationError('Invalid conclusion position'));
    }

    const result = this.conclusions.remove(statement.getId());
    if (result.isErr()) {
      return err(new ValidationError('Failed to remove conclusion'));
    }

    this.conclusions = result.value;
    this.modifiedAt = Timestamp.now();
    return ok(statement);
  }

  updateSideLabels(newSideLabels: {
    left?: string;
    right?: string;
  }): Result<void, ValidationError> {
    const sideLabelsResult = SideLabels.fromStrings(newSideLabels);
    if (sideLabelsResult.isErr()) {
      return err(sideLabelsResult.error);
    }
    this.sideLabels = sideLabelsResult.value;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  setLeftSideLabel(label?: string): Result<void, ValidationError> {
    if (label === undefined) {
      this.sideLabels = this.sideLabels.withLeft(undefined);
    } else {
      const labelResult = SideLabel.create(label);
      if (labelResult.isErr()) {
        return err(labelResult.error);
      }
      this.sideLabels = this.sideLabels.withLeft(labelResult.value);
    }
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  setRightSideLabel(label?: string): Result<void, ValidationError> {
    if (label === undefined) {
      this.sideLabels = this.sideLabels.withRight(undefined);
    } else {
      const labelResult = SideLabel.create(label);
      if (labelResult.isErr()) {
        return err(labelResult.error);
      }
      this.sideLabels = this.sideLabels.withRight(labelResult.value);
    }
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  isBootstrapArgument(): boolean {
    return this.premises.isEmpty() && this.conclusions.isEmpty();
  }

  isBootstrap(): boolean {
    return this.isBootstrapArgument();
  }

  canPopulate(): boolean {
    return this.isBootstrap();
  }

  isEmpty(): boolean {
    return this.premises.isEmpty() && this.conclusions.isEmpty();
  }

  hasLeftSideLabel(): boolean {
    return this.sideLabels.hasLeft();
  }

  hasRightSideLabel(): boolean {
    return this.sideLabels.hasRight();
  }

  hasSideLabels(): boolean {
    return this.sideLabels.hasAny();
  }

  isEqualTo(other: AtomicArgument | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    return this.id.equals(other.id);
  }

  equals(other: AtomicArgument | null | undefined): boolean {
    return this.isEqualTo(other);
  }

  isComplete(): boolean {
    return !this.premises.isEmpty() && !this.conclusions.isEmpty();
  }

  isDefinition(): boolean {
    return this.premises.isEmpty();
  }

  toString(): string {
    const premiseCount = this.premises.size();
    const conclusionCount = this.conclusions.size();
    const status = this.isBootstrapArgument() ? ' (bootstrap)' : '';
    const sideLabels = this.hasSideLabels() ? ` ${this.sideLabels.toString()}` : '';
    return `AtomicArgument(${this.id.getValue()}): premises(${premiseCount}) → conclusions(${conclusionCount})${status}${sideLabels}`;
  }

  // Legacy methods for backward compatibility
  hasPremiseSet(): boolean {
    return !this.premises.isEmpty();
  }

  hasConclusionSet(): boolean {
    return !this.conclusions.isEmpty();
  }

  createBranchFromConclusion(conclusionIndex: number = 0): Result<AtomicArgument, ValidationError> {
    const conclusion = this.getConclusionAt(conclusionIndex);
    if (!conclusion) {
      return err(new ValidationError('Parent argument has no conclusion to branch from'));
    }

    return AtomicArgument.create([conclusion], []);
  }

  static fromFactory(
    id: AtomicArgumentId,
    premises: StatementCollection,
    conclusions: StatementCollection,
    createdAt: Timestamp,
    modifiedAt: Timestamp,
    sideLabels: SideLabels,
  ): AtomicArgument {
    return new AtomicArgument(id, premises, conclusions, createdAt, modifiedAt, sideLabels);
  }
}
