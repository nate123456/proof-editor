/**
 * System E2E Integration Tests - Real-World Scenarios
 *
 * Tests for realistic use cases including complex philosophical arguments,
 * educational workflows, collaborative editing, and production environment simulation.
 */

import {
  type ApplicationContainer,
  activate,
  afterEach,
  beforeAll,
  beforeEach,
  createTestSetup,
  type DocumentQueryService,
  describe,
  expect,
  generateComplexProofDocument,
  type IFileSystemPort,
  it,
  type PerformanceMetrics,
  type ProofVisualizationService,
  TOKENS,
  type TreeRenderer,
} from './shared/system-e2e-test-utils.js';

describe('System E2E - Real-World Scenario Tests', () => {
  let mockContext: any;
  let container: ApplicationContainer;
  let performanceMetrics: PerformanceMetrics;
  let mockDocument: any;
  let testSetup: ReturnType<typeof createTestSetup>;

  beforeAll(async () => {
    testSetup = createTestSetup();
    await testSetup.setup();
  });

  beforeEach(async () => {
    mockContext = testSetup.mockContext;
    container = testSetup.container;
    performanceMetrics = testSetup.performanceMetrics;
    mockDocument = testSetup.mockDocument;

    await activate(mockContext);
  });

  afterEach(async () => {
    try {
      await testSetup.teardown();
    } catch (_error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('5. Real-World Scenario Tests', () => {
    it('should handle complex philosophical argument construction', async () => {
      // Simulate constructing a complex philosophical argument with multiple premises
      const philosophicalProof = `
# The Argument from Design
# A complex philosophical proof with multiple interconnected arguments

statements:
  s1: "The universe exhibits apparent design and order"
  s2: "Complex specified information requires an intelligent source"
  s3: "The fine-tuning of physical constants suggests design"
  s4: "Biological systems show irreducible complexity"
  s5: "Natural selection can explain apparent design"
  s6: "Physical constants could vary by chance"
  s7: "Biological complexity emerges through gradual evolution"
  s8: "Therefore, the universe has an intelligent designer"
  s9: "Therefore, apparent design has natural explanations"

arguments:
  design_arg1:
    premises: [s1, s2]
    conclusions: [s8]
    metadata:
      rule: "Argument from Design"
      strength: "medium"
  
  design_arg2:
    premises: [s3, s4]
    conclusions: [s8]
    metadata:
      rule: "Fine-tuning Argument"
      strength: "medium"
  
  counter_arg1:
    premises: [s5, s7]
    conclusions: [s9]
    metadata:
      rule: "Evolutionary Counter-argument"
      strength: "high"
  
  counter_arg2:
    premises: [s6]
    conclusions: [s9]
    metadata:
      rule: "Multiverse Counter-argument"
      strength: "low"

trees:
- id: main_argument
  offset: { x: 0, y: 0 }
  nodes:
    n1: {arg: design_arg1}
    n2: {arg: design_arg2}
    n3: {n1: counter_arg1, on: 0}
    n4: {n2: counter_arg2, on: 0}

metadata:
  title: "The Argument from Design"
  domain: "Philosophy of Religion"
  complexity: "high"
  controversiality: "high"
  epistemic_status: "disputed"
`;

      mockDocument.getText.mockReturnValue(philosophicalProof);

      // Test complete processing of complex philosophical argument
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(philosophicalProof);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        const proofData = parseResult.value;

        // Verify complex structure is parsed correctly
        expect(proofData.statements).toBeDefined();
        expect(Object.keys(proofData.statements)).toHaveLength(9);
        expect(proofData.atomicArguments).toBeDefined();
        expect(Object.keys(proofData.atomicArguments)).toHaveLength(4);
        expect(proofData.trees).toBeDefined();
        expect(proofData.trees).toHaveLength(1);

        // Test visualization of complex argument
        const visualizationService = container.resolve<ProofVisualizationService>(
          TOKENS.ProofVisualizationService,
        );
        const vizResult = visualizationService.generateVisualization(proofData);

        expect(vizResult.isOk()).toBe(true);

        if (vizResult.isOk()) {
          const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);
          const svg = renderer.generateSVG(vizResult.value);

          // Should generate comprehensive visualization
          expect(svg).toContain('<svg');
          expect(svg).toContain('design_arg1');
          expect(svg).toContain('counter_arg1');
          expect(svg.length).toBeGreaterThan(5000); // Complex visualization
        }
      }

      performanceMetrics.operationCount++;
    });

    it('should handle educational proof construction workflow', async () => {
      // Simulate a teacher creating a proof for students
      const educationalProof = `
# Introduction to Logic: Modus Ponens
# Educational example for students learning basic logical inference

statements:
  premise1: "If it is raining, then the streets are wet"
  premise2: "It is raining"
  conclusion1: "Therefore, the streets are wet"
  
  premise3: "If the streets are wet, then driving is dangerous"
  conclusion2: "Therefore, driving is dangerous"

arguments:
  modus_ponens_1:
    premises: [premise1, premise2]
    conclusions: [conclusion1]
    metadata:
      rule: "Modus Ponens"
      difficulty: "beginner"
      example_type: "classic"
  
  modus_ponens_2:
    premises: [conclusion1, premise3]
    conclusions: [conclusion2]
    metadata:
      rule: "Modus Ponens"
      difficulty: "beginner"
      builds_on: "modus_ponens_1"

trees:
- id: logical_chain
  offset: { x: 50, y: 50 }
  nodes:
    step1: {arg: modus_ponens_1}
    step2: {step1: modus_ponens_2, on: 0}

metadata:
  title: "Modus Ponens Chain Example"
  audience: "undergraduate"
  subject: "Introduction to Logic"
  learning_objectives:
    - "Understand modus ponens inference rule"
    - "Practice chaining logical arguments"
    - "Visualize argument structure"
`;

      mockDocument.getText.mockReturnValue(educationalProof);

      // Test educational workflow
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(educationalProof);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        // Test that document was parsed successfully
        const proofData = parseResult.value;
        expect(proofData.id).toBeDefined();
        expect(proofData.version).toBeDefined();

        // Test argument chain validation
        const args = proofData.atomicArguments;
        expect(args.modus_ponens_1).toBeDefined();
        expect(args.modus_ponens_2).toBeDefined();

        // Test tree structure for educational clarity
        const treeIds = Object.keys(proofData.trees);
        const tree = treeIds.length > 0 && treeIds[0] ? proofData.trees[treeIds[0]] : undefined;
        if (tree) {
          expect(tree.rootNodeIds).toBeDefined();
          expect(tree.nodeCount).toBeGreaterThan(0);
        }

        // Test visualization for educational use
        const visualizationService = container.resolve<ProofVisualizationService>(
          TOKENS.ProofVisualizationService,
        );
        const vizResult = visualizationService.generateVisualization(proofData);

        expect(vizResult.isOk()).toBe(true);
      }

      performanceMetrics.operationCount++;
    });

    it('should handle collaborative editing scenario', async () => {
      // Simulate multiple users editing the same proof document
      const baseProof = generateComplexProofDocument(10, 5);

      // Test document versioning and conflict resolution
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);

      const document1 = {
        id: 'collab-proof',
        content: baseProof,
        metadata: {
          id: 'collab-proof',
          title: 'Collaborative Proof',
          modifiedAt: new Date(Date.now() - 1000),
          size: baseProof.length,
          syncStatus: 'synced' as const,
        },
        version: 1,
      };

      const document2 = {
        ...document1,
        content: `${baseProof}\n# User 2 addition`,
        metadata: {
          ...document1.metadata,
          modifiedAt: new Date(),
        },
        version: 2,
      };

      // Store initial version
      const store1Result = await fileSystemPort.storeDocument(document1);
      expect(store1Result.isOk()).toBe(true);

      // Store updated version (simulating another user's changes)
      const store2Result = await fileSystemPort.storeDocument(document2);
      expect(store2Result.isOk()).toBe(true);

      // Retrieve and verify versioning
      const retrieveResult = await fileSystemPort.getStoredDocument('collab-proof');
      expect(retrieveResult.isOk()).toBe(true);

      if (retrieveResult.isOk() && retrieveResult.value) {
        expect(retrieveResult.value.version).toBe(2);
        expect(retrieveResult.value.content).toContain('User 2 addition');
      }

      performanceMetrics.operationCount++;
    });

    it('should handle production environment simulation with realistic constraints', async () => {
      // Simulate production environment constraints
      const constraints = {
        maxMemoryMB: 512,
        maxProcessingTimeMs: 30000,
        maxConcurrentOperations: 10,
        networkLatencyMs: 100,
      };

      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const startTime = Date.now();

      // Test multiple concurrent users with realistic document sizes
      const userOperations = Array.from(
        { length: constraints.maxConcurrentOperations },
        async (_, _userId) => {
          // Simulate network latency
          await new Promise((resolve) => setTimeout(resolve, constraints.networkLatencyMs));

          const userProof = generateComplexProofDocument(
            Math.floor(Math.random() * 100) + 50, // 50-150 statements
            Math.floor(Math.random() * 50) + 25, // 25-75 arguments
          );

          const documentQueryService = container.resolve<DocumentQueryService>(
            TOKENS.DocumentQueryService,
          );
          return documentQueryService.parseDocumentContent(userProof);
        },
      );

      const results = await Promise.all(userOperations);

      const totalTime = Date.now() - startTime;
      const peakMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryIncrease = peakMemory - startMemory;

      // Verify production constraints are met
      expect(totalTime).toBeLessThan(constraints.maxProcessingTimeMs);
      expect(memoryIncrease).toBeLessThan(constraints.maxMemoryMB);

      // All operations should succeed
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      // System should remain responsive under production load
      const avgResponseTime = totalTime / constraints.maxConcurrentOperations;
      expect(avgResponseTime).toBeLessThan(5000); // Under 5s average response time

      performanceMetrics.operationCount += constraints.maxConcurrentOperations;
    });
  });
});
