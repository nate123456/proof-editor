import { ok } from 'neverthrow';
import { beforeEach, describe, expect, type MockedObject, test, vi } from 'vitest';
import type { IFileSystemPort } from '../../../../application/ports/IFileSystemPort.js';
import { proofDocumentFactory } from '../../../../domain/__tests__/factories/index.js';
import { ProofDocument } from '../../../../domain/aggregates/ProofDocument.js';
import { DocumentContent, ProofDocumentId } from '../../../../domain/shared/value-objects/index.js';
import { YAMLDeserializer } from '../YAMLDeserializer.js';
import { YAMLProofDocumentRepository } from '../YAMLProofDocumentRepository.js';
import { YAMLSerializer } from '../YAMLSerializer.js';

describe('YAML Serialization Integration', () => {
  let serializer: YAMLSerializer;
  let deserializer: YAMLDeserializer;

  beforeEach(() => {
    serializer = new YAMLSerializer();
    deserializer = new YAMLDeserializer();
  });

  describe('Round-trip serialization', () => {
    test('preserves document structure for complex document', async () => {
      const original = createComplexProofDocument();

      // Serialize
      const yamlResult = await serializer.serialize(original);
      expect(yamlResult.isOk()).toBe(true);
      if (yamlResult.isErr()) return;

      // Deserialize
      const reconstructedResult = await deserializer.deserialize(yamlResult.value);
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isErr()) return;

      // Compare structure
      const reconstructed = reconstructedResult.value;
      expect(reconstructed.getId().getValue()).toBe(original.getId().getValue());
      // Version is not exposed as getter, skip this check
      expect(reconstructed.getAllStatements().length).toBe(original.getAllStatements().length);
      expect(reconstructed.getAllOrderedSets().length).toBe(original.getAllOrderedSets().length);
      expect(reconstructed.getAllAtomicArguments().length).toBe(
        original.getAllAtomicArguments().length,
      );

      // Verify specific statement content preservation
      const originalStatements = original.getAllStatements();
      const reconstructedStatements = reconstructed.getAllStatements();
      for (let i = 0; i < originalStatements.length; i++) {
        expect(reconstructedStatements[i]?.getContent()).toBe(originalStatements[i]?.getContent());
      }
    });

    test('handles bootstrap documents correctly', async () => {
      const bootstrapDoc = createBootstrapDocument();

      const yamlResult = await serializer.serialize(bootstrapDoc);
      expect(yamlResult.isOk()).toBe(true);
      if (yamlResult.isErr()) return;

      expect(yamlResult.value).toContain('statements: {}');
      expect(yamlResult.value).toContain('orderedSets: {}');
      expect(yamlResult.value).toContain('atomicArguments: {}');
      expect(yamlResult.value).toContain('trees: {}');
    });

    test('bootstrap document round-trip maintains empty state', async () => {
      const bootstrapDoc = createBootstrapDocument();

      // Serialize
      const yamlResult = await serializer.serialize(bootstrapDoc);
      expect(yamlResult.isOk()).toBe(true);
      if (yamlResult.isErr()) return;

      // Deserialize
      const reconstructedResult = await deserializer.deserialize(yamlResult.value);
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isErr()) return;

      // Verify empty state preserved
      const reconstructed = reconstructedResult.value;
      expect(reconstructed.getAllStatements()).toHaveLength(0);
      expect(reconstructed.getAllOrderedSets()).toHaveLength(0);
      expect(reconstructed.getAllAtomicArguments()).toHaveLength(0);
    });

    test('preserves metadata correctly', async () => {
      const original = proofDocumentFactory.build();

      // Serialize
      const yamlResult = await serializer.serialize(original);
      expect(yamlResult.isOk()).toBe(true);
      if (yamlResult.isErr()) return;

      // Deserialize
      const reconstructedResult = await deserializer.deserialize(yamlResult.value);
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isErr()) return;

      const reconstructed = reconstructedResult.value;
      expect(reconstructed.getId().getValue()).toBe(original.getId().getValue());
      // Version and timestamps are not exposed as getters, skip these checks for now
    });

    test('handles documents with side labels', async () => {
      const doc = ProofDocument.create();

      // Create statements
      const stmt1Result = doc.createStatementFromString('All men are mortal');
      const stmt2Result = doc.createStatementFromString('Socrates is a man');
      const stmt3Result = doc.createStatementFromString('Socrates is mortal');

      expect(stmt1Result.isOk()).toBe(true);
      expect(stmt2Result.isOk()).toBe(true);
      expect(stmt3Result.isOk()).toBe(true);
      if (stmt1Result.isErr() || stmt2Result.isErr() || stmt3Result.isErr()) return;

      // Get statements to use in atomic argument
      const premises = [stmt1Result.value, stmt2Result.value];
      const conclusions = [stmt3Result.value];

      // Create atomic argument
      const argumentResult = doc.createAtomicArgument(premises, conclusions);
      expect(argumentResult.isOk()).toBe(true);
      if (argumentResult.isErr()) return;

      // Add side label
      const updateResult = argumentResult.value.updateSideLabels({ left: 'Modus Ponens' });
      expect(updateResult.isOk()).toBe(true);

      // Test round-trip
      const yamlResult = await serializer.serialize(doc);
      expect(yamlResult.isOk()).toBe(true);
      if (yamlResult.isErr()) return;

      const reconstructedResult = await deserializer.deserialize(yamlResult.value);
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isErr()) return;

      // Verify side label preserved
      const reconstructedArgs = reconstructedResult.value.getAllAtomicArguments();
      expect(reconstructedArgs).toHaveLength(1);
      expect(reconstructedArgs[0]?.getSideLabels()?.left).toBe('Modus Ponens');
    });
  });

  describe('Error handling', () => {
    test('handles invalid YAML gracefully', async () => {
      const invalidYaml = 'invalid: yaml: content: [unclosed';

      const result = await deserializer.deserialize(invalidYaml);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Failed to deserialize YAML');
    });

    test('handles unsupported schema version', async () => {
      const unsupportedSchemaYaml = `
version: 1
metadata:
  id: test-doc
  createdAt: 2024-01-01T00:00:00.000Z
  modifiedAt: 2024-01-01T00:00:00.000Z
  schemaVersion: "2.0.0"
statements: {}
orderedSets: {}
atomicArguments: {}
trees: {}
`;

      const result = await deserializer.deserialize(unsupportedSchemaYaml);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Unsupported schema version: 2.0.0');
    });

    test('handles missing metadata gracefully', async () => {
      const noMetadataYaml = `
version: 1
statements: {}
orderedSets: {}
atomicArguments: {}
trees: {}
`;

      const result = await deserializer.deserialize(noMetadataYaml);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.message).toContain('Unsupported schema version: undefined');
    });
  });

  describe('Repository integration', () => {
    test('createBootstrapDocument integration test', async () => {
      const mockFileSystem = {
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
      } as MockedObject<IFileSystemPort>;
      const repository = new YAMLProofDocumentRepository(mockFileSystem, '/test');

      vi.mocked(mockFileSystem).writeFile.mockResolvedValue(ok(undefined));

      const testId = ProofDocumentId.create('test-bootstrap');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      const result = await repository.createBootstrapDocumentWithId(testId.value);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockFileSystem).writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.proof.yaml'),
        expect.stringContaining('statements: {}'),
      );
    });

    test('save and load bootstrap document maintains state', async () => {
      const mockFileSystem = {
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
      } as MockedObject<IFileSystemPort>;
      const repository = new YAMLProofDocumentRepository(mockFileSystem, '/test');

      const testId = ProofDocumentId.create('bootstrap-test');
      expect(testId.isOk()).toBe(true);
      if (testId.isErr()) return;

      // Capture the YAML content when written
      let savedYamlContent = '';
      vi.mocked(mockFileSystem).writeFile.mockImplementation(async (_path, content) => {
        savedYamlContent = content.getValue();
        return ok(undefined);
      });

      // Create bootstrap document
      const createResult = await repository.createBootstrapDocumentWithId(testId.value);
      expect(createResult.isOk()).toBe(true);

      // Mock reading the saved content
      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      const docContentResult = DocumentContent.create(savedYamlContent);
      expect(docContentResult.isOk()).toBe(true);
      if (docContentResult.isErr()) return;
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(ok(docContentResult.value));

      // Load the document
      const loadedDocResult = await repository.findById(testId.value);
      expect(loadedDocResult.isOk()).toBe(true);
      if (loadedDocResult.isOk()) {
        const loadedDoc = loadedDocResult.value;
        expect(loadedDoc.getAllStatements()).toHaveLength(0);
        expect(loadedDoc.getAllAtomicArguments()).toHaveLength(0);
      }
    });
  });

  describe('YAML format validation', () => {
    test('produces valid YAML structure', async () => {
      const doc = createComplexProofDocument();

      const yamlResult = await serializer.serialize(doc);
      expect(yamlResult.isOk()).toBe(true);
      if (yamlResult.isErr()) return;

      const yamlContent = yamlResult.value;

      // Check required top-level sections
      expect(yamlContent).toContain('version:');
      expect(yamlContent).toContain('metadata:');
      expect(yamlContent).toContain('statements:');
      expect(yamlContent).toContain('orderedSets:');
      expect(yamlContent).toContain('atomicArguments:');
      expect(yamlContent).toContain('trees:');

      // Check metadata structure
      expect(yamlContent).toContain('id:');
      expect(yamlContent).toContain('createdAt:');
      expect(yamlContent).toContain('modifiedAt:');
      expect(yamlContent).toContain('schemaVersion:');
    });

    test('handles special characters in statement content', async () => {
      const doc = ProofDocument.create();

      // Create statement with special characters
      const specialContentResult = doc.createStatementFromString(
        'Statement with "quotes", \'apostrophes\', and special chars: @#$%^&*()',
      );
      expect(specialContentResult.isOk()).toBe(true);
      if (specialContentResult.isErr()) return;

      // Test round-trip
      const yamlResult = await serializer.serialize(doc);
      expect(yamlResult.isOk()).toBe(true);
      if (yamlResult.isErr()) return;

      const reconstructedResult = await deserializer.deserialize(yamlResult.value);
      expect(reconstructedResult.isOk()).toBe(true);
      if (reconstructedResult.isErr()) return;

      const reconstructedStatements = reconstructedResult.value.getAllStatements();
      expect(reconstructedStatements).toHaveLength(1);
      expect(reconstructedStatements[0]?.getContent()).toBe(
        'Statement with "quotes", \'apostrophes\', and special chars: @#$%^&*()',
      );
    });
  });
});

