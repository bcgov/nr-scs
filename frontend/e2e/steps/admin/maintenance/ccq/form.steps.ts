import { daysAgo } from '../../../../fixtures/common/dates';
import { buildInspectionQuestionBody } from '../../../../fixtures/admin/maintenance/ccq-test-data';
import { Then, When } from '../../../fixtures';

/**
 * CCQ form-entry steps for the Maintain Inspection Question create/edit modal. All DOM access is
 * delegated to the page object; the pinned test-data builder supplies known-good values so "a valid
 * inspection question" is always DB/validator-grounded, never fabricated.
 *
 * LOV description text used to click multi-select options (confirmed against the seeded DB — see
 * fixtures/admin/maintenance/ccq-test-data.ts provenance): Inspection Type MIN="Minor", Scaling Method P="Piece
 * Scale", Valid Response Y="Yes"/N="No".
 */

When('I enter a valid inspection question', async ({ questionsPage, world }) => {
  const body = buildInspectionQuestionBody('create');
  world.questionBody = body;
  await questionsPage.fillField('Sort Order', String(body.sortOrderNo));
  await questionsPage.fillField('Question', body.questionText);
  await questionsPage.selectCommentRequired(body.commentRequiredInd === 'Y' ? 'Yes' : 'No');
  await questionsPage.setDateField('Effective Date', body.effectiveDate);
  await questionsPage.setDateField('Expiry Date', body.expiryDate);
  await questionsPage.toggleMultiSelectOption('Inspection Type', 'Minor');
  await questionsPage.toggleMultiSelectOption('Scaling Methods', 'Piece Scale');
  await questionsPage.toggleMultiSelectOption('Valid Responses', 'Yes');
  await questionsPage.toggleMultiSelectOption('Valid Responses', 'No');
});

/** Label -> world.questionBody key, so field-setting steps keep the read-back comparand in sync. */
const BODY_KEY_BY_LABEL: Record<string, keyof ReturnType<typeof buildInspectionQuestionBody>> = {
  Question: 'questionText',
  'Sort Order': 'sortOrderNo',
  'Comment Required': 'commentRequiredInd',
  'Effective Date': 'effectiveDate',
  'Expiry Date': 'expiryDate',
};

When('I clear the question\'s {string} field', async ({ questionsPage, world }, field: string) => {
  if (field === 'Comment Required') {
    await questionsPage.selectCommentRequired('');
  } else if (field === 'Effective Date' || field === 'Expiry Date') {
    // Clear via setDateField (not fillField) so the flatpickr calendar is dismissed — otherwise its
    // overlay covers the Save button and the subsequent Save click is intercepted.
    await questionsPage.setDateField(field, '');
  } else {
    await questionsPage.fillField(field, '');
  }
  const key = BODY_KEY_BY_LABEL[field];
  if (key && world.questionBody) (world.questionBody as Record<string, unknown>)[key] = '';
});

When('I set the question\'s {string} field to {string}', async ({ questionsPage, world }, field: string, value: string) => {
  await questionsPage.fillField(field, value);
  const key = BODY_KEY_BY_LABEL[field];
  if (key && world.questionBody) {
    (world.questionBody as Record<string, unknown>)[key] = key === 'sortOrderNo' ? Number(value) : value;
  }
});

When('I set the question\'s {string} field to a 201-character string', async ({ questionsPage }, field: string) => {
  await questionsPage.fillField(field, 'A'.repeat(201));
});

When(
  'I set the Effective Date to {int} days ago and the Expiry Date to {int} days ago',
  async ({ questionsPage }, effDays: number, expDays: number) => {
    await questionsPage.setDateField('Effective Date', daysAgo(effDays));
    await questionsPage.setDateField('Expiry Date', daysAgo(expDays));
  },
);

When('I set the Expiry Date to {int} days in the future', async ({ questionsPage, world }, days: number) => {
  const value = daysAgo(-days);
  await questionsPage.setDateField('Expiry Date', value);
  if (world.questionBody) world.questionBody.expiryDate = value;
});

When('I clear the {string} selection', async ({ questionsPage }, group: string) => {
  await questionsPage.clearMultiSelect(group as 'Inspection Type' | 'Scaling Methods' | 'Valid Responses');
});

When('I select the {string} Valid Responses option', async ({ questionsPage }, option: string) => {
  await questionsPage.toggleMultiSelectOption('Valid Responses', option);
});

When('I do nothing further', async () => {
  // Intentional no-op — keeps the Scenario Outline's step shape uniform across rows (see create.feature @S05b).
});

When('I save the question', async ({ questionsPage }) => {
  await questionsPage.save();
});

When('I reset the question form', async ({ questionsPage }) => {
  await questionsPage.reset();
});

// Back is offered only in EDIT mode — MaintenanceFormModal renders it when `onBack` is supplied and
// modalMode === 'edit', so a create-mode Back scenario would have no control to click.
When('I go back from the question form', async ({ questionsPage }) => {
  await questionsPage.back();
});

// Comparand is the seeded snapshot, not world.questionBody — the "set the question's ... field" step
// above has already overwritten that with the value Reset is expected to discard.
Then('the question\'s {string} field should show its saved value', async ({ questionsPage, world }, field: string) => {
  const original = world.originalQuestionBody;
  if (!original) throw new Error('[verify] no originalQuestionBody in world — seed a question first');
  const key = BODY_KEY_BY_LABEL[field];
  if (!key) throw new Error(`[verify] no body key for question field "${field}"`);
  await questionsPage.expectFieldValue(field, String((original as Record<string, unknown>)[key]));
});

// Create-mode Reset empties the form (`useMaintenanceCrud.resetForm` -> `emptyForm`), unlike edit-mode
// Reset which restores the loaded record.
Then('the question form should be blank', async ({ questionsPage }) => {
  await questionsPage.expectFieldValue('Question', '');
  await questionsPage.expectFieldValue('Sort Order', '');
});
