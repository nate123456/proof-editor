# Data Synchronization and Conflict Resolution

## Overview

This document defines the technical strategy for achieving zero data loss, robust conflict detection, and user-friendly conflict resolution in Proof Editor's multi-platform, offline-first architecture. The system must guarantee data integrity while providing seamless collaboration across desktop and mobile devices.

## Core Requirements

### Non-Functional Requirements (NFRs)
- **Zero Data Loss**: All user edits made offline must be preserved and synchronized
- **Synchronization Latency**: 5 seconds for small edits, 30 seconds for structural changes
- **User-Friendly Conflict Resolution**: Visual interface with intelligent resolution suggestions
- **Offline Functionality**: Full proof construction capabilities without network connectivity
- **Battery Efficiency**: Less than 5% battery drain per hour on mobile devices

### Functional Requirements
- Detect concurrent edits that create logical conflicts
- Preserve edit history and authorship information
- Support real-time collaboration when online
- Enable offline work with eventual synchronization
- Provide intuitive merge interfaces for complex conflicts

## Data Consistency Model

### Chosen Approach: Conflict-Free Replicated Data Types (CRDTs)

Proof Editor uses **Operation-based CRDTs** with **vector clocks** for the following reasons:

#### Why CRDTs
- **Automatic Convergence**: Multiple replicas converge to same state without coordination
- **Offline-First**: Operations can be applied locally and merged later
- **Commutative Operations**: Order of operation application doesn't affect final state
- **Zero Data Loss**: All operations are preserved and eventually applied

#### Why Operation-Based (Op-Based) CRDTs
- **Logical Semantics**: Operations like "add atomic argument" have clear logical meaning
- **Conflict Prevention**: Most structural operations are naturally commutative
- **Audit Trail**: Operations provide natural edit history
- **Pattern Analysis**: Operations can be analyzed for intelligent conflict resolution patterns

### CRDT Implementation for Proof Editor

#### Document-Level CRDT Structure
```typescript
interface ProofDocumentCRDT {
  // Document metadata
  documentId: string;
  version: VectorClock;
  
  // Core logical structures
  atomicArguments: AtomicArgumentCRDT;
  orderedSets: OrderedSetCRDT;
  statements: StatementCRDT;
  
  // Visual layout (separate from logical structure)
  layout: LayoutCRDT;
  
  // Operation log for sync and conflict resolution
  operationLog: OperationLog;
}
```

#### Atomic Argument CRDT
```typescript
interface AtomicArgumentCRDT {
  // CRDT for set of atomic arguments
  arguments: GSetCRDT<AtomicArgumentEntity>;
  
  // Track connections via ordered set references
  connections: ConnectionTracker;
}

interface AtomicArgumentEntity {
  id: string; // Unique ID (UUID)
  premiseOrderedSetId: string; // Reference to OrderedSetEntity
  conclusionOrderedSetId: string; // Reference to OrderedSetEntity
  metadata: {
    author: string;
    timestamp: number;
    sourcePackage?: string;
    rule?: string;
  };
  vectorClock: VectorClock;
}
```

#### Ordered Set CRDT
```typescript
interface OrderedSetCRDT {
  // Map of ordered set IDs to their CRDT representations
  sets: Map<string, OrderedSequenceCRDT<StatementRef>>;
}

interface OrderedSequenceCRDT<T> {
  // RGA (Replicated Growable Array) for ordered sequences
  elements: RGAElement<T>[];
  tombstones: Set<string>; // For element deletions
}

interface StatementRef {
  statementId: string;
  insertId: string; // Unique insertion ID for RGA
  vectorClock: VectorClock;
}
```

#### Vector Clock Implementation
```typescript
interface VectorClock {
  // Map from device/user ID to logical timestamp
  clocks: Map<string, number>;
  
  // Compare vector clocks for ordering
  compare(other: VectorClock): 'before' | 'after' | 'concurrent';
  
  // Merge vector clocks
  merge(other: VectorClock): VectorClock;
  
  // Increment for new operation
  tick(deviceId: string): VectorClock;
}
```

## Operation Log and Synchronization