// Helper functions
function createComplexProofDocument(): ProofDocument {
  const doc = ProofDocument.create();

  // Create multiple statements
  const stmt1 = doc.createStatementFromString('All men are mortal');
  const stmt2 = doc.createStatementFromString('Socrates is a man');
  const stmt3 = doc.createStatementFromString('Socrates is mortal');
  const stmt4 = doc.createStatementFromString('All philosophers are wise');
  const stmt5 = doc.createStatementFromString('Socrates is a philosopher');
  const stmt6 = doc.createStatementFromString('Socrates is wise');

  if (
    stmt1.isErr() ||
    stmt2.isErr() ||
    stmt3.isErr() ||
    stmt4.isErr() ||
    stmt5.isErr() ||
    stmt6.isErr()
  ) {
    throw new Error('Failed to create statements');
  }

  // Create statement arrays for atomic arguments
  const premises1 = [stmt1.value, stmt2.value];
  const conclusions1 = [stmt3.value];
  const premises2 = [stmt4.value, stmt5.value];
  const conclusions2 = [stmt6.value];

  // Create atomic arguments
  const arg1 = doc.createAtomicArgument(premises1, conclusions1);
  const arg2 = doc.createAtomicArgument(premises2, conclusions2);

  if (arg1.isErr() || arg2.isErr()) {
    throw new Error('Failed to create atomic arguments');
  }

  // Add side labels
  const label1Result = arg1.value.updateSideLabels({ left: 'Syllogism 1' });
  const label2Result = arg2.value.updateSideLabels({ left: 'Syllogism 2' });

  if (label1Result.isErr() || label2Result.isErr()) {
    throw new Error('Failed to add side labels');
  }

  return doc;
}

function createBootstrapDocument(): ProofDocument {
  const testId = ProofDocumentId.create('bootstrap-doc');
  if (testId.isErr()) {
    throw testId.error;
  }

  const result = ProofDocument.createBootstrap(testId.value);
  if (result.isErr()) {
    throw result.error;
  }

  return result.value;
}
