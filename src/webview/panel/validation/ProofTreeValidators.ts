import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../../domain/shared/result.js';

export const validateCreateArgumentInput = (
  premises: unknown,
  conclusions: unknown,
): Result<{ premises: string[]; conclusions: string[] }, ValidationError> => {
  if (!premises || !Array.isArray(premises) || premises.length === 0) {
    return err(new ValidationError('At least one premise is required'));
  }

  if (!conclusions || !Array.isArray(conclusions) || conclusions.length === 0) {
    return err(new ValidationError('At least one conclusion is required'));
  }

  return ok({ premises, conclusions });
};

export const validateStatementContent = (content: unknown): Result<string, ValidationError> => {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return err(new ValidationError('Statement content cannot be empty'));
  }

  return ok(content.trim());
};

export const validateEditContentMetadata = (
  metadata: unknown,
  newContent: unknown,
): Result<
  {
    metadata: {
      type: 'statement' | 'label';
      statementId?: string;
      nodeId?: string;
      statementType?: 'premise' | 'conclusion';
      labelType?: string;
    };
    newContent: string;
  },
  ValidationError
> => {
  if (!metadata || typeof metadata !== 'object' || !newContent || typeof newContent !== 'string') {
    return err(new ValidationError('Invalid edit content request'));
  }

  const meta = metadata as {
    type?: string;
    statementId?: string;
    nodeId?: string;
    statementType?: string;
    labelType?: string;
  };

  if (!meta.type || (meta.type !== 'statement' && meta.type !== 'label')) {
    return err(new ValidationError('Invalid edit content request'));
  }

  if (meta.type === 'statement' && !meta.statementId) {
    return err(new ValidationError('Invalid edit content request'));
  }

  if (meta.type === 'label' && !meta.nodeId) {
    return err(new ValidationError('Invalid edit content request'));
  }

  return ok({
    metadata: meta as {
      type: 'statement' | 'label';
      statementId?: string;
      nodeId?: string;
      statementType?: 'premise' | 'conclusion';
      labelType?: string;
    },
    newContent,
  });
};

export const validateMoveStatementInput = (
  sourceData: unknown,
  targetStatementId: unknown,
  dropType: unknown,
): Result<
  {
    sourceData: { statementId: string; statementType: string; nodeId: string };
    targetStatementId: string;
    dropType: 'premise' | 'conclusion';
  },
  ValidationError
> => {
  if (
    !sourceData ||
    typeof sourceData !== 'object' ||
    !targetStatementId ||
    typeof targetStatementId !== 'string' ||
    !dropType ||
    typeof dropType !== 'string'
  ) {
    return err(new ValidationError('Invalid move statement request'));
  }

  const source = sourceData as { statementId?: string; statementType?: string; nodeId?: string };
  if (!source.statementId || !source.statementType || !source.nodeId) {
    return err(new ValidationError('Invalid move statement request'));
  }

  return ok({
    sourceData: source as { statementId: string; statementType: string; nodeId: string },
    targetStatementId,
    dropType: dropType as 'premise' | 'conclusion',
  });
};

export const validateMoveNodeInput = (
  nodeId: unknown,
  deltaX: unknown,
  deltaY: unknown,
): Result<{ nodeId: string; deltaX: number; deltaY: number }, ValidationError> => {
  if (
    !nodeId ||
    typeof nodeId !== 'string' ||
    typeof deltaX !== 'number' ||
    typeof deltaY !== 'number'
  ) {
    return err(new ValidationError('Invalid move node request'));
  }

  return ok({ nodeId, deltaX, deltaY });
};

export const validateBranchInput = (
  sourceArgumentId: unknown,
  selectedText: unknown,
  position: unknown,
): Result<
  {
    sourceArgumentId: string;
    selectedText: string;
    position: 'premise' | 'conclusion';
  },
  ValidationError
> => {
  if (
    !sourceArgumentId ||
    typeof sourceArgumentId !== 'string' ||
    !selectedText ||
    typeof selectedText !== 'string' ||
    !position ||
    typeof position !== 'string'
  ) {
    return err(new ValidationError('Invalid branch creation request'));
  }

  if (position !== 'premise' && position !== 'conclusion') {
    return err(new ValidationError('Position must be premise or conclusion'));
  }

  return ok({
    sourceArgumentId,
    selectedText,
    position: position as 'premise' | 'conclusion',
  });
};
