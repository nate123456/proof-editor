import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../result.js';
import { isFiniteNumber, isInteger, ValueObject } from './common.js';

export class DialogTitle extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<DialogTitle, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Dialog title cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();
    if (trimmed.length > 200) {
      return err(
        new ValidationError('Dialog title cannot exceed 200 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new DialogTitle(trimmed));
  }

  static fromString(value: string): Result<DialogTitle, ValidationError> {
    return DialogTitle.create(value);
  }
}

export class DialogPrompt extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<DialogPrompt, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Dialog prompt cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();
    if (trimmed.length > 500) {
      return err(
        new ValidationError('Dialog prompt cannot exceed 500 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new DialogPrompt(trimmed));
  }

  static fromString(value: string): Result<DialogPrompt, ValidationError> {
    return DialogPrompt.create(value);
  }
}

export class PlaceholderText extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<PlaceholderText, ValidationError> {
    const trimmed = value ? value.trim() : '';

    if (trimmed.length > 100) {
      return err(
        new ValidationError('Placeholder text cannot exceed 100 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new PlaceholderText(trimmed));
  }

  static fromString(value: string): Result<PlaceholderText, ValidationError> {
    return PlaceholderText.create(value);
  }

  static empty(): PlaceholderText {
    return new PlaceholderText('');
  }

  isEmpty(): boolean {
    return this.value.length === 0;
  }
}

export class FilterName extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<FilterName, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Filter name cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();
    if (trimmed.length > 50) {
      return err(
        new ValidationError('Filter name cannot exceed 50 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new FilterName(trimmed));
  }

  static fromString(value: string): Result<FilterName, ValidationError> {
    return FilterName.create(value);
  }
}

export class ActionLabel extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<ActionLabel, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Action label cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();
    if (trimmed.length > 50) {
      return err(
        new ValidationError('Action label cannot exceed 50 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new ActionLabel(trimmed));
  }

  static fromString(value: string): Result<ActionLabel, ValidationError> {
    return ActionLabel.create(value);
  }
}

export class NotificationMessage extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<NotificationMessage, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(
        new ValidationError('Notification message cannot be empty', { field: 'value', value }),
      );
    }

    const trimmed = value.trim();
    if (trimmed.length > 500) {
      return err(
        new ValidationError('Notification message cannot exceed 500 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new NotificationMessage(trimmed));
  }

  static fromString(value: string): Result<NotificationMessage, ValidationError> {
    return NotificationMessage.create(value);
  }

  isLong(): boolean {
    return this.value.length > 100;
  }
}

export class FontFamily extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<FontFamily, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Font family cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();
    if (trimmed.length > 100) {
      return err(
        new ValidationError('Font family cannot exceed 100 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new FontFamily(trimmed));
  }

  static fromString(value: string): Result<FontFamily, ValidationError> {
    return FontFamily.create(value);
  }

  static defaultSansSerif(): FontFamily {
    return new FontFamily('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
  }

  static defaultMonospace(): FontFamily {
    return new FontFamily('"SF Mono", Monaco, "Roboto Mono", Consolas, monospace');
  }

  isMonospace(): boolean {
    const monospaceFonts = ['mono', 'console', 'courier', 'menlo', 'monaco'];
    const lower = this.value.toLowerCase();
    return monospaceFonts.some((font) => lower.includes(font));
  }
}

export class FontSize extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<FontSize, ValidationError> {
    if (!isInteger(value) || value < 8) {
      return err(
        new ValidationError('Font size must be an integer of at least 8', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 72) {
      return err(
        new ValidationError('Font size cannot exceed 72', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new FontSize(value));
  }

  static fromNumber(value: number): Result<FontSize, ValidationError> {
    return FontSize.create(value);
  }

  static default(): FontSize {
    return new FontSize(14);
  }

  static small(): FontSize {
    return new FontSize(12);
  }

  static large(): FontSize {
    return new FontSize(18);
  }

  increase(): Result<FontSize, ValidationError> {
    return FontSize.create(this.value + 1);
  }

  decrease(): Result<FontSize, ValidationError> {
    return FontSize.create(this.value - 1);
  }

  isSmall(): boolean {
    return this.value <= 10;
  }

  isLarge(): boolean {
    return this.value >= 20;
  }
}

export class ViewType extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<ViewType, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('View type cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();

    // View types should be camelCase identifiers
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmed)) {
      return err(
        new ValidationError('View type must be a valid camelCase identifier', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    if (trimmed.length > 50) {
      return err(
        new ValidationError('View type cannot exceed 50 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new ViewType(trimmed));
  }

  static fromString(value: string): Result<ViewType, ValidationError> {
    return ViewType.create(value);
  }

  static proofTreeVisualization(): ViewType {
    return new ViewType('proofTreeVisualization');
  }

  static documentEditor(): ViewType {
    return new ViewType('documentEditor');
  }
}

export class ZoomLevel extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<ZoomLevel, ValidationError> {
    if (!isFiniteNumber(value)) {
      return err(
        new ValidationError('Zoom level must be a finite number', {
          field: 'value',
          value,
        }),
      );
    }

    if (value < 0.1 || value > 5.0) {
      return err(
        new ValidationError('Zoom level must be between 0.1 and 5.0', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new ZoomLevel(value));
  }

  static fromNumber(value: number): Result<ZoomLevel, ValidationError> {
    return ZoomLevel.create(value);
  }

  static normal(): ZoomLevel {
    return new ZoomLevel(1.0);
  }

  static minimum(): ZoomLevel {
    return new ZoomLevel(0.1);
  }

  static maximum(): ZoomLevel {
    return new ZoomLevel(5.0);
  }

  zoomIn(factor: number = 1.2): Result<ZoomLevel, ValidationError> {
    return ZoomLevel.create(this.value * factor);
  }

  zoomOut(factor: number = 1.2): Result<ZoomLevel, ValidationError> {
    return ZoomLevel.create(this.value / factor);
  }

  isNormal(): boolean {
    return Math.abs(this.value - 1.0) < 0.01;
  }

  asPercentage(): number {
    return Math.round(this.value * 100);
  }
}

export class ErrorCode extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<ErrorCode, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Error code cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim().toUpperCase();

    // Error codes should be alphanumeric with underscores
    if (!/^[A-Z0-9_]+$/.test(trimmed)) {
      return err(
        new ValidationError(
          'Error code must contain only uppercase letters, numbers, and underscores',
          {
            field: 'value',
            value,
          },
        ),
      );
    }

    if (trimmed.length > 50) {
      return err(
        new ValidationError('Error code cannot exceed 50 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new ErrorCode(trimmed));
  }

  static fromString(value: string): Result<ErrorCode, ValidationError> {
    return ErrorCode.create(value);
  }

  isClientError(): boolean {
    return this.value.startsWith('CLIENT_') || this.value.startsWith('INVALID_');
  }

  isServerError(): boolean {
    return this.value.startsWith('SERVER_') || this.value.startsWith('INTERNAL_');
  }
}

export class ErrorMessage extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<ErrorMessage, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Error message cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();
    if (trimmed.length > 1000) {
      return err(
        new ValidationError('Error message cannot exceed 1000 characters', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new ErrorMessage(trimmed));
  }

  static fromString(value: string): Result<ErrorMessage, ValidationError> {
    return ErrorMessage.create(value);
  }

  isUserFriendly(): boolean {
    // Basic heuristic for user-friendly messages
    return !this.value.includes('Error:') && !this.value.includes('Exception:');
  }
}

export class MessageLength extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<MessageLength, ValidationError> {
    if (!isInteger(value) || value < 1) {
      return err(
        new ValidationError('Message length must be a positive integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 100000) {
      return err(
        new ValidationError('Message length cannot exceed 100,000 characters', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new MessageLength(value));
  }

  static fromNumber(value: number): Result<MessageLength, ValidationError> {
    return MessageLength.create(value);
  }

  static default(): MessageLength {
    return new MessageLength(1000);
  }

  static unlimited(): MessageLength {
    return new MessageLength(100000);
  }

  canAccommodate(messageSize: number): boolean {
    return messageSize <= this.value;
  }

  isUnlimited(): boolean {
    return this.value >= 100000;
  }
}

export class LayoutStyle extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<LayoutStyle, ValidationError> {
    const validStyles = ['bottom-up', 'top-down', 'left-right', 'right-left'];

    if (!validStyles.includes(value)) {
      return err(
        new ValidationError(`Layout style must be one of: ${validStyles.join(', ')}`, {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new LayoutStyle(value));
  }

  static fromString(value: string): Result<LayoutStyle, ValidationError> {
    return LayoutStyle.create(value);
  }

  static bottomUp(): LayoutStyle {
    return new LayoutStyle('bottom-up');
  }

  static topDown(): LayoutStyle {
    return new LayoutStyle('top-down');
  }

  static leftRight(): LayoutStyle {
    return new LayoutStyle('left-right');
  }

  static rightLeft(): LayoutStyle {
    return new LayoutStyle('right-left');
  }

  isVertical(): boolean {
    return this.value === 'bottom-up' || this.value === 'top-down';
  }

  isHorizontal(): boolean {
    return this.value === 'left-right' || this.value === 'right-left';
  }

  isReversed(): boolean {
    return this.value === 'top-down' || this.value === 'right-left';
  }
}

export class ExpansionDirection extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<ExpansionDirection, ValidationError> {
    const validDirections = ['horizontal', 'vertical', 'radial'];

    if (!validDirections.includes(value)) {
      return err(
        new ValidationError(`Expansion direction must be one of: ${validDirections.join(', ')}`, {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new ExpansionDirection(value));
  }

  static fromString(value: string): Result<ExpansionDirection, ValidationError> {
    return ExpansionDirection.create(value);
  }

  static horizontal(): ExpansionDirection {
    return new ExpansionDirection('horizontal');
  }

  static vertical(): ExpansionDirection {
    return new ExpansionDirection('vertical');
  }

  static radial(): ExpansionDirection {
    return new ExpansionDirection('radial');
  }

  isLinear(): boolean {
    return this.value === 'horizontal' || this.value === 'vertical';
  }

  isRadial(): boolean {
    return this.value === 'radial';
  }
}

export class AlignmentMode extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<AlignmentMode, ValidationError> {
    const validModes = ['left', 'center', 'right', 'justify'];

    if (!validModes.includes(value)) {
      return err(
        new ValidationError(`Alignment mode must be one of: ${validModes.join(', ')}`, {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new AlignmentMode(value));
  }

  static fromString(value: string): Result<AlignmentMode, ValidationError> {
    return AlignmentMode.create(value);
  }

  static left(): AlignmentMode {
    return new AlignmentMode('left');
  }

  static center(): AlignmentMode {
    return new AlignmentMode('center');
  }

  static right(): AlignmentMode {
    return new AlignmentMode('right');
  }

  static justify(): AlignmentMode {
    return new AlignmentMode('justify');
  }

  isDefaultAlignment(): boolean {
    return this.value === 'left';
  }

  needsJustification(): boolean {
    return this.value === 'justify';
  }
}

export class BranchType extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<BranchType, ValidationError> {
    const validTypes = ['from_conclusion', 'independent', 'from_selected_text'];

    if (!validTypes.includes(value)) {
      return err(
        new ValidationError(`Branch type must be one of: ${validTypes.join(', ')}`, {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new BranchType(value));
  }

  static fromString(value: string): Result<BranchType, ValidationError> {
    return BranchType.create(value);
  }

  static fromConclusion(): BranchType {
    return new BranchType('from_conclusion');
  }

  static independent(): BranchType {
    return new BranchType('independent');
  }

  static fromSelectedText(): BranchType {
    return new BranchType('from_selected_text');
  }

  isFromConclusion(): boolean {
    return this.value === 'from_conclusion';
  }

  isIndependent(): boolean {
    return this.value === 'independent';
  }

  isFromSelectedText(): boolean {
    return this.value === 'from_selected_text';
  }

  needsParentConnection(): boolean {
    return this.value === 'from_conclusion';
  }
}
