import 'reflect-metadata';

import { ok } from 'neverthrow';
import { vi } from 'vitest';

import type { IAtomicArgumentRepository } from '../../domain/repositories/IAtomicArgumentRepository.js';
import type { INodeRepository } from '../../domain/repositories/INodeRepository.js';
import type { IStatementRepository } from '../../domain/repositories/IStatementRepository.js';
import type { ITreeRepository } from '../../domain/repositories/ITreeRepository.js';
import { createTestContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';

export function createMockedTestContainer(): {
  container: ReturnType<typeof createTestContainer>;
  mocks: {
    atomicArgumentRepo: IAtomicArgumentRepository;
    nodeRepo: INodeRepository;
    statementRepo: IStatementRepository;
    treeRepo: ITreeRepository;
  };
} {
  const container = createTestContainer();

  // Create mocked repositories with required methods
  const mockAtomicArgumentRepo: IAtomicArgumentRepository = {
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(ok(undefined)),
    exists: vi.fn().mockResolvedValue(false),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    findAll: vi.fn().mockResolvedValue([]),
    nextIdentity: vi.fn().mockReturnValue({ getValue: () => `arg-${Date.now()}` }),
    findArgumentsUsingStatement: vi.fn().mockResolvedValue(ok([])),
    findArgumentsWithConclusion: vi.fn().mockResolvedValue(ok([])),
  } as any;

  const mockNodeRepo: INodeRepository = {
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(ok(undefined)),
    exists: vi.fn().mockResolvedValue(false),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    findAll: vi.fn().mockResolvedValue([]),
    nextIdentity: vi.fn().mockReturnValue({ getValue: () => `node-${Date.now()}` }),
    findByTreeId: vi.fn().mockResolvedValue(ok([])),
    findByArgumentId: vi.fn().mockResolvedValue(ok([])),
  } as any;

  const mockStatementRepo: IStatementRepository = {
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(ok(undefined)),
    exists: vi.fn().mockResolvedValue(false),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    findAll: vi.fn().mockResolvedValue([]),
    nextIdentity: vi.fn().mockReturnValue({ getValue: () => `stmt-${Date.now()}` }),
    findByContent: vi.fn().mockResolvedValue(null),
  } as any;

  const mockTreeRepo: ITreeRepository = {
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(ok(undefined)),
    exists: vi.fn().mockResolvedValue(false),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    findAll: vi.fn().mockResolvedValue([]),
    nextIdentity: vi.fn().mockReturnValue({ getValue: () => `tree-${Date.now()}` }),
    findTreesContainingArgument: vi.fn().mockResolvedValue(ok([])),
  } as any;

  // Register mocked repositories
  container.registerInstance(TOKENS.IAtomicArgumentRepository, mockAtomicArgumentRepo);
  container.registerInstance(TOKENS.INodeRepository, mockNodeRepo);
  container.registerInstance(TOKENS.IStatementRepository, mockStatementRepo);
  container.registerInstance(TOKENS.ITreeRepository, mockTreeRepo);

  return {
    container,
    mocks: {
      atomicArgumentRepo: mockAtomicArgumentRepo,
      nodeRepo: mockNodeRepo,
      statementRepo: mockStatementRepo,
      treeRepo: mockTreeRepo,
    },
  };
}

export async function createServiceTestContainer(): Promise<{
  container: ReturnType<typeof createTestContainer>;
  mocks: {
    atomicArgumentRepo: IAtomicArgumentRepository;
    nodeRepo: INodeRepository;
    statementRepo: IStatementRepository;
    treeRepo: ITreeRepository;
  };
  resolve: <T>(token: string) => T;
}> {
  const { container, mocks } = createMockedTestContainer();

  // Register required infrastructure dependencies
  container.registerInstance('ExtensionContext', {
    subscriptions: [],
    workspaceState: {},
    globalState: {},
    extensionUri: { fsPath: '/mock/path' },
    extensionPath: '/mock/path',
    asAbsolutePath: (path: string) => `/mock/path/${path}`,
    storagePath: '/mock/storage',
    globalStoragePath: '/mock/global-storage',
    logPath: '/mock/log',
  });

  container.registerInstance(TOKENS.IFileSystemPort, {
    readFile: vi.fn().mockResolvedValue(ok('')),
    writeFile: vi.fn().mockResolvedValue(ok(undefined)),
    exists: vi.fn().mockResolvedValue(ok(true)),
    readDirectory: vi.fn().mockResolvedValue(ok([])),
    createDirectory: vi.fn().mockResolvedValue(ok(undefined)),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    stat: vi.fn().mockResolvedValue(ok({ type: 'file', size: 0, mtime: Date.now() })),
  });

  // Register mock transaction service
  container.registerInstance(TOKENS.IProofTransactionService, {
    beginTransaction: vi.fn().mockReturnValue({
      commit: vi.fn().mockResolvedValue(ok(undefined)),
      rollback: vi.fn().mockResolvedValue(ok(undefined)),
      isActive: vi.fn().mockReturnValue(true),
    }),
    executeInTransaction: vi.fn().mockImplementation(async (fn) => {
      const result = await fn();
      return result;
    }),
  });

  // Register package ecosystem mocks
  container.registerInstance(TOKENS.IDependencyRepository, vi.fn());
  container.registerInstance(TOKENS.IPackageRepository, vi.fn());
  container.registerInstance('IGitRefProvider', vi.fn());
  container.registerInstance('IGitPackageProvider', vi.fn());
  container.registerInstance('ILocalPackageProvider', vi.fn());

  // Register domain services for testing
  const { registerDomainServices, registerContextServices } = await import(
    '../../infrastructure/di/container.js'
  );

  await registerDomainServices(container);
  await registerContextServices(container);

  // Services will be automatically resolved by the container using the mocked dependencies
  return {
    container,
    mocks,
    // Helper to resolve services
    resolve: <T>(token: string): T => container.resolve<T>(token),
  };
}
