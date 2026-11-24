import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';
import { onScalerView } from '../../steps/scl/scalerRoutes';

/**
 * Page object for the new Create Scaler screen (route /scalers/create). All DOM selectors for scaler
 * create live here; steps call these methods. The form (components/Form/ScalerForm, mode="create") has a
 * core section plus a "Please select one of the following" choice between an Appointment section and an
 * Exam / Upgrade section (exactly one required — client-side XOR). The ONLY write
 * (POST /api/scalers) fires from "Save Record"; on success the app navigates to /scalers/view/{licenceNo}.
 *
 * Field ids are the app's stable Carbon ids (ScalerForm/index.tsx): #clientNumber, #clientLocnCode
 * (readOnly, pinned "00"), #district (Reg/Dist select), #effective-date, #scaler-oath-taken; Appointment
 * section #appointment, #province-wide, #appointment-effective-date, #appointment-expiry-date; Exam
 * section #exam-upgrade, #completed-by. The Scaling/Waste licence-type checkboxes and Expiry Date are
 * EDIT-mode only (not present on Create — create always sends licenceTypes ['SCS']).
 */

export type ScalerCore = {
  clientNumber: string;
  district: string; // org-unit-no string, the #district option value
  effectiveDate: string; // YYYY-MM-DD
  oathTaken: string; // 'Yes' | 'No' (select label)
};

export type AppointmentInput = {
  appointmentType: string; // #appointment option label, e.g. 'Acting - Coastal'
  provinceWide: string; // 'Yes' | 'No'
  effectiveDate: string;
  expiryDate: string;
};

export type ExamInput = {
  examType: string; // #exam-upgrade option label, e.g. 'Acting Scaler Exam'
  completedBy: string;
};

export class ScalerCreatePage {
  readonly page: Page;
  readonly clientNumber: Locator;
  readonly saveRecordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Scope to the create FORM's Client/Loc row. Three overlapping `#clientNumber` sources make this
    // fiddlier than it looks:
    //   1. this form's own ClientLocSearch;
    //   2. the Client Search picker modal it mounts (always in the DOM, hidden until opened);
    //   3. since nr-scs `4041715` (2026-08-17), the Client *Queries* screen that modal embeds is itself
    //      built from a ClientLocSearch — so it contributes its own `.client-loc-row #clientNumber`.
    // (3) is what broke the previous `.client-loc-row #clientNumber` selector: that class is the
    // ClientLocSearch *component* container, and once two of them were on the page it stopped
    // identifying this form. `ScalerForm` renders a real <form class="scs__form">, whereas the modal's
    // embedded search form is a <div class="client-search-form scs__form">, so the element type is what
    // separates them. If the modal's form ever becomes a real <form>, give this page a root class and
    // scope to that instead — as ScalerSearchPage does with `.scaler-search__client-loc`.
    this.clientNumber = page.locator('form.scs__form .client-loc-row #clientNumber');
    this.saveRecordButton = page.getByRole('button', { name: 'Save Record' });
  }

  /** Log in (mock IDIR) then client-side navigate to the create route so the in-memory session survives. */
  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/scalers/create');
    // Readiness: the client field is unique to the loaded create form (no guessed heading text).
    await expect(this.clientNumber).toBeVisible();
  }

  /** Apply only the provided core fields — a field left `undefined`/'' is not filled (the "missing" case). */
  async fillCore(values: Partial<ScalerCore>): Promise<void> {
    if (values.clientNumber) await this.clientNumber.fill(values.clientNumber);
    if (values.district) await this.page.selectOption('#district', values.district);
    if (values.effectiveDate) await setDateField(this.page, '#effective-date', values.effectiveDate);
    if (values.oathTaken) await this.page.selectOption('#scaler-oath-taken', { label: values.oathTaken });
  }

  async fillAppointment(appt: AppointmentInput): Promise<void> {
    await this.page.selectOption('#appointment', { label: appt.appointmentType });
    await this.page.selectOption('#province-wide', { label: appt.provinceWide });
    await setDateField(this.page, '#appointment-effective-date', appt.effectiveDate);
    if (appt.expiryDate) await setDateField(this.page, '#appointment-expiry-date', appt.expiryDate);
  }

  async fillExam(exam: ExamInput): Promise<void> {
    await this.page.selectOption('#exam-upgrade', { label: exam.examType });
    if (exam.completedBy) await setDateField(this.page, '#completed-by', exam.completedBy);
  }

  async clickSaveRecord(): Promise<void> {
    await this.saveRecordButton.click();
  }

  /** Happy path: fill core + Appointment section, then Save. */
  async createWithAppointment(core: Partial<ScalerCore>, appt: AppointmentInput): Promise<void> {
    await this.fillCore(core);
    await this.fillAppointment(appt);
    await this.clickSaveRecord();
  }

  /** Happy path: fill core + Exam section, then Save. */
  async createWithExam(core: Partial<ScalerCore>, exam: ExamInput): Promise<void> {
    await this.fillCore(core);
    await this.fillExam(exam);
    await this.clickSaveRecord();
  }

  /**
   * The created scaler's licence number, read from the post-save redirect (/scalers/view/{licenceNo}).
   * Waits web-first for the navigation.
   */
  async createdLicenceNo(): Promise<string> {
    await expect(this.page).toHaveURL(onScalerView);
    const segs = new URL(this.page.url()).pathname.split('/').filter(Boolean);
    const no = segs[segs.length - 1];
    if (!no) throw new Error(`No scaler licence no in view URL: ${this.page.url()}`);
    return decodeURIComponent(no);
  }
}
