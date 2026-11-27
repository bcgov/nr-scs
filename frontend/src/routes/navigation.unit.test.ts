import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PERMISSIONS, PERMISSIONS_BY_ROLE, type PERMISSION_TYPE } from '@/context/auth/permissions';

import {
  NAVIGATION_ITEMS,
  filterNavigation,
  isNavGroup,
  type NavItem,
  type NavLinkItem,
} from './navigation';

const flatten = (items: readonly NavItem[]): NavLinkItem[] =>
  items.flatMap((item) => (isNavGroup(item) ? flatten(item.children) : [item]));

/**
 * `path` -> the permission its `ProtectedRoute` requires, read out of `routePaths.tsx` source.
 *
 * Read from disk rather than imported because importing the module pulls in every page component (and
 * their stylesheets) — the same reason `linkGating.unit.test.ts` parses source. Each entry runs from its
 * `path:` to the next one, so a route's permission cannot be attributed to its neighbour.
 */
const routePermissionsByPath = (): Map<string, string | undefined> => {
  const source = readFileSync(join(process.cwd(), 'src', 'routes', 'routePaths.tsx'), 'utf8');
  const entries = new Map<string, string | undefined>();

  const pathMatches = [...source.matchAll(/path:\s*'([^']+)'/g)];
  pathMatches.forEach((match, index) => {
    const blockStart = match.index ?? 0;
    const blockEnd = pathMatches[index + 1]?.index ?? source.length;
    const block = source.slice(blockStart, blockEnd);
    entries.set(match[1], /permission=\{PERMISSIONS\.(\w+)\}/.exec(block)?.[1]);
  });

  return entries;
};

/** A `can` predicate for a role, as `usePermissions` would produce. */
const canFor = (role: keyof typeof PERMISSIONS_BY_ROLE) => {
  const granted = new Set<PERMISSION_TYPE>(PERMISSIONS_BY_ROLE[role]);
  return (permission: PERMISSION_TYPE) => granted.has(permission);
};

/**
 * Which permission each guarded route requires — the frontend counterpart of the backend's
 * `ControllerPermissionMapTest`.
 *
 * The tests above prove every route declares *a* permission; this pins *which*. Without it a route
 * could be moved from `SCALER_READ` to `SCALER_QUERY` and nothing would fail: it still declares a
 * permission, and only the handful of routes a nav leaf links to are otherwise checked against one.
 * The view/edit/create screens — the ones a deep link reaches without touching the menu — are exactly
 * the unchecked majority.
 *
 * Lower stakes than the backend table: the API enforces independently, so a too-loose route opens a
 * screen whose data still 403s (a broken-looking page, not a leak), and a too-tight one locks out a
 * legitimate role. Both are bugs worth catching; neither is a security hole.
 *
 * Check a changed row against roles-permissions.md §3 before accepting it.
 */
