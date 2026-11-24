import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import {
  Column,
  Grid,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type FC, useMemo, useState } from 'react';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import DateInput from '@/components/core/DateInput';
import SortableTableHeader from '@/components/core/SortableTableHeader';
import { useAuth } from '@/context/auth/useAuth';
import { useSortableTable } from '@/hooks/useSortableTable';
import { asText } from '@/pages/View/Scaler/utils';
import API from '@/services/APIs';
import { extractApiError } from '@/utils/extractApiError';
import { requiredLabel } from '@/utils/requiredLabel';

import type { ScalerExamDetail } from '@/services/scalerExams.types';

interface Props {
  isActive: boolean;
  scalerLicenceNo: string;
}

type EditorMode = 'create' | 'edit';

interface ExamFormValues {
  scalerTrainingTypeId: string;
  completionDate: string;
}

const CLASS_CODE_FILTER_ALL = '';

const createEmptyFormValues = (): ExamFormValues => ({
  scalerTrainingTypeId: '',
  completionDate: '',
});

const ExamUpgradesTab: FC<Props> = ({ isActive, scalerLicenceNo }) => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ScalerExamDetail | null>(null);
  const [formValues, setFormValues] = useState<ExamFormValues>(
    createEmptyFormValues(),
  );
  const [editorError, setEditorError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<ScalerExamDetail | null>(null);
  const [classCodeFilter, setClassCodeFilter] = useState<string>(
    CLASS_CODE_FILTER_ALL,
  );

  const examsQuery = useQuery({
    queryKey: ['scaler-exams', scalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      return API.scalerExams.getScalerExams(scalerLicenceNo, token);
    },
    enabled: isActive && Boolean(scalerLicenceNo),
  });

  const trainingTypeLovQuery = useQuery({
    queryKey: ['lov', 'scaler-training-type-lov'],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getScalerTrainingTypeLov(token);
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
  });

  const classCodeLovQuery = useQuery({
    queryKey: ['lov', 'static-lov', 'SCALER_TRAINING_CLASS_CODE'],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getStaticLov(
        { tableKey: 'SCALER_TRAINING_CLASS_CODE' },
        token,
      );
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
  });

  const trainingTypes = useMemo(
    () => (trainingTypeLovQuery.data ?? []).filter((item) => item.code),
    [trainingTypeLovQuery.data],
  );

  const typeDescriptions = useMemo(
    () =>
      new Map(
        trainingTypes.map((item) => [
          String(item.code),
          String(item.description ?? item.code),
        ]),
      ),
    [trainingTypes],
  );

  const classCodeDescriptions = useMemo(
    () =>
      new Map(
        (classCodeLovQuery.data ?? [])
          .filter((item) => item.code)
          .map((item) => [
            String(item.code),
            String(item.description ?? item.code),
          ]),
      ),
    [classCodeLovQuery.data],
  );

  const exams: ScalerExamDetail[] = useMemo(
    () => examsQuery.data ?? [],
    [examsQuery.data],
  );
  const filteredExams = useMemo(
    () =>
      classCodeFilter === CLASS_CODE_FILTER_ALL
        ? exams
        : exams.filter(
            (exam) => (exam.scalerTrainingClassCode ?? '') === classCodeFilter,
          ),
    [exams, classCodeFilter],
  );

  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(filteredExams);

  const isLovLoading =
    trainingTypeLovQuery.isLoading || classCodeLovQuery.isLoading;

  const loading = examsQuery.isLoading && !examsQuery.data;
  const loadError =
    examsQuery.error?.message ||
    trainingTypeLovQuery.error?.message ||
    classCodeLovQuery.error?.message ||
    null;

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      return API.scalerExams.createScalerExam(
        scalerLicenceNo,
        buildPayload(),
        token,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['scaler-exams', scalerLicenceNo],
      });
      closeEditor();
    },
    onError: (error: unknown) => {
      setEditorError(
        extractApiError(error, 'Could not create exam / upgrade.'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingExam?.scalerTrainingTypeId) {
        throw new Error('No exam / upgrade selected for update.');
      }
      const token = await userToken();
      return API.scalerExams.updateScalerExam(
        scalerLicenceNo,
        editingExam.scalerTrainingTypeId,
        buildPayload(),
        token,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['scaler-exams', scalerLicenceNo],
      });
      closeEditor();
    },
    onError: (error: unknown) => {
      setEditorError(
        extractApiError(error, 'Could not update exam / upgrade.'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteCandidate?.scalerTrainingTypeId) {
        throw new Error('No exam / upgrade selected for delete.');
      }
      const token = await userToken();
      await API.scalerExams.deleteScalerExam(
        scalerLicenceNo,
        deleteCandidate.scalerTrainingTypeId,
        token,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['scaler-exams', scalerLicenceNo],
      });
      setDeleteCandidate(null);
      setBannerError(null);
    },
    onError: (error: unknown) => {
      setBannerError(
        extractApiError(error, 'Could not delete exam / upgrade.'),
      );
      setDeleteCandidate(null);
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  function buildPayload() {
    return {
      scalerTrainingTypeId: formValues.scalerTrainingTypeId,
      completionDate:
        formValues.completionDate.trim() === ''
          ? null
          : formValues.completionDate,
    };
  }

  const openCreateEditor = () => {
    setEditorMode('create');
    setEditingExam(null);
    setFormValues(createEmptyFormValues());
    setEditorError(null);
    setEditorOpen(true);
  };

  const openEditEditor = (exam: ScalerExamDetail) => {
    setEditorMode('edit');
    setEditingExam(exam);
    setFormValues({
      scalerTrainingTypeId: exam.scalerTrainingTypeId ?? '',
      completionDate: exam.completionDate ?? '',
    });
    setEditorError(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingExam(null);
    setFormValues(createEmptyFormValues());
    setEditorError(null);
  };

  const resetEditorForm = () => {
    setFormValues(
      editorMode === 'edit' && editingExam
        ? {
            scalerTrainingTypeId: editingExam.scalerTrainingTypeId ?? '',
            completionDate: editingExam.completionDate ?? '',
          }
        : createEmptyFormValues(),
    );
    setEditorError(null);
  };

  const handleSave = () => {
    if (formValues.scalerTrainingTypeId.trim() === '') {
      setEditorError('Exam / Upgrade is required.');
      return;
    }
    setEditorError(null);
    if (editorMode === 'create') {
      createMutation.mutate();
      return;
    }
    updateMutation.mutate();
  };

  const typeLabel = (exam: ScalerExamDetail) => {
    const code = exam.scalerTrainingTypeId ?? '';
    return typeDescriptions.get(code) ?? asText(code);
  };

  const classCodeLabel = (exam: ScalerExamDetail) => {
    const code = exam.scalerTrainingClassCode ?? '';
    return classCodeDescriptions.get(code) ?? asText(code);
  };

  return (
    <div className="scs__tab-view__panel">
      {loadError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Exams / upgrades unavailable."
          subtitle={loadError}
          className="view-scaler__notification"
        />
      ) : null}

      {bannerError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Exams / upgrades action failed."
          subtitle={bannerError}
          className="view-scaler__notification"
        />
      ) : null}

      <div className="scs__view-tab-actions scs__view-tab-actions--top">
        <PermissionGate permission={PERMISSIONS.SCALER_EXAM_CREATE}>
          <Button
            kind="primary"
            size="sm"
            type="button"
            onClick={openCreateEditor}
            disabled={Boolean(loadError) || isLovLoading}
          >
            Add Exam / Upgrade
          </Button>
        </PermissionGate>
      </div>

      {!loading && !loadError ? (
        <Grid className="scs__tab-view__filter">
          <Column lg={8} md={4} sm={4}>
            <Select
              id="exam-class-code-filter"
              labelText="Filter"
              value={classCodeFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setClassCodeFilter(event.target.value)
              }
              disabled={isLovLoading}
            >
              <SelectItem value={CLASS_CODE_FILTER_ALL} text="All" />
              {[...classCodeDescriptions.entries()].map(([code, description]) => (
                <SelectItem key={code} value={code} text={description} />
              ))}
            </Select>
          </Column>
        </Grid>
      ) : null}

      {loading ? <SkeletonText paragraph lineCount={6} /> : null}

      {!loading && filteredExams.length === 0 ? (
        <p>No exams / upgrades found for this scaler.</p>
      ) : null}

      {!loading && filteredExams.length > 0 ? (
        <Table size="sm" useZebraStyles>
          <TableHead>
            <TableRow>
              <SortableTableHeader
                label="Type"
                sortKeyName="scalerTrainingTypeId"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Description"
                sortKeyName="scalerTrainingClassCode"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Completion Date"
                sortKeyName="completionDate"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.map((exam) => (
              <TableRow
                key={String(
                  exam.scalerTrainingTypeId ??
                    `${exam.scalerTrainingClassCode}`,
                )}
              >
                <TableCell>{typeLabel(exam)}</TableCell>
                <TableCell>{classCodeLabel(exam)}</TableCell>
                <TableCell>{asText(exam.completionDate)}</TableCell>
                <TableCell>
                  <div className="scs__table-actions">
                    <PermissionGate permission={PERMISSIONS.SCALER_EXAM_UPDATE}>
                      <Button
                        kind="ghost"
                        size="sm"
                        type="button"
                        noIcon
                        onClick={() => openEditEditor(exam)}
                        disabled={isLovLoading}
                      >
                        Edit
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission={PERMISSIONS.SCALER_EXAM_DELETE}>
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        type="button"
                        noIcon
                        onClick={() => setDeleteCandidate(exam)}
                      >
                        Delete
                      </Button>
                    </PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <Modal
        open={editorOpen}
        onRequestClose={closeEditor}
        modalHeading={
          editorMode === 'create'
            ? 'Exams / Upgrades - Create'
            : 'Exams / Upgrades - Edit'
        }
        passiveModal
        size="lg"
      >
        {editorError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Please fix the exam / upgrade form."
            subtitle={editorError}
            className="view-scaler__notification"
          />
        ) : null}

        <Grid className="view-scaler__modal-grid">
          <Column lg={8} md={4} sm={4}>
            <Select
              id="exam-training-type"
              labelText={requiredLabel('Exam / Upgrade', 'scs__required')}
              value={formValues.scalerTrainingTypeId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setFormValues((previous) => ({
                  ...previous,
                  scalerTrainingTypeId: event.target.value,
                }))
              }
              disabled={editorMode === 'edit' || isLovLoading}
            >
              <SelectItem value="" text="Select" />
              {trainingTypes.map((item) => (
                <SelectItem
                  key={String(item.code)}
                  value={String(item.code)}
                  text={String(item.description ?? item.code)}
                />
              ))}
            </Select>
          </Column>
          <Column lg={8} md={4} sm={4}>
            <DateInput
              id="exam-completion-date"
              labelText="Completed By"
              hideLabel={false}
              value={formValues.completionDate}
              onChange={(value) =>
                setFormValues((previous) => ({
                  ...previous,
                  completionDate: value,
                }))
              }
            />
          </Column>
        </Grid>

        <div className="scs__form__divider scs__form__divider--actions" />

        <div className="form-actions">
          <Button
            kind="secondary"
            type="button"
            className="action-btn"
            onClick={closeEditor}
            disabled={isMutating}
          >
            Back
          </Button>
          <Button
            kind="secondary"
            type="button"
            className="action-btn"
            onClick={resetEditorForm}
            renderIcon={ResetIcon}
            disabled={isMutating}
          >
            Reset
          </Button>
          <Button
            kind="primary"
            type="button"
            className="action-btn"
            onClick={handleSave}
            renderIcon={SaveIcon}
            disabled={isMutating || isLovLoading}
          >
            Save Record
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteCandidate)}
        onRequestClose={() => setDeleteCandidate(null)}
        onSecondarySubmit={() => setDeleteCandidate(null)}
        onRequestSubmit={() => deleteMutation.mutate()}
        modalHeading="Are you sure you want to delete this record?"
        primaryButtonText="Confirm Delete"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={deleteMutation.isPending}
        danger
      />
    </div>
  );
};

export default ExamUpgradesTab;
