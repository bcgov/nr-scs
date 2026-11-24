import { Column, Grid } from '@carbon/react';
import { type FC, useEffect, useMemo, useState } from 'react';

import RegDistSelect from '@/components/core/RegDistSelect';
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
import type { RegionDistrictRollupLov } from '@/services/lov.service';
import type {
  ScaleSignatoryBlock,
  ScaleSignatoryBlockCreateRequest,
  ScaleSignatoryBlockUpdateRequest,
} from '@/services/signatureBlocks.service';
import { toPageableResponse } from '@/utils/toPageableResponse';

import {
  type SignatureBlockFormState,
  SignatureBlocksFormFields,
  SignatureBlocksViewFields,
} from './SignatureBlocksModal';

const emptySignatureBlockForm: SignatureBlockFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  signatureTitle: '',
  orgUnitNo: '',
};

const buildFullName = (block: ScaleSignatoryBlock) => {
  if (block.fullName) {
    return block.fullName;
  }
  const last = String(block.lastName ?? '').trim();
  const first = String(block.firstName ?? '').trim();
  const middle = String(block.middleName ?? '').trim();

  let fullName = '';
  if (last) {
    fullName = last;
  }
  if (first) {
    fullName = fullName ? `${fullName}, ${first}` : first;
  }
  if (middle) {
    fullName = fullName ? `${fullName} ${middle}` : middle;
  }
  return fullName;
};