### Operation Types
```typescript
type ProofOperation = 
  | CreateAtomicArgumentOp
  | DeleteAtomicArgumentOp
  | ModifyAtomicArgumentOp
  | CreateOrderedSetOp
  | ModifyOrderedSetOp
  | InsertStatementOp
  | DeleteStatementOp
  | UpdateLayoutOp
  | UpdateMetadataOp;

interface CreateAtomicArgumentOp {
  type: 'create_atomic_argument';
  id: string;
  premiseOrderedSetId: string;
  conclusionOrderedSetId: string;
  metadata: AtomicArgumentMetadata;
  vectorClock: VectorClock;
  timestamp: number;
  deviceId: string;
}
```

### Operation Application
```typescript
interface OperationProcessor {
  // Apply operation to local CRDT state
  applyOperation(op: ProofOperation): void;
  
  // Check if operation can be applied (dependencies satisfied)
  canApply(op: ProofOperation): boolean;
  
  // Get operations that depend on this operation
  getDependents(op: ProofOperation): ProofOperation[];
  
  // Validate operation against current state
  validateOperation(op: ProofOperation): ValidationResult;
}
```

### Synchronization Protocol

#### Device-to-Device Sync
```typescript
interface SyncProtocol {
  // Request sync with remote device/server
  requestSync(remoteEndpoint: string): Promise<SyncResult>;
  
  // Send local operations since last sync
  sendOperations(since: VectorClock): ProofOperation[];
  
  // Receive and apply remote operations
  receiveOperations(ops: ProofOperation[]): Promise<void>;
  
  // Resolve sync conflicts
  resolveConflicts(conflicts: Conflict[]): Promise<Resolution[]>;
}
```

#### Sync Algorithm
1. **Exchange Vector Clocks**: Determine which operations each device needs
2. **Send Missing Operations**: Transfer operations in causal order
3. **Apply Operations**: Apply remote operations to local CRDT
4. **Detect Conflicts**: Identify semantic conflicts requiring user resolution
5. **Update Vector Clock**: Merge vector clocks to reflect sync

## Conflict Detection and Resolution

### Conflict Categories

#### Structural Conflicts (Rare - Auto-Resolvable)
These are handled automatically by CRDT properties:
- **Concurrent Additions**: Both devices add atomic arguments → Both preserved
- **Concurrent Deletions**: Both devices delete same argument → Deletion wins
- **Concurrent Modifications**: Different metadata changes → Merge metadata

#### Semantic Conflicts (Require User Resolution)
These require human judgment:
- **Logical Inconsistency**: Edits create invalid logical structure
- **Premise-Conclusion Mismatch**: Concurrent edits to shared ordered sets
- **Rule Violation**: Changes violate language package rules
- **Attribution Conflict**: Same logical step claimed by different authors

### Conflict Detection Algorithm

#### Real-Time Detection
```typescript
interface ConflictDetector {
  // Detect conflicts as operations are applied
  detectConflicts(op: ProofOperation, state: ProofDocumentCRDT): Conflict[];
  
  // Validate logical consistency after sync
  validateLogicalConsistency(doc: ProofDocumentCRDT): ValidationResult;
  
  // Check language package rule violations
  checkRuleViolations(doc: ProofDocumentCRDT): RuleViolation[];
}

interface Conflict {
  type: 'logical_inconsistency' | 'premise_conclusion_mismatch' | 'rule_violation' | 'attribution_conflict';
  severity: 'warning' | 'error' | 'critical';
  affectedElements: string[]; // IDs of affected atomic arguments/ordered sets
  operations: ProofOperation[]; // Conflicting operations
  suggestedResolutions: Resolution[];
  resolutionAnalysis?: ConflictAnalysis;
}
```

#### Semantic Validation
```typescript
interface SemanticValidator {
  // Validate logical structure integrity
  validateConnections(doc: ProofDocumentCRDT): ConnectionValidation;
  
  // Check for orphaned elements
  findOrphans(doc: ProofDocumentCRDT): OrphanedElement[];
  
  // Validate argument tree completeness
  validateArgumentTrees(doc: ProofDocumentCRDT): TreeValidation;
  
  // Check language package compliance
  validatePackageRules(doc: ProofDocumentCRDT, packageId: string): PackageValidation;
}
```

### User-Friendly Conflict Resolution Interface

