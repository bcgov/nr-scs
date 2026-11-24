import { Login } from '@carbon/icons-react';
import { Column, Grid } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';

import bcGovLogo from '@/assets/img/bc-gov-logo.png';
import Button from '@/components/core/Button';
import forestCrest from '@/assets/img/forest-service-crest.gif';
import LandingImg from '@/assets/img/landing.jpg';
import { hasWelcomeAccess } from '@/context/auth/authUtils';
import { useAuth } from '@/context/auth/useAuth';
import useBreakpoint from '@/hooks/useBreakpoint';
import API from '@/services/APIs';
import { WELCOME_SUMMARY_QUERY_KEY } from '@/config/react-query/queryKeys';
import type { WelcomeSummary } from '@/services/welcome.service';

import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import './index.scss';

const LandingPage: FC = () => {
  const breakpoint = useBreakpoint();
  const { isLoggedIn, isLoading, user, userToken, login } = useAuth();
  const navigate = useNavigate();

  // A logged-in user without any defined role may not view the welcome page;
  // send them to the unauthorized page just like the protected routes do.
  const isAuthorized = isLoggedIn && hasWelcomeAccess(user);

  useEffect(() => {
    if (!isLoading && isLoggedIn && !isAuthorized) {
      navigate('/unauthorized', { replace: true });
    }
  }, [isLoading, isLoggedIn, isAuthorized, navigate]);

  /**
   * Defines whether the login buttons should be on the same row.
   */
  const isBtnSingleRow = breakpoint === 'max' || breakpoint === 'xlg' || breakpoint === 'md';

  const welcomeQuery = useQuery<WelcomeSummary, Error>({
    queryKey: WELCOME_SUMMARY_QUERY_KEY,
    queryFn: async () => {
      const token = await userToken();
      return API.welcome.getWelcomeSummary(token);
    },
    staleTime: 5 * 60 * 1000,
    enabled: isAuthorized,
  });

  const summary = welcomeQuery.data;
  const valueOrFallback = (value?: string | null) => {
    if (value) {
      return value;
    }
    if (welcomeQuery.isLoading) {
      return 'Loading...';
    }
    return '';
  };

  return (
    <div className={`landing-grid-container${isLoggedIn ? '' : ' landing-grid-container--no-header'}`}>
      <Grid className="landing-grid">
        <Column className="landing-content-col" sm={4} md={4} lg={9}>
          <div
            className="landing-content-wrapper"
            style={{ alignItems: 'flex-start' }}
          >
            {!isLoggedIn && (
              <div className="landing-heading">
                <img src={bcGovLogo} alt="BC Government" className="landing-heading__logo" />
                <h1 className="landing-heading__title">Welcome to SCS</h1>
                <p className="landing-heading__subtitle">Scale Administration and Control System</p>
              </div>
            )}
            {isAuthorized && (
              <>
                <div className="welcome-grid">
                  <div className="welcome-grid__cell welcome-grid__cell--crest">
                    <img src={forestCrest} alt="Forest Service crest" className="welcome-crest" />
                  </div>
                  <div className="welcome-grid__cell welcome-grid__headline">
                    Welcome to the Scale Administration and Control System (SCS)
                  </div>

                  <div className="welcome-grid__label">Version:</div>
                  <div className="welcome-grid__value">{valueOrFallback(summary?.applicationVersion)}</div>

                  <div className="welcome-grid__label">Environment:</div>
                  <div className="welcome-grid__value">{valueOrFallback(summary?.applicationEnvironment)}</div>

                  <div className="welcome-grid__label">Server:</div>
                  <div className="welcome-grid__value">{valueOrFallback(summary?.serverName)}</div>

                  <div className="welcome-grid__label">Roles:</div>
                  <div className="welcome-grid__value">{user?.roles?.join(', ') ?? ''}</div>

                  <div className="welcome-grid__label">Organization:</div>
                  <div className="welcome-grid__value">{valueOrFallback(summary?.userOrganization)}</div>

                  <div className="welcome-grid__label">Introduction:</div>
                  <div className="welcome-grid__value">
                    The Scale Administration and Control System (SCS) supports the Ministry's risk rating,
                    administrative and data control requirements for the Cruising, Scaling, and Waste programs.
                  </div>

                  <div className="welcome-grid__label">Current News:</div>
                  <div className="welcome-grid__value">
                    {welcomeQuery.isError ? 'Current news is unavailable.' : null}
                    {!welcomeQuery.isError && summary?.currentNews ? (
                      <div
                        className="welcome-grid__news"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(summary.currentNews) }}
                      />
                    ) : null}
                  </div>
                </div>
              </>
            )}

            {/* Login buttons */}
            {!isLoggedIn && (
              <div className={`buttons-container ${isBtnSingleRow ? 'single-row' : 'two-rows'}`}>
                <Button
                  type="button"
                  renderIcon={Login}
                  data-testid="landing-button__idir"
                  className="login-btn"
                  onClick={() => login('IDIR')}
                >
                  Log in with IDIR
                </Button>

                <Button
                  type="button"
                  kind="tertiary"
                  renderIcon={Login}
                  data-testid="landing-button__bceid"
                  className="login-btn"
                  id="bceid-login-btn"
                  onClick={() => login('BCEIDBUSINESS')}
                >
                  Log in with Business BCeID
                </Button>
              </div>
            )}
          </div>
        </Column>
        <Column className="landing-img-col" sm={4} md={4} lg={7}>
          <img src={LandingImg} alt="Landing cover" className="landing-img" />
        </Column>
      </Grid>
    </div>
  );
};

export default LandingPage;
