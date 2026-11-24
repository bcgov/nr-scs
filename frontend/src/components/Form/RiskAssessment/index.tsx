import { Column, Form, Grid, InlineNotification, TextInput } from '@carbon/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import WhoDidIt from '@/components/core/WhoDidIt';
import PermissionGate from '@/components/PermissionGate';
import type { PERMISSION_TYPE } from '@/context/auth/permissions';
import { useAuth } from '@/context/auth/useAuth';
import type {
  RiskAssessmentDetailBase,
  RiskAssessmentSaveRequest,
  RiskAssessmentSection,
} from '@/services/riskAssessment.types';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

import RiskAssessmentQuestionnaire from './RiskAssessmentQuestionnaire';
import { buildSelections, type Selections } from './riskAssessmentQuestionnaireUtils';

import './index.scss';

/** view = read-only, edit = update an existing assessment, create = add a new one. */
export type RiskAssessmentFormMode = 'view' | 'edit' | 'create';

/** A read-only field shown in the assessment's domain-specific header (e.g. Licence #, Site Name). */
export interface RiskAssessmentHeaderField {
  id: string;
  label: string;
  value: string;
}

/**
 * Everything the shared risk-assessment form needs that differs between the scaler and scale-site
 * features: labels, routes, the API calls, and the domain-specific header fields. The same config
 * drives all three surfaces (view, edit, create) for one entity.
 */
export interface RiskAssessmentFormConfig<D extends RiskAssessmentDetailBase> {
  /** Breadcrumb label for the list page. */
  listLabel: string;
  /** List/search route; also the base for the edit route and the post-save redirect. */
  listPath: string;
  /**
   * The permission the edit route requires, so view mode can gate its Edit button on it. Injected per
   * subject rather than hardcoded, because the scaler and scale-site assessments are governed by
   * different permissions — the same reason `RiskRatingTable` takes a `viewPermission`.
   *
   * Who it actually hides Edit from: the **read-only** columns that can open an assessment but not
   * author one — `SCS_CLERICAL`, `SCS_BRANCH_SYS_SUPPORT`, `SCS_REGIONAL_MANAGER` and
   * `SCS_DIST_MANAGER`. Without it the view page would offer them an Edit that lands on
   * `/unauthorized`.
   *
   * (This gate was added while §D's lone "Risk Rating Criteria" `CR` was read as the ceiling, when it
   * hid Edit from the scaling managers too. They now hold `_UPDATE` under the "risk follows the record"
   * rule — see `RolePermissions`' class javadoc — so the gate is unchanged but its audience is not.)
   */
  updatePermission: PERMISSION_TYPE;
  /** Heading for the domain header block, e.g. "Scaler Record" / "Scale Site Record". */
  recordSectionTitle: string;
  getAssessment: (id: number, token?: string) => Promise<D>;
  updateAssessment: (
    id: number,
    request: RiskAssessmentSaveRequest,
    token?: string,
  ) => Promise<D>;
  /**
   * Load the blank "create" payload (active-template questionnaire + record header) for an entity id
   * (scaler licence no / scale site id). Required only for the create surface.
   */
  createInit?: (entityId: string, token?: string) => Promise<D>;
  /** Persist a new assessment for an entity id. Required only for the create surface. */
  create?: (
    entityId: string,
    request: RiskAssessmentSaveRequest,
    token?: string,
  ) => Promise<D>;
  /**
   * The Risk Rating tab's list query key for an owning entity id (scaler licence no / scale site id).
   * After a successful create *or* update the cached list is dropped, so the saved assessment shows
   * up on return rather than the pre-save row.
   */
  riskRatingsQueryKey?: (entityId: string) => unknown[];
  /**
   * The owning entity id (scaler licence no / scale site id) carried on a loaded assessment.
   *
   * Create knows that id from the route (`entityId`), but edit and view only know the assessment id,
   * so this is how the update path finds the Risk Rating tab cache it has to drop. Reads the same
   * field {@link successRedirect} builds its path from.
   */
  entityIdFromDetail: (detail: D) => string | null | undefined;
  /** Where Cancel/Back returns from the create surface — the record's Risk Rating tab. */
  createReturnPath?: (entityId: string) => string;
  /**
   * Breadcrumb trail for the create surface. Create is launched from (and returns to) the owning
   * record, so this is a record trail (e.g. Scale Sites → Scale Site 123 → Create), not the
   * assessment search trail used by view/edit. Required only for the create surface.
   */
  createBreadcrumbs?: (entityId: string) => { name: string; path?: string }[];
  /** The domain header fields, rendered read-only two per row. */
  headerFields: (detail: D | null) => RiskAssessmentHeaderField[];
  /** Where to navigate after a successful save — the record's Risk Rating tab. */
  successRedirect: (detail: D) => string;
}

type Snapshot = {
  selections: Selections;
  comments: string;
};

/**
 * Every question in the active template must be answered before a new assessment can be created
 * (matches the backend "full save" rule); returns true when no question is left unanswered.
 */
function allQuestionsAnswered(
  sections: RiskAssessmentSection[],
  selections: Selections,
): boolean {
  return sections.every((section) =>
    (section.questions ?? []).every(
      (question) => question.questionId == null || selections[question.questionId] != null,
    ),
  );
}

