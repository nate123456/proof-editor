import { describe, expect, test } from 'vitest';
import type {
  CreateAtomicArgumentCommand,
  UpdateArgumentSideLabelsCommand,
} from '../argument-commands.js';

describe('Argument Commands', () => {
  describe('CreateAtomicArgumentCommand', () => {
    test('should have required documentId, premiseStatementIds, and conclusionStatementIds properties', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1', 'stmt-2'],
        conclusionStatementIds: ['stmt-3'],
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('premiseStatementIds');
      expect(command).toHaveProperty('conclusionStatementIds');
      expect(command.documentId).toBe('doc-123');
      expect(command.premiseStatementIds).toEqual(['stmt-1', 'stmt-2']);
      expect(command.conclusionStatementIds).toEqual(['stmt-3']);
    });

    test('should handle empty premise and conclusion arrays', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: [],
        conclusionStatementIds: [],
      };

      expect(command.premiseStatementIds).toEqual([]);
      expect(command.conclusionStatementIds).toEqual([]);
      expect(Array.isArray(command.premiseStatementIds)).toBe(true);
      expect(Array.isArray(command.conclusionStatementIds)).toBe(true);
    });

    test('should handle single premise and conclusion', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['single-premise'],
        conclusionStatementIds: ['single-conclusion'],
      };

      expect(command.premiseStatementIds).toHaveLength(1);
      expect(command.conclusionStatementIds).toHaveLength(1);
      expect(command.premiseStatementIds[0]).toBe('single-premise');
      expect(command.conclusionStatementIds[0]).toBe('single-conclusion');
    });

    test('should handle multiple premises and conclusions', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['premise-1', 'premise-2', 'premise-3'],
        conclusionStatementIds: ['conclusion-1', 'conclusion-2'],
      };

      expect(command.premiseStatementIds).toHaveLength(3);
      expect(command.conclusionStatementIds).toHaveLength(2);
    });

    test('should handle optional side labels', () => {
      const commandWithoutLabels: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
      };

      const commandWithLabels: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
        sideLabel: {
          left: 'Modus Ponens',
          right: 'Rule 1',
        },
      };

      expect(commandWithoutLabels.sideLabel).toBeUndefined();
      expect(commandWithLabels.sideLabel).toBeDefined();
      expect(commandWithLabels.sideLabel?.left).toBe('Modus Ponens');
      expect(commandWithLabels.sideLabel?.right).toBe('Rule 1');
    });

    test('should handle partial side labels', () => {
      const commandWithLeftOnly: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
        sideLabel: {
          left: 'Left Label Only',
        },
      };

      const commandWithRightOnly: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
        sideLabel: {
          right: 'Right Label Only',
        },
      };

      expect(commandWithLeftOnly.sideLabel?.left).toBe('Left Label Only');
      expect(commandWithLeftOnly.sideLabel?.right).toBeUndefined();
      expect(commandWithRightOnly.sideLabel?.left).toBeUndefined();
      expect(commandWithRightOnly.sideLabel?.right).toBe('Right Label Only');
    });

    test('should handle empty side labels', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
        sideLabel: {
          left: '',
          right: '',
        },
      };

      expect(command.sideLabel?.left).toBe('');
      expect(command.sideLabel?.right).toBe('');
    });

    test('should preserve order of statement IDs', () => {
      const orderedPremises = ['first-premise', 'second-premise', 'third-premise'];
      const orderedConclusions = ['first-conclusion', 'second-conclusion'];

      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: orderedPremises,
        conclusionStatementIds: orderedConclusions,
      };

      expect(command.premiseStatementIds).toEqual(orderedPremises);
      expect(command.conclusionStatementIds).toEqual(orderedConclusions);
      expect(command.premiseStatementIds[0]).toBe('first-premise');
      expect(command.conclusionStatementIds[1]).toBe('second-conclusion');
    });

    test('should handle various ID formats', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        premiseStatementIds: [
          'stmt-1',
          'statement_123',
          'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          'STMT-UPPERCASE',
        ],
        conclusionStatementIds: ['conclusion.with.dots', 'conclusion:with:colons'],
      };

      expect(command.premiseStatementIds).toHaveLength(4);
      expect(command.conclusionStatementIds).toHaveLength(2);
      expect(command.premiseStatementIds).toContain('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });
  });

  describe('UpdateArgumentSideLabelsCommand', () => {
    test('should have required documentId, argumentId, and sideLabels properties', () => {
      const command: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: 'Updated Left',
          right: 'Updated Right',
        },
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('argumentId');
      expect(command).toHaveProperty('sideLabels');
      expect(command.documentId).toBe('doc-123');
      expect(command.argumentId).toBe('arg-456');
      expect(command.sideLabels.left).toBe('Updated Left');
      expect(command.sideLabels.right).toBe('Updated Right');
    });

    test('should handle partial side label updates', () => {
      const leftOnlyCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: 'New Left Label',
        },
      };

      const rightOnlyCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          right: 'New Right Label',
        },
      };

      expect(leftOnlyCommand.sideLabels.left).toBe('New Left Label');
      expect(leftOnlyCommand.sideLabels.right).toBeUndefined();
      expect(rightOnlyCommand.sideLabels.left).toBeUndefined();
      expect(rightOnlyCommand.sideLabels.right).toBe('New Right Label');
    });

    test('should handle empty side label updates', () => {
      const command: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: '',
          right: '',
        },
      };

      expect(command.sideLabels.left).toBe('');
      expect(command.sideLabels.right).toBe('');
    });

    test('should handle long side labels', () => {
      const longLabel =
        'This is a very long side label that might be used for detailed rule names or reference citations that span multiple words and provide comprehensive context for the logical rule being applied';

      const command: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: longLabel,
          right: longLabel,
        },
      };

      expect(command.sideLabels.left).toBe(longLabel);
      expect(command.sideLabels.right).toBe(longLabel);
      expect(command.sideLabels.left?.length).toBeGreaterThan(100);
    });

    test('should handle side labels with special characters', () => {
      const command: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: 'Rule: ∀x, P(x) → Q(x)',
          right: 'Ref: §2.1.3',
        },
      };

      expect(command.sideLabels.left).toBe('Rule: ∀x, P(x) → Q(x)');
      expect(command.sideLabels.right).toBe('Ref: §2.1.3');
    });

    test('should handle various argument ID formats', () => {
      const commands = [
        { documentId: 'doc-123', argumentId: 'arg-1', sideLabels: { left: 'Label 1' } },
        { documentId: 'doc-123', argumentId: 'argument_123', sideLabels: { right: 'Label 2' } },
        {
          documentId: 'doc-123',
          argumentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          sideLabels: { left: 'Label 3' },
        },
      ];

      commands.forEach((command) => {
        expect(command.argumentId).toBeDefined();
        expect(typeof command.argumentId).toBe('string');
        expect(command.argumentId.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Type safety and structure validation', () => {
    test('CreateAtomicArgumentCommand should enforce required properties', () => {
      const validCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
      };

      expect(validCommand).toBeDefined();

      // The following would cause TypeScript errors:
      // const invalidCommand1: CreateAtomicArgumentCommand = { documentId: 'doc-123' }; // Missing arrays
      // const invalidCommand2: CreateAtomicArgumentCommand = { premiseStatementIds: ['stmt-1'] }; // Missing documentId
      // const invalidCommand3: CreateAtomicArgumentCommand = { documentId: 123, premiseStatementIds: [], conclusionStatementIds: [] }; // Wrong type
    });

    test('UpdateArgumentSideLabelsCommand should enforce required properties', () => {
      const validCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: { left: 'Label' },
      };

      expect(validCommand).toBeDefined();
    });

    test('should handle command serialization', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1', 'stmt-2'],
        conclusionStatementIds: ['stmt-3'],
        sideLabel: {
          left: 'Test Rule',
          right: 'Test Ref',
        },
      };

      const serialized = JSON.stringify(command);
      const deserialized = JSON.parse(serialized) as CreateAtomicArgumentCommand;

      expect(deserialized).toEqual(command);
      expect(deserialized.documentId).toBe(command.documentId);
      expect(deserialized.premiseStatementIds).toEqual(command.premiseStatementIds);
      expect(deserialized.conclusionStatementIds).toEqual(command.conclusionStatementIds);
      expect(deserialized.sideLabel).toEqual(command.sideLabel);
    });
  });

  describe('Logical argument patterns', () => {
    test('should support modus ponens pattern', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['if-p-then-q', 'p'],
        conclusionStatementIds: ['q'],
        sideLabel: {
          left: 'Modus Ponens',
        },
      };

      expect(command.premiseStatementIds).toHaveLength(2);
      expect(command.conclusionStatementIds).toHaveLength(1);
      expect(command.sideLabel?.left).toBe('Modus Ponens');
    });

    test('should support modus tollens pattern', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['if-p-then-q', 'not-q'],
        conclusionStatementIds: ['not-p'],
        sideLabel: {
          left: 'Modus Tollens',
        },
      };

      expect(command.premiseStatementIds).toHaveLength(2);
      expect(command.conclusionStatementIds).toHaveLength(1);
      expect(command.sideLabel?.left).toBe('Modus Tollens');
    });

    test('should support syllogistic patterns', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['all-men-mortal', 'socrates-is-man'],
        conclusionStatementIds: ['socrates-is-mortal'],
        sideLabel: {
          left: 'Universal Instantiation',
          right: 'Syllogism',
        },
      };

      expect(command.premiseStatementIds).toHaveLength(2);
      expect(command.conclusionStatementIds).toHaveLength(1);
      expect(command.sideLabel?.left).toBe('Universal Instantiation');
      expect(command.sideLabel?.right).toBe('Syllogism');
    });

    test('should support complex multi-premise arguments', () => {
      const command: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: [
          'premise-1',
          'premise-2',
          'premise-3',
          'conjunction-rule',
          'implication-rule',
        ],
        conclusionStatementIds: ['complex-conclusion'],
        sideLabel: {
          left: 'Complex Inference',
          right: 'Multiple Rules',
        },
      };

      expect(command.premiseStatementIds).toHaveLength(5);
      expect(command.conclusionStatementIds).toHaveLength(1);
    });
  });

  describe('Side label functionality', () => {
    test('should handle rule name updates', () => {
      const updateCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: 'Disjunctive Syllogism',
          right: 'Classical Logic',
        },
      };

      expect(updateCommand.sideLabels.left).toBe('Disjunctive Syllogism');
      expect(updateCommand.sideLabels.right).toBe('Classical Logic');
    });

    test('should handle reference updates', () => {
      const updateCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: 'Aristotle, Prior Analytics',
          right: 'Page 47',
        },
      };

      expect(updateCommand.sideLabels.left).toBe('Aristotle, Prior Analytics');
      expect(updateCommand.sideLabels.right).toBe('Page 47');
    });

    test('should handle clearing side labels', () => {
      const clearCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          // Optional properties can be omitted when not needed
        },
      };

      expect(clearCommand.sideLabels.left).toBeUndefined();
      expect(clearCommand.sideLabels.right).toBeUndefined();
    });
  });
});
