import type { AtomicArgument } from '../entities/AtomicArgument';
import type { AtomicArgumentId } from '../shared/value-objects/index.js';
import type { ICommandRepository } from './base/index.js';

export interface IAtomicArgumentCommandRepository
  extends ICommandRepository<AtomicArgument, AtomicArgumentId> {}
