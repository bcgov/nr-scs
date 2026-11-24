import { FormLabel, TextInput } from '@carbon/react';
import { type FC, type ReactNode, useState } from 'react';
import './index.scss';
import Button from '@/components/core/Button';
import ClientSearchModal from '@/components/Modal/ClientSearchModal';
import type { Client } from '@/services/clients.service';

interface Props {
  labelText: ReactNode;
  client: string;
  loc: string;
  onClientChange: (value: string) => void;
  onLocChange: (value: string) => void;
  onSearch?: () => void;
  clientPlaceholder?: string;
  locPlaceholder?: string;
  showSearchButton?: boolean;
  clientInvalid?: boolean;
  clientInvalidText?: string;
  locInvalid?: boolean;
  locInvalidText?: string;
  clientId?: string;
  locId?: string;
  clientReadOnly?: boolean;
  locReadOnly?: boolean;
  /** Forest client numbers are 8 chars and location codes 2 chars everywhere in SCS; override only if a caller needs otherwise. */
  clientMaxLength?: number;
  locMaxLength?: number;
  /**
   * Row-level error: marks BOTH inputs invalid and renders one full-width message below the
   * client/loc pair, keeping the two inputs height-aligned (per-input invalidText grows only
   * that input's wrapper and misaligns the row).
   */
  rowInvalidText?: string;
}

/**
 * A forest client number and location code are digits (plus a `%` wildcard in the search filters) —
 * whitespace is never part of either. Strip it rather than pass it on: the OpenAPI contract's
 * `pattern` on `clientNumber`/`clientLocnCode` becomes a `@Size`/`@Pattern` on the generated API
 * interface, so a pasted " 00021" used to come back as a 400 instead of a result set. Only
 * whitespace is removed — a digits-only sanitizer would break wildcard search on every consumer.
 */
const stripWhitespace = (value: string) => value.replace(/\s+/g, '');

const ClientLocSearch: FC<Props> = ({
  labelText,
  client,
  loc,
  onClientChange,
  onLocChange,
  onSearch,
  clientPlaceholder = 'Client',
  locPlaceholder = 'Loc',
  showSearchButton = true,
  clientInvalid,
  clientInvalidText,
  locInvalid,
  locInvalidText,
  clientId = 'client',
  locId = 'loc',
  clientReadOnly = false,
  locReadOnly = false,
  clientMaxLength = 8,
  locMaxLength = 2,
  rowInvalidText,
}) => {
  const rowError = Boolean(rowInvalidText);
  const [modalOpen, setModalOpen] = useState(false);

  const handleModalOpen = () => {
    setModalOpen(true);
    onSearch?.();
  };

  const handleClientSelect = (client: Client) => {
    onClientChange(client.clientNumber ?? '');
    onLocChange(client.clientLocnCode ?? '');
    setModalOpen(false);
  };
  return (
    <>
      <FormLabel className="client-loc-label">{labelText}</FormLabel>
      <div className="client-loc-row">
        <TextInput
          id={clientId}
          value={client}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onClientChange(stripWhitespace(e.target.value))}
          placeholder={clientPlaceholder}
          labelText=""
          maxLength={clientMaxLength}
          invalid={rowError || clientInvalid}
          invalidText={rowError ? undefined : clientInvalidText}
          readOnly={clientReadOnly}
        />
        <span className="slash">/</span>
        <TextInput
          id={locId}
          value={loc}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onLocChange(stripWhitespace(e.target.value))}
          placeholder={locPlaceholder}
          labelText=""
          maxLength={locMaxLength}
          invalid={rowError || locInvalid}
          invalidText={rowError ? undefined : locInvalidText}
          readOnly={locReadOnly}
        />
        {showSearchButton ? (
          <>
            <Button kind="secondary" className="scs__input-search-button" onClick={handleModalOpen}>Search</Button>
            <ClientSearchModal open={modalOpen} onRequestClose={() => setModalOpen(false)} onClientSelect={handleClientSelect} hidePageTitle modalHeading="Queries - Clients" />
          </>
        ) : null}
      </div>
      {rowError ? <div className="client-loc-row-error">{rowInvalidText}</div> : null}
    </>
  );
};

export default ClientLocSearch;
