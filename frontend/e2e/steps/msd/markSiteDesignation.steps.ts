import { Given, When, Then, expect } from '../fixtures';
import { BASICS_FIELD_BY_LABEL, type MarkSiteBasics } from '../../pages/msd/MarkSiteDesignationCreatePage';
import { validBasics, expiryBeforeEffective, happyBasics, pickScaleSite } from '../../fixtures/msd/msd-test-data';
import { onCreate } from './markSiteDesignationRoutes';

/**
 * MSD-domain steps for the Mark Site Designation create screen. DOM lives in the page object; these
 * read as reusable domain language. Negatives PROVE no write (create-spy === 0) or read back that the
 * record is absent — never inferred from a missing redirect.
 *
 * SCOPE: no-seed slices only (the create happy path is data-blocked — see the UC's defects.md). Every
 * scenario here either never POSTs (client-side validation) or POSTs a mark the backend rejects 404.
 */

const districtWideFromWord = (word: string): '' | 'Y' | 'N' =>
  word === 'Yes' ? 'Y' : word === 'No' ? 'N' : '';

Given('I am on the Mark Site Designation create form', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.goto();
});

When('I look up timber mark {string}', async ({ markSiteDesignationCreatePage }, mark) => {
  await markSiteDesignationCreatePage.lookupTimberMark(mark);
});

When('I fill valid mark site basics', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.fillBasics(validBasics());
});

When('I fill valid mark site basics with District Wide {string}', async ({ markSiteDesignationCreatePage }, word) => {
  await markSiteDesignationCreatePage.fillBasics({ ...validBasics(), districtWide: districtWideFromWord(word) });
});

// Fill a valid baseline, then override exactly ONE field (blank for a "required" case, or a bad value
// for an integer case) so a Scenario Outline can drive the whole matrix through one step.
When('I fill valid mark site basics except {string} is {string}', async ({ markSiteDesignationCreatePage }, label, value) => {
  const key = BASICS_FIELD_BY_LABEL[label];
  if (!key) throw new Error(`Unknown mark site basics field label: "${label}"`);
  const values: MarkSiteBasics = { ...validBasics(), [key]: value } as MarkSiteBasics;
  await markSiteDesignationCreatePage.fillBasics(values);
});

// ERR-019..ERR-022 length rules. The count is passed rather than the text so a 4001-character value
// does not have to live in the Examples table.
When('I enter {int} characters in the {string} field', async ({ markSiteDesignationCreatePage }, count, label) => {
  await markSiteDesignationCreatePage.setTextArea(label, 'X'.repeat(count));
});

When('I enter an expiry date before the effective date', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.fillBasics({ ...validBasics(), ...expiryBeforeEffective() });
});

// "I click Add Conditions" / "I click Save Record" are shared generic clicks in
// steps/common/formActions.steps.ts (promoted once the Scaler-Authorization create form needed them too).

When('I add scale site {string}', async ({ markSiteDesignationCreatePage }, id) => {
  await markSiteDesignationCreatePage.addScaleSite(id);
});

When('I add a species with no details', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.addSpeciesBlank();
});

// ERR-012 — click Scale Sites "Add" with the number field blank (the required-partner of the covered
// ERR-013 not-found guard). Reached only after "Add Conditions" (submitAttempted=true), so it displays.
When('I add a scale site with no number', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.addScaleSiteBlank();
});

// Distinct phrasing ("choose") — `I select species {string}` is already bound by CHK (steps/chk/form.steps.ts).
When('I choose species {string}', async ({ markSiteDesignationCreatePage }, code) => {
  await markSiteDesignationCreatePage.selectSpecies(code);
});

When('I enter species content {string}', async ({ markSiteDesignationCreatePage }, value) => {
  await markSiteDesignationCreatePage.enterSpeciesContent(value);
});

When('I add the species', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.addSpecies();
});

// ERR-016 — the shared AuthorizationConditionsSection add-by-number guard (client-side; no search fires).
When('I add a condition numbered {string}', async ({ markSiteDesignationCreatePage }, value) => {
  await markSiteDesignationCreatePage.addConditionByNumber(value);
});

// "Save Record" replaces "Add Conditions" only once showAdvancedSection is true, so its presence is
// the observable proof that the basics gate passed.
Then('the advanced section is visible', async ({ markSiteDesignationCreatePage }) => {
  await expect(markSiteDesignationCreatePage.saveRecordButton).toBeVisible();
});

Then('I should remain on the mark site designation create form', async ({ page }) => {
  await expect(page).toHaveURL(onCreate);
});

Then('no mark site designation should be created', async ({ createMsdCalls }) => {
  expect(createMsdCalls()).toBe(0);
});

// Server-reject case: the create POST fired (and 404'd), so we PROVE nothing persisted by reading the
// search back rather than checking the spy. UI-triggered write => poll (bounded), never single-shot.
Then('no mark site designation exists for timber mark {string}', async ({ page }, mark) => {
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/mark-site-designations/search?timberMark=${encodeURIComponent(mark)}`);
      if (!res.ok()) return -1;
      return ((await res.json()) as unknown[]).length;
    })
    .toBe(0);
});

// --- Happy-path create (S01/S02) — needs the msd-create-mark.sql seed (mark ES20R4 creatable) ------

When('I create a district-wide mark site designation', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.createRecord(happyBasics('Y'));
});

// Picks a per-worker scale site (by parallelIndex) so concurrent runs don't collide on the
// hauling_mark_site (mark, site) unique key; stashes it in world for the read-back assertion.
When('I create a mark site designation with a scale site', async ({ markSiteDesignationCreatePage, world, $testInfo }) => {
  const siteId = pickScaleSite($testInfo.parallelIndex);
  world.msdScaleSiteId = siteId;
  await markSiteDesignationCreatePage.createRecord(happyBasics('N'), siteId);
});

Then('the mark site designation is created', async ({ markSiteDesignationCreatePage, createdMsdIds, world }) => {
  const id = await markSiteDesignationCreatePage.createdId();
  world.msdId = id;
  createdMsdIds.push(id); // register for DB teardown the moment the id is known
});

// Full API read-back of the persisted record (not merely the redirect). UI-triggered write => poll.
Then(
  'the created record reads back with timber mark {string} and district wide {string}',
  async ({ page, world }, mark, districtWide) => {
    const id = world.msdId;
    expect(id, 'world.msdId set by "the mark site designation is created"').toBeTruthy();
    await expect
      .poll(async () => {
        const res = await page.request.get(`/api/mark-site-designations/${id}`);
        if (!res.ok()) return null;
        const body = (await res.json()) as { timberMark?: string; districtWideInd?: string };
        return `${body.timberMark}|${body.districtWideInd}`;
      })
      .toBe(`${mark}|${districtWide}`);
  },
);

Then('the created record includes its scale site', async ({ page, world }) => {
  const id = world.msdId;
  const siteId = world.msdScaleSiteId;
  expect(siteId, 'world.msdScaleSiteId set by the create step').toBeTruthy();
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/mark-site-designations/${id}`);
      if (!res.ok()) return [] as string[];
      const body = (await res.json()) as { scaleSites?: { scaleSiteIdNmbr?: string }[] };
      return (body.scaleSites ?? []).map((s) => String(s.scaleSiteIdNmbr));
    })
    .toContain(siteId);
});
