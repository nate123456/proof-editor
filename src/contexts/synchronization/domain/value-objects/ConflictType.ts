import type { Result } from '../../../../domain/shared/result';

export type ConflictTypeValue = 
  | 'STRUCTURAL_CONFLICT'
  | 'SEMANTIC_CONFLICT'
  | 'ORDERING_CONFLICT'
  | 'DELETION_CONFLICT'
  | 'CONCURRENT_MODIFICATION';

export class ConflictType {
  private constructor(private readonly value: ConflictTypeValue) {}

  static create(value: ConflictTypeValue): Result<ConflictType, Error> {
    const validTypes: ConflictTypeValue[] = [
      'STRUCTURAL_CONFLICT',
      'SEMANTIC_CONFLICT', 
      'ORDERING_CONFLICT',
      'DELETION_CONFLICT',
      'CONCURRENT_MODIFICATION'
    ];

    if (!validTypes.includes(value)) {
      return { success: false, error: new Error(`Invalid conflict type: ${value}`) };
    }

    return {
      success: true,
      data: new ConflictType(value)
    };
  }

  static structural(): Result<ConflictType, Error> {
    return ConflictType.create('STRUCTURAL_CONFLICT');
  }

  static semantic(): Result<ConflictType, Error> {
    return ConflictType.create('SEMANTIC_CONFLICT');
  }

  static ordering(): Result<ConflictType, Error> {
    return ConflictType.create('ORDERING_CONFLICT');
  }

  static deletion(): Result<ConflictType, Error> {
    return ConflictType.create('DELETION_CONFLICT');
  }

  static concurrentModification(): Result<ConflictType, Error> {
    return ConflictType.create('CONCURRENT_MODIFICATION');
  }

  getValue(): ConflictTypeValue {
    return this.value;
  }

  equals(other: ConflictType): boolean {
    return this.value === other.value;
  }

  isStructural(): boolean {
    const structuralTypes: ConflictTypeValue[] = [
      'STRUCTURAL_CONFLICT',
      'ORDERING_CONFLICT',
      'DELETION_CONFLICT'
    ];

    return structuralTypes.includes(this.value);
  }

  isSemantic(): boolean {
    const semanticTypes: ConflictTypeValue[] = [
      'SEMANTIC_CONFLICT',
      'CONCURRENT_MODIFICATION'
    ];

    return semanticTypes.includes(this.value);
  }

  requiresUserIntervention(): boolean {
    return this.isSemantic();
  }

  canBeAutomaticallyResolved(): boolean {
    return this.isStructural();
  }

  getSeverityLevel(): 'LOW' | 'MEDIUM' | 'HIGH' {
    switch (this.value) {
      case 'STRUCTURAL_CONFLICT':
      case 'ORDERING_CONFLICT':
        return 'LOW';
      
      case 'DELETION_CONFLICT':
      case 'CONCURRENT_MODIFICATION':
        return 'MEDIUM';
      
      case 'SEMANTIC_CONFLICT':
        return 'HIGH';
      
      default:
        return 'MEDIUM';
    }
  }

  getResolutionComplexity(): 'SIMPLE' | 'MODERATE' | 'COMPLEX' {
    switch (this.value) {
      case 'STRUCTURAL_CONFLICT':
        return 'SIMPLE';
      
      case 'ORDERING_CONFLICT':
      case 'DELETION_CONFLICT':
        return 'MODERATE';
      
      case 'SEMANTIC_CONFLICT':
      case 'CONCURRENT_MODIFICATION':
        return 'COMPLEX';
      
      default:
        return 'MODERATE';
    }
  }

  getExpectedResolutionStrategies(): string[] {
    switch (this.value) {
      case 'STRUCTURAL_CONFLICT':
        return ['MERGE_OPERATIONS', 'OPERATIONAL_TRANSFORM'];
      
      case 'SEMANTIC_CONFLICT':
        return ['USER_DECISION_REQUIRED', 'MANUAL_MERGE'];
      
      case 'ORDERING_CONFLICT':
        return ['TIMESTAMP_ORDERING', 'CAUSAL_ORDERING'];
      
      case 'DELETION_CONFLICT':
        return ['LAST_WRITER_WINS', 'PRESERVE_DELETION', 'USER_DECISION_REQUIRED'];
      
      case 'CONCURRENT_MODIFICATION':
        return ['THREE_WAY_MERGE', 'USER_DECISION_REQUIRED', 'LAST_WRITER_WINS'];
      
      default:
        return ['USER_DECISION_REQUIRED'];
    }
  }

  getDescription(): string {
    switch (this.value) {
      case 'STRUCTURAL_CONFLICT':
        return 'Conflicting changes to document structure that can be automatically resolved';
      
      case 'SEMANTIC_CONFLICT':
        return 'Conflicting changes to content meaning that require user intervention';
      
      case 'ORDERING_CONFLICT':
        return 'Operations applied in different orders resulting in inconsistent state';
      
      case 'DELETION_CONFLICT':
        return 'Attempt to modify content that was deleted by another operation';
      
      case 'CONCURRENT_MODIFICATION':
        return 'Simultaneous modifications to the same content by multiple devices';
      
      default:
        return 'Unknown conflict type';
    }
  }

  isCompatibleWith(otherType: ConflictType): boolean {
    if (this.equals(otherType)) {
      return true;
    }

    const compatibilityMatrix: Record<ConflictTypeValue, ConflictTypeValue[]> = {
      'STRUCTURAL_CONFLICT': ['ORDERING_CONFLICT'],
      'SEMANTIC_CONFLICT': ['CONCURRENT_MODIFICATION'],
      'ORDERING_CONFLICT': ['STRUCTURAL_CONFLICT'],
      'DELETION_CONFLICT': [],
      'CONCURRENT_MODIFICATION': ['SEMANTIC_CONFLICT']
    };

    return compatibilityMatrix[this.value]?.includes(otherType.value) ?? false;
  }

  toString(): string {
    return this.value;
  }

  toDisplayString(): string {
    return this.value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getIcon(): string {
    switch (this.value) {
      case 'STRUCTURAL_CONFLICT':
        return '🔧';
      case 'SEMANTIC_CONFLICT':
        return '⚠️';
      case 'ORDERING_CONFLICT':
        return '🔄';
      case 'DELETION_CONFLICT':
        return '🗑️';
      case 'CONCURRENT_MODIFICATION':
        return '⚡';
      default:
        return '❓';
    }
  }
}