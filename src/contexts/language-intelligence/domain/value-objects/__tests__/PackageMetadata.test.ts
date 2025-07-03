/**
 * Tests for PackageMetadata value object
 *
 * Focuses on:
 * - Package metadata creation and validation
 * - Timestamp management and age calculations
 * - Tag and dependency management
 * - Documentation and configuration handling
 * - Immutable updates and equality checking
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors';
import {
  EducationalSettingsFactory,
  PackageConfiguration,
  PackageDocumentation,
  PackageMetadata,
  type PackageMetadataOptions,
  PerformanceSettingsFactory,
} from '../PackageMetadata';
import { Timestamp } from '../Timestamp';

describe('PackageMetadata', () => {
  let mockTimestamp: Timestamp;

  beforeEach(() => {
    // Mock Timestamp.now() to return consistent values
    mockTimestamp = Timestamp.now();
    vi.spyOn(Timestamp, 'now').mockReturnValue(mockTimestamp);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create valid package metadata with minimal parameters', () => {
      const result = PackageMetadata.create('Test package description', 'John Doe');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getDescription()).toBe('Test package description');
        expect(metadata.getAuthor()).toBe('John Doe');
        expect(metadata.getLicense()).toBe('MIT');
        expect(metadata.getHomepage()).toBeNull();
        expect(metadata.getRepository()).toBeNull();
        expect(metadata.getTags()).toEqual([]);
        expect(metadata.getDependencies()).toEqual([]);
      }
    });

    it('should create valid package metadata with custom license', () => {
      const result = PackageMetadata.create('Test package', 'Jane Doe', 'Apache-2.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getLicense()).toBe('Apache-2.0');
      }
    });

    it('should create valid package metadata with full options', () => {
      const options: PackageMetadataOptions = {
        homepage: 'https://example.com',
        repository: 'https://github.com/user/repo',
        tags: ['logic', 'formal-verification'],
        dependencies: ['core-package', 'utils'],
      };

      const result = PackageMetadata.create('Advanced package', 'Developer', 'MIT', options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getHomepage()).toBe('https://example.com');
        expect(metadata.getRepository()).toBe('https://github.com/user/repo');
        expect(metadata.getTags()).toEqual(['logic', 'formal-verification']);
        expect(metadata.getDependencies()).toEqual(['core-package', 'utils']);
      }
    });

    it('should fail when description is empty', () => {
      const result = PackageMetadata.create('', 'John Doe');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('description cannot be empty');
      }
    });

    it('should fail when description is only whitespace', () => {
      const result = PackageMetadata.create('   ', 'John Doe');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('description cannot be empty');
      }
    });

    it('should fail when author is empty', () => {
      const result = PackageMetadata.create('Valid description', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('author cannot be empty');
      }
    });

    it('should fail when author is only whitespace', () => {
      const result = PackageMetadata.create('Valid description', '   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('author cannot be empty');
      }
    });

    it('should fail when description exceeds 500 characters', () => {
      const longDescription = 'A'.repeat(501);
      const result = PackageMetadata.create(longDescription, 'John Doe');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('cannot exceed 500 characters');
      }
    });

    it('should trim whitespace from description and author', () => {
      const result = PackageMetadata.create('  Test description  ', '  Jane Doe  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getDescription()).toBe('Test description');
        expect(metadata.getAuthor()).toBe('Jane Doe');
      }
    });

    it('should set created and updated timestamps to now when not provided', () => {
      const result = PackageMetadata.create('Test package', 'Author');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getCreatedAt()).toBe(mockTimestamp);
        expect(metadata.getUpdatedAt()).toBe(mockTimestamp);
      }
    });

    it('should use provided timestamps when specified', () => {
      const customCreatedResult = Timestamp.fromMilliseconds(Date.now() - 100000);
      const customUpdatedResult = Timestamp.fromMilliseconds(Date.now() - 50000);

      expect(customCreatedResult.isOk()).toBe(true);
      expect(customUpdatedResult.isOk()).toBe(true);

      const customCreated = customCreatedResult.isOk()
        ? customCreatedResult.value
        : Timestamp.now();
      const customUpdated = customUpdatedResult.isOk()
        ? customUpdatedResult.value
        : Timestamp.now();

      const options: PackageMetadataOptions = {
        createdAt: customCreated,
        updatedAt: customUpdated,
      };

      const result = PackageMetadata.create('Test package', 'Author', 'MIT', options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getCreatedAt()).toBe(customCreated);
        expect(metadata.getUpdatedAt()).toBe(customUpdated);
      }
    });
  });

  describe('predefined creators', () => {
    it('should create default package metadata', () => {
      const metadata = PackageMetadata.createDefault();

      expect(metadata.getDescription()).toBe('Default language package');
      expect(metadata.getAuthor()).toBe('System');
      expect(metadata.getLicense()).toBe('MIT');
      expect(metadata.getHomepage()).toBeNull();
      expect(metadata.getRepository()).toBeNull();
      expect(metadata.getTags()).toEqual([]);
      expect(metadata.getDependencies()).toEqual([]);
    });

    it('should create modal logic package metadata', () => {
      const result = PackageMetadata.createForModalLogic();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getDescription()).toContain('Modal logic');
        expect(metadata.getAuthor()).toBe('Proof Editor System');
        expect(metadata.getTags()).toContain('modal-logic');
        expect(metadata.getTags()).toContain('necessity');
        expect(metadata.getTags()).toContain('possibility');
        expect(metadata.getTags()).toContain('formal-logic');
      }
    });

    it('should create propositional logic package metadata', () => {
      const result = PackageMetadata.createForPropositionalLogic();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getDescription()).toContain('Propositional logic');
        expect(metadata.getAuthor()).toBe('Proof Editor System');
        expect(metadata.getTags()).toContain('propositional-logic');
        expect(metadata.getTags()).toContain('boolean-algebra');
        expect(metadata.getTags()).toContain('truth-tables');
        expect(metadata.getTags()).toContain('formal-logic');
      }
    });
  });

  describe('tag management', () => {
    let metadata: PackageMetadata;

    beforeEach(() => {
      const result = PackageMetadata.create('Test package', 'Author', 'MIT', {
        tags: ['existing-tag', 'another-tag'],
      });
      if (result.isOk()) {
        metadata = result.value;
      }
    });

    it('should check if tag exists', () => {
      expect(metadata.hasTag('existing-tag')).toBe(true);
      expect(metadata.hasTag('EXISTING-TAG')).toBe(true); // Case insensitive
      expect(metadata.hasTag('non-existent')).toBe(false);
    });

    it('should add new tag', () => {
      const updated = metadata.addTag('new-tag');

      expect(updated.getTags()).toContain('new-tag');
      expect(updated.getTags()).toContain('existing-tag');
      expect(updated.getTags()).toContain('another-tag');
      expect(updated.getTags()).toHaveLength(3);
    });

    it('should not add duplicate tag', () => {
      const updated = metadata.addTag('existing-tag');

      expect(updated.getTags()).toHaveLength(2); // Same length
      expect(updated).toBe(metadata); // Should return same instance
    });

    it('should add tag in lowercase', () => {
      const updated = metadata.addTag('NEW-TAG');

      expect(updated.getTags()).toContain('new-tag');
      expect(updated.getTags()).not.toContain('NEW-TAG');
    });

    it('should remove existing tag', () => {
      const updated = metadata.removeTag('existing-tag');

      expect(updated.getTags()).not.toContain('existing-tag');
      expect(updated.getTags()).toContain('another-tag');
      expect(updated.getTags()).toHaveLength(1);
    });

    it('should handle removing non-existent tag', () => {
      const updated = metadata.removeTag('non-existent');

      expect(updated.getTags()).toEqual(metadata.getTags());
    });

    it('should remove tag case-insensitively', () => {
      const updated = metadata.removeTag('EXISTING-TAG');

      expect(updated.getTags()).not.toContain('existing-tag');
    });
  });

  describe('dependency management', () => {
    let metadata: PackageMetadata;

    beforeEach(() => {
      const result = PackageMetadata.create('Test package', 'Author', 'MIT', {
        dependencies: ['core-lib', 'utils-lib'],
      });
      if (result.isOk()) {
        metadata = result.value;
      }
    });

    it('should check if dependency exists', () => {
      expect(metadata.hasDependency('core-lib')).toBe(true);
      expect(metadata.hasDependency('utils-lib')).toBe(true);
      expect(metadata.hasDependency('non-existent')).toBe(false);
    });

    it('should return readonly dependencies array', () => {
      const deps = metadata.getDependencies();
      expect(deps).toEqual(['core-lib', 'utils-lib']);

      // Should be readonly
      expect(() => {
        (deps as string[]).push('new-dep');
      }).toThrow();
    });
  });

  describe('timestamp operations', () => {
    it('should identify recently updated packages', () => {
      // Mock current time
      const now = Date.now();
      const recentTime = now - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const timestampResult = Timestamp.fromMilliseconds(recentTime);
      expect(timestampResult.isOk()).toBe(true);
      const recentTimestamp = timestampResult.isOk() ? timestampResult.value : Timestamp.now();
      const result = PackageMetadata.create('Test package', 'Author', 'MIT', {
        updatedAt: recentTimestamp,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.isRecentlyUpdated()).toBe(true);
      }
    });

    it('should identify old packages', () => {
      const now = Date.now();
      const oldTime = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const timestampResult = Timestamp.fromMilliseconds(oldTime);
      expect(timestampResult.isOk()).toBe(true);
      const oldTimestamp = timestampResult.isOk() ? timestampResult.value : Timestamp.now();
      const result = PackageMetadata.create('Test package', 'Author', 'MIT', {
        updatedAt: oldTimestamp,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.isRecentlyUpdated()).toBe(false);
      }
    });

    it('should identify recently created packages', () => {
      const now = Date.now();
      const recentTime = now - 15 * 24 * 60 * 60 * 1000; // 15 days ago
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const timestampResult = Timestamp.fromMilliseconds(recentTime);
      expect(timestampResult.isOk()).toBe(true);
      const recentTimestamp = timestampResult.isOk() ? timestampResult.value : Timestamp.now();
      const result = PackageMetadata.create('Test package', 'Author', 'MIT', {
        createdAt: recentTimestamp,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.isRecentlyCreated()).toBe(true);
      }
    });

    it('should identify old packages by creation date', () => {
      const now = Date.now();
      const oldTime = now - 60 * 24 * 60 * 60 * 1000; // 60 days ago
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const timestampResult = Timestamp.fromMilliseconds(oldTime);
      expect(timestampResult.isOk()).toBe(true);
      const oldTimestamp = timestampResult.isOk() ? timestampResult.value : Timestamp.now();
      const result = PackageMetadata.create('Test package', 'Author', 'MIT', {
        createdAt: oldTimestamp,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.isRecentlyCreated()).toBe(false);
      }
    });

    it('should calculate package age correctly', () => {
      const mockAge = 86400000; // 1 day in ms
      vi.spyOn(mockTimestamp, 'getAge').mockReturnValue(mockAge);

      const result = PackageMetadata.create('Test package', 'Author');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getAge()).toBe(mockAge);
      }
    });
  });

  describe('immutable updates', () => {
    let originalMetadata: PackageMetadata;

    beforeEach(() => {
      const result = PackageMetadata.create('Original description', 'Original Author');
      if (result.isOk()) {
        originalMetadata = result.value;
      }
    });

    it('should create new instance with updated timestamp', () => {
      const newTimestamp = Timestamp.now();
      vi.spyOn(Timestamp, 'now').mockReturnValue(newTimestamp);

      const updated = originalMetadata.withUpdatedTimestamp();

      expect(updated).not.toBe(originalMetadata);
      expect(updated.getUpdatedAt()).toBe(newTimestamp);
      expect(updated.getCreatedAt()).toBe(originalMetadata.getCreatedAt());
      expect(updated.getDescription()).toBe(originalMetadata.getDescription());
    });

    it('should create new instance with updated description', () => {
      const newTimestamp = Timestamp.now();
      vi.spyOn(Timestamp, 'now').mockReturnValue(newTimestamp);

      const result = originalMetadata.withDescription('New description');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updated = result.value;
        expect(updated).not.toBe(originalMetadata);
        expect(updated.getDescription()).toBe('New description');
        expect(updated.getAuthor()).toBe(originalMetadata.getAuthor());
        expect(updated.getUpdatedAt()).toBe(newTimestamp);
      }
    });

    it('should fail to update with invalid description', () => {
      const result = originalMetadata.withDescription('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('description cannot be empty');
      }
    });

    it('should fail to update with description exceeding length limit', () => {
      const longDescription = 'A'.repeat(501);
      const result = originalMetadata.withDescription(longDescription);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('cannot exceed 500 characters');
      }
    });

    it('should update timestamp when adding tags', () => {
      const newTimestamp = Timestamp.now();
      vi.spyOn(Timestamp, 'now').mockReturnValue(newTimestamp);

      const updated = originalMetadata.addTag('new-tag');

      expect(updated.getUpdatedAt()).toBe(newTimestamp);
    });

    it('should update timestamp when removing tags', () => {
      const taggedMetadata = originalMetadata.addTag('test-tag');
      const newTimestamp = Timestamp.now();
      vi.spyOn(Timestamp, 'now').mockReturnValue(newTimestamp);

      const updated = taggedMetadata.removeTag('test-tag');

      expect(updated.getUpdatedAt()).toBe(newTimestamp);
    });
  });

  describe('equality comparison', () => {
    it('should identify equal metadata', () => {
      const result1 = PackageMetadata.create('Same description', 'Same Author', 'MIT', {
        homepage: 'https://example.com',
        repository: 'https://github.com/user/repo',
      });

      const result2 = PackageMetadata.create('Same description', 'Same Author', 'MIT', {
        homepage: 'https://example.com',
        repository: 'https://github.com/user/repo',
      });

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should identify different metadata by description', () => {
      const result1 = PackageMetadata.create('Description 1', 'Same Author');
      const result2 = PackageMetadata.create('Description 2', 'Same Author');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should identify different metadata by author', () => {
      const result1 = PackageMetadata.create('Same description', 'Author 1');
      const result2 = PackageMetadata.create('Same description', 'Author 2');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should identify different metadata by homepage', () => {
      const result1 = PackageMetadata.create('Same description', 'Same Author', 'MIT', {
        homepage: 'https://site1.com',
      });
      const result2 = PackageMetadata.create('Same description', 'Same Author', 'MIT', {
        homepage: 'https://site2.com',
      });

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should handle null values in equality comparison', () => {
      const result1 = PackageMetadata.create('Same description', 'Same Author');
      const result2 = PackageMetadata.create('Same description', 'Same Author');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('documentation and configuration', () => {
    it('should have default documentation when not provided', () => {
      const result = PackageMetadata.create('Test package', 'Author');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        const docs = metadata.getDocumentation();
        expect(docs).toBeDefined();
        expect(docs.getTitle()).toBe('Default Package');
      }
    });

    it('should have default configuration when not provided', () => {
      const result = PackageMetadata.create('Test package', 'Author');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        const config = metadata.getConfiguration();
        expect(config).toBeDefined();
        expect(config.getDefaultValidationLevel()).toBe('semantic');
      }
    });

    it('should use provided documentation', () => {
      const customDocs = PackageDocumentation.create('Custom Title', 'Custom overview');
      const result = PackageMetadata.create('Test package', 'Author', 'MIT', {
        documentation: customDocs,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getDocumentation()).toBe(customDocs);
      }
    });

    it('should use provided configuration', () => {
      const customConfig = PackageConfiguration.createDefault();
      const result = PackageMetadata.create('Test package', 'Author', 'MIT', {
        configuration: customConfig,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getConfiguration()).toBe(customConfig);
      }
    });
  });
});

describe('PackageDocumentation', () => {
  describe('create', () => {
    it('should create documentation with all parameters', () => {
      const features = ['Feature 1', 'Feature 2'];
      const examples = ['Example 1', 'Example 2'];
      const apiRef = ['API 1', 'API 2'];

      const docs = PackageDocumentation.create('Title', 'Overview', features, examples, apiRef);

      expect(docs.getTitle()).toBe('Title');
      expect(docs.getOverview()).toBe('Overview');
      expect(docs.getFeatures()).toEqual(features);
      expect(docs.getExamples()).toEqual(examples);
      expect(docs.getApiReference()).toEqual(apiRef);
    });

    it('should create documentation with minimal parameters', () => {
      const docs = PackageDocumentation.create('Title', 'Overview');

      expect(docs.getTitle()).toBe('Title');
      expect(docs.getOverview()).toBe('Overview');
      expect(docs.getFeatures()).toEqual([]);
      expect(docs.getExamples()).toEqual([]);
      expect(docs.getApiReference()).toEqual([]);
    });

    it('should create default documentation', () => {
      const docs = PackageDocumentation.createDefault();

      expect(docs.getTitle()).toBe('Default Package');
      expect(docs.getOverview()).toBe('A default language package');
      expect(docs.getFeatures()).toEqual([]);
      expect(docs.getExamples()).toEqual([]);
      expect(docs.getApiReference()).toEqual([]);
    });
  });
});

describe('PackageConfiguration', () => {
  describe('createDefault', () => {
    it('should create default configuration', () => {
      const config = PackageConfiguration.createDefault();

      expect(config.getDefaultValidationLevel()).toBe('semantic');
      expect(config.getPerformanceSettings()).toBeDefined();
      expect(config.getEducationalSettings()).toBeDefined();
      expect(config.getCustomSettings()).toEqual({});
    });

    it('should return copy of custom settings', () => {
      const config = PackageConfiguration.createDefault();
      const settings1 = config.getCustomSettings();
      const settings2 = config.getCustomSettings();

      expect(settings1).not.toBe(settings2); // Different objects
      expect(settings1).toEqual(settings2); // Same content
    });
  });
});

describe('PerformanceSettingsFactory', () => {
  describe('createDefault', () => {
    it('should create default performance settings', () => {
      const settings = PerformanceSettingsFactory.createDefault();

      expect(settings.maxValidationTimeMs).toBe(10);
      expect(settings.enableCaching).toBe(true);
      expect(settings.enableParallelValidation).toBe(false);
    });
  });
});

describe('EducationalSettingsFactory', () => {
  describe('createDefault', () => {
    it('should create default educational settings', () => {
      const settings = EducationalSettingsFactory.createDefault();

      expect(settings.enableHints).toBe(true);
      expect(settings.enableStepByStep).toBe(true);
      expect(settings.difficultyLevel).toBe('intermediate');
    });
  });
});
