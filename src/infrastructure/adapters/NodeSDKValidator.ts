import { err, ok, type Result } from 'neverthrow';
// import type { ISDKValidator } from '../../contexts/package-ecosystem/domain/services/PackageValidationService.js';
import { PackageValidationError } from '../../contexts/package-ecosystem/domain/types/domain-errors.js';

// This class provides SDK validation utilities but doesn't fully implement ISDKValidator
// TODO: Either implement the full interface or create a different interface for version validation
export class NodeSDKValidator {
  validateNodeVersion(version: string): Result<boolean, PackageValidationError> {
    const nodeVersionRegex = /^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
    const match = version.match(nodeVersionRegex);

    if (!match) {
      return err(
        new PackageValidationError(`Invalid Node.js version format: ${version}`, {
          version,
        }),
      );
    }

    const [, major] = match;
    const majorNum = Number.parseInt(major || '0', 10);

    if (majorNum < 16) {
      return err(
        new PackageValidationError(
          `Node.js version ${version} is not supported. Minimum required: 16.0.0`,
          { version, minimumRequired: '16.0.0' },
        ),
      );
    }

    return ok(true);
  }

  validateNpmVersion(version: string): Result<boolean, PackageValidationError> {
    const npmVersionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
    const match = version.match(npmVersionRegex);

    if (!match) {
      return err(
        new PackageValidationError(`Invalid npm version format: ${version}`, {
          version,
        }),
      );
    }

    const [, major] = match;
    const majorNum = Number.parseInt(major || '0', 10);

    if (majorNum < 7) {
      return err(
        new PackageValidationError(
          `npm version ${version} is not supported. Minimum required: 7.0.0`,
          {
            version,
            minimumRequired: '7.0.0',
          },
        ),
      );
    }

    return ok(true);
  }

  validateTypeScriptVersion(version: string): Result<boolean, PackageValidationError> {
    const tsVersionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
    const match = version.match(tsVersionRegex);

    if (!match) {
      return err(
        new PackageValidationError(`Invalid TypeScript version format: ${version}`, {
          version,
        }),
      );
    }

    const [, major, minor] = match;
    const majorNum = Number.parseInt(major || '0', 10);
    const minorNum = Number.parseInt(minor || '0', 10);

    if (majorNum < 4 || (majorNum === 4 && minorNum < 5)) {
      return err(
        new PackageValidationError(
          `TypeScript version ${version} is not supported. Minimum required: 4.5.0`,
          { version, minimumRequired: '4.5.0' },
        ),
      );
    }

    return ok(true);
  }

  validateVSCodeVersion(version: string): Result<boolean, PackageValidationError> {
    const vscodeVersionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
    const match = version.match(vscodeVersionRegex);

    if (!match) {
      return err(
        new PackageValidationError(`Invalid VS Code version format: ${version}`, {
          version,
        }),
      );
    }

    const [, major, minor] = match;
    const majorNum = Number.parseInt(major || '0', 10);
    const minorNum = Number.parseInt(minor || '0', 10);

    if (majorNum < 1 || (majorNum === 1 && minorNum < 60)) {
      return err(
        new PackageValidationError(
          `VS Code version ${version} is not supported. Minimum required: 1.60.0`,
          { version, minimumRequired: '1.60.0' },
        ),
      );
    }

    return ok(true);
  }

  async isSDKInstalled(sdkName: string): Promise<boolean> {
    try {
      switch (sdkName.toLowerCase()) {
        case 'node':
        case 'nodejs':
          await this.executeCommand('node --version');
          return true;
        case 'npm':
          await this.executeCommand('npm --version');
          return true;
        case 'typescript':
        case 'tsc':
          await this.executeCommand('tsc --version');
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async executeCommand(command: string): Promise<string> {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(command);
    return stdout.trim();
  }
}
