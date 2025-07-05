import * as yaml from 'js-yaml';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProofDocument } from '../../../../domain/aggregates/ProofDocument.js';
import type { AtomicArgument } from '../../../../domain/entities/AtomicArgument.js';
import type { OrderedSet } from '../../../../domain/entities/OrderedSet.js';
import type { Statement } from '../../../../domain/entities/Statement.js';
import { ValidationError } from '../../../../domain/shared/result.js';
import {
  AtomicArgumentId,
  OrderedSetId,
  ProofDocumentId,
  StatementId,
} from '../../../../domain/shared/value-objects.js';
import { YAMLSerializer } from '../YAMLSerializer.js';

// Mock js-yaml module
vi.mock('js-yaml', () => ({
  dump: vi.fn(),
}));

describe('YAMLSerializer', () => {
  let serializer: YAMLSerializer;
  let mockDocument: ReturnType<typeof mock<ProofDocument>>;

  beforeEach(() => {
    vi.clearAllMocks();
    serializer = new YAMLSerializer();
    mockDocument = mock<ProofDocument>();
  });

  describe('serialize', () => {
    it('should serialize document with basic metadata', async () => {
      // Arrange
      const documentIdResult = ProofDocumentId.create('doc-123');
      if (documentIdResult.isErr()) throw documentIdResult.error;
      const documentId = documentIdResult.value;

      const createdAt = new Date('2023-01-01T00:00:00.000Z');
      const modifiedAt = new Date('2023-01-02T00:00:00.000Z');

      mockDocument.getId.mockReturnValue(documentId);
      mockDocument.getVersion.mockReturnValue(1);
      mockDocument.getCreatedAt.mockReturnValue(createdAt);
      mockDocument.getModifiedAt.mockReturnValue(modifiedAt);
      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      const expectedYamlOutput = 'yaml-output';
      (yaml.dump as any).mockReturnValue(expectedYamlOutput);

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(expectedYamlOutput);
      }

      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 1,
          metadata: {
            id: 'doc-123',
            createdAt: '2023-01-01T00:00:00.000Z',
            modifiedAt: '2023-01-02T00:00:00.000Z',
            schemaVersion: '1.0.0',
          },
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
        {
          indent: 2,
          lineWidth: 120,
          noRefs: true,
          sortKeys: false,
        },
      );
    });

    it('should serialize statements correctly', async () => {
      // Arrange
      const mockStatement1 = mock<Statement>();
      const mockStatement2 = mock<Statement>();

      const statementId1Result = StatementId.create('stmt-1');
      const statementId2Result = StatementId.create('stmt-2');
      if (statementId1Result.isErr()) throw statementId1Result.error;
      if (statementId2Result.isErr()) throw statementId2Result.error;
      const statementId1 = statementId1Result.value;
      const statementId2 = statementId2Result.value;

      mockStatement1.getId.mockReturnValue(statementId1);
      mockStatement1.getContent.mockReturnValue('All men are mortal');

      mockStatement2.getId.mockReturnValue(statementId2);
      mockStatement2.getContent.mockReturnValue('Socrates is a man');

      mockDocument.getAllStatements.mockReturnValue([mockStatement1, mockStatement2]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      setupBasicMockDocument(mockDocument);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          statements: {
            'stmt-1': 'All men are mortal',
            'stmt-2': 'Socrates is a man',
          },
        }),
        expect.any(Object),
      );
    });

    it('should serialize ordered sets correctly', async () => {
      // Arrange
      const mockOrderedSet1 = mock<OrderedSet>();
      const mockOrderedSet2 = mock<OrderedSet>();

      const orderedSetId1Result = OrderedSetId.create('set-1');
      const orderedSetId2Result = OrderedSetId.create('set-2');
      if (orderedSetId1Result.isErr()) throw orderedSetId1Result.error;
      if (orderedSetId2Result.isErr()) throw orderedSetId2Result.error;
      const orderedSetId1 = orderedSetId1Result.value;
      const orderedSetId2 = orderedSetId2Result.value;

      const statementId1Result = StatementId.create('stmt-1');
      const statementId2Result = StatementId.create('stmt-2');
      const statementId3Result = StatementId.create('stmt-3');
      if (statementId1Result.isErr()) throw statementId1Result.error;
      if (statementId2Result.isErr()) throw statementId2Result.error;
      if (statementId3Result.isErr()) throw statementId3Result.error;
      const statementId1 = statementId1Result.value;
      const statementId2 = statementId2Result.value;
      const statementId3 = statementId3Result.value;

      mockOrderedSet1.getId.mockReturnValue(orderedSetId1);
      mockOrderedSet1.getStatementIds.mockReturnValue([statementId1, statementId2]);

      mockOrderedSet2.getId.mockReturnValue(orderedSetId2);
      mockOrderedSet2.getStatementIds.mockReturnValue([statementId3]);

      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([mockOrderedSet1, mockOrderedSet2]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      setupBasicMockDocument(mockDocument);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          orderedSets: {
            'set-1': ['stmt-1', 'stmt-2'],
            'set-2': ['stmt-3'],
          },
        }),
        expect.any(Object),
      );
    });

    it('should serialize atomic arguments with premises and conclusions', async () => {
      // Arrange
      const mockArgument = mock<AtomicArgument>();
      const argumentIdResult = AtomicArgumentId.create('arg-1');
      const premiseSetIdResult = OrderedSetId.create('set-premises');
      const conclusionSetIdResult = OrderedSetId.create('set-conclusions');
      if (argumentIdResult.isErr()) throw argumentIdResult.error;
      if (premiseSetIdResult.isErr()) throw premiseSetIdResult.error;
      if (conclusionSetIdResult.isErr()) throw conclusionSetIdResult.error;
      const argumentId = argumentIdResult.value;
      const premiseSetId = premiseSetIdResult.value;
      const conclusionSetId = conclusionSetIdResult.value;

      mockArgument.getId.mockReturnValue(argumentId);
      mockArgument.getPremiseSet.mockReturnValue(premiseSetId);
      mockArgument.getConclusionSet.mockReturnValue(conclusionSetId);
      mockArgument.getSideLabels.mockReturnValue(null);

      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([mockArgument]);

      setupBasicMockDocument(mockDocument);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          atomicArguments: {
            'arg-1': {
              premises: 'set-premises',
              conclusions: 'set-conclusions',
            },
          },
        }),
        expect.any(Object),
      );
    });

    it('should serialize atomic arguments with side labels', async () => {
      // Arrange
      const mockArgument = mock<AtomicArgument>();
      const argumentIdResult = AtomicArgumentId.create('arg-1');
      if (argumentIdResult.isErr()) throw argumentIdResult.error;
      const argumentId = argumentIdResult.value;

      mockArgument.getId.mockReturnValue(argumentId);
      mockArgument.getPremiseSet.mockReturnValue(null);
      mockArgument.getConclusionSet.mockReturnValue(null);
      mockArgument.getSideLabels.mockReturnValue({ left: 'Modus Ponens' });

      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([mockArgument]);

      setupBasicMockDocument(mockDocument);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          atomicArguments: {
            'arg-1': {
              premises: null,
              conclusions: null,
              sideLabel: 'Modus Ponens',
            },
          },
        }),
        expect.any(Object),
      );
    });

    it('should handle atomic arguments with null premise/conclusion sets', async () => {
      // Arrange
      const mockArgument = mock<AtomicArgument>();
      const argumentIdResult = AtomicArgumentId.create('arg-bootstrap');
      if (argumentIdResult.isErr()) throw argumentIdResult.error;
      const argumentId = argumentIdResult.value;

      mockArgument.getId.mockReturnValue(argumentId);
      mockArgument.getPremiseSet.mockReturnValue(null);
      mockArgument.getConclusionSet.mockReturnValue(null);
      mockArgument.getSideLabels.mockReturnValue(null);

      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([mockArgument]);

      setupBasicMockDocument(mockDocument);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          atomicArguments: {
            'arg-bootstrap': {
              premises: null,
              conclusions: null,
            },
          },
        }),
        expect.any(Object),
      );
    });

    it('should serialize empty trees collection', async () => {
      // Arrange
      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      setupBasicMockDocument(mockDocument);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          trees: {},
        }),
        expect.any(Object),
      );
    });

    it('should handle yaml.dump throwing an error', async () => {
      // Arrange
      setupBasicMockDocument(mockDocument);
      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      const yamlError = new Error('YAML serialization failed');
      (yaml.dump as any).mockImplementation(() => {
        throw yamlError;
      });

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Failed to serialize document');
        expect(result.error.message).toContain('YAML serialization failed');
      }
    });

    it('should handle non-Error exceptions from yaml.dump', async () => {
      // Arrange
      setupBasicMockDocument(mockDocument);
      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      const yamlError = 'String error from YAML';
      (yaml.dump as any).mockImplementation(() => {
        throw yamlError;
      });

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Failed to serialize document');
        expect(result.error.message).toContain('Unknown error');
      }
    });
  });

  describe('empty document handling', () => {
    it('should properly serialize empty document with all empty collections', async () => {
      // Arrange
      setupBasicMockDocument(mockDocument);
      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      (yaml.dump as any).mockReturnValue('empty-document-yaml');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
        expect.any(Object),
      );
    });

    it('should handle bootstrap-first design with empty collections', async () => {
      // This tests the explicit empty object assignment for bootstrap documents

      // Arrange
      setupBasicMockDocument(mockDocument);
      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      (yaml.dump as any).mockReturnValue('bootstrap-yaml');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      // Verify that empty collections are explicitly set to {} not undefined
      const yamlCall = (yaml.dump as any).mock.calls[0][0];
      expect(yamlCall.statements).toEqual({});
      expect(yamlCall.orderedSets).toEqual({});
      expect(yamlCall.atomicArguments).toEqual({});
      expect(yamlCall.trees).toEqual({});
    });
  });

  describe('complex document serialization', () => {
    it('should serialize document with statements, ordered sets, and atomic arguments', async () => {
      // Arrange
      // Create statements
      const statement1 = mock<Statement>();
      const statement2 = mock<Statement>();
      const statementId1Result = StatementId.create('stmt-1');
      const statementId2Result = StatementId.create('stmt-2');
      if (statementId1Result.isErr()) throw statementId1Result.error;
      if (statementId2Result.isErr()) throw statementId2Result.error;
      const statementId1 = statementId1Result.value;
      const statementId2 = statementId2Result.value;

      statement1.getId.mockReturnValue(statementId1);
      statement1.getContent.mockReturnValue('All men are mortal');
      statement2.getId.mockReturnValue(statementId2);
      statement2.getContent.mockReturnValue('Socrates is a man');

      // Create ordered sets
      const orderedSet = mock<OrderedSet>();
      const orderedSetIdResult = OrderedSetId.create('set-1');
      if (orderedSetIdResult.isErr()) throw orderedSetIdResult.error;
      const orderedSetId = orderedSetIdResult.value;
      orderedSet.getId.mockReturnValue(orderedSetId);
      orderedSet.getStatementIds.mockReturnValue([statementId1, statementId2]);

      // Create atomic argument
      const argument = mock<AtomicArgument>();
      const argumentIdResult = AtomicArgumentId.create('arg-1');
      if (argumentIdResult.isErr()) throw argumentIdResult.error;
      const argumentId = argumentIdResult.value;
      argument.getId.mockReturnValue(argumentId);
      argument.getPremiseSet.mockReturnValue(orderedSetId);
      argument.getConclusionSet.mockReturnValue(null);
      argument.getSideLabels.mockReturnValue({ left: 'Premise Set' });

      mockDocument.getAllStatements.mockReturnValue([statement1, statement2]);
      mockDocument.getAllOrderedSets.mockReturnValue([orderedSet]);
      mockDocument.getAllAtomicArguments.mockReturnValue([argument]);

      setupBasicMockDocument(mockDocument);
      (yaml.dump as any).mockReturnValue('complex-document-yaml');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          statements: {
            'stmt-1': 'All men are mortal',
            'stmt-2': 'Socrates is a man',
          },
          orderedSets: {
            'set-1': ['stmt-1', 'stmt-2'],
          },
          atomicArguments: {
            'arg-1': {
              premises: 'set-1',
              conclusions: null,
              sideLabel: 'Premise Set',
            },
          },
        }),
        expect.any(Object),
      );
    });
  });

  describe('yaml options configuration', () => {
    it('should use correct YAML formatting options', async () => {
      // Arrange
      setupBasicMockDocument(mockDocument);
      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      (yaml.dump as any).mockReturnValue('formatted-yaml');

      // Act
      await serializer.serialize(mockDocument);

      // Assert
      expect(yaml.dump).toHaveBeenCalledWith(expect.any(Object), {
        indent: 2,
        lineWidth: 120,
        noRefs: true, // Disable references for clarity
        sortKeys: false, // Preserve order
      });
    });
  });

  describe('schema version', () => {
    it('should include correct schema version in metadata', async () => {
      // Arrange
      setupBasicMockDocument(mockDocument);
      mockDocument.getAllStatements.mockReturnValue([]);
      mockDocument.getAllOrderedSets.mockReturnValue([]);
      mockDocument.getAllAtomicArguments.mockReturnValue([]);

      (yaml.dump as any).mockReturnValue('versioned-yaml');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            schemaVersion: '1.0.0',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  // Helper function to set up basic mock document properties
  function setupBasicMockDocument(mockDoc: ReturnType<typeof mock<ProofDocument>>): void {
    const documentIdResult = ProofDocumentId.create('test-doc-id');
    if (documentIdResult.isErr()) throw documentIdResult.error;
    const documentId = documentIdResult.value;

    mockDoc.getId.mockReturnValue(documentId);
    mockDoc.getVersion.mockReturnValue(1);
    mockDoc.getCreatedAt.mockReturnValue(new Date('2023-01-01T00:00:00.000Z'));
    mockDoc.getModifiedAt.mockReturnValue(new Date('2023-01-01T00:00:00.000Z'));
  }
});
