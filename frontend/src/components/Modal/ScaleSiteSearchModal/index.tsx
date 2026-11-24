import { Modal } from "@carbon/react";
import { type FC, useCallback } from "react";

import ScaleSitesSearchPage from "@/pages/Queries/ScaleSites";

import type { ScaleSiteSearchResult } from "@/services/scaleSites.service";

type Props = {
  open: boolean;
  onRequestClose: () => void;
  onScaleSiteSelect?: (site: ScaleSiteSearchResult) => void;
};

const ScaleSiteSearchModal: FC<Props> = ({
  open,
  onRequestClose,
  onScaleSiteSelect,
}) => {
  const handleSelect = useCallback(
    (site: ScaleSiteSearchResult) => {
      // notify parent, then close modal (allow event loop to flush)
      onScaleSiteSelect?.(site);
      setTimeout(() => onRequestClose(), 0);
    },
    [onRequestClose, onScaleSiteSelect],
  );

  return (
    <Modal
      className="scs__modal scs__modal--lg scs__modal--content-scroll"
      open={open}
      onRequestClose={onRequestClose}
      passiveModal
      size="lg"
      modalHeading="Queries - Scale Sites"
    >
      <div className="scs__modal-body-pad">
        <ScaleSitesSearchPage modalMode onScaleSiteSelect={handleSelect} />
      </div>
    </Modal>
  );
};

export default ScaleSiteSearchModal;
