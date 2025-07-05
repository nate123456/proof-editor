import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import type {
  CreateAtomicArgumentCommand,
  UpdateArgumentSideLabelsCommand,
} from '../commands/argument-commands.js';
import type {
  CreateBootstrapArgumentCommand,
  InitializeEmptyDocumentCommand,
  PopulateEmptyArgumentCommand,
} from '../commands/bootstrap-commands.js';
import type {
  CreateDocumentCommand,
  ExportDocumentCommand,
  ImportDocumentCommand,
  LoadDocumentCommand,
  SaveDocumentCommand,
  ValidateDocumentCommand,
} from '../commands/document-commands.js';
import type { CreateOrderedSetCommand } from '../commands/orderedset-commands.js';
import type {
  CreateStatementCommand,
  DeleteStatementCommand,
  UpdateStatementCommand,
} from '../commands/statement-commands.js';
import type { AttachNodeCommand } from '../commands/tree-commands.js';

// Command validation result type
export type CommandValidationResult<T> = Result<T, ValidationError>;

// Application-level validation (not domain rules)
export function validateCreateStatement(cmd: CreateStatementCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!cmd.content?.trim()) {
    errors.push('Statement content is required');
  }

  if (cmd.content && cmd.content.length > 10000) {
    errors.push('Statement content must be less than 10,000 characters');
  }

  return errors;
}

export function validateUpdateStatement(cmd: UpdateStatementCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!cmd.statementId?.trim()) {
    errors.push('Statement ID is required');
  }

  if (cmd.content === undefined || cmd.content === null) {
    errors.push('Statement content is required');
  }

  if (cmd.content && cmd.content.length > 10000) {
    errors.push('Statement content must be less than 10,000 characters');
  }

  return errors;
}

export function validateDeleteStatement(cmd: DeleteStatementCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!cmd.statementId?.trim()) {
    errors.push('Statement ID is required');
  }

  return errors;
}

export function validateCreateAtomicArgument(cmd: CreateAtomicArgumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!Array.isArray(cmd.premiseStatementIds)) {
    errors.push('Premise statement IDs must be an array');
  } else {
    if (cmd.premiseStatementIds.some((id) => !id?.trim())) {
      errors.push('All premise statement IDs must be non-empty');
    }
  }

  if (!Array.isArray(cmd.conclusionStatementIds)) {
    errors.push('Conclusion statement IDs must be an array');
  } else {
    if (cmd.conclusionStatementIds.length === 0) {
      errors.push('At least one conclusion statement ID is required');
    }
    if (cmd.conclusionStatementIds.some((id) => !id?.trim())) {
      errors.push('All conclusion statement IDs must be non-empty');
    }
  }

  // Validate side labels if present
  if (cmd.sideLabel) {
    if (cmd.sideLabel.left && cmd.sideLabel.left.length > 500) {
      errors.push('Left side label must be less than 500 characters');
    }
    if (cmd.sideLabel.right && cmd.sideLabel.right.length > 500) {
      errors.push('Right side label must be less than 500 characters');
    }
  }

  return errors;
}

export function validateUpdateArgumentSideLabels(cmd: UpdateArgumentSideLabelsCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!cmd.argumentId?.trim()) {
    errors.push('Argument ID is required');
  }

  if (!cmd.sideLabels) {
    errors.push('Side labels object is required');
  } else {
    if (cmd.sideLabels.left && cmd.sideLabels.left.length > 500) {
      errors.push('Left side label must be less than 500 characters');
    }
    if (cmd.sideLabels.right && cmd.sideLabels.right.length > 500) {
      errors.push('Right side label must be less than 500 characters');
    }
  }

  return errors;
}

export function validateCreateDocument(cmd: CreateDocumentCommand): string[] {
  const errors: string[] = [];

  if (cmd.initialStatement && cmd.initialStatement.length > 10000) {
    errors.push('Initial statement must be less than 10,000 characters');
  }

  return errors;
}

