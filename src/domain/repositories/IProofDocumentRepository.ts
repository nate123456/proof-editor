import type { Result } from 'neverthrow';
import type { ProofDocument } from '../aggregates/ProofDocument.js';
import type { ValidationError } from '../shared/result.js';
import type { ProofDocumentId } from '../shared/value-objects.js';

/**
 * Repository interface for ProofDocument aggregate.
 * Domain defines the interface, infrastructure provides the implementation.
 */
export interface IProofDocumentRepository {
  /**
   * Find a ProofDocument by its ID.
   * Returns null if not found.
   */
  findById(id: ProofDocumentId): Promise<ProofDocument | null>;

  /**
   * Save a ProofDocument aggregate.
   * Handles both create and update operations.
   * Events should be published after successful save.
   */
  save(document: ProofDocument): Promise<Result<void, ValidationError>>;

  /**
   * Delete a ProofDocument by its ID.
   * Returns error if document doesn't exist.
   */
  delete(id: ProofDocumentId): Promise<Result<void, ValidationError>>;

  /**
   * Check if a ProofDocument exists with the given ID.
   */
  exists(id: ProofDocumentId): Promise<boolean>;

  /**
   * Find all ProofDocuments.
   * For development/testing purposes - real implementation might need pagination.
   */
  findAll(): Promise<ProofDocument[]>;

  /**
   * Generate a new unique ProofDocumentId.
   * Repository is responsible for ensuring uniqueness.
   */
  nextIdentity(): ProofDocumentId;

  /**
   * Find ProofDocuments created within a date range.
   * Useful for audit trails and document management.
   */
  findByDateRange(from: Date, to: Date): Promise<ProofDocument[]>;

  /**
   * Count total number of ProofDocuments.
   * Useful for statistics and pagination.
   */
  count(): Promise<number>;

  /**
   * Create a new bootstrap document with auto-generated ID.
   * Bootstrap documents are completely empty and require no validation.
   * This is the primary way users start working with the system.
   */
  createBootstrapDocument(): Promise<Result<ProofDocument, ValidationError>>;

  /**
   * Create a new bootstrap document with specific ID.
   * Bootstrap documents are completely empty and require no validation.
   * Used when client needs to specify the document ID.
   */
  createBootstrapDocumentWithId(
    id: ProofDocumentId,
  ): Promise<Result<ProofDocument, ValidationError>>;
}

/**
 * Query interface for complex ProofDocument queries.
 * Separate from repository to maintain CQRS separation.
 */
export interface IProofDocumentQuery {
  /**
   * Find documents containing statements with specific content.
   */
  findByStatementContent(content: string): Promise<ProofDocument[]>;

  /**
   * Find documents with shared OrderedSets (indicating connections).
   */
  findDocumentsWithSharedOrderedSets(): Promise<ProofDocument[]>;

  /**
   * Get statistics across all documents.
   */
  getGlobalStats(): Promise<{
    totalDocuments: number;
    totalStatements: number;
    totalOrderedSets: number;
    totalAtomicArguments: number;
    documentsWithSharedSets: number;
  }>;

  /**
   * Find documents that contain cycles in their argument structure.
   */
  findDocumentsWithCycles(): Promise<ProofDocument[]>;

  /**
   * Find documents with orphaned arguments (no connections).
   */
  findDocumentsWithOrphans(): Promise<ProofDocument[]>;
}
