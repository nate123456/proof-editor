import { ok } from 'neverthrow';
import { beforeEach, describe, expect, type MockedObject, test, vi } from 'vitest';
import type { IFileSystemPort } from '../../../../application/ports/IFileSystemPort.js';
import { proofDocumentFactory } from '../../../../domain/__tests__/factories/index.js';
import { ProofDocument } from '../../../../domain/aggregates/ProofDocument.js';
import { ProofDocumentId } from '../../../../domain/shared/value-objects.js';
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
      expect(reconstructed.getVersion()).toBe(original.getVersion());
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
      expect(reconstructed.getVersion()).toBe(original.getVersion());
      expect(reconstructed.getCreatedAt().getTime()).toBe(original.getCreatedAt().getTime());
      expect(reconstructed.getModifiedAt().getTime()).toBe(original.getModifiedAt().getTime());
    });

    test('handles documents with side labels', async () => {
      const doc = ProofDocument.create();

      // Create statements
      const stmt1Result = doc.createStatement('All men are mortal');
      const stmt2Result = doc.createStatement('Socrates is a man');
      const stmt3Result = doc.createStatement('Socrates is mortal');

      expect(stmt1Result.isOk()).toBe(true);
      expect(stmt2Result.isOk()).toBe(true);
      expect(stmt3Result.isOk()).toBe(true);
      if (stmt1Result.isErr() || stmt2Result.isErr() || stmt3Result.isErr()) return;

      // Create ordered sets
      const premiseSetResult = doc.createOrderedSet([
        stmt1Result.value.getId(),
        stmt2Result.value.getId(),
      ]);
      const conclusionSetResult = doc.createOrderedSet([stmt3Result.value.getId()]);

      expect(premiseSetResult.isOk()).toBe(true);
      expect(conclusionSetResult.isOk()).toBe(true);
      if (premiseSetResult.isErr() || conclusionSetResult.isErr()) return;

      // Create atomic argument
      const argumentResult = doc.createAtomicArgument(
        premiseSetResult.value,
        conclusionSetResult.value,
      );
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

      const result = await repository.createBootstrapDocument();

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
        savedYamlContent = content;
        return ok(undefined);
      });

      // Create bootstrap document
      const createResult = await repository.createBootstrapDocumentWithId(testId.value);
      expect(createResult.isOk()).toBe(true);

      // Mock reading the saved content
      vi.mocked(mockFileSystem).exists.mockResolvedValue(ok(true));
      vi.mocked(mockFileSystem).readFile.mockResolvedValue(ok(savedYamlContent));

      // Load the document
      const loadedDoc = await repository.findById(testId.value);
      expect(loadedDoc).not.toBeNull();
      expect(loadedDoc?.getAllStatements()).toHaveLength(0);
      expect(loadedDoc?.getAllOrderedSets()).toHaveLength(0);
      expect(loadedDoc?.getAllAtomicArguments()).toHaveLength(0);
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
      const specialContentResult = doc.createStatement(
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
  const stmt1 = doc.createStatement('All men are mortal');
  const stmt2 = doc.createStatement('Socrates is a man');
  const stmt3 = doc.createStatement('Socrates is mortal');
  const stmt4 = doc.createStatement('All philosophers are wise');
  const stmt5 = doc.createStatement('Socrates is a philosopher');
  const stmt6 = doc.createStatement('Socrates is wise');

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

  // Create ordered sets
  const premiseSet1 = doc.createOrderedSet([stmt1.value.getId(), stmt2.value.getId()]);
  const conclusionSet1 = doc.createOrderedSet([stmt3.value.getId()]);
  const premiseSet2 = doc.createOrderedSet([stmt4.value.getId(), stmt5.value.getId()]);
  const conclusionSet2 = doc.createOrderedSet([stmt6.value.getId()]);

  if (
    premiseSet1.isErr() ||
    conclusionSet1.isErr() ||
    premiseSet2.isErr() ||
    conclusionSet2.isErr()
  ) {
    throw new Error('Failed to create ordered sets');
  }

  // Create atomic arguments
  const arg1 = doc.createAtomicArgument(premiseSet1.value, conclusionSet1.value);
  const arg2 = doc.createAtomicArgument(premiseSet2.value, conclusionSet2.value);

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
