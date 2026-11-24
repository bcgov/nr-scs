import { Column, Grid, InlineNotification, Select, SelectItem, TextInput } from '@carbon/react';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@/components/core/Button';
import PermissionLink from '@/components/core/PermissionLink';
import TableRemoveButton from '@/components/Form/TableRemoveButton';
import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import ConditionSearchModal from '@/components/Modal/ConditionSearchModal';
import { PERMISSIONS } from '@/context/auth/permissions';
import { useAuth } from '@/context/auth/useAuth';
import { useSortableTable } from '@/hooks/useSortableTable';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type { ScaleAuthCondition, ScaleAuthConditionSearchParams } from '@/services/scalerAuthorizations.service';

import './index.scss';

/** The fields read off a failed request to build the inline error message. */
type ApiErrorLike = {
  response?: { data?: { message?: string; error?: string } };
  message?: string;
};

type Props = {
  conditionClassCode: string;
  templateFilterField: string;
  conditions: ScaleAuthCondition[];
  setConditions: React.Dispatch<React.SetStateAction<ScaleAuthCondition[]>>;
  /**
   * Inline message when the condition being added is already in the list. Legacy keys this wording per
   * host screen, so it cannot be a single constant here: the authorization screens use
   * `scaleSiteAuthorization.duplicateCondition` ("The condition {0} has already been added.") while Mark
   * Site Designation has its own `errors.dup_condition` ("Condition already exists for Mark Site
   * Designation."), which carries no id substitution at all. Defaults to the authorization wording,
   * which is the majority of this component's hosts.
   */
  duplicateConditionMessage?: (conditionId: number) => string;
  disabled?: boolean;
  readOnly?: boolean;
  showControls?: boolean;
  loadDefaults?: boolean;
  conditionLinkPath?: string;
  searchConditions: (params?: ScaleAuthConditionSearchParams, token?: string) => Promise<ScaleAuthCondition[]>;
  getTemplateConditions: (templateId: number, token?: string) => Promise<ScaleAuthCondition[]>;
};

