import { err, ok, type Result } from 'neverthrow';

export type OperationTypeValue =
  | 'CREATE_STATEMENT'
  | 'UPDATE_STATEMENT'
  | 'DELETE_STATEMENT'
  | 'CREATE_ARGUMENT'
  | 'UPDATE_ARGUMENT'
  | 'DELETE_ARGUMENT'
  | 'CREATE_TREE'
  | 'UPDATE_TREE_POSITION'
  | 'DELETE_TREE'
  | 'CREATE_CONNECTION'
  | 'DELETE_CONNECTION'
  | 'UPDATE_METADATA';

export class OperationType {
  private constructor(private readonly value: OperationTypeValue) {}

  // Static constant for test compatibility
  static readonly INSERT = new OperationType('CREATE_STATEMENT');

  static create(value: OperationTypeValue): Result<OperationType, Error> {
    const validOperations: OperationTypeValue[] = [
      'CREATE_STATEMENT',
      'UPDATE_STATEMENT',
      'DELETE_STATEMENT',
      'CREATE_ARGUMENT',
      'UPDATE_ARGUMENT',
      'DELETE_ARGUMENT',
      'CREATE_TREE',
      'UPDATE_TREE_POSITION',
      'DELETE_TREE',
      'CREATE_CONNECTION',
      'DELETE_CONNECTION',
      'UPDATE_METADATA',
    ];

    if (!validOperations.includes(value)) {
      return err(new Error(`Invalid operation type: ${value}`));
    }

    return ok(new OperationType(value));
  }

  getValue(): OperationTypeValue {
    return this.value;
  }

  equals(other: OperationType): boolean {
    return this.value === other.value;
  }

  isStructural(): boolean {
    const structuralOperations: OperationTypeValue[] = [
      'CREATE_ARGUMENT',
      'DELETE_ARGUMENT',
      'CREATE_TREE',
      'UPDATE_TREE_POSITION',
      'DELETE_TREE',
      'CREATE_CONNECTION',
      'DELETE_CONNECTION',
    ];

    return structuralOperations.includes(this.value);
  }

  isSemantic(): boolean {
    const semanticOperations: OperationTypeValue[] = [
      'CREATE_STATEMENT',
      'UPDATE_STATEMENT',
      'DELETE_STATEMENT',
      'UPDATE_ARGUMENT',
      'UPDATE_METADATA',
    ];

    return semanticOperations.includes(this.value);
  }

  isCreation(): boolean {
    return this.value.startsWith('CREATE_');
  }

  isDeletion(): boolean {
    return this.value.startsWith('DELETE_');
  }

  isUpdate(): boolean {
    return this.value.startsWith('UPDATE_');
  }

  canCommuteWith(other: OperationType): boolean {
    if (this.equals(other)) {
      return this.isCommutativeWithSameType();
    }

    if (this.isStructural() && other.isStructural()) {
      return this.checkStructuralCommutativity(other);
    }

    if (this.isSemantic() && other.isSemantic()) {
      return false;
    }

    return this.checkCrossTypeCommutativity(other);
  }

  private isCommutativeWithSameType(): boolean {
    switch (this.value) {
      case 'UPDATE_TREE_POSITION':
      case 'UPDATE_METADATA':
        return true;
      default:
        return false;
    }
  }

  private checkStructuralCommutativity(other: OperationType): boolean {
    const nonCommutativePairs: [OperationTypeValue, OperationTypeValue][] = [
      ['CREATE_ARGUMENT', 'DELETE_ARGUMENT'],
      ['CREATE_TREE', 'DELETE_TREE'],
      ['CREATE_CONNECTION', 'DELETE_CONNECTION'],
      ['DELETE_ARGUMENT', 'CREATE_CONNECTION'],
      ['DELETE_TREE', 'CREATE_ARGUMENT'],
    ];

    return !nonCommutativePairs.some(
      ([op1, op2]) =>
        (this.value === op1 && other.value === op2) || (this.value === op2 && other.value === op1)
    );
  }

  private checkCrossTypeCommutativity(other: OperationType): boolean {
    if (this.isStructural() && other.isSemantic()) {
      return !this.structuralAffectsSemantic(other);
    }

    if (this.isSemantic() && other.isStructural()) {
      return !other.structuralAffectsSemantic(this);
    }

    return true;
  }

  private structuralAffectsSemantic(semanticOp: OperationType): boolean {
    if (this.isDeletion()) {
      return true;
    }

    if (this.value === 'DELETE_CONNECTION' && semanticOp.value === 'UPDATE_ARGUMENT') {
      return true;
    }

    return false;
  }

  // Transform logic has been moved to OperationPayload.transform()

  toString(): string {
    return this.value;
  }

  getCategory(): 'STRUCTURAL' | 'SEMANTIC' {
    return this.isStructural() ? 'STRUCTURAL' : 'SEMANTIC';
  }

  getVerb(): string {
    if (this.isCreation()) return 'CREATE';
    if (this.isDeletion()) return 'DELETE';
    if (this.isUpdate()) return 'UPDATE';
    return 'UNKNOWN';
  }

  getTarget(): string {
    const parts = this.value.split('_');
    return parts.slice(1).join('_');
  }
}
