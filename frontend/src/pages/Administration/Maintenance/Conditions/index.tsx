import { type FC, useEffect, useState } from 'react';

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
import type {
  ScaleAuthConditionCreateRequest,
  ScaleAuthConditionDetail,
  ScaleAuthConditionUpdateRequest,
} from '@/services/conditions.service';
import type { ScaleMethodTypeLov, StaticLov } from '@/services/lov.service';
import { toPageableResponse } from '@/utils/toPageableResponse';

import MaintenanceFilterSelect from '@/components/Form/MaintenanceFilterSelect';
import { compareDateOnly, dateOnlyFieldError } from '@/utils/dateOnly';
import {
  type ConditionFormState,
  ConditionsFormFields,
  ConditionsViewFields,
} from './ConditionsModal';

const DELETE_BLOCKED_MESSAGE =
  'The current record has been associated to a Site Authorization, Scaler Authorization, ' +
  'Mark Site Designation, or Template and cannot be deleted. You can expire this record by ' +
  'setting an expiry date for this Condition.';

const emptyConditionForm: ConditionFormState = {
  scaleConditionClassCode: '',
  scaleAuthConditionTitle: '',
  scaleAuthConditionDesc: '',
  ministryStandardInd: '',
  sortOrderNo: '',
  effectiveDate: '',
  expiryDate: '',
  siteMethodTypeCodes: [],
};

// Site Type applies ONLY to Scale Site Authorization (SIA) conditions. Mark Site Designation (MSD) and
// Scaler Authorization (SCA) must NOT carry a Site Type — the backend rejects one on either.
const isSia = (classCode: string) => classCode.trim().toUpperCase() === 'SIA';

