import { Logout } from '@carbon/icons-react';
import { Column } from '@carbon/react';
import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/core/Button';
import EmptySection from '@/components/core/EmptySection';
import { hasWelcomeAccess } from '@/context/auth/authUtils';
import { useAuth } from '@/context/auth/useAuth';

import './index.scss';

/**
 * The Not Authorized page — the modern port of the legacy global `notAuthorized` forward, reached
 * when `ProtectedRoute` refuses a route the user's role does not permit.
 *
 * This page is a dead end reached by navigation, and it carries no chrome a user can navigate from
 * when their role has no side-nav entries at all. So it offers its own way out — but which way out is
 * usable depends on whether the user has a home to go to, and the two cases are genuinely different:
 *
 *   Has welcome access — refused THIS page only. Back and Go to home page both work, so both are
 *     offered, as before.
 *
 *   No welcome access — an unrecognised role, or a client-scoped role provisioned without a forest
 *     client (the fail-closed state for a misprovisioned BCeID account). Every route in the app
 *     refuses them, `/welcome` included, so "Go to home page" would send them straight back here with
 *     nothing to explain why, and Back leaves the application entirely. Neither is a way out, so
 *     they are replaced by Log out — the only action that can actually change their situation, since
 *     signing in as someone else is the whole remedy.
 */
const RoleErrorPage: FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // The same predicate ProtectedRoute gates on, so "can reach home" here means exactly what it means
  // to the guard that would bounce them back.
  const canReachHome = hasWelcomeAccess(user);

  return (
    <Column lg={16} md={8} sm={4} className="unauthorized-column__body">
      <EmptySection
        pictogram="UnauthorizedUserAccess"
        title="Unauthorized Access"
        description={
          canReachHome
            ? 'You do not have the necessary permissions to view this page.'
            : 'Your account does not have access to this application. Please contact your '
              + 'administrator, or log out and sign in with a different account.'
        }
        className="unauthorized__section"
      />
      <div className="unauthorized__actions form-actions">
        {canReachHome ? (
          <>
            <Button kind="secondary" type="button" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button kind="primary" type="button" onClick={() => navigate('/welcome')}>
              Go to home page
            </Button>
          </>
        ) : (
          <Button kind="primary" type="button" renderIcon={Logout} onClick={() => logout()}>
            Log out
          </Button>
        )}
      </div>
    </Column>
  );
};

export default RoleErrorPage;
