import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tree } from '../../entities/Tree';
import { ValidationError } from '../../shared/result';
import {
  AlignmentMode,
  ExpansionDirection,
  LayoutStyle,
  PhysicalProperties,
  TreeId,
} from '../../shared/value-objects';
import { TreePosition } from '../../value-objects/TreePosition';
import { nodeIdFactory, treeIdFactory } from '../factories/index.js';

describe('Tree Lifecycle', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Tree Creation', () => {
    describe('valid creation cases', () => {
      it('should create a tree with minimal valid parameters', () => {
        const documentId = 'doc-123';
        const result = Tree.create(documentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const tree = result.value;
          expect(tree.getDocumentId()).toBe(documentId);
          expect(tree.getPosition()).toEqual(TreePosition.origin());
          expect(tree.getPhysicalProperties()).toEqual(PhysicalProperties.default());
          expect(tree.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP);
          expect(tree.getTitle()).toBeUndefined();
          expect(tree.isEmpty()).toBe(true);
          expect(tree.getNodeCount()).toBe(0);
        }
      });

      it('should create a tree with all parameters', () => {
        const documentId = 'doc-456';
        const positionResult = TreePosition.create(100, 200);
        const propertiesResult = PhysicalProperties.create(
          LayoutStyle.bottomUp(),
          50,
          50,
          100,
          50,
          ExpansionDirection.horizontal(),
          AlignmentMode.center(),
        );
        const title = 'Test Tree';

        expect(positionResult.isOk()).toBe(true);
        expect(propertiesResult.isOk()).toBe(true);

        if (positionResult.isOk() && propertiesResult.isOk()) {
          const result = Tree.create(
            documentId,
            positionResult.value,
            propertiesResult.value,
            title,
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const tree = result.value;
            expect(tree.getDocumentId()).toBe(documentId);
            expect(tree.getPosition()).toEqual(positionResult.value);
            expect(tree.getPhysicalProperties()).toEqual(propertiesResult.value);
            expect(tree.getTitle()).toBe(title);
            expect(tree.hasTitle()).toBe(true);
          }
        }
      });

      it('should create a tree with unique ID', () => {
        const documentId = 'doc-789';
        const result1 = Tree.create(documentId);
        const result2 = Tree.create(documentId);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const tree1 = result1.value;
          const tree2 = result2.value;
          expect(tree1.getId()).not.toBe(tree2.getId());
        }
      });

      it('should reject empty title', () => {
        const documentId = 'doc-empty-title';
        const result = Tree.create(documentId, undefined, undefined, '');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Title cannot be empty');
        }
      });

      it('should reject whitespace-only title', () => {
        const documentId = 'doc-whitespace-title';
        const result = Tree.create(documentId, undefined, undefined, '   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Title cannot be empty');
        }
      });
    });

    describe('invalid creation cases', () => {
      it('should fail with empty document ID', () => {
        const result = Tree.create('');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('DocumentId cannot be empty');
        }
      });

      it('should fail with whitespace-only document ID', () => {
        const result = Tree.create('   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('DocumentId cannot be empty');
        }
      });
    });
  });

  describe('Tree Reconstruction', () => {
    describe('valid reconstruction cases', () => {
      it('should reconstruct a tree from minimal data', () => {
        const treeId = treeIdFactory.build();
        const documentId = 'doc-reconstruct';
        const result = Tree.reconstruct(
          treeId,
          documentId,
          TreePosition.origin(),
          PhysicalProperties.default(),
          [],
          FIXED_TIMESTAMP,
          FIXED_TIMESTAMP,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const tree = result.value;
          expect(tree.getId()).toBe(treeId);
          expect(tree.getDocumentId()).toBe(documentId);
          expect(tree.getPosition()).toEqual(TreePosition.origin());
          expect(tree.getPhysicalProperties()).toEqual(PhysicalProperties.default());
          expect(tree.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP);
          expect(tree.getTitle()).toBeUndefined();
          expect(tree.isEmpty()).toBe(true);
          expect(tree.getNodeCount()).toBe(0);
        }
      });

      it('should reconstruct a tree with all data', () => {
        const treeId = treeIdFactory.build();
        const documentId = 'doc-reconstruct-full';
        const positionResult = TreePosition.create(300, 400);
        const propertiesResult = PhysicalProperties.create(
          LayoutStyle.topDown(),
          75,
          75,
          150,
          75,
          ExpansionDirection.vertical(),
          AlignmentMode.left(),
        );
        const title = 'Reconstructed Tree';
        const nodeIds = [nodeIdFactory.build(), nodeIdFactory.build()];
        const createdAt = FIXED_TIMESTAMP - 10000;
        const modifiedAt = FIXED_TIMESTAMP - 5000;

        expect(positionResult.isOk()).toBe(true);
        expect(propertiesResult.isOk()).toBe(true);

        if (positionResult.isOk() && propertiesResult.isOk()) {
          const result = Tree.reconstruct(
            treeId,
            documentId,
            positionResult.value,
            propertiesResult.value,
            nodeIds,
            createdAt,
            modifiedAt,
            title,
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const tree = result.value;
            expect(tree.getId()).toBe(treeId);
            expect(tree.getDocumentId()).toBe(documentId);
            expect(tree.getPosition()).toEqual(positionResult.value);
            expect(tree.getPhysicalProperties()).toEqual(propertiesResult.value);
            expect(tree.getTitle()).toBe(title);
            expect(tree.hasTitle()).toBe(true);
            expect(tree.getNodeIds()).toEqual(nodeIds);
            expect(tree.getNodeCount()).toBe(2);
            expect(tree.isEmpty()).toBe(false);
            expect(tree.getCreatedAt()).toBe(createdAt);
            expect(tree.getModifiedAt()).toBe(modifiedAt);
          }
        }
      });

      it('should reject empty title during reconstruction', () => {
        const treeId = treeIdFactory.build();
        const documentId = 'doc-reconstruct-empty-title';
        const result = Tree.reconstruct(
          treeId,
          documentId,
          TreePosition.origin(),
          PhysicalProperties.default(),
          [],
          FIXED_TIMESTAMP,
          FIXED_TIMESTAMP,
          '',
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Title cannot be empty');
        }
      });

      it('should reject whitespace-only title during reconstruction', () => {
        const treeId = treeIdFactory.build();
        const documentId = 'doc-reconstruct-whitespace-title';
        const result = Tree.reconstruct(
          treeId,
          documentId,
          TreePosition.origin(),
          PhysicalProperties.default(),
          [],
          FIXED_TIMESTAMP,
          FIXED_TIMESTAMP,
          '   ',
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Title cannot be empty');
        }
      });
    });

    describe('invalid reconstruction cases', () => {
      it('should fail with empty tree ID', () => {
        // Tree.reconstruct expects a TreeId object, not a string
        // To test invalid tree ID, we need to create an invalid TreeId first
        const treeIdResult = TreeId.fromString('');
        expect(treeIdResult.isErr()).toBe(true);
        if (treeIdResult.isErr()) {
          expect(treeIdResult.error).toBeInstanceOf(ValidationError);
          expect(treeIdResult.error.message).toContain('TreeId cannot be empty');
        }
      });

      it('should fail with empty document ID', () => {
        const treeId = treeIdFactory.build();
        const result = Tree.reconstruct(
          treeId,
          '',
          TreePosition.origin(),
          PhysicalProperties.default(),
          [],
          FIXED_TIMESTAMP,
          FIXED_TIMESTAMP,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Document');
        }
      });

      it('should fail with negative created at timestamp', () => {
        const treeId = treeIdFactory.build();
        const documentId = 'doc-negative-created';
        const result = Tree.reconstruct(
          treeId,
          documentId,
          TreePosition.origin(),
          PhysicalProperties.default(),
          [],
          -1,
          FIXED_TIMESTAMP,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Timestamp must be a non-negative integer');
        }
      });

      it('should fail with negative modified at timestamp', () => {
        const treeId = treeIdFactory.build();
        const documentId = 'doc-negative-modified';
        const result = Tree.reconstruct(
          treeId,
          documentId,
          TreePosition.origin(),
          PhysicalProperties.default(),
          [],
          FIXED_TIMESTAMP,
          -1,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Timestamp must be a non-negative integer');
        }
      });
    });
  });

  describe('Basic validation', () => {
    it('should validate structural integrity with empty tree', () => {
      const result = Tree.create('doc-validate');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        const validationResult = tree.validateStructuralIntegrity();
        expect(validationResult.isOk()).toBe(true);
      }
    });

    it('should check if tree is empty', () => {
      const result = Tree.create('doc-empty-check');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.isEmpty()).toBe(true);
        expect(tree.getNodeCount()).toBe(0);
      }
    });
  });

  describe('Basic getters', () => {
    it('should return correct basic properties', () => {
      const documentId = 'doc-getters';
      const result = Tree.create(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.getDocumentId()).toBe(documentId);
        expect(tree.getCreatedAt()).toBe(FIXED_TIMESTAMP);
        expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP);
        expect(tree.getNodeIds()).toEqual([]);
        expect(tree.getNodeCount()).toBe(0);
        expect(tree.hasTitle()).toBe(false);
        expect(tree.getTitle()).toBeUndefined();
      }
    });
  });
});