const AuthorizationConditionsSection: FC<Props> = ({
  conditionClassCode,
  templateFilterField,
  conditions,
  setConditions,
  duplicateConditionMessage = (conditionId: number) => `The condition ${conditionId} has already been added.`,
  disabled = false,
  readOnly = false,
  showControls = true,
  loadDefaults = true,
  conditionLinkPath,
  searchConditions,
  getTemplateConditions,
}) => {
  const { userToken } = useAuth();

  const [conditionsError, setConditionsError] = useState<string | null>(null);
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const conditionsLoadingStart = useRef<number | null>(null);
  const conditionsLoadingTimer = useRef<number | null>(null);
  const [conditionIdInput, setConditionIdInput] = useState('');
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [conditionSearchResults, setConditionSearchResults] = useState<ScaleAuthCondition[] | null>(null);
  const [conditionSearchLoading, setConditionSearchLoading] = useState(false);
  const [templates, setTemplates] = useState<StaticLov[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Add-by-id awaits a lookup before it touches the list. The ref is the synchronous guard (a second
  // click lands before React re-renders, so state alone cannot stop it); the state disables the button.
  const addInFlight = useRef(false);
  const [addingCondition, setAddingCondition] = useState(false);
  // The list as of the latest render, for the duplicate check after that await — the `conditions` in the
  // handler's closure is the list as it was when the click happened.
  const conditionsRef = useRef(conditions);
  useEffect(() => {
    conditionsRef.current = conditions;
  }, [conditions]);

  useEffect(() => {
    if (hasLoaded) {
      return;
    }

    if (!loadDefaults) {
      setHasLoaded(true);
      return;
    }

    let isMounted = true;

    const loadDefaultsAsync = async () => {
      try {
        if (!conditionsLoadingStart.current) {
          setConditionsLoading(true);
          conditionsLoadingStart.current = Date.now();
        }
        const token = await userToken();
        const [mandatoryConditions, templatesLov] = await Promise.all([
          searchConditions({ scaleConditionClassCode: conditionClassCode, ministryStandardInd: 'Y' }, token),
          API.lov.getTemplates(templateFilterField, token),
        ]);

        if (!isMounted) {
          return;
        }
        // Seed only an empty list. The edit screens load the record's conditions in parallel with
        // this lookup, and replacing them here dropped every saved non-mandatory condition whenever
        // the lookup resolved second.
        setConditions((previous) =>
          previous && previous.length > 0 ? previous : (mandatoryConditions ?? []),
        );
        setTemplates(templatesLov ?? []);
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }
        const apiError = error as ApiErrorLike | null | undefined;
        const backendMessage =
          apiError?.response?.data?.message ??
          apiError?.response?.data?.error ??
          apiError?.message;
        setConditionsError(backendMessage || 'Could not load mandatory conditions.');
      } finally {
        if (isMounted) {
          setHasLoaded(true);
        }
        const MIN_LOADING_MS = 350;
        const start = conditionsLoadingStart.current ?? 0;
        const elapsed = start ? Date.now() - start : MIN_LOADING_MS;
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
        if (conditionsLoadingTimer.current) {
          clearTimeout(conditionsLoadingTimer.current);
          conditionsLoadingTimer.current = null;
        }
        if (remaining > 0) {
          conditionsLoadingTimer.current = window.setTimeout(() => {
            setConditionsLoading(false);
            conditionsLoadingStart.current = null;
          }, remaining);
        } else {
          setConditionsLoading(false);
          conditionsLoadingStart.current = null;
        }
      }
    };

    loadDefaultsAsync();

    return () => {
      isMounted = false;
    };
  }, [
    conditionClassCode,
    hasLoaded,
    loadDefaults,
    searchConditions,
    setConditions,
    templateFilterField,
    userToken,
  ]);

  const onAddConditionById = async () => {
    const raw = conditionIdInput.trim();
    if (!raw || addInFlight.current) {
      return;
    }
    const conditionId = Number(raw);
    if (!Number.isFinite(conditionId)) {
      setConditionsError('Condition # must be a valid number.');
      return;
    }

    addInFlight.current = true;
    setAddingCondition(true);
    try {
      setConditionsError(null);
      setConditionsLoading(true);
      conditionsLoadingStart.current = Date.now();
      const token = await userToken();
      const matches = await searchConditions(
        { scaleConditionClassCode: conditionClassCode, scaleAuthConditionId: conditionId },
        token,
      );
      const found = matches?.[0];
      if (!found?.scaleAuthConditionId) {
        setConditionsError(`Condition ${conditionId} was not found.`);
        return;
      }
      // A duplicate is a REJECTION, not a silent de-dup. Legacy blocked the add and showed an inline
      // message (ERR-015); swallowing it meant the input cleared as though the add had worked, which is
      // the failure QA reported. Tested outside the setConditions updater, because an updater must stay
      // pure — it cannot raise the error itself — and against the latest list, not the closure's.
      if (conditionsRef.current.some((item) => item.scaleAuthConditionId === found.scaleAuthConditionId)) {
        setConditionsError(duplicateConditionMessage(found.scaleAuthConditionId));
        return;
      }
      // The updater de-dups too: it is the only place that sees updates still queued behind this render.
      setConditions((prev) =>
        prev.some((item) => item.scaleAuthConditionId === found.scaleAuthConditionId) ? prev : [...prev, found],
      );
      // Only cleared on a successful add, so a rejected value stays visible to be corrected — same as
      // the not-found branch above.
      setConditionIdInput('');
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike | null | undefined;
      const backendMessage =
        apiError?.response?.data?.message ??
        apiError?.response?.data?.error ??
        apiError?.message;
      setConditionsError(backendMessage || 'Could not add condition.');
    } finally {
      addInFlight.current = false;
      setAddingCondition(false);
      const MIN_LOADING_MS = 350;
      const start = conditionsLoadingStart.current ?? 0;
      const elapsed = start ? Date.now() - start : MIN_LOADING_MS;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
      if (conditionsLoadingTimer.current) {
        clearTimeout(conditionsLoadingTimer.current);
        conditionsLoadingTimer.current = null;
      }
      if (remaining > 0) {
        conditionsLoadingTimer.current = window.setTimeout(() => {
          setConditionsLoading(false);
          conditionsLoadingStart.current = null;
        }, remaining);
      } else {
        setConditionsLoading(false);
        conditionsLoadingStart.current = null;
      }
    }
  };

  const openConditionSearch = async () => {
    setConditionModalOpen(true);
    try {
      setConditionSearchLoading(true);
      const token = await userToken();
      const results = await searchConditions({ scaleConditionClassCode: conditionClassCode }, token);
      setConditionSearchResults(results ?? []);
    } catch {
      setConditionSearchResults([]);
    } finally {
      setConditionSearchLoading(false);
    }
  };

  const handleConditionSelect = (cond: ScaleAuthCondition) => {
    if (!cond?.scaleAuthConditionId) {
      return;
    }
    // Same rejection rule as the numeric add-by-id above: picking an already-added condition out of the
    // search modal used to no-op silently. The modal still closes either way, so the inline message is
    // visible on the section behind it rather than trapped under an open overlay.
    if (conditions.some((item) => item.scaleAuthConditionId === cond.scaleAuthConditionId)) {
      setConditionsError(duplicateConditionMessage(cond.scaleAuthConditionId));
      setConditionModalOpen(false);
      return;
    }
    setConditions((prev) =>
      prev.some((item) => item.scaleAuthConditionId === cond.scaleAuthConditionId) ? prev : [...prev, cond],
    );
    setConditionModalOpen(false);
  };

  const onRemoveCondition = (scaleAuthConditionId?: number | null) => {
    if (!scaleAuthConditionId) {
      return;
    }
    const condition = conditions.find((item) => item.scaleAuthConditionId === scaleAuthConditionId);
    if (condition?.ministryStandardInd === 'Y') {
      setConditionsError(`Condition ${scaleAuthConditionId} is mandatory.`);
      return;
    }
    setConditions((prev) => prev.filter((item) => item.scaleAuthConditionId !== scaleAuthConditionId));
  };

  const onApplyTemplate = async () => {
    if (!selectedTemplate) {
      setConditionsError('Template is required.');
      return;
    }

    const templateId = Number(selectedTemplate);
    if (!Number.isFinite(templateId)) {
      setConditionsError('Template is invalid.');
      return;
    }

    try {
      setApplyingTemplate(true);
      setConditionsError(null);
      const token = await userToken();
      const templateConditions = await getTemplateConditions(templateId, token);
      setConditions((prev) => {
        const existing = new Set(prev.map((item) => item.scaleAuthConditionId));
        const incoming = (templateConditions ?? []).filter((item) => item.scaleAuthConditionId && !existing.has(item.scaleAuthConditionId));
        return [...prev, ...incoming];
      });
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike | null | undefined;
      const backendMessage =
        apiError?.response?.data?.message ??
        apiError?.response?.data?.error ??
        apiError?.message;
      setConditionsError(backendMessage || 'Could not apply template.');
    } finally {
      setApplyingTemplate(false);
    }
  };

  /**
   * Condition # as a link to the conditions maintenance screen, degrading to plain text for a role
   * that cannot open it. This section is rendered read-only on the authorization *view* pages, which
   * roles such as Industry Scaler can reach — they hold no `MAINTAIN_CONDITIONS_*` permission, so the
   * link previously led them to `/unauthorized`.
   *
   * `PermissionLink` keeps the existing no-router fallback (these tables also render outside a router).
   */
  const conditionIdRenderer = useMemo(() => {
    if (!conditionLinkPath) {
      return undefined;
    }
    return (value: unknown) => {
      if (!value) {
        return '';
      }
      return (
        <PermissionLink permission={PERMISSIONS.MAINTAIN_CONDITIONS_QUERY} to={conditionLinkPath}>
          {String(value)}
        </PermissionLink>
      );
    };
  }, [conditionLinkPath]);


  // Display-only rows for the table. Sorting orders THIS derived copy for display only; the parent's
  // `conditions` array (the source of truth for save) is never reordered, so the persisted order is
  // always the add/template order, independent of any column sort applied here.
  const conditionRows = useMemo(
    () =>
      (conditions || []).map((c, index) => ({
        ...c,
        // A row with no condition id still needs a table key. The index is stable across renders of
        // the same list; a random id gave every render a new key, remounting the row and discarding
        // anything the user had in it.
        id: String(c.scaleAuthConditionId ?? `condition-row-${index}`),
      })),
    [conditions],
  );

  const {
    sortedRows: sortedConditionRows,
    sortKey: conditionSortKey,
    sortDirection: conditionSortDirection,
    onSortChange: onConditionSortChange,
  } = useSortableTable(conditionRows);

  const isTableLoading = conditionsLoading || !hasLoaded;

  return (
    <>
      <h4 className="scs__form__section-title">Conditions</h4>

      {conditionsError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Conditions"
          subtitle={conditionsError}
          style={{ marginBottom: '16px' }}
        />
      ) : null}

      <TableResource
        headers={([
          { key: 'scaleAuthConditionId', header: 'Condition #', selected: true, sortable: true, renderAs: conditionIdRenderer },
          { key: 'scaleAuthConditionTitle', header: 'Title', selected: true, sortable: true },
          { key: 'ministryStandardInd', header: 'Mandatory?', selected: true, sortable: true, renderAs: (v: unknown) => (v === 'Y' ? 'Yes' : 'No') },
          { key: 'scaleAuthConditionDesc', header: 'Description', selected: true, sortable: true },
          ...(showControls ? [
            {
              key: 'remove',
              header: '\u00A0',
              selected: true,
              renderAs: (_v: unknown, r: ScaleAuthCondition) => (
                <div style={{ textAlign: 'right' }}>
                  <TableRemoveButton
                    onClick={() => onRemoveCondition(r.scaleAuthConditionId)}
                    disabled={disabled || readOnly || String(r?.ministryStandardInd) === 'Y'}
                    ariaLabel={`Remove condition ${r?.scaleAuthConditionId ?? ''}`}
                  />
                </div>
              ),
            },
          ] : []),
        ]) as TableHeaderType<ScaleAuthCondition>[]}
        content={(
          isTableLoading
            ? {
                content: [
                  { scaleAuthConditionId: null, scaleAuthConditionTitle: '', ministryStandardInd: '', scaleAuthConditionDesc: '', id: 'placeholder-1' },
                  { scaleAuthConditionId: null, scaleAuthConditionTitle: '', ministryStandardInd: '', scaleAuthConditionDesc: '', id: 'placeholder-2' },
                ],
                page: { size: 2, number: 0, totalElements: 2, totalPages: 1 },
              } as PageableResponse<ScaleAuthCondition>
            : {
                // Sorted for DISPLAY only — see `conditionRows`. Persistence reads the parent's
                // `conditions`, which this never reorders.
                content: sortedConditionRows,
                page: { size: Math.max(1, (conditions || []).length), number: 0, totalElements: (conditions || []).length, totalPages: 1 },
              } as PageableResponse<ScaleAuthCondition>
        )}
        loading={isTableLoading}
        error={false}
        sortKey={conditionSortKey}
        sortDirection={conditionSortDirection}
        onSortChange={onConditionSortChange}
      />

      {showControls ? (
        <>
          <Grid className="scs__form__grid authorization-conditions__condition-input-row">
            <Column lg={8} md={8} sm={4}>
              <div className="authorization-conditions__input-row">
                <TextInput
                  id="condition-id"
                  value={conditionIdInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setConditionIdInput(e.target.value);
                    setConditionsError(null);
                  }}
                  labelText="Condition #"
                  maxLength={10}
                  disabled={disabled}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button kind="secondary" className="scs__input-search-button" buttonLabel="Add" onClick={onAddConditionById} disabled={disabled || addingCondition || !conditionIdInput.trim()}>
                    Add
                  </Button>
                  <Button kind="secondary" className="scs__input-search-button" buttonLabel="Search" onClick={openConditionSearch} disabled={disabled}>
                    Search
                  </Button>
                </div>
              </div>
            </Column>
          </Grid>

          <Grid className="scs__form__grid authorization-conditions__template-row">
            <Column lg={8} md={8} sm={4}>
              <div className="authorization-conditions__template-controls">
                <Select
                  id="template-select"
                  value={selectedTemplate}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setSelectedTemplate(e.target.value);
                    setConditionsError(null);
                  }}
                  labelText="Template"
                  disabled={disabled || applyingTemplate}
                >
                  <SelectItem value="" text="" />
                  {(templates ?? []).map((t) => (
                    <SelectItem key={String(t.code)} value={String(t.code ?? '')} text={String(t.description ?? t.code ?? '')} />
                  ))}
                </Select>
                <Button
                  kind="secondary"
                  className="scs__input-search-button"
                  buttonLabel="Apply"
                  disabled={disabled || !selectedTemplate || applyingTemplate}
                  onClick={onApplyTemplate}
                >
                  {applyingTemplate ? 'Applying...' : 'Apply'}
                </Button>
              </div>
            </Column>
          </Grid>

          <ConditionSearchModal
            open={conditionModalOpen}
            onRequestClose={() => setConditionModalOpen(false)}
            loading={conditionSearchLoading}
            results={conditionSearchResults}
            onSelect={handleConditionSelect}
          />
        </>
      ) : null}
    </>
  );
};

export default AuthorizationConditionsSection;
