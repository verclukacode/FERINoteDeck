import { createContext, useCallback, useContext, useMemo, useState } from "react";
import * as authService from "../../services/authService.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "notedeck.token";
const USER_KEY = "notedeck.user";

export function AuthProvider({ children }) {
	const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
	const [user, setUser] = useState(() => {
		const stored = localStorage.getItem(USER_KEY);
		return stored ? JSON.parse(stored) : null;
	});

	const persist = useCallback((data) => {
		localStorage.setItem(TOKEN_KEY, data.token);
		localStorage.setItem(USER_KEY, JSON.stringify(data.user));
		setToken(data.token);
		setUser(data.user);
	}, []);

	const login = useCallback(async (email, password) => {
		const data = await authService.login(email, password);
		persist(data);
	}, [persist]);

	const register = useCallback(async (email, password) => {
		const data = await authService.register(email, password);
		persist(data);
	}, [persist]);

	const logout = useCallback(() => {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		setToken(null);
		setUser(null);
	}, []);

	const value = useMemo(
		() => ({ token, user, login, register, logout }),
		[token, user, login, register, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
}
