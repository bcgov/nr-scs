import { type FC, useEffect, useState } from 'react';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import MaintenanceFormModal from '@/components/Maintenance/MaintenanceFormModal';
import MaintenanceListPage from '@/components/Maintenance/MaintenanceListPage';
import { PERMISSIONS } from '@/context/auth/permissions';
import ConfirmDeleteModal from '@/components/Modal/ConfirmDeleteModal';
import { useAuth } from '@/context/auth/useAuth';
import { useSortableTable } from '@/hooks/useSortableTable';
import {
  type FormErrors,
  type MaintenanceCrudConfig,
  useMaintenanceCrud,
} from '@/hooks/useMaintenanceCrud';
import API from '@/services/APIs';
import type {
  ScaleMethodAuthClauseCreateRequest,
  ScaleMethodAuthClauseDetail,
  ScaleMethodAuthClauseUpdateRequest,
} from '@/services/authorizationClauses.service';
import type { ScaleMethodTypeLov } from '@/services/lov.service';
import { toPageableResponse } from '@/utils/toPageableResponse';

import MaintenanceFilterSelect from '@/components/Form/MaintenanceFilterSelect';
import { compareDateOnly, dateOnlyFieldError } from '@/utils/dateOnly';
import {
  type AuthorizationClauseFormState,
  AuthorizationClausesFormFields,
  AuthorizationClausesViewFields,
} from './AuthorizationClausesModal';

const emptyAuthorizationClauseForm: AuthorizationClauseFormState = {
  scaleMethodTypeCode: '',
  scalerAuthorizationClause: '',
  effectiveDate: '',
  expiryDate: '',
};

