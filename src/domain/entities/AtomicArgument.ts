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
    private premiseSet: OrderedSetId | null,
    private conclusionSet: OrderedSetId | null,
    private readonly createdAt: number,
    private modifiedAt: number,
    private sideLabels: SideLabels = {},
  ) {}

  static create(
    premiseSet?: OrderedSetId,
    conclusionSet?: OrderedSetId,
    sideLabels: SideLabels = {},
  ): Result<AtomicArgument, ValidationError> {
    const now = Date.now();

    return ok(
      new AtomicArgument(
        AtomicArgumentId.generate(),
        premiseSet ?? null,
        conclusionSet ?? null,
        now,
        now,
        sideLabels,
      ),
    );
  }

  static createComplete(
    premiseSet: OrderedSetId,
    conclusionSet: OrderedSetId,
    sideLabels: SideLabels = {},
  ): AtomicArgument {
    const now = Date.now();

    return new AtomicArgument(
      AtomicArgumentId.generate(),
      premiseSet,
      conclusionSet,
      now,
      now,
      sideLabels,
    );
  }

  static reconstruct(
    id: AtomicArgumentId,
    premiseSet: OrderedSetId | null,
    conclusionSet: OrderedSetId | null,
    createdAt: number,
    modifiedAt: number,
    sideLabels: SideLabels = {},
  ): Result<AtomicArgument, ValidationError> {
    return ok(new AtomicArgument(id, premiseSet, conclusionSet, createdAt, modifiedAt, sideLabels));
  }

  getId(): AtomicArgumentId {
    return this.id;
  }

  getPremiseSet(): OrderedSetId | null {
    return this.premiseSet;
  }

  getConclusionSet(): OrderedSetId | null {
    return this.conclusionSet;
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
    if (this.premiseSet === orderedSetRef) {
      return;
    }

    this.premiseSet = orderedSetRef;
    this.modifiedAt = Date.now();
  }

  setConclusionSetRef(orderedSetRef: OrderedSetId | null): void {
    if (this.conclusionSet === orderedSetRef) {
      return;
    }

    this.conclusionSet = orderedSetRef;
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
    return this.premiseSet !== null;
  }

  hasConclusionSet(): boolean {
    return this.conclusionSet !== null;
  }

  hasEmptyPremiseSet(): boolean {
    return this.premiseSet === null;
  }

  hasEmptyConclusionSet(): boolean {
    return this.conclusionSet === null;
  }

  /**
   * CRITICAL: Check if this argument can connect to the premise of another.
   * Connection exists when conclusion OrderedSet object IS the same object as premise OrderedSet.
   * This uses object identity (===), not content equality.
   */
  canConnectToPremiseOf(other: AtomicArgument): boolean {
    return (
      this.conclusionSet !== null &&
      other.premiseSet !== null &&
      this.conclusionSet.equals(other.premiseSet)
    );
  }

  /**
   * CRITICAL: Check if this argument can connect to the conclusion of another.
   * Connection exists when premise OrderedSet object IS the same object as conclusion OrderedSet.
   * This uses object identity (===), not content equality.
   */
  canConnectToConclusionOf(other: AtomicArgument): boolean {
    return (
      this.premiseSet !== null &&
      other.conclusionSet !== null &&
      this.premiseSet.equals(other.conclusionSet)
    );
  }

  isDirectlyConnectedTo(other: AtomicArgument): boolean {
    return this.canConnectToPremiseOf(other) || this.canConnectToConclusionOf(other);
  }

  /**
   * CRITICAL: Check if this argument shares any OrderedSet object with another.
   * Uses object identity (===), not content equality.
   */
  sharesOrderedSetWith(other: AtomicArgument): boolean {
    if (this.premiseSet && other.premiseSet && this.premiseSet.equals(other.premiseSet)) {
      return true;
    }

    if (
      this.conclusionSet &&
      other.conclusionSet &&
      this.conclusionSet.equals(other.conclusionSet)
    ) {
      return true;
    }

    return this.isDirectlyConnectedTo(other);
  }

  createBranchFromConclusion(): Result<AtomicArgument, ValidationError> {
    if (!this.conclusionSet) {
      return err(new ValidationError('Cannot branch from argument without conclusion set'));
    }

    return AtomicArgument.create(this.conclusionSet);
  }

  createBranchToPremise(): Result<AtomicArgument, ValidationError> {
    if (!this.premiseSet) {
      return err(new ValidationError('Cannot branch to argument without premise set'));
    }

    return AtomicArgument.create(undefined, this.premiseSet);
  }

  createChildArgument(): Result<AtomicArgument, ValidationError> {
    if (!this.conclusionSet) {
      return err(new ValidationError('Cannot create child argument without conclusion set'));
    }

    return AtomicArgument.create(this.conclusionSet);
  }

  /**
   * Create a bootstrap atomic argument with no premises or conclusions.
   * This bypasses all validation for the initial empty state.
   */
  static createBootstrap(): AtomicArgument {
    const now = Date.now();
    return new AtomicArgument(AtomicArgumentId.generate(), null, null, now, now, {});
  }

  /**
   * Check if this is a bootstrap argument (empty premises and conclusions).
   */
  isBootstrapArgument(): boolean {
    return this.premiseSet === null && this.conclusionSet === null;
  }

  /**
   * An alias for isBootstrapArgument for clarity.
   */
  isBootstrap(): boolean {
    return this.isBootstrapArgument();
  }

  /**
   * Check if this argument can be populated (must be in bootstrap state).
   */
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

  equals(other: AtomicArgument): boolean {
    return this.id.equals(other.id);
  }

  isComplete(): boolean {
    return this.premiseSet !== null && this.conclusionSet !== null;
  }

  isEmpty(): boolean {
    return this.premiseSet === null && this.conclusionSet === null;
  }

  /**
   * CRITICAL: Check if this argument can connect to another using object identity.
   * Connection exists when conclusion OrderedSet object IS the same object as premise OrderedSet.
   */
  canConnectTo(other: AtomicArgument): boolean {
    if (!this.conclusionSet || !other.premiseSet) {
      return false;
    }
    return this.conclusionSet.equals(other.premiseSet);
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

    if (!this.conclusionSet) {
      return err(new ValidationError('Source argument has no conclusion set'));
    }

    if (!other.premiseSet) {
      return err(new ValidationError('Target argument has no premise set'));
    }

    if (!this.canConnectTo(other)) {
      return err(
        new ValidationError('Arguments cannot connect: conclusion set does not match premise set'),
      );
    }

    if (this.wouldCreateDirectCycle(other)) {
      return err(new ValidationError('Connection would create direct cycle'));
    }

    return ok(true);
  }

  toString(): string {
    const premiseRef = this.premiseSet?.getValue() ?? 'empty';
    const conclusionRef = this.conclusionSet?.getValue() ?? 'empty';
    return `${premiseRef} → ${conclusionRef}`;
  }
}
