import * as yaml from 'js-yaml';
import { err, ok, type Result } from 'neverthrow';
import {
  type AtomicArgumentReconstructData,
  ProofDocument,
  type ProofDocumentReconstructData,
  type ProofTreeReconstructData,
} from '../../../domain/aggregates/ProofDocument.js';
import { ValidationError } from '../../../domain/shared/result.js';
import {
  AtomicArgumentId,
  NodeId,
  Position2D,
  ProofDocumentId,
  ProofTreeId,
  SideLabel,
  StatementContent,
  StatementId,
  Version,
} from '../../../domain/shared/value-objects/index.js';

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
      sideLabel?: string; // Legacy format
      sideLabels?: {
        left?: string;
        right?: string;
      }; // New format
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

  // Check metadata exists
  if (typeof obj.metadata !== 'object' || obj.metadata === null) {
    return false;
  }

  const metadata = obj.metadata as Record<string, unknown>;

  // Check ALL required metadata fields (including schema version)
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
  private convertToValueObjects(
    data: YAMLDocumentData,
  ): Result<ProofDocumentReconstructData, ValidationError> {
    // Convert document ID
    const idResult = ProofDocumentId.create(data.metadata.id);
    if (idResult.isErr()) {
      return err(idResult.error);
    }

    // Convert version
    const versionResult = Version.create(data.version);
    if (versionResult.isErr()) {
      return err(versionResult.error);
    }

    // Convert dates
    const createdAt =
      data.metadata.createdAt instanceof Date
        ? data.metadata.createdAt
        : new Date(data.metadata.createdAt);
    const modifiedAt =
      data.metadata.modifiedAt instanceof Date
        ? data.metadata.modifiedAt
        : new Date(data.metadata.modifiedAt);

    // Convert statements
    const statements = new Map<StatementId, StatementContent>();
    for (const [id, content] of Object.entries(data.statements)) {
      const statementIdResult = StatementId.create(id);
      if (statementIdResult.isErr()) {
        return err(statementIdResult.error);
      }

      const contentResult = StatementContent.create(content);
      if (contentResult.isErr()) {
        return err(contentResult.error);
      }

      statements.set(statementIdResult.value, contentResult.value);
    }

    // Convert atomic arguments
    const atomicArguments = new Map<AtomicArgumentId, AtomicArgumentReconstructData>();
    for (const [id, argData] of Object.entries(data.atomicArguments)) {
      const argumentIdResult = AtomicArgumentId.create(id);
      if (argumentIdResult.isErr()) {
        return err(argumentIdResult.error);
      }

      // Handle the old format with orderedSets
      const premiseIds: StatementId[] = [];
      const conclusionIds: StatementId[] = [];

      // The old format has premises/conclusions as ordered set IDs
      // We need to look up the statements in those ordered sets
      if (argData.premises && data.orderedSets[argData.premises]) {
        const orderedSet = data.orderedSets[argData.premises];
        if (orderedSet) {
          for (const stmtId of orderedSet) {
            const stmtIdResult = StatementId.create(stmtId);
            if (stmtIdResult.isErr()) {
              return err(stmtIdResult.error);
            }
            premiseIds.push(stmtIdResult.value);
          }
        }
      }

      if (argData.conclusions && data.orderedSets[argData.conclusions]) {
        const orderedSet = data.orderedSets[argData.conclusions];
        if (orderedSet) {
          for (const stmtId of orderedSet) {
            const stmtIdResult = StatementId.create(stmtId);
            if (stmtIdResult.isErr()) {
              return err(stmtIdResult.error);
            }
            conclusionIds.push(stmtIdResult.value);
          }
        }
      }

      // Convert side labels if present
      const sideLabels: { left?: SideLabel; right?: SideLabel } = {};

      // Handle new format with sideLabels object
      if (argData.sideLabels) {
        if (argData.sideLabels.left) {
          const leftResult = SideLabel.create(argData.sideLabels.left);
          if (leftResult.isErr()) {
            return err(leftResult.error);
          }
          sideLabels.left = leftResult.value;
        }
        if (argData.sideLabels.right) {
          const rightResult = SideLabel.create(argData.sideLabels.right);
          if (rightResult.isErr()) {
            return err(rightResult.error);
          }
          sideLabels.right = rightResult.value;
        }
      } else if (argData.sideLabel) {
        // Old format had a single sideLabel field
        const labelResult = SideLabel.create(argData.sideLabel);
        if (labelResult.isErr()) {
          return err(labelResult.error);
        }
        sideLabels.left = labelResult.value;
      }

      atomicArguments.set(argumentIdResult.value, {
        premiseIds,
        conclusionIds,
        sideLabels,
      });
    }

    // Convert trees
    const trees = new Map<ProofTreeId, ProofTreeReconstructData>();
    for (const [id, treeData] of Object.entries(data.trees)) {
      const treeIdResult = ProofTreeId.create(id);
      if (treeIdResult.isErr()) {
        return err(treeIdResult.error);
      }

      const offsetResult = Position2D.create(treeData.offset.x, treeData.offset.y);
      if (offsetResult.isErr()) {
        return err(offsetResult.error);
      }

      // Convert node IDs
      const nodes = new Map<NodeId, unknown>();
      for (const [nodeId, nodeData] of Object.entries(treeData.nodes)) {
        const nodeIdResult = NodeId.create(nodeId);
        if (nodeIdResult.isErr()) {
          return err(nodeIdResult.error);
        }
        nodes.set(nodeIdResult.value, nodeData);
      }

      trees.set(treeIdResult.value, {
        offset: offsetResult.value,
        nodes,
      });
    }

    return ok({
      id: idResult.value,
      version: versionResult.value,
      createdAt,
      modifiedAt,
      statements,
      atomicArguments,
      trees,
    });
  }

  async deserialize(yamlContent: string): Promise<Result<ProofDocument, ValidationError>> {
    try {
      const rawData = yaml.load(yamlContent);

      // Handle special case where metadata is missing entirely
      if (typeof rawData === 'object' && rawData !== null) {
        const obj = rawData as Record<string, unknown>;
        if (obj.metadata === undefined) {
          return err(new ValidationError('Unsupported schema version: undefined'));
        }
      }

      // Validate full document structure (includes schema version check)
      if (!isValidYAMLDocument(rawData)) {
        return err(new ValidationError('Invalid YAML document structure'));
      }

      const data = rawData as YAMLDocumentData;

      // Now check if schema version is supported
      if (data.metadata.schemaVersion !== '1.0.0') {
        return err(
          new ValidationError(`Unsupported schema version: ${data.metadata.schemaVersion}`),
        );
      }

      // Convert primitive types to value objects
      const conversionResult = this.convertToValueObjects(data);
      if (conversionResult.isErr()) {
        return err(conversionResult.error);
      }

      // Use ProofDocument.reconstruct with value objects
      return ProofDocument.reconstruct(conversionResult.value);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to deserialize YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
