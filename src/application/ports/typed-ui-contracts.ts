import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import { Dimensions, FilePath } from '../../domain/shared/value-objects/index.js';

// Strongly-typed webview message contracts
export abstract class WebviewMessage {
  protected constructor(public readonly type: string) {}

  abstract validate(): Result<void, ValidationError>;
}

export class UpdateTreeMessage extends WebviewMessage {
  private constructor(public readonly treeData: string) {
    super('updateTree');
  }

  static create(treeData: string): Result<UpdateTreeMessage, ValidationError> {
    if (!treeData || treeData.trim().length === 0) {
      return err(
        new ValidationError('Tree data cannot be empty', {
          field: 'treeData',
          value: treeData,
        }),
      );
    }

    if (treeData.length > 1000000) {
      return err(
        new ValidationError('Tree data exceeds maximum size (1MB)', {
          field: 'treeData',
          value: treeData.length,
        }),
      );
    }

    return ok(new UpdateTreeMessage(treeData.trim()));
  }

  validate(): Result<void, ValidationError> {
    return ok(undefined);
  }

  getTreeData(): string {
    return this.treeData;
  }
}

export class ShowErrorMessage extends WebviewMessage {
  private constructor(public readonly errorText: string) {
    super('showError');
  }

  static create(errorText: string): Result<ShowErrorMessage, ValidationError> {
    if (!errorText || errorText.trim().length === 0) {
      return err(
        new ValidationError('Error text cannot be empty', {
          field: 'errorText',
          value: errorText,
        }),
      );
    }

    if (errorText.length > 10000) {
      return err(
        new ValidationError('Error text exceeds maximum length (10,000 characters)', {
          field: 'errorText',
          value: errorText.length,
        }),
      );
    }

    return ok(new ShowErrorMessage(errorText.trim()));
  }

  validate(): Result<void, ValidationError> {
    return ok(undefined);
  }

  getErrorText(): string {
    return this.errorText;
  }
}

export class ShowProgressMessage extends WebviewMessage {
  private constructor(
    public readonly progressValue: number,
    public readonly statusText?: string,
  ) {
    super('showProgress');
  }

  static create(
    progressValue: number,
    statusText?: string,
  ): Result<ShowProgressMessage, ValidationError> {
    if (progressValue < 0 || progressValue > 100) {
      return err(
        new ValidationError('Progress value must be between 0 and 100', {
          field: 'progressValue',
          value: progressValue,
        }),
      );
    }

    if (statusText && statusText.length > 500) {
      return err(
        new ValidationError('Status text exceeds maximum length (500 characters)', {
          field: 'statusText',
          value: statusText.length,
        }),
      );
    }

    return ok(new ShowProgressMessage(progressValue, statusText?.trim()));
  }

  validate(): Result<void, ValidationError> {
    return ok(undefined);
  }

  getProgressValue(): number {
    return this.progressValue;
  }

  getStatusText(): string | undefined {
    return this.statusText;
  }
}

// Font size value object
export class FontSize {
  private constructor(private readonly size: number) {}

  static create(size: number): Result<FontSize, ValidationError> {
    if (!Number.isFinite(size) || size <= 0) {
      return err(
        new ValidationError('Font size must be a positive number', {
          field: 'size',
          value: size,
        }),
      );
    }

    if (size < 6 || size > 72) {
      return err(
        new ValidationError('Font size must be between 6 and 72 points', {
          field: 'size',
          value: size,
        }),
      );
    }

    return ok(new FontSize(size));
  }

  static small(): FontSize {
    return new FontSize(10);
  }

  static medium(): FontSize {
    return new FontSize(12);
  }

  static large(): FontSize {
    return new FontSize(16);
  }

  getValue(): number {
    return this.size;
  }

  toString(): string {
    return `${this.size}pt`;
  }

  equals(other: FontSize): boolean {
    return this.size === other.size;
  }
}

// Color value object
export class UIColor {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<UIColor, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(
        new ValidationError('Color value cannot be empty', {
          field: 'value',
          value,
        }),
      );
    }

    const trimmed = value.trim();

    // Basic color validation (hex, rgb, named colors)
    const isValidColor =
      /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed) ||
      /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(trimmed) ||
      /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01]?\.?\d*\s*\)$/i.test(trimmed) ||
      /^[a-z]+$/i.test(trimmed);

    if (!isValidColor) {
      return err(
        new ValidationError('Invalid color format', {
          field: 'value',
          value: trimmed,
        }),
      );
    }

    return ok(new UIColor(trimmed));
  }

  static fromHex(hex: string): Result<UIColor, ValidationError> {
    if (!hex.startsWith('#')) {
      return UIColor.create(`#${hex}`);
    }
    return UIColor.create(hex);
  }

  static fromRGB(r: number, g: number, b: number): Result<UIColor, ValidationError> {
    if (
      !Number.isInteger(r) ||
      !Number.isInteger(g) ||
      !Number.isInteger(b) ||
      r < 0 ||
      r > 255 ||
      g < 0 ||
      g > 255 ||
      b < 0 ||
      b > 255
    ) {
      return err(
        new ValidationError('RGB values must be integers between 0 and 255', {
          field: 'rgb',
          value: `${r},${g},${b}`,
        }),
      );
    }

    return ok(new UIColor(`rgb(${r}, ${g}, ${b})`));
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: UIColor): boolean {
    return this.value === other.value;
  }
}

// Strongly-typed theme
export class TypedUITheme {
  private constructor(
    private readonly kind: 'light' | 'dark' | 'high-contrast',
    private readonly colors: Map<string, UIColor>,
    private readonly defaultFont: string,
    private readonly monospaceFont: string,
    private readonly fontSize: FontSize,
  ) {}

