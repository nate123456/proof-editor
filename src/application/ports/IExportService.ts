import type { Result } from 'neverthrow';
import type { ValidationError } from '../../domain/shared/result.js';

export interface ExportOptions {
  format: 'yaml' | 'pdf' | 'json' | 'svg';
  includeMetadata?: boolean;
  includeVisualization?: boolean;
}

export interface ExportResult {
  filename: string;
  content: string | Buffer;
  mimeType: string;
}

/**
 * Service interface for exporting proof documents to various formats
 */
export interface IExportService {
  /**
   * Export document to specified format
   */
  exportDocument(
    documentId: string,
    options: ExportOptions,
  ): Promise<Result<ExportResult, ValidationError>>;

  /**
   * Export document content directly (for testing and headless scenarios)
   */
  exportDocumentContent(
    documentId: string,
    options: ExportOptions,
  ): Promise<Result<ExportResult, ValidationError>>;

  /**
   * Save exported content to file via platform-specific file save dialog
   */
  saveToFile(
    documentId: string,
    options: ExportOptions,
  ): Promise<Result<{ filePath: string; savedSuccessfully: boolean }, ValidationError>>;

  /**
   * Get supported export formats for a document
   */
  getSupportedFormats(
    documentId: string,
  ): Promise<Result<ExportOptions['format'][], ValidationError>>;
}
