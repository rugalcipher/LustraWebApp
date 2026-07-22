import React from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { useHomeLink } from "@/auth/useHomeLink";

/**
 * Catches a render crash inside the authenticated shell so one bad value never blanks the
 * whole application.
 *
 * When a page throws — a null where a number was formatted, a shape the component did not
 * expect — React unmounts the entire tree. Inside an authenticated app that means the shell,
 * the navigation and every visual sign that the user is still signed in all disappear at
 * once, which reads exactly like being thrown out. The session is fine; only this page
 * failed.
 *
 * So the boundary keeps the shell (it is mounted OUTSIDE this component), shows a restrained
 * error state with a way forward, and — critically — never touches the session. A render bug
 * is not a reason to sign anyone out. The raw error is shown only in development; in a
 * deployed build the user sees a message, not a stack trace.
 *
 * This is defence in depth. The actual null values are still fixed at the source; this is the
 * net beneath them.
 */
class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // A new route is a fresh attempt. Without this, once a page has crashed the boundary
    // would hold the error state forever and every subsequent navigation would show the
    // fallback even though the new page is fine.
    if (this.state.error && prevProps.routeKey !== this.props.routeKey) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <Fallback
        error={this.state.error}
        homeLink={this.props.homeLink}
        onRetry={this.reset}
      />
    );
  }
}

function Fallback({ error, homeLink, onRetry }) {
  const showDetail = import.meta.env.DEV;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16" role="alert">
      <div className="max-w-md w-full text-center space-y-5">
        <AlertTriangle className="w-8 h-8 text-warning mx-auto" strokeWidth={1.3} aria-hidden="true" />
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl text-ivory">Something went wrong on this page</h1>
          <p className="font-body text-sm text-muted-grey">
            You are still signed in. This page ran into a problem loading — try again, or head
            back to your home.
          </p>
        </div>

        {showDetail && error?.message && (
          <pre className="text-left text-[0.65rem] text-muted-grey/80 bg-card-black/60 border border-white/10 rounded-sm p-3 overflow-x-auto whitespace-pre-wrap">
            {String(error.message)}
          </pre>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
          <a
            href={homeLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" /> Return home
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * The authenticated route boundary. Wrap the shell's `<Outlet />` with it.
 *
 * @param {{ routeKey?: string, children?: React.ReactNode }} props
 *   `routeKey` (usually the current pathname) resets the boundary on navigation, so a crash
 *   on one page does not stick to the next.
 */
export default function AuthenticatedErrorBoundary({ routeKey, children }) {
  // "Return home" uses the role-aware authenticated route — never a logout, never the public
  // site — so recovering from a crashed page keeps the user inside their own workspace.
  const homeLink = useHomeLink();
  return (
    <ErrorBoundaryInner routeKey={routeKey} homeLink={homeLink}>
      {children}
    </ErrorBoundaryInner>
  );
}