function toResponses(sections: RiskAssessmentSection[], selections: Selections) {
  return sections.flatMap((section) =>
    (section.questions ?? [])
      .filter((question) => question.questionId != null)
      .map((question) => ({
        questionId: question.questionId as number,
        answerId: selections[question.questionId as number] ?? null,
      })),
  );
}

/**
 * The data-driven risk assessment form shared by the scaler and scale-site features across all three
 * surfaces — view (read-only), edit (update an existing assessment), and create (add a new one). The
 * questionnaire, product-rule totals, comments field, and Risk Levels table come from
 * {@link RiskAssessmentQuestionnaire}; only the header fields, labels, routes, and API calls differ,
 * and those come from {@link RiskAssessmentFormConfig}. View/edit read the assessment id from the
 * route (`riskQuestionnaireId`); create takes the owning entity id via {@code entityId} and persists
 * a brand-new assessment (no route assessment id exists yet).
 */
function RiskAssessmentForm<D extends RiskAssessmentDetailBase>({
  config,
  mode,
  title,
  entityId,
}: {
  config: RiskAssessmentFormConfig<D>;
  /** view (read-only), edit, or create. */
  mode: RiskAssessmentFormMode;
  /** Page title shown in the header (e.g. "Scaler Risk Assessment - View"). */
  title: string;
  /** The owning entity id (scaler licence no / scale site id) — required for create mode. */
  entityId?: string;
}) {
  const { riskQuestionnaireId } = useParams<{ riskQuestionnaireId: string }>();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const isCreate = mode === 'create';
  // Edit and create are both editable; view is read-only (but still offers an Edit button that
  // navigates to the /edit/ route, so history stays meaningful).
  const isEditing = mode !== 'view';
  const readOnly = mode === 'view';

  const [detail, setDetail] = useState<D | null>(null);
  const [selections, setSelections] = useState<Selections>({});
  const [comments, setComments] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resolvedId = useMemo(() => Number(riskQuestionnaireId ?? 0), [riskQuestionnaireId]);
  const sections = useMemo(() => detail?.sections ?? [], [detail]);
  const riskRatings = useMemo(() => detail?.riskRatings ?? [], [detail]);
  const headerFields = config.headerFields(detail);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setFormError(null);
      try {
        const token = await userToken();

        let data: D;
        if (isCreate) {
          if (!entityId || !config.createInit) {
            setFormError('Invalid record.');
            return;
          }
          data = await config.createInit(entityId, token);
        } else {
          if (!Number.isFinite(resolvedId) || resolvedId <= 0) {
            setFormError('Invalid Risk Assessment ID.');
            return;
          }
          data = await config.getAssessment(resolvedId, token);
        }
        if (!mounted) {
          return;
        }

        const initialSelections = buildSelections(data.sections ?? []);
        const initialComments = data.comments ?? '';

        setDetail(data);
        setSelections(initialSelections);
        setComments(initialComments);
        setSnapshot({ selections: initialSelections, comments: initialComments });
      } catch (e) {
        if (mounted) {
          setFormError(extractApiError(e, 'Could not load record.'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [isCreate, entityId, resolvedId, userToken, config]);

  const onSelect = (questionId: number, value: string) => {
    setSelections((prev) => ({ ...prev, [questionId]: value === '' ? null : Number(value) }));
    setFormError(null);
  };

  const resetToSnapshot = () => {
    if (!snapshot) {
      return;
    }
    setSelections(snapshot.selections);
    setComments(snapshot.comments);
    setFormError(null);
  };

  /**
   * Drop the owning record's cached Risk Rating tab list, so a save is reflected on return instead of
   * the pre-save row. Queries default to refetchOnMount:false + a 3h staleTime, so removing forces a
   * fresh fetch when the tab remounts (invalidate alone would keep serving the stale cached list).
   */
  const dropCachedRiskRatings = (owningEntityId: string | null | undefined) => {
    if (owningEntityId && config.riskRatingsQueryKey) {
      queryClient.removeQueries({ queryKey: config.riskRatingsQueryKey(owningEntityId) });
    }
  };

  const onSave = async () => {
    if (!detail) {
      return;
    }
    try {
      setFormError(null);

      // Always send the box value (an empty string explicitly clears the comment). Omitting the
      // field is reserved as the API's "leave unchanged" signal, which the UI never intends.
      const payload: RiskAssessmentSaveRequest = {
        comments,
        responses: toResponses(sections, selections),
      };

      if (isCreate) {
        if (!entityId || !config.create) {
          return;
        }
        if (!allQuestionsAnswered(sections, selections)) {
          setFormError('All questions must be answered in order to save the assessment.');
          scrollToError('risk-assessment-form-error');
          return;
        }
        setIsSubmitting(true);
        const token = await userToken();
        const created = await config.create(entityId, payload, token);
        dropCachedRiskRatings(entityId);
        navigate(config.successRedirect(created));
        return;
      }

      if (resolvedId <= 0) {
        return;
      }
      // Edit mirrors create: every question must be answered (see RiskQuestionnaireService.save ->
      // requireAllAnswered). This replaced the earlier ERR-002 "at least one answer" rule — a
      // sub-complete assessment rates below the lowest risk band, which the banded DB view filters
      // out, so it would silently vanish from the Risk Rating tab and every search. Guarding here
      // keeps the user on the form with a clear message instead of letting the under-complete save
      // reach the API (where the vanished record then surfaced a misleading "record not found" 404).
      if (!allQuestionsAnswered(sections, selections)) {
        setFormError('All questions must be answered in order to save the assessment.');
        scrollToError('risk-assessment-form-error');
        return;
      }
      setIsSubmitting(true);
      const token = await userToken();
      const updated = await config.updateAssessment(resolvedId, payload, token);
      // An update can move the assessment into a different Risk Level band, so the tab's cached row
      // is stale exactly as it is after a create. Keyed off the *saved* record; the owning entity
      // cannot change on an edit, so `detail` is the fallback when the response omits the id.
      dropCachedRiskRatings(
        config.entityIdFromDetail(updated) ?? config.entityIdFromDetail(detail),
      );
      navigate(config.successRedirect(detail));
    } catch (e) {
      setFormError(extractApiError(e, 'Could not save record.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBack = () => {
    if (isCreate && entityId && config.createReturnPath) {
      navigate(config.createReturnPath(entityId));
      return;
    }
    // View/edit return to the owning record's Risk Rating tab (matching legacy), not the assessment
    // search page. `successRedirect` builds that record path and already falls back to `listPath`
    // when the record id is missing; `detail` is null only if the assessment never loaded, so fall
    // back to the search page in that case too.
    navigate(detail ? config.successRedirect(detail) : config.listPath);
  };

  // The editable controls (answer dropdowns, comments) are disabled outside edit/create mode and
  // while loading/saving. The always-read-only fields use Carbon's readOnly (underline) style.
  const editingDisabled = !isEditing || isSubmitting || isLoading;

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle
          title={title}
          breadCrumbs={
            isCreate
              ? entityId && config.createBreadcrumbs
                ? config.createBreadcrumbs(entityId)
                : [{ name: 'Create' }]
              : [
                  { name: config.listLabel, path: config.listPath },
                  { name: resolvedId > 0 ? String(resolvedId) : '' },
                ]
          }
        />

        <Form
          onSubmit={(e) => e.preventDefault()}
          className={`risk-assessment-form scs__form${
            readOnly ? ' risk-assessment-form--view' : ''
          }`}
        >
          <div className="risk-assessment__fieldset scs__disabled-plain">
            {formError ? (
              <InlineNotification
                id="risk-assessment-form-error"
                kind="error"
                lowContrast
                title="Error"
                subtitle={formError}
                style={{ marginBottom: '24px' }}
              />
            ) : null}

            <h4 className="scs__form__section-title">{config.recordSectionTitle}</h4>
            {chunkInPairs(headerFields).map((pair, rowIndex) => (
              <Grid className="scs__form__grid" key={pair.map((f) => f.id).join('-') || rowIndex}>
                {pair.map((field) => (
                  <Column lg={8} md={4} sm={4} key={field.id}>
                    <TextInput
                      id={field.id}
                      labelText={field.label}
                      value={field.value}
                      onChange={() => undefined}
                      readOnly
                    />
                  </Column>
                ))}
              </Grid>
            ))}

            <div className="scs__form__divider" />

            <RiskAssessmentQuestionnaire
              sections={sections}
              riskRatings={riskRatings}
              selections={selections}
              comments={comments}
              disabled={editingDisabled}
              onSelect={onSelect}
              onCommentsChange={setComments}
              assessmentId={resolvedId > 0 ? String(resolvedId) : ''}
            />
          </div>

          <div className="form-actions">
            <Button kind="secondary" onClick={onBack} className="action-btn">
              Back
            </Button>
            {isEditing ? (
              <>
                <Button
                  kind="secondary"
                  onClick={resetToSnapshot}
                  className="action-btn"
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
                <Button
                  kind="primary"
                  onClick={onSave}
                  className="action-btn"
                  disabled={isSubmitting || isLoading || !detail}
                >
                  Save Assessment
                </Button>
              </>
            ) : (
              <PermissionGate permission={config.updatePermission}>
                <Button
                  kind="primary"
                  onClick={() => navigate(`${config.listPath}/edit/${resolvedId}`)}
                  className="action-btn"
                  disabled={isLoading || !detail}
                >
                  Edit
                </Button>
              </PermissionGate>
            )}
            <WhoDidIt audit={detail} loading={isLoading} />
          </div>
        </Form>
      </Column>
    </Grid>
  );
}

/** Group header fields into rows of two, matching the two-per-row read-only header layout. */
function chunkInPairs(fields: RiskAssessmentHeaderField[]): RiskAssessmentHeaderField[][] {
  const rows: RiskAssessmentHeaderField[][] = [];
  for (let i = 0; i < fields.length; i += 2) {
    rows.push(fields.slice(i, i + 2));
  }
  return rows;
}

export default RiskAssessmentForm;
