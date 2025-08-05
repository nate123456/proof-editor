import * as yaml from 'js-yaml';
import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProofDocument } from '../../../../domain/aggregates/ProofDocument.js';
import { ValidationError } from '../../../../domain/shared/result.js';
import { YAMLDeserializer } from '../YAMLDeserializer.js';

// Mock js-yaml module
vi.mock('js-yaml', () => ({
  load: vi.fn(),
}));

// Mock ProofDocument.reconstruct
vi.mock('../../../../domain/aggregates/ProofDocument.js', () => ({
  ProofDocument: {
    reconstruct: vi.fn(),
  },
}));

describe('YAMLDeserializer', () => {
  let deserializer: YAMLDeserializer;

  beforeEach(() => {
    vi.clearAllMocks();
    deserializer = new YAMLDeserializer();
  });

  describe('deserialize', () => {
    it('should successfully deserialize valid YAML document', async () => {
      // Arrange
      const validYamlContent = 'valid yaml content';
      const validDocumentData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'doc-123',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-02T00:00:00.000Z',
        },
        version: 1,
        statements: { 'stmt-1': 'All men are mortal' },
        orderedSets: { 'set-1': ['stmt-1'] },
        atomicArguments: {
          'arg-1': {
            premises: 'set-1',
            conclusions: null,
            sideLabel: 'Test Rule',
          },
        },
        trees: {},
      };

      const mockDocument = {} as ProofDocument;

      (yaml.load as any).mockReturnValue(validDocumentData);
      (ProofDocument.reconstruct as any).mockReturnValue(ok(mockDocument));

      // Act
      const result = await deserializer.deserialize(validYamlContent);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockDocument);
      }

      expect(yaml.load).toHaveBeenCalledWith(validYamlContent);

      // Verify the call to ProofDocument.reconstruct with value objects
      const reconstructCall = (ProofDocument.reconstruct as any).mock.calls[0][0];

      // Check basic properties
      expect(reconstructCall.id.getValue()).toBe('doc-123');
      expect(reconstructCall.version.getValue()).toBe(1);
      expect(reconstructCall.createdAt).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(reconstructCall.modifiedAt).toEqual(new Date('2023-01-02T00:00:00.000Z'));

      // Check statements Map
      expect(reconstructCall.statements).toBeInstanceOf(Map);
      expect(reconstructCall.statements.size).toBe(1);
      const stmtEntry = Array.from(reconstructCall.statements.entries())[0];
      expect(stmtEntry[0].getValue()).toBe('stmt-1');
      expect(stmtEntry[1].getValue()).toBe('All men are mortal');

      // Check atomic arguments Map
      expect(reconstructCall.atomicArguments).toBeInstanceOf(Map);
      expect(reconstructCall.atomicArguments.size).toBe(1);
      const argEntry = Array.from(reconstructCall.atomicArguments.entries())[0];
      expect(argEntry[0].getValue()).toBe('arg-1');
      expect(argEntry[1].premiseIds).toHaveLength(1);
      expect(argEntry[1].premiseIds[0].getValue()).toBe('stmt-1');
      expect(argEntry[1].conclusionIds).toHaveLength(0);
      expect(argEntry[1].sideLabels.left.getValue()).toBe('Test Rule');

      // Check trees Map
      expect(reconstructCall.trees).toBeInstanceOf(Map);
      expect(reconstructCall.trees.size).toBe(0);
    });

    it('should handle Date objects in metadata', async () => {
      // Arrange
      const createdDate = new Date('2023-01-01T00:00:00.000Z');
      const modifiedDate = new Date('2023-01-02T00:00:00.000Z');

      const documentDataWithDates = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'doc-456',
          createdAt: createdDate,
          modifiedAt: modifiedDate,
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      const mockDocument = {} as ProofDocument;

      (yaml.load as any).mockReturnValue(documentDataWithDates);
      (ProofDocument.reconstruct as any).mockReturnValue(ok(mockDocument));

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(ProofDocument.reconstruct).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: createdDate,
          modifiedAt: modifiedDate,
        }),
      );
    });

    it('should handle empty collections', async () => {
      // Arrange
      const emptyDocumentData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'empty-doc',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      const mockDocument = {} as ProofDocument;

      (yaml.load as any).mockReturnValue(emptyDocumentData);
      (ProofDocument.reconstruct as any).mockReturnValue(ok(mockDocument));

      // Act
      const result = await deserializer.deserialize('empty yaml');

      // Assert
      expect(result.isOk()).toBe(true);

      // Verify the call to ProofDocument.reconstruct with empty Maps
      const reconstructCall = (ProofDocument.reconstruct as any).mock.calls[0][0];

      expect(reconstructCall.statements).toBeInstanceOf(Map);
      expect(reconstructCall.statements.size).toBe(0);

      expect(reconstructCall.atomicArguments).toBeInstanceOf(Map);
      expect(reconstructCall.atomicArguments.size).toBe(0);

      expect(reconstructCall.trees).toBeInstanceOf(Map);
      expect(reconstructCall.trees.size).toBe(0);
    });

    it('should reject unsupported schema version', async () => {
      // Arrange
      const unsupportedVersionData = {
        metadata: {
          schemaVersion: '2.0.0', // Unsupported version
          id: 'doc-123',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      (yaml.load as any).mockReturnValue(unsupportedVersionData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Unsupported schema version: 2.0.0');
      }
    });

    it('should reject missing metadata', async () => {
      // Arrange
      const noMetadataData = {
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      (yaml.load as any).mockReturnValue(noMetadataData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Unsupported schema version: undefined');
      }
    });

    it('should reject invalid metadata structure', async () => {
      // Arrange
      const invalidMetadataData = {
        metadata: {
          schemaVersion: '1.0.0',
          // Missing required fields
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      (yaml.load as any).mockReturnValue(invalidMetadataData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should reject null document data', async () => {
      // Arrange
      (yaml.load as any).mockReturnValue(null);

      // Act
      const result = await deserializer.deserialize('null yaml');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should reject non-object document data', async () => {
      // Arrange
      (yaml.load as any).mockReturnValue('not an object');

      // Act
      const result = await deserializer.deserialize('invalid yaml');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should reject missing version field', async () => {
      // Arrange
      const noVersionData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'doc-123',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        // Missing version field
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      (yaml.load as any).mockReturnValue(noVersionData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should reject missing statements field', async () => {
      // Arrange
      const noStatementsData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'doc-123',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        version: 1,
        // Missing statements field
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      (yaml.load as any).mockReturnValue(noStatementsData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should handle yaml.load throwing an error', async () => {
      // Arrange
      const yamlError = new Error('Invalid YAML syntax');
      (yaml.load as any).mockImplementation(() => {
        throw yamlError;
      });

      // Act
      const result = await deserializer.deserialize('invalid yaml syntax');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Failed to deserialize YAML');
        expect(result.error.message).toContain('Invalid YAML syntax');
      }
    });

    it('should handle non-Error exceptions from yaml.load', async () => {
      // Arrange
      const yamlError = 'String error from YAML parsing';
      (yaml.load as any).mockImplementation(() => {
        throw yamlError;
      });

      // Act
      const result = await deserializer.deserialize('invalid yaml');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Failed to deserialize YAML');
        expect(result.error.message).toContain('Unknown error');
      }
    });

    it('should propagate ProofDocument.reconstruct errors', async () => {
      // Arrange
      const validDocumentData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'doc-123',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      const reconstructError = new ValidationError('Reconstruction failed');

      (yaml.load as any).mockReturnValue(validDocumentData);
      (ProofDocument.reconstruct as any).mockReturnValue(err(reconstructError));

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(reconstructError);
      }
    });
  });

  describe('type guard validation', () => {
    it('should validate atomic arguments structure', async () => {
      // Arrange
      const invalidAtomicArgumentsData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'doc-123',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: null, // Invalid - should be object
        trees: {},
      };

      (yaml.load as any).mockReturnValue(invalidAtomicArgumentsData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should validate trees structure', async () => {
      // Arrange
      const invalidTreesData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'doc-123',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: 'not an object', // Invalid - should be object
      };

      (yaml.load as any).mockReturnValue(invalidTreesData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should validate metadata.id field', async () => {
      // Arrange
      const invalidIdData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 123, // Invalid - should be string
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      (yaml.load as any).mockReturnValue(invalidIdData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should validate date fields', async () => {
      // Arrange
      const invalidDateData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'doc-123',
          createdAt: 123, // Invalid - should be string or Date
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        version: 1,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      (yaml.load as any).mockReturnValue(invalidDateData);

      // Act
      const result = await deserializer.deserialize('yaml content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty YAML string', async () => {
      // Arrange
      (yaml.load as any).mockReturnValue(undefined);

      // Act
      const result = await deserializer.deserialize('');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should handle whitespace-only YAML string', async () => {
      // Arrange
      (yaml.load as any).mockReturnValue(null);

      // Act
      const result = await deserializer.deserialize('   \n  \t  ');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid YAML document structure');
      }
    });

    it('should handle complex valid document with all features', async () => {
      // Arrange
      const complexDocumentData = {
        metadata: {
          schemaVersion: '1.0.0',
          id: 'complex-doc',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-02T00:00:00.000Z',
        },
        version: 3,
        statements: {
          'stmt-1': 'All men are mortal',
          'stmt-2': 'Socrates is a man',
          'stmt-3': 'Therefore, Socrates is mortal',
        },
        orderedSets: {
          'set-premises': ['stmt-1', 'stmt-2'],
          'set-conclusion': ['stmt-3'],
        },
        atomicArguments: {
          'arg-syllogism': {
            premises: 'set-premises',
            conclusions: 'set-conclusion',
            sideLabel: 'Modus Ponens',
          },
        },
        trees: {
          'tree-main': {
            offset: { x: 100, y: 200 },
            nodes: {
              n1: { arg: 'arg-syllogism' },
            },
          },
        },
      };

      const mockDocument = {} as ProofDocument;

      (yaml.load as any).mockReturnValue(complexDocumentData);
      (ProofDocument.reconstruct as any).mockReturnValue(ok(mockDocument));

      // Act
      const result = await deserializer.deserialize('complex yaml');

      // Assert
      expect(result.isOk()).toBe(true);

      // Verify the complex document reconstruction
      const reconstructCall = (ProofDocument.reconstruct as any).mock.calls[0][0];

      // Check basic properties
      expect(reconstructCall.id.getValue()).toBe('complex-doc');
      expect(reconstructCall.version.getValue()).toBe(3);
      expect(reconstructCall.createdAt).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(reconstructCall.modifiedAt).toEqual(new Date('2023-01-02T00:00:00.000Z'));

      // Check statements
      expect(reconstructCall.statements.size).toBe(3);
      expect(Array.from(reconstructCall.statements.keys()).map((k) => k.getValue())).toEqual([
        'stmt-1',
        'stmt-2',
        'stmt-3',
      ]);

      // Check atomic arguments
      expect(reconstructCall.atomicArguments.size).toBe(1);
      const argEntry = Array.from(reconstructCall.atomicArguments.entries())[0];
      expect(argEntry[0].getValue()).toBe('arg-syllogism');
      expect(argEntry[1].premiseIds).toHaveLength(2);
      expect(argEntry[1].premiseIds.map((id) => id.getValue())).toEqual(['stmt-1', 'stmt-2']);
      expect(argEntry[1].conclusionIds).toHaveLength(1);
      expect(argEntry[1].conclusionIds[0].getValue()).toBe('stmt-3');
      expect(argEntry[1].sideLabels.left.getValue()).toBe('Modus Ponens');

      // Check trees
      expect(reconstructCall.trees.size).toBe(1);
      const treeEntry = Array.from(reconstructCall.trees.entries())[0];
      expect(treeEntry[0].getValue()).toBe('tree-main');
      expect(treeEntry[1].offset.getX()).toBe(100);
      expect(treeEntry[1].offset.getY()).toBe(200);
    });
  });
});
