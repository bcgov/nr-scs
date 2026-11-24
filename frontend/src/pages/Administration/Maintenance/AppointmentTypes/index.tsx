import { type FC, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import MaintenanceFormModal from '@/components/Maintenance/MaintenanceFormModal';
import MaintenanceListPage from '@/components/Maintenance/MaintenanceListPage';
import { PERMISSIONS } from '@/context/auth/permissions';
import ConfirmDeleteModal from '@/components/Modal/ConfirmDeleteModal';
import type { TableHeaderType } from '@/components/Form/TableResource/types';
import { useSortableTable } from '@/hooks/useSortableTable';
import {
  type FormErrors,
  type MaintenanceCrudConfig,
  useMaintenanceCrud,
} from '@/hooks/useMaintenanceCrud';
import API from '@/services/APIs';
import type {
  AppointmentType,
  AppointmentTypeCreateRequest,
  AppointmentTypeUpdateRequest,
} from '@/services/appointmentTypes.service';
import { toPageableResponse } from '@/utils/toPageableResponse';
import {
  APPOINTMENT_TYPE_LOV,
  GRADING_CODE_APPOINTMENT_TYPE_LOV,
  purgeLovCache,
} from '@/utils/lovCache';
import { dateOnlyFieldError } from '@/utils/dateOnly';

import {
  type AppointmentTypeFormState,
  AppointmentTypesFormFields,
  AppointmentTypesViewFields,
} from './AppointmentTypesModal';

const emptyAppointmentTypeForm: AppointmentTypeFormState = {
  code: '',
  description: '',
  effectiveDate: '',
  expiryDate: '',
  acting: '',
};

const isDateSet = (value: string) => Boolean(value) && value !== 'YYYY-MM-DD';

const validate = (form: AppointmentTypeFormState): FormErrors => {
  const errors: FormErrors = {};
  if (!form.code.trim()) {
    errors.code = 'Code is required.';
  } else if (form.code.trim().length > 4) {
    errors.code = 'Code must be 4 characters or less.';
  }
  if (!form.description.trim()) {
    errors.description = 'Description is required.';
  } else if (form.description.trim().length > 120) {
    errors.description = 'Appointment Description can not be greater than 120 characters.';
  }
  if (!form.acting) {
    errors.acting = 'Acting indicator is required.';
  }
  if (!isDateSet(form.effectiveDate)) {
    errors.effectiveDate = 'Effective date is required.';
  }
  if (!isDateSet(form.expiryDate)) {
    errors.expiryDate = 'Expiry date is required.';
  }
  // Calendar validity was never checked here: the ordering rule below compares the raw strings, so
  // a non-existent date like 2026-02-30 sorted fine and reached the API unchallenged.
  const effectiveDateError = dateOnlyFieldError(form.effectiveDate, 'Effective date');
  if (effectiveDateError) {
    errors.effectiveDate = effectiveDateError;
  }
  const expiryDateError = dateOnlyFieldError(form.expiryDate, 'Expiry date');
  if (expiryDateError) {
    errors.expiryDate = expiryDateError;
  }
  if (isDateSet(form.effectiveDate) && isDateSet(form.expiryDate) && !effectiveDateError
      && !expiryDateError && form.expiryDate < form.effectiveDate) {
    errors.expiryDate = 'Expiry date cannot be before effective date.';
  }
  return errors;
};

// Two LOVs are views over this master table, so every write here has to drop the browser's cached
// copies of both or their dropdowns keep offering the pre-write list for the rest of the session — a
// full reload does not help, sessionStorage outlives it:
//  - `APPOINTMENT_TYPE_LOV` — the Scaler search filter and the Scaler view's Appointments tab;
//  - `GRADING_CODE_APPOINTMENT_TYPE_LOV` — the grading-code xref joins the appointment-type
//    description, and the Scaler form dropdown and the Appointments tab both read it.
// These are the browser-side counterparts of the LOV caches `AppointmentTypeService` evicts
// server-side. ValidLicenceAttributes purges only the grading-code LOV, since its table does not
// feed the plain appointment-type LOV. `onLovChanged` runs only after a successful mutation.
const buildCrudConfig = (
  onLovChanged: () => void,
): MaintenanceCrudConfig<
  AppointmentType,
  AppointmentType,
  AppointmentTypeFormState,
  AppointmentTypeCreateRequest,
  AppointmentTypeUpdateRequest
> => ({
  search: (params, token) => API.appointmentTypes.searchAppointmentTypes(params, token),
  create: async (payload, token) => {
    const created = await API.appointmentTypes.createAppointmentType(payload, token);
    onLovChanged();
    return created;
  },
  update: async (selected, payload, token) => {
    const updated = await API.appointmentTypes.updateAppointmentType(selected.code ?? '', payload, token);
    onLovChanged();
    return updated;
  },
  remove: async (selected, token) => {
    await API.appointmentTypes.deleteAppointmentType(selected.code ?? '', token);
    onLovChanged();
  },
  // The list rows already carry every field, so no detail fetch is needed.
  fetchDetailOnView: false,
  emptyForm: emptyAppointmentTypeForm,
  applyToForm: (entity) => ({
    code: entity.code ?? '',
    description: entity.description ?? '',
    effectiveDate: entity.effectiveDate ?? 'YYYY-MM-DD',
    expiryDate: entity.expiryDate ?? 'YYYY-MM-DD',
    acting: entity.actingInd === 'Y' ? 'yes' : entity.actingInd === 'N' ? 'no' : '',
  }),
  buildCreatePayload: (form) => ({
    code: form.code.trim().toUpperCase(),
    description: form.description.trim(),
    actingInd: form.acting === 'yes' ? 'Y' : 'N',
    effectiveDate: form.effectiveDate,
    expiryDate: form.expiryDate,
  }),
  buildUpdatePayload: (form) => ({
    description: form.description.trim(),
    actingInd: form.acting === 'yes' ? 'Y' : 'N',
    effectiveDate: form.effectiveDate,
    expiryDate: form.expiryDate,
  }),
  validate,
  messages: {
    load: 'Could not load appointment types.',
    save: 'Could not save appointment type.',
    delete: 'Could not delete appointment type.',
  },
});

const AppointmentTypesAdminPage: FC = () => {
  const queryClient = useQueryClient();
  const crudConfig = useMemo(
    () => buildCrudConfig(() => {
      purgeLovCache(queryClient, APPOINTMENT_TYPE_LOV);
      purgeLovCache(queryClient, GRADING_CODE_APPOINTMENT_TYPE_LOV);
    }),
    [queryClient],
  );
  const crud = useMaintenanceCrud(crudConfig);
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(crud.items);

  const headers: TableHeaderType<AppointmentType>[] = [
    {
      key: 'code',
      header: 'Appointment Type',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => (
        <button
          type="button"
          className="scs__link"
          onClick={() => {
            if (row) {
              crud.openView(row);
            }
          }}
        >
          {row?.code ?? ''}
        </button>
      ),
    },
    { key: 'description', header: 'Appointment Description', selected: true, sortable: true },
  ];

  const content = toPageableResponse(
    sortedRows.map((type) => ({ ...type, id: type.code ?? '' })),
  );

  return (
    <MaintenanceListPage
      title="Appointment Types"
      breadCrumbs={[
        { name: 'Administration' },
        { name: 'Maintenance' },
        { name: 'Appointment Types', path: '/maintenance/appointment-types' },
      ]}
      error={crud.error}
      errorTitle="Unable to load Appointment Types"
      headers={headers}
      content={content}
      loading={crud.loading}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      addLabel="Add Appointment Type"
      onAdd={crud.openCreate}
      addPermission={PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_CREATE}
    >
      <MaintenanceFormModal
        modalMode={crud.modalMode}
        onClose={crud.closeModal}
        headings={{
          create: 'Maintain Appointment Types - Create',
          edit: 'Maintain Appointment Types - Edit',
          view: 'Appointment Type Detail',
        }}
        formMessage={crud.formMessage}
        detailLoading={crud.detailLoading}
        audit={crud.selected}
        onEdit={crud.openEdit}
        onDelete={crud.requestDelete}
        editPermission={PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_UPDATE}
        deletePermission={PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_DELETE}
        editLabel="Edit Appointment"
        onSave={crud.onSave}
        onReset={crud.resetForm}
        onBack={crud.cancelEdit}
        isSubmitting={crud.isSubmitting}
        renderViewFields={() => <AppointmentTypesViewFields formState={crud.formState} />}
        renderFormFields={() => (
          <AppointmentTypesFormFields
            formState={crud.formState}
            formErrors={crud.formErrors}
            onFieldChange={crud.updateForm}
            isSubmitting={crud.isSubmitting}
            isEdit={crud.modalMode === 'edit'}
          />
        )}
      />

      <ConfirmDeleteModal
        open={crud.deleteModalOpen}
        isSubmitting={crud.isSubmitting}
        condition={null}
        onConfirm={crud.confirmDelete}
        onCancel={crud.cancelDelete}
      />
    </MaintenanceListPage>
  );
};

export default AppointmentTypesAdminPage;
