import { err, ok, type Result } from 'neverthrow';
import type { IFileSystemPort } from '../../../application/ports/IFileSystemPort.js';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { RepositoryError } from '../../../domain/errors/DomainErrors.js';
import type { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import type { IIdentityService } from '../../../domain/services/IIdentityService.js';
import {
  DocumentContent,
  FilePath,
  ProofDocumentId,
} from '../../../domain/shared/value-objects/index.js';
import { YAMLDeserializer } from './YAMLDeserializer.js';
import { YAMLSerializer } from './YAMLSerializer.js';

export class YAMLProofDocumentRepository implements IProofDocumentRepository {
  private readonly fileExtension = '.proof.yaml';

  constructor(
    private readonly fileSystem: IFileSystemPort,
    private readonly basePath: string,
  ) {}

  async findById(id: ProofDocumentId): Promise<Result<ProofDocument, RepositoryError>> {
    const filePathResult = this.getFilePath(id);
    if (filePathResult.isErr()) {
      return err(
        new RepositoryError(`Failed to create file path: ${filePathResult.error.message}`),
      );
    }

    // Check if file exists
    const existsResult = await this.fileSystem.exists(filePathResult.value);
    if (existsResult.isErr()) {
      return err(
        new RepositoryError(`Failed to check file existence: ${existsResult.error.message}`),
      );
    }
    if (!existsResult.value) {
      return err(new RepositoryError(`Document not found: ${id.getValue()}`));
    }

    // Read file content
    const contentResult = await this.fileSystem.readFile(filePathResult.value);
    if (contentResult.isErr()) {
      return err(new RepositoryError(`Failed to read file: ${contentResult.error.message}`));
    }

    // Deserialize YAML to domain aggregate
    const deserializer = new YAMLDeserializer();
    const documentResult = await deserializer.deserialize(contentResult.value.getValue());
    if (documentResult.isErr()) {
      return err(
        new RepositoryError(`Failed to deserialize document: ${documentResult.error.message}`),
      );
    }

    return ok(documentResult.value);
  }

  async save(document: ProofDocument): Promise<Result<void, RepositoryError>> {
    // Serialize domain aggregate to YAML
    // This must handle empty documents properly for bootstrap-first design
    const serializer = new YAMLSerializer();
    const yamlResult = await serializer.serialize(document);
    if (yamlResult.isErr()) {
      return err(new RepositoryError(`Failed to serialize document: ${yamlResult.error.message}`));
    }

    // Get document ID through query service
    const queryService = document.createQueryService();
    const filePathResult = this.getFilePath(queryService.getId());
    if (filePathResult.isErr()) {
      return err(
        new RepositoryError(`Failed to create file path: ${filePathResult.error.message}`),
      );
    }

    // Create DocumentContent value object
    const contentResult = DocumentContent.create(yamlResult.value);
    if (contentResult.isErr()) {
      return err(
        new RepositoryError(`Failed to create document content: ${contentResult.error.message}`),
      );
    }

    // Write to file system
    const writeResult = await this.fileSystem.writeFile(filePathResult.value, contentResult.value);
    if (writeResult.isErr()) {
      return err(new RepositoryError(`Failed to write document: ${writeResult.error.message}`));
    }

    return ok(undefined);
  }

  async exists(id: ProofDocumentId): Promise<Result<boolean, RepositoryError>> {
    const filePathResult = this.getFilePath(id);
    if (filePathResult.isErr()) {
      return err(
        new RepositoryError(`Failed to create file path: ${filePathResult.error.message}`),
      );
    }

    const result = await this.fileSystem.exists(filePathResult.value);
    if (result.isErr()) {
      return err(new RepositoryError(`Failed to check existence: ${result.error.message}`));
    }

    return ok(result.value);
  }

  async delete(id: ProofDocumentId): Promise<Result<void, RepositoryError>> {
    const filePathResult = this.getFilePath(id);
    if (filePathResult.isErr()) {
      return err(
        new RepositoryError(`Failed to create file path: ${filePathResult.error.message}`),
      );
    }

    // Check if exists first
    const existsResult = await this.exists(id);
    if (existsResult.isErr()) {
      return err(existsResult.error);
    }
    if (!existsResult.value) {
      return err(new RepositoryError(`Document not found: ${id.getValue()}`));
    }

    // Delete file - use correct method name
    const deleteResult = await this.fileSystem.delete(filePathResult.value);
    if (deleteResult.isErr()) {
      return err(new RepositoryError(`Failed to delete document: ${deleteResult.error.message}`));
    }

    return ok(undefined);
  }

  async findAll(): Promise<Result<ProofDocument[], RepositoryError>> {
    // Create FilePath for base path
    const basePathResult = FilePath.create(this.basePath);
    if (basePathResult.isErr()) {
      return err(new RepositoryError(`Invalid base path: ${basePathResult.error.message}`));
    }

    // List all files in base path - use correct method name
    const filesResult = await this.fileSystem.readDirectory(basePathResult.value);
    if (filesResult.isErr()) {
      return err(new RepositoryError(`Failed to read directory: ${filesResult.error.message}`));
    }

    // Filter for proof files and load each
    const documents: ProofDocument[] = [];
    const errors: string[] = [];

    for (const fileInfo of filesResult.value) {
      const fileName = fileInfo.name.getValue();
      if (fileName.endsWith(this.fileExtension)) {
        const idMatch = fileName.match(/^(.+)\.proof\.yaml$/);
        if (idMatch?.[1]) {
          const idResult = ProofDocumentId.create(idMatch[1]);
          if (idResult.isOk()) {
            const docResult = await this.findById(idResult.value);
            if (docResult.isOk()) {
              documents.push(docResult.value);
            } else {
              errors.push(`Failed to load ${fileName}: ${docResult.error.message}`);
            }
          }
        }
      }
    }

    if (errors.length > 0 && documents.length === 0) {
      return err(new RepositoryError(`Failed to load documents: ${errors.join('; ')}`));
    }

    return ok(documents);
  }

  async findByDateRange(from: Date, to: Date): Promise<Result<ProofDocument[], RepositoryError>> {
    const allDocsResult = await this.findAll();
    if (allDocsResult.isErr()) {
      return err(allDocsResult.error);
    }

    // Filter by date range using document creation/modification dates
    const filtered = allDocsResult.value.filter((doc) => {
      const queryService = doc.createQueryService();
      const createdAt = queryService.getCreatedAt();
      const modifiedAt = queryService.getModifiedAt();
      return (createdAt >= from && createdAt <= to) || (modifiedAt >= from && modifiedAt <= to);
    });

    return ok(filtered);
  }

  async count(): Promise<Result<number, RepositoryError>> {
    const allDocsResult = await this.findAll();
    if (allDocsResult.isErr()) {
      return err(allDocsResult.error);
    }
    return ok(allDocsResult.value.length);
  }

  // Bootstrap-first design support
  async createBootstrapDocument(
    identityService: IIdentityService,
  ): Promise<Result<ProofDocument, RepositoryError>> {
    const id = identityService.generateProofDocumentId();
    return this.createBootstrapDocumentWithId(id);
  }

  async createBootstrapDocumentWithId(
    id: ProofDocumentId,
  ): Promise<Result<ProofDocument, RepositoryError>> {
    // Create completely empty document - bootstrap-first principle
    const bootstrapDocumentResult = ProofDocument.createBootstrap(id);
    if (bootstrapDocumentResult.isErr()) {
      return err(
        new RepositoryError(
          `Failed to create bootstrap document: ${bootstrapDocumentResult.error.message}`,
        ),
      );
    }

    // Save the bootstrap document
    const saveResult = await this.save(bootstrapDocumentResult.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(bootstrapDocumentResult.value);
  }

  // Helper methods
  private getFilePath(id: ProofDocumentId): Result<FilePath, RepositoryError> {
    const path = `${this.basePath}/${id.getValue()}${this.fileExtension}`;
    const filePathResult = FilePath.create(path);
    if (filePathResult.isErr()) {
      return err(new RepositoryError(`Invalid file path: ${filePathResult.error.message}`));
    }
    return ok(filePathResult.value);
  }
}
