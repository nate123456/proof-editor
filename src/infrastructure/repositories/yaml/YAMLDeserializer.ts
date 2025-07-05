import * as yaml from 'js-yaml';
import { err, type Result } from 'neverthrow';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { ValidationError } from '../../../domain/shared/result.js';

// Type guard for the expected YAML structure
interface YAMLDocumentData {
  metadata: {
    schemaVersion: string;
    id: string;
    createdAt: string | Date;
    modifiedAt: string | Date;
  };
  version: number;
  statements: Record<string, string>;
  orderedSets: Record<string, string[]>;
  atomicArguments: Record<
    string,
    {
      premises: string | null;
      conclusions: string | null;
      sideLabel?: string;
    }
  >;
  trees: Record<
    string,
    {
      offset: { x: number; y: number };
      nodes: Record<string, unknown>;
    }
  >;
}

function isValidYAMLDocument(data: unknown): data is YAMLDocumentData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check metadata
  if (typeof obj.metadata !== 'object' || obj.metadata === null) {
    return false;
  }

  const metadata = obj.metadata as Record<string, unknown>;
  if (
    typeof metadata.schemaVersion !== 'string' ||
    typeof metadata.id !== 'string' ||
    (typeof metadata.createdAt !== 'string' && !(metadata.createdAt instanceof Date)) ||
    (typeof metadata.modifiedAt !== 'string' && !(metadata.modifiedAt instanceof Date))
  ) {
    return false;
  }

  // Check version
  if (typeof obj.version !== 'number') {
    return false;
  }

  // Check statements
  if (typeof obj.statements !== 'object' || obj.statements === null) {
    return false;
  }

  // Check orderedSets
  if (typeof obj.orderedSets !== 'object' || obj.orderedSets === null) {
    return false;
  }

  // Check atomicArguments
  if (typeof obj.atomicArguments !== 'object' || obj.atomicArguments === null) {
    return false;
  }

  // Check trees
  if (typeof obj.trees !== 'object' || obj.trees === null) {
    return false;
  }

  return true;
}

export class YAMLDeserializer {
  async deserialize(yamlContent: string): Promise<Result<ProofDocument, ValidationError>> {
    try {
      const rawData = yaml.load(yamlContent);

      if (!isValidYAMLDocument(rawData)) {
        // Check if it's a schema version issue by looking at the raw data
        if (typeof rawData === 'object' && rawData !== null) {
          const obj = rawData as Record<string, unknown>;
          if (obj.metadata && typeof obj.metadata === 'object' && obj.metadata !== null) {
            const metadata = obj.metadata as Record<string, unknown>;
            if (
              typeof metadata.schemaVersion === 'string' ||
              metadata.schemaVersion === undefined
            ) {
              return err(
                new ValidationError(`Unsupported schema version: ${metadata.schemaVersion}`),
              );
            }
          } else if (obj.metadata === undefined) {
            return err(new ValidationError('Unsupported schema version: undefined'));
          }
        }
        return err(new ValidationError('Invalid YAML document structure'));
      }

      const data = rawData as YAMLDocumentData;

      // Validate schema version
      if (data.metadata.schemaVersion !== '1.0.0') {
        return err(
          new ValidationError(`Unsupported schema version: ${data.metadata.schemaVersion}`),
        );
      }

      // Use ProofDocument.reconstruct factory method
      const documentResult = ProofDocument.reconstruct({
        id: data.metadata.id,
        version: data.version,
        createdAt:
          data.metadata.createdAt instanceof Date
            ? data.metadata.createdAt
            : new Date(data.metadata.createdAt),
        modifiedAt:
          data.metadata.modifiedAt instanceof Date
            ? data.metadata.modifiedAt
            : new Date(data.metadata.modifiedAt),
        statements: data.statements,
        orderedSets: data.orderedSets,
        atomicArguments: data.atomicArguments,
        trees: data.trees,
      });

      return documentResult;
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to deserialize YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
