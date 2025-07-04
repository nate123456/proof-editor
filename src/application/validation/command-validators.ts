import type { CreateStatementCommand } from '../commands/statement-commands.js';
import type { AttachNodeCommand } from '../commands/tree-commands.js';

// Application-level validation (not domain rules)
export function validateCreateStatement(cmd: CreateStatementCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId) {
    errors.push('Document ID is required');
  }

  if (!cmd.content) {
    errors.push('Statement content is required');
  }

  return errors;
}

export function validateAttachNode(cmd: AttachNodeCommand): string[] {
  const errors: string[] = [];

  if (!cmd.documentId) errors.push('Document ID is required');
  if (!cmd.treeId) errors.push('Tree ID is required');
  if (!cmd.argumentId) errors.push('Argument ID is required');
  if (!cmd.parentNodeId) errors.push('Parent node ID is required');
  if (cmd.premisePosition < 0) errors.push('Premise position must be non-negative');

  return errors;
}

// ... validators for other commands can be added here
