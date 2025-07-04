import { err, ok, type Result, ValidationError } from '../shared/result.js';
import { type AtomicArgumentId, OrderedSetId, type StatementId } from '../shared/value-objects.js';

// Compatibility polyfills
class SimpleSet<T> {
  private readonly items: T[] = [];

  add(item: T): void {
    if (!this.has(item)) {
      this.items.push(item);
    }
  }

  delete(item: T): boolean {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  has(item: T): boolean {
    return this.items.includes(item);
  }

  get size(): number {
    return this.items.length;
  }

  getItems(): T[] {
    return this.items.slice();
  }
}

// function arrayFrom<T>(iterable: T[]): T[] {
//   return iterable.slice();
// }

function findIndex<T>(array: T[], predicate: (item: T, index: number) => boolean): number {
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (item !== undefined && predicate(item, i)) {
      return i;
    }
  }
  return -1;
}

export class OrderedSet {
  private constructor(
    private readonly id: OrderedSetId,
    private statementIds: StatementId[],
    private readonly createdAt: number,
    private modifiedAt: number,
    private readonly referencedBy: {
      asPremise: SimpleSet<AtomicArgumentId>;
      asConclusion: SimpleSet<AtomicArgumentId>;
    },
  ) {}

  static create(statementIds: StatementId[] = []): Result<OrderedSet, ValidationError> {
    const uniqueStatementIds = OrderedSet.ensureUniqueness(statementIds);
    const now = Date.now();

    return ok(
      new OrderedSet(OrderedSetId.generate(), uniqueStatementIds, now, now, {
        asPremise: new SimpleSet(),
        asConclusion: new SimpleSet(),
      }),
    );
  }

  static createFromStatements(statementIds: StatementId[]): Result<OrderedSet, ValidationError> {
    return OrderedSet.create(statementIds);
  }

  /**
   * Create an empty OrderedSet for bootstrap scenarios.
   * Explicitly allows empty collection which is normally not permitted.
   */
  static createEmpty(): Result<OrderedSet, ValidationError> {
    const now = Date.now();
    return ok(
      new OrderedSet(OrderedSetId.generate(), [], now, now, {
        asPremise: new SimpleSet(),
        asConclusion: new SimpleSet(),
      }),
    );
  }

  static reconstruct(
    id: OrderedSetId,
    statementIds: StatementId[],
    createdAt: number,
    modifiedAt: number,
    referencedBy: {
      asPremise: AtomicArgumentId[];
      asConclusion: AtomicArgumentId[];
    },
  ): Result<OrderedSet, ValidationError> {
    const uniqueStatementIds = OrderedSet.ensureUniqueness(statementIds);

    return ok(
      new OrderedSet(id, uniqueStatementIds, createdAt, modifiedAt, {
        asPremise: (() => {
          const set = new SimpleSet<AtomicArgumentId>();
          referencedBy.asPremise.forEach((id) => {
            set.add(id);
          });
          return set;
        })(),
        asConclusion: (() => {
          const set = new SimpleSet<AtomicArgumentId>();
          referencedBy.asConclusion.forEach((id) => {
            set.add(id);
          });
          return set;
        })(),
      }),
    );
  }

  getId(): OrderedSetId {
    return this.id;
  }

