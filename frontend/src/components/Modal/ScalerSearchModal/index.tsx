import { Modal } from "@carbon/react";
import React from "react";
import { createPortal } from "react-dom";
import ScalerSearchPage from "@/pages/Queries/Scalers";

import type { Scaler } from "@/services/scalers.service";

type Props = {
  open: boolean;
  onRequestClose: () => void;
  onScalerSelect?: (s: Scaler) => void;
};

const ScalerSearchModal: React.FC<Props> = ({
  open,
  onRequestClose,
  onScalerSelect,
}) => {
  const modal = (
    <Modal
      className="scs__modal scs__modal--lg scs__modal--content-scroll"
      open={open}
      onRequestClose={onRequestClose}
      passiveModal
      size="lg"
      modalHeading="Queries - Scalers"
    >
      <div className="scs__modal-body-pad scs__modal-body-pad-top">
        <ScalerSearchPage
          modalMode
          onScalerSelect={onScalerSelect}
          hidePageTitle
        />
      </div>
    </Modal>
  );


  if (typeof document !== "undefined" && document.body) {
    return createPortal(modal, document.body);
  }

  return modal;
};

export default ScalerSearchModal;
