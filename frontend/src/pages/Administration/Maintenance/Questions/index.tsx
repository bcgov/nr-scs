import { type FC, useEffect, useState } from 'react';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import MaintenanceFormModal from '@/components/Maintenance/MaintenanceFormModal';
import MaintenanceListPage from '@/components/Maintenance/MaintenanceListPage';
import ConfirmDeleteModal from '@/components/Modal/ConfirmDeleteModal';
import { PERMISSIONS } from '@/context/auth/permissions';
import { useAuth } from '@/context/auth/useAuth';
import {
  type MaintenanceCrudConfig,
  useMaintenanceCrud,
} from '@/hooks/useMaintenanceCrud';
import { useSortableTable } from '@/hooks/useSortableTable';
import API from '@/services/APIs';
import type {
  InspectionQuestionDetail,
  InspectionQuestionSaveRequest,
  InspectionQuestionSummary,
} from '@/services/inspectionQuestions.service';
import type { ScaleMethodTypeLov, StaticLov } from '@/services/lov.service';
import { toPageableResponse } from '@/utils/toPageableResponse';

import {
  type QuestionFormState,
  QuestionsFormFields,
  QuestionsViewFields,
} from './QuestionsModal';
import { validate } from './validate';

const emptyQuestionForm: QuestionFormState = {
  questionText: '',
  commentRequiredInd: '',
  sortOrderNo: '',
  effectiveDate: '',
  expiryDate: '',
  inspectionTypeCodes: [],
  scalingMethodTypeCodes: [],
  validResponseCodes: [],
};

const mapToForm = (detail: InspectionQuestionDetail): QuestionFormState => ({
  questionText: detail.questionText ?? '',
  commentRequiredInd: detail.commentRequiredInd ?? '',
  sortOrderNo: detail.sortOrderNo != null ? String(detail.sortOrderNo) : '',
  effectiveDate: detail.effectiveDate ?? '',
  expiryDate: detail.expiryDate ?? '',
  inspectionTypeCodes: detail.inspectionTypeCodes ?? [],
  scalingMethodTypeCodes: detail.scalingMethodTypeCodes ?? [],
  validResponseCodes: detail.validResponseCodes ?? [],
});

const buildPayload = (form: QuestionFormState): InspectionQuestionSaveRequest => ({
  questionText: form.questionText.trim(),
  commentRequiredInd: form.commentRequiredInd,
  sortOrderNo: Number(form.sortOrderNo),
  effectiveDate: form.effectiveDate,
  expiryDate: form.expiryDate,
  inspectionTypeCodes: form.inspectionTypeCodes,
  scalingMethodTypeCodes: form.scalingMethodTypeCodes,
  validResponseCodes: form.validResponseCodes,
});

const crudConfig: MaintenanceCrudConfig<
  InspectionQuestionSummary,
  InspectionQuestionDetail,
  QuestionFormState,
  InspectionQuestionSaveRequest,
  InspectionQuestionSaveRequest
> = {
  search: (_params, token) => API.inspectionQuestions.searchQuestions(undefined, token),
  getDetail: (entity, token) => API.inspectionQuestions.getQuestion(entity.inspectionQuestionId as number, token),
  create: (payload, token) => API.inspectionQuestions.createQuestion(payload, token),
  update: (selected, payload, token) =>
    API.inspectionQuestions.updateQuestion(selected.inspectionQuestionId as number, payload, token),
  remove: (selected, token) => API.inspectionQuestions.deleteQuestion(selected.inspectionQuestionId as number, token),
  emptyForm: emptyQuestionForm,
  applyToForm: mapToForm,
  buildCreatePayload: buildPayload,
  buildUpdatePayload: (form) => buildPayload(form),
  validate,
  // Preserve the original per-field live validation feedback as the user edits.
  revalidateOnChange: true,
  messages: {
    load: 'Could not load questions.',
    detail: 'Could not load question details.',
    save: 'Save failed.',
    delete: 'Delete failed.',
  },
};

