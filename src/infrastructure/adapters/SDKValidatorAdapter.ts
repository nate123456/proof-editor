import { err, ok, type Result } from 'neverthrow';
import type { ISDKValidator } from '../../contexts/package-ecosystem/domain/services/PackageValidationService.js';
import type { SDKInterface } from '../../contexts/package-ecosystem/domain/types/common-types.js';
import { PackageValidationError } from '../../contexts/package-ecosystem/domain/types/domain-errors.js';

export class SDKValidatorAdapter implements ISDKValidator {
  async validateInterface(
    _packagePath: string,
    interfaceName: string,
  ): Promise<Result<SDKInterface, PackageValidationError>> {
    // TODO: Implement actual SDK interface validation
    // For now, return a basic implementation
    return ok({
      name: interfaceName,
      version: '1.0.0',
      methods: [],
      properties: [],
      events: [],
    } as SDKInterface);
  }

  async listImplementedInterfaces(
    _packagePath: string,
  ): Promise<Result<readonly SDKInterface[], PackageValidationError>> {
    // TODO: Implement actual interface listing
    // For now, return empty array
    return ok([]);
  }

  checkVersionCompatibility(
    requiredVersion: string,
    actualVersion: string,
  ): Result<boolean, PackageValidationError> {
    try {
      const parseVersion = (version: string): number[] => {
        const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
        if (!match) throw new Error('Invalid version format');
        return [
          Number.parseInt(match[1] ?? '0', 10),
          Number.parseInt(match[2] ?? '0', 10),
          Number.parseInt(match[3] ?? '0', 10),
        ];
      };

      const required = parseVersion(requiredVersion);
      const actual = parseVersion(actualVersion);

      // Check major version compatibility
      const actualMajor = actual[0] ?? 0;
      const requiredMajor = required[0] ?? 0;
      const actualMinor = actual[1] ?? 0;
      const requiredMinor = required[1] ?? 0;

      if (actualMajor < requiredMajor) {
        return err(
          new PackageValidationError(
            `Major version mismatch: required ${requiredVersion}, got ${actualVersion}`,
          ),
        );
      }

      // If major versions match, check minor version
      if (actualMajor === requiredMajor && actualMinor < requiredMinor) {
        return err(
          new PackageValidationError(
            `Minor version mismatch: required ${requiredVersion}, got ${actualVersion}`,
          ),
        );
      }

      return ok(true);
    } catch (error) {
      return err(
        new PackageValidationError(
          `Failed to compare versions: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
