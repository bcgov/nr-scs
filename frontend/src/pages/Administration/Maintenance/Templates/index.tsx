import { InlineNotification } from '@carbon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import MaintenanceListPage from '@/components/Maintenance/MaintenanceListPage';
import { PERMISSIONS } from '@/context/auth/permissions';
import ConfirmDeleteModal from '@/components/Modal/ConfirmDeleteModal';
import { useAuth } from '@/context/auth/useAuth';
import { useSortableTable } from '@/hooks/useSortableTable';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type { ScaleAuthTemplate, ScaleAuthTemplateSaveRequest } from '@/services/scaleAuthTemplates.service';
import { toPageableResponse } from '@/utils/toPageableResponse';

import TemplatesModal from './TemplatesModal';

import './index.scss';

import MaintenanceFilterSelect from '@/components/Form/MaintenanceFilterSelect';
type FormValues = {
  scaleAuthTemplateName: string;
  scaleConditionClassCode: string;
  orgUnitNo: string;
};

const emptyForm = (): FormValues => ({
  scaleAuthTemplateName: '',
  scaleConditionClassCode: '',
  orgUnitNo: '',
});

/**
 * Templates keeps its React Query data flow and its bespoke modal (nested
 * condition tables with checkbox selection), so it is NOT driven by
 * useMaintenanceCrud. It does adopt the shared MaintenanceListPage shell for the
 * list layout, sorting and filter slot.
 */
