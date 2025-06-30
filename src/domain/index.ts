export { 
  Result, 
  ValidationError, 
  success, 
  failure, 
  createSuccess, 
  createFailure, 
  isSuccess, 
  isFailure 
} from "./shared/result.js";

export { 
  StatementId,
  OrderedSetId,
  AtomicArgumentId,
  NodeId,
  TreeId,
  DocumentId,
  PackageId,
  StatementContent,
  Position2D,
  Attachment,
  PhysicalProperties,
  type LayoutStyle,
  type ExpansionDirection,
  type AlignmentMode
} from "./shared/value-objects.js";

export { StatementEntity } from "./entities/StatementEntity.js";
export { OrderedSetEntity } from "./entities/OrderedSetEntity.js";
export { AtomicArgumentEntity, type SideLabels } from "./entities/AtomicArgumentEntity.js";
export { NodeEntity } from "./entities/NodeEntity.js";
export { TreeEntity } from "./entities/TreeEntity.js";

export { StatementFlowService } from "./services/StatementFlowService.js";
export { TreeStructureService } from "./services/TreeStructureService.js";