import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../shared/result.js';
import { AtomicArgumentId, type OrderedSetId } from '../shared/value-objects.js';

export interface SideLabels {
  left?: string;
  right?: string;
}

export class AtomicArgument {
  private constructor(
    private readonly id: AtomicArgumentId,
    private premiseSetRef: OrderedSetId | null,
    private conclusionSetRef: OrderedSetId | null,
    private readonly createdAt: number,
    private modifiedAt: number,
    private sideLabels: SideLabels = {},
  ) {}

  static create(
    premiseSetRef?: OrderedSetId,
    conclusionSetRef?: OrderedSetId,
    sideLabels: SideLabels = {},
  ): Result<AtomicArgument, ValidationError> {
    const now = Date.now();

    return ok(
      new AtomicArgument(
        AtomicArgumentId.generate(),
        premiseSetRef ?? null,
        conclusionSetRef ?? null,
        now,
        now,
        sideLabels,
      ),
    );
  }

  static createComplete(
    premiseSetRef: OrderedSetId,
    conclusionSetRef: OrderedSetId,
    sideLabels: SideLabels = {},
  ): AtomicArgument {
    const now = Date.now();

    return new AtomicArgument(
      AtomicArgumentId.generate(),
      premiseSetRef,
      conclusionSetRef,
      now,
      now,
      sideLabels,
    );
  }

  static reconstruct(
    id: AtomicArgumentId,
    premiseSetRef: OrderedSetId | null,
    conclusionSetRef: OrderedSetId | null,
    createdAt: number,
    modifiedAt: number,
    sideLabels: SideLabels = {},
  ): Result<AtomicArgument, ValidationError> {
    return ok(
      new AtomicArgument(id, premiseSetRef, conclusionSetRef, createdAt, modifiedAt, sideLabels),
    );
  }

  getId(): AtomicArgumentId {
    return this.id;
  }

  getPremiseSetRef(): OrderedSetId | null {
    return this.premiseSetRef;
  }

  getConclusionSetRef(): OrderedSetId | null {
    return this.conclusionSetRef;
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

  setPremiseSetRef(orderedSetRef: OrderedSetId | null): void {
    if (
      this.premiseSetRef === orderedSetRef ||
      (this.premiseSetRef && orderedSetRef && this.premiseSetRef.equals(orderedSetRef))
    ) {
      return;
    }

    this.premiseSetRef = orderedSetRef;
    this.modifiedAt = Date.now();
  }

  setConclusionSetRef(orderedSetRef: OrderedSetId | null): void {
    if (
      this.conclusionSetRef === orderedSetRef ||
      (this.conclusionSetRef && orderedSetRef && this.conclusionSetRef.equals(orderedSetRef))
    ) {
      return;
    }

    this.conclusionSetRef = orderedSetRef;
    this.modifiedAt = Date.now();
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

  hasPremiseSet(): boolean {
    return this.premiseSetRef !== null;
  }

  hasConclusionSet(): boolean {
    return this.conclusionSetRef !== null;
  }

  hasEmptyPremiseSet(): boolean {
    return this.premiseSetRef === null;
  }

  hasEmptyConclusionSet(): boolean {
    return this.conclusionSetRef === null;
  }

  canConnectToPremiseOf(other: AtomicArgument): boolean {
    return (
      this.conclusionSetRef !== null &&
      other.premiseSetRef !== null &&
      this.conclusionSetRef.equals(other.premiseSetRef)
    );
  }

  canConnectToConclusionOf(other: AtomicArgument): boolean {
    return (
      this.premiseSetRef !== null &&
      other.conclusionSetRef !== null &&
      this.premiseSetRef.equals(other.conclusionSetRef)
    );
  }

  isDirectlyConnectedTo(other: AtomicArgument): boolean {
    return this.canConnectToPremiseOf(other) || this.canConnectToConclusionOf(other);
  }

  sharesOrderedSetWith(other: AtomicArgument): boolean {
    if (
      this.premiseSetRef &&
      other.premiseSetRef &&
      this.premiseSetRef.equals(other.premiseSetRef)
    ) {
      return true;
    }

    if (
      this.conclusionSetRef &&
      other.conclusionSetRef &&
      this.conclusionSetRef.equals(other.conclusionSetRef)
    ) {
      return true;
    }

    return this.isDirectlyConnectedTo(other);
  }

  createBranchFromConclusion(): Result<AtomicArgument, ValidationError> {
    if (!this.conclusionSetRef) {
      return err(new ValidationError('Cannot branch from argument without conclusion set'));
    }

    return AtomicArgument.create(this.conclusionSetRef);
  }

  createBranchToPremise(): Result<AtomicArgument, ValidationError> {
    if (!this.premiseSetRef) {
      return err(new ValidationError('Cannot branch to argument without premise set'));
    }

    return AtomicArgument.create(undefined, this.premiseSetRef);
  }

  createChildArgument(): AtomicArgument {
    if (!this.conclusionSetRef) {
      throw new ValidationError('Cannot create child argument without conclusion set');
    }

    const result = AtomicArgument.create(this.conclusionSetRef);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  isBootstrapArgument(): boolean {
    return this.premiseSetRef === null && this.conclusionSetRef === null;
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

  equals(other: AtomicArgument): boolean {
    return this.id.equals(other.id);
  }

  isComplete(): boolean {
    return this.premiseSetRef !== null && this.conclusionSetRef !== null;
  }

  isEmpty(): boolean {
    return this.premiseSetRef === null && this.conclusionSetRef === null;
  }

  canConnectTo(other: AtomicArgument): boolean {
    if (!this.conclusionSetRef || !other.premiseSetRef) {
      return false;
    }
    return this.conclusionSetRef.equals(other.premiseSetRef);
  }

  wouldCreateDirectCycle(other: AtomicArgument): boolean {
    if (!this.canConnectTo(other)) {
      return false;
    }

    return other.canConnectTo(this);
  }

  sharesSetWith(other: AtomicArgument): boolean {
    return this.sharesOrderedSetWith(other);
  }

  validateConnectionSafety(other: AtomicArgument): Result<boolean, ValidationError> {
    if (this.equals(other)) {
      return err(new ValidationError('Cannot connect argument to itself'));
    }

    if (!this.conclusionSetRef) {
      return err(new ValidationError('Source argument has no conclusion set'));
    }

    if (!other.premiseSetRef) {
      return err(new ValidationError('Target argument has no premise set'));
    }

    if (this.wouldCreateDirectCycle(other)) {
      return err(new ValidationError('Connection would create direct cycle'));
    }

    return ok(true);
  }

  toString(): string {
    const premiseRef = this.premiseSetRef?.getValue() ?? 'empty';
    const conclusionRef = this.conclusionSetRef?.getValue() ?? 'empty';
    return `${premiseRef} → ${conclusionRef}`;
  }
}
