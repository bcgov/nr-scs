import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  PERMISSIONS_BY_ROLE,
  hasAnyPermission,
  hasPermission,
  permissionsFor,
  type PERMISSION_TYPE,
} from './permissions';
import { AVAILABLE_ROLES, type FamLoginUser } from './types';

const BACKEND_SECURITY = join(
  process.cwd(), '..', 'backend', 'src', 'main', 'java', 'ca', 'bc', 'gov', 'nrs', 'scs', 'backend',
);

const readBackendSource = (...segments: string[]): string =>
  readFileSync(join(BACKEND_SECURITY, ...segments), 'utf8');

/** Java line comments, stripped so a commented-out entry is never read as a live one. */
const withoutComments = (source: string): string => source.replaceAll(/\/\/[^\n]*/g, '');

/**
 * `CONSTANT_NAME` -> its string value, from `Permissions.java`. Resolved rather than assumed equal
 * because a constant whose value diverges from its name is exactly the typo this is here to catch.
 */
const backendConstants = (source: string): Map<string, string> =>
  new Map(
    [...source.matchAll(/public\s+static\s+final\s+String\s+(\w+)\s*=\s*"([^"]+)"/g)]
      .map((match) => [match[1], match[2]]),
  );

/** The permission names listed inside a `Set.of(...)` / `List.of(...)` block, resolved to their values. */
const namesInBlock = (block: string, constants: Map<string, string>): string[] =>
  [...withoutComments(block).matchAll(/(?:Permissions\.)?([A-Z][A-Z0-9_]+)/g)]
    .map((match) => constants.get(match[1]))
    .filter((value): value is string => value !== undefined);

const backendBlock = (source: string, pattern: RegExp): string => {
  const match = pattern.exec(source);
  if (!match) {
    throw new Error(`Could not locate the expected block in the backend source: ${pattern}`);
  }
  return match[1];
};

/**
 * A user holding `roles`. Carries a forest client number, because the client-scoped roles used below
 * (SCS_INDUSTRY_SCALER) grant nothing without one — that rule has its own tests further down.
 */
const userWith = (roles: string[] | undefined): FamLoginUser => ({
  privileges: {},
  roles,
  clientNumbers: ['00001074'],
});

/** The same, with no forest client number. */
const userWithoutClient = (roles: string[] | undefined): FamLoginUser => ({
  privileges: {},
  roles,
});

