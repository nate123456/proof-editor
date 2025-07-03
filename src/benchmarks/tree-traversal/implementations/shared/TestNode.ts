/**
 * Test node data structure for tree benchmarking
 */
export interface TestNode {
  id: string;
  parentId: string | null;
  argumentId: string;
  children: string[];
  orderedSetRefs: {
    premise?: string;
    conclusion?: string;
  };
  position?: {
    x: number;
    y: number;
  };
}

/**
 * Generate a balanced tree with specified depth and branching factor
 */
export function generateBalancedTree(depth: number, branchingFactor: number): TestNode[] {
  const nodes: TestNode[] = [];
  let nodeCounter = 0;

  const generateNode = (parentId: string | null, currentDepth: number): string => {
    const nodeId = `n${nodeCounter++}`;
    const argumentId = `arg${nodeCounter}`;

    const node: TestNode = {
      id: nodeId,
      parentId,
      argumentId,
      children: [],
      orderedSetRefs: {
        premise: `premise_${nodeId}`,
        conclusion: `conclusion_${nodeId}`,
      },
      position: {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
      },
    };

    nodes.push(node);

    if (currentDepth > 0) {
      for (let i = 0; i < branchingFactor; i++) {
        const childId = generateNode(nodeId, currentDepth - 1);
        node.children.push(childId);
      }
    }

    return nodeId;
  };

  generateNode(null, depth);
  return nodes;
}

/**
 * Generate a wide tree with many siblings
 */
export function generateWideTree(rootChildren: number, depth: number): TestNode[] {
  const nodes: TestNode[] = [];
  let nodeCounter = 0;

  // Create root
  const rootId = `n${nodeCounter++}`;
  const rootNode: TestNode = {
    id: rootId,
    parentId: null,
    argumentId: `arg${nodeCounter}`,
    children: [],
    orderedSetRefs: {
      premise: `premise_${rootId}`,
      conclusion: `conclusion_${rootId}`,
    },
    position: { x: 500, y: 500 },
  };
  nodes.push(rootNode);

  // Create wide first level
  for (let i = 0; i < rootChildren; i++) {
    const childId = `n${nodeCounter++}`;
    const childNode: TestNode = {
      id: childId,
      parentId: rootId,
      argumentId: `arg${nodeCounter}`,
      children: [],
      orderedSetRefs: {
        premise: `premise_${childId}`,
        conclusion: `conclusion_${childId}`,
      },
      position: { x: i * 100, y: 400 },
    };

    nodes.push(childNode);
    rootNode.children.push(childId);

    // Add some depth to each branch
    let currentParent = childId;
    for (let d = 1; d < depth; d++) {
      const deepId = `n${nodeCounter++}`;
      const deepNode: TestNode = {
        id: deepId,
        parentId: currentParent,
        argumentId: `arg${nodeCounter}`,
        children: [],
        orderedSetRefs: {
          premise: `premise_${deepId}`,
          conclusion: `conclusion_${deepId}`,
        },
        position: { x: i * 100, y: 400 - d * 80 },
      };

      nodes.push(deepNode);
      const parentNode = nodes.find((n) => n.id === currentParent);
      if (!parentNode) {
        throw new Error(`Parent node not found: ${currentParent}`);
      }
      parentNode.children.push(deepId);
      currentParent = deepId;
    }
  }

  return nodes;
}

/**
 * Generate a deep linear chain
 */
export function generateLinearChain(length: number): TestNode[] {
  const nodes: TestNode[] = [];
  let currentParent: string | null = null;

  for (let i = 0; i < length; i++) {
    const nodeId = `n${i}`;
    const node: TestNode = {
      id: nodeId,
      parentId: currentParent,
      argumentId: `arg${i}`,
      children: currentParent ? [] : [`n${i + 1}`],
      orderedSetRefs: {
        premise: `premise_${nodeId}`,
        conclusion: `conclusion_${nodeId}`,
      },
      position: { x: 500, y: i * 100 },
    };

    nodes.push(node);

    if (currentParent) {
      const parentNode = nodes.find((n) => n.id === currentParent);
      if (!parentNode) {
        throw new Error(`Parent node not found: ${currentParent}`);
      }
      parentNode.children.push(nodeId);
    }

    currentParent = nodeId;
  }

  return nodes;
}

/**
 * Generate a complex DAG with multiple paths
 */
export function generateComplexDAG(size: number): TestNode[] {
  const nodes: TestNode[] = [];

  // Create a root node
  const rootId = 'root';
  nodes.push({
    id: rootId,
    parentId: null,
    argumentId: 'arg_root',
    children: [],
    orderedSetRefs: {
      premise: 'premise_root',
      conclusion: 'conclusion_root',
    },
    position: { x: 500, y: 0 },
  });

  // Create multiple levels with cross-connections
  for (let level = 1; level < size; level++) {
    const levelSize = Math.max(1, Math.floor(size / level));

    for (let i = 0; i < levelSize; i++) {
      const nodeId = `l${level}_n${i}`;
      const node: TestNode = {
        id: nodeId,
        parentId: null, // Will be set based on connections
        argumentId: `arg_${nodeId}`,
        children: [],
        orderedSetRefs: {
          premise: `premise_${nodeId}`,
          conclusion: `conclusion_${nodeId}`,
        },
        position: { x: i * 200, y: level * 100 },
      };

      nodes.push(node);

      // Connect to previous level nodes
      const prevLevelNodes = nodes.filter((n) => n.id.startsWith(`l${level - 1}_`));
      if (prevLevelNodes.length > 0) {
        const parentNode = prevLevelNodes[i % prevLevelNodes.length];
        if (parentNode) {
          node.parentId = parentNode.id;
          parentNode.children.push(nodeId);
        }
      }
    }
  }

  return nodes;
}
