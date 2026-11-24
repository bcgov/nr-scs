import {
    Column,
    Form,
    Grid,
    Modal,
    Select,
    SelectItem,
    SkeletonText,
    TextInput
} from '@carbon/react';
import React from 'react';
  import Button from '@/components/core/Button';
import WhoDidIt from '@/components/core/WhoDidIt';
import TableResource from '@/components/Form/TableResource';
import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type { ScaleAuthTemplate } from '@/services/scaleAuthTemplates.service';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';
import { requiredLabel } from '@/utils/requiredLabel';
import { useEffect, useMemo, useRef, useState } from 'react';

type FormValues = {
  scaleAuthTemplateName: string;
  scaleConditionClassCode: string;
  orgUnitNo: string;
};

/** Row shape for the nested conditions table. `select` is a render-only column (no data). */
type ConditionRow = {
  id: string;
  select?: never;
  conditionNo: number | string;
  title: string;
  mandatory: string;
  description: string;
};

const toConditionRow = (c: ScaleAuthCondition): ConditionRow => ({
  id: String(c.scaleAuthConditionId ?? ''),
  conditionNo: c.scaleAuthConditionId ?? '',
  title: c.scaleAuthConditionTitle ?? '',
  mandatory: c.ministryStandardInd ?? '',
  description: c.scaleAuthConditionDesc ?? '',
});

type Props = {
  modalMode: 'create' | 'edit' | 'view' | null;
  setModalMode: (m: 'create' | 'edit' | 'view' | null) => void;
  selectedTemplate: ScaleAuthTemplate | null;
  detail?: ScaleAuthTemplate;
  detailQueryLoading: boolean;
  typeCodes: StaticLov[];
  regionDistricts: StaticLov[];
  formValues: FormValues;
  handleFieldChange: (field: keyof FormValues, value: string) => void;
  handleSave: (conditions?: Array<{ scaleConditionClassCode?: string | null; scaleAuthConditionId?: number | null }>) => void;
  savePending: boolean;
  setDeleteModalOpen: (b: boolean) => void;
};

