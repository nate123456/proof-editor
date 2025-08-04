// Re-export factory functions
export {
  createAtomicArgument,
  createBootstrapAtomicArgument,
  reconstructAtomicArgument,
} from './AtomicArgumentFactory.js';

export { createChildNode, createRootNode, reconstructNode } from './NodeFactory.js';

export { createStatement, reconstructStatement } from './StatementFactory.js';

export { createTree, reconstructTree } from './TreeFactory.js';
