import { createBrowserRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthContext.jsx";
import ChooseUsernamePage from "../pages/ChooseUsernamePage.jsx";
import LandingPage from "../pages/LandingPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import NotesPage from "../pages/NotesPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import VerifyEmailPage from "../pages/VerifyEmailPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RootLayout from "./RootLayout.jsx";

export const router = createBrowserRouter([
	// Public landing page
	{ path: "/", element: <LandingPage /> },
	// Auth pages (public, wrapped in AuthProvider for context)
	{
		element: (
			<AuthProvider>
				<RootLayout />
			</AuthProvider>
		),
		children: [
			{ path: "login", element: <LoginPage /> },
			{ path: "register", element: <RegisterPage /> },
			{ path: "verify-email", element: <VerifyEmailPage /> },
			{ path: "choose-username", element: <ChooseUsernamePage /> },
			// Protected app
			{
				path: "app",
				element: <ProtectedRoute />,
				children: [{ index: true, element: <NotesPage /> }],
			},
		],
	},
]);
