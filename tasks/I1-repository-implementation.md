# Task I1: Repository Implementation

## Status
- **Phase**: 3 - Infrastructure Layer
- **Priority**: High
- **Estimated Effort**: 4-5 hours
- **Dependencies**: Domain repository interfaces, I0 (Platform abstraction ports)
- **Blocks**: All infrastructure and presentation work

## Goal
Implement the repository pattern for persisting domain aggregates using platform-agnostic file system operations. The repository will use YAML format for storage while maintaining data integrity and supporting the domain's persistence needs.

## Context
The repository layer implements the persistence interfaces defined in the domain layer. It translates between domain aggregates and their persisted representation, handling:
- YAML serialization/deserialization
- File system operations through platform ports
- Aggregate reconstruction from persistent state
- Bootstrap scenario support
- Schema versioning for future migrations

### Key Design Decisions
1. **YAML Format**: Human-readable, version-control friendly
2. **Single File Per Document**: Each proof document is one YAML file
3. **Platform Abstraction**: Use IFileSystemPort for all I/O
4. **Bootstrap Support**: Handle empty documents gracefully
5. **Clean Architecture**: Repository only persists, no business logic

## Required Implementation

### 1. Repository Interface (Domain Layer)
The domain defines the repository interface in `src/domain/repositories/IProofDocumentRepository.ts`:
```typescript
import type { Result } from 'neverthrow';
import type { ProofDocument } from '../aggregates/ProofDocument.js';
import type { ProofDocumentId } from '../value-objects/ProofDocumentId.js';
import type { ValidationError } from '../errors/ValidationError.js';

export interface IProofDocumentRepository {
  findById(id: ProofDocumentId): Promise<ProofDocument | null>;
  save(document: ProofDocument): Promise<Result<void, ValidationError>>;
  delete(id: ProofDocumentId): Promise<Result<void, ValidationError>>;
  exists(id: ProofDocumentId): Promise<boolean>;
  findAll(): Promise<ProofDocument[]>;
  nextIdentity(): ProofDocumentId;
  findByDateRange(from: Date, to: Date): Promise<ProofDocument[]>;
  count(): Promise<number>;
}
```

