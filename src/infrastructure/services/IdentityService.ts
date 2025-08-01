import type { IIdentityService } from '../../domain/services/IIdentityService.js';
import { randomUUID } from '../../domain/shared/value-objects/common.js';
import {
  AtomicArgumentId,
  DocumentId,
  NodeId,
  PackageId,
  ProofDocumentId,
  ProofId,
  ProofTreeId,
  StatementId,
  TreeId,
  WebviewId,
} from '../../domain/shared/value-objects/index.js';

export class IdentityService implements IIdentityService {
  generateProofDocumentId(): ProofDocumentId {
    const result = ProofDocumentId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate ProofDocumentId: ${result.error.message}`);
    }
    return result.value;
  }

  generateStatementId(): StatementId {
    const result = StatementId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate StatementId: ${result.error.message}`);
    }
    return result.value;
  }

  generateAtomicArgumentId(): AtomicArgumentId {
    const result = AtomicArgumentId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate AtomicArgumentId: ${result.error.message}`);
    }
    return result.value;
  }

  generateNodeId(): NodeId {
    const result = NodeId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate NodeId: ${result.error.message}`);
    }
    return result.value;
  }

  generateTreeId(): TreeId {
    const result = TreeId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate TreeId: ${result.error.message}`);
    }
    return result.value;
  }

  generateDocumentId(): DocumentId {
    const result = DocumentId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate DocumentId: ${result.error.message}`);
    }
    return result.value;
  }

  generatePackageId(): PackageId {
    const result = PackageId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate PackageId: ${result.error.message}`);
    }
    return result.value;
  }

  generateProofId(): ProofId {
    const result = ProofId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate ProofId: ${result.error.message}`);
    }
    return result.value;
  }

  generateProofTreeId(): ProofTreeId {
    const result = ProofTreeId.create(randomUUID());
    if (result.isErr()) {
      throw new Error(`Failed to generate ProofTreeId: ${result.error.message}`);
    }
    return result.value;
  }

  generateWebviewId(): WebviewId {
    const result = WebviewId.create(`webview-${randomUUID()}`);
    if (result.isErr()) {
      throw new Error(`Failed to generate WebviewId: ${result.error.message}`);
    }
    return result.value;
  }
}
