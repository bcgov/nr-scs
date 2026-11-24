import {
  Document,
  DocumentAdd,
  Location,
  Search,
  Settings,
  User,
  WarningAlt
} from '@carbon/icons-react';

import { PERMISSIONS, type PERMISSION_TYPE } from '@/context/auth/permissions';

/** A leaf navigation entry: a link to one screen, shown only if the user holds `permission`. */
export type NavLinkItem = {
  name: string;
  path: string;
  icon?: React.ComponentType<{ size?: number | string }>;
  /**
   * The permission required to see this entry. Must match the `permission` on the same route in
   * `routePaths.tsx`, so a visible link never leads to `/unauthorized`; `navigation.unit.test.ts`
   * parses that file and asserts the pairing for every leaf in the tree.
   */
  permission: PERMISSION_TYPE;
};

/**
 * A navigation group. Shown when at least one descendant is visible, so an empty menu is never
 * rendered — the port of the legacy `MenuUtils.hasRootMenuAccess` role→menu map, which gave an
 * Industry Scaler the Queries menu alone.
 */
export type NavGroupItem = {
  name: string;
  path?: string;
  icon?: React.ComponentType<{ size?: number | string }>;
  children: Array<NavLinkItem | NavGroupItem>;
};

export type NavItem = NavLinkItem | NavGroupItem;

export const isNavGroup = (item: NavItem): item is NavGroupItem => 'children' in item;

/**
 * The side-navigation tree. Every leaf names the permission that reveals it; `LayoutSideNav` filters
 * the tree per user, and groups left with no visible children disappear.
 *
 * With Industry Scaler enabled, that role sees Queries → Clients, Scalers and Mark Site Designations
 * only: no Scale Sites entry (they may open a site record but not search the register), and no
 * Reports, Create or Administration groups at all — matching legacy, where `MenuUtils` granted
 * `getIndScalerMenus()` the Queries menu and nothing else.
 */
