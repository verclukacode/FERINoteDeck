import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.jsx";

export default function ProtectedRoute() {
	const { user, loading } = useAuth();
	const location = useLocation();
	if (loading) {
		return (
			<div className="flex h-full items-center justify-center text-body">
				Loading...
			</div>
		);
	}
	// Preserve the original location (e.g. `/?market=note:abc`) so the auth
	// pages can drop the user back here after sign-in / verification.
	const state = { from: location };
	if (!user) return <Navigate to="/login" replace state={state} />;
	if (!user.emailVerified)
		return <Navigate to="/verify-email" replace state={state} />;
	return <Outlet />;
}
