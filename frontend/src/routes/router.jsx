import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage.jsx";
import NotesPage from "../pages/NotesPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import RootLayout from "./RootLayout.jsx";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <RootLayout />,
		children: [
			{ index: true, element: <NotesPage /> },
			{ path: "login", element: <LoginPage /> },
			{ path: "register", element: <RegisterPage /> },
		],
	},
]);
