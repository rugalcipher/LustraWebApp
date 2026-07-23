import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/problemDetails';

/**
 * A 401 or 403 is a settled answer, not a transient fault: the central client already
 * refreshes once on an expired-token 401 (authTokenCoordinator), so a further React Query
 * retry only doubles an authorization failure into a needless second request — the "retry
 * storm" seen in UAT on auth-gated client queries. Retry once for everything else.
 */
function retryQuery(failureCount, error) {
	if (isApiError(error) && (error.status === 401 || error.status === 403)) {
		return false;
	}
	return failureCount < 1;
}

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: retryQuery,
		},
	},
});