const validate = (form: ConditionFormState): FormErrors => {
  const errors: FormErrors = {};
  if (!form.scaleConditionClassCode.trim()) {
    errors.scaleConditionClassCode = 'Type is required.';
  }
  if (!form.scaleAuthConditionTitle.trim()) {
    errors.scaleAuthConditionTitle = 'Title is required.';
  }
  if (!form.ministryStandardInd.trim()) {
    errors.ministryStandardInd = 'Mandatory? is required.';
  }
  if (!form.sortOrderNo.trim()) {
    errors.sortOrderNo = 'Sort Order is required.';
  }
  if (!form.effectiveDate.trim()) {
    errors.effectiveDate = 'Effective Date is required.';
  }
  if (!form.scaleAuthConditionDesc.trim()) {
    errors.scaleAuthConditionDesc = 'Condition Text is required.';
  }
  if (isSia(form.scaleConditionClassCode) && form.siteMethodTypeCodes.length === 0) {
    errors.siteMethodTypeCodes = 'Site Type is required.';
  }
  if (form.sortOrderNo.trim().length > 0) {
    const parsed = Number(form.sortOrderNo);
    if (!Number.isFinite(parsed)) {
      errors.sortOrderNo = 'Sort Order must be a number.';
    } else if (parsed < 0 || parsed > 9999) {
      errors.sortOrderNo = 'Sort Order must be between 0 and 9999.';
    }
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

const buildPayload = (
  form: ConditionFormState,
): ScaleAuthConditionCreateRequest & ScaleAuthConditionUpdateRequest => {
  const trimmedExpiry = form.expiryDate.trim();
  return {
    scaleConditionClassCode: form.scaleConditionClassCode.trim(),
    scaleAuthConditionTitle: form.scaleAuthConditionTitle.trim(),
    scaleAuthConditionDesc: form.scaleAuthConditionDesc.trim(),
    ministryStandardInd: form.ministryStandardInd.trim(),
    sortOrderNo: Number(form.sortOrderNo),
    effectiveDate: form.effectiveDate,
    expiryDate: trimmedExpiry.length > 0 ? trimmedExpiry : null,
    // Only SIA conditions carry Site Types; send null for MSD/SCA so the backend stores none.
    siteMethodTypeCodes: isSia(form.scaleConditionClassCode) ? form.siteMethodTypeCodes : null,
  };
};

const crudConfig: MaintenanceCrudConfig<
  ScaleAuthConditionDetail,
  ScaleAuthConditionDetail,
  ConditionFormState,
  ScaleAuthConditionCreateRequest,
  ScaleAuthConditionUpdateRequest
> = {
  search: (params, token) => API.conditions.searchConditions(params, token),
  getDetail: (entity, token) =>
    API.conditions.getCondition(entity.scaleConditionClassCode ?? '', entity.scaleAuthConditionId as number, token),
  create: (payload, token) => API.conditions.createCondition(payload, token),
  update: (selected, payload, token) =>
    API.conditions.updateCondition(selected.scaleConditionClassCode ?? '', selected.scaleAuthConditionId as number, payload, token),
  remove: (selected, token) =>
    API.conditions.deleteCondition(selected.scaleConditionClassCode ?? '', selected.scaleAuthConditionId as number, token),
  checkDependents: (entity) => Promise.resolve(Boolean(entity.dependentChildExists)),
  emptyForm: emptyConditionForm,
  applyToForm: (entity) => ({
    scaleConditionClassCode: entity.scaleConditionClassCode ?? '',
    scaleAuthConditionTitle: entity.scaleAuthConditionTitle ?? '',
    scaleAuthConditionDesc: entity.scaleAuthConditionDesc ?? '',
    ministryStandardInd: entity.ministryStandardInd ?? '',
    sortOrderNo: entity.sortOrderNo != null ? String(entity.sortOrderNo) : '',
    effectiveDate: entity.effectiveDate ?? '',
    expiryDate: entity.expiryDate ?? '',
    siteMethodTypeCodes: entity.siteMethodTypeCodes ?? [],
  }),
  buildCreatePayload: buildPayload,
  buildUpdatePayload: (form) => buildPayload(form),
  validate,
  messages: {
    load: 'Could not load conditions.',
    detail: 'Could not load condition details.',
    save: 'Could not save condition.',
    delete: 'Could not delete condition.',
  },
};

const ConditionsAdminPage: FC = () => {
  const { userToken } = useAuth();
  const crud = useMaintenanceCrud(crudConfig);

  const [conditionTypes, setConditionTypes] = useState<StaticLov[]>([]);
  const [methodTypes, setMethodTypes] = useState<ScaleMethodTypeLov[]>([]);
  const [filterValue, setFilterValue] = useState('ALL');

  useEffect(() => {
    const loadLovs = async () => {
      try {
        const token = await userToken();
        const [types, methods] = await Promise.all([
          API.lov.getStaticLov({ tableKey: 'SCALE_CONDITION_CLASS_CODE' }, token),
          API.lov.getScaleMethodTypeLov(undefined, token),
        ]);
        setConditionTypes(types ?? []);
        setMethodTypes(methods ?? []);
      } catch {
        setConditionTypes([]);
        setMethodTypes([]);
      }
    };
    void loadLovs();
  }, [userToken]);

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    void crud.reload(value !== 'ALL' ? { scaleConditionClassCode: value } : {});
  };

  // Site Type applies only to SIA; selecting any non-SIA type (MSD/SCA) clears chosen site types.
  const handleFieldChange = (patch: Partial<ConditionFormState>) => {
    const classCode = (patch.scaleConditionClassCode ?? crud.formState.scaleConditionClassCode).trim().toUpperCase();
    crud.updateForm(isSia(classCode) ? patch : { ...patch, siteMethodTypeCodes: [] });
  };

  const rows = crud.items.map((item, index) => ({
    ...item,
    id: `${item.scaleConditionClassCode ?? ''}-${item.scaleAuthConditionId ?? index}`,
    siteMethodTypeLabel: (item.siteMethodTypeCodes ?? []).join(', '),
  }));
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(rows);
  const content = toPageableResponse(sortedRows);

  const headers: TableHeaderType<(typeof rows)[number]>[] = [
    { key: 'sortOrderNo', header: 'Sort Order', selected: true, sortable: true },
    {
      key: 'scaleAuthConditionId',
      header: 'Condition #',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => (
        <button type="button" className="scs__link" onClick={() => row && crud.openView(row)}>
          {row?.scaleAuthConditionId ?? ''}
        </button>
      ),
    },
    { key: 'scaleAuthConditionTitle', header: 'Condition Name', selected: true, sortable: true },
    { key: 'scaleConditionClassCode', header: 'Type', selected: true, sortable: true },
    { key: 'siteMethodTypeLabel', header: 'Site Type', selected: true, sortable: true },
    { key: 'expiryDate', header: 'Expiry Date', selected: true, sortable: true },
  ];

  const filter = (
    <MaintenanceFilterSelect
      id="condition-filter"
      value={filterValue}
      onChange={handleFilterChange}
      options={conditionTypes.map((item) => ({ value: item?.code || '', text: item?.description || '' }))}
    />
  );

  return (
    <MaintenanceListPage
      title="Maintain Conditions"
      breadCrumbs={[
        { name: 'Administration' },
        { name: 'Maintenance' },
        { name: 'Conditions', path: '/maintenance/conditions' },
      ]}
      error={crud.error}
      errorTitle="Unable to load conditions"
      headers={headers}
      content={content}
      loading={crud.loading}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      addLabel="Add Condition"
      onAdd={crud.openCreate}
      addPermission={PERMISSIONS.MAINTAIN_CONDITIONS_CREATE}
      filter={filter}
      resetPageKey={filterValue}
    >
      <MaintenanceFormModal
        modalMode={crud.modalMode}
        onClose={crud.closeModal}
        className="conditions__modal"
        headings={{
          create: 'Maintain Conditions - Create',
          edit: 'Maintain Conditions - Edit',
          view: 'Maintain Conditions - Details',
        }}
        formMessage={crud.formMessage}
        detailLoading={crud.detailLoading}
        audit={crud.selected}
        onEdit={crud.openEdit}
        onDelete={crud.requestDelete}
        editPermission={PERMISSIONS.MAINTAIN_CONDITIONS_UPDATE}
        deletePermission={PERMISSIONS.MAINTAIN_CONDITIONS_DELETE}
        editLabel="Edit Condition"
        deleteBlockedMessage={crud.deleteBlocked ? DELETE_BLOCKED_MESSAGE : null}
        onSave={crud.onSave}
        onReset={crud.resetForm}
        onBack={crud.cancelEdit}
        isSubmitting={crud.isSubmitting}
        renderViewFields={() => (
          <ConditionsViewFields selected={crud.selected} conditionTypes={conditionTypes} />
        )}
        renderFormFields={() => (
          <ConditionsFormFields
            selected={crud.selected}
            conditionTypes={conditionTypes}
            methodTypes={methodTypes}
            formState={crud.formState}
            formErrors={crud.formErrors}
            onFieldChange={handleFieldChange}
            isSubmitting={crud.isSubmitting}
            isEdit={crud.modalMode === 'edit'}
          />
        )}
      />

      <ConfirmDeleteModal
        open={crud.deleteModalOpen}
        isSubmitting={crud.isSubmitting}
        condition={crud.selected}
        onConfirm={crud.confirmDelete}
        onCancel={crud.cancelDelete}
      />
    </MaintenanceListPage>
  );
};

export default ConditionsAdminPage;