#### Visual Conflict Presentation
```typescript
interface ConflictResolutionUI {
  // Display conflicts in visual diff format
  showConflictDiff(conflict: Conflict): ConflictView;
  
  // Provide side-by-side comparison
  compareVersions(left: ProofVersion, right: ProofVersion): ComparisonView;
  
  // Highlight affected proof elements
  highlightAffectedElements(elementIds: string[]): void;
  
  // Show operation timeline
  showOperationHistory(conflict: Conflict): TimelineView;
}

interface ConflictView {
  // Visual representation of conflict
  conflictType: ConflictType;
  affectedRegion: ProofRegion;
  
  // User's options
  resolutionOptions: ResolutionOption[];
  
  // Intelligent suggestions
  intelligentSuggestions?: ResolutionSuggestion[];
  
  // Preview of each resolution
  resolutionPreviews: Map<string, ProofPreview>;
}
```

#### Resolution Options
```typescript
interface ResolutionOption {
  id: string;
  description: string;
  strategy: 'accept_mine' | 'accept_theirs' | 'merge_custom' | 'intelligent_merge' | 'manual_edit';
  confidence: number; // 0-1, for intelligent suggestions
  preview: ProofPreview;
  implications: string[]; // What this resolution affects
}
```

### Pattern-Based Conflict Resolution

#### Conflict Analysis System
```typescript
interface ConflictAnalysis {
  // Analyze logical implications of each resolution
  analyzeLogicalImplications(conflict: Conflict): LogicalAnalysis;
  
  // Suggest optimal merge strategy based on patterns
  suggestMergeStrategy(conflict: Conflict): MergeStrategy;
  
  // Identify potential logical errors
  identifyLogicalErrors(conflict: Conflict): LogicalError[];
  
  // Recommend resolution based on proof context and patterns
  recommendResolution(conflict: Conflict, context: ProofContext): Resolution;
}

interface LogicalAnalysis {
  // Does each resolution maintain logical validity?
  resolutionValidity: Map<string, boolean>;
  
  // What are the logical consequences?
  logicalConsequences: Map<string, string[]>;
  
  // Are there hidden implications?
  hiddenImplications: Map<string, string[]>;
  
  // Confidence in analysis
  confidence: number;
}
```

#### Pattern-Based Merge Strategies
- **Syntactic Merge**: Combine non-conflicting changes automatically
- **Semantic Merge**: Use logical rules to resolve conflicts
- **Pattern-Based Merge**: Use recognized patterns to infer resolution
- **Context-Aware Merge**: Consider broader proof context for resolution

## Zero Data Loss Implementation

### Local Durability

#### Operation Journaling
```typescript
interface OperationJournal {
  // Persistent log of all operations
  appendOperation(op: ProofOperation): Promise<void>;
  
  // Read operations since checkpoint
  readOperationsSince(checkpoint: VectorClock): ProofOperation[];
  
  // Create checkpoint for garbage collection
  createCheckpoint(state: ProofDocumentCRDT): Promise<Checkpoint>;
  
  // Compact journal by removing pre-checkpoint operations
  compactJournal(checkpoint: Checkpoint): Promise<void>;
}
```

#### Storage Strategy
- **Immediate Persistence**: Operations written to disk before UI confirmation
- **WAL (Write-Ahead Logging)**: Operations logged before state modification
- **Checksums**: Verify operation integrity on read
- **Redundant Storage**: Multiple storage backends for critical data

#### Recovery Procedures
```typescript
interface RecoveryManager {
  // Recover state from journal after crash
  recoverFromJournal(): Promise<ProofDocumentCRDT>;
  
  // Validate recovered state consistency
  validateRecoveredState(state: ProofDocumentCRDT): ValidationResult;
  
  // Repair corrupted state if possible
  repairCorruption(state: ProofDocumentCRDT): RepairResult;
  
  // Emergency export of salvageable data
  emergencyExport(corruptedState: ProofDocumentCRDT): ProofData;
}
```

### Network Resilience

#### Offline Operation Queue
```typescript
interface OfflineQueue {
  // Queue operations when offline
  enqueueOperation(op: ProofOperation): void;
  
  // Process queue when online
  processQueue(): Promise<SyncResult>;
  
  // Handle failed operations
  handleFailures(failures: OperationFailure[]): void;
  
  // Optimize queue before sync
  optimizeQueue(): ProofOperation[];
}
```

