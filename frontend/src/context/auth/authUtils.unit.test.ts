import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  getCookie,
  getUserTokenFromCookie,
  parseToken,
  parsePrivileges,
  extractGroups,
  extractForestClientNumbers,
  extractRoles,
  isSystemAdministrator,
  hasWelcomeAccess,
} from './authUtils';
import type { FamLoginUser } from './types';

// Mock env
vi.mock('@/env', () => ({
  env: {
    VITE_USER_POOLS_WEB_CLIENT_ID: 'test-client-id',
    NODE_ENV: 'test',
  },
}));

describe('authUtils', () => {
  describe('getCookie', () => {
    let originalCookie: string;
    beforeEach(() => {
      originalCookie = globalThis.document?.cookie;
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value:
          'foo=bar; CognitoIdentityServiceProvider.test-client-id.LastAuthUser=theuser; CognitoIdentityServiceProvider.test-client-id.theuser.idToken=thetoken',
      });
    });
    afterEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: originalCookie,
      });
    });
    it('returns the correct cookie value', () => {
      expect(getCookie('foo')).toBe('bar');
      expect(getCookie('CognitoIdentityServiceProvider.test-client-id.LastAuthUser')).toBe(
        'theuser',
      );
    });
    it('returns empty string if cookie not found', () => {
      expect(getCookie('notfound')).toBe('');
    });
  });

  describe('getUserTokenFromCookie', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value:
          'CognitoIdentityServiceProvider.test-client-id.LastAuthUser=theuser; CognitoIdentityServiceProvider.test-client-id.theuser.idToken=thetoken',
      });
    });
    it('returns the idToken from cookies', () => {
      expect(getUserTokenFromCookie()).toBe('thetoken');
    });
    it('returns undefined if no userId', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
      expect(getUserTokenFromCookie()).toBeUndefined();
    });
  });

  describe('parseToken', () => {
    it('returns undefined if no token', () => {
      expect(parseToken(undefined)).toBeUndefined();
    });
    it('parses a valid JWT payload', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'Doe, John',
          'custom:idp_name': 'idir',
          'custom:idp_username': 'jdoe',
          'email': 'john@example.com',
          'cognito:groups': ['SCS_SYS_ADMIN', 'SomeOtherGroup'],
        },
      };
      const user = parseToken(jwt);
      expect(user).toMatchObject({
        userName: 'jdoe',
        displayName: 'Doe, John',
        email: 'john@example.com',
        idpProvider: 'IDIR',
        privileges: { SCS_SYS_ADMIN: null },
        roles: ['SCS_SYS_ADMIN'],
        firstName: 'John',
        lastName: 'Doe',
        providerUsername: 'IDIR\\jdoe',
        clientNumbers: [],
        isClientRestricted: false,
      });
    });
    it('parses forest client numbers and isClientRestricted for an external user', () => {
      const jwt = {
        payload: {
          'custom:idp_username': 'bceiduser',
          'custom:idp_name': 'bceidbusiness',
          'cognito:groups': ['SCS_INDUSTRY_SCALER_00001074'],
        },
      };
      const user = parseToken(jwt);
      expect(user).toMatchObject({
        userName: 'bceiduser',
        idpProvider: 'BCEIDBUSINESS',
        roles: ['SCS_INDUSTRY_SCALER'],
        privileges: { SCS_INDUSTRY_SCALER: null },
        clientNumbers: ['00001074'],
        isClientRestricted: true,
      });
    });
  });

  describe('extractForestClientNumbers', () => {
    it('extracts a single client from an external role group', () => {
      expect(extractForestClientNumbers(['SCS_INDUSTRY_SCALER_00001074'])).toEqual(['00001074']);
    });
    it('extracts all clients for a multi-client user', () => {
      expect(
        extractForestClientNumbers(['SCS_INDUSTRY_SCALER_00001074', 'SCS_OWNER_00005821']),
      ).toEqual(['00001074', '00005821']);
    });
    it('recognises the owner role', () => {
      expect(extractForestClientNumbers(['SCS_OWNER_55'])).toEqual(['55']);
    });
    it('ignores SYS_ADMIN and unrelated groups (internal user is empty)', () => {
      expect(extractForestClientNumbers(['SCS_SYS_ADMIN', 'SomeOtherGroup'])).toEqual([]);
    });
    it('keeps only the client-scoped group from a mixed set', () => {
      expect(extractForestClientNumbers(['SCS_SYS_ADMIN', 'SCS_INDUSTRY_SCALER_1074'])).toEqual(['1074']);
    });
    it('ignores a role with no client suffix', () => {
      expect(extractForestClientNumbers(['SCS_INDUSTRY_SCALER'])).toEqual([]);
    });
    it('ignores an entry with an empty client number', () => {
      expect(extractForestClientNumbers(['SCS_INDUSTRY_SCALER_'])).toEqual([]);
    });
    it('does not match a longer role that shares the prefix (non-numeric suffix)', () => {
      expect(extractForestClientNumbers(['SCS_INDUSTRY_SCALER_MANAGER_1074'])).toEqual([]);
    });
    it('matches the role case-insensitively', () => {
      expect(extractForestClientNumbers(['scs_industry_scaler_1074'])).toEqual(['1074']);
    });
    it('returns an empty array for no groups', () => {
      expect(extractForestClientNumbers([])).toEqual([]);
    });
  });

  describe('parsePrivileges', () => {
    it('parses a recognized role and ignores unrecognised groups', () => {
      const input = ['SCS_SYS_ADMIN', 'SomeOtherGroup'];
      expect(parsePrivileges(input)).toEqual({ SCS_SYS_ADMIN: null });
    });
    it('does not treat a suffixed group as the role (exact match only)', () => {
      expect(parsePrivileges(['SCS_SYS_ADMIN_1'])).toEqual({});
    });
    it('returns empty object for no input', () => {
      expect(parsePrivileges([])).toEqual({});
    });
  });

  describe('extractRoles', () => {
    it('returns recognized roles by exact match', () => {
      expect(extractRoles(['SCS_SYS_ADMIN', 'SomeOtherGroup'])).toEqual(['SCS_SYS_ADMIN']);
    });
    it('ignores suffixed variants of a role (exact match only)', () => {
      expect(extractRoles(['SCS_SYS_ADMIN_1'])).toEqual([]);
    });
    it('returns an empty array for no groups', () => {
      expect(extractRoles([])).toEqual([]);
    });
  });

  describe('extractGroups', () => {
    it('returns groups from token', () => {
      expect(extractGroups({ 'cognito:groups': ['ADMIN', 'USER'] })).toEqual(['ADMIN', 'USER']);
    });
    it('returns empty array if no groups', () => {
      expect(extractGroups({})).toEqual([]);
      expect(extractGroups(undefined)).toEqual([]);
    });
  });

  describe('isSystemAdministrator', () => {
    const userWith = (roles?: string[]): FamLoginUser => ({ roles, privileges: {} });

    it('returns true when the user has the SCS_SYS_ADMIN role', () => {
      expect(isSystemAdministrator(userWith(['SCS_SYS_ADMIN']))).toBe(true);
    });
    it('returns true when SCS_SYS_ADMIN is present among other roles', () => {
      expect(isSystemAdministrator(userWith(['OTHER', 'SCS_SYS_ADMIN']))).toBe(true);
    });
    it('returns false for a user without the role', () => {
      expect(isSystemAdministrator(userWith(['APT_EDITOR', 'APT_VIEWER']))).toBe(false);
    });
    it('returns false for empty or missing roles', () => {
      expect(isSystemAdministrator(userWith([]))).toBe(false);
      expect(isSystemAdministrator(userWith(undefined))).toBe(false);
    });
    it('returns false when there is no user', () => {
      expect(isSystemAdministrator(undefined)).toBe(false);
    });
  });

  describe('hasWelcomeAccess', () => {
    const userWith = (roles?: string[]): FamLoginUser => ({ roles, privileges: {} });

    it('returns true for the system administrator role', () => {
      expect(hasWelcomeAccess(userWith(['SCS_SYS_ADMIN']))).toBe(true);
    });
    it('returns true for any other defined role', () => {
      expect(hasWelcomeAccess(userWith(['SCS_CLERICAL']))).toBe(true);
      // A defined role alongside an unrecognised one still grants access. Uses an internal role:
      // the client-scoped ones need a client number, covered below.
      expect(hasWelcomeAccess(userWith(['SCS_CHECK_SCALER', 'UNKNOWN']))).toBe(true);
    });
    it('returns false for an undefined (unrecognized) role', () => {
      expect(hasWelcomeAccess(userWith(['APT_EDITOR', 'APT_VIEWER']))).toBe(false);
    });
    it('matches roles case-sensitively', () => {
      expect(hasWelcomeAccess(userWith(['scs_clerical']))).toBe(false);
    });
    it('returns false for empty or missing roles and no user', () => {
      expect(hasWelcomeAccess(userWith([]))).toBe(false);
      expect(hasWelcomeAccess(userWith(undefined))).toBe(false);
      expect(hasWelcomeAccess(undefined)).toBe(false);
    });

    /**
     * A client-scoped role with no client number grants no permissions, so counting it as welcome
     * access would drop the user on a page whose every API call 403s. They belong on /unauthorized.
     */
    describe('client-scoped roles require a client number', () => {
      const clientUser = (roles: string[], clientNumbers?: string[]): FamLoginUser => ({
        roles,
        privileges: {},
        clientNumbers,
      });

      it('denies an Industry Scaler with no client number', () => {
        expect(hasWelcomeAccess(clientUser(['SCS_INDUSTRY_SCALER']))).toBe(false);
        expect(hasWelcomeAccess(clientUser(['SCS_INDUSTRY_SCALER'], []))).toBe(false);
      });

      it('denies SCS_OWNER with no client number', () => {
        expect(hasWelcomeAccess(clientUser(['SCS_OWNER']))).toBe(false);
      });

      it('allows them once a client number is present', () => {
        expect(hasWelcomeAccess(clientUser(['SCS_INDUSTRY_SCALER'], ['00001074']))).toBe(true);
        expect(hasWelcomeAccess(clientUser(['SCS_OWNER'], ['00001074']))).toBe(true);
      });

      it('allows access on the strength of an internal role held as well', () => {
        expect(hasWelcomeAccess(clientUser(['SCS_INDUSTRY_SCALER', 'SCS_CLERICAL']))).toBe(true);
      });
    });
  });
});
