import { MultiSelect, Tag, TextInput } from '@carbon/react';
import { type FC, useState } from 'react';

import Button from '@/components/core/Button';
import ClientSearchModal from '@/components/Modal/ClientSearchModal';
import { useMockDevAuth, type MockDevClient } from '@/context/auth/MockDevAuthContext';
import { permissionsFor } from '@/context/auth/permissions';
import { AVAILABLE_ROLES, isClientScopedRole, SYS_ADMIN_ROLE } from '@/context/auth/types';
import type { Client } from '@/services/clients.service';

import './MockRoleClientPicker.scss';

/**
 * Roles selectable in the mock developer picker: the full set of SCS group names defined in the
 * system. What each one can actually do comes from the permission matrix
 * (`context/auth/permissions.ts`), which the same picker exercises end-to-end — the selection is also
 * mirrored into the `X-Mock-Roles` request header, so the backend applies the identical matrix.
 * A group not in this list (or none at all) is treated as unauthorized everywhere.
 */
const MOCK_DEV_ROLES: readonly string[] = AVAILABLE_ROLES;

/** Splits the comma-separated client field into de-duplicated, non-empty client numbers. */
const parseClientNumbers = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  ),
];

/** `undefined` for an empty selection, so the mock user stays internal rather than "restricted to none". */
const toMockClient = (clientNumbers: string[]): MockDevClient | undefined =>
  clientNumbers.length ? { clientNumbers } : undefined;

/**
 * Developer-only controls, shown in the header profile panel, for switching the mock user's role
 * (what they can do) and impersonated client (what data they can see) while running locally under
 * mock auth. The two are independent axes: pick a role for authorization, set a client to scope the
 * data — e.g. SCS_SYS_ADMIN + a client = a client-restricted admin.
 *
 * Renders nothing unless the mock developer context is present, which only happens in a
 * development build with VITE_MOCK_USER=true. The parent additionally guards the mount
 * behind `import.meta.env.DEV`, so this component is tree-shaken out of production builds.
 */
const MockRoleClientPicker: FC = () => {
  const dev = useMockDevAuth();
  const [clientModalOpen, setClientModalOpen] = useState(false);

  // Not running under mock auth (real auth / production) — expose nothing.
  if (!dev) {
    return null;
  }

  const { roles, setRoles, client, setClient } = dev;
  const clientNumbers = client?.clientNumbers ?? [];
  const isAdmin = roles.includes(SYS_ADMIN_ROLE);
  const recognisedRoles = roles.filter((role) => MOCK_DEV_ROLES.includes(role));
  // How far the selection actually reaches, straight from the shared matrix — so this hint cannot
  // drift as roles are enabled one by one. Passing clientNumbers matters: a client-scoped role holds
  // nothing without one, and without it the hints below would blame the role instead of the client.
  const grantedCount = permissionsFor({ privileges: {}, roles, clientNumbers }).size;
  const isWelcomeOnly = recognisedRoles.length > 0 && grantedCount <= 1;
  const needsClient =
    clientNumbers.length === 0 && recognisedRoles.some((role) => isClientScopedRole(role));

  return (
    <section className="mock-dev-controls" aria-label="Developer mock controls">
      <div className="mock-dev-controls__banner">
        <Tag type="warm-gray" size="sm">
          Dev only
        </Tag>
        <span className="mock-dev-controls__banner-text">Mock auth controls</span>
      </div>

      <div className="mock-dev-controls__section">
        <MultiSelect
          id="mock-dev-role"
          titleText="Role(s)"
          helperText="What the mock user can do (authorities). Pick one or more."
          label="Select role(s)"
          items={[...MOCK_DEV_ROLES]}
          itemToString={(item) => item ?? ''}
          selectedItems={roles}
          onChange={(event) => setRoles(event.selectedItems ?? [])}
        />
        {roles.length ? (
          <div className="mock-dev-controls__current">
            {roles.map((role) => (
              <Tag key={role} type={role === SYS_ADMIN_ROLE ? 'green' : 'cool-gray'} size="sm">
                {role}
              </Tag>
            ))}
          </div>
        ) : null}
        {needsClient ? (
          <p className="mock-dev-controls__hint">
            This role is client-scoped and no client is set, so it holds no permissions at all —
            everything redirects to the unauthorized page. Set a client below.
          </p>
        ) : null}
        {isWelcomeOnly && !needsClient ? (
          <p className="mock-dev-controls__hint">
            This role is recognised but its permissions are not enabled yet, so it can view the welcome
            page only; everything else redirects to the unauthorized page.
          </p>
        ) : null}
        {recognisedRoles.length === 0 ? (
          <p className="mock-dev-controls__hint">
            No defined role selected: you are treated as unauthorized everywhere, including the welcome
            page.
          </p>
        ) : null}
        {recognisedRoles.length > 0 && !isWelcomeOnly && !isAdmin ? (
          <p className="mock-dev-controls__hint">
            {grantedCount} permission{grantedCount === 1 ? '' : 's'} granted. Navigation, routes and
            in-page controls outside them are hidden, and the API refuses them independently.
          </p>
        ) : null}
      </div>

      <div className="mock-dev-controls__section">
        <TextInput
          id="mock-dev-client"
          labelText="Impersonated client(s)"
          helperText="What data the mock user can see (client scope). Comma-separate two or more to mock a multi-client user."
          placeholder="e.g. 00001074, 00002000"
          value={clientNumbers.join(', ')}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setClient(toMockClient(parseClientNumbers(e.target.value)))
          }
        />
        <div className="mock-dev-controls__actions">
          <Button kind="secondary" size="sm" noIcon onClick={() => setClientModalOpen(true)}>
            Search clients
          </Button>
          {clientNumbers.length ? (
            <Button kind="ghost" size="sm" noIcon onClick={() => setClient(undefined)}>
              Clear
            </Button>
          ) : null}
        </div>
        {clientNumbers.length ? (
          <div className="mock-dev-controls__current">
            {clientNumbers.map((clientNumber) => (
              <Tag key={clientNumber} type="blue" size="sm">
                {clientNumber}
              </Tag>
            ))}
          </div>
        ) : (
          <p className="mock-dev-controls__hint">No client set — internal, unrestricted mock.</p>
        )}
        <p className="mock-dev-controls__hint">
          Scopes the mock user to these clients: search filters lock to them and records outside them
          return 403, mirroring a client-restricted BCeID user.
        </p>
        {clientNumbers.length > 1 ? (
          <p className="mock-dev-controls__hint">
            More than one client, so the production client switcher appears above — exactly one is
            active at a time, and switching resets cached data.
          </p>
        ) : null}
        <ClientSearchModal
          open={clientModalOpen}
          onRequestClose={() => setClientModalOpen(false)}
          onClientSelect={(selected: Client) => {
            // Adds to the set rather than replacing it, so a multi-client mock can be built up by
            // searching repeatedly.
            if (selected.clientNumber) {
              setClient(toMockClient([...clientNumbers, selected.clientNumber]));
            }
            setClientModalOpen(false);
          }}
          hidePageTitle
          modalHeading="Queries - Clients"
        />
      </div>
    </section>
  );
};

export default MockRoleClientPicker;
