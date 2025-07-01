import { type Result } from 'neverthrow';

import { type InferenceRule } from '../entities/InferenceRule';
import { type RepositoryError } from '../errors/DomainErrors';
import { type InferenceRuleId } from '../value-objects/InferenceRuleId';
import { type RuleName } from '../value-objects/RuleName';

export interface IInferenceRuleRepository {
  save(rule: InferenceRule): Promise<Result<void, RepositoryError>>;
  findById(id: InferenceRuleId): Promise<InferenceRule | null>;
  findByName(name: RuleName): Promise<InferenceRule | null>;
  findByLanguagePackageId(languagePackageId: string): Promise<InferenceRule[]>;
  findActiveRules(): Promise<InferenceRule[]>;
  findAll(): Promise<InferenceRule[]>;
  delete(id: InferenceRuleId): Promise<Result<void, RepositoryError>>;
}
