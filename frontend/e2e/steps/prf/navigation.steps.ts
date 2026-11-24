import { Given, When } from '../fixtures';
import {
  prfAnchorScalerLicenceNo,
  emptyStateScalerLicenceNo,
  happyActionRemark,
} from '../../fixtures/prf/performance-remark-test-data';

/**
 * Navigation + entry steps for the Scaler Performance Remarks tab (UC-PRF-001/002/003). The create/edit/detail
 * panels are in-tab state swaps on the same URL (no route, no modal) — see PerformanceRemarksTabPage.
 */

Given('I am on the Performance Remarks tab for the anchor scaler', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.open(prfAnchorScalerLicenceNo);
  world.performanceRemarkScalerLicenceNo = prfAnchorScalerLicenceNo;
});

Given('I am on the Performance Remarks tab for a scaler with no remarks', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.open(emptyStateScalerLicenceNo);
  world.performanceRemarkScalerLicenceNo = emptyStateScalerLicenceNo;
});

// Seed an existing remark (via API) so update/delete scenarios have a row to act on, then land on the tab.
Given('a performance remark exists for the anchor scaler', async ({ performanceRemarksTabPage, seedPerformanceRemark, world }) => {
  const id = await seedPerformanceRemark(prfAnchorScalerLicenceNo);
  world.performanceRemarkId = id;
  world.performanceRemarkScalerLicenceNo = prfAnchorScalerLicenceNo;
  world.performanceRemarkExpectedDesc = happyActionRemark.description;
  await performanceRemarksTabPage.open(prfAnchorScalerLicenceNo);
});

When('I open the Add Performance Remark form', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.clickAdd();
});

When('I open that remark\'s edit form from the list', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.clickEditForRow(world.performanceRemarkId as string);
});

When('I open that remark\'s detail view', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.openDetail(world.performanceRemarkId as string);
});

When('I click Edit Record on the detail view', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.clickEditRecordOnDetail();
});

When('I go Back without saving', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.clickBack();
});

When('I reset the performance remark form', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.clickReset();
});
