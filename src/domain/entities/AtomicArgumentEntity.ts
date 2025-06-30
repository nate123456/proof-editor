import type { Result } from "../shared/result.js";
import { success, failure, ValidationError } from "../shared/result.js";
import { AtomicArgumentId, OrderedSetId } from "../shared/value-objects.js";

export interface SideLabels {
  left?: string;
  right?: string;
}

export class AtomicArgumentEntity {
  private constructor(
    private readonly id: AtomicArgumentId,
    private premiseSetRef: OrderedSetId | null,
    private conclusionSetRef: OrderedSetId | null,
    private readonly createdAt: number,
    private modifiedAt: number,
    private sideLabels: SideLabels = {}
  ) {}

  static create(
    premiseSetRef?: OrderedSetId,
    conclusionSetRef?: OrderedSetId,
    sideLabels: SideLabels = {}
  ): Result<AtomicArgumentEntity, ValidationError> {
    const now = Date.now();

    return success(new AtomicArgumentEntity(
      AtomicArgumentId.generate(),
      premiseSetRef || null,
      conclusionSetRef || null,
      now,
      now,
      sideLabels
    ));
  }

  static createComplete(
    premiseSetRef: OrderedSetId,
    conclusionSetRef: OrderedSetId,
    sideLabels: SideLabels = {}
  ): AtomicArgumentEntity {
    const now = Date.now();

    return new AtomicArgumentEntity(
      AtomicArgumentId.generate(),
      premiseSetRef,
      conclusionSetRef,
      now,
      now,
      sideLabels
    );
  }

  static reconstruct(
    id: AtomicArgumentId,
    premiseSetRef: OrderedSetId | null,
    conclusionSetRef: OrderedSetId | null,
    createdAt: number,
    modifiedAt: number,
    sideLabels: SideLabels = {}
  ): Result<AtomicArgumentEntity, ValidationError> {
    return success(new AtomicArgumentEntity(
      id,
      premiseSetRef,
      conclusionSetRef,
      createdAt,
      modifiedAt,
      sideLabels
    ));
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
    if (this.premiseSetRef?.equals(orderedSetRef ?? null as any)) {
      return;
    }

    this.premiseSetRef = orderedSetRef;
    this.modifiedAt = Date.now();
  }

  setConclusionSetRef(orderedSetRef: OrderedSetId | null): void {
    if (this.conclusionSetRef?.equals(orderedSetRef ?? null as any)) {
      return;
    }

    this.conclusionSetRef = orderedSetRef;
    this.modifiedAt = Date.now();
  }

  updateSideLabels(newSideLabels: SideLabels): Result<void, ValidationError> {
    this.sideLabels = { ...newSideLabels };
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  setLeftSideLabel(label?: string): Result<void, ValidationError> {
    this.sideLabels.left = label;
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  setRightSideLabel(label?: string): Result<void, ValidationError> {
    this.sideLabels.right = label;
    this.modifiedAt = Date.now();
    return success(undefined);
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

  canConnectToPremiseOf(other: AtomicArgumentEntity): boolean {
    return this.conclusionSetRef !== null && 
           this.conclusionSetRef.equals(other.premiseSetRef!);
  }

  canConnectToConclusionOf(other: AtomicArgumentEntity): boolean {
    return this.premiseSetRef !== null && 
           this.premiseSetRef.equals(other.conclusionSetRef!);
  }

  isDirectlyConnectedTo(other: AtomicArgumentEntity): boolean {
    return this.canConnectToPremiseOf(other) || this.canConnectToConclusionOf(other);
  }

  sharesOrderedSetWith(other: AtomicArgumentEntity): boolean {
    if (this.premiseSetRef && other.premiseSetRef && 
        this.premiseSetRef.equals(other.premiseSetRef)) {
      return true;
    }

    if (this.conclusionSetRef && other.conclusionSetRef && 
        this.conclusionSetRef.equals(other.conclusionSetRef)) {
      return true;
    }

    return this.isDirectlyConnectedTo(other);
  }

  createBranchFromConclusion(): Result<AtomicArgumentEntity, ValidationError> {
    if (!this.conclusionSetRef) {
      return failure(new ValidationError("Cannot branch from argument without conclusion set"));
    }

    return AtomicArgumentEntity.create(this.conclusionSetRef);
  }

  createBranchToPremise(): Result<AtomicArgumentEntity, ValidationError> {
    if (!this.premiseSetRef) {
      return failure(new ValidationError("Cannot branch to argument without premise set"));
    }

    return AtomicArgumentEntity.create(undefined, this.premiseSetRef);
  }

  createChildArgument(): AtomicArgumentEntity {
    if (!this.conclusionSetRef) {
      throw new ValidationError("Cannot create child argument without conclusion set");
    }

    const result = AtomicArgumentEntity.create(this.conclusionSetRef);
    if (!result.success) {
      throw (result as { success: false; error: ValidationError }).error;
    }
    return result.data;
  }

  isBootstrapArgument(): boolean {
    return this.premiseSetRef === null && this.conclusionSetRef === null;
  }

  hasLeftSideLabel(): boolean {
    return this.sideLabels.left !== undefined && this.sideLabels.left.trim().length > 0;
  }

  hasRightSideLabel(): boolean {
    return this.sideLabels.right !== undefined && this.sideLabels.right.trim().length > 0;
  }

  hasSideLabels(): boolean {
    return this.hasLeftSideLabel() || this.hasRightSideLabel();
  }

  equals(other: AtomicArgumentEntity): boolean {
    return this.id.equals(other.id);
  }

  isComplete(): boolean {
    return this.premiseSetRef !== null && this.conclusionSetRef !== null;
  }

  isEmpty(): boolean {
    return this.premiseSetRef === null && this.conclusionSetRef === null;
  }

  canConnectTo(other: AtomicArgumentEntity): boolean {
    if (!this.conclusionSetRef || !other.premiseSetRef) {
      return false;
    }
    return this.conclusionSetRef.equals(other.premiseSetRef);
  }

  wouldCreateDirectCycle(other: AtomicArgumentEntity): boolean {
    if (!this.canConnectTo(other)) {
      return false;
    }
    
    return other.canConnectTo(this);
  }

  sharesSetWith(other: AtomicArgumentEntity): boolean {
    return this.sharesOrderedSetWith(other);
  }

  validateConnectionSafety(other: AtomicArgumentEntity): Result<boolean, ValidationError> {
    if (this.equals(other)) {
      return failure(new ValidationError("Cannot connect argument to itself"));
    }

    if (!this.conclusionSetRef) {
      return failure(new ValidationError("Source argument has no conclusion set"));
    }

    if (!other.premiseSetRef) {
      return failure(new ValidationError("Target argument has no premise set"));
    }

    if (this.wouldCreateDirectCycle(other)) {
      return failure(new ValidationError("Connection would create direct cycle"));
    }

    return success(true);
  }

  toString(): string {
    const premiseRef = this.premiseSetRef?.getValue() ?? "empty";
    const conclusionRef = this.conclusionSetRef?.getValue() ?? "empty";
    return `${premiseRef} → ${conclusionRef}`;
  }
}