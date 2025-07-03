/**
 * Comprehensive test suite for Node entity - tree structure foundation
 *
 * Priority: HIGH (Core entity for proof tree construction)
 * Demonstrates:
 * - Node creation and validation patterns
 * - Attachment management and tree relationships
 * - Parent-child positioning logic
 * - Node state transitions and modifications
 * - Property-based testing for attachment scenarios
 * - Error handling with neverthrow Result types
 * - Tree construction patterns
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Node } from '../../entities/Node.js';
import { AtomicArgumentId, Attachment, NodeId } from '../../shared/value-objects.js';
import { atomicArgumentIdFactory, nodeIdFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

// Property-based test generators for Node domain
const validNodeIdArbitrary = fc.constant(null).map(() => nodeIdFactory.build());
const validAtomicArgumentIdArbitrary = fc.constant(null).map(() => atomicArgumentIdFactory.build());
const validPositionArbitrary = fc.nat({ max: 10 });
const validFromPositionArbitrary = fc.option(fc.nat({ max: 5 }));
const validTimestampArbitrary = fc.nat();

// Helper for creating valid attachments
const createTestAttachment = (
  parentNodeId?: NodeId,
  premisePosition = 0,
  fromPosition?: number | null,
) => {
  const parentId = parentNodeId ?? nodeIdFactory.build();
  // Convert null to undefined for the Attachment.create API
  const fromPos = fromPosition === null ? undefined : fromPosition;
  const result = Attachment.create(parentId, premisePosition, fromPos);
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
};

describe('Node Entity', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as ReturnType<
      typeof vi.fn
    >;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('Node Creation', () => {
    describe('root node creation', () => {
      it('should create root node with valid parameters', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.getId()).toBeInstanceOf(NodeId);
          expect(node.getArgumentId()).toBe(argumentId);
          expect(node.getAttachment()).toBeNull();
          expect(node.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(node.getModifiedAt()).toBe(FIXED_TIMESTAMP);
          expect(node.isRoot()).toBe(true);
          expect(node.isChild()).toBe(false);
        }
      });

      it('should generate unique IDs for each root node', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result1 = Node.createRoot(argumentId);
        const result2 = Node.createRoot(argumentId);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          expect(result1.value.getId().equals(result2.value.getId())).toBe(false);
          expect(result1.value.equals(result2.value)).toBe(false);
        }
      });

      it('should create root nodes with consistent timestamps', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          expect(node.getCreatedAt()).toBe(node.getModifiedAt());
        }
      });
    });

    describe('child node creation', () => {
      it('should create child node with valid attachment', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const attachment = createTestAttachment();
        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.getId()).toBeInstanceOf(NodeId);
          expect(node.getArgumentId()).toBe(argumentId);
          expect(node.getAttachment()).toBe(attachment);
          expect(node.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(node.getModifiedAt()).toBe(FIXED_TIMESTAMP);
          expect(node.isRoot()).toBe(false);
          expect(node.isChild()).toBe(true);
        }
      });

      it('should create child node with simple attachment', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const attachment = createTestAttachment(parentNodeId, 0);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          expect(node.getParentNodeId()).toBe(parentNodeId);
          expect(node.getPremisePosition()).toBe(0);
          expect(node.getFromPosition()).toBeNull();
          expect(node.hasMultipleConclusionSource()).toBe(false);
        }
      });

      it('should create child node with multiple conclusion source', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const attachment = createTestAttachment(parentNodeId, 1, 2);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          expect(node.getParentNodeId()).toBe(parentNodeId);
          expect(node.getPremisePosition()).toBe(1);
          expect(node.getFromPosition()).toBe(2);
          expect(node.hasMultipleConclusionSource()).toBe(true);
        }
      });
    });

    describe('property-based creation testing', () => {
      it('should handle various argument IDs for root nodes', () => {
        fc.assert(
          fc.property(validAtomicArgumentIdArbitrary, (argumentId) => {
            const result = Node.createRoot(argumentId);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const node = result.value;
              expect(node.getArgumentId()).toBe(argumentId);
              expect(node.isRoot()).toBe(true);
              expect(node.getAttachment()).toBeNull();
            }
          }),
        );
      });

      it('should handle various attachment configurations for child nodes', () => {
        fc.assert(
          fc.property(
            validAtomicArgumentIdArbitrary,
            validNodeIdArbitrary,
            validPositionArbitrary,
            validFromPositionArbitrary,
            (argumentId, parentNodeId, position, fromPosition) => {
              const attachment = createTestAttachment(parentNodeId, position, fromPosition);
              const result = Node.createChild(argumentId, attachment);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const node = result.value;
                expect(node.getArgumentId()).toBe(argumentId);
                expect(node.isChild()).toBe(true);
                expect(node.getParentNodeId()).toBe(parentNodeId);
                expect(node.getPremisePosition()).toBe(position);
                expect(node.getFromPosition()).toBe(fromPosition ?? null);
              }
            },
          ),
        );
      });
    });
  });

  describe('Node Reconstruction', () => {
    describe('valid reconstruction cases', () => {
      it('should reconstruct root nodes with all parameters', () => {
        const id = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();
        const createdAt = FIXED_TIMESTAMP - 1000;
        const modifiedAt = FIXED_TIMESTAMP;

        const result = Node.reconstruct(id, argumentId, null, createdAt, modifiedAt);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          expect(node.getId()).toBe(id);
          expect(node.getArgumentId()).toBe(argumentId);
          expect(node.getAttachment()).toBeNull();
          expect(node.getCreatedAt()).toBe(createdAt);
          expect(node.getModifiedAt()).toBe(modifiedAt);
          expect(node.isRoot()).toBe(true);
        }
      });

      it('should reconstruct child nodes with attachments', () => {
        const id = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();
        const attachment = createTestAttachment();
        const createdAt = FIXED_TIMESTAMP - 2000;
        const modifiedAt = FIXED_TIMESTAMP - 1000;

        const result = Node.reconstruct(id, argumentId, attachment, createdAt, modifiedAt);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          expect(node.getId()).toBe(id);
          expect(node.getArgumentId()).toBe(argumentId);
          expect(node.getAttachment()).toBe(attachment);
          expect(node.getCreatedAt()).toBe(createdAt);
          expect(node.getModifiedAt()).toBe(modifiedAt);
          expect(node.isChild()).toBe(true);
        }
      });

      it('should handle property-based reconstruction', () => {
        fc.assert(
          fc.property(
            validNodeIdArbitrary,
            validAtomicArgumentIdArbitrary,
            validTimestampArbitrary,
            validTimestampArbitrary,
            (id, argumentId, createdAt, modifiedAt) => {
              const result = Node.reconstruct(id, argumentId, null, createdAt, modifiedAt);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const node = result.value;
                expect(node.getId()).toBe(id);
                expect(node.getArgumentId()).toBe(argumentId);
                expect(node.getCreatedAt()).toBe(createdAt);
                expect(node.getModifiedAt()).toBe(modifiedAt);
              }
            },
          ),
        );
      });
    });
  });

  describe('Getter Methods', () => {
    describe('basic property access', () => {
      it('should provide access to all node properties', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.getId()).toBeInstanceOf(NodeId);
          expect(node.getArgumentId()).toBe(argumentId);
          expect(node.getAttachment()).toBeNull();
          expect(typeof node.getCreatedAt()).toBe('number');
          expect(typeof node.getModifiedAt()).toBe('number');
        }
      });

      it('should provide attachment-derived properties for child nodes', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const attachment = createTestAttachment(parentNodeId, 2, 1);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.getParentNodeId()).toBe(parentNodeId);
          expect(node.getPremisePosition()).toBe(2);
          expect(node.getFromPosition()).toBe(1);
          expect(node.hasMultipleConclusionSource()).toBe(true);
        }
      });

      it('should return null for attachment properties on root nodes', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.getParentNodeId()).toBeNull();
          expect(node.getPremisePosition()).toBeNull();
          expect(node.getFromPosition()).toBeNull();
          expect(node.hasMultipleConclusionSource()).toBe(false);
        }
      });
    });
  });

  describe('Node Relationships', () => {
    describe('parent-child relationships', () => {
      it('should correctly identify parent-child relationships', () => {
        const parentArgumentId = atomicArgumentIdFactory.build();
        const childArgumentId = atomicArgumentIdFactory.build();

        const parentResult = Node.createRoot(parentArgumentId);
        expect(parentResult.isOk()).toBe(true);

        if (parentResult.isOk()) {
          const parentNode = parentResult.value;
          const attachment = createTestAttachment(parentNode.getId(), 0);
          const childResult = Node.createChild(childArgumentId, attachment);

          expect(childResult.isOk()).toBe(true);
          if (childResult.isOk()) {
            const childNode = childResult.value;

            expect(childNode.isChildOf(parentNode.getId())).toBe(true);
            expect(childNode.isChildOf(nodeIdFactory.build())).toBe(false);
          }
        }
      });

      it('should identify feeding relationships', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const targetPosition = 1;
        const attachment = createTestAttachment(parentNodeId, targetPosition);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.feedsInputToParentAt(targetPosition)).toBe(true);
          expect(node.feedsInputToParentAt(targetPosition + 1)).toBe(false);
        }
      });

      it('should identify conclusion source relationships', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const fromPosition = 2;
        const attachment = createTestAttachment(parentNodeId, 0, fromPosition);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.usesParentsConclusionFrom(fromPosition)).toBe(true);
          expect(node.usesParentsConclusionFrom(fromPosition + 1)).toBe(false);
        }
      });
    });

    describe('tree flow capabilities', () => {
      it('should identify nodes that can provide input to parent', () => {
        const argumentId = atomicArgumentIdFactory.build();

        // Root node cannot provide input (no parent)
        const rootResult = Node.createRoot(argumentId);
        expect(rootResult.isOk()).toBe(true);
        if (rootResult.isOk()) {
          expect(rootResult.value.canProvideInputToParent()).toBe(false);
        }

        // Child node can provide input
        const attachment = createTestAttachment();
        const childResult = Node.createChild(argumentId, attachment);
        expect(childResult.isOk()).toBe(true);
        if (childResult.isOk()) {
          expect(childResult.value.canProvideInputToParent()).toBe(true);
        }
      });

      it('should identify nodes that provide bottom-up flow', () => {
        const argumentId = atomicArgumentIdFactory.build();

        // Root node does not provide bottom-up flow
        const rootResult = Node.createRoot(argumentId);
        expect(rootResult.isOk()).toBe(true);
        if (rootResult.isOk()) {
          expect(rootResult.value.providesBottomUpFlow()).toBe(false);
        }

        // Child node provides bottom-up flow
        const attachment = createTestAttachment();
        const childResult = Node.createChild(argumentId, attachment);
        expect(childResult.isOk()).toBe(true);
        if (childResult.isOk()) {
          expect(childResult.value.providesBottomUpFlow()).toBe(true);
        }
      });
    });
  });

  describe('Position and Attachment Functionality', () => {
    describe('attachment management', () => {
      it('should attach root node to parent successfully', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const attachment = createTestAttachment();

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const attachResult = node.attachToParent(attachment);

          expect(attachResult.isOk()).toBe(true);
          expect(node.getAttachment()).toBe(attachment);
          expect(node.isChild()).toBe(true);
          expect(node.isRoot()).toBe(false);
          expect(node.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        }
      });

      it('should fail to attach already attached node', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const attachment1 = createTestAttachment();
        const attachment2 = createTestAttachment();

        const result = Node.createChild(argumentId, attachment1);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const attachResult = node.attachToParent(attachment2);

          expect(attachResult.isErr()).toBe(true);
          if (attachResult.isErr()) {
            customExpect(attachResult.error).toBeValidationError(
              'Node is already attached to a parent',
            );
          }
        }
      });

      it('should detach child node from parent successfully', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const attachment = createTestAttachment();
        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const detachResult = node.detachFromParent();

          expect(detachResult.isOk()).toBe(true);
          expect(node.getAttachment()).toBeNull();
          expect(node.isRoot()).toBe(true);
          expect(node.isChild()).toBe(false);
          expect(node.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        }
      });

      it('should fail to detach root node', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const detachResult = node.detachFromParent();

          expect(detachResult.isErr()).toBe(true);
          if (detachResult.isErr()) {
            customExpect(detachResult.error).toBeValidationError(
              'Node is not attached to a parent',
            );
          }
        }
      });

      it('should change attachment for child node successfully', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const originalAttachment = createTestAttachment(nodeIdFactory.build(), 0);
        const newAttachment = createTestAttachment(nodeIdFactory.build(), 1, 2);

        const result = Node.createChild(argumentId, originalAttachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const changeResult = node.changeAttachment(newAttachment);

          expect(changeResult.isOk()).toBe(true);
          expect(node.getAttachment()).toBe(newAttachment);
          expect(node.getPremisePosition()).toBe(1);
          expect(node.getFromPosition()).toBe(2);
          expect(node.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        }
      });

      it('should fail to change attachment for root node', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const newAttachment = createTestAttachment();
          const changeResult = node.changeAttachment(newAttachment);

          expect(changeResult.isErr()).toBe(true);
          if (changeResult.isErr()) {
            customExpect(changeResult.error).toBeValidationError(
              'Cannot change attachment of root node',
            );
          }
        }
      });
    });

    describe('position-based queries', () => {
      it('should correctly identify feeding positions', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const parentNodeId = nodeIdFactory.build();
        const premisePosition = 3;
        const attachment = createTestAttachment(parentNodeId, premisePosition);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.feedsInputToParentAt(premisePosition)).toBe(true);
          expect(node.feedsInputToParentAt(premisePosition - 1)).toBe(false);
          expect(node.feedsInputToParentAt(premisePosition + 1)).toBe(false);
        }
      });

      it('should correctly identify conclusion source positions', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const fromPosition = 2;
        const attachment = createTestAttachment(nodeIdFactory.build(), 0, fromPosition);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.usesParentsConclusionFrom(fromPosition)).toBe(true);
          expect(node.usesParentsConclusionFrom(fromPosition - 1)).toBe(false);
          expect(node.usesParentsConclusionFrom(fromPosition + 1)).toBe(false);
        }
      });

      it('should handle nodes without from position', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const attachment = createTestAttachment(nodeIdFactory.build(), 0); // No from position

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          expect(node.usesParentsConclusionFrom(0)).toBe(false);
          expect(node.usesParentsConclusionFrom(1)).toBe(false);
          expect(node.getFromPosition()).toBeNull();
        }
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    describe('attachment validation', () => {
      it('should handle multiple attach/detach cycles', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const attachment1 = createTestAttachment();
          const attachment2 = createTestAttachment();

          // Attach
          const attach1 = node.attachToParent(attachment1);
          expect(attach1.isOk()).toBe(true);
          expect(node.isChild()).toBe(true);

          // Detach
          const detach1 = node.detachFromParent();
          expect(detach1.isOk()).toBe(true);
          expect(node.isRoot()).toBe(true);

          // Attach again
          const attach2 = node.attachToParent(attachment2);
          expect(attach2.isOk()).toBe(true);
          expect(node.getAttachment()).toBe(attachment2);
        }
      });

      it('should handle change attachment scenarios', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const originalAttachment = createTestAttachment(nodeIdFactory.build(), 0);
        const result = Node.createChild(argumentId, originalAttachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          // Change to different parent
          const newAttachment1 = createTestAttachment(nodeIdFactory.build(), 1);
          const change1 = node.changeAttachment(newAttachment1);
          expect(change1.isOk()).toBe(true);

          // Change position
          const parentId = node.getParentNodeId();
          if (!parentId) return;
          const newAttachment2 = createTestAttachment(parentId, 2, 1);
          const change2 = node.changeAttachment(newAttachment2);
          expect(change2.isOk()).toBe(true);
          expect(node.getPremisePosition()).toBe(2);
          expect(node.getFromPosition()).toBe(1);
        }
      });
    });

    describe('timestamp edge cases', () => {
      it('should handle reconstruction with edge case timestamps', () => {
        const id = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();

        // Same timestamps
        const result1 = Node.reconstruct(id, argumentId, null, 0, 0);
        expect(result1.isOk()).toBe(true);

        // Modified before created
        const result2 = Node.reconstruct(id, argumentId, null, 1000, 500);
        expect(result2.isOk()).toBe(true);

        // Large timestamps
        const result3 = Node.reconstruct(id, argumentId, null, Number.MAX_SAFE_INTEGER, 0);
        expect(result3.isOk()).toBe(true);
      });

      it('should update modification time on state changes', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const originalModified = node.getModifiedAt();

          // Advance time and make changes
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 5000);

          const attachment = createTestAttachment();
          node.attachToParent(attachment);

          expect(node.getModifiedAt()).toBe(FIXED_TIMESTAMP + 5000);
          expect(node.getModifiedAt()).toBeGreaterThan(originalModified);
        }
      });
    });

    describe('boundary conditions', () => {
      it('should handle null and undefined values correctly', () => {
        const argumentId = atomicArgumentIdFactory.build();

        // Root nodes should handle null attachment properly
        const rootResult = Node.createRoot(argumentId);
        expect(rootResult.isOk()).toBe(true);
        if (rootResult.isOk()) {
          const rootNode = rootResult.value;
          expect(rootNode.getAttachment()).toBeNull();
          expect(rootNode.getParentNodeId()).toBeNull();
          expect(rootNode.getPremisePosition()).toBeNull();
          expect(rootNode.getFromPosition()).toBeNull();
        }

        // Reconstruction with null attachment
        const reconstructResult = Node.reconstruct(
          nodeIdFactory.build(),
          argumentId,
          null,
          FIXED_TIMESTAMP,
          FIXED_TIMESTAMP,
        );
        expect(reconstructResult.isOk()).toBe(true);
      });

      it('should handle extreme position values in attachments', () => {
        const argumentId = atomicArgumentIdFactory.build();

        // Large position values
        const attachment1 = createTestAttachment(nodeIdFactory.build(), 999, 888);
        const result1 = Node.createChild(argumentId, attachment1);
        expect(result1.isOk()).toBe(true);

        // Zero positions
        const attachment2 = createTestAttachment(nodeIdFactory.build(), 0, 0);
        const result2 = Node.createChild(argumentId, attachment2);
        expect(result2.isOk()).toBe(true);
      });
    });
  });

  describe('Equality and Comparison', () => {
    describe('identity-based equality', () => {
      it('should implement identity-based equality', () => {
        const argumentId1 = atomicArgumentIdFactory.build();
        const argumentId2 = atomicArgumentIdFactory.build();

        const result1 = Node.createRoot(argumentId1);
        const result2 = Node.createRoot(argumentId2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const node1 = result1.value;
          const node2 = result2.value;

          // Different nodes should not be equal
          expect(node1.equals(node2)).toBe(false);
          expect(node2.equals(node1)).toBe(false);

          // Same node should equal itself
          expect(node1.equals(node1)).toBe(true);
          expect(node2.equals(node2)).toBe(true);
        }
      });

      it('should maintain equality after modifications', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;

          // Should equal itself before modification
          expect(node.equals(node)).toBe(true);

          // Modify the node
          const attachment = createTestAttachment();
          node.attachToParent(attachment);

          // Should still equal itself after modification
          expect(node.equals(node)).toBe(true);
        }
      });

      it('should satisfy reflexivity property', () => {
        fc.assert(
          fc.property(validAtomicArgumentIdArbitrary, (argumentId) => {
            const result = Node.createRoot(argumentId);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const node = result.value;
              expect(node.equals(node)).toBe(true);
            }
          }),
        );
      });
    });
  });

  describe('String Representation', () => {
    describe('toString method', () => {
      it('should represent root nodes correctly', () => {
        const argumentId = AtomicArgumentId.fromString('root-arg-1');
        const result = Node.createRoot(argumentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const stringRep = node.toString();

          expect(stringRep).toContain('Root');
          expect(stringRep).toContain('root-arg-1');
        }
      });

      it('should represent simple child nodes correctly', () => {
        const argumentId = AtomicArgumentId.fromString('child-arg-1');
        const parentNodeId = NodeId.fromString('parent-node-1');
        const attachment = createTestAttachment(parentNodeId, 2);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const stringRep = node.toString();

          expect(stringRep).toContain('Child');
          expect(stringRep).toContain('child-arg-1');
          expect(stringRep).toContain('parent-node-1');
          expect(stringRep).toContain('2');
          expect(stringRep).toContain('→');
        }
      });

      it('should represent child nodes with multiple conclusion sources', () => {
        const argumentId = AtomicArgumentId.fromString('child-arg-2');
        const parentNodeId = NodeId.fromString('parent-node-2');
        const attachment = createTestAttachment(parentNodeId, 1, 3);

        const result = Node.createChild(argumentId, attachment);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const node = result.value;
          const stringRep = node.toString();

          expect(stringRep).toContain('Child');
          expect(stringRep).toContain('child-arg-2');
          expect(stringRep).toContain('parent-node-2');
          expect(stringRep).toContain('1');
          expect(stringRep).toContain('3');
          expect(stringRep).toContain(':1:3');
        }
      });
    });
  });

  describe('Property-Based Testing', () => {
    describe('node state invariants', () => {
      it('should maintain invariants across state transitions', () => {
        fc.assert(
          fc.property(
            validAtomicArgumentIdArbitrary,
            fc.array(
              fc.oneof(fc.constant('attach'), fc.constant('detach'), fc.constant('change')),
              { maxLength: 5 },
            ),
            (argumentId, operations) => {
              const result = Node.createRoot(argumentId);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const node = result.value;
                const originalId = node.getId();
                const originalCreatedAt = node.getCreatedAt();

                for (const operation of operations) {
                  switch (operation) {
                    case 'attach':
                      if (node.isRoot()) {
                        const attachment = createTestAttachment();
                        node.attachToParent(attachment);
                      }
                      break;
                    case 'detach':
                      if (node.isChild()) {
                        node.detachFromParent();
                      }
                      break;
                    case 'change':
                      if (node.isChild()) {
                        const newAttachment = createTestAttachment();
                        node.changeAttachment(newAttachment);
                      }
                      break;
                  }
                }

                // Verify invariants
                expect(node.getId()).toBe(originalId);
                expect(node.getArgumentId()).toBe(argumentId);
                expect(node.getCreatedAt()).toBe(originalCreatedAt);

                // State consistency
                expect(node.isRoot()).toBe(!node.isChild());
                expect(node.isChild()).toBe(node.getAttachment() !== null);
                expect(node.canProvideInputToParent()).toBe(node.isChild());
                expect(node.providesBottomUpFlow()).toBe(node.isChild());
              }
            },
          ),
        );
      });
    });

    describe('attachment consistency', () => {
      it('should maintain attachment property consistency', () => {
        fc.assert(
          fc.property(
            validAtomicArgumentIdArbitrary,
            validNodeIdArbitrary,
            validPositionArbitrary,
            validFromPositionArbitrary,
            (argumentId, parentNodeId, position, fromPosition) => {
              const attachment = createTestAttachment(parentNodeId, position, fromPosition);
              const result = Node.createChild(argumentId, attachment);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const node = result.value;

                // Attachment properties should be consistent
                expect(node.getParentNodeId()).toBe(parentNodeId);
                expect(node.getPremisePosition()).toBe(position);
                expect(node.getFromPosition()).toBe(fromPosition ?? null);
                expect(node.hasMultipleConclusionSource()).toBe(
                  fromPosition !== undefined && fromPosition !== null,
                );

                // Relationship queries should be consistent
                expect(node.isChildOf(parentNodeId)).toBe(true);
                expect(node.feedsInputToParentAt(position)).toBe(true);
                if (fromPosition !== undefined && fromPosition !== null) {
                  expect(node.usesParentsConclusionFrom(fromPosition)).toBe(true);
                }
              }
            },
          ),
        );
      });
    });
  });
});