### 2. YAML Repository Implementation
Create `src/infrastructure/repositories/yaml/YAMLProofDocumentRepository.ts`:
```typescript
import { err, ok, type Result } from 'neverthrow';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { ProofDocumentId } from '../../../domain/shared/value-objects.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import { IFileSystemPort } from '../../../application/ports/IFileSystemPort.js';
import { YAMLSerializer } from './YAMLSerializer.js';
import { YAMLDeserializer } from './YAMLDeserializer.js';
import { RepositoryError } from './RepositoryError.js';
import { v4 as uuidv4 } from 'uuid';

export class YAMLProofDocumentRepository implements IProofDocumentRepository {
  private readonly fileExtension = '.proof.yaml';

  constructor(
    private readonly fileSystem: IFileSystemPort,
    private readonly basePath: string
  ) {}

  async findById(id: ProofDocumentId): Promise<ProofDocument | null> {
    try {
      const filePath = this.getFilePath(id);
      
      // Check if file exists
      const existsResult = await this.fileSystem.exists(filePath);
      if (existsResult.isErr() || !existsResult.value) {
        return null;
      }

      // Read file content
      const contentResult = await this.fileSystem.readFile(filePath);
      if (contentResult.isErr()) {
        throw new RepositoryError(
          `Failed to read document: ${contentResult.error.message}`,
          'READ_ERROR'
        );
      }

      // Deserialize YAML to domain aggregate
      const deserializer = new YAMLDeserializer();
      const documentResult = await deserializer.deserialize(contentResult.value);
      if (documentResult.isErr()) {
        throw new RepositoryError(
          `Failed to deserialize document: ${documentResult.error.message}`,
          'DESERIALIZATION_ERROR'
        );
      }

      return documentResult.value;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        `Unexpected error loading document: ${error}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  async save(document: ProofDocument): Promise<Result<void, ValidationError>> {
    try {
      // Serialize domain aggregate to YAML
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
    } catch (error) {
      return err(new ValidationError(`Unexpected error saving document: ${error}`));
    }
  }

  async exists(id: ProofDocumentId): Promise<boolean> {
    const filePath = this.getFilePath(id);
    const result = await this.fileSystem.exists(filePath);
    return result.isOk() ? result.value : false;
  }

  async delete(id: ProofDocumentId): Promise<Result<void, ValidationError>> {
    try {
      const filePath = this.getFilePath(id);
      
      // Check if exists first
      if (!await this.exists(id)) {
        return err(new ValidationError(`Document not found: ${id.getValue()}`));
      }

      // Delete file
      const deleteResult = await this.fileSystem.deleteFile(filePath);
      if (deleteResult.isErr()) {
        return err(new ValidationError(`Failed to delete document: ${deleteResult.error.message}`));
      }

      return ok(undefined);
    } catch (error) {
      return err(new ValidationError(`Unexpected error deleting document: ${error}`));
    }
  }

  async findAll(): Promise<ProofDocument[]> {
    try {
      // List all files in base path
      const filesResult = await this.fileSystem.listFiles(this.basePath);
      if (filesResult.isErr()) {
        throw new RepositoryError(
          `Failed to list documents: ${filesResult.error.message}`,
          'LIST_ERROR'
        );
      }

      // Filter for proof files and load each
      const proofFiles = filesResult.value.filter(f => f.endsWith(this.fileExtension));
      const documents: ProofDocument[] = [];

      for (const file of proofFiles) {
        const idMatch = file.match(/^(.+)\.proof\.yaml$/);
        if (idMatch) {
          const id = ProofDocumentId.create(idMatch[1]);
          const doc = await this.findById(id);
          if (doc) documents.push(doc);
        }
      }

      return documents;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        `Failed to find all documents: ${error}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  nextIdentity(): ProofDocumentId {
    return ProofDocumentId.create(`doc-${uuidv4()}`);
  }

  async findByDateRange(from: Date, to: Date): Promise<ProofDocument[]> {
    const allDocs = await this.findAll();
    return allDocs.filter(doc => {
      const createdAt = doc.getCreatedAt();
      return createdAt >= from && createdAt <= to;
    });
  }

  async count(): Promise<number> {
    const allDocs = await this.findAll();
    return allDocs.length;
  }

  // Helper methods
  private getFilePath(id: ProofDocumentId): string {
    return `${this.basePath}/${id.getValue()}${this.fileExtension}`;
  }
}
```

### 3. YAML Serializer
Create `src/infrastructure/repositories/yaml/YAMLSerializer.ts`:
```typescript
import { err, ok, type Result } from 'neverthrow';
import * as yaml from 'js-yaml';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { ValidationError } from '../../../domain/shared/result.js';

interface YAMLProofDocument {
  version: number;
  metadata: {
    id: string;
    createdAt: string;
    modifiedAt: string;
    schemaVersion: string;
  };
  statements: Record<string, string>; // id -> content
  orderedSets: Record<string, string[]>; // id -> statement ids
  atomicArguments: Record<string, YAMLAtomicArgument>;
  trees: Record<string, YAMLTree>;
}

interface YAMLAtomicArgument {
  premises: string | null; // OrderedSet ID
  conclusions: string | null; // OrderedSet ID
  sideLabel?: string;
}

interface YAMLTree {
  offset: { x: number; y: number };
  nodes: Record<string, YAMLNode>;
}

type YAMLNode = 
  | { arg: string } // Root node
  | { [parentId: string]: string; on: number | string }; // Child node

export class YAMLSerializer {
  private readonly SCHEMA_VERSION = '1.0.0';

  async serialize(document: ProofDocument): Promise<Result<string, ValidationError>> {
    try {
      const yamlDoc: YAMLProofDocument = {
        version: document.getVersion(),
        metadata: {
          id: document.getId().getValue(),
          createdAt: document.getCreatedAt().toISOString(),
          modifiedAt: document.getModifiedAt().toISOString(),
          schemaVersion: this.SCHEMA_VERSION
        },
        statements: this.serializeStatements(document),
        orderedSets: this.serializeOrderedSets(document),
        atomicArguments: this.serializeAtomicArguments(document),
        trees: this.serializeTrees(document)
      };

      const yamlString = yaml.dump(yamlDoc, {
        indent: 2,
        lineWidth: 120,
        noRefs: true, // Disable references for clarity
        sortKeys: false // Preserve order
      });

      return ok(yamlString);
    } catch (error) {
      return err(new ValidationError(`Failed to serialize document: ${error}`));
    }
  }

  private serializeStatements(document: ProofDocument): Record<string, string> {
    const statements: Record<string, string> = {};
    
    for (const statement of document.getAllStatements()) {
      statements[statement.getId().getValue()] = statement.getContent();
    }

    return statements;
  }

  private serializeOrderedSets(document: ProofDocument): Record<string, string[]> {
    const orderedSets: Record<string, string[]> = {};
    
    for (const orderedSet of document.getAllOrderedSets()) {
      orderedSets[orderedSet.getId().getValue()] = 
        orderedSet.getStatementIds().map(id => id.getValue());
    }

    return orderedSets;
  }

  private serializeAtomicArguments(document: ProofDocument): Record<string, YAMLAtomicArgument> {
    const args: Record<string, YAMLAtomicArgument> = {};
    
    for (const argument of document.getAllAtomicArguments()) {
      const yamlArg: YAMLAtomicArgument = {
        premises: argument.getPremiseSet()?.getValue() || null,
        conclusions: argument.getConclusionSet()?.getValue() || null
      };

      // Add side label if present
      const sideLabel = argument.getSideLabel();
      if (sideLabel) {
        yamlArg.sideLabel = sideLabel;
      }

      args[argument.getId().getValue()] = yamlArg;
    }

    return args;
  }

  private serializeTrees(document: ProofDocument): Record<string, YAMLTree> {
    const trees: Record<string, YAMLTree> = {};
    
    // Note: Trees are stored in ProofTreeAggregate, not ProofDocument
    // This would need to be passed in or accessed via a tree repository
    // For now, returning empty - actual implementation would coordinate with ProofTreeAggregateRepository
    
    return trees;
  }
}
```

### 4. YAML Deserializer
Create `src/infrastructure/repositories/yaml/YAMLDeserializer.ts`:
```typescript
import { err, ok, type Result } from 'neverthrow';
import * as yaml from 'js-yaml';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { RepositoryError } from './RepositoryError.js';

export class YAMLDeserializer {
  async deserialize(yamlContent: string): Promise<Result<ProofDocument, ValidationError>> {
    try {
      const data = yaml.load(yamlContent) as any;
      
      // Validate schema version
      if (data.metadata?.schemaVersion !== '1.0.0') {
        return err(new ValidationError(`Unsupported schema version: ${data.metadata?.schemaVersion}`));
      }

      // Use ProofDocument.reconstruct factory method
      const documentResult = ProofDocument.reconstruct({
        id: data.metadata.id,
        version: data.version,
        createdAt: new Date(data.metadata.createdAt),
        modifiedAt: new Date(data.metadata.modifiedAt),
        statements: data.statements || {},
        orderedSets: data.orderedSets || {},
        atomicArguments: data.atomicArguments || {},
        trees: data.trees || {}
      });

      return documentResult;
    } catch (error) {
      return err(new ValidationError(`Failed to deserialize YAML: ${error}`));
    }
  }
}
```

### 5. Repository Error
Create `src/infrastructure/repositories/yaml/RepositoryError.ts`:
```typescript
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}
```

### 6. Repository Factory
Create `src/infrastructure/repositories/RepositoryFactory.ts`:
```typescript
import { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import { YAMLProofDocumentRepository } from './yaml/YAMLProofDocumentRepository.js';
import { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';

export class RepositoryFactory {
  static createProofDocumentRepository(
    fileSystem: IFileSystemPort,
    basePath: string
  ): IProofDocumentRepository {
    // In the future, could support different implementations (JSON, SQLite, etc.)
    return new YAMLProofDocumentRepository(fileSystem, basePath);
  }
}
```

## Testing Requirements

### Unit Tests
Create `src/infrastructure/repositories/yaml/__tests__/YAMLProofDocumentRepository.test.ts`:
```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { mock } from 'jest-mock-extended';
import { ok, err } from 'neverthrow';
import { YAMLProofDocumentRepository } from '../YAMLProofDocumentRepository.js';
import { IFileSystemPort } from '../../../../application/ports/IFileSystemPort.js';
import { ProofDocumentId } from '../../../../domain/shared/value-objects.js';
import { proofDocumentFactory } from '../../../../domain/__tests__/factories/index.js';

describe('YAMLProofDocumentRepository', () => {
  let repository: YAMLProofDocumentRepository;
  let mockFileSystem: IFileSystemPort;

  beforeEach(() => {
    mockFileSystem = mock<IFileSystemPort>();
    repository = new YAMLProofDocumentRepository(
      mockFileSystem,
      '/test/path'
    );
  });

  describe('findById', () => {
    test('returns document when file exists', async () => {
      const yamlContent = `
version: 1
metadata:
  id: doc123
  createdAt: 2024-01-01T00:00:00Z
  modifiedAt: 2024-01-01T00:00:00Z
  schemaVersion: 1.0.0
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

      mockFileSystem.exists.mockResolvedValue(ok(true));
      mockFileSystem.readFile.mockResolvedValue(ok(yamlContent));

      const result = await repository.findById(ProofDocumentId.create('doc123'));
      
      expect(result).not.toBeNull();
      expect(result?.getId().getValue()).toBe('doc123');
    });

    test('returns null when file not found', async () => {
      mockFileSystem.exists.mockResolvedValue(ok(false));

      const result = await repository.findById(ProofDocumentId.create('missing'));
      
      expect(result).toBeNull();
    });

    test('throws RepositoryError on read failure', async () => {
      mockFileSystem.exists.mockResolvedValue(ok(true));
      mockFileSystem.readFile.mockResolvedValue(err({ message: 'Read failed', code: 'EACCES' }));

      await expect(
        repository.findById(ProofDocumentId.create('doc123'))
      ).rejects.toThrow('Failed to read document');
    });
  });

  describe('save', () => {
    test('saves document successfully', async () => {
      const document = proofDocumentFactory.build();
      mockFileSystem.writeFile.mockResolvedValue(ok(undefined));

      const result = await repository.save(document);
      
      expect(result.isOk()).toBe(true);
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        `/test/path/${document.getId().getValue()}.proof.yaml`,
        expect.stringContaining('version: 1')
      );
    });

    test('returns error on write failure', async () => {
      const document = proofDocumentFactory.build();
      mockFileSystem.writeFile.mockResolvedValue(err({ message: 'Write failed', code: 'ENOSPC' }));

      const result = await repository.save(document);
      
      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('Failed to write document');
    });
  });

  describe('exists', () => {
    test('returns true when file exists', async () => {
      mockFileSystem.exists.mockResolvedValue(ok(true));
      
      const result = await repository.exists(ProofDocumentId.create('doc123'));
      
      expect(result).toBe(true);
    });

    test('returns false when file does not exist', async () => {
      mockFileSystem.exists.mockResolvedValue(ok(false));
      
      const result = await repository.exists(ProofDocumentId.create('doc123'));
      
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    test('returns all documents in directory', async () => {
      mockFileSystem.listFiles.mockResolvedValue(ok([
        'doc1.proof.yaml',
        'doc2.proof.yaml',
        'other.txt' // Should be ignored
      ]));

      // Mock reading each document
      const yamlContent1 = createValidYAML('doc1');
      const yamlContent2 = createValidYAML('doc2');
      
      mockFileSystem.exists.mockResolvedValue(ok(true));
      mockFileSystem.readFile
        .mockResolvedValueOnce(ok(yamlContent1))
        .mockResolvedValueOnce(ok(yamlContent2));

      const result = await repository.findAll();
      
      expect(result).toHaveLength(2);
      expect(result[0].getId().getValue()).toBe('doc1');
      expect(result[1].getId().getValue()).toBe('doc2');
    });
  });

  describe('nextIdentity', () => {
    test('generates unique document IDs', () => {
      const id1 = repository.nextIdentity();
      const id2 = repository.nextIdentity();
      
      expect(id1.getValue()).toMatch(/^doc-[a-f0-9-]+$/);
      expect(id1.getValue()).not.toBe(id2.getValue());
    });
  });
});
```

### Integration Tests
Create `src/infrastructure/repositories/yaml/__tests__/YAMLSerialization.integration.test.ts`:
```typescript
describe('YAML Serialization Integration', () => {
  test('round-trip serialization preserves document structure', async () => {
    const original = createComplexProofDocument();
    const serializer = new YAMLSerializer();
    const deserializer = new YAMLDeserializer();
    
    // Serialize
    const yamlResult = await serializer.serialize(original);
    expect(yamlResult.isOk()).toBe(true);
    
    // Deserialize
    const reconstructedResult = await deserializer.deserialize(yamlResult.value);
    expect(reconstructedResult.isOk()).toBe(true);
    
    // Compare structure
    const reconstructed = reconstructedResult.value;
    expect(reconstructed.getId().getValue()).toBe(original.getId().getValue());
    expect(reconstructed.getAllStatements().length).toBe(original.getAllStatements().length);
    expect(reconstructed.getAllOrderedSets().length).toBe(original.getAllOrderedSets().length);
    expect(reconstructed.getAllAtomicArguments().length).toBe(original.getAllAtomicArguments().length);
  });

  test('handles bootstrap documents correctly', async () => {
    const bootstrapDoc = createBootstrapDocument();
    const serializer = new YAMLSerializer();
    
    const yamlResult = await serializer.serialize(bootstrapDoc);
    expect(yamlResult.isOk()).toBe(true);
    expect(yamlResult.value).toContain('premises: null');
    expect(yamlResult.value).toContain('conclusions: null');
  });
});
```

## YAML Format Specification

### Example Document Structure
```yaml
version: 1
metadata:
  id: "doc-001"
  createdAt: "2024-01-01T00:00:00.000Z"
  modifiedAt: "2024-01-01T12:00:00.000Z"
  schemaVersion: "1.0.0"

