import 'reflect-metadata';

import { vi } from 'vitest';

import type { IAtomicArgumentRepository } from '../../domain/repositories/IAtomicArgumentRepository.js';
import type { INodeRepository } from '../../domain/repositories/INodeRepository.js';
import type { IOrderedSetRepository } from '../../domain/repositories/IOrderedSetRepository.js';
import type { IStatementRepository } from '../../domain/repositories/IStatementRepository.js';
import type { ITreeRepository } from '../../domain/repositories/ITreeRepository.js';
import { createTestContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';

export function createMockedTestContainer(): {
  container: ReturnType<typeof createTestContainer>;
  mocks: {
    atomicArgumentRepo: IAtomicArgumentRepository;
    nodeRepo: INodeRepository;
    orderedSetRepo: IOrderedSetRepository;
    statementRepo: IStatementRepository;
    treeRepo: ITreeRepository;
  };
} {
  const container = createTestContainer();

  // Create mocked repositories using vitest
  const mockAtomicArgumentRepo = vi.fn() as unknown as IAtomicArgumentRepository;
  const mockNodeRepo = vi.fn() as unknown as INodeRepository;
  const mockOrderedSetRepo = vi.fn() as unknown as IOrderedSetRepository;
  const mockStatementRepo = vi.fn() as unknown as IStatementRepository;
  const mockTreeRepo = vi.fn() as unknown as ITreeRepository;

  // Register mocked repositories
  container.registerInstance(TOKENS.IAtomicArgumentRepository, mockAtomicArgumentRepo);
  container.registerInstance(TOKENS.INodeRepository, mockNodeRepo);
  container.registerInstance(TOKENS.IOrderedSetRepository, mockOrderedSetRepo);
  container.registerInstance(TOKENS.IStatementRepository, mockStatementRepo);
  container.registerInstance(TOKENS.ITreeRepository, mockTreeRepo);

  return {
    container,
    mocks: {
      atomicArgumentRepo: mockAtomicArgumentRepo,
      nodeRepo: mockNodeRepo,
      orderedSetRepo: mockOrderedSetRepo,
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
    orderedSetRepo: IOrderedSetRepository;
    statementRepo: IStatementRepository;
    treeRepo: ITreeRepository;
  };
  resolve: <T>(token: string) => T;
}> {
  const { container, mocks } = createMockedTestContainer();

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
