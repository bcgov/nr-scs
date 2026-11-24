import { useQueryClient } from '@tanstack/react-query';
import { type FC, useCallback, useEffect, useState } from 'react';

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
  ExamUpgrade,
  ExamUpgradeCreateRequest,
  ExamUpgradeUpdateRequest,
} from '@/services/examUpgrades.service';
import type { StaticLov } from '@/services/lov.service';
import { SCALER_TRAINING_TYPE_LOV, purgeLovCache } from '@/utils/lovCache';
import { toPageableResponse } from '@/utils/toPageableResponse';

import MaintenanceFilterSelect from '@/components/Form/MaintenanceFilterSelect';
import { compareDateOnly, dateOnlyFieldError } from '@/utils/dateOnly';
import {
  type ExamUpgradeFormState,
  ExamUpgradesFormFields,
  ExamUpgradesViewFields,
} from './ExamUpgradesModal';

const emptyExamUpgradeForm: ExamUpgradeFormState = {
  scalerTrainingClassCode: '',
  scalerTrainingTypeId: '',
  licenceAccreditInd: '',
  description: '',
  effectiveDate: '',
  expiryDate: '',
};

const validate = (form: ExamUpgradeFormState): FormErrors => {
  const errors: FormErrors = {};
  if (!form.scalerTrainingClassCode.trim()) {
    errors.scalerTrainingClassCode = 'Type is required.';
  }
  if (!form.licenceAccreditInd.trim()) {
    errors.licenceAccreditInd = 'Licence Accredit? is required.';
  }
  const description = form.description.trim();
  if (!description) {
    errors.description = 'Description is required.';
  }
  // The DESCRIPTION column is VARCHAR2(120); block over-length input with a clean field-level
  // message instead of letting it reach the DB and surface as a generic error.
  else if (description.length > 120) {
    errors.description = 'Description can not be greater than 120 characters.';
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

const nullableExpiry = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const crudConfig: MaintenanceCrudConfig<
  ExamUpgrade,
  ExamUpgrade,
  ExamUpgradeFormState,
  ExamUpgradeCreateRequest,
  ExamUpgradeUpdateRequest
> = {
  search: (params, token) =>
    API.examUpgrades.listExamUpgrades(params?.scalerTrainingClassCode as string | undefined, token),
  getDetail: (entity, token) =>
    API.examUpgrades.getExamUpgrade(entity.scalerTrainingClassCode, entity.scalerTrainingTypeId, token),
  create: (payload, token) => API.examUpgrades.createExamUpgrade(payload, token),
  update: (selected, payload, token) =>
    API.examUpgrades.updateExamUpgrade(selected.scalerTrainingClassCode, selected.scalerTrainingTypeId, payload, token),
  remove: (selected, token) =>
    API.examUpgrades.deleteExamUpgrade(selected.scalerTrainingClassCode, selected.scalerTrainingTypeId, token),
  emptyForm: emptyExamUpgradeForm,
  applyToForm: (entity) => ({
    scalerTrainingClassCode: entity.scalerTrainingClassCode ?? '',
    scalerTrainingTypeId: entity.scalerTrainingTypeId ?? '',
    licenceAccreditInd: entity.licenceAccreditInd ?? '',
    description: entity.description ?? '',
    effectiveDate: entity.effectiveDate ?? '',
    expiryDate: entity.expiryDate ?? '',
  }),
  buildCreatePayload: (form) => ({
    scalerTrainingClassCode: form.scalerTrainingClassCode.trim(),
    licenceAccreditInd: form.licenceAccreditInd,
    description: form.description.trim(),
    effectiveDate: form.effectiveDate,
    expiryDate: nullableExpiry(form.expiryDate),
  }),
  // Update omits the class code (part of the immutable key).
  buildUpdatePayload: (form) => ({
    licenceAccreditInd: form.licenceAccreditInd,
    description: form.description.trim(),
    effectiveDate: form.effectiveDate,
    expiryDate: nullableExpiry(form.expiryDate),
  }),
  validate,
  messages: {
    load: 'Could not load exam / upgrades.',
    detail: 'Could not load exam / upgrade details.',
    save: 'Could not save Exam / Upgrade.',
    delete: 'Could not delete Exam / Upgrade.',
  },
};

const ExamUpgradesAdminPage: FC = () => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  // After an admin create/update/delete, the backend evicts its LOV cache (ExamUpgradeService), but
  // the frontend caches have no TTL and survive SPA navigation — so purge every browser-side copy
  // of the shared training-type LOV (React Query key + Map/sessionStorage) or the dropdowns keep
  // serving the pre-mutation list for the rest of the session. See `purgeLovCache`.
  const onMutationSuccess = useCallback(
    () => purgeLovCache(queryClient, SCALER_TRAINING_TYPE_LOV),
    [queryClient],
  );

  const crud = useMaintenanceCrud({ ...crudConfig, onMutationSuccess });

  const [classCodeTypes, setClassCodeTypes] = useState<StaticLov[]>([]);
  const [filterValue, setFilterValue] = useState('ALL');

  useEffect(() => {
    const loadLov = async () => {
      try {
        const token = await userToken();
        const types = await API.lov.getStaticLov({ tableKey: 'SCALER_TRAINING_CLASS_CODE' }, token);
        setClassCodeTypes(types ?? []);
      } catch {
        setClassCodeTypes([]);
      }
    };
    void loadLov();
  }, [userToken]);

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    void crud.reload(value !== 'ALL' ? { scalerTrainingClassCode: value } : {});
  };

  const rows = crud.items.map((item, index) => ({
    ...item,
    id: `${item.scalerTrainingClassCode ?? ''}-${item.scalerTrainingTypeId ?? index}`,
  }));
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(rows);
  const content = toPageableResponse(sortedRows);

  const headers: TableHeaderType<ExamUpgrade>[] = [
    {
      key: 'scalerTrainingTypeId',
      header: 'Exam / Upgrade #',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => (
        <button type="button" className="scs__link" onClick={() => row && crud.openView(row)}>
          {row?.scalerTrainingTypeId ?? ''}
        </button>
      ),
    },
    { key: 'scalerTrainingClassCode', header: 'Type', selected: true, sortable: true },
    { key: 'description', header: 'Description', selected: true, sortable: true },
  ];

  const filter = (
    <MaintenanceFilterSelect
      id="exam-upgrade-filter"
      value={filterValue}
      onChange={handleFilterChange}
      options={classCodeTypes.map((item) => ({ value: item.code ?? '', text: item.description ?? '' }))}
    />
  );

  return (
    <MaintenanceListPage
      title="Maintain Exams / Upgrades"
      breadCrumbs={[
        { name: 'Administration' },
        { name: 'Maintenance' },
        { name: 'Exam / Upgrades', path: '/maintenance/exam-upgrades' },
      ]}
      error={crud.error}
      errorTitle="Unable to load Exam / Upgrades"
      headers={headers}
      content={content}
      loading={crud.loading}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      addLabel="Add Exam / Upgrade"
      onAdd={crud.openCreate}
      addPermission={PERMISSIONS.MAINTAIN_EXAM_UPGRADES_CREATE}
      filter={filter}
      resetPageKey={filterValue}
    >
      <MaintenanceFormModal
        modalMode={crud.modalMode}
        onClose={crud.closeModal}
        className="scs__modal--lg"
        headings={{
          create: 'Maintain Exams / Upgrades - Create',
          edit: 'Maintain Exams / Upgrades - Edit',
          view: 'Exam / Upgrade Detail',
        }}
        formMessage={crud.formMessage}
        detailLoading={crud.detailLoading}
        audit={crud.selected}
        onEdit={crud.openEdit}
        onDelete={crud.requestDelete}
        editPermission={PERMISSIONS.MAINTAIN_EXAM_UPGRADES_UPDATE}
        deletePermission={PERMISSIONS.MAINTAIN_EXAM_UPGRADES_DELETE}
        editLabel="Edit Record"
        onSave={crud.onSave}
        onReset={crud.resetForm}
        onBack={crud.cancelEdit}
        isSubmitting={crud.isSubmitting}
        renderViewFields={() => (
          <ExamUpgradesViewFields selected={crud.selected} classCodeTypes={classCodeTypes} />
        )}
        renderFormFields={() => (
          <ExamUpgradesFormFields
            selected={crud.selected}
            classCodeTypes={classCodeTypes}
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

export default ExamUpgradesAdminPage;
