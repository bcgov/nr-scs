import { Dropdown } from '@carbon/react';
import { type FC } from 'react';

import { useActiveClient } from '@/context/activeClient/useActiveClient';

import './ClientSwitcher.scss';

/**
 * Lets a user entitled to more than one forest client choose which one they are acting as. Exactly one
 * is in scope at a time, so switching changes which client's records every screen shows.
 *
 * Renders nothing unless there is a choice to make — a user with one client (the common case) has no
 * decision, and an internal user has no client scope at all.
 */
const ClientSwitcher: FC = () => {
  const { clientNumbers, activeClient, setActiveClient, canSwitch } = useActiveClient();

  if (!canSwitch) {
    return null;
  }

  return (
    <div className="client-switcher">
      <Dropdown
        id="active-client-switcher"
        titleText="Active client"
        // Says what switching actually does, since the effect is on data the user is already looking
        // at rather than anything on this panel.
        helperText={`${clientNumbers.length} clients available. Records shown are limited to the selected client.`}
        label="Select a client"
        items={clientNumbers}
        selectedItem={activeClient ?? null}
        itemToString={(item: string | null) => item ?? ''}
        onChange={({ selectedItem }: { selectedItem?: string | null }) => {
          if (selectedItem) {
            setActiveClient(selectedItem);
          }
        }}
        size="sm"
      />
    </div>
  );
};

export default ClientSwitcher;
