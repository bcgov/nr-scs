import { When } from '../fixtures';
import { daysAgo } from '../../fixtures/common/dates';
import {
  actionCode,
  outcomeCode,
  happyActionRemark,
  happyOutcomeRemark,
  futureDate,
  validCheckScaleId,
  nonExistentCheckScaleId,
} from '../../fixtures/prf/performance-remark-test-data';

/**
 * Form-entry steps for the Performance Remark create/edit form. Field ids and the Issue-Type discriminator
 * behaviour are in PerformanceRemarksTabPage; these steps carry the domain vocabulary + fixture values only.
 */

// Composite "all fields valid" bases for the happy paths and the validation Outline (which then breaks one
// field). The Action and Outcome arms are the symmetric mirror of the exactly-one-of Issue Type.
When('I enter a valid performance remark', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.setDateOfIncident(happyActionRemark.dateOfIncident);
  await performanceRemarksTabPage.setIssueType('Action');
  await performanceRemarksTabPage.setActionCode(actionCode);
  await performanceRemarksTabPage.setDescription(happyActionRemark.description);
  world.performanceRemarkExpectedDesc = happyActionRemark.description;
  world.performanceRemarkExpectedIssueType = 'Action';
});

When('I enter a valid performance remark with an Outcome', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.setDateOfIncident(happyOutcomeRemark.dateOfIncident);
  await performanceRemarksTabPage.setIssueType('Outcome');
  await performanceRemarksTabPage.setOutcomeCode(outcomeCode);
  await performanceRemarksTabPage.setDescription(happyOutcomeRemark.description);
  world.performanceRemarkExpectedDesc = happyOutcomeRemark.description;
  world.performanceRemarkExpectedIssueType = 'Outcome';
});

// --- single-field mutations (used by the validation Outline and the check-scale scenarios) ---

When('I clear the Date of Incident', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.setDateOfIncident('');
});

When('I enter a future Date of Incident', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.setDateOfIncident(futureDate);
});

When('I clear the Description', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.setDescription('');
});

When('I edit the Description to {string}', async ({ performanceRemarksTabPage, world }, text) => {
  await performanceRemarksTabPage.setDescription(text);
  world.performanceRemarkExpectedDesc = text;
});

// Select an Issue Type but leave its code blank — the re-grounded "Action/Outcome required" cases. (The new
// app's single Issue-Type Select makes the legacy "both selected" case structurally impossible.)
When('I select Issue Type {string} but leave the code blank', async ({ performanceRemarksTabPage }, type) => {
  if (type === 'Action') {
    await performanceRemarksTabPage.setIssueType('Action');
    await performanceRemarksTabPage.setActionCode('');
  } else {
    await performanceRemarksTabPage.setIssueType('Outcome');
    await performanceRemarksTabPage.setOutcomeCode('');
  }
});

When('I enter a reversed suspension period', async ({ performanceRemarksTabPage }) => {
  // Both dates individually valid; start strictly after end trips the cross-field rule.
  await performanceRemarksTabPage.setSuspendStart(daysAgo(2));
  await performanceRemarksTabPage.setSuspendEnd(daysAgo(9));
});

When('I enter a non-numeric Associated Check Scale #', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.setCheckScaleId('abc');
});

When('I link an existing check scale', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.setCheckScaleId(validCheckScaleId);
});

When('I link a non-existent check scale', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.setCheckScaleId(nonExistentCheckScaleId);
});
