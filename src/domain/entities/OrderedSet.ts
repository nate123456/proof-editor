import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  OrderedSetId,
  type StatementId,
} from '../shared/value-objects/index.js';

class SimpleSet<T> {
  private items: T[] = [];

  add(item: T): void {
    if (!this.has(item)) {
      this.items.push(item);
    }
  }

  remove(item: T): void {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  has(item: T): boolean {
    return this.items.includes(item);
  }

  get size(): number {
    return this.items.length;
  }

  toArray(): T[] {
    return [...this.items];
  }
}

export class OrderedSet {
  private readonly id: OrderedSetId;
  private statementIds: StatementId[];
  private readonly createdAt: number;
  private modifiedAt: number;
  private readonly referencedByAsPremise: SimpleSet<AtomicArgumentId>;
  private readonly referencedByAsConclusion: SimpleSet<AtomicArgumentId>;

  private constructor(
    id: OrderedSetId,
    statementIds: StatementId[],
    createdAt: number,
    modifiedAt: number,
    referencedBy?: {
      asPremise: AtomicArgumentId[];
      asConclusion: AtomicArgumentId[];
    },
  ) {
    this.id = id;
    this.statementIds = this.removeDuplicates(statementIds);
    this.createdAt = createdAt;
    this.modifiedAt = modifiedAt;
    this.referencedByAsPremise = new SimpleSet<AtomicArgumentId>();
    this.referencedByAsConclusion = new SimpleSet<AtomicArgumentId>();

    if (referencedBy) {
      referencedBy.asPremise.forEach((id) => this.referencedByAsPremise.add(id));
      referencedBy.asConclusion.forEach((id) => this.referencedByAsConclusion.add(id));
    }
  }

  private removeDuplicates(statementIds: StatementId[]): StatementId[] {
    const uniqueIds: StatementId[] = [];
    const seen = new Set<string>();

    for (const id of statementIds) {
      const idString = id.getValue();
      if (!seen.has(idString)) {
        seen.add(idString);
        uniqueIds.push(id);
      }
    }

    return uniqueIds;
  }

  private findIndex(statementId: StatementId): number {
    return this.statementIds.findIndex((id) => id.equals(statementId));
  }

  static create(statementIds: StatementId[] = []): Result<OrderedSet, ValidationError> {
    const idResult = OrderedSetId.generate();
    if (idResult.isErr()) {
      return err(new ValidationError('Failed to generate OrderedSet ID'));
    }

    const now = Date.now();
    return ok(new OrderedSet(idResult.value, statementIds, now, now));
  }

  static createEmpty(): Result<OrderedSet, ValidationError> {
    return OrderedSet.create([]);
  }

  static createFromStatements(statementIds: StatementId[]): Result<OrderedSet, ValidationError> {
    return OrderedSet.create(statementIds);
  }

  static reconstruct(
    id: OrderedSetId,
    statementIds: StatementId[],
    createdAt: number,
    modifiedAt: number,
    referencedBy?: {
      asPremise: AtomicArgumentId[];
      asConclusion: AtomicArgumentId[];
    },
  ): Result<OrderedSet, ValidationError> {
    return ok(new OrderedSet(id, statementIds, createdAt, modifiedAt, referencedBy));
  }

  getId(): OrderedSetId {
    return this.id;
  }

