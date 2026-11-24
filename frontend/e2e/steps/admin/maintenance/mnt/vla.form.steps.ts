import { daysAgo } from '../../../../fixtures/common/dates';
import { VLA_EXISTING, buildVlaBody } from '../../../../fixtures/admin/maintenance/valid-licence-attribute-test-data';
import { When } from '../../../fixtures';

/** MNT form-entry steps for the Maintain Valid Licence Attributes create modal. */

When('I enter a valid licence attribute', async ({ vlaPage, world }) => {
  const body = buildVlaBody();
  world.vlaBody = body;
  world.vlaGradingSystemCode = body.gradingSystemCode;
  world.vlaAppointmentType = body.appointmentType;
  await vlaPage.selectGradingSystem(body.gradingSystemCode);
  await vlaPage.selectAppointmentType(body.appointmentType);
  await vlaPage.setDate('effective', body.effectiveDate);
  await vlaPage.setDate('expiry', body.expiryDate);
});

// The duplicate-create path: an existing combo (C/A), so the backend rejects it (S08).
When('I enter an existing licence attribute combination', async ({ vlaPage, world }) => {
  world.vlaGradingSystemCode = VLA_EXISTING.gradingSystemCode;
  world.vlaAppointmentType = VLA_EXISTING.appointmentType;
  await vlaPage.selectGradingSystem(VLA_EXISTING.gradingSystemCode);
  await vlaPage.selectAppointmentType(VLA_EXISTING.appointmentType);
  await vlaPage.setDate('effective', daysAgo(1));
  await vlaPage.setDate('expiry', daysAgo(-3650));
});

When('I clear the licence attribute {string} field', async ({ vlaPage }, field: string) => {
  if (field === 'Grading System Code') {
    await vlaPage.selectGradingSystem('');
  } else if (field === 'Appointment Type') {
    await vlaPage.selectAppointmentType('');
  } else if (field === 'Effective Date') {
    await vlaPage.setDate('effective', '');
  }
});

When('I set the licence attribute Effective Date after its Expiry Date', async ({ vlaPage }) => {
  await vlaPage.setDate('effective', daysAgo(1));
  await vlaPage.setDate('expiry', daysAgo(10));
});

When('I save the licence attribute', async ({ vlaPage }) => {
  await vlaPage.save();
});