  getStatementIds(): readonly StatementId[] {
    return [...this.statementIds];
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getModifiedAt(): number {
    return this.modifiedAt;
  }

  getReferencedByAsPremise(): readonly AtomicArgumentId[] {
    return this.referencedBy.asPremise.getItems();
  }

  getReferencedByAsConclusion(): readonly AtomicArgumentId[] {
    return this.referencedBy.asConclusion.getItems();
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
    const index = findIndex(this.statementIds, (id) => id.equals(statementId));
    if (index === -1) {
      return err(new ValidationError('Statement not found in ordered set'));
    }

    this.statementIds.splice(index, 1);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  insertStatementAt(statementId: StatementId, position: number): Result<void, ValidationError> {
    if (this.containsStatement(statementId)) {
      return err(new ValidationError('Statement already exists in ordered set'));
    }

    if (position < 0 || position > this.statementIds.length) {
      return err(new ValidationError('Invalid position for statement insertion'));
    }

    this.statementIds.splice(position, 0, statementId);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  moveStatement(statementId: StatementId, newPosition: number): Result<void, ValidationError> {
    const currentIndex = findIndex(this.statementIds, (id) => id.equals(statementId));
    if (currentIndex === -1) {
      return err(new ValidationError('Statement not found in ordered set'));
    }

    if (newPosition < 0 || newPosition >= this.statementIds.length) {
      return err(new ValidationError('Invalid new position for statement'));
    }

    if (currentIndex === newPosition) {
      return ok(undefined);
    }

    const removedStatements = this.statementIds.splice(currentIndex, 1);
    const statement = removedStatements[0];
    if (!statement) {
      return err(new ValidationError('Failed to remove statement from position'));
    }
    this.statementIds.splice(newPosition, 0, statement);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  replaceStatements(newStatementIds: StatementId[]): Result<void, ValidationError> {
    const uniqueStatementIds = OrderedSet.ensureUniqueness(newStatementIds);
    this.statementIds = uniqueStatementIds;
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  containsStatement(statementId: StatementId): boolean {
    return this.statementIds.some((id) => id.equals(statementId));
  }

  isEmpty(): boolean {
    return this.statementIds.length === 0;
  }

  size(): number {
    return this.statementIds.length;
  }

  addAtomicArgumentReference(argumentId: AtomicArgumentId, asType: 'premise' | 'conclusion'): void {
    if (asType === 'premise') {
      this.referencedBy.asPremise.add(argumentId);
    } else {
      this.referencedBy.asConclusion.add(argumentId);
    }
  }

  removeAtomicArgumentReference(
    argumentId: AtomicArgumentId,
    asType: 'premise' | 'conclusion',
  ): void {
    if (asType === 'premise') {
      this.referencedBy.asPremise.delete(argumentId);
    } else {
      this.referencedBy.asConclusion.delete(argumentId);
    }
  }

  isReferencedByAtomicArguments(): boolean {
    return this.referencedBy.asPremise.size > 0 || this.referencedBy.asConclusion.size > 0;
  }

  getTotalReferenceCount(): number {
    return this.referencedBy.asPremise.size + this.referencedBy.asConclusion.size;
  }

  /**
   * CRITICAL: Identity comparison - same object reference.
   * This is THE key to connections between AtomicArguments.
   * When two atomic arguments share the same OrderedSet object, they are connected.
   */
  isSameAs(other: OrderedSet): boolean {
    return this === other; // Object identity, not content!
  }

  /**
   * Content comparison - same statements in same order.
   * This checks if two OrderedSets have identical content but may be different objects.
   */
  orderedEquals(other: OrderedSet): boolean {
    if (this.statementIds.length !== other.statementIds.length) {
      return false;
    }

    return this.statementIds.every((statementId, index) => {
      const otherStatementId = other.statementIds[index];
      return otherStatementId !== undefined && statementId.equals(otherStatementId);
    });
  }

  /**
   * Content equality (unordered) - same statements regardless of order.
   * This is for checking if two OrderedSets have the same content.
   */
  equals(other: OrderedSet): boolean {
    if (this.statementIds.length !== other.statementIds.length) {
      return false;
    }

    // Check if all statements in this set exist in the other set
    return this.statementIds.every((statementId) =>
      other.statementIds.some((otherStatementId) => statementId.equals(otherStatementId)),
    );
  }

  private static ensureUniqueness(statementIds: StatementId[]): StatementId[] {
    const seen: string[] = [];
    return statementIds.filter((id) => {
      const value = id.getValue();
      if (seen.includes(value)) {
        return false;
      }
      seen.push(value);
      return true;
    });
  }
}