const validate = (form: AuthorizationClauseFormState): FormErrors => {
  const errors: FormErrors = {};
  if (!form.scaleMethodTypeCode.trim()) {
    errors.scaleMethodTypeCode = 'Scale method is required.';
  }
  const clause = form.scalerAuthorizationClause.trim();
  if (!clause) {
    errors.scalerAuthorizationClause = 'Clause is required.';
  }
  // The SCALER_AUTHORIZATION_CLAUSE column is VARCHAR2(200); block over-length input with a clean
  // field-level message instead of letting it reach the DB and surface as a raw error.
  else if (clause.length > 200) {
    errors.scalerAuthorizationClause = 'Clause can not be greater than 200 characters.';
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

const buildPayload = (
  form: AuthorizationClauseFormState,
): ScaleMethodAuthClauseCreateRequest & ScaleMethodAuthClauseUpdateRequest => {
  const trimmedExpiry = form.expiryDate.trim();
  return {
    scaleMethodTypeCode: form.scaleMethodTypeCode.trim(),
    scalerAuthorizationClause: form.scalerAuthorizationClause.trim(),
    effectiveDate: form.effectiveDate,
    expiryDate: trimmedExpiry.length > 0 ? trimmedExpiry : null,
  };
};

const crudConfig: MaintenanceCrudConfig<
  ScaleMethodAuthClauseDetail,
  ScaleMethodAuthClauseDetail,
  AuthorizationClauseFormState,
  ScaleMethodAuthClauseCreateRequest,
  ScaleMethodAuthClauseUpdateRequest
> = {
  search: (params, token) => API.authorizationClauses.searchAuthorizationClauses(params, token),
  getDetail: (entity, token) =>
    API.authorizationClauses.getAuthorizationClause(
      entity.scaleMethodTypeCode ?? '',
      entity.scaleMethodAuthClauseId as number,
      token,
    ),
  create: (payload, token) => API.authorizationClauses.createAuthorizationClause(payload, token),
  update: (selected, payload, token) =>
    API.authorizationClauses.updateAuthorizationClause(
      selected.scaleMethodTypeCode ?? '',
      selected.scaleMethodAuthClauseId as number,
      payload,
      token,
    ),
  remove: (selected, token) =>
    API.authorizationClauses.deleteAuthorizationClause(
      selected.scaleMethodTypeCode ?? '',
      selected.scaleMethodAuthClauseId as number,
      token,
    ),
  emptyForm: emptyAuthorizationClauseForm,
  applyToForm: (entity) => ({
    scaleMethodTypeCode: entity.scaleMethodTypeCode ?? '',
    scalerAuthorizationClause: entity.scalerAuthorizationClause ?? '',
    effectiveDate: entity.effectiveDate ?? '',
    expiryDate: entity.expiryDate ?? '',
  }),
  buildCreatePayload: buildPayload,
  buildUpdatePayload: (form) => buildPayload(form),
  validate,
  messages: {
    load: 'Could not load authorization clauses.',
    detail: 'Could not load authorization clause details.',
    save: 'Could not save authorization clause.',
    delete: 'Could not delete authorization clause.',
  },
};

const AuthorizationClausesAdminPage: FC = () => {
  const { userToken } = useAuth();
  const crud = useMaintenanceCrud(crudConfig);

  const [methodTypes, setMethodTypes] = useState<ScaleMethodTypeLov[]>([]);
  const [filterValue, setFilterValue] = useState('ALL');

  useEffect(() => {
    const loadLov = async () => {
      try {
        const token = await userToken();
        const types = await API.lov.getScaleMethodTypeLov(undefined, token);
        setMethodTypes(types ?? []);
      } catch {
        setMethodTypes([]);
      }
    };
    void loadLov();
  }, [userToken]);

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    // Empty params (not undefined) so post-mutation reloads keep the active filter.
    void crud.reload(value !== 'ALL' ? { scaleMethodTypeCode: value } : {});
  };

  const methodTypeLabel = (code?: string | null) =>
    methodTypes.find((m) => m.code === code)?.description ?? code ?? '';

  const headers: TableHeaderType<ScaleMethodAuthClauseDetail>[] = [
    {
      key: 'scaleMethodAuthClauseId',
      header: 'Clause #',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => (
        <button type="button" className="scs__link" onClick={() => row && crud.openView(row)}>
          {row?.scaleMethodAuthClauseId ?? ''}
        </button>
      ),
    },
    {
      key: 'scaleMethodTypeCode',
      header: 'Scale Method',
      selected: true,
      sortable: true,
      renderAs: (value) => methodTypeLabel(value as string),
    },
    { key: 'scalerAuthorizationClause', header: 'Clause', selected: true, sortable: true },
  ];

  const rows = crud.items.map((item, index) => ({
    ...item,
    id: `${item.scaleMethodTypeCode ?? ''}-${item.scaleMethodAuthClauseId ?? index}`,
  }));
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(rows);
  const content = toPageableResponse(sortedRows);

  const filter = (
    <MaintenanceFilterSelect
      id="auth-clause-filter"
      value={filterValue}
      onChange={handleFilterChange}
      options={methodTypes.map((item) => ({ value: item.code ?? '', text: item.description ?? '' }))}
    />
  );

  return (
    <MaintenanceListPage
      title="Maintain Authorization Clauses"
      breadCrumbs={[
        { name: 'Administration' },
        { name: 'Maintenance' },
        { name: 'Authorization Clauses', path: '/maintenance/authorization-clauses' },
      ]}
      error={crud.error}
      errorTitle="Unable to load Authorization Clauses"
      headers={headers}
      content={content}
      loading={crud.loading}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      addLabel="Add Authorization Clause"
      onAdd={crud.openCreate}
      addPermission={PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_CREATE}
      filter={filter}
      resetPageKey={filterValue}
    >
      <MaintenanceFormModal
        modalMode={crud.modalMode}
        onClose={crud.closeModal}
        className="authz-clauses__modal"
        headings={{
          create: 'Maintain Authorization Clauses - Create',
          edit: 'Maintain Authorization Clauses - Edit',
          view: 'Authorization Clause Detail',
        }}
        formMessage={crud.formMessage}
        detailLoading={crud.detailLoading}
        audit={crud.selected}
        onEdit={crud.openEdit}
        onDelete={crud.requestDelete}
        editPermission={PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE}
        deletePermission={PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_DELETE}
        editLabel="Edit Clause"
        onSave={crud.onSave}
        onReset={crud.resetForm}
        onBack={crud.cancelEdit}
        isSubmitting={crud.isSubmitting}
        renderViewFields={() => (
          <AuthorizationClausesViewFields selected={crud.selected} methodTypes={methodTypes} />
        )}
        renderFormFields={() => (
          <AuthorizationClausesFormFields
            selected={crud.selected}
            methodTypes={methodTypes}
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

export default AuthorizationClausesAdminPage;
