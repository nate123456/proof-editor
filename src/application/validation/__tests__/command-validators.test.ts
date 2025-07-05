import { describe, expect, it } from 'vitest';
import type {
  CreateAtomicArgumentCommand,
  UpdateArgumentSideLabelsCommand,
} from '../../commands/argument-commands.js';
import type {
  CreateBootstrapArgumentCommand,
  InitializeEmptyDocumentCommand,
  PopulateEmptyArgumentCommand,
} from '../../commands/bootstrap-commands.js';
import type {
  CreateDocumentCommand,
  ExportDocumentCommand,
  ImportDocumentCommand,
  LoadDocumentCommand,
  SaveDocumentCommand,
  ValidateDocumentCommand,
} from '../../commands/document-commands.js';
import type { CreateOrderedSetCommand } from '../../commands/orderedset-commands.js';
import type {
  CreateStatementCommand,
  DeleteStatementCommand,
  UpdateStatementCommand,
} from '../../commands/statement-commands.js';
import type { AttachNodeCommand as TreeAttachNodeCommand } from '../../commands/tree-commands.js';
import {
  validateAttachNode,
  validateAttachNodeWithResult,
  validateCreateAtomicArgument,
  validateCreateAtomicArgumentWithResult,
  validateCreateBootstrapArgument,
  validateCreateBootstrapArgumentWithResult,
  validateCreateDocument,
  validateCreateDocumentWithResult,
  validateCreateOrderedSet,
  validateCreateOrderedSetWithResult,
  validateCreateStatement,
  validateCreateStatementWithResult,
  validateDeleteStatement,
  validateDeleteStatementWithResult,
  validateExportDocument,
  validateExportDocumentWithResult,
  validateImportDocument,
  validateImportDocumentWithResult,
  validateInitializeEmptyDocument,
  validateInitializeEmptyDocumentWithResult,
  validateLoadDocument,
  validateLoadDocumentWithResult,
  validatePopulateEmptyArgument,
  validatePopulateEmptyArgumentWithResult,
  validateSaveDocument,
  validateSaveDocumentWithResult,
  validateUpdateArgumentSideLabels,
  validateUpdateArgumentSideLabelsWithResult,
  validateUpdateStatement,
  validateUpdateStatementWithResult,
  validateValidateDocument,
  validateValidateDocumentWithResult,
} from '../command-validators.js';

