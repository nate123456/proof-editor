export interface FindConnectionsQuery {
  documentId: string;
  argumentId?: string; // Connections for specific argument
  orderedSetId?: string; // Arguments using this OrderedSet
}

export interface GetConnectionPathsQuery {
  documentId: string;
  fromArgumentId: string;
  toArgumentId?: string; // Optional: find paths to specific target
  maxDepth?: number; // Limit search depth
}

export interface ConnectionDTO {
  providerId: string; // Argument providing conclusion
  consumerId: string; // Argument consuming as premise
  sharedOrderedSetId: string;
  connectionType: 'direct' | 'transitive';
}

export interface ConnectionPathDTO {
  steps: string[]; // Argument IDs in sequence
  sharedSets: string[]; // OrderedSet IDs along path
  totalLength: number;
}
