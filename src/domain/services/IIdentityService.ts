import type {
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
} from '../shared/value-objects/index.js';

export interface IIdentityService {
  generateProofDocumentId(): ProofDocumentId;
  generateStatementId(): StatementId;
  generateAtomicArgumentId(): AtomicArgumentId;
  generateNodeId(): NodeId;
  generateTreeId(): TreeId;
  generateDocumentId(): DocumentId;
  generatePackageId(): PackageId;
  generateProofId(): ProofId;
  generateProofTreeId(): ProofTreeId;
  generateWebviewId(): WebviewId;
}