export function validateLoadDocument(cmd: LoadDocumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.path?.trim()) {
    errors.push('Document path is required');
  }

  if (cmd.path && !cmd.path.match(/\.(yaml|yml|json)$/i)) {
    errors.push('Document path must have .yaml, .yml, or .json extension');
  }

  return errors;
}

export function validateSaveDocument(cmd: SaveDocumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (cmd.path && !cmd.path.match(/\.(yaml|yml|json)$/i)) {
    errors.push('Save path must have .yaml, .yml, or .json extension');
  }

  return errors;
}

export function validateImportDocument(cmd: ImportDocumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.yamlContent?.trim()) {
    errors.push('YAML content is required');
  }

  if (cmd.path && !cmd.path.match(/\.(yaml|yml)$/i)) {
    errors.push('Import path must have .yaml or .yml extension');
  }

  return errors;
}

export function validateExportDocument(cmd: ExportDocumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!cmd.format) {
    errors.push('Export format is required');
  } else if (!['yaml', 'json', 'svg'].includes(cmd.format)) {
    errors.push('Export format must be yaml, json, or svg');
  }

  return errors;
}

export function validateValidateDocument(cmd: ValidateDocumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  return errors;
}

export function validateInitializeEmptyDocument(cmd: InitializeEmptyDocumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  return errors;
}

export function validateCreateBootstrapArgument(cmd: CreateBootstrapArgumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!cmd.treeId?.trim()) {
    errors.push('Tree ID is required');
  }

  if (cmd.position) {
    if (typeof cmd.position.x !== 'number' || typeof cmd.position.y !== 'number') {
      errors.push('Position must have numeric x and y coordinates');
    }
    if (!Number.isFinite(cmd.position.x) || !Number.isFinite(cmd.position.y)) {
      errors.push('Position coordinates must be finite numbers');
    }
  }

  return errors;
}

export function validatePopulateEmptyArgument(cmd: PopulateEmptyArgumentCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!cmd.argumentId?.trim()) {
    errors.push('Argument ID is required');
  }

  if (!Array.isArray(cmd.premiseContents)) {
    errors.push('Premise contents must be an array');
  } else {
    if (cmd.premiseContents.some((content) => typeof content !== 'string')) {
      errors.push('All premise contents must be strings');
    }
    if (
      cmd.premiseContents.some((content) => typeof content === 'string' && content.length > 10000)
    ) {
      errors.push('Premise contents must be less than 10,000 characters each');
    }
  }

  if (!Array.isArray(cmd.conclusionContents)) {
    errors.push('Conclusion contents must be an array');
  } else {
    if (cmd.conclusionContents.some((content) => typeof content !== 'string')) {
      errors.push('All conclusion contents must be strings');
    }
    if (
      cmd.conclusionContents.some(
        (content) => typeof content === 'string' && content.length > 10000,
      )
    ) {
      errors.push('Conclusion contents must be less than 10,000 characters each');
    }
  }

  if (cmd.sideLabels) {
    if (cmd.sideLabels.left && cmd.sideLabels.left.length > 500) {
      errors.push('Left side label must be less than 500 characters');
    }
    if (cmd.sideLabels.right && cmd.sideLabels.right.length > 500) {
      errors.push('Right side label must be less than 500 characters');
    }
  }

  return errors;
}

export function validateCreateOrderedSet(cmd: CreateOrderedSetCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) {
    errors.push('Document ID is required');
  }

  if (!Array.isArray(cmd.statementIds)) {
    errors.push('Statement IDs must be an array');
  } else {
    if (cmd.statementIds.some((id) => !id?.trim())) {
      errors.push('All statement IDs must be non-empty');
    }
  }

  return errors;
}

