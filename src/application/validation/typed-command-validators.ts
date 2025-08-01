import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import type {
  AttachNodeCommand,
  CreateAtomicArgumentCommand,
  CreateStatementCommand,
  CreateTreeCommand,
  DeleteAtomicArgumentCommand,
  DeleteStatementCommand,
  MoveTreeCommand,
  UpdateArgumentSideLabelsCommand,
  UpdateAtomicArgumentCommand,
  UpdateStatementCommand,
} from '../commands/typed-commands.js';

export type CommandValidationResult<T> = Result<T, ValidationError>;

export function validateCreateAtomicArgumentCommand(
  cmd: CreateAtomicArgumentCommand,
): CommandValidationResult<CreateAtomicArgumentCommand> {
  if (cmd.getConclusionStatementIds().isEmpty()) {
    return err(
      new ValidationError('At least one conclusion statement ID is required', {
        field: 'conclusionStatementIds',
        value: cmd.getConclusionStatementIds().size(),
      }),
    );
  }

  return ok(cmd);
}

export function validateUpdateAtomicArgumentCommand(
  cmd: UpdateAtomicArgumentCommand,
): CommandValidationResult<UpdateAtomicArgumentCommand> {
  const premises = cmd.getPremiseStatementIds();
  const conclusions = cmd.getConclusionStatementIds();

  if (!premises && !conclusions) {
    return err(
      new ValidationError('At least one of premises or conclusions must be updated', {
        field: 'update',
        value: 'both_undefined',
      }),
    );
  }

  if (conclusions?.isEmpty()) {
    return err(
      new ValidationError('Conclusion updates cannot result in empty conclusions', {
        field: 'conclusionStatementIds',
        value: conclusions.size(),
      }),
    );
  }

  return ok(cmd);
}

export function validateUpdateArgumentSideLabelsCommand(
  cmd: UpdateArgumentSideLabelsCommand,
): CommandValidationResult<UpdateArgumentSideLabelsCommand> {
  const sideLabels = cmd.getSideLabels();

  if (!sideLabels.getLeft() && !sideLabels.getRight()) {
    return err(
      new ValidationError('At least one side label (left or right) must be provided', {
        field: 'sideLabels',
        value: 'both_empty',
      }),
    );
  }

  return ok(cmd);
}

export function validateDeleteAtomicArgumentCommand(
  cmd: DeleteAtomicArgumentCommand,
): CommandValidationResult<DeleteAtomicArgumentCommand> {
  return ok(cmd);
}

export function validateCreateTreeCommand(
  cmd: CreateTreeCommand,
): CommandValidationResult<CreateTreeCommand> {
  const position = cmd.getPosition();

  if (position.getX() < 0 || position.getY() < 0) {
    return err(
      new ValidationError('Tree position coordinates must be non-negative', {
        field: 'position',
        value: position.toString(),
      }),
    );
  }

  return ok(cmd);
}

export function validateMoveTreeCommand(
  cmd: MoveTreeCommand,
): CommandValidationResult<MoveTreeCommand> {
  const position = cmd.getPosition();

  if (position.getX() < 0 || position.getY() < 0) {
    return err(
      new ValidationError('Tree position coordinates must be non-negative', {
        field: 'position',
        value: position.toString(),
      }),
    );
  }

  return ok(cmd);
}

export function validateAttachNodeCommand(
  cmd: AttachNodeCommand,
): CommandValidationResult<AttachNodeCommand> {
  return ok(cmd);
}

export function validateCreateStatementCommand(
  cmd: CreateStatementCommand,
): CommandValidationResult<CreateStatementCommand> {
  return ok(cmd);
}

export function validateUpdateStatementCommand(
  cmd: UpdateStatementCommand,
): CommandValidationResult<UpdateStatementCommand> {
  return ok(cmd);
}

export function validateDeleteStatementCommand(
  cmd: DeleteStatementCommand,
): CommandValidationResult<DeleteStatementCommand> {
  return ok(cmd);
}
