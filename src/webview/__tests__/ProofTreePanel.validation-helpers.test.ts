import { describe, expect, it } from 'vitest';
import {
  validateCreateArgumentInput,
  validateEditContentMetadata,
  validateMoveNodeInput,
  validateMoveStatementInput,
  validateStatementContent,
} from '../panel/validation/ProofTreeValidators.js';

describe('ProofTreePanel Validation Helpers', () => {
  describe('validateCreateArgumentInput', () => {
    it('should validate valid premises and conclusions', () => {
      const validPremises = ['All men are mortal', 'Socrates is a man'];
      const validConclusions = ['Socrates is mortal'];

      const result = validateCreateArgumentInput(validPremises, validConclusions);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.premises).toEqual(validPremises);
        expect(result.value.conclusions).toEqual(validConclusions);
      }
    });

    it('should reject null or undefined premises', () => {
      const validConclusions = ['Valid conclusion'];

      const nullResult = validateCreateArgumentInput(null, validConclusions);
      const undefinedResult = validateCreateArgumentInput(undefined, validConclusions);

      expect(nullResult.isErr()).toBe(true);
      if (nullResult.isErr()) {
        expect(nullResult.error.message).toBe('At least one premise is required');
      }
      expect(undefinedResult.isErr()).toBe(true);
      if (undefinedResult.isErr()) {
        expect(undefinedResult.error.message).toBe('At least one premise is required');
      }
    });

    it('should reject non-array premises', () => {
      const validConclusions = ['Valid conclusion'];

      const stringResult = validateCreateArgumentInput('string premises', validConclusions);
      const objectResult = validateCreateArgumentInput({}, validConclusions);

      expect(stringResult.isErr()).toBe(true);
      if (stringResult.isErr()) {
        expect(stringResult.error.message).toBe('At least one premise is required');
      }
      expect(objectResult.isErr()).toBe(true);
      if (objectResult.isErr()) {
        expect(objectResult.error.message).toBe('At least one premise is required');
      }
    });

    it('should reject empty premises array', () => {
      const validConclusions = ['Valid conclusion'];

      const result = validateCreateArgumentInput([], validConclusions);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('At least one premise is required');
      }
    });

    it('should reject null or undefined conclusions', () => {
      const validPremises = ['Valid premise'];

      const nullResult = validateCreateArgumentInput(validPremises, null);
      const undefinedResult = validateCreateArgumentInput(validPremises, undefined);

      expect(nullResult.isErr()).toBe(true);
      if (nullResult.isErr()) {
        expect(nullResult.error.message).toBe('At least one conclusion is required');
      }
      expect(undefinedResult.isErr()).toBe(true);
      if (undefinedResult.isErr()) {
        expect(undefinedResult.error.message).toBe('At least one conclusion is required');
      }
    });

    it('should reject non-array conclusions', () => {
      const validPremises = ['Valid premise'];

      const stringResult = validateCreateArgumentInput(validPremises, 'string conclusions');
      const objectResult = validateCreateArgumentInput(validPremises, {});

      expect(stringResult.isErr()).toBe(true);
      if (stringResult.isErr()) {
        expect(stringResult.error.message).toBe('At least one conclusion is required');
      }
      expect(objectResult.isErr()).toBe(true);
      if (objectResult.isErr()) {
        expect(objectResult.error.message).toBe('At least one conclusion is required');
      }
    });

    it('should reject empty conclusions array', () => {
      const validPremises = ['Valid premise'];

      const result = validateCreateArgumentInput(validPremises, []);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('At least one conclusion is required');
      }
    });
  });

  describe('validateStatementContent', () => {
    it('should validate and trim valid content', () => {
      const validContent = '  Valid statement content  ';

      const result = validateStatementContent(validContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('Valid statement content');
      }
    });

    it('should reject null, undefined, or non-string content', () => {
      const invalidInputs = [null, undefined, 123, {}, []];

      for (const invalidInput of invalidInputs) {
        const result = validateStatementContent(invalidInput);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Statement content cannot be empty');
        }
      }
    });

    it('should reject empty or whitespace-only content', () => {
      const emptyInputs = ['', '   ', '\t\n\r'];

      for (const emptyInput of emptyInputs) {
        const result = validateStatementContent(emptyInput);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Statement content cannot be empty');
        }
      }
    });
  });

  describe('validateEditContentMetadata', () => {
    it('should validate statement edit metadata', () => {
      const validMetadata = {
        type: 'statement',
        statementId: 'stmt-123',
        nodeId: 'node-456',
        statementType: 'premise',
      };
      const validContent = 'Updated content';

      const result = validateEditContentMetadata(validMetadata, validContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata.type).toBe('statement');
        expect(result.value.metadata.statementId).toBe('stmt-123');
        expect(result.value.newContent).toBe('Updated content');
      }
    });

    it('should validate label edit metadata', () => {
      const validMetadata = {
        type: 'label',
        nodeId: 'node-456',
        labelType: 'side',
      };
      const validContent = 'Updated label';

      const result = validateEditContentMetadata(validMetadata, validContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata.type).toBe('label');
        expect(result.value.metadata.nodeId).toBe('node-456');
        expect(result.value.newContent).toBe('Updated label');
      }
    });

    it('should reject invalid metadata or content', () => {
      const invalidInputs = [
        [null, 'valid content'],
        [undefined, 'valid content'],
        ['string', 'valid content'],
        [{}, 'valid content'], // empty metadata object
        [{ type: 'invalid' }, 'valid content'], // invalid type
        [{ type: 'statement' }, null],
        [{ type: 'statement' }, undefined],
        [{ type: 'statement' }, 123],
      ];

      for (const [metadata, content] of invalidInputs) {
        const result = validateEditContentMetadata(metadata, content);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Invalid edit content request');
        }
      }
    });

    it('should reject statement metadata without statementId', () => {
      const invalidMetadata = {
        type: 'statement',
        nodeId: 'node-456',
        // missing statementId
      };

      const result = validateEditContentMetadata(invalidMetadata, 'valid content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid edit content request');
      }
    });

    it('should reject label metadata without nodeId', () => {
      const invalidMetadata = {
        type: 'label',
        labelType: 'side',
        // missing nodeId
      };

      const result = validateEditContentMetadata(invalidMetadata, 'valid content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid edit content request');
      }
    });
  });

  describe('validateMoveStatementInput', () => {
    it('should validate valid move statement input', () => {
      const validSourceData = {
        statementId: 'stmt-source',
        statementType: 'premise',
        nodeId: 'node-source',
      };
      const validTargetId = 'stmt-target';
      const validDropType = 'conclusion';

      const result = validateMoveStatementInput(validSourceData, validTargetId, validDropType);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.sourceData.statementId).toBe('stmt-source');
        expect(result.value.targetStatementId).toBe('stmt-target');
        expect(result.value.dropType).toBe('conclusion');
      }
    });

    it('should reject invalid input types', () => {
      const invalidInputs = [
        [null, 'target', 'premise'],
        [{}, 'target', 'premise'],
        [{ statementId: 'src' }, null, 'premise'],
        [{ statementId: 'src' }, 'target', null],
        [{ statementId: 'src' }, 123, 'premise'],
        [{ statementId: 'src' }, 'target', 123],
      ];

      for (const [sourceData, targetId, dropType] of invalidInputs) {
        const result = validateMoveStatementInput(sourceData, targetId, dropType);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Invalid move statement request');
        }
      }
    });

    it('should reject incomplete source data', () => {
      const incompleteSourceData = [
        { statementType: 'premise', nodeId: 'node' }, // missing statementId
        { statementId: 'stmt', nodeId: 'node' }, // missing statementType
        { statementId: 'stmt', statementType: 'premise' }, // missing nodeId
      ];

      for (const sourceData of incompleteSourceData) {
        const result = validateMoveStatementInput(sourceData, 'target', 'premise');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Invalid move statement request');
        }
      }
    });
  });

  describe('validateMoveNodeInput', () => {
    it('should validate valid move node input', () => {
      const validNodeId = 'node-123';
      const validDeltaX = 150;
      const validDeltaY = -75;

      const result = validateMoveNodeInput(validNodeId, validDeltaX, validDeltaY);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.nodeId).toBe('node-123');
        expect(result.value.deltaX).toBe(150);
        expect(result.value.deltaY).toBe(-75);
      }
    });

    it('should reject invalid input types', () => {
      const invalidInputs = [
        [null, 10, 20],
        [undefined, 10, 20],
        ['', 10, 20],
        [123, 10, 20],
        ['node', 'invalid', 20],
        ['node', 10, 'invalid'],
        ['node', null, 20],
        ['node', 10, null],
      ];

      for (const [nodeId, deltaX, deltaY] of invalidInputs) {
        const result = validateMoveNodeInput(nodeId, deltaX, deltaY);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Invalid move node request');
        }
      }
    });

    it('should handle edge case coordinate values', () => {
      const edgeCases = [
        ['node', 0, 0], // zero values
        ['node', -10000, 10000], // extreme values
        ['node', 1.5, -2.7], // decimal values
      ];

      for (const [nodeId, deltaX, deltaY] of edgeCases) {
        const result = validateMoveNodeInput(nodeId, deltaX, deltaY);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.nodeId).toBe(nodeId);
          expect(result.value.deltaX).toBe(deltaX);
          expect(result.value.deltaY).toBe(deltaY);
        }
      }
    });
  });

  describe('Integration with handler methods', () => {
    it('should demonstrate validation helper usage in real handler context', () => {
      // This test verifies that the validation functions work correctly
      // when used in the context of message handling

      // Test validation failure for createArgument
      const invalidPremises: any[] = [];
      const validConclusions = ['Valid conclusion'];

      const result = validateCreateArgumentInput(invalidPremises, validConclusions);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('At least one premise is required');
      }
    });
  });
});
