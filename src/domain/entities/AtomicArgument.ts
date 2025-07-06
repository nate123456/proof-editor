import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../shared/result.js';
import { AtomicArgumentId } from '../shared/value-objects.js';
import type { Statement } from './Statement.js';

export interface SideLabels {
  left?: string;
  right?: string;
}

export interface StatementConnection {
  statement: Statement;
  fromConclusionPosition: number;
  toPremisePosition: number;
}

export class AtomicArgument {
  private constructor(
    private readonly id: AtomicArgumentId,
    private premises: Statement[],
    private conclusions: Statement[],
    private readonly createdAt: number,
    private modifiedAt: number,
    private sideLabels: SideLabels = {},
  ) {}

  static create(
    premises: Statement[] = [],
    conclusions: Statement[] = [],
    sideLabels: SideLabels = {},
  ): Result<AtomicArgument, ValidationError> {
    const now = Date.now();

    return ok(
      new AtomicArgument(
        AtomicArgumentId.generate(),
        [...premises],
        [...conclusions],
        now,
        now,
        sideLabels,
      ),
    );
  }

  static createBootstrap(): AtomicArgument {
    const now = Date.now();
    return new AtomicArgument(AtomicArgumentId.generate(), [], [], now, now, {});
  }

  static reconstruct(
    id: AtomicArgumentId,
    premises: Statement[],
    conclusions: Statement[],
    createdAt: number,
    modifiedAt: number,
    sideLabels: SideLabels = {},
  ): Result<AtomicArgument, ValidationError> {
    if (createdAt < 0 || modifiedAt < 0) {
      return err(new ValidationError('Negative timestamp values are not allowed'));
    }

    if (modifiedAt < createdAt) {
      return err(new ValidationError('modified timestamp cannot be before created timestamp'));
    }

    return ok(
      new AtomicArgument(id, [...premises], [...conclusions], createdAt, modifiedAt, sideLabels),
    );
  }

  getId(): AtomicArgumentId {
    return this.id;
  }

  getPremises(): readonly Statement[] {
    return [...this.premises];
  }

  getConclusions(): readonly Statement[] {
    return [...this.conclusions];
  }

  getPremiseAt(index: number): Statement | undefined {
    return this.premises[index];
  }

  getConclusionAt(index: number): Statement | undefined {
    return this.conclusions[index];
  }

  getPremiseCount(): number {
    return this.premises.length;
  }