statements:
  stmt1: "All men are mortal"
  stmt2: "Socrates is a man"
  stmt3: "Socrates is mortal"

orderedSets:
  os1: [stmt1, stmt2]
  os2: [stmt3]

atomicArguments:
  arg1:
    premises: os1
    conclusions: os2
    sideLabel: "Modus Ponens"

trees:
  tree1:
    offset: { x: 100, y: 200 }
    nodes:
      n1: { arg: arg1 }
```

### Bootstrap Document Example
```yaml
version: 1
metadata:
  id: "doc-bootstrap"
  createdAt: "2024-01-01T00:00:00.000Z"
  modifiedAt: "2024-01-01T00:00:00.000Z"
  schemaVersion: "1.0.0"

statements: {}
orderedSets: {}

atomicArguments:
  bootstrap-arg:
    premises: null
    conclusions: null

trees:
  tree1:
    offset: { x: 0, y: 0 }
    nodes:
      n1: { arg: bootstrap-arg }
```

### Complex Tree Example
```yaml
trees:
  tree1:
    offset: { x: 100, y: 200 }
    nodes:
      n1: { arg: arg1 }                    # Root node
      n2: { n1: arg2, on: 0 }             # Child of n1, attached to premise position 0
      n3: { n1: arg3, on: 1 }             # Child of n1, attached to premise position 1
      n4: { n3: arg4, on: "1:0" }         # Multi-conclusion: from position 1, to position 0
