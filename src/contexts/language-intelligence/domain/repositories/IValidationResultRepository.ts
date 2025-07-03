import type { Result } from 'neverthrow';

import type { ValidationResult } from '../entities/ValidationResult';
import type { RepositoryError } from '../errors/DomainErrors';
import type { ValidationResultId } from '../value-objects/ValidationResultId';

export interface IValidationResultRepository {
  save(result: ValidationResult): Promise<Result<void, RepositoryError>>;
  findById(id: ValidationResultId): Promise<ValidationResult | null>;
  findByDocumentId(documentId: string): Promise<ValidationResult[]>;
  findByLanguagePackageId(languagePackageId: string): Promise<ValidationResult[]>;
  findRecentResults(limit: number): Promise<ValidationResult[]>;
  findAll(): Promise<ValidationResult[]>;
  delete(id: ValidationResultId): Promise<Result<void, RepositoryError>>;
}
