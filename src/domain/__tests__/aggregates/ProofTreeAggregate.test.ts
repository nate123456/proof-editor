import type { Result } from 'neverthrow';
import { describe, expect, it } from 'vitest';
import { ProofAggregate } from '../../aggregates/ProofAggregate.js';
import { ProofTreeAggregate } from '../../aggregates/ProofTreeAggregate.js';
import type { ValidationError } from '../../shared/result.js';
import {
  AtomicArgumentId,
  Attachment,
  type NodeId,
  Position2D,
} from '../../shared/value-objects.js';

describe('ProofTreeAggregate', () => {
  describe('createNew', () => {
    it('should create empty tree aggregate successfully', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const treeResult = ProofTreeAggregate.createNew(proof);

        expect(treeResult.isOk()).toBe(true);
        if (treeResult.isOk()) {
          const tree = treeResult.value;
          expect(tree.getNodes().size).toBe(0);
          expect(tree.getVersion()).toBe(1);
          expect(tree.getProofAggregate()).toBe(proof);
        }
      }
    });

    it('should create tree with custom spatial layout', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const customPosition = Position2D.create(100, 200);
        expect(customPosition.isOk()).toBe(true);

        if (customPosition.isOk()) {
          const layout = { offset: customPosition.value, scale: 1.5 };
          const treeResult = ProofTreeAggregate.createNew(proof, layout);

          expect(treeResult.isOk()).toBe(true);
          if (treeResult.isOk()) {
            const tree = treeResult.value;
            const spatialLayout = tree.getSpatialLayout();
            expect(spatialLayout.offset.getX()).toBe(100);
            expect(spatialLayout.offset.getY()).toBe(200);
            expect(spatialLayout.scale).toBe(1.5);
          }
        }
      }
    });
  });

  describe('addNode', () => {
    it('should add root node successfully', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const statementResult = proof.addStatement('Root premise');
        if (!statementResult.isOk()) return;
        const argumentResult = proof.createAtomicArgument([statementResult.value], []);

        expect(argumentResult.isOk()).toBe(true);

        if (argumentResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;
            const nodeResult = tree.addNode({ argumentId: argumentResult.value });

            expect(nodeResult.isOk()).toBe(true);
            expect(tree.getNodes().size).toBe(1);

            if (nodeResult.isOk()) {
              const node = tree.getNodes().get(nodeResult.value);
              expect(node?.isRoot()).toBe(true);
              expect(node?.getArgumentId()).toEqual(argumentResult.value);
            }
          }
        }
      }
    });

    it('should add child node with attachment', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        // Create arguments for parent and child
        const parentArgResult = proof.createAtomicArgument([], []);
        const childArgResult = proof.createAtomicArgument([], []);

        expect(parentArgResult.isOk() && childArgResult.isOk()).toBe(true);

        if (parentArgResult.isOk() && childArgResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;

            // Add parent node first
            const parentNodeResult = tree.addNode({ argumentId: parentArgResult.value });
            expect(parentNodeResult.isOk()).toBe(true);

            if (parentNodeResult.isOk()) {
              // Create attachment
              const attachmentResult = Attachment.create(parentNodeResult.value, 0);
              expect(attachmentResult.isOk()).toBe(true);

              if (attachmentResult.isOk()) {
                // Add child node
                const childNodeResult = tree.addNode({
                  argumentId: childArgResult.value,
                  attachment: attachmentResult.value,
                });

                expect(childNodeResult.isOk()).toBe(true);
                expect(tree.getNodes().size).toBe(2);

                if (childNodeResult.isOk()) {
                  const childNode = tree.getNodes().get(childNodeResult.value);
                  expect(childNode?.isChild()).toBe(true);
                  expect(childNode?.getParentNodeId()).toEqual(parentNodeResult.value);
                }
              }
            }
          }
        }
      }
    });

    it('should reject node with non-existent argument', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const treeResult = ProofTreeAggregate.createNew(proof);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const tree = treeResult.value;

          // Create a fake argument ID that doesn't exist in the proof
          const fakeArgumentId = AtomicArgumentId.generate();

          // Use a fake argument ID that doesn't exist in the proof
          const nodeResult = tree.addNode({ argumentId: fakeArgumentId });

          expect(nodeResult.isErr()).toBe(true);
          if (nodeResult.isErr()) {
            expect(nodeResult.error.message).toContain('does not exist in proof');
          }
        }
      }
    });
  });

  describe('connectNodes', () => {
    it('should connect parent and child nodes successfully', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;

        const parentArgResult = proof.createAtomicArgument([], []);
        const childArgResult = proof.createAtomicArgument([], []);

        expect(parentArgResult.isOk() && childArgResult.isOk()).toBe(true);

        if (parentArgResult.isOk() && childArgResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;

            const parentNodeResult = tree.addNode({ argumentId: parentArgResult.value });
            const childNodeResult = tree.addNode({ argumentId: childArgResult.value });

            expect(parentNodeResult.isOk() && childNodeResult.isOk()).toBe(true);

            if (parentNodeResult.isOk() && childNodeResult.isOk()) {
              const connectResult = tree.connectNodes(
                parentNodeResult.value,
                childNodeResult.value,
                0,
              );

              expect(connectResult.isOk()).toBe(true);

              const childNode = tree.getNodes().get(childNodeResult.value);
              expect(childNode?.isChild()).toBe(true);
              expect(childNode?.getParentNodeId()).toEqual(parentNodeResult.value);
            }
          }
        }
      }
    });

    it('should reject connection to non-existent parent', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const childArgResult = proof.createAtomicArgument([], []);

        expect(childArgResult.isOk()).toBe(true);

        if (childArgResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;
            const childNodeResult = tree.addNode({ argumentId: childArgResult.value });
            expect(childNodeResult.isOk()).toBe(true);

            if (childNodeResult.isOk()) {
              const fakeParentId = tree.getId(); // Use tree ID as fake node ID
              const connectResult = tree.connectNodes(
                fakeParentId as any,
                childNodeResult.value,
                0,
              );

              expect(connectResult.isErr()).toBe(true);
              if (connectResult.isErr()) {
                expect(connectResult.error.message).toContain('Parent node not found');
              }
            }
          }
        }
      }
    });

    it('should reject negative position', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const parentArgResult = proof.createAtomicArgument([], []);
        const childArgResult = proof.createAtomicArgument([], []);

        expect(parentArgResult.isOk() && childArgResult.isOk()).toBe(true);

        if (parentArgResult.isOk() && childArgResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;
            const parentNodeResult = tree.addNode({ argumentId: parentArgResult.value });
            const childNodeResult = tree.addNode({ argumentId: childArgResult.value });

            expect(parentNodeResult.isOk() && childNodeResult.isOk()).toBe(true);

            if (parentNodeResult.isOk() && childNodeResult.isOk()) {
              const connectResult = tree.connectNodes(
                parentNodeResult.value,
                childNodeResult.value,
                -1,
              );

              expect(connectResult.isErr()).toBe(true);
              if (connectResult.isErr()) {
                expect(connectResult.error.message).toContain('must be non-negative');
              }
            }
          }
        }
      }
    });
  });

  describe('removeNode', () => {
    it('should remove leaf node successfully', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const argumentResult = proof.createAtomicArgument([], []);
        expect(argumentResult.isOk()).toBe(true);

        if (argumentResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;
            const nodeResult = tree.addNode({ argumentId: argumentResult.value });
            expect(nodeResult.isOk()).toBe(true);

            if (nodeResult.isOk()) {
              const removeResult = tree.removeNode(nodeResult.value);

              expect(removeResult.isOk()).toBe(true);
              expect(tree.getNodes().size).toBe(0);
            }
          }
        }
      }
    });

    it('should reject removal of node with children', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const parentArgResult = proof.createAtomicArgument([], []);
        const childArgResult = proof.createAtomicArgument([], []);

        expect(parentArgResult.isOk() && childArgResult.isOk()).toBe(true);

        if (parentArgResult.isOk() && childArgResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;
            const parentNodeResult = tree.addNode({ argumentId: parentArgResult.value });
            const childNodeResult = tree.addNode({ argumentId: childArgResult.value });

            expect(parentNodeResult.isOk() && childNodeResult.isOk()).toBe(true);

            if (parentNodeResult.isOk() && childNodeResult.isOk()) {
              tree.connectNodes(parentNodeResult.value, childNodeResult.value, 0);

              const removeResult = tree.removeNode(parentNodeResult.value);

              expect(removeResult.isErr()).toBe(true);
              if (removeResult.isErr()) {
                expect(removeResult.error.message).toContain('with children');
              }
            }
          }
        }
      }
    });
  });

  describe('validateTreeStructure', () => {
    it('should validate valid tree structure', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const argumentResult = proof.createAtomicArgument([], []);
        expect(argumentResult.isOk()).toBe(true);

        if (argumentResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;
            tree.addNode({ argumentId: argumentResult.value });

            const validationResult = tree.validateTreeStructure();
            expect(validationResult.isOk()).toBe(true);
          }
        }
      }
    });
  });

  describe('detectCycles', () => {
    it('should detect no cycles in valid tree', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const argumentResult = proof.createAtomicArgument([], []);
        expect(argumentResult.isOk()).toBe(true);

        if (argumentResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;
            tree.addNode({ argumentId: argumentResult.value });

            const cycleResult = tree.detectCycles();
            expect(cycleResult.hasCycles).toBe(false);
            expect(cycleResult.cycles).toHaveLength(0);
          }
        }
      }
    });
  });

  describe('moveNode', () => {
    it('should update spatial layout when moving tree', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const argumentResult = proof.createAtomicArgument([], []);
        expect(argumentResult.isOk()).toBe(true);

        if (argumentResult.isOk()) {
          const treeResult = ProofTreeAggregate.createNew(proof);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const tree = treeResult.value;
            const nodeResult = tree.addNode({ argumentId: argumentResult.value });
            expect(nodeResult.isOk()).toBe(true);

            if (nodeResult.isOk()) {
              const newPositionResult = Position2D.create(50, 75);
              expect(newPositionResult.isOk()).toBe(true);

              if (newPositionResult.isOk()) {
                const moveResult = tree.moveNode(nodeResult.value, newPositionResult.value);

                expect(moveResult.isOk()).toBe(true);

                const layout = tree.getSpatialLayout();
                expect(layout.offset.getX()).toBe(50);
                expect(layout.offset.getY()).toBe(75);
              }
            }
          }
        }
      }
    });
  });

  describe('event handling', () => {
    it('should track uncommitted events', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const treeResult = ProofTreeAggregate.createNew(proof);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const tree = treeResult.value;
          const events = tree.getUncommittedEvents();

          expect(events.length).toBe(0);
        }
      }
    });

    it('should clear committed events', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const treeResult = ProofTreeAggregate.createNew(proof);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const tree = treeResult.value;
          tree.markEventsAsCommitted();

          const events = tree.getUncommittedEvents();
          expect(events.length).toBe(0);
        }
      }
    });
  });

  describe('deep tree structures', () => {
    it('should handle deep tree structures with multiple levels efficiently', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const treeResult = ProofTreeAggregate.createNew(proof);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const tree = treeResult.value;
          const depth = 500; // Deep tree with 500 levels

          // Create arguments for each level
          const argumentIds: AtomicArgumentId[] = [];
          for (let i = 0; i < depth; i++) {
            const argResult = proof.createAtomicArgument([], []);
            expect(argResult.isOk()).toBe(true);
            if (argResult.isOk()) {
              argumentIds.push(argResult.value);
            }
          }

          // Ensure all arguments were created successfully
          expect(argumentIds).toHaveLength(depth);

          // Build linear chain: root -> child1 -> child2 -> ... -> childN
          const startTime = Date.now();

          let parentNodeId: NodeId | null = null;
          for (let i = 0; i < depth; i++) {
            let nodeResult: Result<NodeId, ValidationError> | undefined;
            const currentArgumentId = argumentIds[i];
            expect(currentArgumentId).toBeDefined();

            if (!currentArgumentId) {
              throw new Error(`Missing argument ID at index ${i}`);
            }

            if (i === 0) {
              // Root node
              nodeResult = tree.addNode({ argumentId: currentArgumentId });
            } else if (parentNodeId !== null) {
              // Child node
              const attachmentResult = Attachment.create(parentNodeId, 0);
              expect(attachmentResult.isOk()).toBe(true);
              if (attachmentResult.isOk()) {
                nodeResult = tree.addNode({
                  argumentId: currentArgumentId,
                  attachment: attachmentResult.value,
                });
              }
            }

            expect(nodeResult?.isOk()).toBe(true);
            if (nodeResult?.isOk()) {
              parentNodeId = nodeResult.value;
            }
          }

          // Validate that operations complete in reasonable time
          const structureValidation = tree.validateTreeStructure();
          expect(structureValidation.isOk()).toBe(true);

          const cycleDetection = tree.detectCycles();
          expect(cycleDetection.hasCycles).toBe(false);

          const endTime = Date.now();
          const executionTime = endTime - startTime;

          // Should complete in under 2 seconds for 500 levels (optimized)
          expect(executionTime).toBeLessThan(2000);

          // Verify tree structure
          expect(tree.getNodes().size).toBe(depth);
        }
      }
    });

    it('should handle wide tree structures efficiently', () => {
      const proofResult = ProofAggregate.createNew();
      expect(proofResult.isOk()).toBe(true);

      if (proofResult.isOk()) {
        const proof = proofResult.value;
        const treeResult = ProofTreeAggregate.createNew(proof);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const tree = treeResult.value;
          const childCount = 100; // Wide tree with 100 children

          // Create root argument
          const rootArgResult = proof.createAtomicArgument([], []);
          expect(rootArgResult.isOk()).toBe(true);

          if (rootArgResult.isOk()) {
            const rootNodeResult = tree.addNode({ argumentId: rootArgResult.value });
            expect(rootNodeResult.isOk()).toBe(true);

            if (rootNodeResult.isOk()) {
              const rootNodeId = rootNodeResult.value;

              // Create child arguments and nodes
              const startTime = Date.now();

              for (let i = 0; i < childCount; i++) {
                const childArgResult = proof.createAtomicArgument([], []);
                expect(childArgResult.isOk()).toBe(true);

                if (childArgResult.isOk()) {
                  const attachmentResult = Attachment.create(rootNodeId, i);
                  expect(attachmentResult.isOk()).toBe(true);

                  if (attachmentResult.isOk()) {
                    const childNodeResult = tree.addNode({
                      argumentId: childArgResult.value,
                      attachment: attachmentResult.value,
                    });
                    expect(childNodeResult.isOk()).toBe(true);
                  }
                }
              }

              const endTime = Date.now();
              const executionTime = endTime - startTime;

              // Should complete in under 1 second for 100 children
              expect(executionTime).toBeLessThan(1000);

              // Verify tree structure
              expect(tree.getNodes().size).toBe(childCount + 1); // +1 for root

              const validation = tree.validateTreeStructure();
              expect(validation.isOk()).toBe(true);
            }
          }
        }
      }
    });
  });
});
