# COMPLETE-4: File Operations Integration

## Current Reality  
We have **complete document lifecycle infrastructure** but missing final integration:
- ✅ ProofFileParser parses .proof YAML files perfectly
- ✅ ProofDocument domain model handles all operations
- ✅ DocumentQueryService processes document content  
- ✅ VS Code file association and commands work
- ❌ ProofTreePanel doesn't integrate with VS Code document lifecycle
- ❌ Changes in webview don't save to actual .proof files

**Gap**: Webview operates independently of VS Code document system.

## What Actually Needs Building
Connect ProofTreePanel to VS Code document lifecycle for standard file operations.

### 1. Document Change Integration
**Current**: ProofTreePanel shows content but changes don't save  
**Need**: Webview changes trigger VS Code document edits  
**Implementation**: Use VS Code WorkspaceEdit API when arguments created

### 2. File Watcher Integration  
**Current**: External file changes don't update webview  
**Need**: File system changes refresh ProofTreePanel automatically  
**Implementation**: Listen to VS Code document change events

### 3. Standard Save/Undo Integration
**Current**: Users must manually save .proof files  
**Need**: Ctrl+S saves, Ctrl+Z undos like any VS Code file  
**Implementation**: Integrate with VS Code document dirty state

### 4. Multiple Document Support
**Current**: One ProofTreePanel per document unclear  
**Need**: Multiple .proof files can have separate panels  
**Implementation**: Panel management tied to document URIs

## Technical Implementation

### VS Code Document Integration
```typescript
// In extension.ts, register document change listener
vscode.workspace.onDidChangeTextDocument(async (event) => {
  if (event.document.languageId === 'proof') {
    // Update corresponding ProofTreePanel
    await updatePanelForDocument(event.document);
  }
});
```

### Document Edit Operations  
```typescript
// In ProofTreePanel, make actual document edits
private async applyDocumentEdit(changes: string): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  const uri = vscode.Uri.parse(this.documentUri);
  
  // Replace entire document content with updated YAML
  edit.replace(uri, new vscode.Range(0, 0, Number.MAX_VALUE, 0), changes);
  await vscode.workspace.applyEdit(edit);
}
```

### Panel Lifecycle Management
```typescript
// Manage multiple panels per document
class ProofTreePanelManager {
  private panels = new Map<string, ProofTreePanel>();
  
  async showPanelForDocument(document: vscode.TextDocument): Promise<void> {
    const existing = this.panels.get(document.uri.toString());
    if (existing) {
      existing.reveal();
    } else {
      // Create new panel using existing createWithServices
    }
  }
}
```

### Auto-Save Integration
```typescript
// In ProofTreePanel message handler
case 'documentChanged': {
  // Apply edit to VS Code document
  await this.applyDocumentEdit(newContent);
  
  // Let VS Code handle save state/indicators
  // Users get standard Ctrl+S, dirty indicators, etc.
  break;
}
```

## File Operations to Complete

### 1. Standard VS Code Integration
- **Dirty indicators**: Modified files show dot in tab
- **Auto-save**: Works with VS Code auto-save settings  
- **Undo/redo**: Standard Ctrl+Z works with webview changes
- **File explorer**: .proof files open in webview automatically

### 2. Multi-Document Support
- **Panel per document**: Each .proof file gets own panel
- **Panel reuse**: Opening same file focuses existing panel
- **Panel cleanup**: Closing document disposes associated panel

### 3. External Change Handling
- **File system changes**: External edits refresh webview content
- **Conflict resolution**: Handle concurrent edits gracefully
- **Error recovery**: Invalid file states don't crash panel

## Success Criteria
- [ ] Creating argument in webview saves to actual .proof file
- [ ] External edits to .proof file update webview automatically  
- [ ] Ctrl+S saves webview changes like any VS Code document
- [ ] Multiple .proof files can have separate panels open
- [ ] Dirty indicators and undo work as expected
- [ ] File explorer integration works seamlessly

## Dependencies
- Existing ProofTreePanel webview (integrate with VS Code)
- Existing ProofFileParser (use for serialization)  
- Existing VS Code file association (.proof files)
- Existing DocumentQueryService (use for content processing)

## Scope  
**Pure integration work** - connect existing webview to VS Code document system. No new domain logic or UI changes.

**Estimated effort**: 2-3 days of VS Code API integration.