```

## Success Criteria
- [ ] Repository implements domain interface exactly
- [ ] YAML serialization preserves all entity relationships
- [ ] All file I/O uses platform abstraction ports
- [ ] 90%+ test coverage including error cases
- [ ] Human-readable YAML format maintained
- [ ] No domain logic in infrastructure layer
- [ ] Bootstrap documents handled correctly
- [ ] Schema version validation implemented
- [ ] Repository errors use proper error types

## Implementation Considerations

### Platform Abstraction
- All file operations through IFileSystemPort
- Support for different file system capabilities
- Handle platforms with memory-only persistence
- Consider mobile platform constraints

### Error Handling
- Use RepositoryError for infrastructure failures
- Return ValidationError from domain operations
- Preserve error context and stack traces
- Handle partial read/write failures gracefully

### Performance
- Lazy loading for large documents
- Consider caching frequently accessed documents
- Batch operations for multiple documents
- Stream processing for very large files

### Future Enhancements
- Schema migration support
- Compression for large documents
- Incremental saves (event sourcing)
- Cross-document reference integrity
- Backup and recovery mechanisms

## Notes
- Repository is infrastructure, not domain concern
- Event publishing handled by application layer, not repository
- Tree persistence may require coordination with ProofTreeAggregateRepository
- YAML format designed for version control friendliness
- Consider using YAML anchors for repeated statement references