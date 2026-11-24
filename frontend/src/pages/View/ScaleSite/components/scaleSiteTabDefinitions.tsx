import { PERMISSIONS, type PERMISSION_TYPE } from "@/context/auth/permissions";
import ActivityTab from "./tabs/ActivityTab";
import AuthorizedScalersTab from "./tabs/AuthorizedScalersTab";
import CheckScalesTab from "./tabs/CheckScalesTab";
import ContactsTab from "./tabs/ContactsTab";
import InspectionsTab from "./tabs/InspectionsTab";
import MsdTab from "./tabs/MsdTab";
import RiskRatingTab from "./tabs/RiskRatingTab";
import ScaleSiteAuthorizationsTab from "./tabs/ScaleSiteAuthorizationsTab";
import SoftwareTab from "./tabs/SoftwareTab";
import SummaryTab from "./tabs/SummaryTab";
import type { StaticLov } from "@/services/lov.service";
import type { ScaleSiteSummary } from "@/services/scaleSites.service";
import type { ReactNode } from "react";

/**
 * One section of the scale-site record. Declared so the tab strip, panels and `?tab=` slugs all
 * derive from one list, which keeps them aligned when a section is filtered out.
 */
export type ScaleSiteTabDefinition = {
  /** URL slug for `?tab=`; also the stable identity of the section. */
  slug: string;
  label: string;
  /** The permission that reveals the section. */
  permission: PERMISSION_TYPE;
  render: (props: {
    isActive: boolean;
    scaleSiteIdNmbr: string;
    summary: ScaleSiteSummary | null;
    priorityLovs: StaticLov[];
    scaleMethodTypeLovs: StaticLov[];
  }) => ReactNode;
};

/**
 * Every section of the scale-site record, in order, with the permission that reveals it (matrix §D).
 */
export const SCALE_SITE_TABS: readonly ScaleSiteTabDefinition[] = [
  {
    slug: "summary",
    label: "Summary",
    permission: PERMISSIONS.SCALE_SITE_SUMMARY_READ,
    render: ({ summary, priorityLovs, scaleMethodTypeLovs }) =>
      summary ? (
        <SummaryTab
          summary={summary}
          priorityLovs={priorityLovs}
          scaleMethodTypeLovs={scaleMethodTypeLovs}
        />
      ) : null,
  },
  {
    slug: "contacts",
    label: "Contacts",
    permission: PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <ContactsTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
  {
    slug: "activity-summary",
    label: "Activity Summary",
    permission: PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <ActivityTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
  {
    // Slug stays `authorizations`: already used by deep links and the e2e tab anchors.
    slug: "authorizations",
    label: "Site Authorizations",
    permission: PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <ScaleSiteAuthorizationsTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
  {
    slug: "authorized-scalers",
    label: "Authorized Scalers",
    permission: PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <AuthorizedScalersTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
  {
    slug: "msd",
    label: "MSD",
    permission: PERMISSIONS.SCALE_SITE_MSD_QUERY,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <MsdTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
  {
    slug: "inspections",
    label: "Inspections",
    permission: PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <InspectionsTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
  {
    slug: "check-scales",
    label: "Check Scales",
    permission: PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <CheckScalesTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
  {
    slug: "software",
    label: "Software",
    permission: PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <SoftwareTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
  {
    slug: "risk-rating",
    label: "Risk Rating",
    permission: PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
    render: ({ isActive, scaleSiteIdNmbr }) => (
      <RiskRatingTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
    ),
  },
];