#### Connection Management
- **Connection Monitoring**: Detect online/offline state changes
- **Retry Logic**: Exponential backoff for failed sync attempts
- **Partial Sync**: Handle incomplete synchronization gracefully
- **Connection Recovery**: Resume sync after connectivity restoration

## Performance Optimization

### Mobile Battery Efficiency

#### Adaptive Sync Strategy
```typescript
interface AdaptiveSyncManager {
  // Adjust sync frequency based on battery level
  adaptSyncFrequency(batteryLevel: number): SyncFrequency;
  
  // Batch operations to reduce network usage
  batchOperations(ops: ProofOperation[]): BatchedOperation[];
  
  // Prioritize operations by importance
  prioritizeOperations(ops: ProofOperation[]): PrioritizedOperation[];
  
  // Use efficient sync protocols
  selectSyncProtocol(context: SyncContext): SyncProtocol;
}
```

#### Power Management
- **Background Limits**: Respect platform background processing limits
- **Coalescing**: Combine multiple sync requests into single operation
- **Scheduling**: Sync during optimal times (device charging, WiFi available)
- **Degradation**: Reduce sync frequency on low battery

### Memory and Storage Optimization

#### Operation Compaction
```typescript
interface OperationCompactor {
  // Combine redundant operations
  compactOperations(ops: ProofOperation[]): ProofOperation[];
  
  // Remove obsolete operations
  removeObsoleteOperations(ops: ProofOperation[]): ProofOperation[];
  
  // Optimize operation size
  optimizeOperationSize(op: ProofOperation): ProofOperation;
}
```

#### State Materialization
- **Lazy Loading**: Load document sections on demand
- **Incremental Updates**: Apply operations incrementally
- **Garbage Collection**: Remove unreferenced data
- **Compression**: Compress stored operations and state

## Implementation Architecture

### Platform-Specific Adaptations

#### Desktop (VS Code)
```typescript
interface DesktopSyncAdapter {
  // Use Node.js file system for persistence
  fileSystemPersistence: FileSystemPersistence;
  
  // Worker threads for background sync
  backgroundSync: WorkerThreadSync;
  
  // Integration with VS Code's sync infrastructure
  vscodeIntegration: VSCodeSyncIntegration;
}
```

#### Mobile (React Native)
```typescript
interface MobileSyncAdapter {
  // Use platform storage APIs
  platformStorage: PlatformStorage;
  
  // Background app refresh for sync
  backgroundRefresh: BackgroundRefreshManager;
  
  // Network-aware sync scheduling
  networkAwareSync: NetworkAwareSyncManager;
}
```

### Cross-Platform Core

#### Sync Engine
```typescript
interface CrossPlatformSyncEngine {
  // Platform-agnostic CRDT operations
  crdtEngine: CRDTEngine;
  
  // Conflict detection and resolution
  conflictResolver: ConflictResolver;
  
  // Operation management
  operationManager: OperationManager;
  
  // Pattern analysis integration
  conflictAnalyzer: ConflictAnalyzer;
}
```

## Testing and Validation

### Conflict Resolution Testing
- **Synthetic Conflicts**: Generate known conflict scenarios
- **Concurrent Editing**: Simulate multiple users editing simultaneously
- **Network Partitions**: Test behavior during network splits
- **Recovery Testing**: Verify data recovery after failures

### Performance Testing
- **Sync Latency**: Measure synchronization times under various conditions
- **Battery Usage**: Profile battery consumption during sync operations
- **Memory Usage**: Monitor memory consumption during conflict resolution
- **Scale Testing**: Test with large documents and many concurrent users

### Data Integrity Testing
- **Zero Loss Verification**: Ensure no operations are lost during failures
- **Convergence Testing**: Verify all replicas converge to same state
- **Corruption Detection**: Test recovery from corrupted state
- **Cross-Platform Compatibility**: Verify sync between different platforms

This comprehensive approach ensures that Proof Editor achieves its ambitious NFRs for data consistency, user-friendly collaboration, and zero data loss while maintaining excellent performance across all platforms.