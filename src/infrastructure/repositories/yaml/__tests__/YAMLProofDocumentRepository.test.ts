import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, type MockedObject, test, vi } from 'vitest';
import type { IFileSystemPort } from '../../../../application/ports/IFileSystemPort.js';
import { proofDocumentFactory } from '../../../../domain/__tests__/factories/index.js';
import { ProofDocumentId } from '../../../../domain/shared/value-objects.js';
import { YAMLProofDocumentRepository } from '../YAMLProofDocumentRepository.js';

describe('YAMLProofDocumentRepository', () => {
  let repository: YAMLProofDocumentRepository;
  let mockFileSystem: MockedObject<IFileSystemPort>;

  beforeEach(() => {
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
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(ok(yamlContent));

      const result = await repository.findById(testId.value);

      expect(result).not.toBeNull();
      expect(result?.getId().getValue()).toBe('doc123');
    });

    test('returns null when file not found', async () => {
      const testId = ProofDocumentId.create('missing');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(false));

      const result = await repository.findById(testId.value);

      expect(result).toBeNull();
    });

    test('returns null on read failure', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(
        err({ message: 'Read failed', code: 'PERMISSION_DENIED' }),
      );

      const result = await repository.findById(testId.value);

      expect(result).toBeNull();
    });

    test('returns null on deserialization failure', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(ok('invalid yaml content'));

      const result = await repository.findById(testId.value);

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    test('saves document successfully', async () => {
      const document = proofDocumentFactory.build();
      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(ok(undefined));

      const result = await repository.save(document);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        `/test/path/${document.getId().getValue()}.proof.yaml`,
        expect.stringContaining('version: 6'),
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
        `/test/path/${bootstrapDocument.getId().getValue()}.proof.yaml`,
        expect.stringContaining('statements: {}'),
      );
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('orderedSets: {}'),
      );
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('atomicArguments: {}'),
      );
    });

    test('returns error on write failure', async () => {
      const document = proofDocumentFactory.build();
      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(
        err({ message: 'Write failed', code: 'DISK_FULL' }),
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

      expect(result).toBe(true);
    });

    test('returns false when file does not exist', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(false));

      const result = await repository.exists(testId.value);

      expect(result).toBe(false);
    });

    test('returns false on filesystem error', async () => {
      const testId = ProofDocumentId.create('doc123');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      vi.mocked(mockFileSystem).exists.mockResolvedValue(
        err({ message: 'Access denied', code: 'PERMISSION_DENIED' }),
      );

      const result = await repository.exists(testId.value);

      expect(result).toBe(false);
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
      expect(vi.mocked(mockFileSystem).delete).toHaveBeenCalledWith('/test/path/doc123.proof.yaml');
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
      vi.mocked(mockFileSystem).delete.mockResolvedValue(
        err({ message: 'Delete failed', code: 'PERMISSION_DENIED' }),
      );

      const result = await repository.delete(testId.value);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to delete document');
    });
  });

  describe('findAll', () => {
    test('returns all documents in directory', async () => {
      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        ok([
          {
            name: 'doc1.proof.yaml',
            path: '/test/path/doc1.proof.yaml',
            isDirectory: false,
          },
          {
            name: 'doc2.proof.yaml',
            path: '/test/path/doc2.proof.yaml',
            isDirectory: false,
          },
          { name: 'other.txt', path: '/test/path/other.txt', isDirectory: false }, // Should be ignored
        ]),
      );

      // Mock reading each document
      const yamlContent1 = createValidYAML('doc1');
      const yamlContent2 = createValidYAML('doc2');

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      vi.mocked(mockFileSystem)
        .readFile.mockResolvedValueOnce(ok(yamlContent1))
        .mockResolvedValueOnce(ok(yamlContent2));

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]?.getId().getValue()).toBe('doc1');
      expect(result[1]?.getId().getValue()).toBe('doc2');
    });

    test('returns empty array on directory read failure', async () => {
      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        err({ message: 'Read failed', code: 'PERMISSION_DENIED' }),
      );

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    test('handles invalid document IDs gracefully', async () => {
      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        ok([
          {
            name: '.proof.yaml', // Empty filename - invalid ID
            path: '/test/path/.proof.yaml',
            isDirectory: false,
          },
          {
            name: 'valid-doc.proof.yaml',
            path: '/test/path/valid-doc.proof.yaml',
            isDirectory: false,
          },
        ]),
      );

      const validYaml = createValidYAML('valid-doc');
      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(ok(validYaml));

      const result = await repository.findAll();

      // Should only return the valid document
      expect(result).toHaveLength(1);
      expect(result[0]?.getId().getValue()).toBe('valid-doc');
    });
  });

  describe('findByDateRange', () => {
    test('filters documents by date range', async () => {
      const doc1 = proofDocumentFactory.build();
      const doc2 = proofDocumentFactory.build();

      // Mock findAll to return both documents
      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        ok([
          {
            name: `${doc1.getId().getValue()}.proof.yaml`,
            path: `/test/path/${doc1.getId().getValue()}.proof.yaml`,
            isDirectory: false,
          },
          {
            name: `${doc2.getId().getValue()}.proof.yaml`,
            path: `/test/path/${doc2.getId().getValue()}.proof.yaml`,
            isDirectory: false,
          },
        ]),
      );

      const yaml1 = createValidYAMLForDocument(doc1);
      const yaml2 = createValidYAMLForDocument(doc2);

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      vi.mocked(mockFileSystem)
        .readFile.mockResolvedValueOnce(ok(yaml1))
        .mockResolvedValueOnce(ok(yaml2));

      const from = new Date('2024-01-01');
      const to = new Date('2025-12-31');

      const result = await repository.findByDateRange(from, to);

      expect(result).toHaveLength(2);
    });
  });

  describe('count', () => {
    test('returns correct document count', async () => {
      vi.mocked(mockFileSystem).readDirectory.mockResolvedValue(
        ok([
          {
            name: 'doc1.proof.yaml',
            path: '/test/path/doc1.proof.yaml',
            isDirectory: false,
          },
          {
            name: 'doc2.proof.yaml',
            path: '/test/path/doc2.proof.yaml',
            isDirectory: false,
          },
        ]),
      );

      const yaml1 = createValidYAML('doc1');
      const yaml2 = createValidYAML('doc2');

      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      vi.mocked(mockFileSystem)
        .readFile.mockResolvedValueOnce(ok(yaml1))
        .mockResolvedValueOnce(ok(yaml2));

      const result = await repository.count();

      expect(result).toBe(2);
    });
  });

  describe('createBootstrapDocument', () => {
    test('creates empty bootstrap document and saves it', async () => {
      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(ok(undefined));

      const result = await repository.createBootstrapDocument();

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.proof.yaml'),
        expect.stringContaining('statements: {}'),
      );
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('orderedSets: {}'),
      );
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('atomicArguments: {}'),
      );
    });

    test('returns error if save fails', async () => {
      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(
        err({ message: 'Write failed', code: 'DISK_FULL' }),
      );

      const result = await repository.createBootstrapDocument();

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
        '/test/path/custom-bootstrap.proof.yaml',
        expect.stringContaining('id: custom-bootstrap'),
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

      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(
        err({ message: 'Write failed', code: 'DISK_FULL' }),
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
