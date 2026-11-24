import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

export type MaintenanceModalMode = 'create' | 'edit' | 'view' | null;
export type FormErrors = Record<string, string>;

export type MaintenanceCrudMessages = {
  load?: string;
  detail?: string;
  save?: string;
  delete?: string;
  deleteBlocked?: string;
};

export type MaintenanceCrudConfig<TListItem, TDetail, TForm, TCreate, TUpdate> = {
  /** Fetch the list. Called on mount and after every mutation, with the last params. */
  search: (params: Record<string, unknown> | undefined, token?: string) => Promise<TListItem[]>;
  /**
   * Fetch a full detail record when a row is opened for view. Omit (with
   * `fetchDetailOnView: false`) for entities whose list rows already carry every
   * field — then the row itself is used as the selected detail.
   */
  getDetail?: (entity: TListItem, token?: string) => Promise<TDetail>;
  create: (payload: TCreate, token?: string) => Promise<TDetail>;
  update: (selected: TDetail, payload: TUpdate, token?: string) => Promise<TDetail>;
  remove: (selected: TDetail, token?: string) => Promise<void>;

  emptyForm: TForm;
  applyToForm: (entity: TDetail) => TForm;
  buildCreatePayload: (form: TForm) => TCreate;
  buildUpdatePayload: (form: TForm, selected: TDetail) => TUpdate;
  validate: (form: TForm, mode: 'create' | 'edit') => FormErrors;

  /** Defaults to true. When false, `getDetail` is not called and the row is the detail. */
  fetchDetailOnView?: boolean;
  /**
   * Optional guard run before delete. Resolve `true` when the record has dependent
   * children and must not be deleted — the confirm dialog is suppressed and
   * `deleteBlocked` is set (drive the modal's "cannot delete" warning from it).
   */
  checkDependents?: (entity: TDetail, token?: string) => Promise<boolean>;

  messages?: MaintenanceCrudMessages;
  /** Params for the initial load (e.g. a default filter value). */
  initialParams?: Record<string, unknown>;
  /**
   * Called after any successful create/update/delete (once the list reload has been kicked off).
   * Use it to invalidate caches downstream of the mutated data — e.g. the LOV caches that feed
   * dropdowns elsewhere in the app, which have no TTL and would otherwise stay stale for the
   * session. Errors thrown here are swallowed so they can't fail an otherwise successful save.
   */
  onMutationSuccess?: () => void | Promise<void>;
  /**
   * When true, `updateForm` re-runs `validate` on each change and updates the
   * edited field's error live (clearing it once valid) instead of just clearing
   * it until the next save. Off by default.
   */
  revalidateOnChange?: boolean;
};

export type UseMaintenanceCrudResult<TListItem, TDetail, TForm> = {
  items: TListItem[];
  loading: boolean;
  error: string | null;
  reload: (params?: Record<string, unknown>) => Promise<void>;

  modalMode: MaintenanceModalMode;
  selected: TDetail | null;
  detailLoading: boolean;
  formState: TForm;
  formErrors: FormErrors;
  formMessage: string | null;
  isSubmitting: boolean;
  deleteModalOpen: boolean;
  deleteBlocked: boolean;

  openView: (entity: TListItem) => Promise<void>;
  openCreate: () => void;
  openEdit: () => void;
  cancelEdit: () => void;
  closeModal: () => void;
  updateForm: (patch: Partial<TForm>) => void;
  onSave: () => Promise<void>;
  resetForm: () => void;

  requestDelete: () => Promise<void>;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;

  setFormErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
};

/**
 * Config-driven state machine shared by the maintenance CRUD pages.
 *
 * Owns the list (load + reload after mutations), the create/view/edit modal mode,
 * the form state/errors/message, submit + delete orchestration, and the optional
 * dependent-child delete guard — everything that was hand-written and near-identical
 * across the pages. Per-entity specifics (services, payload shapes, validation,
 * form mapping) arrive through {@link MaintenanceCrudConfig}. Filtering stays with
 * the page: hold the filter value there and call {@link reload} with params.
 *
 * `Reset` restores the original record in edit mode and clears the form in create mode.
 */