export const NAVIGATION_ITEMS: NavItem[] = [
  {
    name: 'Queries',
    icon: Search,
    children: [
      { name: 'Clients', path: '/client', icon: User, permission: PERMISSIONS.CLIENT_QUERY },
      { name: 'Scalers', path: '/scalers', icon: User, permission: PERMISSIONS.SCALER_QUERY },
      {
        name: 'Scale Sites',
        path: '/scale-sites',
        icon: Location,
        permission: PERMISSIONS.SCALE_SITE_QUERY,
      },
      {
        name: 'Mark Site Designations',
        path: '/mark-site-designations',
        icon: Document,
        permission: PERMISSIONS.MSD_QUERY,
      },
      {
        name: 'Scaler Risk Assessment',
        path: '/scaler-risk-assessments',
        icon: WarningAlt,
        permission: PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
      },
      {
        name: 'Scale Site Risk Assessment',
        path: '/scale-site-risk-assessments',
        icon: Location,
        permission: PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
      },
    ],
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: Document,
    children: [
      {
        name: 'Scaler Register',
        path: '/reports/scaler-register',
        icon: Document,
        permission: PERMISSIONS.REPORT_READ,
      },
      {
        name: 'Scale Site Register',
        path: '/reports/scale-site-register',
        icon: Document,
        permission: PERMISSIONS.REPORT_READ,
      },
      {
        name: 'Mark Site Designation',
        path: '/reports/mark-site-designation',
        icon: Document,
        permission: PERMISSIONS.REPORT_READ,
      },
      {
        name: 'Designated Mark Exemption',
        path: '/reports/designated-mark-exception',
        icon: Document,
        permission: PERMISSIONS.REPORT_READ,
      },
      {
        name: 'Scaling Administration',
        path: '/reports/scaling-administration',
        icon: Document,
        permission: PERMISSIONS.REPORT_READ,
      },
      {
        name: 'Scaling Exception',
        path: '/reports/scaling-exception',
        icon: Document,
        permission: PERMISSIONS.REPORT_READ,
      },
      {
        name: 'District Check Scale Performance',
        path: '/reports/district-check-scale-performance',
        icon: Document,
        permission: PERMISSIONS.REPORT_READ,
      },
      {
        name: 'District Site Inspection Performance',
        path: '/reports/district-site-inspection-performance',
        icon: Document,
        permission: PERMISSIONS.REPORT_READ,
      },
    ],
  },
  {
    name: 'Create',
    path: '/create',
    icon: DocumentAdd,
    children: [
      {
        name: 'Scaler',
        path: '/scalers/create',
        icon: Document,
        permission: PERMISSIONS.SCALER_CREATE,
      },
      {
        name: 'Scale Site',
        path: '/scale-sites/create',
        icon: Document,
        permission: PERMISSIONS.SCALE_SITE_CREATE,
      },
      {
        name: 'Check Scale',
        path: '/check-scales/create',
        icon: Document,
        permission: PERMISSIONS.CHECK_SCALE_CREATE,
      },
      {
        name: 'Summary Check Scale',
        path: '/summary-check-scales/create',
        icon: Document,
        permission: PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE,
      },
      {
        name: 'Mark Site Designation',
        path: '/mark-site-designations/create',
        icon: Document,
        permission: PERMISSIONS.MSD_CREATE,
      },
      {
        name: 'Scaler Authorization',
        path: '/scaler-authorizations/create',
        icon: Document,
        permission: PERMISSIONS.SCALER_AUTHORIZATION_CREATE,
      },
      {
        name: 'Scale Site Authorization',
        path: '/scale-site-authorizations/create',
        icon: Document,
        permission: PERMISSIONS.SCALE_SITE_AUTHORIZATION_CREATE,
      },
    ],
  },
  {
    name: 'Administration',
    path: '/administration',
    icon: Settings,
    children: [
      {
        name: 'Work Bench',
        path: '/workbench',
        icon: Document,
        permission: PERMISSIONS.WORKBENCH_QUERY,
      },
      {
        name: 'Maintenance',
        path: '/maintenance',
        children: [
          {
            name: 'Templates',
            path: '/maintenance/templates',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_TEMPLATES_QUERY,
          },
          {
            name: 'Conditions',
            path: '/maintenance/conditions',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_CONDITIONS_QUERY,
          },
          {
            name: 'Questions',
            path: '/maintenance/questions',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_QUESTIONS_QUERY,
          },
          {
            name: 'Signature Blocks',
            path: '/maintenance/signature-blocks',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_SIGNATORIES_QUERY,
          },
          {
            name: 'Exam / Upgrades',
            path: '/maintenance/exam-upgrades',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_EXAM_UPGRADES_QUERY,
          },
          {
            name: 'Appointment Types',
            path: '/maintenance/appointment-types',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_QUERY,
          },
          {
            name: 'Valid Licence Attributes',
            path: '/maintenance/valid-licence-attributes',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY,
          },
          {
            name: 'Authorization Clauses',
            path: '/maintenance/authorization-clauses',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_QUERY,
          },
          {
            name: 'System',
            path: '/maintenance/system',
            icon: Document,
            permission: PERMISSIONS.MAINTAIN_SYSTEM_READ,
          },
        ],
      },
    ],
  },
];

/**
 * Prunes the navigation tree to what the given permissions reveal: leaves whose permission is not
 * held are dropped, and a group left with no children is dropped with them.
 * @param {NavItem[]} items - The tree to filter (defaults to the full tree).
 * @param {(permission: PERMISSION_TYPE) => boolean} can - Permission predicate, from `usePermissions`.
 * @returns {NavItem[]} The visible subtree.
 */
export const filterNavigation = (
  items: readonly NavItem[],
  can: (permission: PERMISSION_TYPE) => boolean,
): NavItem[] =>
  items.reduce<NavItem[]>((visible, item) => {
    if (!isNavGroup(item)) {
      if (can(item.permission)) {
        visible.push(item);
      }
      return visible;
    }
    const children = filterNavigation(item.children, can);
    if (children.length > 0) {
      visible.push({ ...item, children });
    }
    return visible;
  }, []);
