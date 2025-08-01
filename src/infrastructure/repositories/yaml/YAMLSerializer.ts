import * as yaml from 'js-yaml';
import { err, ok, type Result } from 'neverthrow';
import type { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { ValidationError } from '../../../domain/shared/result.js';

interface YAMLProofDocument {
  version: number;
  metadata: {
    id: string;
    createdAt: string;
    modifiedAt: string;
    schemaVersion: string;
  };
  statements: Record<string, string>; // id -> content
  atomicArguments: Record<string, YAMLAtomicArgument>;
  trees: Record<string, YAMLTree>;
}

interface YAMLAtomicArgument {
  premises: string[]; // Statement IDs
  conclusions: string[]; // Statement IDs
  sideLabels?: {
    left?: string;
    right?: string;
  };
}

interface YAMLTree {
  offset: { x: number; y: number };
  nodes: Record<string, YAMLNode>;
}

type YAMLNode =
  | { arg: string } // Root node
  | { [parentId: string]: string; on: string }; // Child node

export class YAMLSerializer {
  private readonly SCHEMA_VERSION = '1.0.0';

  async serialize(document: ProofDocument): Promise<Result<string, ValidationError>> {
    try {
      const yamlDoc: YAMLProofDocument = {
        version: document.getVersion(),
        metadata: {
          id: document.getId().getValue(),
          createdAt: document.getCreatedAt().toISOString(),
          modifiedAt: document.getModifiedAt().toISOString(),
          schemaVersion: this.SCHEMA_VERSION,
        },
        statements: this.serializeStatements(document),
        atomicArguments: this.serializeAtomicArguments(document),
        trees: this.serializeTrees(document),
      };

      // Handle empty documents properly for bootstrap-first design
      // Empty collections should serialize as empty objects, not undefined
      if (Object.keys(yamlDoc.statements).length === 0) {
        yamlDoc.statements = {};
      }
      if (Object.keys(yamlDoc.atomicArguments).length === 0) {
        yamlDoc.atomicArguments = {};
      }
      if (Object.keys(yamlDoc.trees).length === 0) {
        yamlDoc.trees = {};
      }

      const yamlString = yaml.dump(yamlDoc, {
        indent: 2,
        lineWidth: 120,
        noRefs: true, // Disable references for clarity
        sortKeys: false, // Preserve order
      });

      return ok(yamlString);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to serialize document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private serializeStatements(document: ProofDocument): Record<string, string> {
    const statements: Record<string, string> = {};

    for (const statement of document.getAllStatements()) {
      statements[statement.getId().getValue()] = statement.getContent();
    }

    return statements;
  }

  private serializeAtomicArguments(document: ProofDocument): Record<string, YAMLAtomicArgument> {
    const args: Record<string, YAMLAtomicArgument> = {};

    for (const argument of document.getAllAtomicArguments()) {
      const yamlArg: YAMLAtomicArgument = {
        premises: argument.getPremises().map((stmt) => stmt.getId().getValue()),
        conclusions: argument.getConclusions().map((stmt) => stmt.getId().getValue()),
      };

      // Add side labels if present
      const sideLabels = argument.getSideLabels();
      if (sideLabels?.left || sideLabels?.right) {
        yamlArg.sideLabels = {};
        if (sideLabels.left) yamlArg.sideLabels.left = sideLabels.left;
        if (sideLabels.right) yamlArg.sideLabels.right = sideLabels.right;
      }

      args[argument.getId().getValue()] = yamlArg;
    }

    return args;
  }

  private serializeTrees(_document: ProofDocument): Record<string, YAMLTree> {
    const trees: Record<string, YAMLTree> = {};

    // Note: Trees are stored in ProofTreeAggregate, not ProofDocument
    // This would need to be passed in or accessed via a tree repository
    // For now, returning empty - actual implementation would coordinate with ProofTreeAggregateRepository

    return trees;
  }
}
