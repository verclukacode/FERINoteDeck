import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.jsx";

export default function ProtectedRoute() {
	const { token } = useAuth();
	return token ? <Outlet /> : <Navigate to="/login" replace />;
}
