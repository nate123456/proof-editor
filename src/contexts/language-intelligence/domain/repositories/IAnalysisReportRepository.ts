import type { Result } from 'neverthrow';

import type { AnalysisReport } from '../entities/AnalysisReport';
import type { RepositoryError } from '../errors/DomainErrors';
import type { AnalysisReportId } from '../value-objects/AnalysisReportId';

export interface IAnalysisReportRepository {
  save(report: AnalysisReport): Promise<Result<void, RepositoryError>>;
  findById(id: AnalysisReportId): Promise<AnalysisReport | null>;
  findByDocumentId(documentId: string): Promise<AnalysisReport[]>;
  findByLanguagePackageId(languagePackageId: string): Promise<AnalysisReport[]>;
  findRecentReports(limit: number): Promise<AnalysisReport[]>;
  findAll(): Promise<AnalysisReport[]>;
  delete(id: AnalysisReportId): Promise<Result<void, RepositoryError>>;
}
