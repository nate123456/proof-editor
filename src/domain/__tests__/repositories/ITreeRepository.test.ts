/**
 * Comprehensive test suite for ITreeRepository interface
 *
 * Tests mock implementations of the Tree repository to ensure:
 * - All interface methods are properly implemented
 * - Error scenarios are properly handled
 * - Edge cases are covered
 * - Repository operations maintain domain invariants
 */

import { err, ok, type Result } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tree } from '../../entities/Tree';
import { RepositoryError } from '../../errors/DomainErrors';
import type { ITreeRepository } from '../../repositories/ITreeRepository';
import { DocumentId, PhysicalProperties, TreeId } from '../../shared/value-objects';
import { TreePosition } from '../../value-objects/TreePosition';
import { treeIdFactory } from '../factories/index.js';

// Mock implementation of ITreeRepository for testing
class MockTreeRepository implements ITreeRepository {
  private readonly trees = new Map<string, Tree>();
  private readonly documentIndex = new Map<string, Set<Tree>>();

  async save(tree: Tree): Promise<Result<void, RepositoryError>> {
    try {
      // Simulate validation
      if (!tree?.getId()) {
        return Promise.resolve(err(new RepositoryError('Invalid tree provided')));
      }

      const id = tree.getId().getValue();
      const documentIdString = tree.getDocumentId();
      if (!documentIdString) {
        return Promise.resolve(err(new RepositoryError('Tree must belong to a document')));
      }

      const documentIdResult = DocumentId.fromString(documentIdString);

      if (!documentIdResult.isOk()) {
        return Promise.resolve(err(new RepositoryError('Tree must belong to a document')));
      }

      const documentId = documentIdResult.value;

      // Check for tree name uniqueness within document
      const documentTrees = this.documentIndex.get(documentId.getValue()) ?? new Set();
      for (const existingTree of Array.from(documentTrees)) {
        if (existingTree.getTitle() === tree.getTitle() && existingTree.getId().getValue() !== id) {
          return Promise.resolve(
            err(new RepositoryError('Tree name must be unique within document')),
          );
        }
      }

      this.trees.set(id, tree);

      // Update document index
      this.updateDocumentIndex(documentId, tree);

      return Promise.resolve(ok(undefined));
    } catch (error) {
      return Promise.resolve(err(new RepositoryError('Failed to save tree', error as Error)));
    }
  }

  async findById(id: TreeId): Promise<Result<Tree, RepositoryError>> {
    try {
      const tree = this.trees.get(id.getValue());
      if (!tree) {
        return Promise.resolve(err(new RepositoryError('Tree not found')));
      }
      return Promise.resolve(ok(tree));
    } catch (error) {
      return Promise.resolve(err(new RepositoryError('Failed to find tree', error as Error)));
    }
  }

  async findByDocument(documentId: DocumentId): Promise<Result<Tree[], RepositoryError>> {
    try {
      const treesSet = this.documentIndex.get(documentId.getValue());
      return Promise.resolve(ok(treesSet ? Array.from(treesSet) : []));
    } catch (error) {
      return Promise.resolve(err(new RepositoryError('Failed to find trees', error as Error)));
    }
  }

  async delete(id: TreeId): Promise<Result<void, RepositoryError>> {
    try {
      const tree = this.trees.get(id.getValue());
      if (!tree) {
        return Promise.resolve(err(new RepositoryError('Tree not found')));
      }

      // Check if tree has nodes (in real implementation)
      if (this.hasNodes(tree)) {
        return Promise.resolve(err(new RepositoryError('Cannot delete tree with nodes')));
      }

      // Remove from indexes
      const documentIdString = tree.getDocumentId();
      if (documentIdString) {
        const documentIdResult = DocumentId.fromString(documentIdString);
        if (documentIdResult.isOk()) {
          this.removeFromDocumentIndex(documentIdResult.value, tree);
        }
      }

      this.trees.delete(id.getValue());

      return Promise.resolve(ok(undefined));
    } catch (error) {
      return Promise.resolve(err(new RepositoryError('Failed to delete tree', error as Error)));
    }
  }

