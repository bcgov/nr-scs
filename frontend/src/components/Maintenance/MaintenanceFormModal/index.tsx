import { Form, InlineNotification, Modal, SkeletonText } from '@carbon/react';
import type { ReactNode } from 'react';

import Button from '@/components/core/Button';
import WhoDidIt, { type WhoDidItAudit } from '@/components/core/WhoDidIt';
import PermissionGate from '@/components/PermissionGate';
import type { PERMISSION_TYPE } from '@/context/auth/permissions';

export type MaintenanceModalMode = 'create' | 'edit' | 'view' | null;

type MaintenanceFormModalProps = {
  modalMode: MaintenanceModalMode;
  /** Close the modal (already guarded against firing mid-submit by the frame). */
  onClose: () => void;

  /** Per-mode modal headings. */
  headings: { create: string; edit: string; view: string };

  /** In-modal error banner (save/load failures). */
  formMessage?: string | null;

  // --- View mode ---
  renderViewFields: () => ReactNode;
  /** Skeleton the view body while the detail record is being fetched. */
  detailLoading?: boolean;
  /** Audit record for the "Who Did It?" popup shown in view mode. */
  audit?: WhoDidItAudit | null;
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  /**
   * Permissions gating the view-mode Edit and Delete actions. Optional and **opt-in**: a page that
   * passes neither keeps both buttons unconditional, which is correct while only `SCS_SYS_ADMIN` can
   * open it (§J is `-` for every other column). Pass them once a role reaches the page holding the
   * read but not the write — see `Maintenance/Questions`, the first such page.
   */
  editPermission?: PERMISSION_TYPE;
  deletePermission?: PERMISSION_TYPE;
  /**
   * Warning shown in view mode instead of the delete action when the record has
   * dependent children and cannot be deleted (Conditions, ValidLicenceAttributes).
   */
  deleteBlockedMessage?: string | null;
  /** Replace the default view action row entirely (Templates supplies its own). */
  renderViewActions?: () => ReactNode;

  // --- Create / edit mode ---
  renderFormFields: () => ReactNode;
  onSave: () => void;
  onReset: () => void;
  /** Leave the edit form back to view without saving (edit mode only). */
  onBack?: () => void;
  isSubmitting?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  /** Replace the default create/edit action row entirely. */
  renderFormActions?: () => ReactNode;

  /** Extra class appended to the modal (e.g. an entity-specific modal class). */
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /**
   * CSS selectors of floating menus (e.g. Carbon multi-select dropdowns) that
   * must not be treated as "outside" the modal. Passed through to Carbon's Modal.
   */
  selectorsFloatingMenus?: string[];
};

/**
 * Shared modal frame for the maintenance create / view / edit flow.
 *
 * Owns everything identical across the maintenance modals — the Carbon `Modal`
 * shell, the per-mode heading, the in-modal error notification, the view-vs-form
 * branch, and the standard action rows (view: Edit + Delete + `WhoDidIt`;
 * create/edit: Back + Reset + Save). The per-entity field layouts come in through
 * the `renderViewFields` / `renderFormFields` slots, and outliers can replace the
 * action rows via `renderViewActions` / `renderFormActions`.
 */
const MaintenanceFormModal = ({
  modalMode,
  onClose,
  headings,
  formMessage,
  renderViewFields,
  detailLoading = false,
  audit,
  onEdit,
  onDelete,
  editLabel = 'Edit',
  editPermission,
  deletePermission,
  deleteBlockedMessage,
  renderViewActions,
  renderFormFields,
  onSave,
  onReset,
  onBack,
  isSubmitting = false,
  saveLabel = 'Save Record',
  savingLabel = 'Saving...',
  renderFormActions,
  className,
  size = 'lg',
  selectorsFloatingMenus,
}: MaintenanceFormModalProps) => {
  const isOpen = modalMode !== null;
  const isView = modalMode === 'view';
  const isEdit = modalMode === 'edit';
  const isForm = modalMode === 'create' || modalMode === 'edit';

  const heading = isView ? headings.view : isEdit ? headings.edit : headings.create;

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const errorBanner = formMessage ? (
    <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={formMessage} />
  ) : null;

  /**
   * Gated only where a permission is supplied — `PermissionGate` reads the auth context, so rendering
   * it unconditionally would impose a provider on every caller that has not opted in, and on their
   * tests. `WhoDidIt` is never gated: it is audit information about a record the caller already reads.
   */
  const gated = (permission: PERMISSION_TYPE | undefined, control: ReactNode) =>
    permission ? <PermissionGate permission={permission}>{control}</PermissionGate> : control;

  const viewActions = renderViewActions ? (
    renderViewActions()
  ) : (
    <div className="form-actions">
      {gated(
        editPermission,
        <Button kind="secondary" type="button" className="action-btn" onClick={onEdit}>
          {editLabel}
        </Button>,
      )}
      {!deleteBlockedMessage
        && gated(
          deletePermission,
          <Button kind="danger" type="button" className="action-btn" onClick={onDelete}>
            Delete
          </Button>,
        )}
      <WhoDidIt audit={audit} loading={detailLoading} />
    </div>
  );

  const formActions = renderFormActions ? (
    renderFormActions()
  ) : (
    <div className="form-actions">
      {isEdit && onBack ? (
        <Button kind="secondary" type="button" className="action-btn" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
      ) : null}
      <Button kind="secondary" type="button" onClick={onReset} disabled={isSubmitting}>
        Reset
      </Button>
      <Button kind="primary" type="button" onClick={onSave} disabled={isSubmitting}>
        {isSubmitting ? savingLabel : saveLabel}
      </Button>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      modalHeading={heading}
      className={`scs__modal scs__modal--no-footer${className ? ` ${className}` : ''}`}
      danger={false}
      size={size}
      onRequestClose={handleClose}
      // Footer is hidden by CSS; Enter only closes from the read-only view, and
      // not while the detail is still loading.
      onRequestSubmit={isView && !detailLoading ? handleClose : undefined}
      selectorsFloatingMenus={selectorsFloatingMenus}
    >
      <div className="scs__modal-body-pad scs__modal-body-pad-top" style={{ paddingBottom: '1rem' }}>
        {isView ? (
          <div>
            {errorBanner}
            {deleteBlockedMessage ? (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title="Cannot delete"
                subtitle={deleteBlockedMessage}
              />
            ) : null}
            {detailLoading ? <SkeletonText paragraph lineCount={4} /> : renderViewFields()}
            {!detailLoading ? viewActions : null}
          </div>
        ) : null}

        {isForm ? (
          <Form className={`scs__form${isSubmitting ? ' scs__submitting' : ''}`} onSubmit={(e) => e.preventDefault()}>
            {errorBanner}
            {renderFormFields()}
            {formActions}
          </Form>
        ) : null}
      </div>
    </Modal>
  );
};

export default MaintenanceFormModal;
