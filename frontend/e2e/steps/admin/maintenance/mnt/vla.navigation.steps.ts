import { VLA_EXISTING } from '../../../../fixtures/admin/maintenance/valid-licence-attribute-test-data';
import { Given, When } from '../../../fixtures';

/** MNT navigation steps for Maintain Valid Licence Attributes (UC-MNT-004). */

Given('I am on the Valid Licence Attributes list', async ({ vlaPage }) => {
  await vlaPage.goto();
});

Given('a licence attribute with dependent records exists', async ({ world }) => {
  // A real, existing + dependent-having combo (see fixture provenance). Opened read-only; no seed/cleanup.
  world.vlaGradingSystemCode = VLA_EXISTING.gradingSystemCode;
  world.vlaAppointmentType = VLA_EXISTING.appointmentType;
});

When('I open the licence attribute create form', async ({ vlaPage }) => {
  await vlaPage.openCreate();
});

When('I open the dependent licence attribute for view', async ({ vlaPage }) => {
  await vlaPage.openView(VLA_EXISTING.gradingSystemName, VLA_EXISTING.appointmentType);
});

// The dependent-records check runs on the Delete click (requestDelete), not on view-open.
When('I request to delete the licence attribute', async ({ vlaPage }) => {
  await vlaPage.requestDelete();
});