const EXPECTED_ROUTE_PERMISSIONS: ReadonlyArray<readonly [string, string]> = [
  ['/client', 'CLIENT_QUERY'],
  ['/scalers', 'SCALER_QUERY'],
  ['/check-scales/view/:checkScaleId', 'CHECK_SCALE_QUERY'],
  ['/check-scales/edit/:checkScaleId', 'CHECK_SCALE_UPDATE'],
  ['/mark-site-designations/view', 'MSD_READ'],
  ['/scalers/summary', 'SCALER_READ'],
  ['/scalers/view/:scalerLicenceNo', 'SCALER_READ'],
  ['/scale-sites', 'SCALE_SITE_QUERY'],
  ['/scale-sites/view/:scaleSiteIdNmbr', 'SCALE_SITE_READ'],
  ['/scaler-authorizations/view/:scalerAuthorizationId', 'SCALER_AUTHORIZATION_READ'],
  ['/mark-site-designations/edit/:authorizationId', 'MSD_UPDATE'],
  ['/scaler-authorizations/edit/:scalerAuthorizationId', 'SCALER_AUTHORIZATION_UPDATE'],
  ['/scaler-authorizations/:scalerAuthorizationId/letter', 'SCALER_AUTHORIZATION_LETTER_CREATE'],
  ['/check-scales/:checkScaleId/advisory-letter', 'CHECK_SCALE_ADVISORY_LETTER_CREATE'],
  ['/scale-site-authorizations/view/:scaleSiteAuthorizationId', 'SCALE_SITE_AUTHORIZATION_READ'],
  ['/scale-site-authorizations/edit/:scaleSiteAuthorizationId', 'SCALE_SITE_AUTHORIZATION_UPDATE'],
  ['/scale-site-authorizations/:scaleSiteAuthorizationId/letter', 'SCALE_SITE_AUTHORIZATION_LETTER_CREATE'],
  ['/mark-site-designations/:haulingMarkAuthorizationId/letter', 'MSD_LETTER_CREATE'],
  ['/scale-sites/:scaleSiteIdNmbr/inspections/view/:inspectionId', 'SCALE_SITE_INSPECTION_READ'],
  ['/scale-sites/:scaleSiteIdNmbr/inspections/edit/:inspectionId', 'SCALE_SITE_INSPECTION_UPDATE'],
  ['/scale-sites/:scaleSiteIdNmbr/inspections/create', 'SCALE_SITE_INSPECTION_CREATE'],
  ['/mark-site-designations', 'MSD_QUERY'],
  ['/scaler-risk-assessments', 'SCALER_RISK_ASSESSMENT_QUERY'],
  ['/scale-site-risk-assessments/view/:riskQuestionnaireId', 'SCALE_SITE_RISK_ASSESSMENT_READ'],
  ['/scale-site-risk-assessments/edit/:riskQuestionnaireId', 'SCALE_SITE_RISK_ASSESSMENT_UPDATE'],
  ['/scaler-risk-assessments/view/:riskQuestionnaireId', 'SCALER_RISK_ASSESSMENT_READ'],
  ['/scaler-risk-assessments/edit/:riskQuestionnaireId', 'SCALER_RISK_ASSESSMENT_UPDATE'],
  ['/scalers/:scalerLicenceNo/risk-assessments/create', 'SCALER_RISK_ASSESSMENT_CREATE'],
  ['/scale-sites/:scaleSiteIdNmbr/risk-assessments/create', 'SCALE_SITE_RISK_ASSESSMENT_CREATE'],
  ['/scale-site-risk-assessments', 'SCALE_SITE_RISK_ASSESSMENT_QUERY'],
  ['/reports/scaler-register', 'REPORT_READ'],
  ['/reports/scale-site-register', 'REPORT_READ'],
  ['/reports/mark-site-designation', 'REPORT_READ'],
  ['/reports/designated-mark-exception', 'REPORT_READ'],
  ['/reports/scaling-administration', 'REPORT_READ'],
  ['/reports/scaling-exception', 'REPORT_READ'],
  ['/reports/district-check-scale-performance', 'REPORT_READ'],
  ['/reports/district-site-inspection-performance', 'REPORT_READ'],
  ['/reports/scale-site-compliance/:inspectionId', 'REPORT_READ'],
  ['/workbench', 'WORKBENCH_QUERY'],
  ['/maintenance/templates', 'MAINTAIN_TEMPLATES_QUERY'],
  ['/maintenance/conditions', 'MAINTAIN_CONDITIONS_QUERY'],
  ['/maintenance/questions', 'MAINTAIN_QUESTIONS_QUERY'],
  ['/maintenance/signature-blocks', 'MAINTAIN_SIGNATORIES_QUERY'],
  ['/maintenance/exam-upgrades', 'MAINTAIN_EXAM_UPGRADES_QUERY'],
  ['/maintenance/appointment-types', 'MAINTAIN_APPOINTMENT_TYPES_QUERY'],
  ['/maintenance/valid-licence-attributes', 'MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY'],
  ['/maintenance/authorization-clauses', 'MAINTAIN_AUTHORIZATION_CLAUSES_QUERY'],
  ['/maintenance/system', 'MAINTAIN_SYSTEM_READ'],
  ['/scalers/create', 'SCALER_CREATE'],
  ['/scale-sites/create', 'SCALE_SITE_CREATE'],
  ['/check-scales/create', 'CHECK_SCALE_CREATE'],
  ['/summary-check-scales/create', 'SUMMARY_CHECK_SCALE_CREATE'],
  ['/summary-check-scales/:checkScaleId/edit', 'SUMMARY_CHECK_SCALE_UPDATE'],
  ['/mark-site-designations/create', 'MSD_CREATE'],
  ['/scaler-authorizations/create', 'SCALER_AUTHORIZATION_CREATE'],
  ['/scale-site-authorizations/create', 'SCALE_SITE_AUTHORIZATION_CREATE'],
  ['/scale-site-authorizations', 'SCALE_SITE_AUTHORIZATION_QUERY'],
];

