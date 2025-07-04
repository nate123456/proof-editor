export interface CreateOrderedSetCommand {
  documentId: string;
  statementIds: string[];
}

// Note: OrderedSets are typically created implicitly when creating arguments
// This command might be used for explicit creation in advanced scenarios
