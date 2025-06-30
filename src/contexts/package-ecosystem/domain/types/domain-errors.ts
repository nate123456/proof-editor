export abstract class DomainError extends Error {
  abstract readonly code: string;
  
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PackageValidationError extends DomainError {
  readonly code = 'PACKAGE_VALIDATION_ERROR';
}

export class PackageNotFoundError extends DomainError {
  readonly code = 'PACKAGE_NOT_FOUND';
}

export class PackageInstallationError extends DomainError {
  readonly code = 'PACKAGE_INSTALLATION_ERROR';
}

export class DependencyResolutionError extends DomainError {
  readonly code = 'DEPENDENCY_RESOLUTION_ERROR';
}

export class PackageConflictError extends DomainError {
  readonly code = 'PACKAGE_CONFLICT_ERROR';
}

export class InvalidPackageVersionError extends DomainError {
  readonly code = 'INVALID_PACKAGE_VERSION';
}

export class PackageSourceUnavailableError extends DomainError {
  readonly code = 'PACKAGE_SOURCE_UNAVAILABLE';
}

export class SDKComplianceError extends DomainError {
  readonly code = 'SDK_COMPLIANCE_ERROR';
}