describe('command-validators', () => {
  describe('validateCreateStatement', () => {
    it('should pass validation for valid CreateStatementCommand', () => {
      const validCommand: CreateStatementCommand = {
        documentId: 'doc-123',
        content: 'All humans are mortal',
      };

      const errors = validateCreateStatement(validCommand);

      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: CreateStatementCommand = {
        documentId: '',
        content: 'All humans are mortal',
      };

      const errors = validateCreateStatement(invalidCommand);

      expect(errors).toContain('Document ID is required');
    });

    it('should return error when content is missing', () => {
      const invalidCommand: CreateStatementCommand = {
        documentId: 'doc-123',
        content: '',
      };

      const errors = validateCreateStatement(invalidCommand);

      expect(errors).toContain('Statement content is required');
    });

    it('should return multiple errors when both documentId and content are missing', () => {
      const invalidCommand: CreateStatementCommand = {
        documentId: '',
        content: '',
      };

      const errors = validateCreateStatement(invalidCommand);

      expect(errors).toContain('Document ID is required');
      expect(errors).toContain('Statement content is required');
      expect(errors).toHaveLength(2);
    });
  });

  describe('validateAttachNode', () => {
    it('should pass validation for valid AttachNodeCommand', () => {
      const validCommand: TreeAttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-012',
        premisePosition: 0,
      };

      const errors = validateAttachNode(validCommand);

      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: TreeAttachNodeCommand = {
        documentId: '',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-012',
        premisePosition: 0,
      };

      const errors = validateAttachNode(invalidCommand);

      expect(errors).toContain('Document ID is required');
    });

    it('should return error when treeId is missing', () => {
      const invalidCommand: TreeAttachNodeCommand = {
        documentId: 'doc-123',
        treeId: '',
        argumentId: 'arg-789',
        parentNodeId: 'node-012',
        premisePosition: 0,
      };

      const errors = validateAttachNode(invalidCommand);

      expect(errors).toContain('Tree ID is required');
    });

    it('should return error when argumentId is missing', () => {
      const invalidCommand: TreeAttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: '',
        parentNodeId: 'node-012',
        premisePosition: 0,
      };

      const errors = validateAttachNode(invalidCommand);

      expect(errors).toContain('Argument ID is required');
    });

    it('should return error when parentNodeId is missing', () => {
      const invalidCommand: TreeAttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: '',
        premisePosition: 0,
      };

      const errors = validateAttachNode(invalidCommand);

      expect(errors).toContain('Parent node ID is required');
    });

    it('should return error when premisePosition is negative', () => {
      const invalidCommand: TreeAttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-012',
        premisePosition: -1,
      };

      const errors = validateAttachNode(invalidCommand);

      expect(errors).toContain('Premise position must be non-negative');
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const invalidCommand: TreeAttachNodeCommand = {
        documentId: '',
        treeId: '',
        argumentId: 'arg-789',
        parentNodeId: 'node-012',
        premisePosition: -5,
      };

      const errors = validateAttachNode(invalidCommand);

      expect(errors).toContain('Document ID is required');
      expect(errors).toContain('Tree ID is required');
      expect(errors).toContain('Premise position must be non-negative');
      expect(errors).toHaveLength(3);
    });

    it('should return all possible errors when all fields are invalid', () => {
      const invalidCommand: TreeAttachNodeCommand = {
        documentId: '',
        treeId: '',
        argumentId: '',
        parentNodeId: '',
        premisePosition: -10,
      };

      const errors = validateAttachNode(invalidCommand);

      expect(errors).toContain('Document ID is required');
      expect(errors).toContain('Tree ID is required');
      expect(errors).toContain('Argument ID is required');
      expect(errors).toContain('Parent node ID is required');
      expect(errors).toContain('Premise position must be non-negative');
      expect(errors).toHaveLength(5);
    });

    it('should handle premisePosition of zero correctly', () => {
      const validCommand: TreeAttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-012',
        premisePosition: 0,
      };

      const errors = validateAttachNode(validCommand);

      expect(errors).toEqual([]);
    });

    it('should handle positive premisePosition correctly', () => {
      const validCommand: TreeAttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-012',
        premisePosition: 5,
      };

      const errors = validateAttachNode(validCommand);

      expect(errors).toEqual([]);
    });
  });

  describe('validateUpdateStatement', () => {
    it('should pass validation for valid UpdateStatementCommand', () => {
      const validCommand: UpdateStatementCommand = {
        documentId: 'doc-123',
        statementId: 'stmt-456',
        content: 'Updated statement content',
      };

      const errors = validateUpdateStatement(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: UpdateStatementCommand = {
        documentId: '',
        statementId: 'stmt-456',
        content: 'Updated content',
      };

      const errors = validateUpdateStatement(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should return error when statementId is missing', () => {
      const invalidCommand: UpdateStatementCommand = {
        documentId: 'doc-123',
        statementId: '',
        content: 'Updated content',
      };

      const errors = validateUpdateStatement(invalidCommand);
      expect(errors).toContain('Statement ID is required');
    });

    it('should return error when content is null or undefined', () => {
      const invalidCommand1: UpdateStatementCommand = {
        documentId: 'doc-123',
        statementId: 'stmt-456',
        content: null as any,
      };

      const invalidCommand2: UpdateStatementCommand = {
        documentId: 'doc-123',
        statementId: 'stmt-456',
        content: undefined as any,
      };

      expect(validateUpdateStatement(invalidCommand1)).toContain('Statement content is required');
      expect(validateUpdateStatement(invalidCommand2)).toContain('Statement content is required');
    });

    it('should return error when content is too long', () => {
      const longContent = 'x'.repeat(10001);
      const invalidCommand: UpdateStatementCommand = {
        documentId: 'doc-123',
        statementId: 'stmt-456',
        content: longContent,
      };

      const errors = validateUpdateStatement(invalidCommand);
      expect(errors).toContain('Statement content must be less than 10,000 characters');
    });

    it('should allow empty string content', () => {
      const validCommand: UpdateStatementCommand = {
        documentId: 'doc-123',
        statementId: 'stmt-456',
        content: '',
      };

      const errors = validateUpdateStatement(validCommand);
      expect(errors).toEqual([]);
    });
  });

  describe('validateDeleteStatement', () => {
    it('should pass validation for valid DeleteStatementCommand', () => {
      const validCommand: DeleteStatementCommand = {
        documentId: 'doc-123',
        statementId: 'stmt-456',
      };

      const errors = validateDeleteStatement(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: DeleteStatementCommand = {
        documentId: '',
        statementId: 'stmt-456',
      };

      const errors = validateDeleteStatement(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should return error when statementId is missing', () => {
      const invalidCommand: DeleteStatementCommand = {
        documentId: 'doc-123',
        statementId: '',
      };

      const errors = validateDeleteStatement(invalidCommand);
      expect(errors).toContain('Statement ID is required');
    });

    it('should return multiple errors when both IDs are missing', () => {
      const invalidCommand: DeleteStatementCommand = {
        documentId: '',
        statementId: '',
      };

      const errors = validateDeleteStatement(invalidCommand);
      expect(errors).toContain('Document ID is required');
      expect(errors).toContain('Statement ID is required');
      expect(errors).toHaveLength(2);
    });
  });

  describe('validateCreateAtomicArgument', () => {
    it('should pass validation for valid CreateAtomicArgumentCommand', () => {
      const validCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1', 'stmt-2'],
        conclusionStatementIds: ['stmt-3'],
      };

      const errors = validateCreateAtomicArgument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: CreateAtomicArgumentCommand = {
        documentId: '',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
      };

      const errors = validateCreateAtomicArgument(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should return error when premiseStatementIds is not an array', () => {
      const invalidCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: 'not-an-array' as any,
        conclusionStatementIds: ['stmt-2'],
      };

      const errors = validateCreateAtomicArgument(invalidCommand);
      expect(errors).toContain('Premise statement IDs must be an array');
    });

    it('should return error when conclusionStatementIds is empty', () => {
      const invalidCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: [],
      };

      const errors = validateCreateAtomicArgument(invalidCommand);
      expect(errors).toContain('At least one conclusion statement ID is required');
    });

    it('should return error when premise statement IDs contain empty values', () => {
      const invalidCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1', '', 'stmt-3'],
        conclusionStatementIds: ['stmt-4'],
      };

      const errors = validateCreateAtomicArgument(invalidCommand);
      expect(errors).toContain('All premise statement IDs must be non-empty');
    });

    it('should return error when conclusion statement IDs contain empty values', () => {
      const invalidCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2', ''],
      };

      const errors = validateCreateAtomicArgument(invalidCommand);
      expect(errors).toContain('All conclusion statement IDs must be non-empty');
    });

    it('should validate side labels when present', () => {
      const invalidCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
        sideLabel: {
          left: 'x'.repeat(501),
          right: 'y'.repeat(501),
        },
      };

      const errors = validateCreateAtomicArgument(invalidCommand);
      expect(errors).toContain('Left side label must be less than 500 characters');
      expect(errors).toContain('Right side label must be less than 500 characters');
    });

    it('should allow valid side labels', () => {
      const validCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: ['stmt-1'],
        conclusionStatementIds: ['stmt-2'],
        sideLabel: {
          left: 'Modus Ponens',
          right: 'Classical Logic',
        },
      };

      const errors = validateCreateAtomicArgument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should allow empty premise arrays', () => {
      const validCommand: CreateAtomicArgumentCommand = {
        documentId: 'doc-123',
        premiseStatementIds: [],
        conclusionStatementIds: ['stmt-1'],
      };

      const errors = validateCreateAtomicArgument(validCommand);
      expect(errors).toEqual([]);
    });
  });

  describe('validateUpdateArgumentSideLabels', () => {
    it('should pass validation for valid UpdateArgumentSideLabelsCommand', () => {
      const validCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: 'Updated Left',
          right: 'Updated Right',
        },
      };

      const errors = validateUpdateArgumentSideLabels(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: UpdateArgumentSideLabelsCommand = {
        documentId: '',
        argumentId: 'arg-456',
        sideLabels: { left: 'Label' },
      };

      const errors = validateUpdateArgumentSideLabels(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should return error when argumentId is missing', () => {
      const invalidCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: '',
        sideLabels: { left: 'Label' },
      };

      const errors = validateUpdateArgumentSideLabels(invalidCommand);
      expect(errors).toContain('Argument ID is required');
    });

    it('should return error when sideLabels is missing', () => {
      const invalidCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: null as any,
      };

      const errors = validateUpdateArgumentSideLabels(invalidCommand);
      expect(errors).toContain('Side labels object is required');
    });

    it('should validate side label lengths', () => {
      const invalidCommand: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: {
          left: 'x'.repeat(501),
          right: 'y'.repeat(501),
        },
      };

      const errors = validateUpdateArgumentSideLabels(invalidCommand);
      expect(errors).toContain('Left side label must be less than 500 characters');
      expect(errors).toContain('Right side label must be less than 500 characters');
    });

    it('should allow partial side labels', () => {
      const validCommand1: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: { left: 'Only Left' },
      };

      const validCommand2: UpdateArgumentSideLabelsCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        sideLabels: { right: 'Only Right' },
      };

      expect(validateUpdateArgumentSideLabels(validCommand1)).toEqual([]);
      expect(validateUpdateArgumentSideLabels(validCommand2)).toEqual([]);
    });
  });

  describe('validateCreateDocument', () => {
    it('should pass validation for valid CreateDocumentCommand', () => {
      const validCommand1: CreateDocumentCommand = {};
      const validCommand2: CreateDocumentCommand = {
        initialStatement: 'Valid initial statement',
      };

      expect(validateCreateDocument(validCommand1)).toEqual([]);
      expect(validateCreateDocument(validCommand2)).toEqual([]);
    });

    it('should return error when initial statement is too long', () => {
      const longStatement = 'x'.repeat(10001);
      const invalidCommand: CreateDocumentCommand = {
        initialStatement: longStatement,
      };

      const errors = validateCreateDocument(invalidCommand);
      expect(errors).toContain('Initial statement must be less than 10,000 characters');
    });

    it('should allow empty initial statement', () => {
      const validCommand: CreateDocumentCommand = {
        initialStatement: '',
      };

      const errors = validateCreateDocument(validCommand);
      expect(errors).toEqual([]);
    });
  });

  describe('validateLoadDocument', () => {
    it('should pass validation for valid LoadDocumentCommand', () => {
      const validCommand: LoadDocumentCommand = {
        path: '/path/to/document.yaml',
      };

      const errors = validateLoadDocument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when path is missing', () => {
      const invalidCommand: LoadDocumentCommand = {
        path: '',
      };

      const errors = validateLoadDocument(invalidCommand);
      expect(errors).toContain('Document path is required');
    });

    it('should return error for invalid file extensions', () => {
      const invalidCommand: LoadDocumentCommand = {
        path: '/path/to/document.txt',
      };

      const errors = validateLoadDocument(invalidCommand);
      expect(errors).toContain('Document path must have .yaml, .yml, or .json extension');
    });

    it('should accept valid file extensions', () => {
      const extensions = ['.yaml', '.yml', '.json', '.YAML', '.YML', '.JSON'];

      for (const ext of extensions) {
        const validCommand: LoadDocumentCommand = {
          path: `/path/to/document${ext}`,
        };
        expect(validateLoadDocument(validCommand)).toEqual([]);
      }
    });
  });

  describe('validateSaveDocument', () => {
    it('should pass validation for valid SaveDocumentCommand', () => {
      const validCommand: SaveDocumentCommand = {
        documentId: 'doc-123',
      };

      const errors = validateSaveDocument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: SaveDocumentCommand = {
        documentId: '',
      };

      const errors = validateSaveDocument(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should return error for invalid save path extensions', () => {
      const invalidCommand: SaveDocumentCommand = {
        documentId: 'doc-123',
        path: '/path/to/save.txt',
      };

      const errors = validateSaveDocument(invalidCommand);
      expect(errors).toContain('Save path must have .yaml, .yml, or .json extension');
    });

    it('should accept valid save path extensions', () => {
      const validCommand: SaveDocumentCommand = {
        documentId: 'doc-123',
        path: '/path/to/save.yaml',
      };

      expect(validateSaveDocument(validCommand)).toEqual([]);
    });

    it('should allow missing path for regular save', () => {
      const validCommand: SaveDocumentCommand = {
        documentId: 'doc-123',
      };

      expect(validateSaveDocument(validCommand)).toEqual([]);
    });
  });

  describe('validateImportDocument', () => {
    it('should pass validation for valid ImportDocumentCommand', () => {
      const validCommand: ImportDocumentCommand = {
        yamlContent: 'statements:\n  - id: stmt-1\n    content: "Test"',
      };

      const errors = validateImportDocument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when yamlContent is missing', () => {
      const invalidCommand: ImportDocumentCommand = {
        yamlContent: '',
      };

      const errors = validateImportDocument(invalidCommand);
      expect(errors).toContain('YAML content is required');
    });

    it('should return error for invalid import path extensions', () => {
      const invalidCommand: ImportDocumentCommand = {
        yamlContent: 'statements: []',
        path: '/path/to/import.json',
      };

      const errors = validateImportDocument(invalidCommand);
      expect(errors).toContain('Import path must have .yaml or .yml extension');
    });

    it('should accept valid import path extensions', () => {
      const validCommand: ImportDocumentCommand = {
        yamlContent: 'statements: []',
        path: '/path/to/import.yaml',
      };

      expect(validateImportDocument(validCommand)).toEqual([]);
    });

    it('should allow missing path', () => {
      const validCommand: ImportDocumentCommand = {
        yamlContent: 'statements: []',
      };

      expect(validateImportDocument(validCommand)).toEqual([]);
    });
  });

  describe('validateExportDocument', () => {
    it('should pass validation for valid ExportDocumentCommand', () => {
      const validCommand: ExportDocumentCommand = {
        documentId: 'doc-123',
        format: 'yaml',
      };

      const errors = validateExportDocument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: ExportDocumentCommand = {
        documentId: '',
        format: 'yaml',
      };

      const errors = validateExportDocument(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should return error when format is missing', () => {
      const invalidCommand: ExportDocumentCommand = {
        documentId: 'doc-123',
        format: null as any,
      };

      const errors = validateExportDocument(invalidCommand);
      expect(errors).toContain('Export format is required');
    });

    it('should return error for invalid export formats', () => {
      const invalidCommand: ExportDocumentCommand = {
        documentId: 'doc-123',
        format: 'pdf' as any,
      };

      const errors = validateExportDocument(invalidCommand);
      expect(errors).toContain('Export format must be yaml, json, or svg');
    });

    it('should accept all valid export formats', () => {
      const formats: Array<'yaml' | 'json' | 'svg'> = ['yaml', 'json', 'svg'];

      for (const format of formats) {
        const validCommand: ExportDocumentCommand = {
          documentId: 'doc-123',
          format,
        };
        expect(validateExportDocument(validCommand)).toEqual([]);
      }
    });
  });

  describe('validateValidateDocument', () => {
    it('should pass validation for valid ValidateDocumentCommand', () => {
      const validCommand: ValidateDocumentCommand = {
        documentId: 'doc-123',
      };

      const errors = validateValidateDocument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: ValidateDocumentCommand = {
        documentId: '',
      };

      const errors = validateValidateDocument(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should allow optional includeCustomScripts flag', () => {
      const validCommand1: ValidateDocumentCommand = {
        documentId: 'doc-123',
        includeCustomScripts: true,
      };

      const validCommand2: ValidateDocumentCommand = {
        documentId: 'doc-123',
        includeCustomScripts: false,
      };

      expect(validateValidateDocument(validCommand1)).toEqual([]);
      expect(validateValidateDocument(validCommand2)).toEqual([]);
    });
  });

  describe('validateInitializeEmptyDocument', () => {
    it('should pass validation for valid InitializeEmptyDocumentCommand', () => {
      const validCommand: InitializeEmptyDocumentCommand = {
        documentId: 'doc-123',
      };

      const errors = validateInitializeEmptyDocument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: InitializeEmptyDocumentCommand = {
        documentId: '',
      };

      const errors = validateInitializeEmptyDocument(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });
  });

  describe('validateCreateBootstrapArgument', () => {
    it('should pass validation for valid CreateBootstrapArgumentCommand', () => {
      const validCommand: CreateBootstrapArgumentCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
      };

      const errors = validateCreateBootstrapArgument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: CreateBootstrapArgumentCommand = {
        documentId: '',
        treeId: 'tree-456',
      };

      const errors = validateCreateBootstrapArgument(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should return error when treeId is missing', () => {
      const invalidCommand: CreateBootstrapArgumentCommand = {
        documentId: 'doc-123',
        treeId: '',
      };

      const errors = validateCreateBootstrapArgument(invalidCommand);
      expect(errors).toContain('Tree ID is required');
    });

    it('should validate position coordinates when present', () => {
      const invalidCommand: CreateBootstrapArgumentCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        position: {
          x: 'not-a-number' as any,
          y: 100,
        },
      };

      const errors = validateCreateBootstrapArgument(invalidCommand);
      expect(errors).toContain('Position must have numeric x and y coordinates');
    });

    it('should validate finite position coordinates', () => {
      const invalidCommand: CreateBootstrapArgumentCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        position: {
          x: Number.POSITIVE_INFINITY,
          y: Number.NEGATIVE_INFINITY,
        },
      };

      const errors = validateCreateBootstrapArgument(invalidCommand);
      expect(errors).toContain('Position coordinates must be finite numbers');
    });

    it('should allow valid position coordinates', () => {
      const validCommand: CreateBootstrapArgumentCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        position: {
          x: 100.5,
          y: -200.7,
        },
      };

      expect(validateCreateBootstrapArgument(validCommand)).toEqual([]);
    });
  });

  describe('validatePopulateEmptyArgument', () => {
    it('should pass validation for valid PopulateEmptyArgumentCommand', () => {
      const validCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: ['All men are mortal', 'Socrates is a man'],
        conclusionContents: ['Socrates is mortal'],
      };

      const errors = validatePopulateEmptyArgument(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: '',
        argumentId: 'arg-456',
        premiseContents: ['Premise'],
        conclusionContents: ['Conclusion'],
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should return error when argumentId is missing', () => {
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: '',
        premiseContents: ['Premise'],
        conclusionContents: ['Conclusion'],
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('Argument ID is required');
    });

    it('should validate premise contents array', () => {
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: 'not-an-array' as any,
        conclusionContents: ['Conclusion'],
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('Premise contents must be an array');
    });

    it('should validate premise contents are strings', () => {
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: ['Valid premise', 123 as any, 'Another premise'],
        conclusionContents: ['Conclusion'],
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('All premise contents must be strings');
    });

    it('should validate premise content length', () => {
      const longContent = 'x'.repeat(10001);
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: ['Valid premise', longContent],
        conclusionContents: ['Conclusion'],
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('Premise contents must be less than 10,000 characters each');
    });

    it('should validate conclusion contents array', () => {
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: ['Premise'],
        conclusionContents: 'not-an-array' as any,
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('Conclusion contents must be an array');
    });

    it('should validate conclusion contents are strings', () => {
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: ['Premise'],
        conclusionContents: ['Valid conclusion', null as any],
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('All conclusion contents must be strings');
    });

    it('should validate conclusion content length', () => {
      const longContent = 'x'.repeat(10001);
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: ['Premise'],
        conclusionContents: [longContent],
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('Conclusion contents must be less than 10,000 characters each');
    });

    it('should validate side labels when present', () => {
      const invalidCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: ['Premise'],
        conclusionContents: ['Conclusion'],
        sideLabels: {
          left: 'x'.repeat(501),
          right: 'y'.repeat(501),
        },
      };

      const errors = validatePopulateEmptyArgument(invalidCommand);
      expect(errors).toContain('Left side label must be less than 500 characters');
      expect(errors).toContain('Right side label must be less than 500 characters');
    });

    it('should allow empty premise and conclusion arrays', () => {
      const validCommand: PopulateEmptyArgumentCommand = {
        documentId: 'doc-123',
        argumentId: 'arg-456',
        premiseContents: [],
        conclusionContents: [],
      };

      expect(validatePopulateEmptyArgument(validCommand)).toEqual([]);
    });
  });

  describe('validateCreateOrderedSet', () => {
    it('should pass validation for valid CreateOrderedSetCommand', () => {
      const validCommand: CreateOrderedSetCommand = {
        documentId: 'doc-123',
        statementIds: ['stmt-1', 'stmt-2', 'stmt-3'],
      };

      const errors = validateCreateOrderedSet(validCommand);
      expect(errors).toEqual([]);
    });

    it('should return error when documentId is missing', () => {
      const invalidCommand: CreateOrderedSetCommand = {
        documentId: '',
        statementIds: ['stmt-1'],
      };

      const errors = validateCreateOrderedSet(invalidCommand);
      expect(errors).toContain('Document ID is required');
    });

    it('should validate statementIds is an array', () => {
      const invalidCommand: CreateOrderedSetCommand = {
        documentId: 'doc-123',
        statementIds: 'not-an-array' as any,
      };

      const errors = validateCreateOrderedSet(invalidCommand);
      expect(errors).toContain('Statement IDs must be an array');
    });

    it('should validate statement IDs are non-empty', () => {
      const invalidCommand: CreateOrderedSetCommand = {
        documentId: 'doc-123',
        statementIds: ['stmt-1', '', 'stmt-3'],
      };

      const errors = validateCreateOrderedSet(invalidCommand);
      expect(errors).toContain('All statement IDs must be non-empty');
    });

    it('should allow empty statement IDs array', () => {
      const validCommand: CreateOrderedSetCommand = {
        documentId: 'doc-123',
        statementIds: [],
      };

      expect(validateCreateOrderedSet(validCommand)).toEqual([]);
    });
  });

  describe('Result-based validation functions', () => {
    describe('validateCreateStatementWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: CreateStatementCommand = {
          documentId: 'doc-123',
          content: 'Valid content',
        };

        const result = validateCreateStatementWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: CreateStatementCommand = {
          documentId: '',
          content: '',
        };

        const result = validateCreateStatementWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Statement content is required');
        }
      });
    });

    describe('validateCreateAtomicArgumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: CreateAtomicArgumentCommand = {
          documentId: 'doc-123',
          premiseStatementIds: ['stmt-1'],
          conclusionStatementIds: ['stmt-2'],
        };

        const result = validateCreateAtomicArgumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: CreateAtomicArgumentCommand = {
          documentId: '',
          premiseStatementIds: [],
          conclusionStatementIds: [],
        };

        const result = validateCreateAtomicArgumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain(
            'At least one conclusion statement ID is required',
          );
        }
      });
    });

    describe('validateCreateDocumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: CreateDocumentCommand = {
          initialStatement: 'Valid statement',
        };

        const result = validateCreateDocumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: CreateDocumentCommand = {
          initialStatement: 'x'.repeat(10001),
        };

        const result = validateCreateDocumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(
            'Initial statement must be less than 10,000 characters',
          );
        }
      });
    });

    describe('validateLoadDocumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: LoadDocumentCommand = {
          path: '/path/to/document.yaml',
        };

        const result = validateLoadDocumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: LoadDocumentCommand = {
          path: '',
        };

        const result = validateLoadDocumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document path is required');
        }
      });
    });

    describe('validateExportDocumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: ExportDocumentCommand = {
          documentId: 'doc-123',
          format: 'yaml',
        };

        const result = validateExportDocumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: ExportDocumentCommand = {
          documentId: '',
          format: 'pdf' as any,
        };

        const result = validateExportDocumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Export format must be yaml, json, or svg');
        }
      });
    });

    describe('validateCreateBootstrapArgumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: CreateBootstrapArgumentCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
        };

        const result = validateCreateBootstrapArgumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: CreateBootstrapArgumentCommand = {
          documentId: '',
          treeId: '',
        };

        const result = validateCreateBootstrapArgumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Tree ID is required');
        }
      });
    });

    describe('validateCreateOrderedSetWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: CreateOrderedSetCommand = {
          documentId: 'doc-123',
          statementIds: ['stmt-1', 'stmt-2'],
        };

        const result = validateCreateOrderedSetWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: CreateOrderedSetCommand = {
          documentId: '',
          statementIds: 'not-an-array' as any,
        };

        const result = validateCreateOrderedSetWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Statement IDs must be an array');
        }
      });
    });

    describe('validateUpdateStatementWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: UpdateStatementCommand = {
          documentId: 'doc-123',
          statementId: 'stmt-456',
          content: 'Updated content',
        };

        const result = validateUpdateStatementWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: UpdateStatementCommand = {
          documentId: '',
          statementId: '',
          content: null as any,
        };

        const result = validateUpdateStatementWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Statement ID is required');
          expect(result.error.message).toContain('Statement content is required');
        }
      });
    });

    describe('validateDeleteStatementWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: DeleteStatementCommand = {
          documentId: 'doc-123',
          statementId: 'stmt-456',
        };

        const result = validateDeleteStatementWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: DeleteStatementCommand = {
          documentId: '',
          statementId: '',
        };

        const result = validateDeleteStatementWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Statement ID is required');
        }
      });
    });

    describe('validateUpdateArgumentSideLabelsWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: UpdateArgumentSideLabelsCommand = {
          documentId: 'doc-123',
          argumentId: 'arg-456',
          sideLabels: { left: 'Valid Label' },
        };

        const result = validateUpdateArgumentSideLabelsWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: UpdateArgumentSideLabelsCommand = {
          documentId: '',
          argumentId: '',
          sideLabels: null as any,
        };

        const result = validateUpdateArgumentSideLabelsWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Argument ID is required');
          expect(result.error.message).toContain('Side labels object is required');
        }
      });
    });

    describe('validateSaveDocumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: SaveDocumentCommand = {
          documentId: 'doc-123',
          path: '/path/to/save.yaml',
        };

        const result = validateSaveDocumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: SaveDocumentCommand = {
          documentId: '',
          path: '/path/to/save.txt',
        };

        const result = validateSaveDocumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain(
            'Save path must have .yaml, .yml, or .json extension',
          );
        }
      });
    });

    describe('validateImportDocumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: ImportDocumentCommand = {
          yamlContent: 'statements: []',
          path: '/path/to/import.yaml',
        };

        const result = validateImportDocumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: ImportDocumentCommand = {
          yamlContent: '',
          path: '/path/to/import.json',
        };

        const result = validateImportDocumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('YAML content is required');
          expect(result.error.message).toContain('Import path must have .yaml or .yml extension');
        }
      });
    });

    describe('validateValidateDocumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: ValidateDocumentCommand = {
          documentId: 'doc-123',
        };

        const result = validateValidateDocumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: ValidateDocumentCommand = {
          documentId: '',
        };

        const result = validateValidateDocumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
        }
      });
    });

    describe('validateInitializeEmptyDocumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: InitializeEmptyDocumentCommand = {
          documentId: 'doc-123',
        };

        const result = validateInitializeEmptyDocumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: InitializeEmptyDocumentCommand = {
          documentId: '',
        };

        const result = validateInitializeEmptyDocumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
        }
      });
    });

    describe('validatePopulateEmptyArgumentWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: PopulateEmptyArgumentCommand = {
          documentId: 'doc-123',
          argumentId: 'arg-456',
          premiseContents: ['All men are mortal'],
          conclusionContents: ['Socrates is mortal'],
        };

        const result = validatePopulateEmptyArgumentWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: PopulateEmptyArgumentCommand = {
          documentId: '',
          argumentId: '',
          premiseContents: 'not-an-array' as any,
          conclusionContents: 'not-an-array' as any,
        };

        const result = validatePopulateEmptyArgumentWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Argument ID is required');
          expect(result.error.message).toContain('Premise contents must be an array');
          expect(result.error.message).toContain('Conclusion contents must be an array');
        }
      });
    });

    describe('validateAttachNodeWithResult', () => {
      it('should return ok for valid command', () => {
        const validCommand: TreeAttachNodeCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-012',
          premisePosition: 0,
        };

        const result = validateAttachNodeWithResult(validCommand);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(validCommand);
        }
      });

      it('should return err for invalid command', () => {
        const invalidCommand: TreeAttachNodeCommand = {
          documentId: '',
          treeId: '',
          argumentId: '',
          parentNodeId: '',
          premisePosition: -1,
        };

        const result = validateAttachNodeWithResult(invalidCommand);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Document ID is required');
          expect(result.error.message).toContain('Tree ID is required');
          expect(result.error.message).toContain('Argument ID is required');
          expect(result.error.message).toContain('Parent node ID is required');
          expect(result.error.message).toContain('Premise position must be non-negative');
        }
      });
    });

    describe('Business rule validation edge cases', () => {
      it('should handle whitespace-only document IDs', () => {
        const invalidCommand: CreateStatementCommand = {
          documentId: '   ',
          content: 'Valid content',
        };

        const errors = validateCreateStatement(invalidCommand);
        expect(errors).toContain('Document ID is required');
      });

      it('should handle null and undefined values gracefully', () => {
        const invalidCommand: CreateAtomicArgumentCommand = {
          documentId: null as any,
          premiseStatementIds: [null as any, undefined as any],
          conclusionStatementIds: [undefined as any],
        };

        const errors = validateCreateAtomicArgument(invalidCommand);
        expect(errors).toContain('Document ID is required');
        expect(errors).toContain('All premise statement IDs must be non-empty');
        expect(errors).toContain('All conclusion statement IDs must be non-empty');
      });

      it('should validate maximum content boundaries correctly', () => {
        const exactlyMaxContent = 'x'.repeat(10000);
        const validCommand: CreateStatementCommand = {
          documentId: 'doc-123',
          content: exactlyMaxContent,
        };

        expect(validateCreateStatement(validCommand)).toEqual([]);

        const tooLongContent = 'x'.repeat(10001);
        const invalidCommand: CreateStatementCommand = {
          documentId: 'doc-123',
          content: tooLongContent,
        };

        expect(validateCreateStatement(invalidCommand)).toContain(
          'Statement content must be less than 10,000 characters',
        );
      });

      it('should validate side label boundaries correctly', () => {
        const exactlyMaxLabel = 'x'.repeat(500);
        const validCommand: CreateAtomicArgumentCommand = {
          documentId: 'doc-123',
          premiseStatementIds: ['stmt-1'],
          conclusionStatementIds: ['stmt-2'],
          sideLabel: {
            left: exactlyMaxLabel,
            right: exactlyMaxLabel,
          },
        };

        expect(validateCreateAtomicArgument(validCommand)).toEqual([]);

        const tooLongLabel = 'x'.repeat(501);
        const invalidCommand: CreateAtomicArgumentCommand = {
          documentId: 'doc-123',
          premiseStatementIds: ['stmt-1'],
          conclusionStatementIds: ['stmt-2'],
          sideLabel: {
            left: tooLongLabel,
          },
        };

        expect(validateCreateAtomicArgument(invalidCommand)).toContain(
          'Left side label must be less than 500 characters',
        );
      });

      it('should handle special number values in positions', () => {
        const invalidCommand: CreateBootstrapArgumentCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
          position: {
            x: Number.NaN,
            y: 0,
          },
        };

        const errors = validateCreateBootstrapArgument(invalidCommand);
        expect(errors).toContain('Position coordinates must be finite numbers');
      });
    });

    describe('AttachNode validation edge cases', () => {
      it('should validate non-integer premise position', () => {
        const invalidCommand: TreeAttachNodeCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-012',
          premisePosition: 1.5,
        };

        const errors = validateAttachNode(invalidCommand);
        expect(errors).toContain('Premise position must be an integer');
      });

      it('should validate non-number premise position', () => {
        const invalidCommand: TreeAttachNodeCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-012',
          premisePosition: 'not-a-number' as any,
        };

        const errors = validateAttachNode(invalidCommand);
        expect(errors).toContain('Premise position must be a number');
      });

      it('should validate fromPosition when provided', () => {
        const validCommand: TreeAttachNodeCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-012',
          premisePosition: 0,
          fromPosition: 1,
        };

        const errors = validateAttachNode(validCommand);
        expect(errors).toEqual([]);
      });

      it('should validate negative fromPosition', () => {
        const invalidCommand: TreeAttachNodeCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-012',
          premisePosition: 0,
          fromPosition: -1,
        };

        const errors = validateAttachNode(invalidCommand);
        expect(errors).toContain('From position must be non-negative');
      });

      it('should validate non-number fromPosition', () => {
        const invalidCommand: TreeAttachNodeCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-012',
          premisePosition: 0,
          fromPosition: 'not-a-number' as any,
        };

        const errors = validateAttachNode(invalidCommand);
        expect(errors).toContain('From position must be a number');
      });

      it('should validate non-integer fromPosition', () => {
        const invalidCommand: TreeAttachNodeCommand = {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-012',
          premisePosition: 0,
          fromPosition: 2.7,
        };

        const errors = validateAttachNode(invalidCommand);
        expect(errors).toContain('From position must be an integer');
      });
    });

    describe('Additional edge cases for comprehensive coverage', () => {
      it('should validate CreateStatement with exactly max length content', () => {
        const maxLengthContent = 'x'.repeat(10000);
        const validCommand: CreateStatementCommand = {
          documentId: 'doc-123',
          content: maxLengthContent,
        };

        const errors = validateCreateStatement(validCommand);
        expect(errors).toEqual([]);
      });

      it('should validate UpdateStatement with empty string content', () => {
        const validCommand: UpdateStatementCommand = {
          documentId: 'doc-123',
          statementId: 'stmt-456',
          content: '',
        };

        const errors = validateUpdateStatement(validCommand);
        expect(errors).toEqual([]);
      });

      it('should validate conclusionStatementIds is not an array in CreateAtomicArgument', () => {
        const invalidCommand: CreateAtomicArgumentCommand = {
          documentId: 'doc-123',
          premiseStatementIds: ['stmt-1'],
          conclusionStatementIds: 'not-an-array' as any,
        };

        const errors = validateCreateAtomicArgument(invalidCommand);
        expect(errors).toContain('Conclusion statement IDs must be an array');
      });

      it('should handle null and undefined in premise/conclusion IDs', () => {
        const invalidCommand: CreateAtomicArgumentCommand = {
          documentId: 'doc-123',
          premiseStatementIds: [null as any, undefined as any],
          conclusionStatementIds: [undefined as any, null as any],
        };

        const errors = validateCreateAtomicArgument(invalidCommand);
        expect(errors).toContain('All premise statement IDs must be non-empty');
        expect(errors).toContain('All conclusion statement IDs must be non-empty');
      });

      it('should validate side labels with only left label', () => {
        const validCommand: CreateAtomicArgumentCommand = {
          documentId: 'doc-123',
          premiseStatementIds: ['stmt-1'],
          conclusionStatementIds: ['stmt-2'],
          sideLabel: {
            left: 'Only left label',
          },
        };

        const errors = validateCreateAtomicArgument(validCommand);
        expect(errors).toEqual([]);
      });

      it('should validate side labels with only right label', () => {
        const validCommand: CreateAtomicArgumentCommand = {
          documentId: 'doc-123',
          premiseStatementIds: ['stmt-1'],
          conclusionStatementIds: ['stmt-2'],
          sideLabel: {
            right: 'Only right label',
          },
        };

        const errors = validateCreateAtomicArgument(validCommand);
        expect(errors).toEqual([]);
      });

      it('should validate undefined sideLabels in UpdateArgumentSideLabels', () => {
        const invalidCommand: UpdateArgumentSideLabelsCommand = {
          documentId: 'doc-123',
          argumentId: 'arg-456',
          sideLabels: undefined as any,
        };

        const errors = validateUpdateArgumentSideLabels(invalidCommand);
        expect(errors).toContain('Side labels object is required');
      });
    });
  });
});
