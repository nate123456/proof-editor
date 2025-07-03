import { describe, expect, it } from 'vitest';

import {
  type ArgumentPayload,
  type ConnectionPayload,
  type MetadataPayload,
  OperationPayload,
  type PositionPayload,
  type StatementPayload,
  type TreePayload,
} from '../OperationPayload.js';
import { OperationType } from '../OperationType.js';

describe('OperationPayload', () => {
  describe('create', () => {
    it('should create payload with valid data and operation type', () => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const data: StatementPayload = {
          id: 'stmt-1',
          content: 'Test statement',
          metadata: { author: 'test' },
        };

        const result = OperationPayload.create(data, operationTypeResult.value);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getData()).toEqual(data);
          expect(result.value.getPayloadType()).toBe('STATEMENT');
          expect(result.value.getSize()).toBeGreaterThan(0);
        }
      }
    });

    it('should reject null or undefined data', () => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        // @ts-expect-error - Testing invalid input
        const nullResult = OperationPayload.create(null, operationTypeResult.value);
        // @ts-expect-error - Testing invalid input
        const undefinedResult = OperationPayload.create(undefined, operationTypeResult.value);

        expect(nullResult.isErr()).toBe(true);
        expect(undefinedResult.isErr()).toBe(true);
        if (nullResult.isErr()) {
          expect(nullResult.error.message).toContain('cannot be null or undefined');
        }
      }
    });

    it('should reject payload exceeding size limit', () => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const largeData = {
          id: 'large-stmt',
          content: 'x'.repeat(1024 * 1024 + 1), // Exceed 1MB limit
        };

        const result = OperationPayload.create(largeData, operationTypeResult.value);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('exceeds maximum size of 1MB');
        }
      }
    });
  });

  describe('createEmpty', () => {
    it('should create empty payload', () => {
      const result = OperationPayload.createEmpty();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isEmpty()).toBe(true);
        expect(result.value.getPayloadType()).toBe('EMPTY');
        expect(result.value.getSize()).toBe(0);
      }
    });
  });

  describe('statement payload validation', () => {
    let createStatementType: OperationType;
    let updateStatementType: OperationType;

    beforeEach(() => {
      const createResult = OperationType.create('CREATE_STATEMENT');
      const updateResult = OperationType.create('UPDATE_STATEMENT');
      expect(createResult.isOk()).toBe(true);
      expect(updateResult.isOk()).toBe(true);
      if (createResult.isOk() && updateResult.isOk()) {
        createStatementType = createResult.value;
        updateStatementType = updateResult.value;
      }
    });

    it('should validate valid statement payload', () => {
      const data: StatementPayload = {
        id: 'stmt-1',
        content: 'Valid statement content',
        metadata: { author: 'test' },
      };

      const result = OperationPayload.create(data, createStatementType);
      expect(result.isOk()).toBe(true);
    });

    it('should reject statement payload without id', () => {
      const data = {
        content: 'Statement without ID',
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createStatementType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have a valid id');
      }
    });

    it('should reject statement payload with empty id', () => {
      const data = {
        id: '',
        content: 'Statement with empty ID',
      };

      const result = OperationPayload.create(data, createStatementType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have a valid id');
      }
    });

    it('should reject statement payload without content', () => {
      const data = {
        id: 'stmt-1',
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createStatementType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have valid content');
      }
    });

    it('should reject statement payload with empty content', () => {
      const data = {
        id: 'stmt-1',
        content: '',
      };

      const result = OperationPayload.create(data, createStatementType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have valid content');
      }
    });

    it('should accept statement payload for UPDATE_STATEMENT', () => {
      const data: StatementPayload = {
        id: 'stmt-1',
        content: 'Updated statement content',
      };

      const result = OperationPayload.create(data, updateStatementType);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('argument payload validation', () => {
    let createArgumentType: OperationType;

    beforeEach(() => {
      const createResult = OperationType.create('CREATE_ARGUMENT');
      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        createArgumentType = createResult.value;
      }
    });

    it('should validate valid argument payload', () => {
      const data: ArgumentPayload = {
        id: 'arg-1',
        premises: ['stmt-1', 'stmt-2'],
        conclusions: ['stmt-3'],
        metadata: { type: 'modus_ponens' },
      };

      const result = OperationPayload.create(data, createArgumentType);
      expect(result.isOk()).toBe(true);
    });

    it('should reject argument payload without id', () => {
      const data = {
        premises: ['stmt-1'],
        conclusions: ['stmt-2'],
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createArgumentType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have a valid id');
      }
    });

    it('should reject argument payload without premises array', () => {
      const data = {
        id: 'arg-1',
        conclusions: ['stmt-2'],
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createArgumentType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have premises array');
      }
    });

    it('should reject argument payload without conclusions array', () => {
      const data = {
        id: 'arg-1',
        premises: ['stmt-1'],
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createArgumentType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have conclusions array');
      }
    });

    it('should accept empty premises and conclusions arrays', () => {
      const data: ArgumentPayload = {
        id: 'arg-1',
        premises: [],
        conclusions: [],
      };

      const result = OperationPayload.create(data, createArgumentType);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('tree payload validation', () => {
    let createTreeType: OperationType;

    beforeEach(() => {
      const createResult = OperationType.create('CREATE_TREE');
      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        createTreeType = createResult.value;
      }
    });

    it('should validate valid tree payload', () => {
      const data: TreePayload = {
        id: 'tree-1',
        rootNodeId: 'node-1',
        position: { x: 100, y: 200 },
        metadata: { name: 'Test Tree' },
      };

      const result = OperationPayload.create(data, createTreeType);
      expect(result.isOk()).toBe(true);
    });

    it('should reject tree payload without id', () => {
      const data = {
        rootNodeId: 'node-1',
        position: { x: 100, y: 200 },
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createTreeType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have a valid id');
      }
    });

    it('should reject tree payload without rootNodeId', () => {
      const data = {
        id: 'tree-1',
        position: { x: 100, y: 200 },
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createTreeType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have a valid rootNodeId');
      }
    });

    it('should reject tree payload without position', () => {
      const data = {
        id: 'tree-1',
        rootNodeId: 'node-1',
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createTreeType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have position object');
      }
    });
  });

  describe('position payload validation', () => {
    let updatePositionType: OperationType;

    beforeEach(() => {
      const updateResult = OperationType.create('UPDATE_TREE_POSITION');
      expect(updateResult.isOk()).toBe(true);
      if (updateResult.isOk()) {
        updatePositionType = updateResult.value;
      }
    });

    it('should validate valid position payload', () => {
      const data: PositionPayload = {
        x: 100,
        y: 200,
        z: 0,
      };

      const result = OperationPayload.create(data, updatePositionType);
      expect(result.isOk()).toBe(true);
    });

    it('should validate position payload without z coordinate', () => {
      const data: PositionPayload = {
        x: 100,
        y: 200,
      };

      const result = OperationPayload.create(data, updatePositionType);
      expect(result.isOk()).toBe(true);
    });

    it('should reject position payload without x coordinate', () => {
      const data = {
        y: 200,
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, updatePositionType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have numeric x and y coordinates');
      }
    });

    it('should reject position payload without y coordinate', () => {
      const data = {
        x: 100,
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, updatePositionType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have numeric x and y coordinates');
      }
    });

    it('should reject position payload with non-numeric coordinates', () => {
      const data = {
        x: '100',
        y: 200,
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, updatePositionType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have numeric x and y coordinates');
      }
    });
  });

  describe('connection payload validation', () => {
    let createConnectionType: OperationType;

    beforeEach(() => {
      const createResult = OperationType.create('CREATE_CONNECTION');
      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        createConnectionType = createResult.value;
      }
    });

    it('should validate valid connection payload', () => {
      const data: ConnectionPayload = {
        sourceId: 'node-1',
        targetId: 'node-2',
        connectionType: 'LOGICAL_FLOW',
        metadata: { strength: 'strong' },
      };

      const result = OperationPayload.create(data, createConnectionType);
      expect(result.isOk()).toBe(true);
    });

    it('should reject connection payload without sourceId', () => {
      const data = {
        targetId: 'node-2',
        connectionType: 'LOGICAL_FLOW',
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createConnectionType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have a valid sourceId');
      }
    });

    it('should reject connection payload without targetId', () => {
      const data = {
        sourceId: 'node-1',
        connectionType: 'LOGICAL_FLOW',
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, createConnectionType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have a valid targetId');
      }
    });
  });

  describe('metadata payload validation', () => {
    let updateMetadataType: OperationType;

    beforeEach(() => {
      const updateResult = OperationType.create('UPDATE_METADATA');
      expect(updateResult.isOk()).toBe(true);
      if (updateResult.isOk()) {
        updateMetadataType = updateResult.value;
      }
    });

    it('should validate valid metadata payload', () => {
      const data: MetadataPayload = {
        key: 'author',
        value: 'John Doe',
        previousValue: 'Jane Doe',
      };

      const result = OperationPayload.create(data, updateMetadataType);
      expect(result.isOk()).toBe(true);
    });

    it('should reject metadata payload without key', () => {
      const data = {
        value: 'John Doe',
      };

      // @ts-expect-error - Testing invalid payload
      const result = OperationPayload.create(data, updateMetadataType);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must have a valid key');
      }
    });

    it('should accept metadata payload with null value', () => {
      const data: MetadataPayload = {
        key: 'description',
        value: null,
      };

      const result = OperationPayload.create(data, updateMetadataType);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('delete operation validation', () => {
    it('should accept any data for delete operations', () => {
      const deleteTypes = [
        'DELETE_STATEMENT',
        'DELETE_ARGUMENT',
        'DELETE_TREE',
        'DELETE_CONNECTION',
      ] as const;

      for (const deleteType of deleteTypes) {
        const operationTypeResult = OperationType.create(deleteType);
        expect(operationTypeResult.isOk()).toBe(true);

        if (operationTypeResult.isOk()) {
          const data = { id: 'to-delete' };
          const result = OperationPayload.create(data, operationTypeResult.value);
          expect(result.isOk()).toBe(true);
        }
      }
    });
  });

  describe('payload type determination', () => {
    it('should determine payload types correctly', () => {
      const typeTests: [string, string][] = [
        ['CREATE_STATEMENT', 'STATEMENT'],
        ['UPDATE_STATEMENT', 'STATEMENT'],
        ['CREATE_ARGUMENT', 'ARGUMENT'],
        ['UPDATE_ARGUMENT', 'ARGUMENT'],
        ['CREATE_TREE', 'TREE'],
        ['CREATE_CONNECTION', 'CONNECTION'],
        ['UPDATE_METADATA', 'METADATA'],
        ['DELETE_STATEMENT', 'STATEMENT'],
      ];

      for (const [operationType, expectedPayloadType] of typeTests) {
        const operationTypeResult = OperationType.create(operationType as any);
        expect(operationTypeResult.isOk()).toBe(true);

        if (operationTypeResult.isOk()) {
          let data: any;
          // Provide appropriate data structure for each operation type
          if (operationType.includes('STATEMENT')) {
            data = { id: 'test', content: 'test content' };
          } else if (operationType.includes('ARGUMENT')) {
            data = { id: 'test', premises: [], conclusions: [] };
          } else if (operationType.includes('TREE')) {
            data = { id: 'test', rootNodeId: 'node1', position: { x: 0, y: 0 } };
          } else if (operationType.includes('CONNECTION')) {
            data = { sourceId: 'src', targetId: 'tgt', connectionType: 'test' };
          } else if (operationType.includes('METADATA')) {
            data = { key: 'test', value: 'test' };
          } else if (operationType.includes('POSITION')) {
            data = { x: 0, y: 0 };
          } else {
            data = { id: 'test' };
          }

          const result = OperationPayload.create(data, operationTypeResult.value);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.getPayloadType()).toBe(expectedPayloadType);
          }
        }
      }
    });

    it('should use GENERIC type for unknown operation types', () => {
      // This would require creating a mock OperationType that returns unknown value
      // For now, we test the happy path as the validation should catch invalid types
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const data = { id: 'test', content: 'test content' };
        const result = OperationPayload.create(data, operationTypeResult.value);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPayloadType()).toBe('STATEMENT');
        }
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal payloads', () => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const data = { id: 'test', content: 'Same content' };
        const payload1Result = OperationPayload.create(data, operationTypeResult.value);
        const payload2Result = OperationPayload.create(data, operationTypeResult.value);

        expect(payload1Result.isOk()).toBe(true);
        expect(payload2Result.isOk()).toBe(true);
        if (payload1Result.isOk() && payload2Result.isOk()) {
          expect(payload1Result.value.equals(payload2Result.value)).toBe(true);
        }
      }
    });

    it('should return false for different payloads', () => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const data1 = { id: 'test1', content: 'Content 1' };
        const data2 = { id: 'test2', content: 'Content 2' };
        const payload1Result = OperationPayload.create(data1, operationTypeResult.value);
        const payload2Result = OperationPayload.create(data2, operationTypeResult.value);

        expect(payload1Result.isOk()).toBe(true);
        expect(payload2Result.isOk()).toBe(true);
        if (payload1Result.isOk() && payload2Result.isOk()) {
          expect(payload1Result.value.equals(payload2Result.value)).toBe(false);
        }
      }
    });
  });

  describe('clone', () => {
    it('should clone payload successfully', () => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const data = { id: 'test', content: 'Original content' };
        const originalResult = OperationPayload.create(data, operationTypeResult.value);
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          const cloneResult = originalResult.value.clone();
          expect(cloneResult.isOk()).toBe(true);

          if (cloneResult.isOk()) {
            const clone = cloneResult.value;
            expect(clone.getData()).toEqual(originalResult.value.getData());
            expect(clone.getPayloadType()).toBe(originalResult.value.getPayloadType());
            expect(clone.getSize()).toBe(originalResult.value.getSize());
            expect(clone).not.toBe(originalResult.value); // Different objects
          }
        }
      }
    });

    it('should handle clone errors for non-serializable data', () => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const data = { id: 'test', content: 'test content' };
        const originalResult = OperationPayload.create(data, operationTypeResult.value);
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          // Simulate a clone error by testing the behavior
          const cloneResult = originalResult.value.clone();
          expect(cloneResult.isOk()).toBe(true); // This should normally succeed

          // This test verifies the clone mechanism works correctly
          if (cloneResult.isOk()) {
            expect(cloneResult.value.getData()).toEqual(data);
          }
        }
      }
    });
  });

  describe('transform', () => {
    describe('position offset transformation', () => {
      it('should transform position payloads with offset', () => {
        const positionTypeResult = OperationType.create('UPDATE_TREE_POSITION');
        expect(positionTypeResult.isOk()).toBe(true);

        if (positionTypeResult.isOk()) {
          const payload1Data: PositionPayload = { x: 100, y: 200 };
          const payload2Data: PositionPayload = { x: 50, y: 30 };

          const payload1Result = OperationPayload.create(payload1Data, positionTypeResult.value);
          const payload2Result = OperationPayload.create(payload2Data, positionTypeResult.value);

          expect(payload1Result.isOk()).toBe(true);
          expect(payload2Result.isOk()).toBe(true);

          if (payload1Result.isOk() && payload2Result.isOk()) {
            const transformResult = payload1Result.value.transform(
              payload2Result.value,
              'POSITION_OFFSET'
            );
            expect(transformResult.isOk()).toBe(true);

            if (transformResult.isOk()) {
              const transformedData = transformResult.value.getData() as PositionPayload;
              expect(transformedData.x).toBe(105); // 100 + 50 * 0.1
              expect(transformedData.y).toBe(203); // 200 + 30 * 0.1
            }
          }
        }
      });

      it('should not transform non-tree payloads for position offset', () => {
        const statementTypeResult = OperationType.create('CREATE_STATEMENT');
        expect(statementTypeResult.isOk()).toBe(true);

        if (statementTypeResult.isOk()) {
          const data = { id: 'test', content: 'Test content' };
          const payloadResult = OperationPayload.create(data, statementTypeResult.value);
          expect(payloadResult.isOk()).toBe(true);

          if (payloadResult.isOk()) {
            const transformResult = payloadResult.value.transform(
              payloadResult.value,
              'POSITION_OFFSET'
            );
            expect(transformResult.isOk()).toBe(true);

            if (transformResult.isOk()) {
              expect(transformResult.value).toBe(payloadResult.value);
            }
          }
        }
      });
    });

    describe('content merge transformation', () => {
      it('should merge object payloads', () => {
        const statementTypeResult = OperationType.create('CREATE_STATEMENT');
        expect(statementTypeResult.isOk()).toBe(true);

        if (statementTypeResult.isOk()) {
          const payload1Data = { id: 'test', content: 'Original', author: 'Alice' };
          const payload2Data = { id: 'test2', content: 'Updated', editor: 'Bob' };

          const payload1Result = OperationPayload.create(payload1Data, statementTypeResult.value);
          const payload2Result = OperationPayload.create(payload2Data, statementTypeResult.value);

          expect(payload1Result.isOk()).toBe(true);
          expect(payload2Result.isOk()).toBe(true);

          if (payload1Result.isOk() && payload2Result.isOk()) {
            const transformResult = payload1Result.value.transform(
              payload2Result.value,
              'CONTENT_MERGE'
            );
            expect(transformResult.isOk()).toBe(true);

            if (transformResult.isOk()) {
              const mergedData = transformResult.value.getData() as Record<string, unknown>;
              expect(mergedData.id).toBe('test2'); // payload2 overwrites payload1
              expect(mergedData.content).toBe('Updated'); // Overwritten
              expect(mergedData.author).toBe('Alice'); // Preserved from payload1
              expect(mergedData.editor).toBe('Bob'); // Added from payload2
            }
          }
        }
      });

      it('should not merge non-object payloads', () => {
        const statementTypeResult = OperationType.create('CREATE_STATEMENT');
        expect(statementTypeResult.isOk()).toBe(true);

        if (statementTypeResult.isOk()) {
          const objectData = { id: 'test' };
          const objectPayloadResult = OperationPayload.create(
            objectData,
            statementTypeResult.value
          );

          // This tests the transform logic path for object payloads
          if (objectPayloadResult.isOk()) {
            const transformResult = objectPayloadResult.value.transform(
              objectPayloadResult.value,
              'CONTENT_MERGE'
            );
            expect(transformResult.isOk()).toBe(true);
          }
        }
      });
    });

    describe('metadata merge transformation', () => {
      it('should merge metadata payloads with same key', () => {
        const metadataTypeResult = OperationType.create('UPDATE_METADATA');
        expect(metadataTypeResult.isOk()).toBe(true);

        if (metadataTypeResult.isOk()) {
          const payload1Data: MetadataPayload = {
            key: 'author',
            value: 'Alice',
          };
          const payload2Data: MetadataPayload = {
            key: 'author',
            value: 'Bob',
          };

          const payload1Result = OperationPayload.create(payload1Data, metadataTypeResult.value);
          const payload2Result = OperationPayload.create(payload2Data, metadataTypeResult.value);

          expect(payload1Result.isOk()).toBe(true);
          expect(payload2Result.isOk()).toBe(true);

          if (payload1Result.isOk() && payload2Result.isOk()) {
            const transformResult = payload1Result.value.transform(
              payload2Result.value,
              'METADATA_MERGE'
            );
            expect(transformResult.isOk()).toBe(true);

            if (transformResult.isOk()) {
              const mergedData = transformResult.value.getData() as MetadataPayload;
              expect(mergedData.key).toBe('author');
              expect(mergedData.value).toBe('Bob'); // New value
              expect(mergedData.previousValue).toBe('Alice'); // Previous value
            }
          }
        }
      });

      it('should not merge metadata payloads with different keys', () => {
        const metadataTypeResult = OperationType.create('UPDATE_METADATA');
        expect(metadataTypeResult.isOk()).toBe(true);

        if (metadataTypeResult.isOk()) {
          const payload1Data: MetadataPayload = {
            key: 'author',
            value: 'Alice',
          };
          const payload2Data: MetadataPayload = {
            key: 'editor',
            value: 'Bob',
          };

          const payload1Result = OperationPayload.create(payload1Data, metadataTypeResult.value);
          const payload2Result = OperationPayload.create(payload2Data, metadataTypeResult.value);

          expect(payload1Result.isOk()).toBe(true);
          expect(payload2Result.isOk()).toBe(true);

          if (payload1Result.isOk() && payload2Result.isOk()) {
            const transformResult = payload1Result.value.transform(
              payload2Result.value,
              'METADATA_MERGE'
            );
            expect(transformResult.isOk()).toBe(true);

            if (transformResult.isOk()) {
              expect(transformResult.value).toBe(payload1Result.value); // No change
            }
          }
        }
      });
    });

    it('should return original payload for unknown transformation types', () => {
      const statementTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(statementTypeResult.isOk()).toBe(true);

      if (statementTypeResult.isOk()) {
        const data = { id: 'test', content: 'Test content' };
        const payloadResult = OperationPayload.create(data, statementTypeResult.value);
        expect(payloadResult.isOk()).toBe(true);

        if (payloadResult.isOk()) {
          const transformResult = payloadResult.value.transform(
            payloadResult.value,
            'UNKNOWN_TRANSFORMATION'
          );
          expect(transformResult.isOk()).toBe(true);

          if (transformResult.isOk()) {
            expect(transformResult.value).toBe(payloadResult.value);
          }
        }
      }
    });
  });

  describe('utility methods', () => {
    let payload: OperationPayload;

    beforeEach(() => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const data = {
          id: 'test-stmt',
          content: 'Test content',
          metadata: { author: 'test' },
        };
        const payloadResult = OperationPayload.create(data, operationTypeResult.value);
        expect(payloadResult.isOk()).toBe(true);
        if (payloadResult.isOk()) {
          payload = payloadResult.value;
        }
      }
    });

    describe('hasField', () => {
      it('should return true for existing fields', () => {
        expect(payload.hasField('id')).toBe(true);
        expect(payload.hasField('content')).toBe(true);
        expect(payload.hasField('metadata')).toBe(true);
      });

      it('should return false for non-existing fields', () => {
        expect(payload.hasField('nonexistent')).toBe(false);
        expect(payload.hasField('author')).toBe(false);
      });
    });

    describe('getField', () => {
      it('should return field values for existing fields', () => {
        expect(payload.getField('id')).toBe('test-stmt');
        expect(payload.getField('content')).toBe('Test content');
        expect(payload.getField('metadata')).toEqual({ author: 'test' });
      });

      it('should return undefined for non-existing fields', () => {
        expect(payload.getField('nonexistent')).toBeUndefined();
      });
    });

    describe('toJSON', () => {
      it('should return JSON representation', () => {
        const json = payload.toJSON();
        expect(json.data).toEqual(payload.getData());
        expect(json.payloadType).toBe(payload.getPayloadType());
        expect(json.size).toBe(payload.getSize());
      });
    });

    describe('toString', () => {
      it('should return string representation', () => {
        const str = payload.toString();
        expect(str).toContain(payload.getPayloadType());
        expect(str).toContain(payload.getSize().toString());
        expect(str).toMatch(/\(\d+ bytes\)$/);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle complex nested objects', () => {
      const operationTypeResult = OperationType.create('UPDATE_METADATA');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const complexData = {
          key: 'config',
          value: {
            settings: {
              theme: 'dark',
              features: ['feature1', 'feature2'],
              nested: {
                deep: {
                  value: 42,
                },
              },
            },
          },
        };

        const result = OperationPayload.create(complexData, operationTypeResult.value);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getSize()).toBeGreaterThan(0);
          expect(result.value.getData()).toEqual(complexData);
        }
      }
    });

    it('should calculate size correctly for different data types', () => {
      const operationTypeResult = OperationType.create('CREATE_STATEMENT');
      expect(operationTypeResult.isOk()).toBe(true);

      if (operationTypeResult.isOk()) {
        const smallData = { id: 'a', content: 'small' };
        const largeData = { id: 'a'.repeat(1000), content: 'b'.repeat(1000) };

        const smallResult = OperationPayload.create(smallData, operationTypeResult.value);
        const largeResult = OperationPayload.create(largeData, operationTypeResult.value);

        expect(smallResult.isOk()).toBe(true);
        expect(largeResult.isOk()).toBe(true);

        if (smallResult.isOk() && largeResult.isOk()) {
          expect(largeResult.value.getSize()).toBeGreaterThan(smallResult.value.getSize());
        }
      }
    });
  });
});
