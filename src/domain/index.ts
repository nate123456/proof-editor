export { AtomicArgument, type SideLabels } from './entities/AtomicArgument.js';
export { Node } from './entities/Node.js';
export { Statement } from './entities/Statement.js';
export { Tree } from './entities/Tree.js';
export { ArgumentCompatibilityService } from './services/ArgumentCompatibilityService.js';
export { CycleDetectionService } from './services/CycleDetectionService.js';
export { StatementFlowService } from './services/StatementFlowService.js';
export { TreeStructureService } from './services/TreeStructureService.js';
export { err, ok, Result, ValidationError } from './shared/result.js';
export {
  type AlignmentMode,
  AtomicArgumentId,
  Attachment,
  DocumentId,
  ErrorCode,
  ErrorMessage,
  ErrorSeverity,
  type ExpansionDirection,
  type LayoutStyle,
  NodeId,
  PackageId,
  PhysicalProperties,
  Position2D,
  StatementContent,
  StatementId,
  TreeId,
} from './shared/value-objects/index.js';
export {
  CanAttachNodeSpec,
  CanCreateStatementSpec,
  IsValidProofTreeSpec,
} from './specifications/ProofSpecifications.js';
