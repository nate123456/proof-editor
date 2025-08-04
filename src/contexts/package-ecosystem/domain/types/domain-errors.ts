import { DomainError as BaseDomainError } from '../../../../domain/errors/DomainErrors.js';

export abstract class PackageError extends BaseDomainError {
  abstract getCode(): string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    super(message, cause);
    this.context = context;
  }
}

export class PackageValidationError extends PackageError {
  readonly code: string = 'PACKAGE_VALIDATION_ERROR';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  getCode(): string {
    return this.code;
  }
}

export class PackageNotFoundError extends PackageError {
  readonly code = 'PACKAGE_NOT_FOUND';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  getCode(): string {
    return this.code;
  }
}

export class PackageInstallationError extends PackageError {
  readonly code = 'PACKAGE_INSTALLATION_ERROR';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  getCode(): string {
    return this.code;
  }
}

export class DependencyResolutionError extends PackageError {
  readonly code = 'DEPENDENCY_RESOLUTION_ERROR';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  getCode(): string {
    return this.code;
  }
}

export class PackageConflictError extends PackageError {
  readonly code = 'PACKAGE_CONFLICT_ERROR';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  getCode(): string {
    return this.code;
  }
}

export class InvalidPackageVersionError extends PackageValidationError {
  override readonly code = 'INVALID_PACKAGE_VERSION' as const;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  override getCode(): string {
    return this.code;
  }
}

export class PackageSourceUnavailableError extends PackageError {
  readonly code = 'PACKAGE_SOURCE_UNAVAILABLE';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  getCode(): string {
    return this.code;
  }
}

export class SDKComplianceError extends PackageValidationError {
  override readonly code = 'SDK_COMPLIANCE_ERROR' as const;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  override getCode(): string {
    return this.code;
  }
}