export function validateAttachNode(cmd: AttachNodeCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId?.trim()) errors.push('Document ID is required');
  if (!cmd.treeId?.trim()) errors.push('Tree ID is required');
  if (!cmd.argumentId?.trim()) errors.push('Argument ID is required');
  if (!cmd.parentNodeId?.trim()) errors.push('Parent node ID is required');
  if (typeof cmd.premisePosition !== 'number') errors.push('Premise position must be a number');
  if (cmd.premisePosition < 0) errors.push('Premise position must be non-negative');
  if (!Number.isInteger(cmd.premisePosition)) errors.push('Premise position must be an integer');

  if (cmd.fromPosition !== undefined) {
    if (typeof cmd.fromPosition !== 'number') errors.push('From position must be a number');
    if (cmd.fromPosition < 0) errors.push('From position must be non-negative');
    if (!Number.isInteger(cmd.fromPosition)) errors.push('From position must be an integer');
  }

  return errors;
}

// Result-based validation functions that return neverthrow Results
export function validateCreateStatementWithResult(
  cmd: CreateStatementCommand,
): CommandValidationResult<CreateStatementCommand> {
  const errors = validateCreateStatement(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateUpdateStatementWithResult(
  cmd: UpdateStatementCommand,
): CommandValidationResult<UpdateStatementCommand> {
  const errors = validateUpdateStatement(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateDeleteStatementWithResult(
  cmd: DeleteStatementCommand,
): CommandValidationResult<DeleteStatementCommand> {
  const errors = validateDeleteStatement(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateCreateAtomicArgumentWithResult(
  cmd: CreateAtomicArgumentCommand,
): CommandValidationResult<CreateAtomicArgumentCommand> {
  const errors = validateCreateAtomicArgument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateUpdateArgumentSideLabelsWithResult(
  cmd: UpdateArgumentSideLabelsCommand,
): CommandValidationResult<UpdateArgumentSideLabelsCommand> {
  const errors = validateUpdateArgumentSideLabels(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateCreateDocumentWithResult(
  cmd: CreateDocumentCommand,
): CommandValidationResult<CreateDocumentCommand> {
  const errors = validateCreateDocument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateLoadDocumentWithResult(
  cmd: LoadDocumentCommand,
): CommandValidationResult<LoadDocumentCommand> {
  const errors = validateLoadDocument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateSaveDocumentWithResult(
  cmd: SaveDocumentCommand,
): CommandValidationResult<SaveDocumentCommand> {
  const errors = validateSaveDocument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateImportDocumentWithResult(
  cmd: ImportDocumentCommand,
): CommandValidationResult<ImportDocumentCommand> {
  const errors = validateImportDocument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateExportDocumentWithResult(
  cmd: ExportDocumentCommand,
): CommandValidationResult<ExportDocumentCommand> {
  const errors = validateExportDocument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateValidateDocumentWithResult(
  cmd: ValidateDocumentCommand,
): CommandValidationResult<ValidateDocumentCommand> {
  const errors = validateValidateDocument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateInitializeEmptyDocumentWithResult(
  cmd: InitializeEmptyDocumentCommand,
): CommandValidationResult<InitializeEmptyDocumentCommand> {
  const errors = validateInitializeEmptyDocument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateCreateBootstrapArgumentWithResult(
  cmd: CreateBootstrapArgumentCommand,
): CommandValidationResult<CreateBootstrapArgumentCommand> {
  const errors = validateCreateBootstrapArgument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validatePopulateEmptyArgumentWithResult(
  cmd: PopulateEmptyArgumentCommand,
): CommandValidationResult<PopulateEmptyArgumentCommand> {
  const errors = validatePopulateEmptyArgument(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateCreateOrderedSetWithResult(
  cmd: CreateOrderedSetCommand,
): CommandValidationResult<CreateOrderedSetCommand> {
  const errors = validateCreateOrderedSet(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}

export function validateAttachNodeWithResult(
  cmd: AttachNodeCommand,
): CommandValidationResult<AttachNodeCommand> {
  const errors = validateAttachNode(cmd);
  if (errors.length > 0) {
    return err(new ValidationError(errors.join('; ')));
  }
  return ok(cmd);
}
