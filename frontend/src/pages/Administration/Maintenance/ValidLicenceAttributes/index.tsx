import { useQueryClient } from '@tanstack/react-query';
import { type FC, useEffect, useMemo, useState } from 'react';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import MaintenanceFormModal from '@/components/Maintenance/MaintenanceFormModal';
import MaintenanceListPage from '@/components/Maintenance/MaintenanceListPage';
import { PERMISSIONS } from '@/context/auth/permissions';
import ConfirmDeleteModal from '@/components/Modal/ConfirmDeleteModal';
import { useAuth } from '@/context/auth/useAuth';
import {
  type FormErrors,
  type MaintenanceCrudConfig,
  useMaintenanceCrud,
} from '@/hooks/useMaintenanceCrud';
import { useSortableTable } from '@/hooks/useSortableTable';
import API from '@/services/APIs';
import type { AppointmentTypeLov, GradingCodeAppointmentTypeLov, StaticLov } from '@/services/lov.service';
import type {
  ValidLicenceAttributeCreateRequest,
  ValidLicenceAttributeDetail,
  ValidLicenceAttributeUpdateRequest,
} from '@/services/validLicenceAttributes.service';
import { GRADING_CODE_APPOINTMENT_TYPE_LOV, purgeLovCache } from '@/utils/lovCache';
import { toPageableResponse } from '@/utils/toPageableResponse';

import MaintenanceFilterSelect from '@/components/Form/MaintenanceFilterSelect';
import { compareDateOnly, dateOnlyFieldError } from '@/utils/dateOnly';
import {
  type ValidLicenceAttributeFormState,
  ValidLicenceAttributesFormFields,
  ValidLicenceAttributesViewFields,
} from './ValidLicenceAttributesModal';

const DELETE_BLOCKED_MESSAGE =
  'The current record has been associated to a Scaler and cannot be deleted. ' +
  'You can expire this record by setting an expiry date.';

const emptyForm: ValidLicenceAttributeFormState = {
  scaleGradingSystemCode: '',
  scalerAppointmentType: '',
  effectiveDate: '',
  expiryDate: '',
};

const nullableExpiry = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const validate = (form: ValidLicenceAttributeFormState, mode: 'create' | 'edit'): FormErrors => {
  const errors: FormErrors = {};
  if (mode === 'create') {
    if (!form.scaleGradingSystemCode.trim()) {
      errors.scaleGradingSystemCode = 'Grading System Code is required.';
    }
    if (!form.scalerAppointmentType.trim()) {
      errors.scalerAppointmentType = 'Appointment Type is required.';
    }
  }
  if (!form.effectiveDate.trim()) {
    errors.effectiveDate = 'Effective Date is required.';
  }
  // A calendar-invalid entry (e.g. 2026-02-30) used to produce NO error here: `new Date` returned
  // Invalid Date, the NaN guards below skipped the comparison, and the value went to the API.
  const effectiveDateError = dateOnlyFieldError(form.effectiveDate, 'Effective Date');
  if (effectiveDateError) {
    errors.effectiveDate = effectiveDateError;
  }
  const expiryDateError = dateOnlyFieldError(form.expiryDate, 'Expiry Date');
  if (expiryDateError) {
    errors.expiryDate = expiryDateError;
  }
  if (form.effectiveDate && form.expiryDate && !effectiveDateError && !expiryDateError) {
    // compareDateOnly parses strictly, so the ordering rule can no longer be skipped silently.
    if (compareDateOnly(form.expiryDate, form.effectiveDate) < 0) {
      errors.expiryDate = 'Expiry Date must be on or after Effective Date.';
    }
  }
  return errors;
};

/**
 * `onLovChanged` runs after every successful write. The grading-code/appointment-type LOV is a view
 * over this very table, so each create/update/delete changes what the Scaler appointment dropdowns
 * should offer — and every cache in front of that LOV has to be dropped or the new attribute stays
 * invisible (QA: "newly added licence attributes do not appear in dropdowns"). The server evicts its
 * own Caffeine cache in `ValidLicenceAttributeService`; this covers the browser's copies, which
 * otherwise persist for the whole session.
 */
const buildCrudConfig = (
  onLovChanged: () => void,
): MaintenanceCrudConfig<
  ValidLicenceAttributeDetail,
  ValidLicenceAttributeDetail,
  ValidLicenceAttributeFormState,
  ValidLicenceAttributeCreateRequest,
  ValidLicenceAttributeUpdateRequest
