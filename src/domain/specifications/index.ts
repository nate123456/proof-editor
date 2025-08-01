// Base specification interfaces

// Atomic argument specifications
export {
  AtomicArgumentByComplexityQuerySpecification,
  AtomicArgumentByStatementQuerySpecification,
  AtomicArgumentComplexitySpecification,
  AtomicArgumentConclusionCountSpecification,
  AtomicArgumentDateRangeSpecification,
  AtomicArgumentHasConclusionSpecification,
  AtomicArgumentHasLabelsSpecification,
  AtomicArgumentHasSpecificLabelSpecification,
  AtomicArgumentPremiseCountSpecification,
  AtomicArgumentReferencesStatementSpecification,
  AtomicArgumentUsesPremiseSpecification,
  CompleteAtomicArgumentSpecification,
  EmptyAtomicArgumentSpecification,
} from './AtomicArgumentSpecifications.js';

// Composite specification base classes
export {
  AndSpecification,
  CompositeSpecification,
  NotSpecification,
  OrSpecification,
  QuerySpecification,
} from './CompositeSpecification.js';
export type {
  IQuerySpecification,
  ISpecification,
  ISpecificationRepository,
} from './ISpecification.js';
// Legacy proof specifications (existing)
export {
  CanAttachNodeSpec,
  CanCreateStatementSpec,
  IsValidProofTreeSpec,
} from './ProofSpecifications.js';
// Statement specifications
export {
  StatementContentSpecification,
  StatementDateRangeSpecification,
  StatementHasContentSpecification,
  StatementKeywordSpecification,
  StatementLogicalStructureSpecification,
  StatementPatternQuerySpecification,
  StatementPatternSpecification,
  StatementUsageSpecification,
  UnusedStatementSpecification,
} from './StatementSpecifications.js';
