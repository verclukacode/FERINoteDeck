// Build the post-auth destination URL from a Location whose `.state.from`
// was set by ProtectedRoute when it bounced an unauthenticated request.
// Falls back to `/` when there's no preserved location.
export function postAuthDest(location) {
	const from = location?.state?.from;
	if (!from) return "/app";
	return `${from.pathname || "/"}${from.search || ""}${from.hash || ""}`;
}