> => ({
  search: (params, token) => API.validLicenceAttributes.searchValidLicenceAttributes(params, token),
  getDetail: (entity, token) =>
    API.validLicenceAttributes.getValidLicenceAttribute(
      entity.scaleGradingSystemCode ?? '',
      entity.scalerAppointmentType ?? '',
      token,
    ),
  create: async (payload, token) => {
    const created = await API.validLicenceAttributes.createValidLicenceAttribute(payload, token);
    onLovChanged();
    return created;
  },
  update: async (selected, payload, token) => {
    const updated = await API.validLicenceAttributes.updateValidLicenceAttribute(
      selected.scaleGradingSystemCode ?? '',
      selected.scalerAppointmentType ?? '',
      payload,
      token,
    );
    onLovChanged();
    return updated;
  },
  remove: async (selected, token) => {
    await API.validLicenceAttributes.deleteValidLicenceAttribute(
      selected.scaleGradingSystemCode ?? '',
      selected.scalerAppointmentType ?? '',
      token,
    );
    onLovChanged();
  },
  checkDependents: (entity) => Promise.resolve(Boolean(entity.dependentChildExists)),
  emptyForm,
  applyToForm: (entity) => ({
    scaleGradingSystemCode: entity.scaleGradingSystemCode ?? '',
    scalerAppointmentType: entity.scalerAppointmentType ?? '',
    effectiveDate: entity.effectiveDate ?? '',
    expiryDate: entity.expiryDate ?? '',
  }),
  buildCreatePayload: (form) => ({
    scaleGradingSystemCode: form.scaleGradingSystemCode.trim(),
    scalerAppointmentType: form.scalerAppointmentType.trim(),
    effectiveDate: form.effectiveDate,
    expiryDate: nullableExpiry(form.expiryDate),
  }),
  // Update sends only the dates (both key fields are immutable).
  buildUpdatePayload: (form) => ({
    effectiveDate: form.effectiveDate,
    expiryDate: nullableExpiry(form.expiryDate),
  }),
  validate,
  messages: {
    load: 'Could not load valid licence attributes.',
    detail: 'Could not load attribute details.',
    save: 'Could not save valid licence attribute.',
    delete: 'Could not delete valid licence attribute.',
  },
});