  static create(theme: {
    kind: 'light' | 'dark' | 'high-contrast';
    colors: Record<string, string>;
    fonts: {
      default: string;
      monospace: string;
      size: number;
    };
  }): Result<TypedUITheme, ValidationError> {
    const colorMap = new Map<string, UIColor>();

    for (const [key, colorValue] of Object.entries(theme.colors)) {
      const colorResult = UIColor.create(colorValue);
      if (colorResult.isErr()) {
        return err(
          new ValidationError(`Invalid color for key "${key}": ${colorResult.error.message}`, {
            field: `colors.${key}`,
            value: colorValue,
          }),
        );
      }
      colorMap.set(key, colorResult.value);
    }

    if (!theme.fonts.default || theme.fonts.default.trim().length === 0) {
      return err(
        new ValidationError('Default font cannot be empty', {
          field: 'fonts.default',
          value: theme.fonts.default,
        }),
      );
    }

    if (!theme.fonts.monospace || theme.fonts.monospace.trim().length === 0) {
      return err(
        new ValidationError('Monospace font cannot be empty', {
          field: 'fonts.monospace',
          value: theme.fonts.monospace,
        }),
      );
    }

    const fontSizeResult = FontSize.create(theme.fonts.size);
    if (fontSizeResult.isErr()) {
      return err(fontSizeResult.error);
    }

    return ok(
      new TypedUITheme(
        theme.kind,
        colorMap,
        theme.fonts.default.trim(),
        theme.fonts.monospace.trim(),
        fontSizeResult.value,
      ),
    );
  }

  getKind(): 'light' | 'dark' | 'high-contrast' {
    return this.kind;
  }

  getColor(key: string): UIColor | undefined {
    return this.colors.get(key);
  }

  getAllColors(): ReadonlyMap<string, UIColor> {
    return this.colors;
  }

  getDefaultFont(): string {
    return this.defaultFont;
  }

  getMonospaceFont(): string {
    return this.monospaceFont;
  }

  getFontSize(): FontSize {
    return this.fontSize;
  }

  isDark(): boolean {
    return this.kind === 'dark' || this.kind === 'high-contrast';
  }

  isLight(): boolean {
    return this.kind === 'light';
  }

  isHighContrast(): boolean {
    return this.kind === 'high-contrast';
  }
}

// Strongly-typed capabilities
export class TypedUICapabilities {
  private constructor(
    private readonly supportsFileDialogs: boolean,
    private readonly supportsNotificationActions: boolean,
    private readonly supportsProgress: boolean,
    private readonly supportsStatusBar: boolean,
    private readonly supportsWebviews: boolean,
    private readonly supportsThemes: boolean,
    private readonly maxMessageLength: number,
    private readonly screenDimensions?: Dimensions,
  ) {}

  static create(capabilities: {
    supportsFileDialogs: boolean;
    supportsNotificationActions: boolean;
    supportsProgress: boolean;
    supportsStatusBar: boolean;
    supportsWebviews: boolean;
    supportsThemes: boolean;
    maxMessageLength?: number;
    screenDimensions?: { width: number; height: number };
  }): Result<TypedUICapabilities, ValidationError> {
    const maxLength = capabilities.maxMessageLength ?? 10000;

    if (maxLength <= 0) {
      return err(
        new ValidationError('Max message length must be positive', {
          field: 'maxMessageLength',
          value: maxLength,
        }),
      );
    }

    let screenDimensions: Dimensions | undefined;
    if (capabilities.screenDimensions) {
      const dimensionsResult = Dimensions.create(
        capabilities.screenDimensions.width,
        capabilities.screenDimensions.height,
      );
      if (dimensionsResult.isErr()) {
        return err(dimensionsResult.error);
      }
      screenDimensions = dimensionsResult.value;
    }

    return ok(
      new TypedUICapabilities(
        capabilities.supportsFileDialogs,
        capabilities.supportsNotificationActions,
        capabilities.supportsProgress,
        capabilities.supportsStatusBar,
        capabilities.supportsWebviews,
        capabilities.supportsThemes,
        maxLength,
        screenDimensions,
      ),
    );
  }

  getSupportsFileDialogs(): boolean {
    return this.supportsFileDialogs;
  }

  getSupportsNotificationActions(): boolean {
    return this.supportsNotificationActions;
  }

  getSupportsProgress(): boolean {
    return this.supportsProgress;
  }

  getSupportsStatusBar(): boolean {
    return this.supportsStatusBar;
  }

  getSupportsWebviews(): boolean {
    return this.supportsWebviews;
  }

  getSupportsThemes(): boolean {
    return this.supportsThemes;
  }

  getMaxMessageLength(): number {
    return this.maxMessageLength;
  }

  getScreenDimensions(): Dimensions | undefined {
    return this.screenDimensions;
  }

  canTruncateMessage(message: string): boolean {
    return message.length > this.maxMessageLength;
  }

  truncateMessage(message: string): string {
    if (message.length <= this.maxMessageLength) {
      return message;
    }
    return `${message.substring(0, this.maxMessageLength - 3)}...`;
  }
}

// Strongly-typed file operations
export function createWriteFileOperation(
  filePath: string,
  content: string | Buffer,
): Result<{ filePath: FilePath; content: string | Buffer }, ValidationError> {
  const pathResult = FilePath.create(filePath);
  if (pathResult.isErr()) {
    return err(pathResult.error);
  }

  if (typeof content === 'string' && content.length > 100000000) {
    // 100MB limit
    return err(
      new ValidationError('Content exceeds maximum size (100MB)', {
        field: 'content',
        value: content.length,
      }),
    );
  }

  return ok({
    filePath: pathResult.value,
    content,
  });
}
