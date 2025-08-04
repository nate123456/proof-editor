import * as vscode from 'vscode';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import { NotificationMessage } from '../../domain/shared/value-objects/index.js';
import type { ApplicationContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import { autoSaveProofDocument, showProofTreeForDocument } from '../helpers/ProofTreeHelper.js';

export class TutorialService {
  private uiPort: IUIPort;
  private bootstrapController: BootstrapController;

  constructor(private readonly container: ApplicationContainer) {
    this.uiPort = container.resolve<IUIPort>(TOKENS.IUIPort);
    this.bootstrapController = container.resolve<BootstrapController>(TOKENS.BootstrapController);
  }

  public async startGuidedBootstrapTutorial(): Promise<void> {
    try {
      // Step 1: Welcome and overview
      const continueStep1 = await vscode.window.showInformationMessage(
        `🎯 **Proof Editor Tutorial**\n\nWelcome! This tutorial will guide you through creating your first proof.\n\nYou'll learn to:\n• Create atomic arguments\n• Connect premises to conclusions\n• Build argument trees\n• Visualize logical structure\n\nReady to start?`,
        "Let's Begin!",
        'Skip Tutorial',
      );

      if (continueStep1 !== "Let's Begin!") {
        return;
      }

      // Step 2: Explain the interface
      const continueStep2 = await vscode.window.showInformationMessage(
        `📋 **Step 1: Understanding the Interface**\n\nYou now have two main areas:\n\n1. **Text Editor** (left): Your .proof file with YAML structure\n2. **Proof Tree Panel** (right): Visual representation of your arguments\n\nThe tree panel shows a welcome message because you haven't created any arguments yet.`,
        'Got it!',
        'Skip Tutorial',
      );

      if (continueStep2 !== 'Got it!') {
        return;
      }

      // Step 3: Create first argument
      const continueStep3 = await vscode.window.showInformationMessage(
        `🏗️ **Step 2: Create Your First Argument**\n\nLet's create a simple logical argument. We'll use the classic:\n\n• **Premise 1**: All humans are mortal\n• **Premise 2**: Socrates is human\n• **Conclusion**: Therefore, Socrates is mortal\n\nClick the "Create First Argument" button in the tree panel!`,
        'I see it!',
        'Create It For Me',
        'Skip Tutorial',
      );

      if (continueStep3 === 'Skip Tutorial') {
        return;
      } else if (continueStep3 === 'Create It For Me') {
        // Auto-create the example argument
        await this.createExampleArgument();
      } else {
        // Wait for user to create the argument manually
        const infoResult = NotificationMessage.create(
          'Great! Click "Create First Argument" in the tree panel, then fill in the form with the example premises and conclusion.',
        );
        if (infoResult.isOk()) {
          this.uiPort.showInformation(infoResult.value);
        }

        // Give user time to create the argument
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      // Step 4: Explain what happened
      const continueStep4 = await vscode.window.showInformationMessage(
        `✨ **Step 3: Understanding Your Argument**\n\nCongratulations! You've created your first atomic argument.\n\nNotice how:\n• Your .proof file now has statements and arguments\n• The tree panel shows the visual structure\n• Premises are above the horizontal line\n• Conclusions are below the line\n\nThis is the building block of all proofs!`,
        'Awesome!',
        'Tell Me More',
        'Finish Tutorial',
      );

      if (continueStep4 === 'Finish Tutorial') {
        await this.finishTutorial();
        return;
      }

      // Step 5: Next steps
      const continueStep5 = await vscode.window.showInformationMessage(
        `🚀 **Step 4: What's Next?**\n\nNow you can:\n\n• **Create branches**: Select text and create supporting arguments\n• **Add more arguments**: Build complex reasoning chains\n• **Export your proof**: Share as YAML, JSON, or SVG\n• **Validate logic**: Use custom validation scripts\n\nTry creating another argument or exploring the menus!`,
        'Start Exploring!',
        'Show Advanced Features',
        'Finish Tutorial',
      );

      if (continueStep5 === 'Show Advanced Features') {
        await this.showAdvancedFeatures();
      } else {
        await this.finishTutorial();
      }
    } catch (error) {
      const errorResult = NotificationMessage.create(
        `Tutorial error: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (errorResult.isOk()) {
        this.uiPort.showError(errorResult.value);
      }
    }
  }

  private async createExampleArgument(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || activeEditor.document.languageId !== 'proof') {
      return;
    }

    try {
      const documentId = activeEditor.document.fileName;
      const premises = ['All humans are mortal', 'Socrates is human'];
      const conclusions = ['Therefore, Socrates is mortal'];
      const ruleName = 'Modus Ponens';

      const result = await this.bootstrapController.populateEmptyArgument(
        documentId,
        `tutorial-arg-${Date.now()}`,
        premises,
        conclusions,
        { left: ruleName },
      );

      if (result.isOk()) {
        await autoSaveProofDocument(activeEditor, this.container);
        await showProofTreeForDocument(activeEditor, this.container);
        const infoResult = NotificationMessage.create('✅ Example argument created successfully!');
        if (infoResult.isOk()) {
          this.uiPort.showInformation(infoResult.value);
        }
      }
    } catch (_error) {
      // Error creating example argument - user will be notified via UI
    }
  }

  private async showAdvancedFeatures(): Promise<void> {
    const features = await vscode.window.showQuickPick(
      [
        {
          label: '🔗 Branching & Connections',
          description: 'Create connected argument trees',
          detail: 'Learn how to build complex proofs by connecting multiple arguments',
        },
        {
          label: '📊 Visualization Features',
          description: 'Zoom, pan, and navigate large proofs',
          detail: 'Master the tree panel controls for complex argument visualization',
        },
        {
          label: '✅ Custom Validation',
          description: 'Write your own logic validators',
          detail: 'Add semantic meaning to your formal structures',
        },
        {
          label: '📤 Export & Sharing',
          description: 'Share proofs in multiple formats',
          detail: 'Export as YAML, JSON, SVG, or interactive HTML',
        },
        {
          label: '📱 Cross-Platform Features',
          description: 'Mobile and offline support',
          detail: 'Access your proofs anywhere, anytime',
        },
      ],
      {
        placeHolder: 'Choose an advanced feature to learn about...',
      },
    );

    if (features) {
      await vscode.window.showInformationMessage(
        `🎓 **${features.label}**\n\n${features.detail}\n\nThis feature will be covered in future tutorials as you become more comfortable with basic proof construction.`,
        'Got it!',
      );
    }

    await this.finishTutorial();
  }

  private async finishTutorial(): Promise<void> {
    const action = await vscode.window.showInformationMessage(
      `🎉 **Tutorial Complete!**\n\nYou're now ready to build amazing proofs!\n\n**Quick Tips:**\n• Use Ctrl+Shift+P for all commands\n• Right-click in the tree panel for context actions\n• Check the status bar for helpful information\n• Save often - your work is precious!\n\n**Need Help?**\nUse "Proof Editor: Show Bootstrap Workflow" anytime.`,
      'Start Building!',
      'Show Workflow',
      'Create Another Proof',
    );

    if (action === 'Show Workflow') {
      await vscode.commands.executeCommand('proofEditor.showBootstrapWorkflow');
    } else if (action === 'Create Another Proof') {
      await vscode.commands.executeCommand('proofEditor.createBootstrapDocument');
    } else {
      const infoResult = NotificationMessage.create('Happy proving! 🎯');
      if (infoResult.isOk()) {
        this.uiPort.showInformation(infoResult.value);
      }
    }
  }
}