export const useMaintenanceCrud = <TListItem, TDetail, TForm, TCreate, TUpdate>(
  config: MaintenanceCrudConfig<TListItem, TDetail, TForm, TCreate, TUpdate>,
): UseMaintenanceCrudResult<TListItem, TDetail, TForm> => {
  const { userToken } = useAuth();

  const {
    getDetail,
    create,
    update,
    remove,
    emptyForm,
    applyToForm,
    buildCreatePayload,
    buildUpdatePayload,
    validate,
    fetchDetailOnView = true,
    checkDependents,
    messages,
    initialParams,
    onMutationSuccess,
    revalidateOnChange = false,
  } = config;

  // Run the post-mutation hook without letting a downstream cache-invalidation error surface as a
  // save/delete failure — the record was already persisted and the list reloaded.
  const runMutationSuccess = async () => {
    if (!onMutationSuccess) {
      return;
    }
    try {
      await onMutationSuccess();
    } catch (err) {
      // Best-effort: a failed cache purge must not fail an already-persisted mutation. But a silent
      // swallow re-introduces the exact stale-LOV bug this hook exists to prevent, with no trace —
      // so leave a breadcrumb while still not surfacing it as a save/delete failure.
      console.warn('Post-mutation cache purge failed; dropdowns may serve stale data.', err);
    }
  };

  // Keep the latest config reachable from the memoized `reload` without stale
  // captures, and give reload/detail fetches monotonic sequence numbers so a
  // slow response from a superseded request can't overwrite a newer one.
  const configRef = useRef(config);
  configRef.current = config;
  const reloadSeq = useRef(0);
  const detailSeq = useRef(0);

  const [items, setItems] = useState<TListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<MaintenanceModalMode>(null);
  const [selected, setSelected] = useState<TDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formState, setFormState] = useState<TForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  // Remember the params used for the current list so post-mutation reloads keep
  // the active filter. Seeded with the initial params.
  const lastParams = useRef<Record<string, unknown> | undefined>(initialParams);

  const reload = useCallback(
    async (params?: Record<string, unknown>) => {
      if (params !== undefined) {
        lastParams.current = params;
      }
      const seq = (reloadSeq.current += 1);
      try {
        setLoading(true);
        setError(null);
        const token = await userToken();
        const results = await configRef.current.search(lastParams.current, token);
        if (seq !== reloadSeq.current) { // superseded by a newer reload
          return;
        }
        setItems(Array.isArray(results) ? results : []);
      } catch (err) {
        if (seq !== reloadSeq.current) {
          return;
        }
        setError(extractApiError(err, configRef.current.messages?.load ?? 'Could not load records.'));
        setItems([]);
      } finally {
        if (seq === reloadSeq.current) {
          setLoading(false);
        }
      }
    },
    // Reads config through configRef, so it only needs to change with the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userToken],
  );

  useEffect(() => {
    void reload(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFormFeedback = () => {
    setFormErrors({});
    setFormMessage(null);
  };

  const resetForm = () => {
    clearFormFeedback();
    setDeleteBlocked(false);
    if (modalMode === 'edit' && selected) {
      setFormState(applyToForm(selected));
    } else {
      setFormState(emptyForm);
      if (modalMode !== 'edit') {
        setSelected(null);
      }
    }
  };

  const closeModal = () => {
    detailSeq.current += 1; // invalidate any in-flight detail fetch
    setModalMode(null);
    setSelected(null);
    setFormState(emptyForm);
    clearFormFeedback();
    setDeleteBlocked(false);
    setDeleteModalOpen(false);
  };

  const openCreate = () => {
    detailSeq.current += 1; // invalidate any in-flight detail fetch
    setSelected(null);
    setFormState(emptyForm);
    clearFormFeedback();
    setDeleteBlocked(false);
    setModalMode('create');
  };

  const openView = async (entity: TListItem) => {
    clearFormFeedback();
    setDeleteBlocked(false);
    setModalMode('view');

    if (fetchDetailOnView && getDetail) {
      const seq = (detailSeq.current += 1);
      try {
        setDetailLoading(true);
        const token = await userToken();
        const detail = await getDetail(entity, token);
        if (seq !== detailSeq.current) { // superseded by a newer open/navigation
          return;
        }
        setSelected(detail);
        setFormState(applyToForm(detail));
      } catch (err) {
        if (seq !== detailSeq.current) {
          return;
        }
        setSelected(null);
        setFormMessage(extractApiError(err, messages?.detail ?? 'Could not load record details.'));
      } finally {
        if (seq === detailSeq.current) {
          setDetailLoading(false);
        }
      }
      return;
    }

    // No detail fetch: the list row already carries the full record.
    const detail = entity as unknown as TDetail;
    setSelected(detail);
    setFormState(applyToForm(detail));
  };

  const openEdit = () => {
    clearFormFeedback();
    setDeleteBlocked(false);
    if (selected) {
      setFormState(applyToForm(selected));
    }
    setModalMode('edit');
  };

  const cancelEdit = () => {
    clearFormFeedback();
    if (selected) {
      setFormState(applyToForm(selected));
    }
    setModalMode('view');
  };

  const updateForm = (patch: Partial<TForm>) => {
    const editedKeys = Object.keys(patch);

    if (revalidateOnChange && (modalMode === 'create' || modalMode === 'edit')) {
      // Live feedback: re-validate and set each edited field's error to its new
      // result (clearing it once the field becomes valid).
      const next = { ...formState, ...patch };
      setFormState(next);
      const nextErrors = validate(next, modalMode);
      setFormErrors((prev) => {
        const updated = { ...prev };
        editedKeys.forEach((key) => {
          if (nextErrors[key]) {
            updated[key] = nextErrors[key];
          } else {
            delete updated[key];
          }
        });
        return updated;
      });
      return;
    }

    setFormState((prev) => ({ ...prev, ...patch }));
    // Clear the validation error for any field being edited.
    setFormErrors((prev) => {
      if (!editedKeys.some((key) => key in prev)) {
        return prev;
      }
      const next = { ...prev };
      editedKeys.forEach((key) => delete next[key]);
      return next;
    });
  };

  const onSave = async () => {
    if (modalMode !== 'create' && modalMode !== 'edit') {
      return;
    }
    const errors = validate(formState, modalMode);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      scrollToError();
      return;
    }

    try {
      setIsSubmitting(true);
      setFormMessage(null);
      const token = await userToken();

      let saved: TDetail;
      if (modalMode === 'create') {
        saved = await create(buildCreatePayload(formState), token);
      } else {
        if (!selected) {
          setFormMessage(messages?.save ?? 'Could not save record.');
          return;
        }
        saved = await update(selected, buildUpdatePayload(formState, selected), token);
      }

      setSelected(saved);
      setFormState(applyToForm(saved));
      setModalMode('view');
      // Purge before the list reload, not after: the reload is an independent round-trip and the
      // purge depends on nothing in it, so sequencing the purge behind it leaves a window where the
      // save has visibly succeeded but the stale LOV is still cached for any observer.
      await runMutationSuccess();
      await reload();
    } catch (err) {
      setFormMessage(extractApiError(err, messages?.save ?? 'Could not save record.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDelete = async () => {
    if (!selected) {
      return;
    }
    if (checkDependents) {
      try {
        const token = await userToken();
        const blocked = await checkDependents(selected, token);
        if (blocked) {
          setDeleteBlocked(true);
          return;
        }
      } catch (err) {
        setFormMessage(extractApiError(err, messages?.delete ?? 'Could not delete record.'));
        return;
      }
    }
    setDeleteBlocked(false);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) {
      return;
    }
    try {
      setIsSubmitting(true);
      setFormMessage(null);
      const token = await userToken();
      await remove(selected, token);
      // Purge before the list reload (see onSave): the purge depends on nothing in the reload, so
      // running it first closes the window where the delete has succeeded but the LOV is still stale.
      await runMutationSuccess();
      await reload();
      closeModal();
    } catch (err) {
      setFormMessage(extractApiError(err, messages?.delete ?? 'Could not delete record.'));
      setDeleteModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
  };

  return {
    items,
    loading,
    error,
    reload,

    modalMode,
    selected,
    detailLoading,
    formState,
    formErrors,
    formMessage,
    isSubmitting,
    deleteModalOpen,
    deleteBlocked,

    openView,
    openCreate,
    openEdit,
    cancelEdit,
    closeModal,
    updateForm,
    onSave,
    resetForm,

    requestDelete,
    confirmDelete,
    cancelDelete,

    setFormErrors,
  };
};