const ValidLicenceAttributesAdminPage: FC = () => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  const crudConfig = useMemo(
    () => buildCrudConfig(() => purgeLovCache(queryClient, GRADING_CODE_APPOINTMENT_TYPE_LOV)),
    [queryClient],
  );
  const crud = useMaintenanceCrud(crudConfig);

  const [gradingCodeLov, setGradingCodeLov] = useState<GradingCodeAppointmentTypeLov[]>([]);
  const [appointmentTypeLov, setAppointmentTypeLov] = useState<AppointmentTypeLov[]>([]);
  const [gradingSystemLov, setGradingSystemLov] = useState<StaticLov[]>([]);
  const [filterValue, setFilterValue] = useState('ALL');

  useEffect(() => {
    const loadLov = async () => {
      let token: string;
      try {
        token = await userToken();
      } catch {
        setGradingCodeLov([]);
        setAppointmentTypeLov([]);
        setGradingSystemLov([]);
        return;
      }
      // Load each LOV independently. gradingCodeLov (the grading-code xref) supplies the
      // list/description columns, gradingSystemLov backs the filter, and appointmentTypeLov is the
      // full appointment-type list for the Add-Attribute dropdown. They must not share a fate: a
      // failure of the create-only appointment-type list should not blank the list view or filter.
      const [gradingXref, apptTypes, gradingSystems] = await Promise.allSettled([
        API.lov.getGradingCodeAppointmentTypeLov(token),
        API.lov.getAppointmentTypeLov(undefined, token),
        API.lov.getStaticLov({ tableKey: 'SCALE_GRADING_SYSTEM_CODE' }, token),
      ]);
      setGradingCodeLov(gradingXref.status === 'fulfilled' ? gradingXref.value ?? [] : []);
      setAppointmentTypeLov(apptTypes.status === 'fulfilled' ? apptTypes.value ?? [] : []);
      setGradingSystemLov(gradingSystems.status === 'fulfilled' ? gradingSystems.value ?? [] : []);
    };
    void loadLov();
  }, [userToken]);

  const apptTypeDescMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const lov of gradingCodeLov) {
      const apptType = lov.scalerAppointmentType ?? '';
      if (apptType && !map.has(apptType) && lov.description) {
        const dashIdx = lov.description.indexOf(' - ');
        map.set(apptType, dashIdx === -1 ? lov.description : lov.description.substring(0, dashIdx));
      }
    }
    return map;
  }, [gradingCodeLov]);

  const gradingSystemOptions = useMemo(
    () =>
      gradingSystemLov
        .filter((item) => item.code && item.description)
        .map((item) => ({ code: item.code!, name: item.description! }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [gradingSystemLov],
  );

  // Map from grading system code → full name (e.g. "C" → "Coastal", "B" → "Both"). Built from the
  // same SCALE_GRADING_SYSTEM_CODE static LOV that backs the filter and the create form, so every
  // selectable code resolves — as legacy did (validLicenceAttributeLeft.jsp rendered this cell from
  // that LOV). Deriving it from the grading-code/appointment-type LOV instead left codes with no valid
  // combos (B, NA) blank, which also made the row's link unclickable.
  const gradingSystemNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const { code, name } of gradingSystemOptions) {
      map.set(code, name);
    }
    return map;
  }, [gradingSystemOptions]);

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    void crud.reload(value !== 'ALL' ? { scaleGradingSystemCode: value } : {});
  };

  const rows = crud.items.map((item, index) => {
    const gradingSystemCode = item.scaleGradingSystemCode ?? '';
    const fullDesc = item.scalerAppointmentTypeDescription ?? '';
    const dashIdx = fullDesc.indexOf(' - ');
    const descFromBackend = dashIdx === -1 ? fullDesc : fullDesc.substring(0, dashIdx);
    return {
      ...item,
      id: `${item.scaleGradingSystemCode ?? ''}-${item.scalerAppointmentType ?? index}`,
      // Fall back to the raw code so the row link always has a label to click.
      gradingSystemName: gradingSystemNameMap.get(gradingSystemCode) ?? gradingSystemCode,
      appointmentTypeDescShort: descFromBackend || apptTypeDescMap.get(item.scalerAppointmentType ?? '') || '',
    };
  });
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(rows);
  const content = toPageableResponse(sortedRows);

  const headers: TableHeaderType<(typeof rows)[number]>[] = [
    {
      key: 'gradingSystemName',
      header: 'Grading System',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => (
        <button type="button" className="scs__link" onClick={() => row && crud.openView(row)}>
          {row?.gradingSystemName ?? ''}
        </button>
      ),
    },
    { key: 'scalerAppointmentType', header: 'Appointment Type', selected: true, sortable: true },
    { key: 'appointmentTypeDescShort', header: 'Appointment Type Description', selected: true, sortable: true },
  ];

  const filter = (
    <MaintenanceFilterSelect
      id="vla-filter"
      labelText="Filter by Grading System"
      value={filterValue}
      onChange={handleFilterChange}
      options={gradingSystemOptions.map(({ code, name }) => ({ value: code, text: name }))}
    />
  );

  return (
    <MaintenanceListPage
      title="Maintain Valid Licence Attributes"
      breadCrumbs={[
        { name: 'Administration' },
        { name: 'Maintenance' },
        { name: 'Maintain Valid Licence Attributes', path: '/maintenance/valid-licence-attributes' },
      ]}
      error={crud.error}
      errorTitle="Unable to load valid licence attributes"
      headers={headers}
      content={content}
      loading={crud.loading}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      addLabel="Add Attribute"
      onAdd={crud.openCreate}
      addPermission={PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE}
      filter={filter}
      resetPageKey={filterValue}
    >
      <MaintenanceFormModal
        modalMode={crud.modalMode}
        onClose={crud.closeModal}
        headings={{
          create: 'Maintain Valid Licence Attributes - Create',
          edit: 'Maintain Valid Licence Attributes - Edit',
          view: 'Maintain Valid Licence Attributes - Details',
        }}
        formMessage={crud.formMessage}
        detailLoading={crud.detailLoading}
        audit={crud.selected}
        onEdit={crud.openEdit}
        onDelete={crud.requestDelete}
        editPermission={PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE}
        deletePermission={PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE}
        editLabel="Edit"
        deleteBlockedMessage={crud.deleteBlocked ? DELETE_BLOCKED_MESSAGE : null}
        onSave={crud.onSave}
        onReset={crud.resetForm}
        onBack={crud.cancelEdit}
        isSubmitting={crud.isSubmitting}
        renderViewFields={() => (
          <ValidLicenceAttributesViewFields
            selected={crud.selected}
            gradingCodeLov={gradingCodeLov}
            gradingSystemOptions={gradingSystemOptions}
          />
        )}
        renderFormFields={() => (
          <ValidLicenceAttributesFormFields
            selected={crud.selected}
            gradingCodeLov={gradingCodeLov}
            appointmentTypeLov={appointmentTypeLov}
            gradingSystemOptions={gradingSystemOptions}
            formState={crud.formState}
            formErrors={crud.formErrors}
            onFieldChange={crud.updateForm}
            isSubmitting={crud.isSubmitting}
            isCreate={crud.modalMode === 'create'}
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

export default ValidLicenceAttributesAdminPage;