const QuestionsAdminPage: FC = () => {
  const { userToken } = useAuth();
  const crud = useMaintenanceCrud(crudConfig);

  // LOVs shared by the list (label) and the modal (multi-selects).
  const [inspectionTypes, setInspectionTypes] = useState<StaticLov[]>([]);
  const [validResponses, setValidResponses] = useState<StaticLov[]>([]);
  const [scalingMethods, setScalingMethods] = useState<ScaleMethodTypeLov[]>([]);

  useEffect(() => {
    const loadLovs = async () => {
      try {
        const token = await userToken();
        const [types, responses, methods] = await Promise.all([
          API.lov.getStaticLov({ tableKey: 'SCALE_SITE_INSPCTN_TYPE_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'INSPECTION_ANSWER_CODE' }, token),
          API.lov.getScaleMethodTypeLov(undefined, token),
        ]);
        setInspectionTypes(types ?? []);
        setValidResponses(responses ?? []);
        setScalingMethods(methods ?? []);
      } catch {
        setInspectionTypes([]);
        setValidResponses([]);
        setScalingMethods([]);
      }
    };
    void loadLovs();
  }, [userToken]);

  const typeDescription = (code: string) => inspectionTypes.find((l) => l.code === code)?.description ?? code;

  const rows = crud.items.map((q) => ({ ...q, id: q.inspectionQuestionId ?? '' }));
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(rows);
  const content = toPageableResponse(sortedRows);

  const headers: TableHeaderType<(typeof rows)[number]>[] = [
    { key: 'sortOrderNo', header: 'Sort Order', selected: true, sortable: true },
    {
      key: 'inspectionQuestionId',
      header: 'Question Id',
      selected: true,
      sortable: true,
      renderAs: (value, row) => (
        <button type="button" className="scs__link" onClick={() => row && crud.openView(row)}>
          {String(value ?? '')}
        </button>
      ),
    },
    {
      key: 'inspectionTypeCodes',
      header: 'Inspection Type',
      selected: true,
      sortable: true,
      renderAs: (value) => ((value as string[] | null | undefined) ?? []).map(typeDescription).join(', '),
    },
    { key: 'questionText', header: 'Question', selected: true, sortable: true },
  ];

  return (
    <MaintenanceListPage
      title="Maintain Questions"
      breadCrumbs={[
        { name: 'Administration' },
        { name: 'Maintenance' },
        { name: 'Questions', path: '/maintenance/questions' },
      ]}
      error={crud.error}
      errorTitle="Error loading questions"
      headers={headers}
      content={content}
      loading={crud.loading}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      addLabel="Add Question"
      onAdd={crud.openCreate}
      // §J gives the C&E Technician "Maintain Questions" R — the first non-admin column to reach any
      // maintenance screen, so this is the first page whose controls must name their own verbs.
      addPermission={PERMISSIONS.MAINTAIN_QUESTIONS_CREATE}
    >
      <MaintenanceFormModal
        modalMode={crud.modalMode}
        onClose={crud.closeModal}
        className="scs__modal--lg"
        selectorsFloatingMenus={[
          '.cds--list-box__menu',
          '.cds--list-box__menu-item',
          '.cds--list-box__menu-item__option',
        ]}
        headings={{
          create: 'Maintain Questions - Create',
          edit: 'Maintain Questions - Edit',
          view: 'Inspection Question - Details',
        }}
        formMessage={crud.formMessage}
        detailLoading={crud.detailLoading}
        audit={crud.selected}
        onEdit={crud.openEdit}
        onDelete={crud.requestDelete}
        editPermission={PERMISSIONS.MAINTAIN_QUESTIONS_UPDATE}
        deletePermission={PERMISSIONS.MAINTAIN_QUESTIONS_DELETE}
        editLabel="Edit Record"
        onSave={crud.onSave}
        onReset={crud.resetForm}
        onBack={crud.cancelEdit}
        isSubmitting={crud.isSubmitting}
        renderViewFields={() => (
          <QuestionsViewFields
            selected={crud.selected}
            inspectionTypes={inspectionTypes}
            scalingMethods={scalingMethods}
            validResponses={validResponses}
          />
        )}
        renderFormFields={() => (
          <QuestionsFormFields
            selected={crud.selected}
            inspectionTypes={inspectionTypes}
            scalingMethods={scalingMethods}
            validResponses={validResponses}
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

export default QuestionsAdminPage;