describe('navigation', () => {
  it('gives every leaf entry a known permission', () => {
    const leaves = flatten(NAVIGATION_ITEMS);
    expect(leaves.length).toBeGreaterThan(20);
    for (const leaf of leaves) {
      expect(leaf.permission, `${leaf.name} has no permission`).toBeDefined();
      expect(Object.values(PERMISSIONS)).toContain(leaf.permission);
    }
  });

  it('gives every leaf entry a distinct path', () => {
    const paths = flatten(NAVIGATION_ITEMS).map((leaf) => leaf.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  /**
   * A nav entry and the route it points at must require the same permission, or the sidebar shows a
   * link that lands on `/unauthorized` (nav looser than route) or hides a screen the user may open
   * (nav tighter). Neither is caught by asserting each side against the permission vocabulary alone,
   * which is all the checks above do.
   */
  it('requires the same permission on each leaf as the route it links to', () => {
    const routePermissions = routePermissionsByPath();
    // A broken parse would make every assertion below vacuous.
    expect(routePermissions.size).toBeGreaterThan(50);

    const mismatched: string[] = [];
    for (const leaf of flatten(NAVIGATION_ITEMS)) {
      if (!routePermissions.has(leaf.path)) {
        mismatched.push(`${leaf.name} (${leaf.path}) has no route in routePaths.tsx`);
        continue;
      }
      const routePermission = routePermissions.get(leaf.path);
      if (routePermission !== leaf.permission) {
        mismatched.push(
          `${leaf.name} (${leaf.path}): nav requires ${leaf.permission}, route requires ${routePermission ?? 'nothing'}`,
        );
      }
    }

    expect(mismatched, mismatched.join('\n')).toEqual([]);
  });

  /**
   * The frontend counterpart of the backend's `ControllerAuthorizationConventionTest`: there, a handler
   * shipped without `@RequiresPermission` is reachable by every authenticated role; here, a route
   * shipped without a `permission` is reachable by every signed-in user.
   *
   * The test above only covers routes a nav leaf links to — a minority, since most routes are view,
   * edit, and create screens reached from within a record. Those are exactly the ones a deep link can
   * reach without ever touching the menu, so they need the check more, not less.
   */
  it('requires a permission on every route except the deliberately open ones', () => {
    // The six routes that must stay open: the entry/redirect pair, the OAuth sign-in callback (the
    // session does not exist until it runs), the two error pages (a user sent to /unauthorized must
    // be able to render it), and the catch-all.
    const openByDesign = new Set(['/', '/welcome', '/authCallback', '/unauthorized', '/error', '*']);

    const routePermissions = routePermissionsByPath();
    expect(routePermissions.size).toBeGreaterThan(50);

    const unguarded = [...routePermissions.entries()]
      .filter(([path, permission]) => !permission && !openByDesign.has(path))
      .map(([path]) => path);

    expect(
      unguarded,
      `Routes with no permission are reachable by every signed-in user. Add a permission to each, ` +
        `or add it to openByDesign with a reason:\n${unguarded.join('\n')}`,
    ).toEqual([]);
  });

  it('requires exactly the pinned permission on every guarded route', () => {
    const actual = routePermissionsByPath();
    const expected = new Map(EXPECTED_ROUTE_PERMISSIONS);
    expect(actual.size).toBeGreaterThan(50);

    const problems: string[] = [];
    for (const [path, permission] of actual) {
      // Unguarded routes are the other two tests' business; this one only pins the guarded ones.
      if (!permission) {
        continue;
      }
      const want = expected.get(path);
      if (want === undefined) {
        problems.push(`ADDED    ${path} -> ${permission} (new route — confirm against §3)`);
      } else if (want !== permission) {
        problems.push(`CHANGED  ${path}: expected ${want} but is ${permission}`);
      }
    }
    for (const [path] of expected) {
      if (!actual.has(path)) {
        problems.push(`REMOVED  ${path} (route gone — delete the row)`);
      }
    }

    expect(
      problems,
      `The route -> permission map changed. Check each row against roles-permissions.md §3 before ` +
        `updating EXPECTED_ROUTE_PERMISSIONS — never paste without reading, or this becomes a test ` +
        `that records whatever the code does:\n${problems.join('\n')}`,
    ).toEqual([]);
  });

  it('does not leave a deliberately-open route in the list once it is guarded', () => {
    // Keeps the allowlist honest: a route that gains a permission must leave `openByDesign`, or the
    // exemption silently outlives its reason and would wave through a later regression on that path.
    const routePermissions = routePermissionsByPath();
    const stale = ['/', '/welcome', '/authCallback', '/unauthorized', '/error', '*'].filter(
      (path) => routePermissions.get(path) !== undefined,
    );

    expect(stale, `These routes now declare a permission — drop them from openByDesign: ${stale}`)
      .toEqual([]);
  });

  describe('filterNavigation', () => {
    it('shows an administrator the whole tree', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_SYS_ADMIN'));
      expect(visible.map((item) => item.name)).toEqual([
        'Queries',
        'Reports',
        'Create',
        'Administration',
      ]);
      expect(flatten(visible).length).toBe(flatten(NAVIGATION_ITEMS).length);
    });

    /**
     * Legacy parity: `MenuUtils.getIndScalerMenus()` gave an Industry Scaler the Queries menu and
     * nothing else — no Reports, Create, Handheld or Administration.
     */
    it('shows an Industry Scaler the Queries menu only', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_INDUSTRY_SCALER'));
      expect(visible.map((item) => item.name)).toEqual(['Queries']);
    });

    it('shows an Industry Scaler only the query screens in their scope', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_INDUSTRY_SCALER'));
      expect(flatten(visible).map((leaf) => leaf.name)).toEqual([
        'Clients',
        'Scalers',
        'Mark Site Designations',
      ]);
    });

    /**
     * The role reads its own scaler's risk assessments, but from the RECORD — its Risk Rating tab lists
     * and links them. Both nav entries are gated on `*_RISK_ASSESSMENT_QUERY`, which this column does not
     * hold on either subject (2026-09-03), so neither search screen appears.
     */
    it('offers no risk-assessment search screen to an Industry Scaler', () => {
      const paths = flatten(filterNavigation(NAVIGATION_ITEMS, canFor('SCS_INDUSTRY_SCALER'))).map(
        (leaf) => leaf.path,
      );
      expect(paths).not.toContain('/scaler-risk-assessments');
      expect(paths).not.toContain('/scale-site-risk-assessments');
    });

    it('omits Scale Sites for an Industry Scaler, who may read a site but not search the register', () => {
      const paths = flatten(filterNavigation(NAVIGATION_ITEMS, canFor('SCS_INDUSTRY_SCALER'))).map(
        (leaf) => leaf.path,
      );
      expect(paths).not.toContain('/scale-sites');
    });

    /**
     * Legacy parity: `MenuUtils.getOwnerMenus()` returned the Queries menu alone, exactly as
     * `getIndScalerMenus()` did — but §D grants this role "Queries – Scale Sites" plain `R`, so the
     * leaves differ. No Mark Site Designations entry: §F is `-` for `OWN` throughout, and the MSD the
     * role *can* read is the site record's tab, which is not a nav entry.
     */
    it('shows a Scale Site Owner the Queries menu only', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_OWNER'));
      expect(visible.map((item) => item.name)).toEqual(['Queries']);
    });

    it('shows a Scale Site Owner Clients, Scalers and Scale Sites', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_OWNER'));
      expect(flatten(visible).map((leaf) => leaf.name)).toEqual([
        'Clients',
        'Scalers',
        'Scale Sites',
      ]);
    });

    /**
     * As for the Industry Scaler: this role reads its own sites' risk assessments from the site record's
     * Risk Rating tab, not from a search screen. Worth its own assertion here because the role *does*
     * hold `SCALE_SITE_QUERY` — the Scale Sites entry above proves the nav is not simply empty — so the
     * missing entry is about the assessment register specifically.
     */
    it('offers no risk-assessment search screen to a Scale Site Owner', () => {
      const paths = flatten(filterNavigation(NAVIGATION_ITEMS, canFor('SCS_OWNER'))).map(
        (leaf) => leaf.path,
      );
      expect(paths).toContain('/scale-sites');
      expect(paths).not.toContain('/scale-site-risk-assessments');
      expect(paths).not.toContain('/scaler-risk-assessments');
    });

    /**
     * Legacy parity: `MenuUtils.getCheckScalerMenus()` returned *every* top-level menu — Create,
     * Queries, Reports, Administration (and Handheld, descoped). All four survive here, so this is the
     * first enabled role with more than the Queries menu.
     */
    it('shows a Check Scaler all four top-level menus', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CHECK_SCALER'));
      expect(visible.map((item) => item.name)).toEqual([
        'Queries',
        'Reports',
        'Create',
        'Administration',
      ]);
    });

    /**
     * The leaves are where the matrix bites, and three groups are pruned rather than dropped:
     * Queries loses both Risk Assessment screens (§D "Risk Rating Criteria" is `-`, and RSK has no
     * other row), Create keeps only the three record types the role may author, and Administration
     * keeps Work Bench while §J's `-`-throughout empties the Maintenance subgroup.
     */
    it('shows a Check Scaler the query, report, create and work bench screens it may use', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CHECK_SCALER'));
      expect(flatten(visible).map((leaf) => leaf.name)).toEqual([
        'Clients',
        'Scalers',
        'Scale Sites',
        'Mark Site Designations',
        // Risk assessment follows the record: these columns read every tab of both records
        'Scaler Risk Assessment',
        'Scale Site Risk Assessment',
        'Scaler Register',
        'Scale Site Register',
        'Mark Site Designation',
        'Designated Mark Exemption',
        'Scaling Administration',
        'Scaling Exception',
        'District Check Scale Performance',
        'District Site Inspection Performance',
        'Check Scale',
        'Summary Check Scale',
        'Mark Site Designation',
        'Work Bench',
      ]);
    });

    /** §J is `-` for `CHK` on every row, so the nested group disappears rather than rendering empty. */
    it('drops the Maintenance subgroup for a Check Scaler while keeping Work Bench', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CHECK_SCALER'));
      const administration = visible.find((item) => item.name === 'Administration');
      expect(administration && isNavGroup(administration)).toBe(true);
      const children =
        administration && isNavGroup(administration)
          ? administration.children.map((child) => child.name)
          : [];
      expect(children).toEqual(['Work Bench']);
    });

    /** §C/§D/§E deny every "– Create" row a wizard hangs off; only the four writes it owns remain. */
    it('omits the Scaler, Scale Site and Authorization create entries for a Check Scaler', () => {
      const paths = flatten(filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CHECK_SCALER'))).map(
        (leaf) => leaf.path,
      );
      for (const denied of [
        '/scalers/create',
        '/scale-sites/create',
        '/scaler-authorizations/create',
        '/scale-site-authorizations/create',
      ]) {
        expect(paths).not.toContain(denied);
      }
    });

    /**
     * Legacy parity: `MenuUtils` mapped `SCS_BRANCH_DIST_CLERICAL` to `getAQRMenus()` —
     * Administration, Queries and Reports. **No Create menu**, which is what holding no `_CREATE`
     * permission produces, so the port needs no special case for it.
     */
    it('shows a Clerical user the Queries, Reports and Administration menus — never Create', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CLERICAL'));
      expect(visible.map((item) => item.name)).toEqual(['Queries', 'Reports', 'Administration']);
    });

    /**
     * The same leaves as the Check Scaler's, minus the three Create entries — the role is the read-only
     * subset of that column. Queries still loses both Risk Assessment screens (§D "Risk Rating
     * Criteria" is `-`), and Administration keeps Work Bench while §J empties Maintenance.
     */
    it('shows a Clerical user the query, report and work bench screens it may read', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CLERICAL'));
      expect(flatten(visible).map((leaf) => leaf.name)).toEqual([
        'Clients',
        'Scalers',
        'Scale Sites',
        'Mark Site Designations',
        // Risk assessment follows the record: these columns read every tab of both records
        'Scaler Risk Assessment',
        'Scale Site Risk Assessment',
        'Scaler Register',
        'Scale Site Register',
        'Mark Site Designation',
        'Designated Mark Exemption',
        'Scaling Administration',
        'Scaling Exception',
        'District Check Scale Performance',
        'District Site Inspection Performance',
        'Work Bench',
      ]);
    });

    /** §J is `-` for `CLE` too, so Administration is Work Bench alone rather than an empty group. */
    it('drops the Maintenance subgroup for a Clerical user while keeping Work Bench', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CLERICAL'));
      const administration = visible.find((item) => item.name === 'Administration');
      expect(administration && isNavGroup(administration)).toBe(true);
      const children =
        administration && isNavGroup(administration)
          ? administration.children.map((child) => child.name)
          : [];
      expect(children).toEqual(['Work Bench']);
    });

    /**
     * Legacy parity, and the same mapping the clerical role got: `MenuUtils` sent both
     * `SCS_BRANCH_DIST_CLERICAL` and `SCS_BRANCH_SYS_SUPPORT` to `getAQRMenus()` — Administration,
     * Queries, Reports. `scsMenu.jsp` then wrapped the whole Maintenance submenu in one WebADE action
     * while leaving Work Bench unconditional, which is exactly the shape §J's `-` produces here.
     */
    it.each([
      ['SCS_BRANCH_SYS_SUPPORT' as const],
      ['SCS_REGIONAL_MANAGER' as const],
      // The District Manager's extra permission gates a control, not a nav entry, so its menus match too.
      ['SCS_DIST_MANAGER' as const],
    ])(
      'shows %s the same menus as a Clerical user',
      (role) => {
        const visible = filterNavigation(NAVIGATION_ITEMS, canFor(role));
        const clerical = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CLERICAL'));

        expect(visible.map((item) => item.name)).toEqual(['Queries', 'Reports', 'Administration']);
        expect(flatten(visible).map((leaf) => leaf.path)).toEqual(
          flatten(clerical).map((leaf) => leaf.path),
        );
      },
    );

    /**
     * §4 claims this role creates scaler licences; §3 and legacy's menu map both deny it. The visible
     * consequence is that the Create menu never appears — the same shape the other two share.
     */
    it('omits the Create menu for a Regional Manager', () => {
      const paths = flatten(filterNavigation(NAVIGATION_ITEMS, canFor('SCS_REGIONAL_MANAGER'))).map(
        (leaf) => leaf.path,
      );
      expect(paths).not.toContain('/scalers/create');
    });

    /**
     * The C&E Technician is the first role to show the **Maintenance** group, and the first internal
     * one to show Administration *without* Work Bench (§A is `-`, §J's "Maintain Questions" is `R`).
     *
     * Legacy showed it neither: `getCeTechnicianMenus()` returned Queries, Reports and Handheld
     * Management, and the questions were reached through Handheld → "Download Questions". Handheld is
     * descoped, so the capability lands on the only surface SCS still has for it.
     */
    /**
     * The client's 2026-09-02 spec made this column read-only, which drops the whole Create menu — it
     * held only the two check-scale entries, and both are gone with `CHECK_SCALE_CREATE`. Administration
     * survives on Maintenance → Questions alone, since §A gives this column no Work Bench.
     */
    it('shows a C&E Technician Maintenance → Questions, no Work Bench and no Create menu', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_CE_TECHNICIAN'));
      expect(visible.map((item) => item.name)).toEqual(['Queries', 'Reports', 'Administration']);

      const paths = flatten(visible).map((leaf) => leaf.path);
      expect(paths).toContain('/maintenance/questions');
      expect(paths).not.toContain('/workbench');
      expect(paths).not.toContain('/check-scales/create');
      expect(paths).not.toContain('/summary-check-scales/create');
      expect(paths).not.toContain('/mark-site-designations/create');
      // §J's other eight rows stay `-`.
      expect(paths).not.toContain('/maintenance/templates');
      expect(paths).not.toContain('/maintenance/system');
    });

    /**
     * The two scaling managers share one column, so they share one menu tree — the widest below the
     * administrator's, differing from it only by the screens their column cannot reach.
     */
    it('shows the two scaling managers the same tree', () => {
      const district = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_DIST_SCALING_MANAGER'));
      const regional = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_REGIONAL_SCALING_MANAGER'));

      expect(regional.map((item) => item.name)).toEqual([
        'Queries',
        'Reports',
        'Create',
        'Administration',
      ]);
      expect(flatten(regional).map((leaf) => leaf.path)).toEqual(
        flatten(district).map((leaf) => leaf.path),
      );
      // §J's "Maintain System" is `-` for every column but the administrator's.
      expect(flatten(regional).map((leaf) => leaf.path)).not.toContain('/maintenance/system');
    });

    /**
     * Was "shows nothing to a role that is not enabled yet" — a fixture that borrowed whichever column
     * was still welcome-only and had to move twice. All eleven are filled in now, so the case it tested
     * is the one below: a user holding no permissions at all.
     */
    it('shows nothing to a user holding no permissions', () => {
      expect(filterNavigation(NAVIGATION_ITEMS, () => false)).toEqual([]);
    });

    it('drops a group whose every child is hidden rather than rendering an empty menu', () => {
      const visible = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_INDUSTRY_SCALER'));
      for (const item of visible) {
        if (isNavGroup(item)) {
          expect(item.children.length).toBeGreaterThan(0);
        }
      }
    });

    it('keeps the nested Maintenance group when its children are visible', () => {
      const admin = filterNavigation(NAVIGATION_ITEMS, canFor('SCS_SYS_ADMIN'));
      const administration = admin.find((item) => item.name === 'Administration');
      expect(administration && isNavGroup(administration)).toBe(true);
      const maintenance =
        administration && isNavGroup(administration)
          ? administration.children.find((child) => child.name === 'Maintenance')
          : undefined;
      expect(maintenance && isNavGroup(maintenance) ? maintenance.children.length : 0).toBe(9);
    });

    it('shows nothing when the user holds no permissions at all', () => {
      expect(filterNavigation(NAVIGATION_ITEMS, () => false)).toEqual([]);
    });
  });
});