  getConclusionCount(): number {
    return this.conclusions.length;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getModifiedAt(): number {
    return this.modifiedAt;
  }

  getSideLabels(): SideLabels {
    return { ...this.sideLabels };
  }

  addPremise(statement: Statement): Result<void, ValidationError> {
    this.premises.push(statement);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  addConclusion(statement: Statement): Result<void, ValidationError> {
    this.conclusions.push(statement);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  setPremiseAt(index: number, statement: Statement): Result<void, ValidationError> {
    if (index < 0 || index >= this.premises.length) {
      return err(new ValidationError('Invalid premise position'));
    }

    this.premises[index] = statement;
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  setConclusionAt(index: number, statement: Statement): Result<void, ValidationError> {
    if (index < 0 || index >= this.conclusions.length) {
      return err(new ValidationError('Invalid conclusion position'));
    }

    this.conclusions[index] = statement;
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  removePremiseAt(index: number): Result<Statement, ValidationError> {
    if (index < 0 || index >= this.premises.length) {
      return err(new ValidationError('Invalid premise position'));
    }

    const removed = this.premises.splice(index, 1)[0];
    if (!removed) {
      return err(new ValidationError('Failed to remove premise'));
    }

    this.modifiedAt = Date.now();
    return ok(removed);
  }

  removeConclusionAt(index: number): Result<Statement, ValidationError> {
    if (index < 0 || index >= this.conclusions.length) {
      return err(new ValidationError('Invalid conclusion position'));
    }

    const removed = this.conclusions.splice(index, 1)[0];
    if (!removed) {
      return err(new ValidationError('Failed to remove conclusion'));
    }

    this.modifiedAt = Date.now();
    return ok(removed);
  }

  updateSideLabels(newSideLabels: SideLabels): Result<void, ValidationError> {
    this.sideLabels = { ...newSideLabels };
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  setLeftSideLabel(label?: string): Result<void, ValidationError> {
    if (label === undefined) {
      delete this.sideLabels.left;
    } else {
      this.sideLabels.left = label;
    }
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  setRightSideLabel(label?: string): Result<void, ValidationError> {
    if (label === undefined) {
      delete this.sideLabels.right;
    } else {
      this.sideLabels.right = label;
    }
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  findConnectionsTo(other: AtomicArgument): StatementConnection[] {
    const connections: StatementConnection[] = [];

    this.conclusions.forEach((conclusion, fromPos) => {
      other.premises.forEach((premise, toPos) => {
        if (conclusion.equals(premise)) {
          connections.push({
            statement: conclusion,
            fromConclusionPosition: fromPos,
            toPremisePosition: toPos,
          });
        }
      });
    });

    return connections;
  }

  canConnectAt(conclusionIndex: number, other: AtomicArgument, premiseIndex: number): boolean {
    const conclusion = this.conclusions[conclusionIndex];
    const premise = other.premises[premiseIndex];

    return conclusion !== undefined && premise !== undefined && conclusion.equals(premise);
  }

  connectConclusionToPremise(
    conclusionIndex: number,
    targetArg: AtomicArgument,
    premiseIndex: number,
    sharedStatement: Statement,
  ): Result<void, ValidationError> {
    if (conclusionIndex < 0 || conclusionIndex >= this.conclusions.length) {
      return err(new ValidationError('Invalid conclusion position'));
    }

    if (premiseIndex < 0 || premiseIndex >= targetArg.premises.length) {
      return err(new ValidationError('Invalid premise position'));
    }

    this.conclusions[conclusionIndex] = sharedStatement;
    targetArg.premises[premiseIndex] = sharedStatement;

    this.modifiedAt = Date.now();
    targetArg.modifiedAt = Date.now();

    return ok(undefined);
  }

  isDirectlyConnectedTo(other: AtomicArgument): boolean {
    return this.findConnectionsTo(other).length > 0 || other.findConnectionsTo(this).length > 0;
  }

  sharesStatementWith(other: AtomicArgument): boolean {
    for (const premise of this.premises) {
      if (
        other.premises.some((p) => p.equals(premise)) ||
        other.conclusions.some((c) => c.equals(premise))
      ) {
        return true;
      }
    }

    for (const conclusion of this.conclusions) {
      if (
        other.premises.some((p) => p.equals(conclusion)) ||
        other.conclusions.some((c) => c.equals(conclusion))
      ) {
        return true;
      }
    }

    return false;
  }

  createBranchFromConclusion(conclusionIndex: number): Result<AtomicArgument, ValidationError> {
    const conclusion = this.conclusions[conclusionIndex];
    if (!conclusion) {
      return err(new ValidationError('Invalid conclusion index for branching'));
    }

    return AtomicArgument.create([conclusion]);
  }

  createBranchToPremise(premiseIndex: number): Result<AtomicArgument, ValidationError> {
    const premise = this.premises[premiseIndex];
    if (!premise) {
      return err(new ValidationError('Invalid premise index for branching'));
    }

    return AtomicArgument.create([], [premise]);
  }

  isBootstrapArgument(): boolean {
    return this.premises.length === 0 && this.conclusions.length === 0;
  }

  isBootstrap(): boolean {
    return this.isBootstrapArgument();
  }

  canPopulate(): boolean {
    return this.isBootstrap();
  }

  hasLeftSideLabel(): boolean {
    return (
      this.sideLabels.left !== undefined &&
      this.sideLabels.left !== null &&
      this.sideLabels.left.trim().length > 0
    );
  }

  hasRightSideLabel(): boolean {
    return (
      this.sideLabels.right !== undefined &&
      this.sideLabels.right !== null &&
      this.sideLabels.right.trim().length > 0
    );
  }

  hasSideLabels(): boolean {
    return this.hasLeftSideLabel() || this.hasRightSideLabel();
  }

  equals(other: AtomicArgument | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    return this.id.equals(other.id);
  }

  isComplete(): boolean {
    return this.premises.length > 0 && this.conclusions.length > 0;
  }

  isEmpty(): boolean {
    return this.premises.length === 0 && this.conclusions.length === 0;
  }

  validateConnectionSafety(other: AtomicArgument): Result<boolean, ValidationError> {
    if (this.equals(other)) {
      return err(new ValidationError('Cannot connect argument to itself'));
    }

    if (this.conclusions.length === 0) {
      return err(new ValidationError('Source argument has no conclusions'));
    }

    if (other.premises.length === 0) {
      return err(new ValidationError('Target argument has no premises'));
    }

    const connections = this.findConnectionsTo(other);
    if (connections.length === 0) {
      return err(new ValidationError('Arguments cannot connect: no matching statements'));
    }

    const reverseConnections = other.findConnectionsTo(this);
    if (reverseConnections.length > 0) {
      return err(new ValidationError('Connection would create direct cycle'));
    }

    return ok(true);
  }

  toString(): string {
    const premiseCount = this.premises.length;
    const conclusionCount = this.conclusions.length;
    const status = this.isBootstrapArgument() ? ' (bootstrap)' : '';
    const sideLabels = this.hasSideLabels()
      ? ` [${this.sideLabels.left || ''}|${this.sideLabels.right || ''}]`
      : '';
    return `AtomicArgument(${this.id.getValue()}): premises(${premiseCount}) → conclusions(${conclusionCount})${status}${sideLabels}`;
  }
}