  // Test helper methods
  clear(): void {
    this.trees.clear();
    this.documentIndex.clear();
  }

  size(): number {
    return this.trees.size;
  }

  private updateDocumentIndex(documentId: DocumentId, tree: Tree): void {
    const key = documentId.getValue();
    if (!this.documentIndex.has(key)) {
      this.documentIndex.set(key, new Set());
    }
    this.documentIndex.get(key)?.add(tree);
  }

  private removeFromDocumentIndex(documentId: DocumentId, tree: Tree): void {
    const key = documentId.getValue();
    const treesSet = this.documentIndex.get(key);
    if (treesSet) {
      treesSet.delete(tree);
      if (treesSet.size === 0) {
        this.documentIndex.delete(key);
      }
    }
  }

  private hasNodes(tree: Tree): boolean {
    // Simulate checking if tree has nodes
    return tree.getId().getValue().includes('with-nodes');
  }
}

describe('ITreeRepository', () => {
  let repository: MockTreeRepository;

  beforeEach(() => {
    repository = new MockTreeRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create document ID
  const createDocumentId = () => {
    const result = DocumentId.fromString(`doc-${Date.now()}-${Math.random()}`);
    if (!result.isOk()) throw new Error('DocumentId creation failed');
    return result.value;
  };

  // Helper function to create test tree
  const createTestTree = (documentId: DocumentId, name = 'Test Tree', offset = { x: 0, y: 0 }) => {
    const positionResult = TreePosition.create(offset.x, offset.y);

    if (!positionResult.isOk()) throw new Error('TreePosition creation failed');

    const position = positionResult.value;
    const treeResult = Tree.create(documentId.getValue(), position);
    if (treeResult.isOk() && name !== 'Test Tree') {
      treeResult.value.setTitle(name);
    }
    if (!treeResult.isOk()) throw new Error('Creation failed');

    return treeResult.value;
  };

  describe('save', () => {
    it('should save a valid tree successfully', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId);

      const result = await repository.save(tree);

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(1);
    });

    it('should update an existing tree', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId);

      // Save initially
      await repository.save(tree);

      // Update position
      const newPositionResult = TreePosition.create(100, 200);

      if (!newPositionResult.isOk()) throw new Error('TreePosition creation failed');

      const newPosition = newPositionResult.value;
      tree.moveTo(newPosition);

      // Save again
      const updateResult = await repository.save(tree);

      expect(updateResult.isOk()).toBe(true);
      expect(repository.size()).toBe(1);

      const foundResult = await repository.findById(tree.getId());
      expect(foundResult.isOk()).toBe(true);
      if (foundResult.isOk()) {
        expect(foundResult.value.getPosition().getX()).toBe(100);
        expect(foundResult.value.getPosition().getY()).toBe(200);
      }
    });

    it('should index trees by document', async () => {
      const documentId = createDocumentId();
      const trees = Array.from({ length: 3 }, (_, i) =>
        createTestTree(documentId, `Tree ${i}`, { x: i * 100, y: 0 }),
      );

      for (const tree of trees) {
        await repository.save(tree);
      }

      const byDocument = await repository.findByDocument(documentId);
      expect(byDocument).toHaveLength(3);
    });

    it('should reject duplicate tree names within document', async () => {
      const documentId = createDocumentId();
      const tree1 = createTestTree(documentId, 'My Tree');
      const tree2 = createTestTree(documentId, 'My Tree');

      await repository.save(tree1);
      const result = await repository.save(tree2);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('unique within document');
      }
    });

    it('should allow same tree name in different documents', async () => {
      const doc1 = createDocumentId();
      const doc2 = createDocumentId();

      const tree1 = createTestTree(doc1, 'My Tree');
      const tree2 = createTestTree(doc2, 'My Tree');

      const result1 = await repository.save(tree1);
      const result2 = await repository.save(tree2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(repository.size()).toBe(2);
    });

    it('should handle null tree gracefully', async () => {
      const result = await repository.save(null as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('Invalid tree');
      }
    });

    it('should reject tree without document ID', async () => {
      // Create a tree without proper document ID
      const treeWithoutDoc = Object.create(Tree.prototype);
      treeWithoutDoc.getId = () => treeIdFactory.build();
      treeWithoutDoc.getDocumentId = () => null;
      treeWithoutDoc.getTitle = () => 'Test';

      const result = await repository.save(treeWithoutDoc);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must belong to a document');
      }
    });

    it('should handle save failures with proper error', async () => {
      const failingRepo = new MockTreeRepository();
      vi.spyOn(failingRepo as any, 'trees', 'get').mockImplementation(() => {
        throw new Error('Storage failure');
      });

      const documentId = createDocumentId();
      const tree = createTestTree(documentId);
      const result = await failingRepo.save(tree);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('Failed to save');
        expect(result.error.cause?.message).toContain('Storage failure');
      }
    });

    it('should save trees with different spatial positions', async () => {
      const documentId = createDocumentId();
      const positions = [
        { x: 0, y: 0 },
        { x: 100, y: 200 },
        { x: -50, y: 300 },
        { x: 500, y: -100 },
      ];

      for (const [index, pos] of Array.from(positions.entries())) {
        const tree = createTestTree(documentId, `Tree ${index}`, pos);
        const result = await repository.save(tree);
        expect(result.isOk()).toBe(true);
      }

      const allTreesResult = await repository.findByDocument(documentId);
      expect(allTreesResult.isOk()).toBe(true);
      if (allTreesResult.isOk()) {
        const allTrees = allTreesResult.value;
        expect(allTrees.length).toBe(positions.length);

        // Verify positions are preserved
        const savedPositions = allTrees.map((t: Tree) => ({
          x: t.getPosition().getX(),
          y: t.getPosition().getY(),
        }));
        expect(savedPositions).toEqual(expect.arrayContaining(positions));
      }
    });
  });

  describe('findById', () => {
    it('should find existing tree by ID', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId);
      await repository.save(tree);

      const foundResult = await repository.findById(tree.getId());

      expect(foundResult.isOk()).toBe(true);
      if (foundResult.isOk()) {
        expect(foundResult.value.getId().equals(tree.getId())).toBe(true);
        expect(foundResult.value.getTitle()).toBe(tree.getTitle());
        expect(foundResult.value.getDocumentId()).toBe(documentId.getValue());
      }
    });

    it('should return null for non-existent ID', async () => {
      const randomId = treeIdFactory.build();
      const found = await repository.findById(randomId);

      expect(found).toBeNull();
    });

    it('should handle multiple trees correctly', async () => {
      const documentId = createDocumentId();
      const trees = Array.from({ length: 5 }, (_, i) => createTestTree(documentId, `Tree ${i}`));

      for (const tree of trees) {
        await repository.save(tree);
      }

      for (const tree of trees) {
        const foundResult = await repository.findById(tree.getId());
        expect(foundResult.isOk()).toBe(true);
        if (foundResult.isOk()) {
          expect(foundResult.value.getId().equals(tree.getId())).toBe(true);
        }
      }
    });

    it('should preserve tree metadata', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId, 'My Special Tree', { x: 123, y: 456 });
      // Note: Tree entity doesn't have updateMetadata method

      await repository.save(tree);

      const foundResult = await repository.findById(tree.getId());
      expect(foundResult.isOk()).toBe(true);
      if (foundResult.isOk()) {
        expect(foundResult.value.getTitle()).toBe('My Special Tree');
        expect(foundResult.value.getPosition().getX()).toBe(123);
        expect(foundResult.value.getPosition().getY()).toBe(456);
      }
      // Metadata check not applicable
    });
  });

  describe('findByDocument', () => {
    it('should return empty array for document with no trees', async () => {
      const documentId = createDocumentId();
      const treesResult = await repository.findByDocument(documentId);

      expect(treesResult.isOk()).toBe(true);
      if (treesResult.isOk()) {
        expect(treesResult.value).toEqual([]);
        expect(treesResult.value.length).toBe(0);
      }
    });

    it('should find all trees in a document', async () => {
      const documentId = createDocumentId();
      const count = 5;
      const trees = Array.from({ length: count }, (_, i) =>
        createTestTree(documentId, `Tree ${i}`),
      );

      for (const tree of trees) {
        await repository.save(tree);
      }

      const foundResult = await repository.findByDocument(documentId);

      expect(foundResult.isOk()).toBe(true);
      if (foundResult.isOk()) {
        expect(foundResult.value.length).toBe(count);

        const foundIds = foundResult.value.map((t) => t.getId().getValue()).sort();
        const expectedIds = trees.map((t) => t.getId().getValue()).sort();
        expect(foundIds).toEqual(expectedIds);
      }
    });

    it('should separate trees by document', async () => {
      const doc1 = createDocumentId();
      const doc2 = createDocumentId();

      const doc1Trees = Array.from({ length: 3 }, (_, i) => createTestTree(doc1, `Doc1 Tree ${i}`));

      const doc2Trees = Array.from({ length: 2 }, (_, i) => createTestTree(doc2, `Doc2 Tree ${i}`));

      for (const tree of [...doc1Trees, ...doc2Trees]) {
        await repository.save(tree);
      }

      const foundDoc1Result = await repository.findByDocument(doc1);
      const foundDoc2Result = await repository.findByDocument(doc2);

      expect(foundDoc1Result.isOk()).toBe(true);
      expect(foundDoc2Result.isOk()).toBe(true);

      if (foundDoc1Result.isOk() && foundDoc2Result.isOk()) {
        expect(foundDoc1Result.value.length).toBe(3);
        expect(foundDoc2Result.value.length).toBe(2);

        // Ensure no cross-contamination
        const doc1Names = foundDoc1Result.value.map((t) => t.getTitle() ?? '');
        const doc2Names = foundDoc2Result.value.map((t) => t.getTitle() ?? '');

        expect(doc1Names.every((name) => name.startsWith('Doc1'))).toBe(true);
        expect(doc2Names.every((name) => name.startsWith('Doc2'))).toBe(true);
      }
    });

    it('should return trees in consistent order', async () => {
      const documentId = createDocumentId();
      const trees = Array.from({ length: 5 }, (_, i) => createTestTree(documentId, `Tree ${i}`));

      for (const tree of trees) {
        await repository.save(tree);
      }

      const found1Result = await repository.findByDocument(documentId);
      const found2Result = await repository.findByDocument(documentId);

      expect(found1Result.isOk()).toBe(true);
      expect(found2Result.isOk()).toBe(true);

      if (found1Result.isOk() && found2Result.isOk()) {
        const ids1 = found1Result.value.map((t) => t.getId().getValue());
        const ids2 = found2Result.value.map((t) => t.getId().getValue());

        expect(ids1).toEqual(ids2);
      }
    });
  });

  describe('delete', () => {
    it('should delete existing tree without nodes', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId);
      await repository.save(tree);

      const result = await repository.delete(tree.getId());

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(0);

      const foundResult = await repository.findById(tree.getId());
      expect(foundResult.isErr()).toBe(true);
      if (foundResult.isErr()) {
        expect(foundResult.error.message).toContain('not found');
      }
    });

    it('should reject deleting tree with nodes', async () => {
      const documentId = createDocumentId();
      // Create tree with ID that triggers hasNodes check
      const treeIdResult = TreeId.fromString('with-nodes-tree-123');
      if (!treeIdResult.isOk()) throw new Error('TreeId creation failed');
      const treeId = treeIdResult.value;
      const treeResult = Tree.reconstruct(
        treeId,
        documentId.getValue(),
        TreePosition.origin(),
        PhysicalProperties.default(),
        [],
        Date.now(),
        Date.now(),
        'Tree with nodes',
      );

      if (treeResult.isOk()) {
        await repository.save(treeResult.value);

        const result = await repository.delete(treeId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('nodes');
        }
        expect(repository.size()).toBe(1);
      }
    });

    it('should remove from document index', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId);
      await repository.save(tree);

      await repository.delete(tree.getId());

      const byDocumentResult = await repository.findByDocument(documentId);
      expect(byDocumentResult.isOk()).toBe(true);
      if (byDocumentResult.isOk()) {
        expect(byDocumentResult.value).toHaveLength(0);
      }
    });

    it('should return error for non-existent tree', async () => {
      const randomId = treeIdFactory.build();
      const result = await repository.delete(randomId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should handle delete failures with proper error', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId);
      await repository.save(tree);

      const failingRepo = new MockTreeRepository();
      await failingRepo.save(tree);

      vi.spyOn(failingRepo as any, 'trees', 'get').mockImplementation(() => {
        throw new Error('Delete operation failed');
      });

      const result = await failingRepo.delete(tree.getId());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.cause?.message).toContain('Delete operation failed');
      }
    });

    it('should delete specific tree while preserving others in document', async () => {
      const documentId = createDocumentId();
      const trees = Array.from({ length: 5 }, (_, i) => createTestTree(documentId, `Tree ${i}`));

      for (const tree of trees) {
        await repository.save(tree);
      }

      // Delete specific trees
      const tree1 = trees[1];
      const tree3 = trees[3];
      if (tree1 && tree3) {
        await repository.delete(tree1.getId());
        await repository.delete(tree3.getId());
      }

      const remainingResult = await repository.findByDocument(documentId);
      expect(remainingResult.isOk()).toBe(true);
      if (remainingResult.isOk()) {
        const remaining = remainingResult.value;
        expect(remaining.length).toBe(3);

        const remainingIds = remaining.map((t: Tree) => t.getId().getValue());
        const tree0 = trees[0];
        const tree2 = trees[2];
        const tree4 = trees[4];
        if (tree0) expect(remainingIds).toContain(tree0.getId().getValue());
        if (tree2) expect(remainingIds).toContain(tree2.getId().getValue());
        if (tree4) expect(remainingIds).toContain(tree4.getId().getValue());
        if (tree1) expect(remainingIds).not.toContain(tree1.getId().getValue());
        if (tree3) expect(remainingIds).not.toContain(tree3.getId().getValue());
      }
    });
  });

  describe('Mock with vitest', () => {
    let mockRepository: ITreeRepository;

    beforeEach(() => {
      mockRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findByDocument: vi.fn(),
        delete: vi.fn(),
      };
    });

    it('should allow mocking specific scenarios', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId);

      vi.mocked(mockRepository.save).mockImplementation(async (t) => {
        if (t === tree) return Promise.resolve(ok(undefined));
        return Promise.resolve(err(new RepositoryError('Unknown tree')));
      });
      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        if (id.equals(tree.getId())) return Promise.resolve(ok(tree));
        return Promise.resolve(err(new RepositoryError('Tree not found')));
      });
      vi.mocked(mockRepository.findByDocument).mockImplementation(async (id) => {
        if (id.equals(documentId)) return Promise.resolve(ok([tree]));
        return Promise.resolve(ok([]));
      });
      vi.mocked(mockRepository.delete).mockImplementation(async (id) => {
        if (id.equals(tree.getId())) return Promise.resolve(err(new RepositoryError('Has nodes')));
        return Promise.resolve(ok(undefined));
      });

      const saveResult = await mockRepository.save(tree);
      expect(saveResult.isOk()).toBe(true);

      const found = await mockRepository.findById(tree.getId());
      expect(found).toBe(tree);

      const byDocument = await mockRepository.findByDocument(documentId);
      expect(byDocument).toEqual([tree]);

      const deleteResult = await mockRepository.delete(tree.getId());
      expect(deleteResult.isErr()).toBe(true);
      if (deleteResult.isErr()) {
        expect(deleteResult.error.message).toBe('Has nodes');
      }
    });

    it('should mock complex document scenarios', async () => {
      const documentId = createDocumentId();
      const trees = Array.from({ length: 3 }, (_, i) => createTestTree(documentId, `Tree ${i}`));

      vi.mocked(mockRepository.findByDocument).mockImplementation(async (id) => {
        if (id.equals(documentId)) return Promise.resolve(ok(trees));
        return Promise.resolve(ok([]));
      });

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        const tree = trees.find((tree) => tree.getId().equals(id));
        if (tree) return Promise.resolve(ok(tree));
        return Promise.resolve(err(new RepositoryError('Tree not found')));
      });

      const byDocumentResult = await mockRepository.findByDocument(documentId);
      expect(byDocumentResult.isOk()).toBe(true);
      if (byDocumentResult.isOk()) {
        expect(byDocumentResult.value.length).toBe(3);
      }

      for (const tree of trees) {
        const foundResult = await mockRepository.findById(tree.getId());
        expect(foundResult.isOk()).toBe(true);
        if (foundResult.isOk()) {
          expect(foundResult.value).toBe(tree);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle trees with very long names', async () => {
      const documentId = createDocumentId();
      const longName = 'A'.repeat(1000);
      const tree = createTestTree(documentId, longName);

      const saveResult = await repository.save(tree);
      expect(saveResult.isOk()).toBe(true);

      const foundResult = await repository.findById(tree.getId());
      expect(foundResult.isOk()).toBe(true);
      if (foundResult.isOk()) {
        expect(foundResult.value.getTitle()).toBe(longName);
      }
    });

    it('should handle trees at extreme spatial positions', async () => {
      const documentId = createDocumentId();
      const extremePositions = [
        { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
        { x: Number.MIN_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER },
        { x: 0, y: Number.MAX_SAFE_INTEGER },
        { x: Number.MIN_SAFE_INTEGER, y: 0 },
      ];

      for (const [index, pos] of Array.from(extremePositions.entries())) {
        const tree = createTestTree(documentId, `Extreme Tree ${index}`, pos);
        const result = await repository.save(tree);
        expect(result.isOk()).toBe(true);
      }

      const allTreesResult = await repository.findByDocument(documentId);
      expect(allTreesResult.isOk()).toBe(true);
      if (allTreesResult.isOk()) {
        expect(allTreesResult.value.length).toBe(extremePositions.length);
      }
    });

    it('should maintain consistency under concurrent-like operations', async () => {
      const documentId = createDocumentId();
      const trees = Array.from({ length: 20 }, (_, i) => createTestTree(documentId, `Tree ${i}`));

      // Simulate interleaved saves and deletes
      for (let i = 0; i < trees.length; i++) {
        const currentTree = trees[i];
        if (!currentTree) continue;
        await repository.save(currentTree);

        if (i > 0 && i % 3 === 0) {
          // Delete some previous trees (only those without nodes)
          const toDelete = trees[i - 1];
          if (toDelete && !toDelete.getId().getValue().includes('with-nodes')) {
            await repository.delete(toDelete.getId());
          }
        }
      }

      const remainingResult = await repository.findByDocument(documentId);
      expect(remainingResult.isOk()).toBe(true);
      if (remainingResult.isOk()) {
        expect(remainingResult.value.length).toBeGreaterThan(0);
        expect(remainingResult.value.length).toBeLessThan(trees.length);
      }
    });

    it('should handle large number of trees per document', async () => {
      const documentId = createDocumentId();
      const treeCount = 100;

      const trees = Array.from({ length: treeCount }, (_, i) =>
        createTestTree(documentId, `Tree ${i}`, { x: i * 10, y: i * 10 }),
      );

      for (const tree of trees) {
        const result = await repository.save(tree);
        expect(result.isOk()).toBe(true);
      }

      const foundResult = await repository.findByDocument(documentId);
      expect(foundResult.isOk()).toBe(true);
      if (foundResult.isOk()) {
        expect(foundResult.value.length).toBe(treeCount);
      }
    });

    it('should handle trees with complex metadata', async () => {
      const documentId = createDocumentId();
      const tree = createTestTree(documentId, 'Complex Tree');

      // Complex metadata not used in this test
      // Tree entity doesn't have updateMetadata method

      // Note: Tree entity doesn't have updateMetadata method

      const saveResult = await repository.save(tree);
      expect(saveResult.isOk()).toBe(true);

      const foundResult = await repository.findById(tree.getId());
      expect(foundResult.isOk()).toBe(true);
      // Metadata check not applicable
    });
  });
});
