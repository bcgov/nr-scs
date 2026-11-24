import { Given, When, Then } from '../fixtures';
import {
  inspectionHappyPathSite,
  inspectionSeedHeader,
  inspectionMissingId,
  INSPECTION_TYPES,
  INSPECTOR_GUID,
  SITE_TYPES,
} from '../../fixtures/ins/ins-test-data';
import { makeRequire } from '../common/world';

/**
 * Steps for the Site Inspection VIEW flow (UC-INS-002). The record under test is SEEDED via the API
 * (seedInspection — a real inspector GUID + a forest_client-backed site so the read-back INNER JOINs
 * resolve), then the read-only view is driven in the browser and its displayed values are checked
 * against the known-seeded inputs (no second read-back API call needed — the seed inputs ARE the
 * oracle). The empty-list slice (S05) reuses the inspections-tab steps from navigation.steps.ts.
 */

/** Reads required scenario state; see `steps/common/world.ts`. */
const req = makeRequire('ins-view');

// --- S01: seed + open the view ------------------------------------------------------------------

Given(
  'I have a recorded site inspection on scale site {string}',
  async ({ seedInspection, world }, scaleSiteIdNmbr) => {
    world.inspectionId = await seedInspection(scaleSiteIdNmbr);
    world.scaleSiteIdNmbr = scaleSiteIdNmbr;
  },
);

When('I open the site inspection view', async ({ inspectionViewPage, world }) => {
  const site = req(world.scaleSiteIdNmbr, 'scaleSiteIdNmbr');
  const id = req(world.inspectionId, 'inspectionId');
  await inspectionViewPage.open(site, id);
  await inspectionViewPage.expectLoaded(id);
});

// --- S01: header + question + read-only assertions ---------------------------------------------

Then('the inspection view shows the recorded header details', async ({ inspectionViewPage, world }) => {
  // Assert the fields whose values we DECIDED at seed time (the site is the happy-path fixture site),
  // so the check is deterministic and independent of DB-derived formatting.
  await inspectionViewPage.expectScaleSiteNumber(req(world.scaleSiteIdNmbr, 'scaleSiteIdNmbr'));
  await inspectionViewPage.expectSiteName(inspectionHappyPathSite.siteName);
  await inspectionViewPage.expectInspectionType(INSPECTION_TYPES.minor.description);
  await inspectionViewPage.expectInspector(INSPECTOR_GUID);
  await inspectionViewPage.expectSiteOperatorPresent('Yes'); // seeded siteOperatorPresentInd = 'Y'
  await inspectionViewPage.expectComments(inspectionSeedHeader.comments);
});

Then('the inspection view lists the answered questions read-only', async ({ inspectionViewPage }) => {
  await inspectionViewPage.expectHasQuestions();
  await inspectionViewPage.expectAllFieldsReadOnly();
});

Then(
  'the inspection view offers Back, Edit Record and Delete actions',
  async ({ inspectionViewPage }) => {
    await inspectionViewPage.expectActionsVisible();
  },
);

// --- S01: Back navigation ----------------------------------------------------------------------

When('I go back from the inspection view', async ({ inspectionViewPage }) => {
  await inspectionViewPage.clickBack();
});

Then('the scale site inspections tab is shown', async ({ inspectionViewPage, world }) => {
  await inspectionViewPage.expectReturnedToInspectionsTab(req(world.scaleSiteIdNmbr, 'scaleSiteIdNmbr'));
});

// --- S02: not found + recovery -----------------------------------------------------------------

When(
  'I open a missing site inspection on scale site {string}',
  async ({ inspectionViewPage, world }, scaleSiteIdNmbr) => {
    world.scaleSiteIdNmbr = scaleSiteIdNmbr;
    await inspectionViewPage.open(scaleSiteIdNmbr, inspectionMissingId);
  },
);

Then('the inspection view shows a not-found message', async ({ inspectionViewPage }) => {
  await inspectionViewPage.expectNotFound();
});

When(
  'I then open a recorded inspection on the same scale site',
  async ({ inspectionViewPage, seedInspection, world }) => {
    const site = req(world.scaleSiteIdNmbr, 'scaleSiteIdNmbr');
    world.inspectionId = await seedInspection(site);
    await inspectionViewPage.navigateTo(site, world.inspectionId);
    await inspectionViewPage.expectLoaded(world.inspectionId);
  },
);

Then('the site inspection view loads without error', async ({ inspectionViewPage }) => {
  await inspectionViewPage.expectNoErrorBanner();
});

// --- S01: populated inspections list + row-link → detail hop ------------------------------------

When('I view the inspections tab for that scale site', async ({ inspectionsTabPage, world }) => {
  await inspectionsTabPage.open(req(world.scaleSiteIdNmbr, 'scaleSiteIdNmbr'));
});

Then(
  'the inspections list shows that inspection with its type, site type and inspector',
  async ({ inspectionsTabPage, world }) => {
    await inspectionsTabPage.expectInspectionListed(req(world.inspectionId, 'inspectionId'), {
      type: INSPECTION_TYPES.minor.description, // "Minor"
      siteType: SITE_TYPES.weight.description, // "Weight Scale"
      inspector: INSPECTOR_GUID,
    });
  },
);

When('I open that inspection from the list', async ({ inspectionsTabPage, world }) => {
  await inspectionsTabPage.openInspection(req(world.inspectionId, 'inspectionId'));
});

Then('the site inspection view loads for it', async ({ inspectionViewPage, world }) => {
  await inspectionViewPage.expectLoaded(req(world.inspectionId, 'inspectionId'));
});

// --- S05: empty inspections list (reuses navigation.steps' tab-open + empty-list steps) ----------

Then('no inspections load error is shown', async ({ inspectionsTabPage }) => {
  await inspectionsTabPage.expectNoLoadError();
});