describe('permissions', () => {
  /**
   * This file is the frontend mirror of two Java files, maintained by hand in a second language. Both
   * sides previously claimed "the test pins the two lists together" while only ever asserting each list
   * against its own hardcoded copy — so a name added or removed on one side alone went unnoticed. These
   * read the backend source directly, which is what makes that claim true.
   *
   * A backend-only addition makes the UI under-offer (safe but invisible); a backend-only removal makes
   * it offer a control that 403s. Neither shows up in either language's own tests.
   */
  describe('mirror of the backend vocabulary', () => {
    it('lists exactly the names in Permissions.ALL_PERMISSIONS', () => {
      const source = readBackendSource('constants', 'Permissions.java');
      const constants = backendConstants(source);
      const backend = namesInBlock(
        backendBlock(source, /ALL_PERMISSIONS\s*=\s*Set\.of\(([\s\S]*?)\);/),
        constants,
      );

      // Guards against a parse that silently matched nothing, which would make this vacuous.
      expect(backend.length).toBeGreaterThan(100);

      const missingFromFrontend = backend.filter((name) => !(name in PERMISSIONS)).sort();
      const extraInFrontend = Object.keys(PERMISSIONS)
        .filter((name) => !backend.includes(name))
        .sort();

      expect(missingFromFrontend, `defined in Java but not mirrored here: ${missingFromFrontend}`)
        .toEqual([]);
      expect(extraInFrontend, `mirrored here but not defined in Java: ${extraInFrontend}`).toEqual([]);
    });

    /**
     * The Industry Scaler column is the higher-risk duplication: drift here changes what an external
     * user is shown, not just what the vocabulary contains.
     */
    it('grants the Industry Scaler exactly what RolePermissions.industryScaler() does', () => {
      const permissionsSource = readBackendSource('constants', 'Permissions.java');
      const rolesSource = readBackendSource('security', 'RolePermissions.java');
      const backend = namesInBlock(
        backendBlock(rolesSource, /industryScaler\(\)\s*\{\s*return\s+Set\.of\(([\s\S]*?)\);/),
        backendConstants(permissionsSource),
      ).sort();

      expect(backend.length).toBeGreaterThan(10);
      expect([...PERMISSIONS_BY_ROLE.SCS_INDUSTRY_SCALER].sort()).toEqual(backend);
    });

    it('grants the Scale Site Owner exactly what RolePermissions.scaleSiteOwner() does', () => {
      const permissionsSource = readBackendSource('constants', 'Permissions.java');
      const rolesSource = readBackendSource('security', 'RolePermissions.java');
      const backend = namesInBlock(
        backendBlock(rolesSource, /scaleSiteOwner\(\)\s*\{\s*return\s+Set\.of\(([\s\S]*?)\);/),
        backendConstants(permissionsSource),
      ).sort();

      expect(backend.length).toBeGreaterThan(10);
      expect([...PERMISSIONS_BY_ROLE.SCS_OWNER].sort()).toEqual(backend);
    });

    /**
     * The first column with write permissions, so drift here can hand a UI control to a role the API
     * refuses — or, worse, hide one it is entitled to and leave the capability apparently missing.
     */
    it('grants the Check Scaler exactly what RolePermissions.checkScaler() does', () => {
      const permissionsSource = readBackendSource('constants', 'Permissions.java');
      const rolesSource = readBackendSource('security', 'RolePermissions.java');
      const backend = namesInBlock(
        backendBlock(rolesSource, /checkScaler\(\)\s*\{\s*return\s+Set\.of\(([\s\S]*?)\);/),
        backendConstants(permissionsSource),
      ).sort();

      expect(backend.length).toBeGreaterThan(30);
      expect([...PERMISSIONS_BY_ROLE.SCS_CHECK_SCALER].sort()).toEqual(backend);
    });

    /**
     * The three read-only internal columns are checked against one Java block, because that is how the
     * backend defines them — §3 gives them identical cells, so `RolePermissions` keeps a single
     * `readOnlyInternalColumn()` and each role's method returns it. Asserting each role independently
     * means a divergence on any one of them still fails.
     */
    it.each([
      ['SCS_CLERICAL' as const],
      ['SCS_BRANCH_SYS_SUPPORT' as const],
      ['SCS_REGIONAL_MANAGER' as const],
    ])('grants %s exactly what RolePermissions.readOnlyInternalColumn() does', (role) => {
      const permissionsSource = readBackendSource('constants', 'Permissions.java');
      const rolesSource = readBackendSource('security', 'RolePermissions.java');
      const backend = namesInBlock(
        backendBlock(
          rolesSource,
          /readOnlyInternalColumn\(\)\s*\{\s*return\s+Set\.of\(([\s\S]*?)\);/,
        ),
        backendConstants(permissionsSource),
      ).sort();

      expect(backend.length).toBeGreaterThan(20);
      expect([...PERMISSIONS_BY_ROLE[role]].sort()).toEqual(backend);
    });

    /**
     * The District Manager is the shared column plus one write, so it is mirrored as that union — and
     * checked against the same Java block plus the same one name, rather than as thirty-one literals.
     */
    it('grants SCS_DIST_MANAGER the shared column plus SCALER_LICENCE_CANCEL', () => {
      const permissionsSource = readBackendSource('constants', 'Permissions.java');
      const rolesSource = readBackendSource('security', 'RolePermissions.java');
      const shared = namesInBlock(
        backendBlock(
          rolesSource,
          /readOnlyInternalColumn\(\)\s*\{\s*return\s+Set\.of\(([\s\S]*?)\);/,
        ),
        backendConstants(permissionsSource),
      );

      const expected = [...shared, PERMISSIONS.SCALER_LICENCE_CANCEL].sort();
      expect([...PERMISSIONS_BY_ROLE.SCS_DIST_MANAGER].sort()).toEqual(expected);

      // The Java side adds exactly that one name to the shared list, and nothing else.
      const body = backendBlock(rolesSource, /districtManager\(\)\s*\{([\s\S]*?)\n {2}\}/);
      expect(body).toContain('readOnlyInternalColumn()');
      expect(body).toContain('Permissions.SCALER_LICENCE_CANCEL');
    });

    it('grants the C&E Technician exactly what RolePermissions.ceTechnician() does', () => {
      const permissionsSource = readBackendSource('constants', 'Permissions.java');
      const rolesSource = readBackendSource('security', 'RolePermissions.java');
      const backend = namesInBlock(
        backendBlock(rolesSource, /ceTechnician\(\)\s*\{\s*return\s+Set\.of\(([\s\S]*?)\);/),
        backendConstants(permissionsSource),
      ).sort();

      expect(backend.length).toBeGreaterThan(30);
      expect([...PERMISSIONS_BY_ROLE.SCS_CE_TECHNICIAN].sort()).toEqual(backend);
    });

    /** Both scaling-manager columns, against the one Java block that defines them. */
    it.each([
      ['SCS_DIST_SCALING_MANAGER' as const],
      ['SCS_REGIONAL_SCALING_MANAGER' as const],
    ])('grants %s exactly what RolePermissions.scalingManagerColumn() does', (role) => {
      const permissionsSource = readBackendSource('constants', 'Permissions.java');
      const rolesSource = readBackendSource('security', 'RolePermissions.java');
      const backend = namesInBlock(
        backendBlock(
          rolesSource,
          /scalingManagerColumn\(\)\s*\{\s*return\s+Set\.of\(([\s\S]*?)\);/,
        ),
        backendConstants(permissionsSource),
      ).sort();

      expect(backend.length).toBeGreaterThan(60);
      expect([...PERMISSIONS_BY_ROLE[role]].sort()).toEqual(backend);
    });

    /**
     * The sharing itself. If a real requirement ever separates one of these columns, its Java method
     * will stop returning the shared list — and the blocks above would then silently stop being that
     * role's source of truth, leaving this file mirroring the wrong set. This catches that.
     */
    it.each([
      ['clerical', 'readOnlyInternalColumn'],
      ['branchSystemSupport', 'readOnlyInternalColumn'],
      ['regionalManager', 'readOnlyInternalColumn'],
      ['districtScalingManager', 'scalingManagerColumn'],
      ['regionalScalingManager', 'scalingManagerColumn'],
    ])('keeps %s() returning the shared column rather than restating it', (method, shared) => {
      const rolesSource = readBackendSource('security', 'RolePermissions.java');
      const body = backendBlock(
        rolesSource,
        new RegExp(`${method}\\(\\)\\s*\\{([\\s\\S]*?)\\n {2}\\}`),
      );

      expect(
        body,
        `${method}() no longer returns ${shared}(), so that column has diverged from the others it ` +
          `shared a list with. Give its role its own list here and mirror the new Java block.`,
      ).toContain(`return ${shared}();`);
    });
  });

  describe('vocabulary invariants', () => {
    it('never names a permission like a role, since both are matched in one namespace', () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(permission.startsWith('SCS_')).toBe(false);
      }
    });

    it('keys every permission to its own value, so no two constants alias', () => {
      for (const [key, value] of Object.entries(PERMISSIONS)) {
        expect(value).toBe(key);
      }
      expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    });

    it('gives every recognised role a permission column', () => {
      for (const role of AVAILABLE_ROLES) {
        expect(PERMISSIONS_BY_ROLE[role], `${role} has no column`).toBeDefined();
        expect(PERMISSIONS_BY_ROLE[role].length).toBeGreaterThan(0);
      }
    });

    it('grants only known permissions', () => {
      for (const role of AVAILABLE_ROLES) {
        for (const permission of PERMISSIONS_BY_ROLE[role]) {
          expect(ALL_PERMISSIONS).toContain(permission);
        }
      }
    });

    it('lets every role reach the welcome page (matrix row "SCS Home Page" is R for all)', () => {
      for (const role of AVAILABLE_ROLES) {
        expect(PERMISSIONS_BY_ROLE[role]).toContain(PERMISSIONS.WELCOME_READ);
      }
    });
  });

  describe('system administrator', () => {
    it('holds every permission', () => {
      expect(PERMISSIONS_BY_ROLE.SCS_SYS_ADMIN).toEqual(ALL_PERMISSIONS);
    });
  });

  describe('industry scaler', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_INDUSTRY_SCALER;

    it('holds the reads from matrix column IND', () => {
      const expected: PERMISSION_TYPE[] = [
        PERMISSIONS.WELCOME_READ,
        PERMISSIONS.LOV_READ,
        PERMISSIONS.CLIENT_QUERY,
        PERMISSIONS.SCALER_QUERY,
        PERMISSIONS.SCALER_READ,
        PERMISSIONS.SCALER_ADDRESS_READ,
        PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
        PERMISSIONS.SCALER_AUTHORIZATION_READ,
        PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALER_EXAM_QUERY,
        PERMISSIONS.SCALER_APPOINTMENT_QUERY,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
        PERMISSIONS.SCALE_SITE_READ,
        PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
        PERMISSIONS.SCALER_RISK_RATING_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
        PERMISSIONS.MSD_QUERY,
        PERMISSIONS.MSD_READ,
      ];
      expect([...granted].sort()).toEqual(expected.sort());
    });

    /**
     * The client's 2026-09-02 spec: "OWNER and INDUSTRY_SCALER should have read permissions with
     * limitations". One subject each — the record the role lives on — so this column gets the scaler
     * assessments and not the site ones. The "limitations" are enforced on the backend, where the
     * read-by-id calls `ClientScopeGuard` and the search overrides the client criterion with the
     * caller's own; `ClientScopeInterceptorTest` fails the build if either is removed.
     */
    it('reads scaler risk assessments from the record only, and authors none', () => {
      for (const permission of [
        PERMISSIONS.SCALER_RISK_RATING_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
      ]) {
        expect(granted).toContain(permission);
      }

      for (const denied of [
        // The standalone search screen, withheld 2026-09-03 — the Risk Rating tab lists and links the
        // record's own assessments, so it reaches nothing extra. Same shape as SCALE_SITE_READ without
        // SCALE_SITE_QUERY.
        PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
        PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });

    // Asserted as an allowlist (must end _READ or _QUERY) rather than by naming mutating suffixes to
    // exclude: a denylist would have missed SCALER_LICENCE_CANCEL when it was added.
    it('is strictly read-only — every IND cell in the matrix is R', () => {
      const mutating = granted.filter(
        (permission) => !permission.endsWith('_READ') && !permission.endsWith('_QUERY'),
      );
      expect(mutating).toEqual([]);
    });

    it('cannot set the licence-cancelled date, a manager capability on a tab it can read', () => {
      expect(granted).not.toContain(PERMISSIONS.SCALER_LICENCE_CANCEL);
      expect(granted).not.toContain(PERMISSIONS.SCALER_UPDATE);
    });

    it('may open a scale-site record but not search the register or read its Summary', () => {
      expect(granted).toContain(PERMISSIONS.SCALE_SITE_READ);
      expect(granted).not.toContain(PERMISSIONS.SCALE_SITE_QUERY);
      expect(granted).not.toContain(PERMISSIONS.SCALE_SITE_SUMMARY_READ);
    });

    it('is denied work bench, reports, inspections, site risk and maintenance', () => {
      for (const denied of [
        PERMISSIONS.WORKBENCH_QUERY,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.CHECK_SCALE_QUERY,
        PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
        PERMISSIONS.MAINTAIN_SYSTEM_READ,
        PERMISSIONS.SYSTEM_ADMIN,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });
  });

  describe('scale site owner', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_OWNER;

    it('holds the reads from matrix column OWN', () => {
      const expected: PERMISSION_TYPE[] = [
        PERMISSIONS.WELCOME_READ,
        PERMISSIONS.LOV_READ,
        PERMISSIONS.CLIENT_QUERY,
        PERMISSIONS.SCALER_QUERY,
        PERMISSIONS.SCALER_READ,
        PERMISSIONS.SCALER_ADDRESS_READ,
        PERMISSIONS.SCALER_EXAM_QUERY,
        PERMISSIONS.SCALE_SITE_QUERY,
        PERMISSIONS.SCALE_SITE_READ,
        PERMISSIONS.SCALE_SITE_SUMMARY_READ,
        PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
        PERMISSIONS.SCALE_SITE_CONTACT_READ,
        PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ,
        PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
        PERMISSIONS.SCALE_SITE_MSD_QUERY,
        PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
        PERMISSIONS.SCALE_SITE_INSPECTION_READ,
        PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
      ];
      expect([...granted].sort()).toEqual(expected.sort());
    });

    /**
     * The mirror of the Industry Scaler's grant: the site subject only, read only, and reached from the
     * record only. The contrast that makes the last part deliberate is asserted here too — this role
     * *does* search the site register, so the withheld search is the assessment register specifically.
     */
    it('reads scale-site risk assessments from the record only, and authors none', () => {
      for (const permission of [
        PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
      ]) {
        expect(granted).toContain(permission);
      }
      expect(granted).toContain(PERMISSIONS.SCALE_SITE_QUERY);

      for (const denied of [
        // Withheld 2026-09-03, for the same reason as the Industry Scaler's.
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
        // The scaler subject entire — that one is the Industry Scaler's.
        PERMISSIONS.SCALER_RISK_RATING_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });

    // Allowlist, not a denylist — see the Industry Scaler equivalent above.
    it('is strictly read-only — every OWN cell in the matrix is R', () => {
      const mutating = granted.filter(
        (permission) => !permission.endsWith('_READ') && !permission.endsWith('_QUERY'),
      );
      expect(mutating).toEqual([]);
    });

    /**
     * The one place §3 and §4 disagree: §3 is `-` on the scaler record's Address and Exams / Upgrades
     * rows, §4 grants the owner "addresses, exam and upgrade history". §4 won, for those two rows only.
     */
    it('reads a scaler Summary, Address and Exams — and no other scaler tab', () => {
      expect(granted).toContain(PERMISSIONS.SCALER_ADDRESS_READ);
      expect(granted).toContain(PERMISSIONS.SCALER_EXAM_QUERY);
      for (const denied of [
        PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
        PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALER_APPOINTMENT_QUERY,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
        PERMISSIONS.SCALER_RISK_RATING_QUERY,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });

    /** Unlike the Industry Scaler: §D grants "Queries – Scale Sites" plain `R` to this role. */
    it('may search the scale-site register and read a record Summary', () => {
      expect(granted).toContain(PERMISSIONS.SCALE_SITE_QUERY);
      expect(granted).toContain(PERMISSIONS.SCALE_SITE_SUMMARY_READ);
    });

    /** §D grants the site record's MSD tab; §F denies the standalone MSD search and record outright. */
    it('reads the site MSD tab but has no standalone MSD screen', () => {
      expect(granted).toContain(PERMISSIONS.SCALE_SITE_MSD_QUERY);
      expect(granted).not.toContain(PERMISSIONS.MSD_QUERY);
      expect(granted).not.toContain(PERMISSIONS.MSD_READ);
    });

    it('is denied check scales, work bench, reports, scaler risk and maintenance', () => {
      for (const denied of [
        PERMISSIONS.CHECK_SCALE_QUERY,
        PERMISSIONS.WORKBENCH_QUERY,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALE_SITE_UPDATE,
        PERMISSIONS.SCALE_SITE_CONTACT_CREATE,
        PERMISSIONS.SCALE_SITE_INSPECTION_CREATE,
        PERMISSIONS.MAINTAIN_SYSTEM_READ,
        PERMISSIONS.SYSTEM_ADMIN,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });
  });

  describe('check scaler', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_CHECK_SCALER;

    it('holds matrix column CHK', () => {
      const expected: PERMISSION_TYPE[] = [
        PERMISSIONS.WELCOME_READ,
        PERMISSIONS.LOV_READ,
        PERMISSIONS.CLIENT_QUERY,
        PERMISSIONS.SCALER_QUERY,
        PERMISSIONS.SCALER_READ,
        PERMISSIONS.SCALER_ADDRESS_READ,
        PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
        PERMISSIONS.SCALER_AUTHORIZATION_READ,
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW,
        PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALER_EXAM_QUERY,
        PERMISSIONS.SCALER_APPOINTMENT_QUERY,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_CREATE,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE,
        PERMISSIONS.SCALE_SITE_QUERY,
        PERMISSIONS.SCALE_SITE_READ,
        PERMISSIONS.SCALE_SITE_SUMMARY_READ,
        PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
        PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
        PERMISSIONS.SCALE_SITE_CONTACT_READ,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
        PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
        PERMISSIONS.SCALE_SITE_MSD_QUERY,
        PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
        PERMISSIONS.SCALE_SITE_INSPECTION_READ,
        PERMISSIONS.SCALE_SITE_INSPECTION_CREATE,
        PERMISSIONS.SCALE_SITE_INSPECTION_UPDATE,
        PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
        PERMISSIONS.CHECK_SCALE_QUERY,
        PERMISSIONS.CHECK_SCALE_CREATE,
        PERMISSIONS.CHECK_SCALE_UPDATE,
        PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE,
        PERMISSIONS.MSD_QUERY,
        PERMISSIONS.MSD_READ,
        PERMISSIONS.MSD_CREATE,
        PERMISSIONS.MSD_UPDATE,
        PERMISSIONS.MSD_LETTER_CREATE,
        PERMISSIONS.MSD_LETTER_VIEW,
        PERMISSIONS.LETTER_SIGNATORY_QUERY,
        PERMISSIONS.SCALER_RISK_RATING_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE,
        PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
        PERMISSIONS.WORKBENCH_QUERY,
        PERMISSIONS.WORKBENCH_CREATE,
        PERMISSIONS.WORKBENCH_UPDATE,
        PERMISSIONS.REPORT_READ,
      ];
      expect([...granted].sort()).toEqual(expected.sort());
    });

    /**
     * The first role with writes, so there is no read-only allowlist to lean on. This is the
     * replacement: the mutations it holds are enumerated, and anything else mutating fails the build.
     */
    it('writes exactly five record types, plus Work Bench renewals', () => {
      const expected: PERMISSION_TYPE[] = [
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_CREATE,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE,
        PERMISSIONS.SCALE_SITE_INSPECTION_CREATE,
        PERMISSIONS.SCALE_SITE_INSPECTION_UPDATE,
        PERMISSIONS.CHECK_SCALE_CREATE,
        PERMISSIONS.CHECK_SCALE_UPDATE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE,
        PERMISSIONS.MSD_CREATE,
        PERMISSIONS.MSD_UPDATE,
        // All four letter families, by the client's 2026-09-02 spec. The three `_LETTER_VIEW` verbs
        // are reads, so the filter below excludes them alongside `_READ` and `_QUERY`.
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.MSD_LETTER_CREATE,
        PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE,
        // Risk assessments are the fifth record type it authors — one of the four create roles the
        // client's spec names
        PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
        PERMISSIONS.WORKBENCH_CREATE,
        PERMISSIONS.WORKBENCH_UPDATE,
      ];
      const mutating = granted.filter(
        (permission) =>
          !permission.endsWith('_READ') &&
          !permission.endsWith('_QUERY') &&
          !permission.endsWith('_LETTER_VIEW'),
      );
      expect([...mutating].sort()).toEqual(expected.sort());
    });

    /** §A grants Work Bench `CRU`; §E denies every authorization create/edit row. Both hold. */
    it('renews from the Work Bench without holding authorization create or edit', () => {
      expect(granted).toContain(PERMISSIONS.WORKBENCH_CREATE);
      for (const denied of [
        PERMISSIONS.SCALER_AUTHORIZATION_CREATE,
        PERMISSIONS.SCALER_AUTHORIZATION_UPDATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_CREATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_UPDATE,
      ]) {
        expect(granted).not.toContain(denied);
      }

      // The letters are the exception, and they come from the client's 2026-09-02 spec rather than
      // §E: authoring an authorization and composing its letter are separate capabilities here.
      expect(granted).toContain(PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE);
      expect(granted).toContain(PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE);
    });

    /** Summary check scales sit under §I's Check Scale rows; only ADM's cell carries the `D`. */
    it('records summary check scales but cannot delete one', () => {
      expect(granted).toContain(PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE);
      expect(granted).toContain(PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE);
      expect(granted).not.toContain(PERMISSIONS.SUMMARY_CHECK_SCALE_DELETE);
    });

    /** Internal, so it grants its full column with no client number and never sees the switcher. */
    it('grants its column with no forest client number', () => {
      const withoutClient = permissionsFor(userWithoutClient(['SCS_CHECK_SCALER']));
      expect(withoutClient.has(PERMISSIONS.CHECK_SCALE_CREATE)).toBe(true);
      expect(withoutClient.size).toBe(granted.length);
    });

    it('is denied record creation, scaler edits, risk assessment and all maintenance', () => {
      for (const denied of [
        PERMISSIONS.SCALER_CREATE,
        PERMISSIONS.SCALER_UPDATE,
        PERMISSIONS.SCALER_LICENCE_CANCEL,
        PERMISSIONS.SCALER_EXAM_CREATE,
        PERMISSIONS.SCALER_APPOINTMENT_CREATE,
        PERMISSIONS.SCALE_SITE_CREATE,
        PERMISSIONS.SCALE_SITE_UPDATE,
        PERMISSIONS.SCALE_SITE_CONTACT_CREATE,
        PERMISSIONS.SCALE_SITE_CONTACT_UPDATE,
        PERMISSIONS.SCALE_SITE_CONTACT_DELETE,
        PERMISSIONS.SCALE_SITE_INSPECTION_DELETE,
        // risk assessment is held now — it follows the record, see permissions.ts
        PERMISSIONS.MAINTAIN_QUESTIONS_QUERY,
        PERMISSIONS.MAINTAIN_TEMPLATES_QUERY,
        PERMISSIONS.MAINTAIN_CONDITIONS_QUERY,
        PERMISSIONS.MAINTAIN_SIGNATORIES_QUERY,
        PERMISSIONS.MAINTAIN_SYSTEM_READ,
        PERMISSIONS.SYSTEM_ADMIN,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });
  });

  describe('branch & district clerical', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_CLERICAL;

    it('holds matrix column CLE', () => {
      const expected: PERMISSION_TYPE[] = [
        PERMISSIONS.WELCOME_READ,
        PERMISSIONS.LOV_READ,
        PERMISSIONS.CLIENT_QUERY,
        PERMISSIONS.SCALER_QUERY,
        PERMISSIONS.SCALER_READ,
        PERMISSIONS.SCALER_ADDRESS_READ,
        PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
        PERMISSIONS.SCALER_AUTHORIZATION_READ,
        PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALER_EXAM_QUERY,
        PERMISSIONS.SCALER_APPOINTMENT_QUERY,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
        PERMISSIONS.SCALE_SITE_QUERY,
        PERMISSIONS.SCALE_SITE_READ,
        PERMISSIONS.SCALE_SITE_SUMMARY_READ,
        PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
        PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
        PERMISSIONS.SCALE_SITE_CONTACT_READ,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ,
        PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
        PERMISSIONS.SCALE_SITE_MSD_QUERY,
        PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
        PERMISSIONS.SCALE_SITE_INSPECTION_READ,
        PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
        PERMISSIONS.SCALER_RISK_RATING_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
        PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
        PERMISSIONS.MSD_QUERY,
        PERMISSIONS.MSD_READ,
        PERMISSIONS.WORKBENCH_QUERY,
        PERMISSIONS.REPORT_READ,
      ];
      expect([...granted].sort()).toEqual(expected.sort());
    });

    /** Every `CLE` cell is `R` or `-`, so the allowlist shape the external columns use applies again. */
    it('is strictly read-only — every CLE cell in the matrix is R or -', () => {
      const mutating = granted.filter(
        (permission) => !permission.endsWith('_READ') && !permission.endsWith('_QUERY'),
      );
      expect(mutating).toEqual([]);
    });

    /**
     * What makes this role cheap: it reveals no control the Check Scaler pass did not already gate.
     * Pinned, because an addition here that CHK lacks would silently invalidate that argument.
     */
    it('is a strict subset of the Check Scaler column', () => {
      const checkScaler = new Set<PERMISSION_TYPE>(PERMISSIONS_BY_ROLE.SCS_CHECK_SCALER);
      expect(granted.filter((permission) => !checkScaler.has(permission))).toEqual([]);
      expect(granted.length).toBeLessThan(PERMISSIONS_BY_ROLE.SCS_CHECK_SCALER.length);
    });

    /**
     * §C and §D grant the check-scale *lists* on both records `R`, while §I is `-` throughout. So the
     * Check Scale # renders as plain text and the "OR enter check scale #" search box stays hidden.
     */
    it('reads check-scale history on both records without opening a check scale', () => {
      expect(granted).toContain(PERMISSIONS.SCALER_CHECK_SCALE_QUERY);
      expect(granted).toContain(PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY);
      for (const denied of [
        PERMISSIONS.CHECK_SCALE_QUERY,
        PERMISSIONS.CHECK_SCALE_CREATE,
        PERMISSIONS.CHECK_SCALE_UPDATE,
        PERMISSIONS.CHECK_SCALE_DELETE,
        PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });

    /** §A is `R (ltd)` here against the Check Scaler's `CRU`: the queue is readable, nothing renewable. */
    it('reads the Work Bench queue but renews nothing on it', () => {
      expect(granted).toContain(PERMISSIONS.WORKBENCH_QUERY);
      expect(granted).not.toContain(PERMISSIONS.WORKBENCH_CREATE);
      expect(granted).not.toContain(PERMISSIONS.WORKBENCH_UPDATE);
    });

    /** Internal, so it grants its full column with no client number and never sees the switcher. */
    it('grants its column with no forest client number', () => {
      const withoutClient = permissionsFor(userWithoutClient(['SCS_CLERICAL']));
      expect(withoutClient.has(PERMISSIONS.SCALER_READ)).toBe(true);
      expect(withoutClient.size).toBe(granted.length);
    });

    it('is denied every create wizard, letter, risk assessment and maintenance screen', () => {
      for (const denied of [
        PERMISSIONS.SCALER_CREATE,
        PERMISSIONS.SCALER_UPDATE,
        PERMISSIONS.SCALER_LICENCE_CANCEL,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_CREATE,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE,
        PERMISSIONS.SCALE_SITE_CREATE,
        PERMISSIONS.SCALE_SITE_UPDATE,
        PERMISSIONS.SCALE_SITE_CONTACT_CREATE,
        PERMISSIONS.SCALE_SITE_INSPECTION_CREATE,
        PERMISSIONS.SCALE_SITE_INSPECTION_UPDATE,
        PERMISSIONS.SCALER_AUTHORIZATION_CREATE,
        // No letter verb of either kind: the client's 2026-09-02 spec names CHK/ADM/RSM/DSM for
        // letters and CET for viewing them, and this column is none of them
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_CREATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
        PERMISSIONS.MSD_CREATE,
        PERMISSIONS.MSD_UPDATE,
        PERMISSIONS.MSD_LETTER_CREATE,
        PERMISSIONS.MSD_LETTER_VIEW,
        // risk assessment is read here — see permissions.ts
        PERMISSIONS.MAINTAIN_QUESTIONS_QUERY,
        PERMISSIONS.MAINTAIN_TEMPLATES_QUERY,
        PERMISSIONS.MAINTAIN_SIGNATORIES_QUERY,
        PERMISSIONS.MAINTAIN_SYSTEM_READ,
        PERMISSIONS.SYSTEM_ADMIN,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });
  });

  describe('branch system support', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_BRANCH_SYS_SUPPORT;

    /** §3 gives CLE and SUP identical cells; the only difference is org-unit breadth on the Work Bench. */
    it('holds the same column as the clerical role', () => {
      expect([...granted].sort()).toEqual([...PERMISSIONS_BY_ROLE.SCS_CLERICAL].sort());
    });

    it('is strictly read-only — every SUP cell in the matrix is R or -', () => {
      const mutating = granted.filter(
        (permission) => !permission.endsWith('_READ') && !permission.endsWith('_QUERY'),
      );
      expect(mutating).toEqual([]);
    });

    /**
     * §4 names "exam requirements, exam schedules" for this role and nothing in SCS implements either —
     * so the scaler record's Exams / Upgrades tab is its whole exam surface, and the reference-data
     * screen that sounds closest stays denied (§J is `-`).
     */
    it('reads a scaler exam history without reaching the exam reference data', () => {
      expect(granted).toContain(PERMISSIONS.SCALER_EXAM_QUERY);
      expect(granted).not.toContain(PERMISSIONS.MAINTAIN_EXAM_UPGRADES_QUERY);
      expect(granted).not.toContain(PERMISSIONS.SCALER_EXAM_CREATE);
    });

    /** §A gives it plain `R`: the queue is readable province-wide, and nothing on it is renewable. */
    it('reads the Work Bench queue but renews nothing on it', () => {
      expect(granted).toContain(PERMISSIONS.WORKBENCH_QUERY);
      expect(granted).not.toContain(PERMISSIONS.WORKBENCH_CREATE);
      expect(granted).not.toContain(PERMISSIONS.WORKBENCH_UPDATE);
    });

    it('grants its column with no forest client number', () => {
      const withoutClient = permissionsFor(userWithoutClient(['SCS_BRANCH_SYS_SUPPORT']));
      expect(withoutClient.has(PERMISSIONS.SCALER_READ)).toBe(true);
      expect(withoutClient.size).toBe(granted.length);
    });
  });

  describe('regional manager', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_REGIONAL_MANAGER;

    it('holds the same column as the clerical and branch support roles', () => {
      expect([...granted].sort()).toEqual([...PERMISSIONS_BY_ROLE.SCS_CLERICAL].sort());
      expect([...granted].sort()).toEqual([...PERMISSIONS_BY_ROLE.SCS_BRANCH_SYS_SUPPORT].sort());
    });

    it('is strictly read-only — every RM cell in the matrix is R or -', () => {
      const mutating = granted.filter(
        (permission) => !permission.endsWith('_READ') && !permission.endsWith('_QUERY'),
      );
      expect(mutating).toEqual([]);
    });

    /**
     * §4 claims "create scaler licences" for this role. §3 denies it in two rows ("Scaler – Create" is
     * `-`, and "Queries – Scalers – Results" is `R` where DSM/RSM/ADM are `CR`) and legacy gave the role
     * no Create menu — so the Create Scaler control and route stay closed to it.
     */
    it('cannot create a scaler despite §4 claiming it can', () => {
      expect(granted).not.toContain(PERMISSIONS.SCALER_CREATE);
      expect(granted).toContain(PERMISSIONS.SCALER_QUERY);
      expect(granted).toContain(PERMISSIONS.SCALER_READ);
    });

    /** "Suspend scaler licence / recommend cancellations" is the District Manager's §4 bullet, not this one's. */
    it('cannot suspend a licence or edit a scaler', () => {
      expect(granted).not.toContain(PERMISSIONS.SCALER_LICENCE_CANCEL);
      expect(granted).not.toContain(PERMISSIONS.SCALER_UPDATE);
    });

    it('grants its column with no forest client number', () => {
      const withoutClient = permissionsFor(userWithoutClient(['SCS_REGIONAL_MANAGER']));
      expect(withoutClient.has(PERMISSIONS.SCALER_READ)).toBe(true);
      expect(withoutClient.size).toBe(granted.length);
    });
  });

  describe('district manager', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_DIST_MANAGER;

    it('holds the shared read-only column plus SCALER_LICENCE_CANCEL', () => {
      expect([...granted].sort()).toEqual(
        [...PERMISSIONS_BY_ROLE.SCS_CLERICAL, PERMISSIONS.SCALER_LICENCE_CANCEL].sort(),
      );
    });

    /**
     * §4's "Suspend scaler licence / recommend cancellations" against §3's `-` on "Summary – Edit".
     * Legacy gated the licence-cancelled date under its own WebADE action, separate from scaler edit and
     * from remark authoring — so the date is editable here while nothing else on the record is.
     */
    it('suspends a licence without editing the scaler or authoring remarks', () => {
      expect(granted).toContain(PERMISSIONS.SCALER_LICENCE_CANCEL);
      expect(granted).not.toContain(PERMISSIONS.SCALER_UPDATE);
      expect(granted).not.toContain(PERMISSIONS.SCALER_PERFORMANCE_REMARK_CREATE);
      expect(granted).not.toContain(PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE);
      expect(granted).not.toContain(PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE);
    });

    /** Not read-only, so the mutations are enumerated instead — there is exactly one. */
    it('writes exactly one thing', () => {
      const mutating = granted.filter(
        (permission) => !permission.endsWith('_READ') && !permission.endsWith('_QUERY'),
      );
      expect(mutating).toEqual([PERMISSIONS.SCALER_LICENCE_CANCEL]);
    });

    it('grants its column with no forest client number', () => {
      const withoutClient = permissionsFor(userWithoutClient(['SCS_DIST_MANAGER']));
      expect(withoutClient.has(PERMISSIONS.SCALER_LICENCE_CANCEL)).toBe(true);
      expect(withoutClient.size).toBe(granted.length);
    });
  });

  describe('c&e technician', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_CE_TECHNICIAN;

    /**
     * The client's 2026-09-02 rule, as an allowlist: "No where in the app should they be able to edit,
     * delete or create something". Every granted name must end `_READ`, `_QUERY` or `_LETTER_VIEW`, so
     * any write added later fails by default rather than only the verbs a denylist happens to name.
     */
    it('is strictly read-only, letter views aside', () => {
      const mutating = granted.filter(
        (permission) =>
          !permission.endsWith('_READ') &&
          !permission.endsWith('_QUERY') &&
          !permission.endsWith('_LETTER_VIEW'),
      );
      expect(mutating).toEqual([]);
    });

    /** The delta from the read-only internal column, which is what this role became. */
    it('is the read-only column minus Work Bench, plus check-scale read, letter views and Maintain Questions', () => {
      const readOnlyInternal = new Set<PERMISSION_TYPE>(PERMISSIONS_BY_ROLE.SCS_CLERICAL);
      const mine = new Set<PERMISSION_TYPE>(granted);

      expect(
        [...readOnlyInternal].filter((permission) => !mine.has(permission)).sort(),
      ).toEqual([PERMISSIONS.WORKBENCH_QUERY].sort());

      expect(
        [...mine].filter((permission) => !readOnlyInternal.has(permission)).sort(),
      ).toEqual(
        [
          PERMISSIONS.CHECK_SCALE_QUERY,
          PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW,
          PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
          PERMISSIONS.MSD_LETTER_VIEW,
          PERMISSIONS.MAINTAIN_QUESTIONS_QUERY,
          PERMISSIONS.MAINTAIN_QUESTIONS_READ,
        ].sort(),
      );
    });

    /**
     * The whole point of splitting `_LETTER` into two verbs — this is the only role that may open a
     * letter someone else composed without being able to compose one. The advisory letter is absent
     * from both halves: SCS stores none, so there is nothing for a view verb to fetch.
     */
    it('views letters without composing any, and reaches no advisory letter', () => {
      for (const permission of [
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
        PERMISSIONS.MSD_LETTER_VIEW,
      ]) {
        expect(granted).toContain(permission);
      }

      for (const denied of [
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.MSD_LETTER_CREATE,
        PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });

    /**
     * The reversal, pinned so it cannot drift back. §I's four rows and §D's tab row gave this column
     * check-scale writes and §H gave it inspection writes; the client's rule withdrew all of them and
     * left the reads.
     */
    it('reads check scales and site inspections without recording either', () => {
      for (const permission of [
        PERMISSIONS.CHECK_SCALE_QUERY,
        PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
        PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
        PERMISSIONS.SCALE_SITE_INSPECTION_READ,
      ]) {
        expect(granted).toContain(permission);
      }

      for (const denied of [
        PERMISSIONS.CHECK_SCALE_CREATE,
        PERMISSIONS.CHECK_SCALE_UPDATE,
        PERMISSIONS.CHECK_SCALE_DELETE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE,
        PERMISSIONS.SCALE_SITE_INSPECTION_CREATE,
        PERMISSIONS.SCALE_SITE_INSPECTION_UPDATE,
        PERMISSIONS.SCALE_SITE_INSPECTION_DELETE,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_CREATE,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE,
        PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });

    /** Read on both subjects: this column is not one of the four create roles the client named. */
    it('reads risk assessments on both subjects without authoring one', () => {
      for (const permission of [
        PERMISSIONS.SCALER_RISK_RATING_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
        PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
      ]) {
        expect(granted).toContain(permission);
      }

      for (const denied of [
        PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
      ]) {
        expect(granted).not.toContain(denied);
      }
    });

    /** §J's one cell for a non-administrator, and it is read-only. */
    it('reads the inspection questions screen without being able to change it', () => {
      expect(granted).toContain(PERMISSIONS.MAINTAIN_QUESTIONS_QUERY);
      expect(granted).toContain(PERMISSIONS.MAINTAIN_QUESTIONS_READ);
      expect(granted).not.toContain(PERMISSIONS.MAINTAIN_QUESTIONS_CREATE);
      expect(granted).not.toContain(PERMISSIONS.MAINTAIN_QUESTIONS_UPDATE);
      expect(granted).not.toContain(PERMISSIONS.MAINTAIN_QUESTIONS_DELETE);
      // No other maintenance area leaks in — §J is `-` on every other row for this column.
      expect(
        granted.filter(
          (permission) =>
            permission.startsWith('MAINTAIN_') && !permission.startsWith('MAINTAIN_QUESTIONS_'),
        ),
      ).toEqual([]);
    });

    it('has no Work Bench, unlike every other enabled internal role', () => {
      expect(granted).not.toContain(PERMISSIONS.WORKBENCH_QUERY);
    });

    it('grants its column with no forest client number', () => {
      const withoutClient = permissionsFor(userWithoutClient(['SCS_CE_TECHNICIAN']));
      expect(withoutClient.has(PERMISSIONS.CHECK_SCALE_QUERY)).toBe(true);
      expect(withoutClient.size).toBe(granted.length);
    });
  });

  describe('district scaling manager', () => {
    const granted = PERMISSIONS_BY_ROLE.SCS_DIST_SCALING_MANAGER;

    /**
     * The shape of the column: almost the administrator, minus the deletes. Asserted as the delta from
     * `ALL_PERMISSIONS` so it reads as "what the administrator has and this role does not" — which is
     * the list a reviewer wants to check against §3's `CRUD`-vs-`CRU` columns.
     */
    it('is the administrator minus the deletes, Maintain System, and a signatory create', () => {
      const missing = ALL_PERMISSIONS.filter((permission) => !granted.includes(permission)).sort();

      expect(missing).toEqual(
        [
          // §C "Summary – Edit" is RU here, RUD for the administrator
          PERMISSIONS.SCALER_DELETE,
          // §C Exams / Appointments are CRU, CRUD for the administrator
          PERMISSIONS.SCALER_EXAM_DELETE,
          PERMISSIONS.SCALER_APPOINTMENT_DELETE,
          // §H has no delete row for any column; §I's D is the administrator's alone
          PERMISSIONS.SCALE_SITE_INSPECTION_DELETE,
          PERMISSIONS.CHECK_SCALE_DELETE,
          PERMISSIONS.SUMMARY_CHECK_SCALE_DELETE,
          // §J is CRU throughout: this role authors reference data it cannot remove
          PERMISSIONS.MAINTAIN_QUESTIONS_CREATE,
          PERMISSIONS.MAINTAIN_QUESTIONS_UPDATE,
          PERMISSIONS.MAINTAIN_QUESTIONS_DELETE,
          PERMISSIONS.MAINTAIN_TEMPLATES_DELETE,
          PERMISSIONS.MAINTAIN_CONDITIONS_DELETE,
          PERMISSIONS.MAINTAIN_EXAM_UPGRADES_DELETE,
          PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_DELETE,
          PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE,
          PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_DELETE,
          // §J Signatories are RU (dist) — the one maintenance area with no C
          PERMISSIONS.MAINTAIN_SIGNATORIES_CREATE,
          PERMISSIONS.MAINTAIN_SIGNATORIES_DELETE,
          // §J "Maintain System" is - for every column but the administrator
          PERMISSIONS.MAINTAIN_SYSTEM_READ,
          PERMISSIONS.MAINTAIN_SYSTEM_UPDATE,
          PERMISSIONS.SYSTEM_ADMIN,
        ].sort(),
      );
    });

    /** The first column to reach the create wizards — §C/§D/§E/§F all give it the `C`. */
    it('opens every create wizard', () => {
      for (const permission of [
        PERMISSIONS.SCALER_CREATE,
        PERMISSIONS.SCALE_SITE_CREATE,
        PERMISSIONS.SCALER_AUTHORIZATION_CREATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_CREATE,
        PERMISSIONS.MSD_CREATE,
        PERMISSIONS.CHECK_SCALE_CREATE,
        PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE,
      ]) {
        expect(granted).toContain(permission);
      }
    });

    /**
     * REG_SCAL_MAN and REG_DIST_MAN are two of the four create roles the client's 2026-09-02 spec
     * names, so this column holds every verb either subject exposes. The `_UPDATE`s matter — while
     * §D's lone `CR` was being read as the ceiling they were administrator-only, which left the two
     * assessment edit routes unreachable by anyone else.
     */
    it('holds every risk-assessment verb for both subjects', () => {
      for (const permission of [
        PERMISSIONS.SCALER_RISK_RATING_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE,
        PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE,
        PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
      ]) {
        expect(granted).toContain(permission);
      }
    });

    /**
     * Every letter verb, view and create alike: the client's 2026-09-02 spec names REG_SCAL_MAN and
     * REG_DIST_MAN among the four with "access to all letters". Seven, not eight — the advisory letter
     * has no view verb because SCS stores no advisory letter.
     */
    it('issues and views every letter', () => {
      for (const permission of [
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
        PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
        PERMISSIONS.MSD_LETTER_CREATE,
        PERMISSIONS.MSD_LETTER_VIEW,
        PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE,
        PERMISSIONS.LETTER_SIGNATORY_QUERY,
      ]) {
        expect(granted).toContain(permission);
      }
    });

    it('grants its column with no forest client number', () => {
      const withoutClient = permissionsFor(userWithoutClient(['SCS_DIST_SCALING_MANAGER']));
      expect(withoutClient.has(PERMISSIONS.SCALER_CREATE)).toBe(true);
      expect(withoutClient.size).toBe(granted.length);
    });
  });

  /**
   * The roll-out is complete: every one of the eleven columns is filled in, so "recognised but not
   * enabled" no longer exists as a state. The inverse is what needs guarding now — a role left holding
   * welcome access alone would mean a column was emptied by accident, not staged.
   */
  describe('the roll-out is complete', () => {
    it('gives all eleven roles a real column, none welcome-only', () => {
      expect(AVAILABLE_ROLES).toHaveLength(11);

      for (const role of AVAILABLE_ROLES) {
        const granted = PERMISSIONS_BY_ROLE[role];
        expect(granted.length, `${role} holds one permission or none`).toBeGreaterThan(1);
        expect(granted, `${role} is welcome-only`).not.toEqual([PERMISSIONS.WELCOME_READ]);
      }
    });

    /** The two scaling-manager columns are the same list; §3 gives them identical cells. */
    it('gives the two scaling managers the same column', () => {
      expect([...PERMISSIONS_BY_ROLE.SCS_REGIONAL_SCALING_MANAGER].sort()).toEqual(
        [...PERMISSIONS_BY_ROLE.SCS_DIST_SCALING_MANAGER].sort(),
      );
    });
  });

  /**
   * The letter pages load their signatory picker from `GET /letter-signature-blocks`, gated on
   * `LETTER_SIGNATORY_QUERY`. A letter author without it gets an empty picker — the nr-scs #286
   * follow-up, when the picker borrowed §J's `MAINTAIN_SIGNATORIES_QUERY` and the Check Scaler, a
   * letter author with no §J access, issued letters with no signatory. Pinned both ways.
   */
  describe('letter signatory lookup', () => {
    const letterCreateVerbs = ALL_PERMISSIONS.filter((permission) => permission.endsWith('_LETTER_CREATE'));

    it('is held by exactly the roles holding a _LETTER_CREATE verb', () => {
      expect(letterCreateVerbs.length).toBe(4);

      for (const role of AVAILABLE_ROLES) {
        const granted = PERMISSIONS_BY_ROLE[role];
        const authorsALetter = letterCreateVerbs.some((verb) => granted.includes(verb));
        expect(granted.includes(PERMISSIONS.LETTER_SIGNATORY_QUERY), role).toBe(authorsALetter);
      }
    });

    it('is ADM, CHK, DSM and RSM today — and CHK still holds no Maintain Signatories verb', () => {
      const holders = AVAILABLE_ROLES.filter((role) =>
        PERMISSIONS_BY_ROLE[role].includes(PERMISSIONS.LETTER_SIGNATORY_QUERY),
      ).sort();
      expect(holders).toEqual(
        ['SCS_CHECK_SCALER', 'SCS_DIST_SCALING_MANAGER', 'SCS_REGIONAL_SCALING_MANAGER', 'SCS_SYS_ADMIN'].sort(),
      );
      expect(
        PERMISSIONS_BY_ROLE.SCS_CHECK_SCALER.filter((permission) => permission.startsWith('MAINTAIN_SIGNATORIES_')),
      ).toEqual([]);
    });
  });

  describe('permissionsFor', () => {
    /**
     * Two columns that each hold something the other does not, so the result can only come from a
     * union: §D gives the Owner the site register, §F gives the Industry Scaler the standalone MSD
     * screens. (Paired with `SCS_CLERICAL` this was vacuous once that column was enabled — it is a
     * superset of the Industry Scaler's, so either role alone would satisfy both assertions.)
     */
    it('unions the permissions of every role held', () => {
      const granted = permissionsFor(userWith(['SCS_INDUSTRY_SCALER', 'SCS_OWNER']));
      expect(granted.has(PERMISSIONS.SCALE_SITE_QUERY)).toBe(true);
      expect(granted.has(PERMISSIONS.MSD_QUERY)).toBe(true);
      expect(granted.has(PERMISSIONS.WELCOME_READ)).toBe(true);
    });

    it('grants nothing for an unrecognised role (fail closed)', () => {
      expect(permissionsFor(userWith(['SCS_MADE_UP'])).size).toBe(0);
    });

    it('grants nothing when not signed in or role-less', () => {
      expect(permissionsFor(undefined).size).toBe(0);
      expect(permissionsFor(userWith(undefined)).size).toBe(0);
      expect(permissionsFor(userWith([])).size).toBe(0);
    });

    /**
     * Mirrors the backend's `RolePermissions.expandAuthorities`: a client-scoped role means "may act
     * on this client's rows", so with no client number there is nothing to act on and nothing is
     * granted — not even WELCOME_READ.
     */
    describe('client-scoped roles require a client number', () => {
      it('grants nothing to an Industry Scaler with no client number', () => {
        expect(permissionsFor(userWithoutClient(['SCS_INDUSTRY_SCALER'])).size).toBe(0);
      });

      it('grants nothing when clientNumbers is present but empty', () => {
        expect(
          permissionsFor({ privileges: {}, roles: ['SCS_INDUSTRY_SCALER'], clientNumbers: [] }).size,
        ).toBe(0);
      });

      it('grants the full column once a client number is present', () => {
        const granted = permissionsFor(userWith(['SCS_INDUSTRY_SCALER']));
        expect(granted.has(PERMISSIONS.WELCOME_READ)).toBe(true);
        expect(granted.has(PERMISSIONS.SCALER_READ)).toBe(true);
      });

      it('applies to SCS_OWNER too, not just Industry Scaler', () => {
        expect(permissionsFor(userWithoutClient(['SCS_OWNER'])).size).toBe(0);
      });

      it('leaves an internal role unaffected by a missing client number', () => {
        const granted = permissionsFor(userWithoutClient(['SCS_CLERICAL']));
        expect(granted.has(PERMISSIONS.WELCOME_READ)).toBe(true);
        // Its whole column survives, not just the welcome floor.
        expect(granted.has(PERMISSIONS.SCALER_READ)).toBe(true);
      });

      /**
       * Now that every column is filled in, this can no longer be shown the way it used to be. The old
       * form paired the client-less external role with a welcome-only one and asserted `SCALER_READ` was
       * absent; there is no welcome-only role left to borrow, and **every** internal column is a
       * superset of the external ones, so any pairing grants `SCALER_READ` from the internal side.
       *
       * What is still assertable here is that the union equals the internal role's own column exactly —
       * the external role added nothing. The falsifiable half of the rule (the role *authority* itself
       * being withheld, so the coarse `/api/**` gate refuses before any handler runs) lives on the
       * backend, where authorities are visible: see `RolePermissionsTest.Expansion` and
       * `ClientScopeRequired.mixedRolesKeepTheInternalRolesPermissions`.
       */
      it('adds nothing when a client-scoped role is held alongside an internal one', () => {
        const paired = permissionsFor(
          userWithoutClient(['SCS_INDUSTRY_SCALER', 'SCS_CE_TECHNICIAN']),
        );
        const internalAlone = permissionsFor(userWithoutClient(['SCS_CE_TECHNICIAN']));

        expect([...paired].sort()).toEqual([...internalAlone].sort());
      });
    });
  });

  describe('hasPermission', () => {
    it('is true when the role grants it', () => {
      expect(hasPermission(userWith(['SCS_INDUSTRY_SCALER']), PERMISSIONS.SCALER_READ)).toBe(true);
    });

    it('is false when the role does not grant it', () => {
      expect(hasPermission(userWith(['SCS_INDUSTRY_SCALER']), PERMISSIONS.SCALER_UPDATE)).toBe(
        false,
      );
    });

    it('treats an undefined permission as "not required"', () => {
      expect(hasPermission(userWith(['SCS_INDUSTRY_SCALER']), undefined)).toBe(true);
      expect(hasPermission(undefined, undefined)).toBe(true);
    });

    it('is false for a signed-out user', () => {
      expect(hasPermission(undefined, PERMISSIONS.SCALER_READ)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('is true when at least one is held', () => {
      expect(
        hasAnyPermission(userWith(['SCS_INDUSTRY_SCALER']), [
          PERMISSIONS.SCALER_UPDATE,
          PERMISSIONS.SCALER_READ,
        ]),
      ).toBe(true);
    });

    it('is false when none are held', () => {
      expect(
        hasAnyPermission(userWith(['SCS_INDUSTRY_SCALER']), [
          PERMISSIONS.SCALER_UPDATE,
          PERMISSIONS.REPORT_READ,
        ]),
      ).toBe(false);
    });

    it('treats an empty list as "nothing required"', () => {
      expect(hasAnyPermission(userWith([]), [])).toBe(true);
    });
  });
});
