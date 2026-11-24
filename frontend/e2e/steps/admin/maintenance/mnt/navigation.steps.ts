import { DEPENDENT_APPOINTMENT_TYPE_CODE } from '../../../../fixtures/admin/maintenance/appointment-type-test-data';
import { Given, When } from '../../../fixtures';

/**
 * MNT navigation + seeding steps for Maintain Appointment Types (single route, list + Modal). The
 * mock-auth gotcha (login then client-side nav) is handled inside the page object's goto().
 */

Given('I am on the Appointment Types list', async ({ appointmentTypesPage }) => {
  await appointmentTypesPage.goto();
});

Given('a disposable appointment type exists', async ({ seedAppointmentType, world }) => {
  const { code, body } = await seedAppointmentType('fixture');
  world.appointmentTypeCode = code;
  world.appointmentTypeBody = body;
  world.originalAppointmentTypeBody = { ...body }; // immutable snapshot for "only X changed" comparisons
});

Given('an appointment type with dependent records exists', async ({ world }) => {
  // A real, pre-seeded code with scaler_valid_licence_attribute children (see fixture provenance). Its
  // DELETE is rejected (400) and the row survives, so this is read-only / parallel-safe — no seed needed.
  world.appointmentTypeCode = DEPENDENT_APPOINTMENT_TYPE_CODE;
});

// Distinct phrasing from CCQ's "I open the create/edit form" — a step phrase must bind to exactly one
// definition, so each domain's modal-open steps carry their own vocabulary.
When('I open the appointment type create form', async ({ appointmentTypesPage }) => {
  await appointmentTypesPage.openCreate();
});

When('I open the appointment type for view', async ({ appointmentTypesPage, world }) => {
  if (!world.appointmentTypeCode) throw new Error('[step] no appointment type code in world — seed one first');
  await appointmentTypesPage.openView(world.appointmentTypeCode);
});

When('I open the appointment type edit form', async ({ appointmentTypesPage }) => {
  await appointmentTypesPage.openEdit();
});
