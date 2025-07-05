# COMPLETE-1: ProofTreePanel Command Integration

## Current Reality
ProofTreePanel.ts has a **complete sophisticated webview interface** but the command handlers have TODOs:
- Line 792: "Command execution not yet implemented in ProofTreePanel"
- Line 826: "Feature coming soon!" for adding statements
- Line 847: "Export functionality not yet implemented"

**The webview UI works perfectly** - users can fill forms, click buttons, see bootstrap overlay. We just need to **wire up the backend**.

## What Actually Needs Building
Connect existing ProofTreePanel webview to existing BootstrapController and services.

### 1. Wire Up handleCreateArgument (Line 767)
**Current State**: Shows error "Command execution not yet implemented"  
**Need**: Execute existing `CreateBootstrapArgumentCommand` via BootstrapController  
**Implementation**: Inject BootstrapController into ProofTreePanel, call existing command

### 2. Wire Up handleAddStatement (Line 808) 
**Current State**: Shows "Feature coming soon!"  
**Need**: Execute existing statement commands via ProofApplicationService  
**Implementation**: Inject ProofApplicationService, call existing add statement methods

### 3. Wire Up handleExportProof (Line 837)
**Current State**: Shows "Export functionality not yet implemented"  
**Need**: Generate YAML output from existing DocumentQueryService  
**Implementation**: Use existing visualization services to export current state

### 4. Fix refreshContent (Line 871)
**Current State**: Empty TODO method  
**Need**: Reload document content after changes  
**Implementation**: Re-call updateContent with fresh document content

## Technical Implementation

### Service Injection Pattern
```typescript
// ProofTreePanel constructor needs additional services
private readonly bootstrapController: BootstrapController,
private readonly proofApplicationService: ProofApplicationService,
```

### Command Execution Pattern  
```typescript
// handleCreateArgument implementation
const command: CreateBootstrapArgumentCommand = {
  documentId,
  premises: msg.premises as string[],
  conclusions: msg.conclusions as string[],
  ruleName: msg.ruleName as string
};

const result = await this.bootstrapController.createBootstrapArgument(command);
```

## Success Criteria
- [ ] Users can create arguments via webview forms (backend executes)
- [ ] Users can add statements to existing arguments  
- [ ] Export button generates proper YAML file
- [ ] Document refreshes after changes show in webview
- [ ] All existing webview UI functionality works end-to-end

## Dependencies
- Existing BootstrapController (complete)
- Existing ProofApplicationService (complete)  
- Existing DocumentQueryService (complete)
- Existing ProofTreePanel webview (complete)

## Scope
**Pure integration work** - no new UI, no new domain logic, no new commands. Just connect existing webview to existing services.

**Estimated effort**: 2-3 hours of wiring up injection and method calls.