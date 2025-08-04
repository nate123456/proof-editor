import * as yaml from 'js-yaml';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProofDocument } from '../../../../domain/aggregates/ProofDocument.js';
import type { AtomicArgument } from '../../../../domain/entities/AtomicArgument.js';
import type { Statement } from '../../../../domain/entities/Statement.js';
import type { ProofDocumentQueryService } from '../../../../domain/queries/ProofDocumentQueryService.js';
import { ValidationError } from '../../../../domain/shared/result.js';
import {
  AtomicArgumentId,
  ProofDocumentId,
  StatementId,
} from '../../../../domain/shared/value-objects/index.js';
import { YAMLSerializer } from '../YAMLSerializer.js';

// Mock js-yaml module
vi.mock('js-yaml', () => ({
  dump: vi.fn(),
}));

describe('YAMLSerializer', () => {
  let serializer: YAMLSerializer;
  let mockDocument: ProofDocument;
  let mockQueryService: ProofDocumentQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    serializer = new YAMLSerializer();

    // Create mock query service
    mockQueryService = {
      getId: vi.fn(),
      getVersion: vi.fn(),
      getCreatedAt: vi.fn(),
      getModifiedAt: vi.fn(),
      getAllStatements: vi.fn(),
      getAllAtomicArguments: vi.fn(),
      getStatement: vi.fn(),
      getArgument: vi.fn(),
      isStatementInUse: vi.fn(),
    } as unknown as ProofDocumentQueryService;

    // Create mock document
    mockDocument = {
      createQueryService: vi.fn().mockReturnValue(mockQueryService),
      getId: vi.fn(),
      getAllStatements: vi.fn(),
      getAllOrderedSets: vi.fn(),
      getAllAtomicArguments: vi.fn(),
    } as unknown as ProofDocument;
  });

  describe('serialize', () => {
    it('should serialize document with basic metadata', async () => {
      // Arrange
      const documentIdResult = ProofDocumentId.create('doc-123');
      if (documentIdResult.isErr()) throw documentIdResult.error;
      const documentId = documentIdResult.value;

      const createdAt = new Date('2023-01-01T00:00:00.000Z');
      const modifiedAt = new Date('2023-01-02T00:00:00.000Z');

      vi.mocked(mockQueryService.getId).mockReturnValue(documentId);
      vi.mocked(mockQueryService.getVersion).mockReturnValue(1);
      vi.mocked(mockQueryService.getCreatedAt).mockReturnValue(createdAt);
      vi.mocked(mockQueryService.getModifiedAt).mockReturnValue(modifiedAt);
      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

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
      const mockStatement1 = {
        getId: vi.fn(),
        getContent: vi.fn(),
      } as unknown as Statement;
      const mockStatement2 = {
        getId: vi.fn(),
        getContent: vi.fn(),
      } as unknown as Statement;

      const statementId1Result = StatementId.create('stmt-1');
      const statementId2Result = StatementId.create('stmt-2');
      if (statementId1Result.isErr()) throw statementId1Result.error;
      if (statementId2Result.isErr()) throw statementId2Result.error;
      const statementId1 = statementId1Result.value;
      const statementId2 = statementId2Result.value;

      vi.mocked(mockStatement1.getId).mockReturnValue(statementId1);
      vi.mocked(mockStatement1.getContent).mockReturnValue('All men are mortal');

      vi.mocked(mockStatement2.getId).mockReturnValue(statementId2);
      vi.mocked(mockStatement2.getContent).mockReturnValue('Socrates is a man');

      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([
        mockStatement1,
        mockStatement2,
      ]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

      setupBasicMockQueryService(mockQueryService);
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

    it('should serialize atomic arguments with premises and conclusions', async () => {
      // Arrange
      const mockStatement1 = {
        getId: vi.fn(),
        getContent: vi.fn(),
      } as unknown as Statement;
      const mockStatement2 = {
        getId: vi.fn(),
        getContent: vi.fn(),
      } as unknown as Statement;

      const statementId1Result = StatementId.create('stmt-1');
      const statementId2Result = StatementId.create('stmt-2');
      if (statementId1Result.isErr()) throw statementId1Result.error;
      if (statementId2Result.isErr()) throw statementId2Result.error;
      const statementId1 = statementId1Result.value;
      const statementId2 = statementId2Result.value;

      vi.mocked(mockStatement1.getId).mockReturnValue(statementId1);
      vi.mocked(mockStatement2.getId).mockReturnValue(statementId2);

      const mockArgument = {
        getId: vi.fn(),
        getPremises: vi.fn(),
        getConclusions: vi.fn(),
        getSideLabels: vi.fn(),
      } as unknown as AtomicArgument;

      const argumentIdResult = AtomicArgumentId.create('arg-1');
      if (argumentIdResult.isErr()) throw argumentIdResult.error;
      const argumentId = argumentIdResult.value;

      vi.mocked(mockArgument.getId).mockReturnValue(argumentId);
      vi.mocked(mockArgument.getPremises).mockReturnValue([mockStatement1]);
      vi.mocked(mockArgument.getConclusions).mockReturnValue([mockStatement2]);
      vi.mocked(mockArgument.getSideLabels).mockReturnValue({});

      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([mockArgument]);

      setupBasicMockQueryService(mockQueryService);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          atomicArguments: {
            'arg-1': {
              premises: ['stmt-1'],
              conclusions: ['stmt-2'],
            },
          },
        }),
        expect.any(Object),
      );
    });

    it('should serialize atomic arguments with side labels', async () => {
      // Arrange
      const mockArgument = {
        getId: vi.fn(),
        getPremises: vi.fn(),
        getConclusions: vi.fn(),
        getSideLabels: vi.fn(),
      } as unknown as AtomicArgument;

      const argumentIdResult = AtomicArgumentId.create('arg-1');
      if (argumentIdResult.isErr()) throw argumentIdResult.error;
      const argumentId = argumentIdResult.value;

      vi.mocked(mockArgument.getId).mockReturnValue(argumentId);
      vi.mocked(mockArgument.getPremises).mockReturnValue([]);
      vi.mocked(mockArgument.getConclusions).mockReturnValue([]);
      vi.mocked(mockArgument.getSideLabels).mockReturnValue({ left: 'Modus Ponens' });

      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([mockArgument]);

      setupBasicMockQueryService(mockQueryService);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          atomicArguments: {
            'arg-1': {
              premises: [],
              conclusions: [],
              sideLabels: {
                left: 'Modus Ponens',
              },
            },
          },
        }),
        expect.any(Object),
      );
    });

    it('should handle atomic arguments with empty premise/conclusion arrays', async () => {
      // Arrange
      const mockArgument = {
        getId: vi.fn(),
        getPremises: vi.fn(),
        getConclusions: vi.fn(),
        getSideLabels: vi.fn(),
      } as unknown as AtomicArgument;

      const argumentIdResult = AtomicArgumentId.create('arg-bootstrap');
      if (argumentIdResult.isErr()) throw argumentIdResult.error;
      const argumentId = argumentIdResult.value;

      vi.mocked(mockArgument.getId).mockReturnValue(argumentId);
      vi.mocked(mockArgument.getPremises).mockReturnValue([]);
      vi.mocked(mockArgument.getConclusions).mockReturnValue([]);
      vi.mocked(mockArgument.getSideLabels).mockReturnValue({});

      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([mockArgument]);

      setupBasicMockQueryService(mockQueryService);
      (yaml.dump as any).mockReturnValue('yaml-output');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          atomicArguments: {
            'arg-bootstrap': {
              premises: [],
              conclusions: [],
            },
          },
        }),
        expect.any(Object),
      );
    });

    it('should serialize empty trees collection', async () => {
      // Arrange
      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

      setupBasicMockQueryService(mockQueryService);
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
      setupBasicMockQueryService(mockQueryService);
      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

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
      setupBasicMockQueryService(mockQueryService);
      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

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
      setupBasicMockQueryService(mockQueryService);
      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

      (yaml.dump as any).mockReturnValue('empty-document-yaml');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          statements: {},
          atomicArguments: {},
          trees: {},
        }),
        expect.any(Object),
      );
    });

    it('should handle bootstrap-first design with empty collections', async () => {
      // This tests the explicit empty object assignment for bootstrap documents

      // Arrange
      setupBasicMockQueryService(mockQueryService);
      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

      (yaml.dump as any).mockReturnValue('bootstrap-yaml');

      // Act
      const result = await serializer.serialize(mockDocument);

      // Assert
      expect(result.isOk()).toBe(true);
      // Verify that empty collections are explicitly set to {} not undefined
      const yamlCall = (yaml.dump as any).mock.calls[0][0];
      expect(yamlCall.statements).toEqual({});
      expect(yamlCall.atomicArguments).toEqual({});
      expect(yamlCall.trees).toEqual({});
    });
  });

  describe('complex document serialization', () => {
    it('should serialize document with statements and atomic arguments', async () => {
      // Arrange
      // Create statements
      const statement1 = {
        getId: vi.fn(),
        getContent: vi.fn(),
      } as unknown as Statement;
      const statement2 = {
        getId: vi.fn(),
        getContent: vi.fn(),
      } as unknown as Statement;

      const statementId1Result = StatementId.create('stmt-1');
      const statementId2Result = StatementId.create('stmt-2');
      if (statementId1Result.isErr()) throw statementId1Result.error;
      if (statementId2Result.isErr()) throw statementId2Result.error;
      const statementId1 = statementId1Result.value;
      const statementId2 = statementId2Result.value;

      vi.mocked(statement1.getId).mockReturnValue(statementId1);
      vi.mocked(statement1.getContent).mockReturnValue('All men are mortal');
      vi.mocked(statement2.getId).mockReturnValue(statementId2);
      vi.mocked(statement2.getContent).mockReturnValue('Socrates is a man');

      // Create atomic argument
      const argument = {
        getId: vi.fn(),
        getPremises: vi.fn(),
        getConclusions: vi.fn(),
        getSideLabels: vi.fn(),
      } as unknown as AtomicArgument;

      const argumentIdResult = AtomicArgumentId.create('arg-1');
      if (argumentIdResult.isErr()) throw argumentIdResult.error;
      const argumentId = argumentIdResult.value;

      vi.mocked(argument.getId).mockReturnValue(argumentId);
      vi.mocked(argument.getPremises).mockReturnValue([statement1, statement2]);
      vi.mocked(argument.getConclusions).mockReturnValue([]);
      vi.mocked(argument.getSideLabels).mockReturnValue({ left: 'Premise Set' });

      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([statement1, statement2]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([argument]);

      setupBasicMockQueryService(mockQueryService);
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
          atomicArguments: {
            'arg-1': {
              premises: ['stmt-1', 'stmt-2'],
              conclusions: [],
              sideLabels: {
                left: 'Premise Set',
              },
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
      setupBasicMockQueryService(mockQueryService);
      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

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
      setupBasicMockQueryService(mockQueryService);
      vi.mocked(mockQueryService.getAllStatements).mockReturnValue([]);
      vi.mocked(mockQueryService.getAllAtomicArguments).mockReturnValue([]);

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

  // Helper function to set up basic mock query service properties
  function setupBasicMockQueryService(mockQueryService: ProofDocumentQueryService): void {
    const documentIdResult = ProofDocumentId.create('test-doc-id');
    if (documentIdResult.isErr()) throw documentIdResult.error;
    const documentId = documentIdResult.value;

    vi.mocked(mockQueryService.getId).mockReturnValue(documentId);
    vi.mocked(mockQueryService.getVersion).mockReturnValue(1);
    vi.mocked(mockQueryService.getCreatedAt).mockReturnValue(new Date('2023-01-01T00:00:00.000Z'));
    vi.mocked(mockQueryService.getModifiedAt).mockReturnValue(new Date('2023-01-01T00:00:00.000Z'));
  }
});
