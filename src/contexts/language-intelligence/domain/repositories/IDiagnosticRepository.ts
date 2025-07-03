import type { Result } from 'neverthrow';

import type { Diagnostic } from '../entities/Diagnostic';
import type { RepositoryError } from '../errors/DomainErrors';
import type { DiagnosticId } from '../value-objects/DiagnosticId';
import type { DiagnosticSeverity } from '../value-objects/DiagnosticSeverity';

export interface IDiagnosticRepository {
  save(diagnostic: Diagnostic): Promise<Result<void, RepositoryError>>;
  findById(id: DiagnosticId): Promise<Diagnostic | null>;
  findByLanguagePackageId(languagePackageId: string): Promise<Diagnostic[]>;
  findBySeverity(severity: DiagnosticSeverity): Promise<Diagnostic[]>;
  findByDocumentId(documentId: string): Promise<Diagnostic[]>;
  findAll(): Promise<Diagnostic[]>;
  delete(id: DiagnosticId): Promise<Result<void, RepositoryError>>;
}