  getStatementIds(): StatementId[] {
    return [...this.statementIds];
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getModifiedAt(): number {
    return this.modifiedAt;
  }

  size(): number {
    return this.statementIds.length;
  }

  isEmpty(): boolean {
    return this.statementIds.length === 0;
  }

  containsStatement(statementId: StatementId): boolean {
    return this.statementIds.some((id) => id.equals(statementId));
  }

  indexOf(statementId: StatementId): number {
    return this.findIndex(statementId);
  }

  addStatement(statementId: StatementId): Result<void, ValidationError> {
    if (this.containsStatement(statementId)) {
      return err(new ValidationError('Statement already exists in ordered set'));
    }

    this.statementIds.push(statementId);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  removeStatement(statementId: StatementId): Result<void, ValidationError> {
    const index = this.findIndex(statementId);
    if (index === -1) {
      return err(new ValidationError('Statement not found in ordered set'));
    }

    this.statementIds.splice(index, 1);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  insertStatementAt(statementId: StatementId, position: number): Result<void, ValidationError> {
    if (position < 0 || position > this.statementIds.length) {
      return err(new ValidationError('Invalid position for insertion'));
    }

    if (this.containsStatement(statementId)) {
      return err(new ValidationError('Statement already exists in ordered set'));
    }

    this.statementIds.splice(position, 0, statementId);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  moveStatement(statementId: StatementId, newPosition: number): Result<void, ValidationError> {
    if (newPosition < 0 || newPosition >= this.statementIds.length) {
      return err(new ValidationError('Invalid new position'));
    }

    const currentIndex = this.findIndex(statementId);
    if (currentIndex === -1) {
      return err(new ValidationError('Statement not found in ordered set'));
    }

    if (currentIndex === newPosition) {
      return ok(undefined);
    }

    const [removed] = this.statementIds.splice(currentIndex, 1);
    if (!removed) {
      return err(new ValidationError('Failed to remove statement from position'));
    }

    this.statementIds.splice(newPosition, 0, removed);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  replaceStatements(newStatementIds: StatementId[]): Result<void, ValidationError> {
    this.statementIds = this.removeDuplicates(newStatementIds);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  addAtomicArgumentReference(
    argumentId: AtomicArgumentId,
    usageType: 'premise' | 'conclusion',
  ): void {
    if (usageType === 'premise') {
      this.referencedByAsPremise.add(argumentId);
    } else {
      this.referencedByAsConclusion.add(argumentId);
    }
  }

  removeAtomicArgumentReference(
    argumentId: AtomicArgumentId,
    usageType: 'premise' | 'conclusion',
  ): void {
    if (usageType === 'premise') {
      this.referencedByAsPremise.remove(argumentId);
    } else {
      this.referencedByAsConclusion.remove(argumentId);
    }
  }

  getReferencedByAsPremise(): AtomicArgumentId[] {
    return this.referencedByAsPremise.toArray();
  }

  getReferencedByAsConclusion(): AtomicArgumentId[] {
    return this.referencedByAsConclusion.toArray();
  }

  isReferencedByAtomicArguments(): boolean {
    return this.referencedByAsPremise.size > 0 || this.referencedByAsConclusion.size > 0;
  }

  getTotalReferenceCount(): number {
    return this.referencedByAsPremise.size + this.referencedByAsConclusion.size;
  }

  equals(other: OrderedSet): boolean {
    if (this.statementIds.length !== other.statementIds.length) {
      return false;
    }

    const thisSet = new Set(this.statementIds.map((id) => id.getValue()));
    const otherSet = new Set(other.statementIds.map((id) => id.getValue()));

    if (thisSet.size !== otherSet.size) {
      return false;
    }

    for (const value of thisSet) {
      if (!otherSet.has(value)) {
        return false;
      }
    }

    return true;
  }

  orderedEquals(other: OrderedSet): boolean {
    if (this.statementIds.length !== other.statementIds.length) {
      return false;
    }
    return this.statementIds.every((id, index) => {
      const otherId = other.statementIds[index];
      return otherId ? id.equals(otherId) : false;
    });
  }

  isSameAs(other: OrderedSet): boolean {
    return this === other;
  }

  get items(): readonly StatementId[] {
    return [...this.statementIds];
  }

  get(index: number): StatementId | undefined {
    return this.statementIds[index];
  }

  contains(statementId: StatementId): boolean {
    return this.containsStatement(statementId);
  }

  toArray(): StatementId[] {
    return [...this.statementIds];
  }

  toString(): string {
    return `[${this.statementIds.map((id) => id.toString()).join(', ')}]`;
  }
}
