import { Link, useLocation } from "react-router-dom";
import Monogram from "@/lib/lustra/Monogram";
import { usePrincipal } from "@/auth/PrincipalContext";
import { ROLE_HOME } from "@/domain/roles";

/**
 * Branded 404. Sends the visitor to the home that matches their principal
 * (guests → the public landing page), so a signed-in member is not dropped
 * back onto marketing pages.
 */
export default function PageNotFound() {
  const location = useLocation();
  const { primaryRole } = usePrincipal();
  const home = ROLE_HOME[primaryRole] ?? "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-noir p-6">
      <div className="max-w-md w-full text-center">
        <Monogram size={40} />
        <p className="mt-8 font-display text-6xl text-rose-gold/70">404</p>
        <div className="mx-auto mt-4 h-px w-16 bg-rose-gold/25" />
        <h1 className="mt-6 font-display text-2xl text-ivory">Page not found</h1>
        <p className="mt-3 font-body text-sm leading-relaxed text-muted-grey">
          We couldn&rsquo;t find <span className="text-ivory/80">{location.pathname}</span>. It may have
          been moved, or the link may be out of date.
        </p>
        <Link
          to={home}
          className="mt-8 inline-flex items-center rounded-sm border border-rose-gold/30 px-6 py-3 font-body text-[0.6rem] uppercase tracking-luxe text-rose-gold transition-colors hover:bg-rose-gold/10"
        >
          Return
        </Link>
      </div>
    </div>
  );
}
