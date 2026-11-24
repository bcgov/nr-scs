import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches uncaught render/lifecycle errors anywhere below it and shows a fallback page instead of
 * letting a single component error blank out the whole app. Intentionally uses plain markup so the
 * fallback still renders even if a styling/provider failure is what triggered the error.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ maxWidth: '40rem', margin: '4rem auto', padding: '0 1rem' }}>
          <h1>Something went wrong</h1>
          <p>
            An unexpected error occurred. Please reload the page. If the problem persists, contact
            support.
          </p>
          <button type="button" onClick={this.handleReload}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
