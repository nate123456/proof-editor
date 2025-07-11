/**
 * Test suite for AtomicArgument bootstrap and population methods
 *
 * Focuses on:
 * - Bootstrap argument creation and properties
 * - Population capability detection
 * - Bootstrap state transitions
 * - Alias method consistency (isBootstrap)
 * - Empty argument handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { orderedSetIdFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';
import { FIXED_TIMESTAMP } from './atomic-argument-test-utils.js';

describe('Bootstrap and Population Methods', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('createBootstrap factory method', () => {
    it('should create bootstrap arguments directly', () => {
      const bootstrapArgument = AtomicArgument.createBootstrap();

      expect(bootstrapArgument).toBeInstanceOf(AtomicArgument);
      expect(bootstrapArgument.getPremiseSet()).toBeNull();
      expect(bootstrapArgument.getConclusionSet()).toBeNull();
      expect(bootstrapArgument.isBootstrapArgument()).toBe(true);
      expect(bootstrapArgument.isBootstrap()).toBe(true);
      expect(bootstrapArgument.isEmpty()).toBe(true);
      expect(bootstrapArgument.isComplete()).toBe(false);
      expect(bootstrapArgument.canPopulate()).toBe(true);
      expect(bootstrapArgument.getSideLabels()).toEqual({});
      expect(bootstrapArgument.hasSideLabels()).toBe(false);
      customExpect(bootstrapArgument).toBeValidAtomicArgument();
    });

    it('should create bootstrap arguments with consistent timestamps', () => {
      const bootstrapArgument = AtomicArgument.createBootstrap();

      expect(bootstrapArgument.getCreatedAt()).toBe(bootstrapArgument.getModifiedAt());
      expect(bootstrapArgument.getCreatedAt()).toBe(FIXED_TIMESTAMP);
    });

    it('should create unique bootstrap arguments', () => {
      const bootstrap1 = AtomicArgument.createBootstrap();
      const bootstrap2 = AtomicArgument.createBootstrap();

      expect(bootstrap1.getId().equals(bootstrap2.getId())).toBe(false);
      expect(bootstrap1.equals(bootstrap2)).toBe(false);
    });

    it('should create bootstrap equivalent to empty create()', () => {
      const bootstrapDirect = AtomicArgument.createBootstrap();
      const bootstrapViaCreate = AtomicArgument.create();

      expect(bootstrapViaCreate.isOk()).toBe(true);
      if (bootstrapViaCreate.isOk()) {
        const viaCreate = bootstrapViaCreate.value;

        // Both should be bootstrap arguments
        expect(bootstrapDirect.isBootstrap()).toBe(true);
        expect(viaCreate.isBootstrap()).toBe(true);

        // Both should have same state (except ID)
        expect(bootstrapDirect.getPremiseSet()).toBe(viaCreate.getPremiseSet());
        expect(bootstrapDirect.getConclusionSet()).toBe(viaCreate.getConclusionSet());
        expect(bootstrapDirect.isEmpty()).toBe(viaCreate.isEmpty());
        expect(bootstrapDirect.canPopulate()).toBe(viaCreate.canPopulate());
      }
    });
  });

  describe('canPopulate method', () => {
    it('should return true for bootstrap arguments', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.canPopulate()).toBe(true);
        expect(argument.isBootstrap()).toBe(true);
        expect(argument.isBootstrapArgument()).toBe(true);
      }
    });

    it('should return false for non-bootstrap arguments', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(premiseSetRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.canPopulate()).toBe(false);
        expect(argument.isBootstrap()).toBe(false);
        expect(argument.isBootstrapArgument()).toBe(false);
      }
    });

    it('should return false for complete arguments', () => {
      const argument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );
      expect(argument.canPopulate()).toBe(false);
      expect(argument.isBootstrap()).toBe(false);
    });

    it('should track population capability through state transitions', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Initially can populate
        expect(argument.canPopulate()).toBe(true);

        // Add premise - no longer can populate
        argument.setPremiseSetRef(orderedSetIdFactory.build());
        expect(argument.canPopulate()).toBe(false);

        // Remove premise - can populate again
        argument.setPremiseSetRef(null);
        expect(argument.canPopulate()).toBe(true);

        // Add conclusion - cannot populate
        argument.setConclusionSetRef(orderedSetIdFactory.build());
        expect(argument.canPopulate()).toBe(false);

        // Clear everything - can populate again
        argument.setConclusionSetRef(null);
        expect(argument.canPopulate()).toBe(true);
      }
    });
  });

  describe('isBootstrap alias method', () => {
    it('should work as alias for isBootstrapArgument', () => {
      const bootstrapResult = AtomicArgument.create();
      const completeArgument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      expect(bootstrapResult.isOk()).toBe(true);
      if (bootstrapResult.isOk()) {
        const bootstrap = bootstrapResult.value;
        expect(bootstrap.isBootstrap()).toBe(bootstrap.isBootstrapArgument());
        expect(bootstrap.isBootstrap()).toBe(true);
      }

      expect(completeArgument.isBootstrap()).toBe(completeArgument.isBootstrapArgument());
      expect(completeArgument.isBootstrap()).toBe(false);
    });

    it('should maintain consistency across all bootstrap-related methods', () => {
      const testCases = [
        { desc: 'empty', create: () => AtomicArgument.create() },
        { desc: 'premise only', create: () => AtomicArgument.create(orderedSetIdFactory.build()) },
        {
          desc: 'conclusion only',
          create: () => AtomicArgument.create(undefined, orderedSetIdFactory.build()),
        },
        {
          desc: 'complete',
          create: () =>
            AtomicArgument.create(orderedSetIdFactory.build(), orderedSetIdFactory.build()),
        },
      ];

      testCases.forEach(({ desc, create }) => {
        const result = create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const arg = result.value;
          const isBootstrap = arg.isBootstrap();

          // All bootstrap-related methods should agree
          expect(arg.isBootstrapArgument()).toBe(isBootstrap);
          expect(arg.canPopulate()).toBe(isBootstrap);
          expect(arg.isEmpty()).toBe(isBootstrap);

          // Only empty arguments are bootstrap
          if (desc === 'empty') {
            expect(isBootstrap).toBe(true);
          } else {
            expect(isBootstrap).toBe(false);
          }
        }
      });
    });
  });

  describe('bootstrap behavior edge cases', () => {
    it('should handle bootstrap with side labels', () => {
      const result = AtomicArgument.create(undefined, undefined, {
        left: 'Bootstrap',
        right: 'Label',
      });
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const arg = result.value;
        expect(arg.isBootstrap()).toBe(true);
        expect(arg.canPopulate()).toBe(true);
        expect(arg.hasSideLabels()).toBe(true);
        expect(arg.getSideLabels()).toEqual({ left: 'Bootstrap', right: 'Label' });
      }
    });

    it('should maintain bootstrap status when updating side labels', () => {
      const bootstrapArg = AtomicArgument.createBootstrap();

      expect(bootstrapArg.isBootstrap()).toBe(true);

      // Add side labels
      const updateResult = bootstrapArg.updateSideLabels({ left: 'New Label' });
      expect(updateResult.isOk()).toBe(true);

      // Should still be bootstrap
      expect(bootstrapArg.isBootstrap()).toBe(true);
      expect(bootstrapArg.canPopulate()).toBe(true);
      expect(bootstrapArg.hasSideLabels()).toBe(true);
    });

    it('should lose bootstrap status immediately when adding references', () => {
      const bootstrapArg = AtomicArgument.createBootstrap();

      // Initially bootstrap
      expect(bootstrapArg.isBootstrap()).toBe(true);

      // Add premise reference
      bootstrapArg.setPremiseSetRef(orderedSetIdFactory.build());

      // No longer bootstrap
      expect(bootstrapArg.isBootstrap()).toBe(false);
      expect(bootstrapArg.canPopulate()).toBe(false);
      expect(bootstrapArg.isEmpty()).toBe(false);
    });
  });
});
