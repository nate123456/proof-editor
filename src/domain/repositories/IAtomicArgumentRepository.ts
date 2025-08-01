import type { AtomicArgument } from '../entities/AtomicArgument';
import type { AtomicArgumentId } from '../shared/value-objects/index.js';
import type { IRepository } from './base/index.js';
import type { IAtomicArgumentCommandRepository } from './IAtomicArgumentCommandRepository.js';
import type { IAtomicArgumentQueryRepository } from './IAtomicArgumentQueryRepository.js';

export interface IAtomicArgumentRepository
  extends IRepository<AtomicArgument, AtomicArgumentId>,
    IAtomicArgumentCommandRepository,
    IAtomicArgumentQueryRepository {}
