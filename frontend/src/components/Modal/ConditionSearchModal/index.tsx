import { Modal } from '@carbon/react';
import { type FC } from 'react';
import { createPortal } from 'react-dom';

import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';

type Props = {
  open: boolean;
  onRequestClose: () => void;
  loading: boolean;
  results: ScaleAuthCondition[] | null;
  onSelect: (condition: ScaleAuthCondition) => void;
};

const ConditionSearchModal: FC<Props> = ({
  open,
  onRequestClose,
  loading,
  results,
  onSelect,
}) => {
  const modal = (
    <Modal
      className="scs__modal scs__modal--lg scs__modal--content-scroll"
      open={open}
      onRequestClose={onRequestClose}
      passiveModal
      size="lg"
    >
      <div className="scs__modal-body-pad">
        {loading || results ? (
          <div className="scs__condition-search-table">
            <TableResource
              headers={[
                {
                  key: 'scaleAuthConditionId',
                  header: 'Condition #',
                  selected: true,
                  renderAs: (value: unknown, row: ScaleAuthCondition) => (
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className="scs__link"
                    >
                      {String(value)}
                    </button>
                  ),
                },
                { key: 'scaleAuthConditionTitle', header: 'Title', selected: true },
                { key: 'scaleAuthConditionDesc', header: 'Description', selected: true },
              ] as TableHeaderType<ScaleAuthCondition>[]}
              content={(
                loading
                  ? ({
                      content: [
                        {
                          scaleAuthConditionId: null,
                          scaleAuthConditionTitle: '',
                          scaleAuthConditionDesc: '',
                          id: 'c-placeholder-1',
                        },
                        {
                          scaleAuthConditionId: null,
                          scaleAuthConditionTitle: '',
                          scaleAuthConditionDesc: '',
                          id: 'c-placeholder-2',
                        },
                      ],
                      page: { size: 2, number: 0, totalElements: 2, totalPages: 1 },
                    } as PageableResponse<ScaleAuthCondition>)
                  : ({
                      content: (results || []).map((c, index) => ({
                        ...c,
                        // Stable key for a result with no condition id — see the note in
                        // AuthorizationConditionsSection: a random id remounts the row each render.
                        id: String(c.scaleAuthConditionId ?? `condition-row-${index}`),
                      })),
                      page: {
                        size: Math.max(1, (results || []).length),
                        number: 0,
                        totalElements: (results || []).length,
                        totalPages: 1,
                      },
                    } as PageableResponse<ScaleAuthCondition>)
              )}
              loading={loading}
              error={false}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );


  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modal, document.body);
  }

  return modal;
};

export default ConditionSearchModal;
