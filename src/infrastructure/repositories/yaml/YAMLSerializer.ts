import * as yaml from 'js-yaml';
import { err, ok, type Result } from 'neverthrow';
import type { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import type { ProofDocumentQueryService } from '../../../domain/queries/ProofDocumentQueryService.js';
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
  orderedSets: Record<string, string[]>; // id -> statement IDs
  atomicArguments: Record<string, YAMLAtomicArgument>;
  trees: Record<string, YAMLTree>;
}

interface YAMLAtomicArgument {
  premises: string | null; // Ordered set ID or null
  conclusions: string | null; // Ordered set ID or null
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
      const queryService = document.createQueryService();

      // Serialize ordered sets first to get the mapping
      const { orderedSets, orderedSetMapping } = this.serializeOrderedSets(queryService);

      const yamlDoc: YAMLProofDocument = {
        version: queryService.getVersion(),
        metadata: {
          id: queryService.getId().getValue(),
          createdAt: queryService.getCreatedAt().toISOString(),
          modifiedAt: queryService.getModifiedAt().toISOString(),
          schemaVersion: this.SCHEMA_VERSION,
        },
        statements: this.serializeStatements(queryService),
        orderedSets,
        atomicArguments: this.serializeAtomicArguments(queryService, orderedSetMapping),
        trees: this.serializeTrees(queryService),
      };

      // Handle empty documents properly for bootstrap-first design
      // Empty collections should serialize as empty objects, not undefined
      if (Object.keys(yamlDoc.statements).length === 0) {
        yamlDoc.statements = {};
      }
      if (Object.keys(yamlDoc.orderedSets).length === 0) {
        yamlDoc.orderedSets = {};
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

  private serializeStatements(queryService: ProofDocumentQueryService): Record<string, string> {
    const statements: Record<string, string> = {};

    for (const statement of queryService.getAllStatements()) {
      statements[statement.getId().getValue()] = statement.getContent();
    }

    return statements;
  }

  private serializeOrderedSets(queryService: ProofDocumentQueryService): {
    orderedSets: Record<string, string[]>;
    orderedSetMapping: Map<string, string>;
  } {
    const orderedSets: Record<string, string[]> = {};
    const orderedSetMapping = new Map<string, string>();
    let orderedSetCounter = 1;

    // Get all ordered sets from atomic arguments
    for (const argument of queryService.getAllAtomicArguments()) {
      // Process premises
      const premiseIds = argument.getPremises().map((stmt) => stmt.getId().getValue());
      if (premiseIds.length > 0) {
        const orderedSetId = `os${orderedSetCounter++}`;
        orderedSets[orderedSetId] = premiseIds;
        orderedSetMapping.set(`${argument.getId().getValue()}-premises`, orderedSetId);
      }

      // Process conclusions
      const conclusionIds = argument.getConclusions().map((stmt) => stmt.getId().getValue());
      if (conclusionIds.length > 0) {
        const orderedSetId = `os${orderedSetCounter++}`;
        orderedSets[orderedSetId] = conclusionIds;
        orderedSetMapping.set(`${argument.getId().getValue()}-conclusions`, orderedSetId);
      }
    }

    return { orderedSets, orderedSetMapping };
  }

  private serializeAtomicArguments(
    queryService: ProofDocumentQueryService,
    orderedSetMapping: Map<string, string>,
  ): Record<string, YAMLAtomicArgument> {
    const args: Record<string, YAMLAtomicArgument> = {};

    for (const argument of queryService.getAllAtomicArguments()) {
      const yamlArg: YAMLAtomicArgument = {
        premises: orderedSetMapping.get(`${argument.getId().getValue()}-premises`) || null,
        conclusions: orderedSetMapping.get(`${argument.getId().getValue()}-conclusions`) || null,
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

  private serializeTrees(_queryService: ProofDocumentQueryService): Record<string, YAMLTree> {
    const trees: Record<string, YAMLTree> = {};

    // Note: Trees are stored in ProofTreeAggregate, not ProofDocument
    // This would need to be passed in or accessed via a tree repository
    // For now, returning empty - actual implementation would coordinate with ProofTreeAggregateRepository

    return trees;
  }
}
