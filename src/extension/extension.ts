import * as vscode from 'vscode';

import { ValidationController } from '../validation/index.js';
import { ProofTreePanel } from '../webview/ProofTreePanel.js';

export function activate(context: vscode.ExtensionContext) {
  // Initialize validation controller
  const validationController = new ValidationController();

  // Register command to show proof tree visualization
  const showTreeCommand = vscode.commands.registerCommand('proofEditor.showTree', () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'proof') {
      ProofTreePanel.createOrShow(context.extensionUri, activeEditor.document.getText());
    } else {
      vscode.window.showWarningMessage('Please open a .proof file to view the tree visualization.');
    }
  });

  // Auto-show tree and validate when proof file is opened
  const onOpenDisposable = vscode.workspace.onDidOpenTextDocument(
    (document: vscode.TextDocument) => {
      if (document.languageId === 'proof') {
        showProofFileOpenedMessage(document.fileName);
        ProofTreePanel.createOrShow(context.extensionUri, document.getText());
        validationController.validateDocumentImmediate(document);
      }
    }
  );

  // Update tree and validate when proof file content changes
  const onChangeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document.languageId === 'proof') {
      ProofTreePanel.updateContentIfExists(event.document.getText());
      validationController.validateDocumentDebounced(event.document);
    }
  });

  // Handle active editor changes
  const onEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && editor.document.languageId === 'proof') {
      ProofTreePanel.createOrShow(context.extensionUri, editor.document.getText());
      validationController.validateDocumentImmediate(editor.document);
    }
  });

  // Clean up diagnostics when documents are closed
  const onCloseDisposable = vscode.workspace.onDidCloseTextDocument(document => {
    if (document.languageId === 'proof') {
      validationController.clearDocumentValidation(document);
    }
  });

  context.subscriptions.push(
    validationController,
    showTreeCommand,
    onOpenDisposable,
    onChangeDisposable,
    onEditorChangeDisposable,
    onCloseDisposable
  );

  checkForExistingProofFiles(context.extensionUri);
}

export function deactivate() {
  // Extension deactivated
}

function showProofFileOpenedMessage(fileName: string) {
  const shortName = fileName.split('/').pop() ?? fileName;
  vscode.window.showInformationMessage(`Proof Editor: Working with ${shortName}`);
}

function checkForExistingProofFiles(extensionUri: vscode.Uri) {
  vscode.workspace.textDocuments.forEach((document: vscode.TextDocument) => {
    if (document.languageId === 'proof') {
      ProofTreePanel.createOrShow(extensionUri, document.getText());
    }
  });
}
