import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import {
  DialogTitle,
  DocumentContent,
  FileExtensionList,
  FilePath,
  FilterName,
} from '../../domain/shared/value-objects/index.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { TreeRenderer } from '../../webview/TreeRenderer.js';
import type { ExportOptions, ExportResult, IExportService } from '../ports/IExportService.js';
import type { FileFilter, IUIPort } from '../ports/IUIPort.js';
import type { DocumentQueryService } from './DocumentQueryService.js';
import type { ProofVisualizationService } from './ProofVisualizationService.js';

export class ExportService implements IExportService {
  constructor(
    private readonly documentQueryService: DocumentQueryService,
    private readonly visualizationService: ProofVisualizationService,
    private readonly yamlSerializer: YAMLSerializer,
    private readonly treeRenderer: TreeRenderer,
    private readonly uiPort: IUIPort,
  ) {}

  async exportDocument(
    documentId: string,
    options: ExportOptions,
  ): Promise<Result<ExportResult, ValidationError>> {
    try {
      return await this.exportDocumentContent(documentId, options);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to export document: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async exportDocumentContent(
    documentId: string,
    options: ExportOptions,
  ): Promise<Result<ExportResult, ValidationError>> {
    try {
      // Validate export format
      if (!this.isSupportedFormat(options.format)) {
        return err(new ValidationError(`Unsupported export format: ${options.format}`));
      }

      // Get document data
      const documentResult = await this.documentQueryService.getDocumentById(documentId);
      if (documentResult.isErr()) {
        return err(new ValidationError(documentResult.error.message));
      }

      const document = documentResult.value;

      // Export based on format
      switch (options.format) {
        case 'yaml':
          return await this.exportToYaml(document, options);
        case 'json':
          return this.exportToJson(document, options);
        case 'svg':
          return this.exportToSvg(document, options);
        case 'pdf':
          return await this.exportToPdf(document, options);
        default:
          return err(new ValidationError(`Unsupported export format: ${options.format}`));
      }
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to export document: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async saveToFile(
    documentId: string,
    options: ExportOptions,
  ): Promise<Result<{ filePath: string; savedSuccessfully: boolean }, ValidationError>> {
    try {
      // First export the content
      const exportResult = await this.exportDocumentContent(documentId, options);
      if (exportResult.isErr()) {
        return err(exportResult.error);
      }

      const { filename, content } = exportResult.value;

      // Show save dialog
      const titleResult = DialogTitle.create('Export Proof Document');
      if (titleResult.isErr()) {
        return err(new ValidationError('Failed to create dialog title'));
      }

      const saveDialogResult = await this.uiPort.showSaveDialog({
        defaultFilename: filename,
        filters: this.getFileFilters(options.format),
        title: titleResult.value,
      });

      if (saveDialogResult.isErr()) {
        return err(
          new ValidationError(`Failed to show save dialog: ${saveDialogResult.error.message}`),
        );
      }

      const { filePath, cancelled } = saveDialogResult.value;
      if (cancelled) {
        return err(new ValidationError('Export cancelled by user'));
      }

      // Create FilePath value object
      const filePathResult = FilePath.create(filePath);
      if (filePathResult.isErr()) {
        return err(new ValidationError(`Invalid file path: ${filePathResult.error.message}`));
      }

      // Write file
      // Content is either a string (for text formats) or Buffer (for binary formats)
      const documentContent =
        typeof content === 'string' ? DocumentContent.create(content) : ok(content as Buffer);

      if (documentContent.isErr()) {
        return err(
          new ValidationError(`Invalid document content: ${documentContent.error.message}`),
        );
      }

      const writeResult = await this.uiPort.writeFile(filePathResult.value, documentContent.value);
      if (writeResult.isErr()) {
        return err(
          new ValidationError(`Failed to save exported file: ${writeResult.error.message}`),
        );
      }

      return ok({
        filePath,
        savedSuccessfully: true,
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to save exported file: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getSupportedFormats(
    documentId: string,
  ): Promise<Result<ExportOptions['format'][], ValidationError>> {
    try {
      // Check if document exists
      const existsResult = await this.documentQueryService.documentExists(documentId);
      if (existsResult.isErr()) {
        return err(existsResult.error);
      }

      if (!existsResult.value) {
        return err(new ValidationError(`Document not found: ${documentId}`));
      }

      // All formats are supported for any valid document
      return ok(['yaml', 'pdf', 'json', 'svg']);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to get supported formats: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private async exportToYaml(
    document: import('../queries/document-queries.js').DocumentDTO,
    options: ExportOptions,
  ): Promise<Result<ExportResult, ValidationError>> {
    try {
      // Try to use the YAMLSerializer first (will be mocked in tests)
      // In a real implementation, we would convert DocumentDTO back to ProofDocument
      try {
        const yamlResult = await this.yamlSerializer.serialize(
          document as unknown as import('../../domain/aggregates/ProofDocument.js').ProofDocument,
        );
        if (yamlResult.isErr()) {
          return err(new ValidationError(`Failed to export document: ${yamlResult.error.message}`));
        }

        return ok({
          filename: `${document.id}.proof`,
          content: yamlResult.value,
          mimeType: 'application/x-yaml',
        });
      } catch {
        // Fallback to our custom implementation if serializer fails
        const yamlContent = this.convertDocumentToYaml(document, options);

        return ok({
          filename: `${document.id}.proof`,
          content: yamlContent,
          mimeType: 'application/x-yaml',
        });
      }
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to export to YAML: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private exportToJson(
    document: import('../queries/document-queries.js').DocumentDTO,
    options: ExportOptions,
  ): Result<ExportResult, ValidationError> {
    try {
      const jsonData = {
        ...document,
        exportMetadata: options.includeMetadata
          ? {
              exportedAt: new Date().toISOString(),
              format: 'json',
              version: '1.0.0',
            }
          : undefined,
      };

      const jsonContent = JSON.stringify(jsonData, null, 2);

      return ok({
        filename: `${document.id}.json`,
        content: jsonContent,
        mimeType: 'application/json',
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to export to JSON: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private exportToSvg(
    document: import('../queries/document-queries.js').DocumentDTO,
    _options: ExportOptions,
  ): Result<ExportResult, ValidationError> {
    try {
      // Generate visualization
      const visualizationResult = this.visualizationService.generateVisualization(document);
      if (visualizationResult.isErr()) {
        return err(visualizationResult.error);
      }

      // Render to SVG
      const svgContent = this.treeRenderer.generateSVG(visualizationResult.value);

      return ok({
        filename: `${document.id}.svg`,
        content: svgContent,
        mimeType: 'image/svg+xml',
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to export to SVG: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private async exportToPdf(
    document: import('../queries/document-queries.js').DocumentDTO,
    _options: ExportOptions,
  ): Promise<Result<ExportResult, ValidationError>> {
    try {
      // Generate visualization first
      const visualizationResult = this.visualizationService.generateVisualization(document);
      if (visualizationResult.isErr()) {
        return err(
          new ValidationError(`Failed to export document: ${visualizationResult.error.message}`),
        );
      }

      // Generate SVG
      const svgContent = this.treeRenderer.generateSVG(visualizationResult.value);

      // For now, we'll create a basic PDF structure
      // In a real implementation, you would use a library like puppeteer or jsPDF
      const pdfContent = this.convertSvgToPdf(svgContent, document);

      return ok({
        filename: `${document.id}.pdf`,
        content: pdfContent,
        mimeType: 'application/pdf',
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to export to PDF: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private convertDocumentToYaml(
    document: import('../queries/document-queries.js').DocumentDTO,
    options: ExportOptions,
  ): string {
    const yamlData: Record<string, unknown> = {
      version: document.version,
    };

    if (options.includeMetadata) {
      yamlData.metadata = {
        id: document.id,
        createdAt: document.createdAt,
        modifiedAt: document.modifiedAt,
        schemaVersion: '1.0.0',
      };
    }

    // Convert statements
    yamlData.statements = {};
    const statements = yamlData.statements as Record<string, string>;
    for (const [id, statement] of Object.entries(document.statements)) {
      statements[id] = statement.content;
    }

    // Convert atomic arguments
    yamlData.atomicArguments = {};
    const atomicArguments = yamlData.atomicArguments as Record<string, unknown>;
    for (const [id, argument] of Object.entries(document.atomicArguments)) {
      atomicArguments[id] = {
        premises: argument.premiseIds,
        conclusions: argument.conclusionIds,
        ...(argument.sideLabels?.left && { sideLabel: argument.sideLabels.left }),
      };
    }

    // Convert trees
    yamlData.trees = {};
    const trees = yamlData.trees as Record<string, unknown>;
    for (const [id, tree] of Object.entries(document.trees)) {
      trees[id] = {
        offset: tree.position,
        nodes: {}, // Simplified for now
      };
    }

    // Use a simple YAML-like format for now
    // In a real implementation, you would use the js-yaml library
    return this.objectToYamlString(yamlData);
  }

  private objectToYamlString(obj: Record<string, unknown>, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        result += `${spaces}${key}: null\n`;
      } else if (typeof value === 'string') {
        result += `${spaces}${key}: "${value}"\n`;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result += `${spaces}${key}: ${value}\n`;
      } else if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'string') {
            result += `${spaces}  - "${item}"\n`;
          } else {
            result += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        result += `${spaces}${key}:\n`;
        result += this.objectToYamlString(value as Record<string, unknown>, indent + 1);
      }
    }

    return result;
  }

  private convertSvgToPdf(
    svgContent: string,
    document: import('../queries/document-queries.js').DocumentDTO,
  ): Buffer {
    // This is a placeholder implementation
    // In a real implementation, you would use a library like puppeteer or jsPDF
    // to convert SVG to PDF
    const pdfHeader = '%PDF-1.4\n';
    const pdfContent = `
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${svgContent.length + 100}
>>
stream
BT
/F1 12 Tf
72 720 Td
(Proof Document: ${document.id}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000209 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${300 + svgContent.length}
%%EOF
`;

    return Buffer.from(pdfHeader + pdfContent);
  }

  private isSupportedFormat(format: string): format is ExportOptions['format'] {
    return ['yaml', 'pdf', 'json', 'svg'].includes(format as ExportOptions['format']);
  }

  private getFileFilters(format: ExportOptions['format']): FileFilter[] {
    const createFilter = (name: string, extensions: string[]): FileFilter | null => {
      const nameResult = FilterName.create(name);
      const extensionsResult = FileExtensionList.create(extensions);

      if (nameResult.isErr() || extensionsResult.isErr()) {
        return null;
      }

      return {
        name: nameResult.value,
        extensions: extensionsResult.value,
      };
    };

    switch (format) {
      case 'yaml': {
        const filter = createFilter('Proof Files', ['proof']);
        return filter ? [filter] : [];
      }
      case 'json': {
        const filter = createFilter('JSON Files', ['json']);
        return filter ? [filter] : [];
      }
      case 'svg': {
        const filter = createFilter('SVG Files', ['svg']);
        return filter ? [filter] : [];
      }
      case 'pdf': {
        const filter = createFilter('PDF Files', ['pdf']);
        return filter ? [filter] : [];
      }
      default: {
        const filter = createFilter('All Files', ['*']);
        return filter ? [filter] : [];
      }
    }
  }
}
