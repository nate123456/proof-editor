import type { ProofAggregate } from '../aggregates/ProofAggregate.js';

/**
 * Specifications for bootstrap and empty state validation.
 * These override normal validation rules.
 */
export class CanCreateEmptyArgumentSpec {
  isSatisfiedBy(proofAggregate: ProofAggregate): boolean {
    // Always allow first argument to be empty
    return proofAggregate.getArguments().size === 0;
  }
}

export class CanHaveEmptyOrderedSetSpec {
  isSatisfiedBy(context: 'bootstrap' | 'normal'): boolean {
    // Only in bootstrap context
    return context === 'bootstrap';
  }
}

export class RequiresValidationSpec {
  isSatisfiedBy(argumentCount: number, statementCount: number): boolean {
    // No validation needed for bootstrap
    if (argumentCount === 0 || statementCount === 0) {
      return false;
    }
    return true;
  }
}