const TemplatesAdminPage: React.FC = () => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const [filterCode, setFilterCode] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ScaleAuthTemplate | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const typeCodesQuery = useQuery<StaticLov[], Error>({
    queryKey: ['static-lov', 'SCALE_CONDITION_CLASS_CODE'],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getStaticLov({ tableKey: 'SCALE_CONDITION_CLASS_CODE' }, token);
    },
    staleTime: 5 * 60 * 1000,
  });

  const regionDistrictQuery = useQuery<StaticLov[], Error>({
    queryKey: ['region-district-lov'],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getRegionDistrictLov(undefined, token);
    },
    staleTime: 5 * 60 * 1000,
  });

  const templatesQuery = useQuery<ScaleAuthTemplate[], Error>({
    queryKey: ['scale-auth-templates', filterCode],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleAuthTemplates.searchTemplates(
        filterCode ? { scaleConditionClassCode: filterCode } : undefined,
        token,
      );
    },
    refetchOnMount: true,
    staleTime: 0,
  });

  const detailQuery = useQuery<ScaleAuthTemplate, Error>({
    queryKey: ['scale-auth-template', selectedTemplate?.scaleAuthTemplateId],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleAuthTemplates.getTemplate(selectedTemplate!.scaleAuthTemplateId!, token);
    },
    enabled: selectedTemplate?.scaleAuthTemplateId != null && modalMode === 'view',
    staleTime: 0,
  });

  const saveStartRef = React.useRef<number | null>(null);

  const saveMutation = useMutation<ScaleAuthTemplate, Error, ScaleAuthTemplateSaveRequest>({
    mutationFn: async (request) => {
      const token = await userToken();
      if (modalMode === 'create') {
        return API.scaleAuthTemplates.createTemplate(request, token);
      }
      return API.scaleAuthTemplates.updateTemplate(selectedTemplate!.scaleAuthTemplateId!, request, token);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['scale-auth-templates'] });
      // Drop the cached detail rather than seeding it with the save response,
      // which may omit `conditions` — the view refetches the full record (with a
      // skeleton) instead of briefly showing an incomplete conditions list.
      queryClient.removeQueries({ queryKey: ['scale-auth-template', saved.scaleAuthTemplateId] });
      setSelectedTemplate(saved);
      setBannerError(null);
      const elapsed = Date.now() - (saveStartRef.current ?? 0);
      const delay = Math.max(0, 400 - elapsed);
      setTimeout(() => setModalMode('view'), delay);
    },
    onError: (e) => setBannerError(e.message ?? 'Save failed.'),
  });

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const token = await userToken();
      return API.scaleAuthTemplates.deleteTemplate(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scale-auth-templates'] });
      setSelectedTemplate(null);
      setModalMode(null);
      setDeleteModalOpen(false);
      setBannerError(null);
    },
    onError: (e) => {
      setDeleteModalOpen(false);
      setBannerError(e.message ?? 'Delete failed.');
    },
  });

  const typeCodes = typeCodesQuery.data ?? [];
  const templates = templatesQuery.data ?? [];
  const detail = detailQuery.data ?? null;
  const regionDistricts = regionDistrictQuery.data ?? [];

  const typeDescription = (code: string) => typeCodes.find((l) => l.code === code)?.description ?? code;
  const districtDescription = (v: number | null) =>
    regionDistricts.find((l) => String(l.code) === String(v ?? ''))?.description ?? '';

  const rows = templates.map((t) => ({ ...t, id: t.scaleAuthTemplateId ?? '' }));
  // Default to alphabetical by Template Name to match legacy.
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(rows, {
    key: 'scaleAuthTemplateName',
  });
  const content = toPageableResponse(sortedRows);

  // Short, perceptible loading skeleton on (re)fetch for this admin list.
  const [showSkeleton, setShowSkeleton] = React.useState<boolean>(() =>
    Boolean(templatesQuery.isLoading || templatesQuery.isFetching || templatesQuery.data == null),
  );
  const fetchStartRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const doFetch = async () => {
      fetchStartRef.current = Date.now();
      setShowSkeleton(true);
      try {
        const token = await userToken();
        await API.scaleAuthTemplates.searchTemplates(filterCode ? { scaleConditionClassCode: filterCode } : undefined, token);
      } catch {
        // ignore - templatesQuery will surface errors
      } finally {
        if (mounted) {
          const elapsed = Date.now() - (fetchStartRef.current ?? 0);
          const remaining = Math.max(0, 300 - elapsed);
          setTimeout(() => {
            if (mounted) {
              setShowSkeleton(false);
            }
          }, remaining);
        }
      }
    };
    void doFetch();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCode]);

  const openCreate = () => {
    setFormValues(emptyForm());
    setSelectedTemplate(null);
    setModalMode('create');
  };

  const openView = async (row?: ScaleAuthTemplate & { id: string | number }) => {
    if (!row) {
      return;
    }
    setSelectedTemplate(row);
    try {
      await queryClient.fetchQuery(['scale-auth-template', row.scaleAuthTemplateId], async () => {
        const token = await userToken();
        return API.scaleAuthTemplates.getTemplate(row.scaleAuthTemplateId!, token);
      });
    } catch {
      // ignore prefetch errors; the modal handles errors via detailQuery
    }
    setModalMode('view');
  };

  const handleFieldChange = (field: keyof FormValues, value: string) =>
    setFormValues((prev) => ({ ...prev, [field]: value }));

  const handleSave = (
    conditions?: Array<{ scaleConditionClassCode?: string | null; scaleAuthConditionId?: number | null }>,
  ) => {
    const req = {
      scaleAuthTemplateName: formValues.scaleAuthTemplateName,
      scaleConditionClassCode: formValues.scaleConditionClassCode,
      orgUnitNo: formValues.orgUnitNo ? Number(formValues.orgUnitNo) : undefined,
      conditions: conditions ?? undefined,
    } as unknown as ScaleAuthTemplateSaveRequest;
    saveStartRef.current = Date.now();
    saveMutation.mutate(req);
  };

  const headers: TableHeaderType<(typeof rows)[number]>[] = [
    {
      key: 'scaleAuthTemplateName',
      header: 'Template Name',
      selected: true,
      sortable: true,
      renderAs: (value, row) => (
        <button type="button" className="scs__link" onClick={() => void openView(row)}>
          {String(value ?? '')}
        </button>
      ),
    },
    {
      key: 'scaleConditionClassCode',
      header: 'Type',
      selected: true,
      sortable: true,
      renderAs: (value) => typeDescription(String(value ?? '')),
    },
    {
      key: 'orgUnitNo',
      header: 'Reg / Dist',
      selected: true,
      sortable: true,
      renderAs: (value) => districtDescription(value as number | null),
    },
  ];

  const filter = (
    <MaintenanceFilterSelect
      id="filter-type"
      value={filterCode}
      onChange={setFilterCode}
      options={typeCodes.map((lov) => ({ value: lov.code ?? '', text: lov.description ?? lov.code ?? '' }))}
      allValue={''}
    />
  );

  return (
    <MaintenanceListPage
      title="Maintain Templates"
      breadCrumbs={[
        { name: 'Administration' },
        { name: 'Maintenance' },
        { name: 'Templates', path: '/maintenance/templates' },
      ]}
      error={templatesQuery.isError ? templatesQuery.error?.message ?? 'Error loading templates' : null}
      errorTitle="Error loading templates"
      bannerNotification={
        bannerError ? (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={bannerError}
            lowContrast
            onCloseButtonClick={() => setBannerError(null)}
          />
        ) : null
      }
      headers={headers}
      content={content}
      loading={templatesQuery.isLoading || templatesQuery.isFetching || showSkeleton}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      addLabel="Add Template"
      onAdd={openCreate}
      addPermission={PERMISSIONS.MAINTAIN_TEMPLATES_CREATE}
      filter={filter}
      resetPageKey={filterCode}
    >
      <TemplatesModal
        modalMode={modalMode}
        setModalMode={setModalMode}
        selectedTemplate={selectedTemplate}
        detail={detail ?? undefined}
        detailQueryLoading={detailQuery.isLoading}
        typeCodes={typeCodes}
        regionDistricts={regionDistricts}
        formValues={formValues}
        handleFieldChange={handleFieldChange}
        handleSave={handleSave}
        savePending={saveMutation.isPending}
        setDeleteModalOpen={setDeleteModalOpen}
      />
      <ConfirmDeleteModal
        open={deleteModalOpen}
        isSubmitting={deleteMutation.isPending}
        condition={null}
        onConfirm={() => deleteMutation.mutate(selectedTemplate!.scaleAuthTemplateId!)}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </MaintenanceListPage>
  );
};

export default TemplatesAdminPage;