const SignatureBlocksAdminPage: FC = () => {
  const { userToken } = useAuth();

  const [regionDistricts, setRegionDistricts] = useState<RegionDistrictRollupLov[]>([]);
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    const loadLovs = async () => {
      try {
        const token = await userToken();
        const districts = await API.lov.getRegionDistrictRollupLov(undefined, token);
        setRegionDistricts(districts ?? []);
      } catch {
        setRegionDistricts([]);
      }
    };
    void loadLovs();
  }, [userToken]);

  const resolveOrgUnitNo = (orgUnitCode?: string) => {
    const trimmed = String(orgUnitCode ?? '').trim();
    if (!trimmed) {
      return null;
    }
    return regionDistricts.find((lov) => String(lov.orgUnitCode ?? '') === trimmed)?.code ?? null;
  };

  const resolveOrgUnitCode = (orgUnitNo?: number | null) => {
    if (orgUnitNo == null) {
      return '';
    }
    return regionDistricts.find((lov) => String(lov.code ?? '') === String(orgUnitNo))?.orgUnitCode ?? '';
  };

  const resolveRegDist = (orgUnitNo?: number | null, orgUnitDescription?: string | null) => {
    const trimmedDescription = String(orgUnitDescription ?? '').trim();
    if (trimmedDescription) {
      return trimmedDescription;
    }
    if (orgUnitNo == null) {
      return '';
    }
    return (
      regionDistricts.find((lov) => String(lov.code ?? '') === String(orgUnitNo))?.description ??
      String(orgUnitNo)
    );
  };

  // Config closes over the region/district LOV for org-unit code<->number resolution,
  // so it is rebuilt when the LOV loads. The crud hook loads the list only once on mount,
  // so rebuilding the config does not trigger a refetch.
  const crudConfig = useMemo<
    MaintenanceCrudConfig<
      ScaleSignatoryBlock,
      ScaleSignatoryBlock,
      SignatureBlockFormState,
      ScaleSignatoryBlockCreateRequest,
      ScaleSignatoryBlockUpdateRequest
    >
  >(
    () => {
      const buildPayload = (
        form: SignatureBlockFormState,
      ): ScaleSignatoryBlockCreateRequest & ScaleSignatoryBlockUpdateRequest => ({
        orgUnitNo: resolveOrgUnitNo(form.orgUnitNo) as number,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim().length > 0 ? form.middleName.trim() : null,
        lastName: form.lastName.trim(),
        signatureTitle: form.signatureTitle.trim(),
      });

      const validate = (form: SignatureBlockFormState): FormErrors => {
        const errors: FormErrors = {};
        if (!form.firstName.trim()) {
          errors.firstName = 'First Name is required.';
        }
        if (!form.lastName.trim()) {
          errors.lastName = 'Last Name is required.';
        }
        if (!form.signatureTitle.trim()) {
          errors.signatureTitle = 'Position is required.';
        }
        if (!form.orgUnitNo.trim() || resolveOrgUnitNo(form.orgUnitNo) == null) {
          errors.orgUnitNo = 'Reg / Dist is required.';
        }
        const maxLen = (key: keyof SignatureBlockFormState, value: string, label: string) => {
          if (value.trim().length > 40) {
            errors[key] = `${label} must be 40 characters or fewer.`;
          }
        };
        maxLen('firstName', form.firstName, 'First Name');
        maxLen('middleName', form.middleName, 'Middle Name');
        maxLen('lastName', form.lastName, 'Last Name');
        maxLen('signatureTitle', form.signatureTitle, 'Position');
        return errors;
      };

      return {
        search: (params, token) => API.signatureBlocks.searchSignatureBlocks(params, token),
        getDetail: async (entity, token) => {
          const detail = await API.signatureBlocks.getSignatureBlock(
            entity.scaleSignatoryBlockId as number,
            token,
          );
          return {
            ...detail,
            orgUnitDescription: detail.orgUnitDescription ?? entity.orgUnitDescription ?? null,
          };
        },
        create: (payload, token) => API.signatureBlocks.createSignatureBlock(payload, token),
        update: (selected, payload, token) =>
          API.signatureBlocks.updateSignatureBlock(selected.scaleSignatoryBlockId as number, payload, token),
        remove: (selected, token) =>
          API.signatureBlocks.deleteSignatureBlock(selected.scaleSignatoryBlockId as number, token),
        emptyForm: emptySignatureBlockForm,
        applyToForm: (entity) => ({
          firstName: entity.firstName ?? '',
          middleName: entity.middleName ?? '',
          lastName: entity.lastName ?? '',
          signatureTitle: entity.signatureTitle ?? '',
          orgUnitNo: resolveOrgUnitCode(entity.orgUnitNo ?? null),
        }),
        buildCreatePayload: buildPayload,
        buildUpdatePayload: (form) => buildPayload(form),
        validate,
        messages: {
          load: 'Could not load signature blocks.',
          detail: 'Could not load signature block details.',
          save: 'Could not save signature block.',
          delete: 'Could not delete signature block.',
        },
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regionDistricts],
  );

  const crud = useMaintenanceCrud(crudConfig);

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    const orgUnitNo = resolveOrgUnitNo(value);
    void crud.reload(orgUnitNo != null ? { orgUnitNo: Number(orgUnitNo) } : {});
  };

  const rows = crud.items.map((block) => ({
    ...block,
    id: String(block.scaleSignatoryBlockId ?? ''),
    fullNameLabel: buildFullName(block),
    regDistLabel: String(block.orgUnitDescription ?? '').trim(),
  }));
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(rows);
  const content = toPageableResponse(sortedRows);

  const headers: TableHeaderType<(typeof rows)[number]>[] = [
    {
      key: 'scaleSignatoryBlockId',
      header: 'Block #',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => (
        <button type="button" className="scs__link" onClick={() => row && crud.openView(row)}>
          {row?.scaleSignatoryBlockId ?? ''}
        </button>
      ),
    },
    { key: 'fullNameLabel', header: 'Name', selected: true, sortable: true },
    { key: 'signatureTitle', header: 'Position', selected: true, sortable: true },
    { key: 'regDistLabel', header: 'Reg / Dist', selected: true, sortable: true },
  ];

  const filter = (
    <div className="scs__filter-grid">
      <Grid>
        <Column lg={8} md={8} sm={4}>
          <div className="scs__filter-row">
            <RegDistSelect
              id="signature-block-filter"
              labelText="Filter"
              hideLabel={false}
              value={filterValue}
              onChange={(value) => handleFilterChange(value)}
              emptyText=""
            />
          </div>
        </Column>
      </Grid>
    </div>
  );

  return (
    <MaintenanceListPage
      title="Maintain Signatories"
      breadCrumbs={[
        { name: 'Administration' },
        { name: 'Maintenance' },
        { name: 'Signatories', path: '/maintenance/signatories' },
      ]}
      error={crud.error}
      errorTitle="Unable to load signature blocks"
      headers={headers}
      content={content}
      loading={crud.loading}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      addLabel="Add Signatory"
      onAdd={crud.openCreate}
      addPermission={PERMISSIONS.MAINTAIN_SIGNATORIES_CREATE}
      filter={filter}
      resetPageKey={filterValue}
    >
      <MaintenanceFormModal
        modalMode={crud.modalMode}
        onClose={crud.closeModal}
        className="scs__modal--lg"
        headings={{
          create: 'Signature Block - Create',
          edit: 'Signature Block - Edit',
          view: 'Signature Block Details',
        }}
        formMessage={crud.formMessage}
        detailLoading={crud.detailLoading}
        audit={crud.selected}
        onEdit={crud.openEdit}
        onDelete={crud.requestDelete}
        editPermission={PERMISSIONS.MAINTAIN_SIGNATORIES_UPDATE}
        deletePermission={PERMISSIONS.MAINTAIN_SIGNATORIES_DELETE}
        editLabel="Edit Signatory"
        onSave={crud.onSave}
        onReset={crud.resetForm}
        onBack={crud.cancelEdit}
        isSubmitting={crud.isSubmitting}
        renderViewFields={() => (
          <SignatureBlocksViewFields
            selected={crud.selected}
            resolveRegDist={resolveRegDist}
            buildFullName={buildFullName}
          />
        )}
        renderFormFields={() => (
          <SignatureBlocksFormFields
            selected={crud.selected}
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

export default SignatureBlocksAdminPage;
