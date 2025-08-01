import { err, ok, type Result } from 'neverthrow';
import type { IFileSystemPort } from '../../../application/ports/IFileSystemPort.js';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import type { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import type { IIdentityService } from '../../../domain/services/IIdentityService.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { ProofDocumentId } from '../../../domain/shared/value-objects/index.js';
import { YAMLDeserializer } from './YAMLDeserializer.js';
import { YAMLSerializer } from './YAMLSerializer.js';

export class YAMLProofDocumentRepository implements IProofDocumentRepository {
  private readonly fileExtension = '.proof.yaml';

  constructor(
    private readonly fileSystem: IFileSystemPort,
    private readonly basePath: string,
  ) {}

  async findById(id: ProofDocumentId): Promise<ProofDocument | null> {
    const filePath = this.getFilePath(id);

    // Check if file exists
    const existsResult = await this.fileSystem.exists(filePath);
    if (existsResult.isErr() || !existsResult.value) {
      return null;
    }

    // Read file content
    const contentResult = await this.fileSystem.readFile(filePath);
    if (contentResult.isErr()) {
      // Use Result pattern - don't throw
      return null;
    }

    // Deserialize YAML to domain aggregate
    const deserializer = new YAMLDeserializer();
    const documentResult = await deserializer.deserialize(contentResult.value);
    if (documentResult.isErr()) {
      // Use Result pattern - don't throw
      return null;
    }

    return documentResult.value;
  }

  async save(document: ProofDocument): Promise<Result<void, ValidationError>> {
    // Serialize domain aggregate to YAML
    // This must handle empty documents properly for bootstrap-first design
    const serializer = new YAMLSerializer();
    const yamlResult = await serializer.serialize(document);
    if (yamlResult.isErr()) {
      return err(new ValidationError(`Failed to serialize document: ${yamlResult.error.message}`));
    }

    // Write to file system
    const filePath = this.getFilePath(document.getId());
    const writeResult = await this.fileSystem.writeFile(filePath, yamlResult.value);
    if (writeResult.isErr()) {
      return err(new ValidationError(`Failed to write document: ${writeResult.error.message}`));
    }

    return ok(undefined);
  }

  async exists(id: ProofDocumentId): Promise<boolean> {
    const filePath = this.getFilePath(id);
    const result = await this.fileSystem.exists(filePath);
    return result.isOk() ? result.value : false;
  }

  async delete(id: ProofDocumentId): Promise<Result<void, ValidationError>> {
    const filePath = this.getFilePath(id);

    // Check if exists first
    if (!(await this.exists(id))) {
      return err(new ValidationError(`Document not found: ${id.getValue()}`));
    }

    // Delete file - use correct method name
    const deleteResult = await this.fileSystem.delete(filePath);
    if (deleteResult.isErr()) {
      return err(new ValidationError(`Failed to delete document: ${deleteResult.error.message}`));
    }

    return ok(undefined);
  }

  async findAll(): Promise<ProofDocument[]> {
    // List all files in base path - use correct method name
    const filesResult = await this.fileSystem.readDirectory(this.basePath);
    if (filesResult.isErr()) {
      return []; // Return empty array on error instead of throwing
    }

    // Filter for proof files and load each
    const proofFiles = filesResult.value
      .filter((fileInfo) => fileInfo.name.endsWith(this.fileExtension))
      .map((fileInfo) => fileInfo.name);
    const documents: ProofDocument[] = [];

    for (const file of proofFiles) {
      const idMatch = file.match(/^(.+)\.proof\.yaml$/);
      if (idMatch?.[1]) {
        const idResult = ProofDocumentId.create(idMatch[1]);
        if (idResult.isOk()) {
          const doc = await this.findById(idResult.value);
          if (doc) documents.push(doc);
        }
      }
    }

    return documents;
  }

  async findByDateRange(from: Date, to: Date): Promise<ProofDocument[]> {
    const allDocs = await this.findAll();
    // Filter by date range using document creation/modification dates
    return allDocs.filter((doc) => {
      const createdAt = doc.getCreatedAt();
      const modifiedAt = doc.getModifiedAt();
      return (createdAt >= from && createdAt <= to) || (modifiedAt >= from && modifiedAt <= to);
    });
  }

  async count(): Promise<number> {
    const allDocs = await this.findAll();
    return allDocs.length;
  }

  // Bootstrap-first design support
  async createBootstrapDocument(
    identityService: IIdentityService,
  ): Promise<Result<ProofDocument, ValidationError>> {
    const id = identityService.generateProofDocumentId();
    return this.createBootstrapDocumentWithId(id);
  }

  async createBootstrapDocumentWithId(
    id: ProofDocumentId,
  ): Promise<Result<ProofDocument, ValidationError>> {
    // Create completely empty document - bootstrap-first principle
    const bootstrapDocumentResult = ProofDocument.createBootstrap(id);
    if (bootstrapDocumentResult.isErr()) {
      return err(bootstrapDocumentResult.error);
    }

    // Save the bootstrap document
    const saveResult = await this.save(bootstrapDocumentResult.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(bootstrapDocumentResult.value);
  }

  // Helper methods
  private getFilePath(id: ProofDocumentId): string {
    return `${this.basePath}/${id.getValue()}${this.fileExtension}`;
  }
}
