import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, type MockedObject, test, vi } from 'vitest';
import type { IFileSystemPort } from '../../../../application/ports/IFileSystemPort.js';
import { proofDocumentFactory } from '../../../../domain/__tests__/factories/index.js';
import type { IIdentityService } from '../../../../domain/services/IIdentityService.js';
import {
  DocumentContent,
  ErrorCode,
  ErrorMessage,
  FileName,
  FilePath,
  ProofDocumentId,
} from '../../../../domain/shared/value-objects/index.js';
import { YAMLProofDocumentRepository } from '../YAMLProofDocumentRepository.js';

describe('YAMLProofDocumentRepository', () => {
  let repository: YAMLProofDocumentRepository;
  let mockFileSystem: MockedObject<IFileSystemPort>;
  let mockIdentityService: MockedObject<IIdentityService>;

  beforeEach(() => {
    mockIdentityService = {
      generateProofDocumentId: vi.fn(),
      generateStatementId: vi.fn(),
      generateAtomicArgumentId: vi.fn(),
      generateNodeId: vi.fn(),
      generateTreeId: vi.fn(),
      generateDocumentId: vi.fn(),
      generatePackageId: vi.fn(),
      generateProofId: vi.fn(),
      generateProofTreeId: vi.fn(),
      generateWebviewId: vi.fn(),
    };

    mockFileSystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
      readDirectory: vi.fn(),
      createDirectory: vi.fn(),
      getStoredDocument: vi.fn(),
      storeDocument: vi.fn(),
      deleteStoredDocument: vi.fn(),
      listStoredDocuments: vi.fn(),
      capabilities: vi.fn(),
      watch: vi.fn(),
    } as MockedObject<IFileSystemPort>;
    repository = new YAMLProofDocumentRepository(mockFileSystem, '/test/path');
  });

  describe('findById', () => {
    test('returns document when file exists', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      const yamlContent = `
version: 1
metadata:
  id: doc123
  createdAt: 2024-01-01T00:00:00.000Z
  modifiedAt: 2024-01-01T00:00:00.000Z
  schemaVersion: "1.0.0"
statements:
  stmt1: "All men are mortal"
orderedSets:
  os1: [stmt1]
atomicArguments:
  arg1:
    premises: os1
    conclusions: null
trees: {}
`;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const contentResult = DocumentContent.create(yamlContent);
      expect(contentResult.isOk()).toBe(true);
      if (contentResult.isErr()) return;
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(ok(contentResult.value));

      const result = await repository.findById(testId.value);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.createQueryService().getId().getValue()).toBe('doc123');
    });

    test('returns error when file not found', async () => {
      const testId = ProofDocumentId.create('missing');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(false));

      const result = await repository.findById(testId.value);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Document not found');
    });

    test('returns error on read failure', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const errorMessage = ErrorMessage.create('Read failed');
      const errorCode = ErrorCode.create('PERMISSION_DENIED');
      expect(errorMessage.isOk()).toBe(true);
      expect(errorCode.isOk()).toBe(true);
      if (errorMessage.isErr() || errorCode.isErr()) return;

      vi.mocked(mockFileSystem).readFile.mockResolvedValue(
        err({ message: errorMessage.value, code: errorCode.value }),
      );

      const result = await repository.findById(testId.value);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to read file');
    });

    test('returns error on deserialization failure', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const contentResult = DocumentContent.create('invalid yaml content');
      expect(contentResult.isOk()).toBe(true);
      if (contentResult.isErr()) return;
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(ok(contentResult.value));

      const result = await repository.findById(testId.value);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to deserialize document');
    });
  });

  describe('save', () => {
    test('saves document successfully', async () => {
      const document = proofDocumentFactory.build();
      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(ok(undefined));

      const result = await repository.save(document);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.any(FilePath),
        expect.objectContaining({ getValue: expect.any(Function) }),
      );
    });

    test('saves bootstrap document successfully', async () => {
      const testId = ProofDocumentId.create('bootstrap-doc');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      const bootstrapDocument = proofDocumentFactory.build({}, { transient: { isEmpty: true } });
      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(ok(undefined));

      const result = await repository.save(bootstrapDocument);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.any(FilePath),
        expect.objectContaining({ getValue: expect.any(Function) }),
      );
    });

    test('returns error on write failure', async () => {
      const document = proofDocumentFactory.build();
      const errorMessage = ErrorMessage.create('Write failed');
      const errorCode = ErrorCode.create('DISK_FULL');
      expect(errorMessage.isOk()).toBe(true);
      expect(errorCode.isOk()).toBe(true);
      if (errorMessage.isErr() || errorCode.isErr()) return;

      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(
        err({ message: errorMessage.value, code: errorCode.value }),
      );

      const result = await repository.save(document);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to write document');
    });
  });

  describe('exists', () => {
    test('returns true when file exists', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));

      const result = await repository.exists(testId.value);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value).toBe(true);
    });

    test('returns false when file does not exist', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(false));

      const result = await repository.exists(testId.value);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value).toBe(false);
    });

    test('returns error on filesystem error', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      const errorMessage = ErrorMessage.create('Access denied');
      const errorCode = ErrorCode.create('PERMISSION_DENIED');
      expect(errorMessage.isOk()).toBe(true);
      expect(errorCode.isOk()).toBe(true);
      if (errorMessage.isErr() || errorCode.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(
        err({ message: errorMessage.value, code: errorCode.value }),
      );

      const result = await repository.exists(testId.value);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to check existence');
    });
  });

  describe('delete', () => {
    test('deletes existing document successfully', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      vi.mocked(mockFileSystem).delete.mockResolvedValue(ok(undefined));

      const result = await repository.delete(testId.value);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockFileSystem).delete).toHaveBeenCalledWith(expect.any(FilePath));
    });

    test('returns error when document does not exist', async () => {
      const testId = ProofDocumentId.create('missing');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(false));

      const result = await repository.delete(testId.value);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Document not found');
    });

    test('returns error on delete failure', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const errorMessage = ErrorMessage.create('Delete failed');
      const errorCode = ErrorCode.create('PERMISSION_DENIED');
      expect(errorMessage.isOk()).toBe(true);
      expect(errorCode.isOk()).toBe(true);
      if (errorMessage.isErr() || errorCode.isErr()) return;

      vi.mocked(mockFileSystem).delete.mockResolvedValue(
        err({ message: errorMessage.value, code: errorCode.value }),
      );

      const result = await repository.delete(testId.value);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to delete document');
    });
  });

  describe('findAll', () => {
    test('returns all documents in directory', async () => {
      const fileNameResult1 = FileName.create('doc1.proof.yaml');
      const fileNameResult2 = FileName.create('doc2.proof.yaml');
      const fileNameResult3 = FileName.create('other.txt');
      const filePathResult1 = FilePath.create('/test/path/doc1.proof.yaml');
      const filePathResult2 = FilePath.create('/test/path/doc2.proof.yaml');
      const filePathResult3 = FilePath.create('/test/path/other.txt');

      expect(fileNameResult1.isOk()).toBe(true);
      expect(fileNameResult2.isOk()).toBe(true);
      expect(fileNameResult3.isOk()).toBe(true);
      expect(filePathResult1.isOk()).toBe(true);
      expect(filePathResult2.isOk()).toBe(true);
      expect(filePathResult3.isOk()).toBe(true);

      if (
        fileNameResult1.isErr() ||
        fileNameResult2.isErr() ||
        fileNameResult3.isErr() ||
        filePathResult1.isErr() ||
        filePathResult2.isErr() ||
        filePathResult3.isErr()
      )
        return;

      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        ok([
          {
            name: fileNameResult1.value,
            path: filePathResult1.value,
            isDirectory: false,
          },
          {
            name: fileNameResult2.value,
            path: filePathResult2.value,
            isDirectory: false,
          },
          { name: fileNameResult3.value, path: filePathResult3.value, isDirectory: false }, // Should be ignored
        ]),
      );

      // Mock reading each document
      const yamlContent1 = createValidYAML('doc1');
      const yamlContent2 = createValidYAML('doc2');

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const contentResult1 = DocumentContent.create(yamlContent1);
      const contentResult2 = DocumentContent.create(yamlContent2);
      expect(contentResult1.isOk()).toBe(true);
      expect(contentResult2.isOk()).toBe(true);
      if (contentResult1.isErr() || contentResult2.isErr()) return;

      vi.mocked(mockFileSystem)
        .readFile.mockResolvedValueOnce(ok(contentResult1.value))
        .mockResolvedValueOnce(ok(contentResult2.value));

      const result = await repository.findAll();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value).toHaveLength(2);
      expect(result.value[0]?.createQueryService().getId().getValue()).toBe('doc1');
      expect(result.value[1]?.createQueryService().getId().getValue()).toBe('doc2');
    });

    test('returns empty array on directory read failure', async () => {
      const errorMessage = ErrorMessage.create('Read failed');
      const errorCode = ErrorCode.create('PERMISSION_DENIED');
      expect(errorMessage.isOk()).toBe(true);
      expect(errorCode.isOk()).toBe(true);
      if (errorMessage.isErr() || errorCode.isErr()) return;

      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        err({ message: errorMessage.value, code: errorCode.value }),
      );

      const result = await repository.findAll();

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to read directory');
    });

    test('handles invalid document IDs gracefully', async () => {
      const invalidNameResult = FileName.create('.proof.yaml');
      const validNameResult = FileName.create('valid-doc.proof.yaml');
      const invalidPathResult = FilePath.create('/test/path/.proof.yaml');
      const validPathResult = FilePath.create('/test/path/valid-doc.proof.yaml');

      expect(invalidNameResult.isOk()).toBe(true);
      expect(validNameResult.isOk()).toBe(true);
      expect(invalidPathResult.isOk()).toBe(true);
      expect(validPathResult.isOk()).toBe(true);

      if (
        invalidNameResult.isErr() ||
        validNameResult.isErr() ||
        invalidPathResult.isErr() ||
        validPathResult.isErr()
      )
        return;

      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        ok([
          {
            name: invalidNameResult.value,
            path: invalidPathResult.value,
            isDirectory: false,
          },
          {
            name: validNameResult.value,
            path: validPathResult.value,
            isDirectory: false,
          },
        ]),
      );

      const validYaml = createValidYAML('valid-doc');
      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const contentResult = DocumentContent.create(validYaml);
      expect(contentResult.isOk()).toBe(true);
      if (contentResult.isErr()) return;
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(ok(contentResult.value));

      const result = await repository.findAll();

      // Should only return the valid document
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.createQueryService().getId().getValue()).toBe('valid-doc');
    });
  });

  describe('findByDateRange', () => {
    test('filters documents by date range', async () => {
      const doc1 = proofDocumentFactory.build();
      const doc2 = proofDocumentFactory.build();

      // Mock findAll to return both documents
      const doc1Id = doc1.createQueryService().getId().getValue();
      const doc2Id = doc2.createQueryService().getId().getValue();
      const fileName1Result = FileName.create(`${doc1Id}.proof.yaml`);
      const fileName2Result = FileName.create(`${doc2Id}.proof.yaml`);
      const filePath1Result = FilePath.create(`/test/path/${doc1Id}.proof.yaml`);
      const filePath2Result = FilePath.create(`/test/path/${doc2Id}.proof.yaml`);

      expect(fileName1Result.isOk()).toBe(true);
      expect(fileName2Result.isOk()).toBe(true);
      expect(filePath1Result.isOk()).toBe(true);
      expect(filePath2Result.isOk()).toBe(true);

      if (
        fileName1Result.isErr() ||
        fileName2Result.isErr() ||
        filePath1Result.isErr() ||
        filePath2Result.isErr()
      )
        return;

      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        ok([
          {
            name: fileName1Result.value,
            path: filePath1Result.value,
            isDirectory: false,
          },
          {
            name: fileName2Result.value,
            path: filePath2Result.value,
            isDirectory: false,
          },
        ]),
      );

      const yaml1 = createValidYAMLForDocument(doc1);
      const yaml2 = createValidYAMLForDocument(doc2);

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const contentResult1 = DocumentContent.create(yaml1);
      const contentResult2 = DocumentContent.create(yaml2);
      expect(contentResult1.isOk()).toBe(true);
      expect(contentResult2.isOk()).toBe(true);
      if (contentResult1.isErr() || contentResult2.isErr()) return;

      vi.mocked(mockFileSystem)
        .readFile.mockResolvedValueOnce(ok(contentResult1.value))
        .mockResolvedValueOnce(ok(contentResult2.value));

      const from = new Date('2024-01-01');
      const to = new Date('2025-12-31');

      const result = await repository.findByDateRange(from, to);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value).toHaveLength(2);
    });
  });

  describe('count', () => {
    test('returns correct document count', async () => {
      const fileName1Result = FileName.create('doc1.proof.yaml');
      const fileName2Result = FileName.create('doc2.proof.yaml');
      const filePath1Result = FilePath.create('/test/path/doc1.proof.yaml');
      const filePath2Result = FilePath.create('/test/path/doc2.proof.yaml');

      expect(fileName1Result.isOk()).toBe(true);
      expect(fileName2Result.isOk()).toBe(true);
      expect(filePath1Result.isOk()).toBe(true);
      expect(filePath2Result.isOk()).toBe(true);

      if (
        fileName1Result.isErr() ||
        fileName2Result.isErr() ||
        filePath1Result.isErr() ||
        filePath2Result.isErr()
      )
        return;

      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        ok([
          {
            name: fileName1Result.value,
            path: filePath1Result.value,
            isDirectory: false,
          },
          {
            name: fileName2Result.value,
            path: filePath2Result.value,
            isDirectory: false,
          },
        ]),
      );

      const yaml1 = createValidYAML('doc1');
      const yaml2 = createValidYAML('doc2');

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const contentResult1 = DocumentContent.create(yaml1);
      const contentResult2 = DocumentContent.create(yaml2);
      expect(contentResult1.isOk()).toBe(true);
      expect(contentResult2.isOk()).toBe(true);
      if (contentResult1.isErr() || contentResult2.isErr()) return;

      vi.mocked(mockFileSystem)
        .readFile.mockResolvedValueOnce(ok(contentResult1.value))
        .mockResolvedValueOnce(ok(contentResult2.value));

      const result = await repository.count();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value).toBe(2);
    });
  });

  describe('createBootstrapDocument', () => {
    test('creates empty bootstrap document and saves it', async () => {
      // Mock identity service to generate a valid ID
      const testId = ProofDocumentId.create('bootstrap-test');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockIdentityService).generateProofDocumentId.mockReturnValue(testId.value);
      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(ok(undefined));

      const result = await repository.createBootstrapDocument(mockIdentityService);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.any(FilePath),
        expect.objectContaining({ getValue: expect.any(Function) }),
      );
    });

    test('returns error if save fails', async () => {
      // Mock identity service to generate a valid ID
      const testId = ProofDocumentId.create('bootstrap-test-fail');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockIdentityService).generateProofDocumentId.mockReturnValue(testId.value);
      const errorMessage = ErrorMessage.create('Write failed');
      const errorCode = ErrorCode.create('DISK_FULL');
      expect(errorMessage.isOk()).toBe(true);
      expect(errorCode.isOk()).toBe(true);
      if (errorMessage.isErr() || errorCode.isErr()) return;

      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(
        err({ message: errorMessage.value, code: errorCode.value }),
      );

      const result = await repository.createBootstrapDocument(mockIdentityService);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to write document');
    });
  });

  describe('createBootstrapDocumentWithId', () => {
    test('creates bootstrap document with specific ID', async () => {
      const customId = ProofDocumentId.create('custom-bootstrap');
      expect(customId.isOk()).toBe(true);
      if (customId.isErr()) return;

      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(ok(undefined));

      const result = await repository.createBootstrapDocumentWithId(customId.value);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.any(FilePath),
        expect.objectContaining({ getValue: expect.any(Function) }),
      );
    });

    test('returns error if bootstrap creation fails', async () => {
      // Create an invalid ID that should cause bootstrap creation to fail
      const invalidId = ProofDocumentId.create('');
      expect(invalidId.isErr()).toBe(true);
      if (invalidId.isOk()) return;

      // Since we can't create an invalid ProofDocumentId, let's simulate a save failure instead
      const validId = ProofDocumentId.create('test-id');
      expect(validId.isOk()).toBe(true);
      if (validId.isErr()) return;

      const errorMessage = ErrorMessage.create('Write failed');
      const errorCode = ErrorCode.create('DISK_FULL');
      expect(errorMessage.isOk()).toBe(true);
      expect(errorCode.isOk()).toBe(true);
      if (errorMessage.isErr() || errorCode.isErr()) return;

      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(
        err({ message: errorMessage.value, code: errorCode.value }),
      );

      const result = await repository.createBootstrapDocumentWithId(validId.value);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to write document');
    });
  });
});

// Helper functions
function createValidYAML(id: string): string {
  return `
version: 1
metadata:
  id: ${id}
  createdAt: 2024-01-01T00:00:00.000Z
  modifiedAt: 2024-01-01T00:00:00.000Z
  schemaVersion: "1.0.0"
statements:
  stmt1: "All men are mortal"
orderedSets:
  os1: [stmt1]
atomicArguments:
  arg1:
    premises: os1
    conclusions: null
trees: {}
`;
}

function createValidYAMLForDocument(document: any): string {
  return `
version: ${document.getVersion()}
metadata:
  id: ${document.getId().getValue()}
  createdAt: ${document.getCreatedAt().toISOString()}
  modifiedAt: ${document.getModifiedAt().toISOString()}
  schemaVersion: "1.0.0"
statements: {}
orderedSets: {}
atomicArguments: {}
trees: {}
`;
}
