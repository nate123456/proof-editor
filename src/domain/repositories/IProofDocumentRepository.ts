import type { Result } from 'neverthrow';
import type { ProofDocument } from '../aggregates/ProofDocument.js';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type { IIdentityService } from '../services/IIdentityService.js';
import type { ProofDocumentId } from '../shared/value-objects/index.js';
import type { ICommandRepository, IRepository } from './base/index.js';

export interface IProofDocumentCommandRepository
  extends ICommandRepository<ProofDocument, ProofDocumentId> {
  createBootstrapDocument(
    identityService: IIdentityService,
  ): Promise<Result<ProofDocument, RepositoryError>>;
  createBootstrapDocumentWithId(
    id: ProofDocumentId,
  ): Promise<Result<ProofDocument, RepositoryError>>;
}

export interface IProofDocumentRepository
  extends IRepository<ProofDocument, ProofDocumentId>,
    IProofDocumentCommandRepository {
  findByDateRange(from: Date, to: Date): Promise<ProofDocument[]>;
  count(): Promise<number>;
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
