import { createBrowserRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthContext.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import NotesPage from "../pages/NotesPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import VerifyEmailPage from "../pages/VerifyEmailPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RootLayout from "./RootLayout.jsx";

export const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<AuthProvider>
				<RootLayout />
			</AuthProvider>
		),
		children: [
			{
				element: <ProtectedRoute />,
				children: [{ index: true, element: <NotesPage /> }],
			},
			{ path: "login", element: <LoginPage /> },
			{ path: "register", element: <RegisterPage /> },
			{ path: "verify-email", element: <VerifyEmailPage /> },
		],
	},
]);
