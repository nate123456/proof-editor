import { DomainError as BaseDomainError } from '../../../../domain/errors/DomainErrors.js';

export abstract class PackageError extends BaseDomainError {
  override readonly name: string = 'PackageError';
  abstract getCode(): string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    super(message, cause);
    if (context !== undefined) {
      this.context = context;
    }
  }
}

export class PackageValidationError extends PackageError {
  override readonly name: string = 'PackageValidationError';
  readonly code: string = 'PACKAGE_VALIDATION_ERROR';

  getCode(): string {
    return this.code;
  }
}

export class PackageNotFoundError extends PackageError {
  override readonly name: string = 'PackageNotFoundError';
  readonly code = 'PACKAGE_NOT_FOUND';

  getCode(): string {
    return this.code;
  }
}

export class PackageInstallationError extends PackageError {
  override readonly name: string = 'PackageInstallationError';
  readonly code = 'PACKAGE_INSTALLATION_ERROR';

  getCode(): string {
    return this.code;
  }
}

export class DependencyResolutionError extends PackageError {
  override readonly name: string = 'DependencyResolutionError';
  readonly code = 'DEPENDENCY_RESOLUTION_ERROR';

  getCode(): string {
    return this.code;
  }
}

export class PackageConflictError extends PackageError {
  override readonly name: string = 'PackageConflictError';
  readonly code = 'PACKAGE_CONFLICT_ERROR';

  getCode(): string {
    return this.code;
  }
}

export class InvalidPackageVersionError extends PackageValidationError {
  override readonly name: string = 'InvalidPackageVersionError';
  override readonly code = 'INVALID_PACKAGE_VERSION' as const;

  override getCode(): string {
    return this.code;
  }
}

export class PackageSourceUnavailableError extends PackageError {
  override readonly name: string = 'PackageSourceUnavailableError';
  readonly code = 'PACKAGE_SOURCE_UNAVAILABLE';

  getCode(): string {
    return this.code;
  }
}

export class SDKComplianceError extends PackageValidationError {
  override readonly name: string = 'SDKComplianceError';
  override readonly code = 'SDK_COMPLIANCE_ERROR' as const;

  override getCode(): string {
    return this.code;
  }
}
