import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.jsx";

export default function ProtectedRoute() {
	const { user, loading } = useAuth();
	if (loading) {
		return (
			<div className="flex h-full items-center justify-center text-body">
				Loading...
			</div>
		);
	}
	if (!user) return <Navigate to="/login" replace />;
	if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
	return <Outlet />;
}
