import { Modal } from "@carbon/react";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

import ClientSearchPage from "@/pages/Queries/Client";
import type { Client } from "@/services/clients.service";

type Props = {
  open: boolean;
  onRequestClose: () => void;
  onClientSelect?: (c: Client) => void;
  hidePageTitle?: boolean;
  modalHeading?: string;
};

/** `inert` is declared optional so the cleanup below can `delete` it to restore the default. */
type InertElement = Element & { inert?: boolean };

const ClientSearchModal: React.FC<Props> = ({
  open,
  onRequestClose,
  onClientSelect,
  hidePageTitle,
  modalHeading,
}) => {
  // This modal is portaled to document.body but is still a React descendant of whatever
  // modal opened it (e.g. the Scale Site "Edit Record" modal). React synthetic events bubble
  // the React tree, not the DOM tree, so without this boundary a click on any field in here
  // bubbles up to the OUTER Carbon Modal's click-outside handler — which sees the target as
  // "outside" (it lives in the portal) and dismisses the outer modal, closing both.
  // stopPropagation (not preventDefault) severs that bubble while leaving this modal's own
  // click-outside handler — composed on the same element and run before break — intact.
  const stopBubbleToOuterModal = (e: React.SyntheticEvent) => e.stopPropagation();

  const modal = (
    <Modal
      className="scs__modal scs__modal--lg scs__modal--content-scroll scs__modal--stacked"
      open={open}
      onRequestClose={onRequestClose}
      passiveModal
      size="lg"
      modalHeading={modalHeading ?? "Queries - Clients"}
      onClick={stopBubbleToOuterModal}
    >
      <div className="scs__modal-body-pad scs__modal-body-pad-top">
        <ClientSearchPage
          modalMode
          hidePageTitle={Boolean(hidePageTitle)}
          onClientSelect={onClientSelect}
        />
      </div>
    </Modal>
  );

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }
    document.body.classList.add("scs--modal-stack-open");
    return () => {
      document.body.classList.remove("scs--modal-stack-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const modified = new Map<
      Element,
      {
        ariaHidden: string | null;
        inert: boolean | null;
      }
    >();

    const elements = Array.from(
      document.querySelectorAll(
        ".cds--modal-container, .cds--modal",
      ),
    ) as Element[];

    elements.forEach((el) => {
      const isClient = el.closest(".scs__modal--stacked") !== null;
      if (isClient) {
        return;
      }

      modified.set(el, {
        ariaHidden: el.getAttribute("aria-hidden"),
        inert: (el as InertElement).inert ?? null,
      });

      try {
        el.setAttribute("aria-hidden", "true");
      } catch {
        // Best effort: an element that refuses the attribute is simply left as it was.
      }
      try {
        (el as InertElement).inert = true;
      } catch {
        // Best effort: `inert` is unsupported or read-only in some environments.
      }
    });

    return () => {
      modified.forEach((orig, el) => {
        if (orig.ariaHidden !== null && orig.ariaHidden !== undefined) {
          el.setAttribute("aria-hidden", orig.ariaHidden);
        } else {
          el.removeAttribute("aria-hidden");
        }
        try {
          if (orig.inert !== null && orig.inert !== undefined) {
            (el as InertElement).inert = orig.inert;
          } else {
            delete (el as InertElement).inert;
          }
        } catch {
          // Best effort restore: ignore environments where `inert` cannot be written or deleted.
        }
      });
    };
  }, [open]);


  if (typeof document !== "undefined" && document.body) {
    return createPortal(modal, document.body);
  }

  return modal;
};

export default ClientSearchModal;
