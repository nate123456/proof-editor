import type { AtomicArgument } from '../domain/entities/AtomicArgument.js';
import type { Node } from '../domain/entities/Node.js';
import type { OrderedSet } from '../domain/entities/OrderedSet.js';
import type { Statement } from '../domain/entities/Statement.js';
import type { Tree } from '../domain/entities/Tree.js';

export interface ProofDocument {
  statements: Map<string, Statement>;
  orderedSets: Map<string, OrderedSet>;
  atomicArguments: Map<string, AtomicArgument>;
  trees: Map<string, Tree>;
  nodes: Map<string, Node>;
}

export interface ParsedYAMLStructure {
  statements?: Record<string, string>;
  orderedSets?: Record<string, string[]>;
  atomicArguments?: Record<
    string,
    {
      premises?: string;
      conclusions?: string;
      sideLabel?: string;
    }
  >;
  arguments?:
    | Record<
        string,
        {
          premises?: string[];
          conclusions?: string[];
          sideLabel?: string;
        }
      >
    | Record<string, string[]>[];
  trees?: Record<
    string,
    {
      offset?: { x: number; y: number };
      nodes?: Record<string, NodeSpec>;
    }
  >;
}

export interface NodeSpec {
  arg?: string;
  [parentNodeId: string]: string | number | undefined;
  on?: number | string;
}
