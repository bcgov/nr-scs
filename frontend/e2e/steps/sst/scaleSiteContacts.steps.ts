import { Given, When, Then, expect } from '../fixtures';
import { daysAgo } from '../../fixtures/common/dates';
import {
  siClientContactId,
  siClientContactName,
  contactRole,
  updatedContactRole,
} from '../../fixtures/sst/scale-site-test-data';

/**
 * UC-SST-006 (Maintain Scale Site Contacts) — the Contacts tab on the scale-site view. Add/Edit/View
 * replace the tab inline; Delete uses a confirm modal. Each scenario seeds + DB-cleans its OWN site (and
 * any contact), a dedicated mutable key that is parallel-safe. A contact links the site to a REAL
 * `SI`-type client contact (`siClientContactId`); the create/update forms validate client-side, so the
 * negatives prove `no create-contact/update-contact request should be sent`. Success is PROVEN by an API
 * read-back of GET /scale-sites/{id}/contacts. DOM lives in pages/sst/ScaleSiteContactsPage.
 */

const contactsUrl = (id: string) => `/api/scale-sites/${encodeURIComponent(id)}/contacts`;

// --- entry points ---------------------------------------------------------------------------------------

Given('I am on the Contacts tab of a scale site', async ({ scaleSiteContactsPage, seedScaleSite }) => {
  const siteId = await seedScaleSite();
  await scaleSiteContactsPage.openForSite(siteId);
});

Given('I am on the Contacts tab of a scale site with a contact', async ({ scaleSiteContactsPage, seedScaleSite, seedScaleSiteContact }) => {
  const siteId = await seedScaleSite();
  await seedScaleSiteContact(siteId);
  await scaleSiteContactsPage.openForSite(siteId);
});

Given('I am editing a contact on a scale site', async ({ scaleSiteContactsPage, seedScaleSite, seedScaleSiteContact }) => {
  const siteId = await seedScaleSite();
  await seedScaleSiteContact(siteId);
  await scaleSiteContactsPage.openForSite(siteId);
  await scaleSiteContactsPage.openEdit(siClientContactName);
});

// --- create ---------------------------------------------------------------------------------------------

When('I add a site contact', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.clickAddSiteContact();
  await scaleSiteContactsPage.fillContactForm({
    clientContactId: siClientContactId,
    siteAccess: 'Y',
    effectiveDate: daysAgo(1),
    role: contactRole,
  });
  await scaleSiteContactsPage.saveExpectingReturnToList();
});

When('I add a primary contact', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.clickAddPrimaryContact();
  await scaleSiteContactsPage.fillContactForm({
    clientContactId: siClientContactId,
    siteAccess: 'Y',
    effectiveDate: daysAgo(1),
    role: contactRole,
  });
  await scaleSiteContactsPage.saveExpectingReturnToList();
});

Then('the contact reads back on the scale site', async ({ scaleSiteContactsPage, request }) => {
  const id = scaleSiteContactsPage.scaleSiteId;
  await expect
    .poll(async () => {
      const res = await request.get(contactsUrl(id));
      if (!res.ok()) return null;
      const list = (await res.json()) as Array<{ clientContactId?: number; contactRoleDescription?: string }>;
      return list.find((c) => c.clientContactId === Number(siClientContactId)) ?? null;
    })
    .toMatchObject({ contactRoleDescription: contactRole });
});

Then('the contact reads back as the primary contact', async ({ scaleSiteContactsPage, request }) => {
  const id = scaleSiteContactsPage.scaleSiteId;
  await expect
    .poll(async () => {
      const res = await request.get(contactsUrl(id));
      if (!res.ok()) return null;
      const list = (await res.json()) as Array<{ clientContactId?: number; primaryContactInd?: string }>;
      return list.find((c) => c.clientContactId === Number(siClientContactId)) ?? null;
    })
    .toMatchObject({ primaryContactInd: 'Y' });
});

// --- update ---------------------------------------------------------------------------------------------

When('I edit the contact and change its role', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.openEdit(siClientContactName);
  await scaleSiteContactsPage.fillContactForm({ role: updatedContactRole });
  await scaleSiteContactsPage.saveExpectingReturnToList();
});

Then('the contact reads back with the updated role', async ({ scaleSiteContactsPage, request }) => {
  const id = scaleSiteContactsPage.scaleSiteId;
  await expect
    .poll(async () => {
      const res = await request.get(contactsUrl(id));
      if (!res.ok()) return null;
      const list = (await res.json()) as Array<{ clientContactId?: number; contactRoleDescription?: string }>;
      return list.find((c) => c.clientContactId === Number(siClientContactId)) ?? null;
    })
    .toMatchObject({ contactRoleDescription: updatedContactRole });
});

// --- delete ---------------------------------------------------------------------------------------------

When('I delete the contact', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.deleteContact(siClientContactName);
});

Then('the contact no longer reads back on the scale site', async ({ scaleSiteContactsPage, request }) => {
  const id = scaleSiteContactsPage.scaleSiteId;
  await expect
    .poll(async () => {
      const res = await request.get(contactsUrl(id));
      if (!res.ok()) return null;
      const list = (await res.json()) as Array<{ clientContactId?: number }>;
      return list.some((c) => c.clientContactId === Number(siClientContactId));
    })
    .toBe(false);
});

// --- view -----------------------------------------------------------------------------------------------

When('I view the contact', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.openView(siClientContactName);
});

Then('the contact detail shows its role', async ({ page }) => {
  await expect(page.getByText(contactRole).first()).toBeVisible();
});

// --- reset ----------------------------------------------------------------------------------------------

When('I open the add site contact form and reset it', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.clickAddSiteContact();
  await scaleSiteContactsPage.fillContactForm({ role: 'temporary role' });
  await scaleSiteContactsPage.clickReset();
});

Then('the contact role field is cleared', async ({ scaleSiteContactsPage }) => {
  await expect(scaleSiteContactsPage.role).toHaveValue('');
});

// --- validation negatives -------------------------------------------------------------------------------

When('I save the add-contact form with all fields blank', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.clickAddSiteContact();
  await scaleSiteContactsPage.clickSave();
});

When('I save the add-contact form with client contact id {string}', async ({ scaleSiteContactsPage }, value) => {
  await scaleSiteContactsPage.clickAddSiteContact();
  await scaleSiteContactsPage.fillContactForm({
    clientContactId: value,
    siteAccess: 'Y',
    effectiveDate: daysAgo(1),
    role: contactRole,
  });
  await scaleSiteContactsPage.clickSave();
});

When('I save the add-contact form with an expiry before the effective date', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.clickAddSiteContact();
  await scaleSiteContactsPage.fillContactForm({
    clientContactId: siClientContactId,
    siteAccess: 'Y',
    effectiveDate: daysAgo(1),
    expiryDate: daysAgo(30),
    role: contactRole,
  });
  await scaleSiteContactsPage.clickSave();
});

When('I clear the contact role and save', async ({ scaleSiteContactsPage }) => {
  await scaleSiteContactsPage.fillContactForm({ role: '' });
  await scaleSiteContactsPage.clickSave();
});

Then('no create-contact request should be sent', async ({ createContactCalls }) => {
  expect(createContactCalls()).toBe(0);
});

Then('no update-contact request should be sent', async ({ updateContactCalls }) => {
  expect(updateContactCalls()).toBe(0);
});

Then('the add-contact form is still open', async ({ scaleSiteContactsPage }) => {
  await expect(scaleSiteContactsPage.role).toBeVisible();
});
