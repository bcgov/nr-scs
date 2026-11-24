import { TrashCan } from '@carbon/icons-react';
import { Modal } from '@carbon/react';

import Button from '@/components/core/Button';

import type { ScaleAuthConditionDetail } from '@/services/conditions.service';

type Props = {
  open: boolean;
  isSubmitting: boolean;
  condition: ScaleAuthConditionDetail | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDeleteModal: React.FC<Props> = ({
  open,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      open={open}
      className="scs__modal scs__modal--lg scs__modal--no-footer"
      onRequestSubmit={onConfirm}
      onRequestClose={onCancel}
      onSecondarySubmit={onCancel}
    >
      <p>
        Are you sure you want to delete this record?
      </p>
      <div className="form-actions">
        <Button
          kind="danger"
          type="button"
          disabled={isSubmitting}
          onClick={onConfirm}
          renderIcon={TrashCan}
        >
          OK
        </Button>
        <Button
          kind="secondary"
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;