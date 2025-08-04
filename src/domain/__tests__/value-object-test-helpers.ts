/**
 * Test helper functions for creating value objects
 *
 * Provides convenient factory functions that handle Result types
 * and throw on errors for cleaner test code
 */

import * as Content from '../shared/value-objects/content.js';
import * as Geometry from '../shared/value-objects/geometry.js';
// Import the actual value object classes
import * as Identifiers from '../shared/value-objects/identifiers.js';
import type {
  AlignmentMode,
  AtomicArgumentId,
  Attachment,
  BranchPoint,
  DocumentContent,
  DocumentId,
  DocumentVersion,
  EventData,
  ExpansionDirection,
  ImplicationLine,
  LayoutStyle,
  MessageContent,
  NodeId,
  PhysicalProperties,
  Position2D,
  ProofDocumentId,
  ProofId,
  ProofTreeId,
  SideLabel,
  SideLabels,
  StatementContent,
  StatementId,
  StatementReference,
  Timestamp,
  Title,
  TreeId,
  Version,
  WebviewId,
} from '../shared/value-objects/index.js';
import * as UI from '../shared/value-objects/ui.js';
import { TreePosition } from '../value-objects/TreePosition.js';

/**
 * Creates a StatementId or throws if invalid
 */
export function createTestStatementId(value: string): StatementId {
  const result = Identifiers.StatementId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid StatementId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an AtomicArgumentId or throws if invalid
 */
export function createTestAtomicArgumentId(value: string): AtomicArgumentId {
  const result = Identifiers.AtomicArgumentId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid AtomicArgumentId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a NodeId or throws if invalid
 */
export function createTestNodeId(value: string): NodeId {
  const result = Identifiers.NodeId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid NodeId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a TreeId or throws if invalid
 */
export function createTestTreeId(value: string): TreeId {
  const result = Identifiers.TreeId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid TreeId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a DocumentId or throws if invalid
 */
export function createTestDocumentId(value: string): DocumentId {
  const result = Identifiers.DocumentId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid DocumentId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a ProofDocumentId or throws if invalid
 */
export function createTestProofDocumentId(value: string): ProofDocumentId {
  const result = Identifiers.ProofDocumentId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid ProofDocumentId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a ProofTreeId or throws if invalid
 */
export function createTestProofTreeId(value: string): ProofTreeId {
  const result = Identifiers.ProofTreeId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid ProofTreeId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a ProofId or throws if invalid
 */
export function createTestProofId(value: string): ProofId {
  const result = Identifiers.ProofId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid ProofId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a WebviewId or throws if invalid
 */
export function createTestWebviewId(value: string): WebviewId {
  const result = Identifiers.WebviewId.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid WebviewId: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a SideLabel or throws if invalid
 */
export function createTestSideLabel(value: string): SideLabel {
  const result = Content.SideLabel.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid SideLabel: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates SideLabels from strings or throws if invalid
 */
export function createTestSideLabels(labels: { left?: string; right?: string }): SideLabels {
  const result = Content.SideLabels.fromStrings(labels);
  if (result.isErr()) {
    throw new Error(`Invalid SideLabels: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a StatementContent or throws if invalid
 */
export function createTestStatementContent(value: string): StatementContent {
  const result = Content.StatementContent.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid StatementContent: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a DocumentContent or throws if invalid
 */
export function createTestDocumentContent(value: string): DocumentContent {
  const result = Content.DocumentContent.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid DocumentContent: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a Title or throws if invalid
 */
export function createTestTitle(value: string): Title {
  const result = Content.Title.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid Title: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a Version or throws if invalid
 */
export function createTestVersion(value: number): Version {
  const result = Content.Version.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid Version: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a DocumentVersion or throws if invalid
 */
export function createTestDocumentVersion(value: number): DocumentVersion {
  const result = Content.DocumentVersion.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid DocumentVersion: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a Timestamp or throws if invalid
 */
export function createTestTimestamp(value: number): Timestamp {
  const result = Content.Timestamp.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid Timestamp: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a MessageContent or throws if invalid
 */
export function createTestMessageContent(value: string): MessageContent {
  const result = Content.MessageContent.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid MessageContent: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates EventData or throws if invalid
 */
export function createTestEventData(value: Record<string, unknown>): EventData {
  const result = Content.EventData.create(value);
  if (result.isErr()) {
    throw new Error(`Invalid EventData: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a StatementReference or throws if invalid
 */
export function createTestStatementReference(
  statementId: StatementId,
  position: number,
): StatementReference {
  const result = Identifiers.StatementReference.create(statementId, position);
  if (result.isErr()) {
    throw new Error(`Invalid StatementReference: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an ImplicationLine or throws if invalid
 */
export function createTestImplicationLine(argumentId: string, position = 0): ImplicationLine {
  const result = Content.ImplicationLine.create(argumentId, position);
  if (result.isErr()) {
    throw new Error(`Invalid ImplicationLine: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a BranchPoint or throws if invalid
 */
export function createTestBranchPoint(
  startIndex: number,
  endIndex: number,
  selectedText: string,
): BranchPoint {
  const result = Content.BranchPoint.create(startIndex, endIndex, selectedText);
  if (result.isErr()) {
    throw new Error(`Invalid BranchPoint: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a Position2D or throws if invalid
 */
export function createTestPosition2D(x: number, y: number): Position2D {
  const result = Geometry.Position2D.create(x, y);
  if (result.isErr()) {
    throw new Error(`Invalid Position2D: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a TreePosition or throws if invalid
 */
export function createTestTreePosition(x: number, y: number): TreePosition {
  const result = TreePosition.create(x, y);
  if (result.isErr()) {
    throw new Error(`Invalid TreePosition: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates PhysicalProperties or throws if invalid
 */
export function createTestPhysicalProperties(
  layoutStyle?: LayoutStyle,
  spacingX = 50,
  spacingY = 50,
  minWidth = 100,
  minHeight = 50,
  expansionDirection?: ExpansionDirection,
  alignmentMode?: AlignmentMode,
): PhysicalProperties {
  const result = Geometry.PhysicalProperties.create(
    layoutStyle ?? UI.LayoutStyle.bottomUp(),
    spacingX,
    spacingY,
    minWidth,
    minHeight,
    expansionDirection ?? UI.ExpansionDirection.horizontal(),
    alignmentMode ?? UI.AlignmentMode.center(),
  );
  if (result.isErr()) {
    throw new Error(`Invalid PhysicalProperties: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an Attachment or throws if invalid
 */
export function createTestAttachment(
  parentNodeId: NodeId,
  premisePosition: number,
  fromPosition?: number,
): Attachment {
  const result = Geometry.Attachment.create(parentNodeId, premisePosition, fromPosition);
  if (result.isErr()) {
    throw new Error(`Invalid Attachment: ${result.error.message}`);
  }
  return result.value;
}

// Re-export factories from the main factory file for convenience
export {
  atomicArgumentFactory,
  atomicArgumentIdFactory,
  attachmentFactory,
  createTestIds,
  createTestStatements,
  nodeFactory,
  nodeIdFactory,
  physicalPropertiesFactory,
  position2DFactory,
  proofDocumentFactory,
  proofDocumentIdFactory,
  proofTestData,
  sideLabelFactory,
  sideLabelsFactory,
  statementContentFactory,
  statementFactory,
  statementIdFactory,
  testScenarios,
  treeFactory,
  treeIdFactory,
  treePositionFactory,
} from './factories/index.js';

// Common test ID values
export const TEST_IDS = {
  statementId1: createTestStatementId('statement-1'),
  statementId2: createTestStatementId('statement-2'),
  statementId3: createTestStatementId('statement-3'),
  statementId4: createTestStatementId('statement-4'),
  statementId5: createTestStatementId('statement-5'),

  argumentId1: createTestAtomicArgumentId('arg-1'),
  argumentId2: createTestAtomicArgumentId('arg-2'),
  argumentId3: createTestAtomicArgumentId('arg-3'),

  nodeId1: createTestNodeId('node-1'),
  nodeId2: createTestNodeId('node-2'),
  nodeId3: createTestNodeId('node-3'),
  nodeId4: createTestNodeId('node-4'),

  treeId1: createTestTreeId('tree-1'),
  treeId2: createTestTreeId('tree-2'),

  documentId1: createTestDocumentId('doc-1'),
  proofDocumentId1: createTestProofDocumentId('proof-doc-1'),
  proofTreeId1: createTestProofTreeId('proof-tree-1'),
  proofId1: createTestProofId('proof-1'),

  webviewId1: createTestWebviewId('webview-1'),
};

// Common test content values
export const TEST_CONTENT = {
  statement1: createTestStatementContent('All men are mortal'),
  statement2: createTestStatementContent('Socrates is a man'),
  statement3: createTestStatementContent('Socrates is mortal'),

  title1: createTestTitle('Test Proof Document'),

  sideLabel1: createTestSideLabel('Modus Ponens'),
  sideLabel2: createTestSideLabel('Given'),
  sideLabel3: createTestSideLabel('Definition'),

  sideLabels1: createTestSideLabels({ left: 'Modus Ponens', right: 'MP' }),
  sideLabels2: createTestSideLabels({ left: 'Given' }),
  sideLabels3: createTestSideLabels({ right: 'Definition' }),
  sideLabelsEmpty: createTestSideLabels({}),
};