const TemplatesModal: React.FC<Props> = ({
  modalMode,
  setModalMode,
  detail,
  detailQueryLoading,
  typeCodes,
  regionDistricts,
  formValues,
  handleFieldChange,
  handleSave,
  savePending,
  setDeleteModalOpen,
}) => {
  // helper to slice an array into the paged PageableResponse TableResource expects
  const paginate = <T,>(rows: Array<T & { id: string }>, page: number, size: number): PageableResponse<T> => ({
    content: rows.slice(page * size, page * size + size),
    page: {
      size,
      number: page,
      totalElements: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / size)),
    },
  });

  const { userToken } = useAuth();

  // available conditions for selected type (used in create mode)
  const [availableConditions, setAvailableConditions] = useState<ScaleAuthCondition[]>([]);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [selectedConditionIds, setSelectedConditionIds] = useState<Set<number>>(new Set());
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [condSortKey, setCondSortKey] = useState<string | null>(null);
  const [condSortDir, setCondSortDir] = useState<'ASC' | 'DESC' | 'NONE'>('NONE');

  // Pagination for the nested conditions table (shared by the view and
  // create/edit tables, which never render at the same time).
  const [condPage, setCondPage] = useState(0);
  const [condPageSize, setCondPageSize] = useState(10);
  const onCondPageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    setCondPage(page - 1);
    setCondPageSize(pageSize);
  };

  const toggleCondSort = (key: string) => {
    setCondPage(0);
    if (condSortKey !== key) {
      setCondSortKey(key);
      setCondSortDir('ASC');
      return;
    }
    if (condSortDir === 'ASC') {
      setCondSortDir('DESC');
    } else if (condSortDir === 'DESC') {
      setCondSortKey(null);
      setCondSortDir('NONE');
    } else {
      setCondSortDir('ASC');
    }
  };

  // Reset to the first page when the modal switches record/mode or the source list changes.
  useEffect(() => {
    setCondPage(0);
  }, [modalMode, detail?.scaleAuthTemplateId, availableConditions.length]);

  // When type changes in create or edit mode, fetch conditions for that type
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (modalMode !== 'create' && modalMode !== 'edit') {
        return;
      }
      const typeCode = formValues.scaleConditionClassCode ?? '';
      if (!typeCode) {
        setAvailableConditions([]);
        // keep selectedConditionIds if editing? clear to be safe
        setSelectedConditionIds(new Set());
        return;
      }
      setLoadingConditions(true);
      try {
        const token = await userToken();
        // Use scaler-authorizations conditions endpoint
        const conds = await API.scalerAuthorizations.searchActiveScaleAuthConditions({ scaleConditionClassCode: typeCode }, token);
        if (!mounted) {
          return;
        }
        setAvailableConditions(conds ?? []);
        // if entering create mode, clear selections; if edit, keep any existing selected ids
        if (modalMode === 'create') {
          setSelectedConditionIds(new Set());
        }
      } catch {
        if (!mounted) {
          return;
        }
        setAvailableConditions([]);
        if (modalMode === 'create') {
          setSelectedConditionIds(new Set());
        }
      } finally {
        if (mounted) {
          setLoadingConditions(false);
        }
      }
    };
    void load();
    return () => { mounted = false; };
  }, [formValues.scaleConditionClassCode, modalMode, userToken]);

  const toggleSelect = (id?: number) => {
    if (id == null) {
      return;
    }
    setSelectedConditionIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  };

  const selectedConditionsArray = useMemo(() => {
    return Array.from(selectedConditionIds).map((id) => ({ scaleConditionClassCode: formValues.scaleConditionClassCode ?? '', scaleAuthConditionId: id }));
  }, [selectedConditionIds, formValues.scaleConditionClassCode]);

  const resetForm = () => {
    if (modalMode === 'edit' && detail) {
      handleFieldChange('scaleAuthTemplateName', detail.scaleAuthTemplateName ?? '');
      handleFieldChange('scaleConditionClassCode', detail.scaleConditionClassCode ?? '');
      handleFieldChange('orgUnitNo', detail.orgUnitNo != null ? String(detail.orgUnitNo) : '');
      // restore selected conditions to detail
      const ids = new Set<number>();
      (detail.conditions ?? []).forEach((c) => {
        if (c?.scaleAuthConditionId != null) {
          ids.add(Number(c.scaleAuthConditionId));
        }
      });
      setSelectedConditionIds(ids);
    } else {
      handleFieldChange('scaleAuthTemplateName', '');
      handleFieldChange('scaleConditionClassCode', '');
      handleFieldChange('orgUnitNo', '');
      setAvailableConditions([]);
      setSelectedConditionIds(new Set());
    }
  };

  const isFormValid =
    String(formValues.scaleAuthTemplateName ?? '').trim().length > 0 &&
    String(formValues.scaleConditionClassCode ?? '').trim().length > 0 &&
    String(formValues.orgUnitNo ?? '').trim().length > 0;

  // combined saving indicator: either parent mutation is loading or local click just happened
  const isSaving = savePending || localSubmitting;

  // Manage localSubmitting relative to parent savePending so the spinner
  // shows immediately on click and only clears when parent mutation finishes.
  const prevSavePendingRef = useRef<boolean>(savePending);
  useEffect(() => {
    // parent transitioned from loading -> not loading: mutation finished
    if (prevSavePendingRef.current && !savePending) {
      setLocalSubmitting(false);
    } else if (savePending) {
      // parent reports loading: ensure local submitting is true
      setLocalSubmitting(true);
    }
    prevSavePendingRef.current = savePending;
  }, [savePending]);

  // If the modal mode changes (closed and re-opened), ensure localSubmitting
  // is cleared unless a parent save is still in progress. This prevents the
  // modal from staying disabled when reopened after a successful save.
  useEffect(() => {
    if (!savePending) {
      setLocalSubmitting(false);
    }
    // reset prev ref to current parent state when mode changes
    prevSavePendingRef.current = savePending;
  }, [modalMode]);

  // When entering edit mode, populate the parent form values and selected conditions
  useEffect(() => {
    if (modalMode === 'edit') {
      // populate form fields from detail (detail should be prefetched by parent)
      handleFieldChange('scaleAuthTemplateName', detail?.scaleAuthTemplateName ?? '');
      handleFieldChange('scaleConditionClassCode', detail?.scaleConditionClassCode ?? '');
      handleFieldChange('orgUnitNo', detail?.orgUnitNo != null ? String(detail?.orgUnitNo) : '');

      // populate selected conditions from detail.conditions
      const ids = new Set<number>();
      (detail?.conditions ?? []).forEach((c) => {
        if (c?.scaleAuthConditionId != null) {
          ids.add(Number(c.scaleAuthConditionId));
        }
      });
      setSelectedConditionIds(ids);
    } else if (modalMode === 'create') {
      // ensure form is cleared for create
      resetForm();
    }
  }, [modalMode, detail]);

  return (
    <Modal
      open={modalMode !== null}
      modalHeading={modalMode === 'create' ? 'Template - Create' : modalMode === 'edit' ? 'Template - Edit' : 'Template Details'}
      className="templates__modal scs__modal scs__modal--lg scs__modal--no-footer"
      danger={false}
      onRequestClose={() => {
        if (!isSaving) {
          setModalMode(null);
        }
      }}
      onSecondarySubmit={() => {
        if (modalMode === 'view') {
          setModalMode(null);
        }
      }}
      onRequestSubmit={() => {
        if (modalMode === 'view') {
          setModalMode(null);
        }
      }}
    >
      {modalMode === 'view' && (
        <div>
          {detailQueryLoading && <SkeletonText paragraph lineCount={4} />}
          {!detailQueryLoading && (
            <>
              {/* Details shown as disabled/readonly inputs for clarity */}
              {detail ? (
                <Form className="scs__form">
                  <Grid className="scs__form__grid">
                    <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
                      <TextInput
                        id="view-template-id"
                        labelText="Template #"
                        value={String(detail.scaleAuthTemplateId ?? '')}
                        className="scs__disabled-plain-input"
                        readOnly
                        disabled
                      />
                    </Column>
                    <Column lg={8} md={8} sm={4}>
                      <TextInput
                        id="view-template-name"
                        labelText="Template Name"
                        value={detail.scaleAuthTemplateName ?? ''}
                        readOnly
                        disabled
                      />
                    </Column>
                    <Column lg={8} md={8} sm={4}>
                      <TextInput
                        id="view-template-type"
                        labelText="Type"
                        value={typeCodes.find((l) => l.code === detail.scaleConditionClassCode)?.description ?? detail.scaleConditionClassCode ?? ''}
                        readOnly
                        disabled
                      />
                    </Column>
                    <Column lg={8} md={8} sm={4}>
                      <TextInput
                        id="view-template-org"
                        labelText="Reg / Dist"
                        value={regionDistricts.find((l) => String(l.code) === String(detail.orgUnitNo))?.description ?? ''}
                        readOnly
                        disabled
                      />
                    </Column>
                  </Grid>
                  <div className="scs__form__divider" />
                </Form>
              ) : null}

              <h4 className="scs__form__section-title">Template Conditions</h4>
              <div className="templates__conditions-wrap">
                {/* Conditions table. In view/edit show detail.conditions, in create show availableConditions with a Select column */}
                <TableResource
                  headers={([
                    { key: 'select', header: '', selected: false, renderAs: (_v, row) => (
                      modalMode === 'create' ? (
                        <input
                          type="checkbox"
                          aria-label={`Select condition ${row?.conditionNo}`}
                          checked={selectedConditionIds.has(Number(row?.conditionNo))}
                          onChange={() => toggleSelect(Number(row?.conditionNo))}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        />
                      ) : null
                    ) },
                    { key: 'conditionNo', header: 'Condition #', selected: true, sortable: true },
                    { key: 'title', header: 'Title', selected: true, sortable: true },
                    { key: 'mandatory', header: 'Mandatory?', selected: true, renderAs: (v) => {
                      const val = String(v ?? '').toUpperCase();
                      if (val === 'Y') {
                        return 'Yes';
                      }
                      if (val === 'N') {
                        return 'No';
                      }
                      return val;
                    }, sortable: true },
                    { key: 'description', header: 'Description', selected: true, sortable: true },
                  ] satisfies TableHeaderType<ConditionRow>[])}
                  content={paginate(((modalMode === 'create' ? availableConditions : (detail?.conditions ?? [])) ?? [])
                    .map(toConditionRow)
                    .sort((a, b) => {
                      if (!condSortKey || condSortDir === 'NONE') {
                        return 0;
                      }
                      const ka = String((a as Record<string, unknown>)[condSortKey] ?? '').toLowerCase();
                      const kb = String((b as Record<string, unknown>)[condSortKey] ?? '').toLowerCase();
                      if (ka < kb) {
                        return condSortDir === 'ASC' ? -1 : 1;
                      }
                      if (ka > kb) {
                        return condSortDir === 'ASC' ? 1 : -1;
                      }
                      return 0;
                    }), condPage, condPageSize)}
                  loading={modalMode === 'create' ? loadingConditions : false}
                  error={false}
                  showEmptyTableWhenNoResults={modalMode === 'view'}
                  onSortChange={toggleCondSort}
                  sortKey={condSortKey}
                  sortDirection={condSortDir}
                  onPageChange={onCondPageChange}
                />
              </div>

              {/*
                Templates supplies its own modal rather than MaintenanceFormModal, so it gates these two
                directly. §J gives the district and regional scaling managers "Maintain Template"
                CRU — authored, never deleted — so Delete is the administrator's alone.
              */}
              <div className="form-actions">
                <PermissionGate permission={PERMISSIONS.MAINTAIN_TEMPLATES_UPDATE}>
                  <Button kind="secondary" type="button" className="action-btn" onClick={() => setModalMode('edit')}>
                    Edit Template
                  </Button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.MAINTAIN_TEMPLATES_DELETE}>
                  <Button
                    kind="danger"
                    className="action-btn"
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    Delete
                  </Button>
                </PermissionGate>
                <WhoDidIt audit={detail} loading={detailQueryLoading} />
              </div>
            </>
          )}
        </div>
      )}

      {(modalMode === 'create' || modalMode === 'edit') && (
        <Form className="scs__form">
          <h4 className="scs__form__section-title">Details</h4>
          <Grid className="scs__form__grid">
            <Column lg={8} md={8} sm={4} className={modalMode === 'edit' ? 'scs__disabled-plain' : undefined}>
              <TextInput
                id="tmpl-id"
                labelText="Template #"
                value={modalMode === 'edit' && detail?.scaleAuthTemplateId ? String(detail.scaleAuthTemplateId) : ''}
                disabled
              />
            </Column>

            <Column lg={8} md={8} sm={4}>
              <TextInput
                id="tmpl-name"
                labelText={requiredLabel('Template Name', 'scs__required')}
                value={formValues.scaleAuthTemplateName}
                onChange={(e) => handleFieldChange('scaleAuthTemplateName', e.target.value)}
                disabled={isSaving}
              />
            </Column>
            <Column lg={8} md={8} sm={4} className={`templates__align-col${modalMode === 'edit' ? ' scs__disabled-plain' : ''}`}>
              {modalMode === 'edit' ? (
                <TextInput
                  id="tmpl-type"
                  labelText={requiredLabel('Type', 'scs__required')}
                  value={typeCodes.find((l) => l.code === formValues.scaleConditionClassCode)?.description ?? formValues.scaleConditionClassCode ?? ''}
                  disabled
                />
              ) : (
                <Select
                  id="tmpl-type"
                  labelText={requiredLabel('Type', 'scs__required')}
                  value={formValues.scaleConditionClassCode}
                  onChange={(e) => handleFieldChange('scaleConditionClassCode', e.target.value)}
                  disabled={isSaving}
                >
                  <SelectItem value="" text="" />
                  {typeCodes.map((lov) => (
                    <SelectItem key={lov.code ?? ''} value={lov.code ?? ''} text={lov.description ?? lov.code ?? ''} />
                  ))}
                </Select>
              )}
            </Column>
            <Column lg={8} md={8} sm={4} className="templates__align-col">
              <Select
                id="tmpl-reg-dist"
                labelText={requiredLabel('Reg / Dist', 'scs__required')}
                value={formValues.orgUnitNo}
                onChange={(e) => handleFieldChange('orgUnitNo', e.target.value)}
                disabled={isSaving}
              >
                <SelectItem value="" text="" />
                {regionDistricts.map((lov) => (
                  <SelectItem
                    key={lov.code ?? ''}
                    value={String(lov.code ?? '')}
                    text={lov.description ?? String(lov.code ?? '')}
                  />
                ))}
              </Select>
            </Column>
          </Grid>

          <div className="scs__form__divider" />

          {(modalMode === 'create' || modalMode === 'edit') && (
            <>
              {formValues.scaleConditionClassCode ? (
                <>
                  <h4 className="scs__form__section-title">Conditions</h4>
                  <div className="templates__conditions-wrap">
                    <TableResource
                      headers={([
                        { key: 'select', header: 'Select', selected: true, renderAs: (_v, row) => (
                          <input
                            type="checkbox"
                            aria-label={`Select condition ${row?.conditionNo}`}
                            checked={selectedConditionIds.has(Number(row?.conditionNo))}
                            onChange={isSaving ? undefined : () => toggleSelect(Number(row?.conditionNo))}
                            onClick={isSaving ? undefined : (e) => e.stopPropagation()}
                            onPointerDown={isSaving ? undefined : (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            disabled={isSaving}
                          />
                        ) },
                        { key: 'conditionNo', header: 'Condition #', selected: true },
                        { key: 'title', header: 'Title', selected: true },
                        { key: 'mandatory', header: 'Mandatory?', selected: true, renderAs: (v) => {
                          const val = String(v ?? '').toUpperCase();
                          if (val === 'Y') {
                            return 'Yes';
                          }
                          if (val === 'N') {
                            return 'No';
                          }
                          return val;
                        } },
                        { key: 'description', header: 'Description', selected: true },
                      ] satisfies TableHeaderType<ConditionRow>[]) }
                      content={paginate((availableConditions ?? []).map(toConditionRow), condPage, condPageSize)}
                      loading={loadingConditions}
                      error={false}
                      rowOnClick={isSaving ? undefined : (row) => toggleSelect(Number(row.conditionNo))}
                      onPageChange={onCondPageChange}
                    />
                  </div>
                </>
              ) : null}
            </>
          )}

          <div className="form-actions">
                <Button kind="secondary" type="button" className="action-btn" onClick={() => setModalMode(null)} disabled={isSaving}>
              Back
            </Button>
            <Button kind="secondary" type="button" className="action-btn" onClick={resetForm} disabled={isSaving}>
              Reset
            </Button>
            <Button
              kind="primary"
              type="button"
              className="action-btn"
                  onClick={() => {
                    setLocalSubmitting(true);
                    handleSave(selectedConditionsArray);
                  }}
              disabled={isSaving || !isFormValid}
              onWheel={isSaving ? (e: React.WheelEvent<HTMLButtonElement>) => {
                e.preventDefault();
                e.stopPropagation();
              } : undefined}
            >
              {isSaving ? 'Saving…' : 'Save Record'}
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
};

export default TemplatesModal;
