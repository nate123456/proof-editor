import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../result.js';
import { randomUUID, ValueObject } from './common.js';

declare const StatementIdBrand: unique symbol;
declare const AtomicArgumentIdBrand: unique symbol;
declare const NodeIdBrand: unique symbol;
declare const TreeIdBrand: unique symbol;
declare const DocumentIdBrand: unique symbol;
declare const PackageIdBrand: unique symbol;
declare const ProofIdBrand: unique symbol;
declare const ProofTreeIdBrand: unique symbol;
declare const ProofDocumentIdBrand: unique symbol;

type BrandedStatementId = string & { readonly [StatementIdBrand]: never };
type BrandedAtomicArgumentId = string & { readonly [AtomicArgumentIdBrand]: never };
type BrandedNodeId = string & { readonly [NodeIdBrand]: never };
type BrandedTreeId = string & { readonly [TreeIdBrand]: never };
type BrandedDocumentId = string & { readonly [DocumentIdBrand]: never };
type BrandedPackageId = string & { readonly [PackageIdBrand]: never };
type BrandedProofId = string & { readonly [ProofIdBrand]: never };
type BrandedProofTreeId = string & { readonly [ProofTreeIdBrand]: never };
type BrandedProofDocumentId = string & { readonly [ProofDocumentIdBrand]: never };

export class StatementId extends ValueObject<BrandedStatementId> {
  private constructor(value: string) {
    super(value as BrandedStatementId);
  }

  static create(value: string): Result<StatementId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('StatementId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('StatementId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new StatementId(value.trim()));
  }

  static fromString(value: string): Result<StatementId, ValidationError> {
    return StatementId.create(value);
  }

  static generate(): StatementId {
    return new StatementId(randomUUID());
  }
}

export class AtomicArgumentId extends ValueObject<BrandedAtomicArgumentId> {
  private constructor(value: string) {
    super(value as BrandedAtomicArgumentId);
  }

  static create(value: string): Result<AtomicArgumentId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(
        new ValidationError('AtomicArgumentId cannot be empty', { field: 'value', value }),
      );
    }

    if (value.length > 255) {
      return err(
        new ValidationError('AtomicArgumentId cannot exceed 255 characters', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new AtomicArgumentId(value.trim()));
  }

  static fromString(value: string): Result<AtomicArgumentId, ValidationError> {
    return AtomicArgumentId.create(value);
  }

  static generate(): AtomicArgumentId {
    return new AtomicArgumentId(randomUUID());
  }
}

export class NodeId extends ValueObject<BrandedNodeId> {
  private constructor(value: string) {
    super(value as BrandedNodeId);
  }

  static create(value: string): Result<NodeId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('NodeId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('NodeId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new NodeId(value.trim()));
  }

  static fromString(value: string): Result<NodeId, ValidationError> {
    return NodeId.create(value);
  }

  static generate(): NodeId {
    return new NodeId(randomUUID());
  }
}

export class TreeId extends ValueObject<BrandedTreeId> {
  private constructor(value: string) {
    super(value as BrandedTreeId);
  }

  static create(value: string): Result<TreeId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('TreeId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('TreeId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new TreeId(value.trim()));
  }

  static fromString(value: string): Result<TreeId, ValidationError> {
    return TreeId.create(value);
  }
}

export class DocumentId extends ValueObject<BrandedDocumentId> {
  private constructor(value: string) {
    super(value as BrandedDocumentId);
  }

  static create(value: string): Result<DocumentId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('DocumentId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('DocumentId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new DocumentId(value.trim()));
  }

  static fromString(value: string): Result<DocumentId, ValidationError> {
    return DocumentId.create(value);
  }
}

export class PackageId extends ValueObject<BrandedPackageId> {
  private constructor(value: string) {
    super(value as BrandedPackageId);
  }

  static create(value: string): Result<PackageId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('PackageId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('PackageId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new PackageId(value.trim()));
  }

  static fromString(value: string): Result<PackageId, ValidationError> {
    return PackageId.create(value);
  }
}

export class ProofId extends ValueObject<BrandedProofId> {
  private constructor(value: string) {
    super(value as BrandedProofId);
  }

  static create(value: string): Result<ProofId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('ProofId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('ProofId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new ProofId(value.trim()));
  }

  static fromString(value: string): Result<ProofId, ValidationError> {
    return ProofId.create(value);
  }

  static generate(): ProofId {
    return new ProofId(randomUUID());
  }
}

export class ProofTreeId extends ValueObject<BrandedProofTreeId> {
  private constructor(value: string) {
    super(value as BrandedProofTreeId);
  }

  static create(value: string): Result<ProofTreeId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('ProofTreeId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('ProofTreeId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new ProofTreeId(value.trim()));
  }

  static fromString(value: string): Result<ProofTreeId, ValidationError> {
    return ProofTreeId.create(value);
  }

  static generate(): ProofTreeId {
    return new ProofTreeId(randomUUID());
  }
}

export class ProofDocumentId extends ValueObject<BrandedProofDocumentId> {
  private constructor(value: string) {
    super(value as BrandedProofDocumentId);
  }

  static create(value: string): Result<ProofDocumentId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('ProofDocumentId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('ProofDocumentId cannot exceed 255 characters', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new ProofDocumentId(value.trim()));
  }

  static fromString(value: string): Result<ProofDocumentId, ValidationError> {
    return ProofDocumentId.create(value);
  }
}

export class WebviewId extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<WebviewId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Webview ID cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();

    // Webview IDs should be alphanumeric with hyphens/underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return err(
        new ValidationError(
          'Webview ID must contain only letters, numbers, hyphens, and underscores',
          {
            field: 'value',
            value: trimmed,
          },
        ),
      );
    }

    if (trimmed.length > 100) {
      return err(
        new ValidationError('Webview ID cannot exceed 100 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new WebviewId(trimmed));
  }

  static fromString(value: string): Result<WebviewId, ValidationError> {
    return WebviewId.create(value);
  }
}

export class StatementReference {
  private constructor(
    private readonly statementId: StatementId,
    private readonly position: number,
  ) {}

  static create(
    statementId: StatementId,
    position: number,
  ): Result<StatementReference, ValidationError> {
    if (position < 0 || !Number.isInteger(position)) {
      return err(
        new ValidationError('Position must be a non-negative integer', {
          field: 'position',
          value: position,
        }),
      );
    }

    if (position > 1000) {
      return err(
        new ValidationError('Position cannot exceed 1000', {
          field: 'position',
          value: position,
        }),
      );
    }

    return ok(new StatementReference(statementId, position));
  }

  getStatementId(): StatementId {
    return this.statementId;
  }

  getPosition(): number {
    return this.position;
  }

  equals(other: StatementReference): boolean {
    return this.statementId.equals(other.statementId) && this.position === other.position;
  }

  toString(): string {
    return `${this.statementId.getValue()}@${this.position}`;
  }
}
