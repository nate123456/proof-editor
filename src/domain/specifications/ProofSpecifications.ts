/**
 * Domain specifications encapsulate business rules as objects.
 * Can be composed and reused across the domain.
 */
export class CanCreateStatementSpec {
  isSatisfiedBy(content: string): boolean {
    return content.trim().length > 0 && content.length <= 1000;
  }

  reasonForDissatisfaction(content: string): string | null {
    if (content.trim().length === 0) {
      return 'Statement content cannot be empty';
    }
    if (content.length > 1000) {
      return 'Statement content exceeds maximum length';
    }
    return null;
  }
}

export class CanAttachNodeSpec {
  isSatisfiedBy(
    hasParentPremises: boolean,
    hasChildConclusions: boolean,
    isValidPosition: boolean,
  ): boolean {
    return hasParentPremises && hasChildConclusions && isValidPosition;
  }
}

export class IsValidProofTreeSpec {
  isSatisfiedBy(hasRoot: boolean, hasNoCycles: boolean, allNodesConnected: boolean): boolean {
    return hasRoot && hasNoCycles && allNodesConnected;
  }
}
