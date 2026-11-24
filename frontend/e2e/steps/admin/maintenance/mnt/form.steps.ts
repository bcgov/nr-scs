import { daysAgo } from '../../../../fixtures/common/dates';
import { buildAppointmentTypeBody } from '../../../../fixtures/admin/maintenance/appointment-type-test-data';
import { When } from '../../../fixtures';

/**
 * MNT form-entry steps for the Maintain Appointment Types create/edit modal. All DOM access is
 * delegated to the page object; the pinned test-data builder supplies known-good values so "a valid
 * appointment type" is always DB/validator-grounded (unique Z### code, valid dates), never fabricated.
 */

/** Visible label -> world.appointmentTypeBody key, so field-setting steps keep the read-back comparand in sync. */
const BODY_KEY_BY_LABEL: Record<string, keyof ReturnType<typeof buildAppointmentTypeBody>> = {
  'Appointment Type': 'code',
  Description: 'description',
  'Effective Date': 'effectiveDate',
  'Expiry Date': 'expiryDate',
};

When('I enter a valid appointment type', async ({ appointmentTypesPage, world }) => {
  const body = buildAppointmentTypeBody('create');
  world.appointmentTypeBody = body;
  await appointmentTypesPage.fillField('Appointment Type', body.code);
  await appointmentTypesPage.fillField('Description', body.description);
  await appointmentTypesPage.selectActing(body.actingInd === 'Y' ? 'Yes' : 'No');
  await appointmentTypesPage.setDate('Effective Date', body.effectiveDate);
  await appointmentTypesPage.setDate('Expiry Date', body.expiryDate);
});

When('I clear the appointment type {string} field', async ({ appointmentTypesPage, world }, field: string) => {
  if (field === 'Acting?') {
    await appointmentTypesPage.selectActing('');
  } else if (field === 'Effective Date' || field === 'Expiry Date') {
    await appointmentTypesPage.setDate(field, '');
  } else {
    await appointmentTypesPage.fillField(field, '');
  }
  const key = BODY_KEY_BY_LABEL[field];
  if (key && world.appointmentTypeBody) (world.appointmentTypeBody as Record<string, unknown>)[key] = '';
});

When('I set the appointment type {string} field to {string}', async ({ appointmentTypesPage, world }, field: string, value: string) => {
  await appointmentTypesPage.fillField(field, value);
  const key = BODY_KEY_BY_LABEL[field];
  if (key && world.appointmentTypeBody) (world.appointmentTypeBody as Record<string, unknown>)[key] = value;
});

// Cross-field date-order violation: Effective Date AFTER Expiry Date (drives ERR-010 / "Expiry date
// cannot be before effective date").
When('I set the appointment type Effective Date after its Expiry Date', async ({ appointmentTypesPage }) => {
  await appointmentTypesPage.setDate('Effective Date', daysAgo(1));
  await appointmentTypesPage.setDate('Expiry Date', daysAgo(10));
});

When('I save the appointment type', async ({ appointmentTypesPage }) => {
  await appointmentTypesPage.save();
});
